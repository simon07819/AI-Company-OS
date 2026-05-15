import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { executeProductionMission } from "@/lib/orchestrator/missionExecutor";
import { buildMissionLifecycleTrace } from "@/lib/orchestrator/missionLifecycle";
import { runDirectorWorkflow } from "@/lib/agents/director/directorWorkflow";
import { persistCommandConversation } from "@/lib/ceoChatPersist";
import { readGeneratedProject } from "@/lib/product-builder/workspace";
import { runCompanyWorkflow } from "@/agents/workflows/company-workflow";
import { createArtifactFingerprint } from "@/agents/artifacts/artifact-fingerprint";
import { createMissionMemoryStore, reusableAssetFromMission } from "@/agents/memory/mission-memory-store";
import { decideContextReuse } from "@/agents/memory/reuse-policy";
import { createWorkOrderFromPrompt } from "@/agents/runtime/work-order";
import { summarizeMissionMemory } from "@/agents/memory/memory-summary";
import { runDesignTeamWorkflow } from "@/lib/design-team/logoWorkflow";
import { requireUser } from "@/lib/auth/serverAuth";
import { runCeoWorkflow } from "@/lib/agents/ceoWorkflowRouter";
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
  runLogoMissionWithImageProvider,
  runMissionAgents,
  setMissionStatus,
} from "@/lib/mission-runtime/missionRuntime";
import {
  createTraceableArtifact,
  hasImageProvider,
  websiteArtifactProviderResult,
} from "@/lib/providers/providerRegistry";
import { getNvidiaImageDiagnostics } from "@/lib/providers/nvidiaImageProvider";
import { generateWithLlm } from "@/lib/ai/llmClient";
import { saveProjectBrand, extractColors, extractTypography } from "@/lib/brand/projectBrandStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Intent detection helpers ─────────────────────────────────────────────────

const OBVIOUS_PROJECT_RE = /logo|site\s*web|landing|website|carte\s*d[''e]\s*affaire|branding|identit[eé]|marque|saas|dashboard|design|application|prototype|visuel|infographie|banner|affiche|packaging/i;

type Intent = "conversation" | "question" | "project_correction" | "project_request";

async function detectIntent(
  message: string,
  history: Array<{ role: string; content: string }>,
): Promise<Intent> {
  if (OBVIOUS_PROJECT_RE.test(message)) return "project_request";
  const historyText = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join("\n");
  const result = await generateWithLlm({
    purpose: "intent_detection",
    system: "You are an intent classifier. Respond with ONLY one word from this list: conversation, question, project_correction, project_request.",
    user: `Classify the intent of this message.\nConversation history:\n${historyText || "(none)"}\n\nNew message: "${message}"\n\nRespond with ONLY ONE WORD: conversation | question | project_correction | project_request`,
    maxTokens: 12,
  });
  const text = result.text.trim().toLowerCase().split(/\W/)[0] ?? "";
  if (text === "project_correction") return "project_correction";
  if (text === "project_request") return "project_request";
  if (text === "question") return "question";
  if (text === "conversation") return "conversation";
  return "project_request";
}

async function directCEOReply(
  message: string,
  history: Array<{ role: string; content: string }>,
): Promise<string> {
  const historyText = history.slice(-6).map((m) => `${m.role === "user" ? "User" : "CEO"}: ${m.content}`).join("\n");
  const result = await generateWithLlm({
    purpose: "ceo_conversation",
    system: `You are the CEO of a professional AI creative agency called AI Agency OS.
You are helpful, direct, and knowledgeable about design, branding, marketing, and technology.
Respond in the same language the user writes in (French if they write French).
Be conversational and friendly — not just a task executor.
When asked for opinions, give real ones. When asked about capabilities, explain clearly.
Keep responses concise: 2-4 sentences for casual chat, more detail for real questions.`,
    user: historyText ? `${historyText}\nUser: ${message}` : message,
    maxTokens: 400,
  });
  return result.text.trim() || "Je suis là pour vous aider. Dites-moi ce que vous voulez créer.";
}

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
  return hasImageProvider();
}

function hasNvidiaRuntimeProvider() {
  return Boolean(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.length >= 8);
}

