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
import {
  addDeliverable,
  addMissionEvent,
  addProviderResult,
  applyMissionAction,
  buildLogoPromptsText,
  completeMissionStep,
  createMissionRuntime,
  normalizeMissionAction,
  planLogoMissionWithoutProvider,
  runMissionAgents,
  setMissionStatus,
} from "@/lib/mission-runtime/missionRuntime";
import {
  createTraceableArtifact,
  websiteArtifactProviderResult,
} from "@/lib/providers/providerRegistry";

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
  const startedAt = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const missionAction = normalizeMissionAction(body.action ?? body.logoWorkflowAction);
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
      const prompts = buildLogoPrototypePrompts(preliminaryWorkOrder.brandName);
      const limitations = [
        "Aucun générateur visuel réel branché.",
        "Le générateur SVG local/mock est désactivé pour ne pas afficher de faux logo.",
        "Le CEO peut préparer le brief, les prompts et les directions créatives.",
      ];
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

      if (missionAction === "prepare_brief" || missionAction === "create_visual_prompts") {
        const isBrief = missionAction === "prepare_brief";
        const { mission } = await applyMissionAction(prompt, missionAction, preliminaryWorkOrder.missionId);
        const summary = mission.deliverables[0]?.content ?? (isBrief ? "Brief disponible." : buildLogoPromptsText(preliminaryWorkOrder.brandName));

        return NextResponse.json({
          ok: true,
          missionId: preliminaryWorkOrder.missionId,
          projectId: null,
          title: isBrief ? `Brief logo ${preliminaryWorkOrder.brandName ?? ""}`.trim() : `Prompts visuels ${preliminaryWorkOrder.brandName ?? ""}`.trim(),
          requestType: preliminaryWorkOrder.requestType,
          brandName: preliminaryWorkOrder.brandName ?? null,
          deliverableType: isBrief ? "logo_brief" : "logo_prompts",
          status: mission.status,
          mission,
          deliverables: mission.deliverables,
          artifactId: mission.deliverables[0]?.artifactId,
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
            runtime: mission,
            plan: { workflow: isBrief ? "prepare_brief" : "create_visual_prompts", stages: mission.steps },
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

      if (missionAction === "request_local_prototype") {
        const { mission } = await applyMissionAction(prompt, "request_local_prototype", preliminaryWorkOrder.missionId);
        const prototype = runDesignTeamWorkflow(prompt);
        const primaryArtifactFingerprint = createArtifactFingerprint(prototype.primaryVisual);
        const artifact = createTraceableArtifact({
          missionId: mission.missionId,
          type: "local_prototype",
          title: "Prototype SVG local",
          sourceType: "local_svg",
          providerUsed: "local_svg_renderer_explicit",
          content: prototype.primaryVisual,
        });
        addDeliverable(mission, {
          type: "local_prototype",
          title: "Prototype SVG local",
          content: prototype.primaryVisual,
          mediaType: "svg",
          sourceType: "local_svg",
          providerUsed: "local_svg_renderer_explicit",
          artifactId: artifact.artifactId,
        });
        runMissionAgents(mission, { imageProviderAvailable: false, localPrototypeRequested: true, reset: true });
        setMissionStatus(mission, "needs_action");
        return NextResponse.json({
          ok: true,
          missionId: preliminaryWorkOrder.missionId,
          projectId: null,
          title: "Prototype SVG local",
          requestType: preliminaryWorkOrder.requestType,
          brandName: preliminaryWorkOrder.brandName ?? null,
          deliverableType: "logo",
          status: mission.status,
          mission,
          deliverables: mission.deliverables,
          artifactId: artifact.artifactId,
          summary: "Prototype SVG local créé à la demande explicite. Ce n'est pas un livrable de provider image.",
          shortMessage: undefined,
          primaryVisualPath: null,
          primaryVisual: prototype.primaryVisual,
          primaryArtifactId: artifact.artifactId,
          primaryArtifactFingerprint,
          sourceType: "local_svg",
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
          limitations: ["Prototype SVG local explicitement demandé.", "Aucun générateur image réel utilisé."],
          launchInstructions: Object.values(prompts),
          expert: {
            productionStatus: "explicit_local_svg_prototype",
            provider: "local_svg_renderer_explicit",
            diagnostic: {
              providerUsed: "local_svg_renderer_explicit",
              sourceType: "local_svg",
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
            runtime: mission,
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

      if (missionAction === "modify_current_deliverable") {
        const { mission } = await applyMissionAction(prompt, "modify_current_deliverable", preliminaryWorkOrder.missionId);
        return NextResponse.json({
          ok: true,
          missionId: preliminaryWorkOrder.missionId,
          projectId: null,
          title: "Modification à préciser",
          requestType: preliminaryWorkOrder.requestType,
          brandName: preliminaryWorkOrder.brandName ?? null,
          deliverableType: "logo",
          status: mission.status,
          mission,
          deliverables: mission.deliverables,
          artifactId: null,
          summary: "Dis-moi quoi modifier: style, couleurs, nom, usage, ton ou contrainte. Aucun visuel n'est généré sans provider réel.",
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
            productionStatus: "modification_waiting_for_instruction",
            provider: "none",
            diagnostic: {
              providerUsed: "none",
              sourceType: "none",
              route: "POST /api/ceo/command",
              durationMs,
              nvidiaConfigured: hasNvidiaRuntimeProvider(),
              nvidiaCalled: false,
              imageGeneratedByNvidia: false,
              artifactsCreated: false,
            },
            runtime: mission,
            inputAttachments: attachments,
          },
        });
      }

      const { mission } = await planLogoMissionWithoutProvider(prompt, preliminaryWorkOrder.missionId);
      return NextResponse.json({
        ok: true,
        missionId: preliminaryWorkOrder.missionId,
        projectId: null,
        title: "Aucun générateur visuel réel branché",
        requestType: preliminaryWorkOrder.requestType,
        brandName: preliminaryWorkOrder.brandName ?? null,
        deliverableType: "logo",
        status: mission.status,
        mission,
        deliverables: mission.deliverables,
        artifactId: null,
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
            sourceType: "none",
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
          runtime: mission,
          plan: {
            workflow: "logo_mission_runtime",
            stages: mission.steps,
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
              tasks: mission.steps,
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
    const lifecycleTrace = buildMissionLifecycleTrace({
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
    const missionRuntime = createMissionRuntime(prompt, run.id);
    if (missionAction) {
      addMissionEvent(missionRuntime, "action_requested", `Action requested: ${missionAction}.`, { action: missionAction });
    }
    completeMissionStep(missionRuntime, "analyse_demande", "Demande analysée.");
    if (workOrder.requestType === "website") {
      completeMissionStep(missionRuntime, "architecture", "Architecture préparée.");
      completeMissionStep(missionRuntime, "design_direction", "Direction de design préparée.");
      if (primaryVisual) completeMissionStep(missionRuntime, "preview", "Preview générée.");
      if (primaryArtifactId) completeMissionStep(missionRuntime, "review", "Preview validée.");
    } else {
      completeMissionStep(missionRuntime, "plan", "Plan préparé.");
      if (hasArtifacts) completeMissionStep(missionRuntime, "execution", "Artifacts créés.");
      if (primaryArtifactId || !requiresValidatedWorkflowVisual) completeMissionStep(missionRuntime, "review", "Review complétée.");
    }
    missionRuntime.providerUsed = workOrder.deliverableType === "logo" ? "none" : "artifact_pipeline";
    missionRuntime.sourceType = primaryVisual ? "artifact" : "none";
    missionRuntime.retries = run.revisions.length;
    if (primaryVisual) {
      const artifact = createTraceableArtifact({
        missionId: missionRuntime.missionId,
        type: workOrder.requestType === "website" ? "website_preview" : "artifact",
        title: run.manifest.title,
        sourceType: workOrder.requestType === "website" ? "code_artifact" : "local_storage",
        providerUsed: workOrder.requestType === "website" ? "artifact_pipeline" : "local_storage",
        content: primaryVisual,
        path: primaryVisualPath ?? undefined,
      });
      addProviderResult(missionRuntime, websiteArtifactProviderResult(artifact.artifactId));
      addDeliverable(missionRuntime, {
        type: workOrder.requestType === "website" ? "website_preview" : "artifact",
        title: run.manifest.title,
        content: primaryVisual,
        mediaType: primaryVisual.includes("<html") ? "html" : "svg",
        sourceType: workOrder.requestType === "website" ? "code_artifact" : "local_storage",
        providerUsed: workOrder.requestType === "website" ? "artifact_pipeline" : "local_storage",
        artifactId: artifact.artifactId,
      });
    }
    runMissionAgents(missionRuntime, {
      imageProviderAvailable: workOrder.deliverableType === "logo" ? hasRealLogoVisualProvider() : false,
      reset: true,
    });
    setMissionStatus(
      missionRuntime,
      hasArtifacts && (!requiresValidatedWorkflowVisual || (primaryVisual && primaryArtifactId)) ? "completed" : "failed",
    );

    if (!hasArtifacts || (requiresValidatedWorkflowVisual && (!primaryVisual || !primaryArtifactId))) {
      return NextResponse.json({
        ok: false,
        missionId: run.id,
        mission: missionRuntime,
        projectId: run.projectSlug,
        title: workOrder.deliverableType === "logo" ? "Logo non généré" : "Livrable non généré",
        requestType: workOrder.requestType,
        brandName: workOrder.brandName ?? null,
        deliverableType: responseDeliverableType,
        status: "failed",
        sourceType: missionRuntime.sourceType,
        providerUsed: missionRuntime.providerUsed,
        artifactId: missionRuntime.deliverables[0]?.artifactId,
        summary: requiresValidatedWorkflowVisual
          ? "Le workflow validé n'a pas produit de livrable visuel exploitable."
          : "La production n'a créé aucun artifact réel.",
        artifactPaths: [],
        artifacts: [],
        workspaceHref: null,
        qualityScore: run.manifest.qualityScore,
        expert: {
          runtime: missionRuntime,
          lifecycleTrace,
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
      mission: missionRuntime,
      artifactId: missionRuntime.deliverables[0]?.artifactId,
      projectId: run.projectSlug,
      title: run.manifest.title,
      requestType: workOrder.requestType,
      brandName: workOrder.brandName ?? null,
      deliverableType: responseDeliverableType,
      status: missionRuntime.status,
      sourceType: missionRuntime.sourceType,
      providerUsed: missionRuntime.providerUsed,
      deliverables: missionRuntime.deliverables,
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
        artifactId: missionRuntime.deliverables.find((deliverable) => deliverable.content === primaryVisual)?.artifactId,
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
        runtime: missionRuntime,
        lifecycleTrace,
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
      status: responsePayload.status === "completed" ? "approved" : "failed",
    });
    if (responsePayload.status === "completed" && workflowVisibleOutput?.primaryArtifactId && primaryArtifactFingerprint) {
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
