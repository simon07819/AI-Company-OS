"use client";

import { useEffect, useRef, useState } from "react";
import AttachmentDropzone from "./AttachmentDropzone";
import CEOCommandComposer from "./CEOCommandComposer";
import CEOProjectPanel from "./CEOProjectPanel";
import CEOResultStage from "./CEOResultStage";
import CodePreviewFrame from "./CodePreviewFrame";
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

const STORAGE_KEY = "ceo_active_session";

const TEMPLATES = [
  { label: "🎨 Logo & Branding",  prompt: "Crée un logo et une identité de marque complète pour une agence créative premium." },
  { label: "🌐 Site web",          prompt: "Crée une landing page complète pour une startup SaaS avec hero, features, pricing et CTA." },
  { label: "📱 App mobile",        prompt: "Conçois l'UI d'une app mobile de fitness avec dashboard, programme et tracking." },
  { label: "💼 Carte d'affaire",   prompt: "Crée une carte d'affaire HTML professionnelle pour une agence de design." },
  { label: "📦 Kit SaaS",          prompt: "Génère un dashboard SaaS complet avec sidebar, métriques, tableaux et graphiques." },
  { label: "📣 Réseaux sociaux",   prompt: "Crée un kit de visuels pour réseaux sociaux: post Instagram, cover LinkedIn, stories." },
  { label: "⚡ Demande libre",      prompt: "" },
];

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

