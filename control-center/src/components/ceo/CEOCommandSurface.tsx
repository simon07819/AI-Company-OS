"use client";

import { useState } from "react";
import { useOptionalViewMode } from "@/components/os/ViewModeProvider";
import CEOCommandComposer from "./CEOCommandComposer";
import CEOResultStage from "./CEOResultStage";
import type { CEOCurrentMission, CEOCurrentResult, CEORequestType } from "./types";

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
  primaryArtifactId?: string | null;
  primaryArtifactFingerprint?: string | null;
  status?: "ready" | "needs_revision" | "rejected" | "failed";
  summary?: string;
  artifactPaths?: string[];
  workspaceHref?: string | null;
  qualityScore?: number;
  qualityStatus?: string;
  limitations?: string[];
  launchInstructions?: string[];
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
  if (status === "ready") return "ready";
  if (status === "needs_revision") return "needs_revision";
  if (status === "rejected") return "rejected";
  if (status === "failed") return "error";
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
    primaryArtifactId: payload.primaryArtifactId,
    primaryArtifactFingerprint: payload.primaryArtifactFingerprint,
    status: statusFromCommand(payload.status),
    summary: payload.summary || payload.error || "Production terminée sans résumé.",
    artifactPaths: payload.artifactPaths ?? [],
    workspaceHref: payload.workspaceHref ?? undefined,
    qualityScore: payload.qualityScore,
    qualityStatus: payload.qualityStatus,
    limitations: payload.limitations,
    launchInstructions: payload.launchInstructions,
    expert: payload.expert,
  };
}

export default function CEOCommandSurface() {
  const viewMode = useOptionalViewMode();
  const isExpert = viewMode?.isExpert ?? false;
  const toggleMode = viewMode?.toggleMode ?? (() => undefined);
  const [mission, setMission] = useState<CEOCurrentMission | null>(null);
  const [result, setResult] = useState<CEOCurrentResult | null>(null);
  const [conversationId] = useState(() => `ceo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const [turns, setTurns] = useState<Array<{ id: string; mission: CEOCurrentMission; result: CEOCurrentResult }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCommand = async (prompt: string) => {
    const requestType = detectRequestType(prompt);
    const pendingMission: CEOCurrentMission = {
      id: `local-${Date.now()}`,
      prompt,
      requestType,
      status: "production",
      createdAt: new Date().toISOString(),
      artifactCount: 0,
    };
    setLoading(true);
    setError(null);
    setMission(pendingMission);
    setResult(null);

    try {
      const response = await fetch("/api/ceo/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, expertMode: isExpert, conversationId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        const failedMission = missionFromCommand(prompt, payload);
        const failedResult = resultFromCommand(prompt, {
          ...payload,
          title: payload.title || "Aucun artifact réel créé",
          status: payload.status || "failed",
          summary: payload.error || "Impossible de créer le projet. Détail disponible en mode expert.",
          artifactPaths: payload.artifactPaths ?? [],
        });
        setMission(failedMission);
        setResult(failedResult);
        setTurns((items) => [...items, { id: failedMission.id, mission: failedMission, result: failedResult }]);
        return;
      }
      const nextMission = missionFromCommand(prompt, payload);
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
    }
  };

  return (
    <main className="ceo-chat-page">
      <section className="ceo-chat-shell" aria-label="Chat CEO">
        <header className="ceo-chat-header">
          <div className="ceo-chat-agent">
            <div className="ceo-chat-avatar" aria-label="Avatar CEO">C</div>
            <div>
              <strong>CEO</strong>
              <span>En ligne</span>
            </div>
          </div>
          <button className="ceo-chat-mode-toggle" type="button" onClick={toggleMode} aria-label={isExpert ? "Revenir au chat simple" : "Ouvrir les options expert"} title={isExpert ? "Chat simple" : "Options expert"}>
            <span aria-hidden="true">...</span>
            <span className="ceo-sr-only">Expert</span>
          </button>
        </header>

        <CEOResultStage
          result={result}
          mission={mission}
          turns={turns}
          expertMode={isExpert}
          loading={loading}
          error={error}
          onModify={() => document.querySelector<HTMLTextAreaElement>(".ceo-os-composer textarea")?.focus()}
          onContinue={() => document.querySelector<HTMLTextAreaElement>(".ceo-os-composer textarea")?.focus()}
        />

        <CEOCommandComposer loading={loading} onSubmit={submitCommand} />
      </section>
    </main>
  );
}
