"use client";

import { useEffect, useRef, useState } from "react";
import AttachmentDropzone from "./AttachmentDropzone";
import CEOCommandComposer from "./CEOCommandComposer";
import CEOProjectPanel from "./CEOProjectPanel";
import CEOResultStage from "./CEOResultStage";
import { attachmentPayload } from "./attachments";
import type { CEOMemoryAction, CEOMissionAction, ChatAttachment, CEOCurrentMission, CEOCurrentResult, CEORequestType } from "./types";

interface CommandResponse {
  ok: boolean;
  missionId?: string;
  projectId?: string;
  title?: string;
  requestType?: string;
  brandName?: string | null;
  deliverableType?: string;
  shortMessage?: string;
  primaryVisualPath?: string | null;
  primaryVisual?: string | null;
  artifactId?: string | null;
  primaryArtifactId?: string | null;
  primaryArtifactFingerprint?: string | null;
  sourceType?: CEOCurrentResult["sourceType"];
  providerUsed?: string | null;
  allowLocalPrototype?: boolean;
  prototypeVariants?: CEOCurrentResult["prototypeVariants"];
  status?: CEOCurrentMission["status"];
  summary?: string;
  artifactPaths?: string[];
  workspaceHref?: string | null;
  qualityScore?: number;
  qualityStatus?: string;
  limitations?: string[];
  launchInstructions?: string[];
  deliverables?: CEOCurrentResult["deliverables"];
  error?: string;
  expert?: CEOCurrentResult["expert"];
}

function detectRequestType(prompt: string): CEORequestType {
  const normalized = prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/site web|site internet|website|landing|page web|homepage|page d'accueil/.test(normalized)) return "website";
  if (/\blogo\b/.test(normalized)) return "branding";
  if (/branding|identite|marque/.test(normalized)) return "branding";
  if (/\bsaas\b|logiciel/.test(normalized)) return "saas";
  if (/\bapp\b|application/.test(normalized)) return "app";
  if (/automation|automatisation|workflow|systeme|système/.test(normalized)) return "business-system";
  return "unknown";
}

function statusFromCommand(status?: CommandResponse["status"]): CEOCurrentMission["status"] {
  if (status === "failed") return "error";
  if (status === "queued" || status === "planning" || status === "running" || status === "reviewing" || status === "needs_action" || status === "completed") return status;
  if (status === "ready") return "ready";
  if (status === "needs_revision") return "needs_revision";
  if (status === "rejected") return "rejected";
  return "validation";
}

function missionFromCommand(prompt: string, payload: CommandResponse): CEOCurrentMission {
  return {
    id: payload.missionId ?? payload.projectId ?? `mission-${Date.now()}`,
    prompt,
    requestType: (payload.requestType as CEORequestType) || detectRequestType(prompt),
    status: statusFromCommand(payload.status),
    createdAt: new Date().toISOString(),
    artifactCount: payload.artifactPaths?.length ?? 0,
    workspaceHref: payload.workspaceHref ?? undefined,
    qualityScore: payload.qualityScore,
  };
}

function resultFromCommand(prompt: string, payload: CommandResponse): CEOCurrentResult {
  return {
    title: payload.title || (payload.ok ? "Projet généré" : "Aucun artifact réel créé"),
    requestType: (payload.requestType as CEORequestType) || detectRequestType(prompt),
    brandName: payload.brandName,
    deliverableType: payload.deliverableType,
    shortMessage: payload.shortMessage,
    primaryVisualPath: payload.primaryVisualPath,
    primaryVisual: payload.primaryVisual,
    artifactId: payload.artifactId,
    primaryArtifactId: payload.primaryArtifactId,
    primaryArtifactFingerprint: payload.primaryArtifactFingerprint,
    sourceType: payload.sourceType,
    providerUsed: payload.providerUsed,
    allowLocalPrototype: payload.allowLocalPrototype,
    prototypeVariants: payload.prototypeVariants,
    status: statusFromCommand(payload.status),
    summary: payload.summary || payload.error || "Production terminée sans résumé.",
    artifactPaths: payload.artifactPaths ?? [],
    workspaceHref: payload.workspaceHref ?? undefined,
    qualityScore: payload.qualityScore,
    qualityStatus: payload.qualityStatus,
    limitations: payload.limitations,
    launchInstructions: payload.launchInstructions,
    deliverables: payload.deliverables,
    expert: payload.expert,
  };
}

