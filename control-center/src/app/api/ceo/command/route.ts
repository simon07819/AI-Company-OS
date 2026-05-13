import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { executeProductionMission } from "@/lib/orchestrator/missionExecutor";
import { buildMissionLifecycleTrace } from "@/lib/orchestrator/missionLifecycle";
import { readGeneratedProject } from "@/lib/product-builder/workspace";
import { runCompanyWorkflow } from "@/agents/workflows/company-workflow";
import { createArtifactFingerprint } from "@/agents/artifacts/artifact-fingerprint";
import { createMissionMemoryStore, reusableAssetFromMission } from "@/agents/memory/mission-memory-store";
import { decideContextReuse } from "@/agents/memory/reuse-policy";
import { createWorkOrderFromPrompt } from "@/agents/runtime/work-order";
import { summarizeMissionMemory } from "@/agents/memory/memory-summary";
import { runDesignTeamWorkflow } from "@/lib/design-team/logoWorkflow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function artifactExists(artifactPath: string) {
  const absolute = path.isAbsolute(artifactPath) ? artifactPath : path.resolve(process.cwd(), artifactPath);
  return fs.existsSync(absolute);
}

function firstVisualArtifact(artifactPaths: string[]) {
  return artifactPaths.find((artifactPath) => /final-logo\.svg$/i.test(artifactPath))
    ?? artifactPaths.find((artifactPath) => /\.svg$/i.test(artifactPath))
    ?? null;
}

function readTextArtifact(artifactPath: string | null) {
  if (!artifactPath) return null;
  const absolute = path.isAbsolute(artifactPath) ? artifactPath : path.resolve(process.cwd(), artifactPath);
  if (!fs.existsSync(absolute)) return null;
  return fs.readFileSync(absolute, "utf-8");
}

function containsLegacyVisualMarker(value?: string | null) {
  return /Brand system|Marque à nommer|Prototype visuel|legacy|fallback/i.test(value ?? "");
}