export default function CEOCommandSurface() {
  const isExpert = false;
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
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);

  // Restore previous session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          turns?: Array<{ id: string; mission: CEOCurrentMission; result: CEOCurrentResult }>;
          mission?: CEOCurrentMission;
          result?: CEOCurrentResult;
        };
        if (Array.isArray(parsed.turns) && parsed.turns.length > 0) {
          setTurns(parsed.turns);
          if (parsed.mission) setMission(parsed.mission);
          if (parsed.result) setResult(parsed.result);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist session to localStorage whenever conversation changes
  useEffect(() => {
    if (turns.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ turns, mission, result, savedAt: Date.now() }));
    } catch {}
  }, [turns, mission, result]);

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

  const handleArchive = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTurns([]);
    setMission(null);
    setResult(null);
    window.location.href = "/outputs";
  };

  const handleNewProject = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = `/ceo?session=${Date.now()}`;
  };

  const handlePanelArchive = (turnId: string) => {
    const turn = turns.find((t) => t.id === turnId);
    const name = turn?.result?.brandName || turn?.mission?.prompt?.slice(0, 40) || "ce projet";
    if (!window.confirm(`Archiver "${name}" ?`)) return;
    setTurns((prev) => prev.filter((t) => t.id !== turnId));
    // Try to archive server-side if a project slug is available via workspaceHref
    const slug = turn?.result?.workspaceHref?.split("/").pop();
    if (slug) {
      fetch(`/api/ceo-projects/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      }).catch(() => {});
    }
  };

  const handlePanelDelete = (turnId: string) => {
    const turn = turns.find((t) => t.id === turnId);
    const name = turn?.result?.brandName || turn?.mission?.prompt?.slice(0, 40) || "ce projet";
    if (!window.confirm(`Supprimer définitivement "${name}" ?`)) return;
    setTurns((prev) => prev.filter((t) => t.id !== turnId));
    if (mission?.id === turnId) {
      setMission(null);
      setResult(null);
    }
    const slug = turn?.result?.workspaceHref?.split("/").pop();
    if (slug) {
      fetch(`/api/ceo-projects/${slug}`, { method: "DELETE" }).catch(() => {});
    }
  };

  const activeProjectName = result?.brandName || result?.title || (turns.length > 0 ? turns[turns.length - 1]?.result?.brandName || turns[turns.length - 1]?.result?.title : null);
  const showProjects = (mission || turns.length > 0);

  return (
    <main className="ceo-chat-page">
      {/* Top bar */}
      <div className="ceo-topbar">
        <span className="ceo-topbar-title">
          Chat CEO{activeProjectName ? ` — ${activeProjectName}` : ""}
        </span>
        <div className="ceo-topbar-actions">
          <button
            type="button"
            className="ceo-topbar-btn"
            onClick={handleArchive}
          >
            Archiver
          </button>
          <button
            type="button"
            className="ceo-topbar-btn"
            onClick={handleNewProject}
          >
            + Nouveau projet
          </button>
        </div>
      </div>

      {/* Zone 1: Chat messages */}
      <AttachmentDropzone disabled={loading} onFiles={(files) => files.forEach(handleFileUpload)}>
        <div className="ceo-zone-chat" aria-label="Messages">
          {/* Empty state */}
          {!loading && !mission && turns.length === 0 && (
            <div className="ceo-empty-state">
              <svg className="ceo-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <p className="ceo-empty-text">Dis au CEO ce que tu veux créer</p>
              <div className="ceo-starter-cards" aria-label="Suggestions">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    className="ceo-starter-card"
                    onClick={() => {
                      if (t.prompt) void submitCommand(t.prompt);
                    }}
                    disabled={loading}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline stages indicator */}
          {loading && pipelineStages.length > 0 && (
            <div className="pipeline-progress" aria-live="polite">
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

          {/* Messages */}
          <CEOResultStage
            result={result}
            mission={mission}
            turns={turns}
            expertMode={isExpert}
            loading={loading}
            error={error}
            pendingAttachments={pendingAttachments}
            onModify={() => void submitCommand(`Améliore le rendu actuel en gardant la même direction: ${mission?.prompt || result?.brandName || result?.title || "artefact"}`, mission?.attachments ?? [])}
            onLogoAction={(nextAction, promptOverride) => void submitCommand(promptOverride || mission?.prompt || result?.brandName || "logo", mission?.attachments ?? [], nextAction)}
            onMemoryAction={writeMemoryAction}
            onQuickPrompt={(nextPrompt) => void submitCommand(nextPrompt, mission?.attachments ?? [])}
            onContinue={() => document.querySelector<HTMLTextAreaElement>(".ceo-os-composer textarea")?.focus()}
          />
          {memoryNotice && <p className="ceo-memory-notice" style={{ fontSize: 11, color: "var(--text-muted)", padding: "4px 0" }}>{memoryNotice}</p>}

          {/* Thinking indicator — shows while CEO is processing, never clears history */}
          {loading && (
            <div className="ceo-thinking-bubble" aria-live="polite" aria-label="CEO en train de répondre">
              <span className="ceo-thinking-avatar">CEO</span>
              <div className="ceo-thinking-dots">
                <span className="ceo-thinking-dot" />
                <span className="ceo-thinking-dot" />
                <span className="ceo-thinking-dot" />
              </div>
            </div>
          )}
        </div>
      </AttachmentDropzone>

      {/* Zone 2: Input bar */}
      <div className="ceo-zone-input">
        <CEOCommandComposer loading={loading} onSubmit={submitCommand} droppedFiles={droppedFiles} onDroppedFilesConsumed={() => setDroppedFiles([])} />
      </div>

      {/* Zone 3: Project panel */}
      {showProjects && (
        <div className="ceo-zone-projects">
          <CEOProjectPanel
            mission={mission}
            result={result}
            turns={turns}
            loading={loading}
            pipelineStages={pipelineStages}
            projectId={conversationId}
            onAddRequest={(req) => void submitCommand(req)}
            onCompare={(a, b) => setCompareIds([a, b])}
            onArchiveTurn={handlePanelArchive}
            onDeleteTurn={handlePanelDelete}
          />
        </div>
      )}

      {/* Compare overlay */}
      {compareIds && (() => {
        const a = turns.find((t) => t.id === compareIds[0]);
        const b = turns.find((t) => t.id === compareIds[1]);
        if (!a || !b) return null;
        return (
          <div className="ceo-compare-overlay" role="dialog" aria-label="Comparaison de versions">
            <div className="ceo-compare-header">
              <span>Comparaison côte à côte</span>
              <button onClick={() => setCompareIds(null)} className="ceo-compare-close">✕</button>
            </div>
            <div className="ceo-compare-grid">
              <div className="ceo-compare-pane">
                <div className="ceo-compare-label">{a.result.title}</div>
                {a.result.primaryArtifactId
                  ? <CodePreviewFrame artifactId={a.result.primaryArtifactId} code={a.result.summary} title={a.result.title} />
                  : <pre className="ceo-compare-code"><code>{a.result.summary}</code></pre>
                }
              </div>
              <div className="ceo-compare-pane">
                <div className="ceo-compare-label">{b.result.title}</div>
                {b.result.primaryArtifactId
                  ? <CodePreviewFrame artifactId={b.result.primaryArtifactId} code={b.result.summary} title={b.result.title} />
                  : <pre className="ceo-compare-code"><code>{b.result.summary}</code></pre>
                }
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