interface PipelineStage {
  stage: string;
  status: "started" | "completed" | "failed";
  data?: Record<string, unknown>;
}

const STAGE_LABELS: Record<string, string> = {
  tech_selector: "Stack technique",
  architect: "Architecture",
  code_writer: "Génération du code",
  qa_reviewer: "Révision QA",
  done: "Terminé",
};

export default function CEOCommandSurface({ expertMode = false }: { expertMode?: boolean }) {
  const isExpert = expertMode;
  const [mission, setMission] = useState<CEOCurrentMission | null>(null);
  const [result, setResult] = useState<CEOCurrentResult | null>(null);
  const [conversationId] = useState(() => `ceo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const [turns, setTurns] = useState<Array<{ id: string; mission: CEOCurrentMission; result: CEOCurrentResult }>>([]);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memoryNotice, setMemoryNotice] = useState<string | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => { sseRef.current?.close(); };
  }, []);

  const handleFileUpload = (file: File) => {
    setDroppedFiles((current) => [...current, file]);
  };

  const submitCommand = async (prompt: string, attachments: ChatAttachment[] = [], action?: CEOMissionAction) => {
    const runtimePrompt = prompt || "Analyse les pièces jointes.";
    const requestType = detectRequestType(prompt);
    const isLogoAction = Boolean(action);
    const conversationHistory = turns.flatMap(({ mission, result }) => [
      { role: "user" as const, content: mission.prompt },
      { role: "assistant" as const, content: result.summary || result.shortMessage || result.title || "" },
    ]);
    const actionPrompt =
      action === "prepare_brief"
        ? "Préparer le brief"
        : action === "create_visual_prompts"
          ? "Créer prompts visuels"
          : action === "request_local_prototype"
            ? "Prototype SVG local"
            : action === "modify_current_deliverable"
              ? "Modifier le livrable"
            : prompt;
    const pendingMission: CEOCurrentMission = {
      id: `local-${Date.now()}`,
      prompt: isLogoAction ? actionPrompt : prompt,
      hideUserPrompt: isLogoAction,
      attachments,
      requestType,
      status: "production",
      createdAt: new Date().toISOString(),
      artifactCount: 0,
    };
    const streamId = `stream-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    setPendingAttachments(attachments);
    setPipelineStages([]);
    setLoading(true);
    setError(null);
    setMission(pendingMission);
    setResult(null);

    // Open SSE before POST so we catch all stage events
    sseRef.current?.close();
    const sse = new EventSource(`/api/stream/${streamId}`);
    sseRef.current = sse;
    sse.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as PipelineStage;
        setPipelineStages((prev) => {
          const idx = prev.findIndex((s) => s.stage === event.stage);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = event;
            return next;
          }
          return [...prev, event];
        });
      } catch {}
    };
    sse.onerror = () => sse.close();

    // Give SSE 200ms to connect before the POST fires
    await new Promise<void>((resolve) => setTimeout(resolve, 200));

    try {
      const response = await fetch("/api/ceo/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: runtimePrompt,
          displayPrompt: prompt,
          expertMode: isExpert,
          conversationId,
          streamId,
          action,
          attachments: attachments.map(attachmentPayload),
          conversationHistory,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        const cleanFailureSummary = payload.error && payload.error !== payload.summary
          ? `${payload.summary || "Impossible de créer le projet."} ${payload.error}`
          : payload.summary || payload.error || "Impossible de créer le projet. Détail disponible en mode expert.";
        const failedMission = {
          ...missionFromCommand(runtimePrompt, payload),
          prompt: isLogoAction ? actionPrompt : prompt,
          hideUserPrompt: isLogoAction,
          attachments,
        };
        const failedResult = resultFromCommand(prompt, {
          ...payload,
          title: payload.title || "Aucun artifact réel créé",
          status: payload.status || "failed",
          summary: cleanFailureSummary,
          artifactPaths: payload.artifactPaths ?? [],
        });
        setMission(failedMission);
        setResult(failedResult);
        setTurns((items) => [...items, { id: failedMission.id, mission: failedMission, result: failedResult }]);
        return;
      }
      const nextMission = {
        ...missionFromCommand(runtimePrompt, payload),
        prompt: isLogoAction ? actionPrompt : prompt,
        hideUserPrompt: isLogoAction,
        attachments,
      };
      const nextResult = resultFromCommand(prompt, payload);
      setMission(nextMission);
      setResult(nextResult);
      setTurns((items) => [...items, { id: nextMission.id, mission: nextMission, result: nextResult }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue.";
      setMission({ ...pendingMission, status: "error" });
      setResult(null);
      setError(message);
    } finally {
      setLoading(false);
      setPendingAttachments([]);
      sseRef.current?.close();
      sseRef.current = null;
      setPipelineStages([]);
    }
  };

  const writeMemoryAction = async (action: CEOMemoryAction, currentResult: CEOCurrentResult) => {
    setMemoryNotice(null);
    const missionId = mission?.id ?? currentResult.primaryArtifactId ?? currentResult.artifactId ?? "manual-memory";
    const text = action === "avoid_style"
      ? currentResult.summary || currentResult.title
      : currentResult.title || currentResult.summary;
    try {
      const response = await fetch("/api/ceo/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          missionId,
          missionType: currentResult.deliverableType ?? currentResult.requestType ?? "general",
          text,
          artifactId: currentResult.primaryArtifactId ?? currentResult.artifactId,
          brandName: currentResult.brandName,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      setMemoryNotice(response.ok && payload.ok ? "Mémoire mise à jour." : "Mémoire non enregistrée.");
    } catch {
      setMemoryNotice("Mémoire non enregistrée.");
    }
  };

  return (
    <main className="ceo-chat-page">
      <AttachmentDropzone disabled={loading} onFiles={(files) => files.forEach(handleFileUpload)}>
        <section className="ceo-chat-shell" aria-label="Chat CEO">
          <header className="ceo-chat-header">
            <div className="ceo-chat-agent">
              <div className="ceo-chat-avatar" aria-label="Avatar CEO">C</div>
              <div>
                <strong>CEO</strong>
              </div>
            </div>
          </header>

          <div className="ceo-zone-messages">
            {loading && pipelineStages.length > 0 && (
              <div className="pipeline-progress" aria-live="polite" aria-label="Avancement pipeline">
                {pipelineStages.filter((s) => s.stage !== "done").map((s) => (
                  <div key={s.stage} className={`pipeline-stage pipeline-stage-${s.status}`}>
                    <span className="pipeline-stage-icon" aria-hidden="true">
                      {s.status === "completed" ? "✓" : s.status === "failed" ? "✗" : "◌"}
                    </span>
                    <span className="pipeline-stage-label">{STAGE_LABELS[s.stage] ?? s.stage}</span>
                    {s.status === "completed" && typeof s.data?.framework === "string" && (
                      <span className="pipeline-stage-meta">{s.data.framework}</span>
                    )}
                    {s.status === "completed" && typeof s.data?.score === "number" && (
                      <span className="pipeline-stage-meta">score {s.data.score}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <CEOResultStage
              result={result}
              mission={mission}
              turns={turns}
              expertMode={isExpert}
              loading={loading}
              error={error}
              pendingAttachments={pendingAttachments}
              onModify={() => submitCommand(`Améliore le rendu actuel en gardant la même direction: ${mission?.prompt || result?.brandName || result?.title || "artefact"}`, mission?.attachments ?? [])}
              onLogoAction={(nextAction, promptOverride) => submitCommand(promptOverride || mission?.prompt || result?.brandName || "logo", mission?.attachments ?? [], nextAction)}
              onMemoryAction={writeMemoryAction}
              onQuickPrompt={(nextPrompt) => submitCommand(nextPrompt, mission?.attachments ?? [])}
              onContinue={() => document.querySelector<HTMLTextAreaElement>(".ceo-os-composer textarea")?.focus()}
            />
            {memoryNotice && <p className="ceo-memory-notice">{memoryNotice}</p>}
          </div>

          <CEOCommandComposer loading={loading} onSubmit={submitCommand} droppedFiles={droppedFiles} onDroppedFilesConsumed={() => setDroppedFiles([])} />
        </section>
      </AttachmentDropzone>

      {(mission || turns.length > 0) && (
        <CEOProjectPanel
          mission={mission}
          result={result}
          turns={turns}
          loading={loading}
          onAddRequest={(req) => submitCommand(req)}
        />
      )}
    </main>
  );
}