function isValidWorkflowPrimaryVisual(value: string | null | undefined, deliverableType: string, requestType: string) {
  if (!value || containsLegacyVisualMarker(value)) return false;
  if (deliverableType === "logo") return /<svg[\s>]/i.test(value) && /\bviewBox=/i.test(value);
  if (requestType === "website" || deliverableType === "website" || deliverableType === "landing_page") {
    return /<svg[\s>]|<html[\s>]/i.test(value) && /aria-label=["'](?:nav|hero|sections)["']|<nav\b|<header\b/i.test(value);
  }
  return true;
}

function hasRealLogoVisualProvider() {
  return false;
}

function hasNvidiaRuntimeProvider() {
  return Boolean(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.length >= 8);
}

function logoProductionStages(brandName?: string | null, durationMs = 0) {
  const brand = brandName ?? "la marque";
  return [
    { id: "brief", label: "Brief", status: "completed", detail: `Brief de logo préparé pour ${brand}.` },
    { id: "research", label: "Recherche", status: "blocked", detail: "Recherche visuelle non lancée: aucun générateur visuel réel branché." },
    { id: "art_direction", label: "Direction artistique", status: "blocked", detail: "Directions créatives à préparer sur demande, sans image affichée." },
    { id: "concepts", label: "Concepts", status: "blocked", detail: "SVG local/mock désactivé en mode simple." },
    { id: "critique", label: "Critique", status: "blocked", detail: "Aucun candidat visuel réel à critiquer." },
    { id: "selection", label: "Sélection", status: "blocked", detail: `Aucun livrable visuel réel sélectionné. Durée route: ${durationMs}ms.` },
  ];
}

function buildLogoPrototypePrompts(brandName?: string | null, context?: string) {
  const brand = brandName ?? "la marque";
  const base = `Prototype de logo vectoriel pour ${brand}. Composition propriétaire, symbole ou monogramme lié au nom, lisible en petit format, pas de carte décorative, pas de texte-only.${context ? ` Contexte: ${context}.` : ""}`;
  return {
    midjourney: `${base} Direction premium, contraste fort, logo mark centered, clean vector geometry, black and neutral presentation, no mockup, no extra text.`,
    ideogram: `${base} Créer 3 explorations: monogramme, symbole géométrique, emblème moderne. Respecter strictement le nom ${brand}.`,
    dalle: `${base} Générer un logo prototype propre avec symbole construit, wordmark ${brand}, fond demandé respecté, rendu vectoriel simple.`,
  };
}

function buildLogoBriefText(brandName?: string | null, constraints: string[] = []) {
  const brand = brandName ?? "la marque";
  return [
    `Brief logo - ${brand}`,
    `Objectif: créer une identité visuelle simple, distinctive et exploitable pour ${brand}.`,
    "Livrable attendu: directions créatives, prompts visuels et guide pour designer humain. Aucun logo final n'est généré sans provider visuel réel.",
    "Directions créatives:",
    "1. Monogramme: travailler les initiales et une structure géométrique propriétaire.",
    "2. Symbole propriétaire: créer une marque abstraite liée à la promesse et au contexte métier.",
    "3. Emblème moderne: développer un badge simple utilisable sur vêtement, web ou support imprimé.",
    "Palette: noir profond, blanc doux, gris neutre, accent unique adapté au positionnement.",
    "Typographie: sans-serif contemporaine, lisible, avec graisse forte pour le wordmark.",
    constraints.length ? `Contraintes détectées: ${constraints.join(", ")}` : "Contraintes détectées: marque lisible, pas de texte-only, pas d'initiale sans rapport.",
  ].join("\n");
}

function buildLogoPromptsText(brandName?: string | null, context?: string) {
  const prompts = buildLogoPrototypePrompts(brandName, context);
  return [
    `Prompts visuels - ${brandName ?? "la marque"}`,
    `Midjourney: ${prompts.midjourney}`,
    `Ideogram: ${prompts.ideogram}`,
    `DALL-E: ${prompts.dalle}`,
    "Guide designer humain: produire d'abord 12 croquis rapides, sélectionner 3 axes, vectoriser 2 versions, tester en petit format, puis vérifier contraste, lisibilité et usage monochrome.",
  ].join("\n\n");
}

async function holdVisibleProductionState() {
  await new Promise((resolve) => setTimeout(resolve, 1400));
}

function sanitizeAttachments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.slice(0, 160) : "fichier";
    const size = typeof record.size === "number" && Number.isFinite(record.size) ? record.size : 0;
    const mimeType = typeof record.mimeType === "string" ? record.mimeType.slice(0, 120) : "application/octet-stream";
    const kind = record.kind === "image" || record.kind === "video" || record.kind === "file" ? record.kind : "file";
    const extension = typeof record.extension === "string" ? record.extension.slice(0, 12) : "";
    return [{ name, size, mimeType, kind, extension }];
  });
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const logoWorkflowAction = body.logoWorkflowAction === "brief" || body.logoWorkflowAction === "prompts" || body.logoWorkflowAction === "local_svg"
      ? body.logoWorkflowAction
      : undefined;
    const attachments = sanitizeAttachments(body.attachments);
    const prompt = typeof body.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim()
      : attachments.length > 0
        ? "Analyse les pièces jointes."
        : "";
    const conversationId = typeof body.conversationId === "string" && body.conversationId.trim()
      ? body.conversationId.trim()
      : `ceo-standalone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    if (!prompt) {
      return NextResponse.json({
        ok: false,
        status: "failed",
        error: "Prompt manquant.",
        artifactPaths: [],
        artifacts: [],
      }, { status: 400 });
    }

    const memoryStore = createMissionMemoryStore({ conversationId });
    const preliminaryWorkOrder = createWorkOrderFromPrompt(prompt);
    const contextSelection = decideContextReuse({
      currentPrompt: prompt,
      currentWorkOrder: preliminaryWorkOrder,
      memory: memoryStore.snapshot(),
    });
    const latest = memoryStore.lastApprovedDeliverable();
    const selectedPrimary = contextSelection.selectedPreviousArtifactId && latest?.primaryArtifactId === contextSelection.selectedPreviousArtifactId
      ? latest
      : null;
    const previousDeliverable = selectedPrimary
      ? {
        deliverableType: selectedPrimary.deliverableType,
        primaryArtifactFingerprint: selectedPrimary.primaryArtifactFingerprint,
        brandName: selectedPrimary.brandName,
      }
      : latest
        ? {
          deliverableType: latest.deliverableType,
          primaryArtifactFingerprint: latest.primaryArtifactFingerprint,
          brandName: latest.brandName,
        }
        : null;

    if (preliminaryWorkOrder.deliverableType === "logo" && !hasRealLogoVisualProvider()) {
      await holdVisibleProductionState();
      const durationMs = Date.now() - startedAt;
      const stages = logoProductionStages(preliminaryWorkOrder.brandName, durationMs);
      const prompts = buildLogoPrototypePrompts(preliminaryWorkOrder.brandName);
      const limitations = [
        "Aucun générateur visuel réel branché.",
        "Le générateur SVG local/mock est désactivé pour ne pas afficher de faux logo.",
        "Le CEO peut préparer le brief, les prompts et les directions créatives.",
      ];
      const runtime = buildMissionLifecycleTrace({
        workOrder: preliminaryWorkOrder,
        nvidiaConfigured: hasNvidiaRuntimeProvider(),
        visualProviderConfigured: false,
        completed: false,
        blockers: ["real_visual_provider_missing", "local_svg_renderer_disabled"],
        retryReasons: ["Aucun générateur image/design réel n'est configuré."],
      });
      memoryStore.addTurn({
        id: preliminaryWorkOrder.turnId,
        userPrompt: prompt,
        workOrderId: preliminaryWorkOrder.id,
        missionId: preliminaryWorkOrder.missionId,
        deliverableType: preliminaryWorkOrder.deliverableType,
        brandName: preliminaryWorkOrder.brandName,
        visibleOutputKind: "none",
        status: "failed",
      });

      if (logoWorkflowAction === "brief" || logoWorkflowAction === "prompts") {
        const isBrief = logoWorkflowAction === "brief";
        const summary = isBrief
          ? buildLogoBriefText(preliminaryWorkOrder.brandName, preliminaryWorkOrder.constraints)
          : buildLogoPromptsText(preliminaryWorkOrder.brandName);

        return NextResponse.json({
          ok: true,
          missionId: preliminaryWorkOrder.missionId,
          projectId: null,
          title: isBrief ? `Brief logo ${preliminaryWorkOrder.brandName ?? ""}`.trim() : `Prompts visuels ${preliminaryWorkOrder.brandName ?? ""}`.trim(),
          requestType: preliminaryWorkOrder.requestType,
          brandName: preliminaryWorkOrder.brandName ?? null,
          deliverableType: isBrief ? "logo_brief" : "logo_prompts",
          status: "ready",
          summary,
          shortMessage: undefined,
          primaryVisualPath: null,
          primaryVisual: null,
          primaryArtifactId: null,
          primaryArtifactFingerprint: null,
          sourceType: "none",
          providerUsed: "none",
          artifactPaths: [],
          artifacts: [],
          missingArtifacts: [],
          workspaceHref: null,
          limitations,
          launchInstructions: Object.values(prompts),
          expert: {
            productionStatus: isBrief ? "brief_prepared" : "visual_prompts_prepared",
            provider: "none",
            diagnostic: {
              providerUsed: "none",
              sourceType: "text",
              route: "POST /api/ceo/command",
              durationMs,
              nvidiaConfigured: hasNvidiaRuntimeProvider(),
              nvidiaCalled: false,
              nvidiaPurpose: "not_called_for_logo_image_generation",
              imageGeneratedByNvidia: false,
              agentsActuallyCalled: ["product_owner", "brand_strategist", "creative_director"],
              artifactsCreated: false,
            },
            runtime,
            plan: { workflow: isBrief ? "logo_brief" : "logo_visual_prompts", stages },
            companyWorkflow: {
              workflow: isBrief ? "logo_brief_no_provider" : "logo_prompts_no_provider",
              workOrder: preliminaryWorkOrder,
              hiddenDetails: {
                prompts,
                limitations,
                agentsCalled: ["product_owner", "brand_strategist", "creative_director"],
                decisions: [
                  "Aucun visuel généré.",
                  isBrief ? "Brief complet préparé." : "Prompts visuels préparés.",
                ],
              },
            },
            inputAttachments: attachments,
          },
        });
      }

      if (logoWorkflowAction === "local_svg") {
        const prototype = runDesignTeamWorkflow(prompt);
        const primaryArtifactFingerprint = createArtifactFingerprint(prototype.primaryVisual);
        return NextResponse.json({
          ok: true,
          missionId: preliminaryWorkOrder.missionId,
          projectId: null,
          title: "Prototype SVG local",
          requestType: preliminaryWorkOrder.requestType,
          brandName: preliminaryWorkOrder.brandName ?? null,
          deliverableType: "logo",
          status: "needs_revision",
          summary: "Prototype SVG local créé à la demande explicite. Ce n'est pas un logo final.",
          shortMessage: undefined,
          primaryVisualPath: null,
          primaryVisual: prototype.primaryVisual,
          primaryArtifactId: `explicit-local-svg-${preliminaryWorkOrder.missionId}`,
          primaryArtifactFingerprint,
          sourceType: "local_explicit",
          providerUsed: "local_svg_renderer_explicit",
          allowLocalPrototype: true,
          prototypeVariants: prototype.concepts.slice(0, 3).map((concept) => ({
            id: concept.id,
            title: concept.name,
            svg: concept.svg,
          })),
          artifactPaths: [],
          artifacts: [],
          missingArtifacts: [],
          workspaceHref: null,
          limitations: ["Prototype SVG local explicitement demandé.", "Pas un logo final.", "Aucun générateur image réel utilisé."],
          launchInstructions: Object.values(prompts),
          expert: {
            productionStatus: "explicit_local_svg_prototype",
            provider: "local_svg_renderer_explicit",
            diagnostic: {
              providerUsed: "local_svg_renderer_explicit",
              sourceType: "local_explicit",
              route: "POST /api/ceo/command",
              durationMs,
              nvidiaConfigured: hasNvidiaRuntimeProvider(),
              nvidiaCalled: false,
              imageGeneratedByNvidia: false,
              agentsActuallyCalled: prototype.hiddenDetails.agentRuns.map((run) => run.role),
              artifactsCreated: false,
              localRendererFile: "src/lib/design-team/logoWorkflow.ts",
              localRendererFunction: "runDesignTeamWorkflow",
            },
            runtime,
            companyWorkflow: {
              workflow: "explicit_local_svg_prototype",
              workOrder: preliminaryWorkOrder,
              hiddenDetails: {
                brief: prototype.brief,
                creativeDirections: prototype.concepts.map(({ svg, ...concept }) => concept),
                prompts,
                limitations: ["Prototype local explicitement demandé."],
                agentsCalled: prototype.hiddenDetails.agentRuns.map((run) => run.role),
                agentRuns: prototype.hiddenDetails.agentRuns,
                toolTrace: prototype.hiddenDetails.toolTrace,
                qualityIssues: prototype.hiddenDetails.qualityIssues,
              },
            },
            inputAttachments: attachments,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        missionId: preliminaryWorkOrder.missionId,
        projectId: null,
        title: "Aucun générateur visuel réel branché",
        requestType: preliminaryWorkOrder.requestType,
        brandName: preliminaryWorkOrder.brandName ?? null,
        deliverableType: "logo",
        status: "needs_revision",
        summary: "Aucun générateur visuel réel branché. Je peux préparer le brief, les prompts et les directions créatives.",
        shortMessage: undefined,
        primaryVisualPath: null,
        primaryVisual: null,
        primaryArtifactId: null,
        primaryArtifactFingerprint: null,
        sourceType: "none",
        providerUsed: "none",
        artifactPaths: [],
        artifacts: [],
        missingArtifacts: [],
        workspaceHref: null,
        limitations,
        launchInstructions: Object.values(prompts),
        expert: {
          productionStatus: "blocked_no_real_visual_provider",
          provider: "none",
          diagnostic: {
            providerUsed: "none",
            sourceType: "blocked",
            disabledSource: "local_svg_renderer",
            route: "POST /api/ceo/command",
            durationMs,
            nvidiaConfigured: hasNvidiaRuntimeProvider(),
            nvidiaCalled: false,
            nvidiaPurpose: "not_called_for_logo_image_generation",
            imageGeneratedByNvidia: false,
            agentsActuallyCalled: [],
            artifactsCreated: false,
            localRendererFile: "src/lib/design-team/logoWorkflow.ts",
            localRendererFunction: "runDesignTeamWorkflow",
            displayDecision: "simple_mode_blocks_local_mock_visuals",
          },
          runtime,
          plan: {
            workflow: "logo_production",
            stages,
          },
          companyWorkflow: {
            workflow: "logo_production_blocked",
            workOrder: preliminaryWorkOrder,
            missionPlan: {
              id: preliminaryWorkOrder.missionId,
              workOrderId: preliminaryWorkOrder.id,
              workflowId: "logo_design",
              objective: `Produire un logo pour ${preliminaryWorkOrder.brandName ?? "la marque"}`,
              agents: ["product_owner", "research_agent", "brand_strategist", "logo_designer", "creative_director", "quality_director", "artifact_manager"],
              tasks: stages,
              qualityGates: ["real_visual_provider_required", "local_svg_renderer_disabled", "no_simple_mode_fake_visual"],
            },
            hiddenDetails: {
              brief: {
                originalPrompt: prompt,
                deliverableType: "logo",
                brandName: preliminaryWorkOrder.brandName,
                constraints: preliminaryWorkOrder.constraints,
              },
              creativeDirections: [
                { name: "Monogramme", rationale: "Direction possible à développer avec un générateur réel." },
                { name: "Symbole propriétaire", rationale: "Direction possible à développer avec un générateur réel." },
                { name: "Emblème moderne", rationale: "Direction possible à développer avec un générateur réel." },
              ],
              artDirectorNotes: [
                "Le SVG local était la source du faux visuel instantané et reste désactivé.",
                "NVIDIA n'est pas appelé ici pour générer une image.",
              ],
              prompts,
              limitations,
              agentsCalled: [],
              agentRuns: [],
              toolTrace: [],
              qualityIssues: ["real_visual_provider_missing", "local_svg_renderer_disabled"],
              decisions: [
                "Demande logo détectée.",
                "Source locale du faux SVG identifiée: src/lib/design-team/logoWorkflow.ts.",
                "Aucun visuel affiché en mode simple sans artifact réel.",
              ],
            },
          },
          inputAttachments: attachments,
        },
      });
    }

    const run = executeProductionMission(prompt);
    const companyWorkflow = runCompanyWorkflow(prompt, { previousDeliverable, contextSelection });
    const workOrder = companyWorkflow.workOrder;
    const artifactPaths = run.manifest.artifactPaths.filter(artifactExists);
    const missingArtifacts = run.manifest.artifactPaths.filter((artifactPath) => !artifactExists(artifactPath));
    const workspace = readGeneratedProject(run.projectSlug);
    const hasArtifacts = artifactPaths.length > 0;
    const primaryVisualPath = typeof run.manifest.primaryVisualPath === "string" && artifactExists(run.manifest.primaryVisualPath)
      ? run.manifest.primaryVisualPath
      : firstVisualArtifact(artifactPaths);
    const filePrimaryVisual = readTextArtifact(primaryVisualPath);
    const workflowVisibleOutput = companyWorkflow.visibleOutput as { primaryVisual?: string; primaryArtifactId?: string } | null;
    const requiresValidatedWorkflowVisual = workOrder.deliverableType === "logo" || workOrder.requestType === "website";
    const workflowPrimaryVisual = workflowVisibleOutput?.primaryVisual ?? null;
    const validWorkflowPrimaryVisual = isValidWorkflowPrimaryVisual(workflowPrimaryVisual, workOrder.deliverableType, workOrder.requestType);
    const primaryVisual = requiresValidatedWorkflowVisual
      ? validWorkflowPrimaryVisual ? workflowPrimaryVisual : null
      : workflowPrimaryVisual ?? filePrimaryVisual;
    const primaryArtifactId = requiresValidatedWorkflowVisual && !validWorkflowPrimaryVisual ? undefined : workflowVisibleOutput?.primaryArtifactId;
    const primaryArtifactFingerprint = primaryVisual ? createArtifactFingerprint(primaryVisual) : undefined;
    const responseDeliverableType = workOrder.deliverableType === "landing_page" ? "website" : workOrder.deliverableType;
    const runtime = buildMissionLifecycleTrace({
      workOrder,
      nvidiaConfigured: hasNvidiaRuntimeProvider(),
      visualProviderConfigured: workOrder.deliverableType === "logo" ? hasRealLogoVisualProvider() : true,
      completed: Boolean(hasArtifacts && (!requiresValidatedWorkflowVisual || (primaryVisual && primaryArtifactId))),
      blockers: [
        ...(!hasArtifacts ? ["no_real_artifacts_created"] : []),
        ...(requiresValidatedWorkflowVisual && !primaryVisual ? ["validated_primary_visual_missing"] : []),
        ...(requiresValidatedWorkflowVisual && !primaryArtifactId ? ["primary_artifact_missing"] : []),
      ],
      retryReasons: run.revisions.map((revision) => revision.reason),
      attempts: run.revisions.length,
    });

    if (!hasArtifacts || (requiresValidatedWorkflowVisual && (!primaryVisual || !primaryArtifactId))) {
      return NextResponse.json({
        ok: false,
        missionId: run.id,
        projectId: run.projectSlug,
        title: workOrder.deliverableType === "logo" ? "Logo non généré" : "Livrable non généré",
        requestType: workOrder.requestType,
        brandName: workOrder.brandName ?? null,
        deliverableType: responseDeliverableType,
        status: "failed",
        summary: requiresValidatedWorkflowVisual
          ? "Le workflow validé n'a pas produit de livrable visuel exploitable."
          : "La production n'a créé aucun artifact réel.",
        artifactPaths: [],
        artifacts: [],
        workspaceHref: null,
        qualityScore: run.manifest.qualityScore,
        expert: {
          runtime,
          plan: run.plan,
          qualityReport: run.qualityReports.at(-1) ?? null,
          revisions: run.revisions,
          manifest: run.manifest,
          companyWorkflow: {
            workflow: companyWorkflow.workflow,
            workOrder: companyWorkflow.workOrder,
            missionPlan: companyWorkflow.missionPlan,
            agentRuns: companyWorkflow.agentRuns,
            hiddenDetails: companyWorkflow.hiddenDetails,
          },
          inputAttachments: attachments,
        },
        error: requiresValidatedWorkflowVisual
          ? "Aucun fallback legacy n'a été affiché."
          : "Aucun fichier traçable n'a été créé. Le projet n'est pas marqué prêt.",
      }, { status: 500 });
    }

    const responsePayload = {
      ok: true,
      missionId: run.id,
      projectId: run.projectSlug,
      title: run.manifest.title,
      requestType: workOrder.requestType,
      brandName: workOrder.brandName ?? null,
      deliverableType: responseDeliverableType,
      status: run.status === "ready" ? "ready" : run.status === "needs_revision" ? "needs_revision" : "rejected",
      summary: run.manifest.summary,
      shortMessage: workOrder.deliverableType === "logo" && workOrder.brandName && /\blogo\b/i.test(prompt)
        ? `Voici une première version du logo ${workOrder.brandName}.`
        : undefined,
      primaryVisualPath,
      primaryVisual,
      primaryArtifactId,
      primaryArtifactFingerprint,
      artifactPaths,
      artifacts: artifactPaths.map((artifactPath) => ({
        path: artifactPath,
        title: path.basename(artifactPath),
        exists: true,
      })),
      missingArtifacts,
      workspaceHref: workspace ? `/projects/${run.projectSlug}` : null,
      qualityScore: run.manifest.qualityScore,
      qualityStatus: run.status === "ready" ? "Prêt" : run.status === "needs_revision" ? "À améliorer" : "Incomplet",
      limitations: run.manifest.limitations ?? [],
      launchInstructions: run.manifest.launch ?? [],
      expert: {
        runtime,
        plan: run.plan,
        qualityReport: run.qualityReports.at(-1) ?? null,
        revisions: run.revisions,
        manifest: run.manifest,
        designTeam: run.manifest.designTeam ?? null,
        companyWorkflow: {
          workflow: companyWorkflow.workflow,
          workOrder: companyWorkflow.workOrder,
          missionPlan: companyWorkflow.missionPlan,
          agentRuns: companyWorkflow.agentRuns,
          hiddenDetails: companyWorkflow.hiddenDetails,
        },
        inputAttachments: attachments,
      },
    };

    memoryStore.addTurn({
      id: workOrder.turnId,
      userPrompt: prompt,
      workOrderId: workOrder.id,
      missionId: workOrder.missionId,
      deliverableType: workOrder.deliverableType,
      brandName: workOrder.brandName,
      visibleOutputKind: workflowVisibleOutput && "kind" in workflowVisibleOutput ? String((workflowVisibleOutput as { kind?: string }).kind ?? "") : undefined,
      primaryArtifactId: workflowVisibleOutput?.primaryArtifactId,
      primaryArtifactFingerprint,
      status: responsePayload.status === "ready" ? "approved" : "failed",
    });
    if (responsePayload.status === "ready" && workflowVisibleOutput?.primaryArtifactId && primaryArtifactFingerprint) {
      const memory = {
        id: `memory-${workOrder.missionId}`,
        turnId: workOrder.turnId,
        missionId: workOrder.missionId,
        workOrderId: workOrder.id,
        deliverableType: workOrder.deliverableType,
        brandName: workOrder.brandName,
        primaryArtifactId: workflowVisibleOutput.primaryArtifactId,
        primaryArtifactFingerprint,
        reusableAssets: [
          reusableAssetFromMission({
            id: `asset-${workflowVisibleOutput.primaryArtifactId}`,
            deliverableType: workOrder.deliverableType,
            brandName: workOrder.brandName,
            primaryArtifactId: workflowVisibleOutput.primaryArtifactId,
            primaryArtifactFingerprint,
            constraints: workOrder.constraints,
          }),
        ],
        summary: "",
        hiddenDetailsRef: `hidden:${workOrder.missionId}`,
      };
      memory.summary = summarizeMissionMemory(memory);
      memoryStore.addApprovedMission(memory);
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json({
      ok: false,
      status: "failed",
      error: message,
      artifactPaths: [],
      artifacts: [],
    }, { status: 500 });
  }
}
