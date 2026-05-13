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

function logoProductionStages(brandName?: string | null) {
  const brand = brandName ?? "la marque";
  return [
    { id: "brief", label: "Brief", status: "completed", detail: `Brief de logo préparé pour ${brand}.` },
    { id: "research", label: "Recherche", status: "completed", detail: "Références et contraintes préparées pour un prototype vectoriel local." },
    { id: "art_direction", label: "Direction artistique", status: "completed", detail: "Directions monogramme, symbole et emblème préparées." },
    { id: "concepts", label: "Concepts", status: "completed", detail: "Variantes SVG prototype générées localement." },
    { id: "critique", label: "Critique", status: "completed", detail: "Concepts text-only, placeholders et initiales hors sujet rejetés." },
    { id: "refinement", label: "Amélioration", status: "completed", detail: "Prototype retenu ajusté avant affichage." },
    { id: "selection", label: "Sélection", status: "completed", detail: "Prototype sélectionné comme livrable non final." },
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
  try {
    const body = await req.json().catch(() => ({}));
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
      const prototype = runDesignTeamWorkflow(prompt);
      const primaryArtifactFingerprint = createArtifactFingerprint(prototype.primaryVisual);
      const stages = logoProductionStages(preliminaryWorkOrder.brandName);
      const prompts = buildLogoPrototypePrompts(preliminaryWorkOrder.brandName, prototype.brief.style);
      const limitations = [
        "Prototype vectoriel local, pas un logo final.",
        "Aucun générateur image avancé n'est branché pour produire une version finale photoréaliste ou exploratoire.",
        "Les prompts fournis peuvent être utilisés dans un générateur image/design externe.",
      ];
      const runtime = buildMissionLifecycleTrace({
        workOrder: preliminaryWorkOrder,
        nvidiaConfigured: hasNvidiaRuntimeProvider(),
        visualProviderConfigured: false,
        completed: true,
        localPrototypeGenerated: true,
        blockers: ["external_image_generator_missing"],
        retryReasons: ["Prototype vectoriel local produit en attendant un générateur image/design avancé."],
      });
      memoryStore.addTurn({
        id: preliminaryWorkOrder.turnId,
        userPrompt: prompt,
        workOrderId: preliminaryWorkOrder.id,
        missionId: preliminaryWorkOrder.missionId,
        deliverableType: preliminaryWorkOrder.deliverableType,
        brandName: preliminaryWorkOrder.brandName,
        visibleOutputKind: "visual",
        primaryArtifactId: `local-vector-prototype-${preliminaryWorkOrder.missionId}`,
        primaryArtifactFingerprint,
        status: "approved",
      });

      return NextResponse.json({
        ok: true,
        missionId: preliminaryWorkOrder.missionId,
        projectId: null,
        title: "Prototype de logo",
        requestType: preliminaryWorkOrder.requestType,
        brandName: preliminaryWorkOrder.brandName ?? null,
        deliverableType: "logo",
        status: "needs_revision",
        summary: "Prototype préparé avec le générateur vectoriel local. Pour un rendu final photoréaliste/avancé, branche un générateur image.",
        shortMessage: undefined,
        primaryVisualPath: null,
        primaryVisual: prototype.primaryVisual,
        primaryArtifactId: `local-vector-prototype-${preliminaryWorkOrder.missionId}`,
        primaryArtifactFingerprint,
        prototypeVariants: prototype.concepts.slice(0, 3).map((concept) => ({
          id: concept.id,
          title: concept.name,
          svg: concept.svg,
        })),
        artifactPaths: [],
        artifacts: [],
        missingArtifacts: [],
        workspaceHref: null,
        limitations,
        launchInstructions: Object.values(prompts),
        expert: {
          productionStatus: "local_vector_prototype",
          provider: "local_vector_renderer",
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
              qualityGates: ["prototype_not_final", "no_fake_final_logo", "no_simple_mode_process"],
            },
            hiddenDetails: {
              brief: prototype.brief,
              creativeDirections: prototype.concepts.map(({ svg, ...concept }) => concept),
              artDirectorNotes: prototype.artDirectorNotes,
              prompts,
              limitations,
              agentsCalled: ["product_owner", "research_agent", "brand_strategist", "logo_designer", "creative_director", "quality_director", "artifact_manager"],
              agentRuns: prototype.hiddenDetails.agentRuns,
              toolTrace: prototype.hiddenDetails.toolTrace,
              qualityIssues: prototype.hiddenDetails.qualityIssues,
              decisions: [
                "Demande logo détectée.",
                "Générateur image/design avancé absent.",
                "Prototype vectoriel local préparé et affiché sans le qualifier de final.",
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
