"use client";

import { useState } from "react";
import AttachmentDropzone from "./AttachmentDropzone";
import CEOCommandComposer from "./CEOCommandComposer";
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

interface AutopilotMissionSummary {
  missionId: string;
  status: string;
  progressPercent: number;
  currentPhase: string;
  nextActions: string[];
  blockers: string[];
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

export default function CEOCommandSurface() {
  const isExpert = false;
  const [mission, setMission] = useState<CEOCurrentMission | null>(null);
  const [result, setResult] = useState<CEOCurrentResult | null>(null);
  const [conversationId] = useState(() => `ceo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const [turns, setTurns] = useState<Array<{ id: string; mission: CEOCurrentMission; result: CEOCurrentResult }>>([]);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [autopilotLoading, setAutopilotLoading] = useState(false);
  const [autopilotMission, setAutopilotMission] = useState<AutopilotMissionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memoryNotice, setMemoryNotice] = useState<string | null>(null);

  const submitCommand = async (prompt: string, attachments: ChatAttachment[] = [], action?: CEOMissionAction) => {
    const runtimePrompt = prompt || "Analyse les pièces jointes.";
    const requestType = detectRequestType(prompt);
    const isLogoAction = Boolean(action);
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
    setPendingAttachments(attachments);
    setLoading(true);
    setError(null);
    setMission(pendingMission);
    setResult(null);

    try {
      const response = await fetch("/api/ceo/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: runtimePrompt,
          displayPrompt: prompt,
          expertMode: isExpert,
          conversationId,
          action,
          attachments: attachments.map(attachmentPayload),
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

  const callAutopilot = async (endpoint: "start" | "step" | "pause" | "resume" | "cancel") => {
    setAutopilotLoading(true);
    setError(null);
    try {
      const body = endpoint === "start"
        ? {
            command: mission?.prompt || result?.summary || "Mission longue CEO",
            parentMissionId: mission?.id,
          }
        : {
            missionId: autopilotMission?.missionId,
            maxSteps: 1,
          };
      const response = await fetch(`/api/autopilot/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        setError(payload.error || "Autopilot indisponible.");
        return;
      }
      setAutopilotMission(payload.mission ?? payload.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Autopilot indisponible.");
    } finally {
      setAutopilotLoading(false);
    }
  };

  return (
    <main className="ceo-chat-page">
      <AttachmentDropzone disabled={loading} onFiles={(files) => setDroppedFiles(files)}>
        <section className="ceo-chat-shell" aria-label="Chat CEO">
          <header className="ceo-chat-header">
            <div className="ceo-chat-agent">
              <div className="ceo-chat-avatar" aria-label="Avatar CEO">C</div>
              <div>
                <strong>CEO</strong>
                <span>En ligne</span>
              </div>
            </div>
            <button type="button" className="ceo-autopilot-button" disabled={autopilotLoading} onClick={() => callAutopilot("start")}>
              Mission longue
            </button>
          </header>

          {autopilotMission && (
            <section className="ceo-autopilot-panel" aria-label="Mission longue autopilot">
              <div>
                <strong>{autopilotMission.status === "completed" ? "Mission longue terminée" : "Mission longue active"}</strong>
                <span>{autopilotMission.progressPercent}% · {autopilotMission.currentPhase}</span>
                <small>{autopilotMission.nextActions[0] || autopilotMission.blockers[0] || "Supervision CEO active"}</small>
              </div>
              <div className="ceo-autopilot-actions">
                <button type="button" disabled={autopilotLoading || autopilotMission.status === "paused" || autopilotMission.status === "completed" || autopilotMission.status === "canceled"} onClick={() => callAutopilot("step")}>
                  Avancer
                </button>
                {autopilotMission.status === "paused" ? (
                  <button type="button" disabled={autopilotLoading} onClick={() => callAutopilot("resume")}>
                    Reprendre
                  </button>
                ) : (
                  <button type="button" disabled={autopilotLoading || autopilotMission.status === "completed" || autopilotMission.status === "canceled"} onClick={() => callAutopilot("pause")}>
                    Pause
                  </button>
                )}
                <a href="/ceo/expert">Voir détails</a>
              </div>
            </section>
          )}

          <CEOResultStage
            result={result}
            mission={mission}
            turns={turns}
            expertMode={isExpert}
            loading={loading}
            error={error}
            pendingAttachments={pendingAttachments}
            onModify={() => submitCommand(mission?.prompt || result?.brandName || "Modifier le livrable", mission?.attachments ?? [], "modify_current_deliverable")}
            onLogoAction={(nextAction, promptOverride) => submitCommand(promptOverride || mission?.prompt || result?.brandName || "logo", mission?.attachments ?? [], nextAction)}
            onMemoryAction={writeMemoryAction}
            onContinue={() => document.querySelector<HTMLTextAreaElement>(".ceo-os-composer textarea")?.focus()}
          />
          {memoryNotice && <p className="ceo-memory-notice">{memoryNotice}</p>}

          <CEOCommandComposer loading={loading} onSubmit={submitCommand} droppedFiles={droppedFiles} onDroppedFilesConsumed={() => setDroppedFiles([])} />
        </section>
      </AttachmentDropzone>
    </main>
  );
}