function buildLogoPrototypePrompts(brandName?: string | null, context?: string) {
  const brand = brandName ?? "la marque";
  const base = `Prototype de logo vectoriel pour ${brand}. Composition propriétaire, symbole ou monogramme lié au nom, lisible en petit format, pas de carte décorative, pas de texte-only.${context ? ` Contexte: ${context}.` : ""}`;
  return {
    qwenImage: `${base} Direction premium, contraste fort, logo mark centered, clean vector geometry, black and neutral presentation, no mockup, no extra text.`,
    flux: `${base} Créer 3 explorations: monogramme, symbole géométrique, emblème moderne. Respecter strictement le nom ${brand}.`,
    visualGenaiNim: `${base} Générer un logo prototype propre avec symbole construit, wordmark ${brand}, fond demandé respecté, rendu vectoriel simple.`,
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
  const auth = requireUser(req);
  if (auth.response) return auth.response;

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

    const rawHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
    const conversationHistory = rawHistory.slice(-20).flatMap((m: unknown) => {
      if (!m || typeof m !== "object") return [];
      const record = m as Record<string, unknown>;
      const role = record.role === "user" || record.role === "assistant" ? record.role : null;
      const content = typeof record.content === "string" && record.content.trim() ? record.content.trim().slice(0, 1500) : null;
      if (!role || !content) return [];
      return [{ role, content }];
    }) as Array<{ role: "user" | "assistant"; content: string }>;

    const conversationContext = conversationHistory.length
      ? `HISTORIQUE:\n${conversationHistory.map((m) => (m.role === "user" ? `User: ${m.content}` : `CEO: ${m.content}`)).join("\n")}\n\n`
      : "";

    const streamId = typeof body.streamId === "string" && body.streamId.trim() ? body.streamId.trim() : undefined;

    if (!prompt) {
      return NextResponse.json({
        ok: false,
        status: "failed",
        error: "Prompt manquant.",
        artifactPaths: [],
        artifacts: [],
      }, { status: 400 });
    }

    // ── Brand context confirmation prefix ─────────────────────────────────────
    const { readProjectBrand: readProjBrand } = await import("@/lib/brand/projectBrandStore");
    const activeBrand = readProjBrand(conversationId);
    const brandConfirmation = activeBrand?.name
      ? `Je réutilise la marque **${activeBrand.name}** approuvée. `
      : "";

    // ── Intent detection: short-circuit pipeline for conversational messages ──
    if (!missionAction) {
      const intent = await detectIntent(prompt, conversationHistory).catch(() => "project_request" as Intent);
      if (intent === "conversation" || intent === "question") {
        const reply = await directCEOReply(prompt, conversationHistory);
        const fullReply = brandConfirmation + reply;
        persistCommandConversation(prompt, fullReply, { requestType: "conversation", intent });
        return NextResponse.json({
          ok: true,
          missionId: `conv-${Date.now().toString(36)}`,
          projectId: null,
          title: "CEO",
          requestType: "conversation",
          deliverableType: "conversation",
          status: "completed",
          summary: fullReply,
          shortMessage: fullReply,
          primaryVisual: null,
          primaryVisualPath: null,
          primaryArtifactId: null,
          primaryArtifactFingerprint: null,
          artifactPaths: [],
          artifacts: [],
          missingArtifacts: [],
          workspaceHref: null,
          sourceType: "none",
          providerUsed: "none",
          limitations: [],
          launchInstructions: [],
          expert: {
            productionStatus: "direct_ceo_conversation",
            provider: "nvidia",
            diagnostic: { intent, route: "POST /api/ceo/command" },
            runtime: null,
            inputAttachments: attachments,
          },
        });
      }
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

    const ceoWorkflow = preliminaryWorkOrder.requestType !== "website" && !missionAction
      ? await runCeoWorkflow(prompt, preliminaryWorkOrder.missionId, conversationContext, streamId, conversationId)
      : null;

    if (ceoWorkflow) {
      await holdVisibleProductionState();
      const primaryArtifactFingerprint = ceoWorkflow.outputData ? createArtifactFingerprint(ceoWorkflow.outputData) : null;
      const durationMs = Date.now() - startedAt;
      const isImageOutput = ceoWorkflow.sourceType === "deepinfra_image" || ceoWorkflow.sourceType === "nvidia_image";
      const deliverableType = ceoWorkflow.workflowType === "code"
        ? "code"
        : ceoWorkflow.workflowType === "assets"
          ? "asset"
          : "graphic_image";
      const title = ceoWorkflow.title;
      const summary = ceoWorkflow.workflowType === "code" && ceoWorkflow.outputData
        ? ceoWorkflow.outputData
        : ceoWorkflow.shortMessage;
      const workflowModel = "model" in ceoWorkflow.expert ? ceoWorkflow.expert.model : undefined;
      const workflowArtifactPath = "artifactPath" in ceoWorkflow ? ceoWorkflow.artifactPath : undefined;
      const workflowArtifactUrl = "artifactUrl" in ceoWorkflow ? ceoWorkflow.artifactUrl : undefined;
      const artifactPaths = workflowArtifactPath ? [workflowArtifactPath] : [];

      if (ceoWorkflow.artifactId && ceoWorkflow.outputData && isImageOutput) {
        memoryStore.addTurn({
          id: preliminaryWorkOrder.turnId,
          userPrompt: prompt,
          workOrderId: preliminaryWorkOrder.id,
          missionId: ceoWorkflow.missionId,
          deliverableType,
          brandName: preliminaryWorkOrder.brandName,
          visibleOutputKind: "image",
          primaryArtifactId: ceoWorkflow.artifactId,
          primaryArtifactFingerprint: primaryArtifactFingerprint ?? undefined,
          status: "approved",
        });
      }

      // Save brand memory after any graphic/logo deliverable
      const isBrandingDeliverable = ceoWorkflow.workflowType === "graphic" || /logo|brand|marque|identit/i.test(prompt);
      if (isBrandingDeliverable && ceoWorkflow.outputData) {
        const colors = extractColors(ceoWorkflow.outputData);
        const typography = extractTypography(ceoWorkflow.outputData);
        saveProjectBrand(conversationId, {
          name: preliminaryWorkOrder.brandName ?? title ?? "Marque",
          colors,
          typography,
          tone: [],
          logoArtifactId: ceoWorkflow.artifactId ?? null,
          logoContent: isImageOutput ? null : ceoWorkflow.outputData?.slice(0, 3000) ?? null,
          targetAudience: "",
          positioning: "",
        });
      }

      return NextResponse.json({
        ok: true,
        missionId: ceoWorkflow.missionId,
        projectId: null,
        title,
        requestType: preliminaryWorkOrder.requestType,
        brandName: preliminaryWorkOrder.brandName ?? null,
        deliverableType,
        status: ceoWorkflow.status,
        qualityStatus: ceoWorkflow.artifactId && (artifactPaths.length > 0 || ceoWorkflow.outputData) ? "Artifact image créé" : undefined,
        artifactId: ceoWorkflow.artifactId,
        summary,
        shortMessage: ceoWorkflow.shortMessage,
        primaryVisualPath: null,
        primaryVisual: isImageOutput ? ceoWorkflow.outputData : null,
        primaryArtifactId: ceoWorkflow.artifactId,
        primaryArtifactFingerprint,
        sourceType: ceoWorkflow.sourceType,
        providerUsed: ceoWorkflow.providerUsed,
        artifactPaths,
        artifacts: ceoWorkflow.artifactId ? [{
          artifactId: ceoWorkflow.artifactId,
          title,
          path: workflowArtifactPath,
          url: workflowArtifactUrl,
          exists: true,
          sourceType: ceoWorkflow.sourceType,
          providerUsed: ceoWorkflow.providerUsed,
        }] : [],
        missingArtifacts: [],
        workspaceHref: null,
        limitations: ceoWorkflow.outputData ? [] : ["Aucun fallback SVG ou local n'est généré sans provider configuré."],
        launchInstructions: [],
        expert: {
          productionStatus: ceoWorkflow.status === "completed" ? "ceo_workflow_completed" : "ceo_workflow_needs_action",
          provider: ceoWorkflow.providerUsed,
          diagnostic: {
            providerUsed: ceoWorkflow.providerUsed,
            sourceType: ceoWorkflow.sourceType,
            artifactId: ceoWorkflow.artifactId,
            route: "POST /api/ceo/command",
            durationMs,
            model: workflowModel,
            providerDurationMs: ceoWorkflow.expert.durationMs,
            artifactsCreated: Boolean(ceoWorkflow.artifactId),
            agent: ceoWorkflow.agent,
          },
          runtime: ceoWorkflow.runtime,
          inputAttachments: attachments,
        },
      });
    }

    if (preliminaryWorkOrder.deliverableType === "logo" && hasRealLogoVisualProvider() && !missionAction) {
      await holdVisibleProductionState();
      const { mission, workOrder } = await runLogoMissionWithImageProvider(prompt, preliminaryWorkOrder.missionId);
      const imageDeliverable = mission.deliverables.find((deliverable) => deliverable.sourceType === "nvidia_image" && deliverable.artifactId);
      const primaryVisual = imageDeliverable?.content ?? null;
      const primaryArtifactFingerprint = primaryVisual ? createArtifactFingerprint(primaryVisual) : null;
      const durationMs = Date.now() - startedAt;

      memoryStore.addTurn({
        id: workOrder.turnId,
        userPrompt: prompt,
        workOrderId: workOrder.id,
        missionId: workOrder.missionId,
        deliverableType: workOrder.deliverableType,
        brandName: workOrder.brandName,
        visibleOutputKind: primaryVisual ? "image" : "none",
        primaryArtifactId: imageDeliverable?.artifactId,
        primaryArtifactFingerprint: primaryArtifactFingerprint ?? undefined,
        status: mission.status === "completed" ? "approved" : "failed",
      });

      if (!primaryVisual || !imageDeliverable?.artifactId) {
        return NextResponse.json({
          ok: true,
          missionId: mission.missionId,
          projectId: null,
          title: "Provider image NVIDIA indisponible",
          requestType: workOrder.requestType,
          brandName: workOrder.brandName ?? null,
          deliverableType: "logo",
          status: mission.status,
          mission,
          deliverables: mission.deliverables,
          artifactId: null,
          summary: "NVIDIA image est configuré comme provider, mais aucun artifact image n'a été retourné. Brief, directions et prompts restent disponibles.",
          shortMessage: undefined,
          primaryVisualPath: null,
          primaryVisual: null,
          primaryArtifactId: null,
          primaryArtifactFingerprint: null,
          sourceType: mission.sourceType === "provider_unavailable" ? "none" : mission.sourceType,
          providerUsed: mission.providerUsed,
          artifactPaths: [],
          artifacts: [],
          missingArtifacts: [],
          workspaceHref: null,
          limitations: ["Aucun fallback local automatique.", "Prototype SVG local seulement sur action explicite."],
          launchInstructions: [buildLogoPromptsText(workOrder.brandName)],
          expert: {
            productionStatus: "nvidia_image_provider_unavailable",
            provider: mission.providerUsed,
            diagnostic: {
              providerUsed: mission.providerUsed,
              sourceType: mission.sourceType,
              route: "POST /api/ceo/command",
              durationMs,
              nvidiaConfigured: hasNvidiaRuntimeProvider(),
              nvidiaCalled: true,
              nvidiaPurpose: "logo_image_generation",
              imageGeneratedByNvidia: false,
              model: mission.providerResults.find((result) => result.capability === "image")?.model,
              artifactsCreated: false,
            },
            runtime: mission,
            inputAttachments: attachments,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        missionId: mission.missionId,
        projectId: null,
        title: imageDeliverable.title,
        requestType: workOrder.requestType,
        brandName: workOrder.brandName ?? null,
        deliverableType: "logo",
        status: mission.status,
        mission,
        deliverables: mission.deliverables,
        artifactId: imageDeliverable.artifactId,
        summary: "Image logo générée par le provider NVIDIA et reliée à la mission.",
        shortMessage: "Image logo prête.",
        primaryVisualPath: null,
        primaryVisual,
        primaryArtifactId: imageDeliverable.artifactId,
        primaryArtifactFingerprint,
        sourceType: "nvidia_image",
        providerUsed: "nvidia",
        artifactPaths: [],
        artifacts: [{
          artifactId: imageDeliverable.artifactId,
          title: imageDeliverable.title,
          exists: true,
          sourceType: "nvidia_image",
          providerUsed: "nvidia",
        }],
        missingArtifacts: [],
        workspaceHref: null,
        limitations: ["Aucun fallback local automatique.", "Prototype SVG local seulement sur action explicite."],
        launchInstructions: [buildLogoPromptsText(workOrder.brandName)],
        expert: {
          productionStatus: "nvidia_image_artifact_created",
          provider: "nvidia",
          diagnostic: {
            providerUsed: "nvidia",
            sourceType: "nvidia_image",
            artifactId: imageDeliverable.artifactId,
            route: "POST /api/ceo/command",
            durationMs,
            nvidiaConfigured: hasNvidiaRuntimeProvider(),
            nvidiaCalled: true,
            nvidiaPurpose: "logo_image_generation",
            imageGeneratedByNvidia: true,
            model: mission.providerResults.find((result) => result.capability === "image")?.model,
            providerDurationMs: mission.providerResults.find((result) => result.capability === "image")?.durationMs,
            artifactsCreated: true,
          },
          runtime: mission,
          plan: { workflow: "nvidia_logo_image_runtime", stages: mission.steps },
          inputAttachments: attachments,
        },
      });
    }

    if (preliminaryWorkOrder.deliverableType === "logo" && (!hasRealLogoVisualProvider() || missionAction)) {
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
      const nvidiaImageDiagnostic = getNvidiaImageDiagnostics();
      const missingImageConfig = nvidiaImageDiagnostic.missing.length
        ? `Variables manquantes: ${nvidiaImageDiagnostic.missing.join(", ")}.`
        : nvidiaImageDiagnostic.reasons.join(" ");
      const noProviderSummary = nvidiaImageDiagnostic.providerSelected
        ? `Configuration NVIDIA image incomplète. NVIDIA image est sélectionné, mais indisponible. ${missingImageConfig} Modèle: ${nvidiaImageDiagnostic.model}. Endpoint: ${nvidiaImageDiagnostic.endpointHost ?? "manquant"}.`
        : `Configuration NVIDIA image incomplète. ${missingImageConfig} Ajoute IMAGE_PROVIDER=nvidia, NVIDIA_IMAGE_ENDPOINT=<endpoint NVIDIA image réel depuis build.nvidia.com> et NVIDIA_IMAGE_MODEL=${nvidiaImageDiagnostic.model} dans .env.local. NVIDIA_API_KEY est requise mais sa valeur ne doit jamais être affichée.`;
      return NextResponse.json({
        ok: true,
        missionId: preliminaryWorkOrder.missionId,
        projectId: null,
        title: "Configuration NVIDIA image incomplète",
        requestType: preliminaryWorkOrder.requestType,
        brandName: preliminaryWorkOrder.brandName ?? null,
        deliverableType: "logo",
        status: mission.status,
        mission,
        deliverables: mission.deliverables,
        artifactId: null,
        summary: noProviderSummary,
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
            nvidiaImage: {
              providerSelected: nvidiaImageDiagnostic.providerSelected,
              providerAvailable: nvidiaImageDiagnostic.providerAvailable,
              endpointHost: nvidiaImageDiagnostic.endpointHost ?? null,
              model: nvidiaImageDiagnostic.model,
              missing: nvidiaImageDiagnostic.missing,
              reasons: nvidiaImageDiagnostic.reasons,
              suggestedFix: nvidiaImageDiagnostic.suggestedFix,
            },
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

    const missionStartedAt = new Date();
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

    // ── Director validation + CEO synthesis ──────────────────────────────
    const director = await runDirectorWorkflow(prompt, run, missionStartedAt, conversationContext).catch(() => null);

    // ── Persist conversation to ceo-chat.json ────────────────────────────
    const ceoResponseText = director?.ceoFacingMessage ?? responsePayload.summary ?? run.manifest.title;
    persistCommandConversation(prompt, ceoResponseText, {
      requestType: workOrder.requestType,
      directorApproved: director?.directorApproved,
      qualityScore: run.manifest.qualityScore,
      intent: workOrder.requestType,
    });

    return NextResponse.json({
      ...responsePayload,
      ...(director ? {
        director: {
          approved: director.directorApproved,
          message: director.directorMessage,
          ceoSummary: director.validation.ceoSummary,
          strengths: director.validation.strengths,
          improvements: director.validation.improvements,
          revisionNeeded: director.validation.revisionNeeded,
          nextSteps: director.synthesis.nextSteps,
          kpi: director.kpi,
          mode: director.mode,
        },
        summary: director.ceoFacingMessage || responsePayload.summary,
      } : {}),
    });
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
