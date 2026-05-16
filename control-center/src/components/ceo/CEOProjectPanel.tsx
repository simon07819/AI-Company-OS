"use client";

import { useState, useCallback } from "react";
import { Download, X, Pencil, Link } from "lucide-react";
import ContentEditor from "./ContentEditor";
import type { CEOCurrentMission, CEOCurrentResult, CEOMissionStatus } from "./types";
import CodePreviewFrame from "./CodePreviewFrame";

interface PipelineStage {
  stage: string;
  status: "started" | "completed" | "failed";
  data?: Record<string, unknown>;
}

interface ProjectPanelProps {
  mission: CEOCurrentMission | null;
  result: CEOCurrentResult | null;
  turns: Array<{ id: string; mission: CEOCurrentMission; result: CEOCurrentResult }>;
  loading: boolean;
  pipelineStages?: PipelineStage[];
  onAddRequest: (prompt: string) => void;
  onCompare?: (idA: string, idB: string) => void;
  onArchiveTurn?: (turnId: string) => void;
  onDeleteTurn?: (turnId: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  brand_strategist: "Brand Strategist",
  art_director: "Art Director",
  logo_designer: "Logo Designer",
  graphic_designer: "Graphiste",
  coder: "Développeur",
  tech_selector: "Stack technique",
  architect: "Architecture",
  code_writer: "Génération code",
  qa_reviewer: "Révision QA",
  quality_director: "Directeur QA",
  creative_director: "Directeur créatif",
  director: "CEO Synthèse",
  done: "Terminé",
};

function statusBadge(s: CEOMissionStatus | undefined, active: boolean): { label: string; cls: string } {
  if (active) return { label: "En cours", cls: "running" };
  if (!s) return { label: "En attente", cls: "waiting" };
  if (s === "completed" || s === "ready") return { label: "Terminé ✓", cls: "done" };
  if (s === "error" || s === "failed" || s === "rejected") return { label: "Erreur", cls: "error" };
  if (s === "needs_revision" || s === "needs_action") return { label: "Révision", cls: "revision" };
  if (s === "production" || s === "running" || s === "planning" || s === "reviewing" || s === "queued") return { label: "En cours", cls: "running" };
  return { label: "En attente", cls: "waiting" };
}

interface PreviewTarget {
  title: string;
  version: number;
  result: CEOCurrentResult;
}

function PreviewModal({ target, onClose, projectId, onRequestCEO }: { target: PreviewTarget; onClose: () => void; projectId?: string; onRequestCEO?: (msg: string) => void }) {
  const { result, title, version } = target;
  const [approved, setApproved] = useState(false);
  const [approving, setApproving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const isWebsite = result.deliverableType === "website" || result.deliverableType === "landing_page";
  const isCode = result.deliverableType === "code" || result.sourceType === "codex_code" || result.sourceType === "nvidia_text";
  const isImage = Boolean(result.primaryVisual && /^data:image\//i.test(result.primaryVisual ?? ""));
  const isSvg = Boolean(result.primaryVisual && /<svg[\s>]/i.test(result.primaryVisual ?? "") && !isImage);
  const hasArtifact = Boolean(result.primaryArtifactId);
  const downloadHref = result.primaryArtifactId ? `/api/export/${result.primaryArtifactId}` : undefined;

  const handleApprove = async () => {
    if (approved || !result.primaryArtifactId) return;
    setApproving(true);
    try {
      await fetch(`/api/deliverables/${result.primaryArtifactId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId ?? "unknown",
          title,
          deliverableType: result.deliverableType ?? "unknown",
          version,
        }),
      });
      setApproved(true);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div
      className="ceo-preview-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu — ${title}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ceo-preview-modal">
        <div className="ceo-preview-modal-header">
          <div className="ceo-preview-modal-title">
            <strong>{title}</strong>
            <span className="ceo-preview-modal-version">v{version}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {approved ? (
              <span className="ceo-approved-badge">✓ Approuvé</span>
            ) : result.primaryArtifactId ? (
              <button
                type="button"
                className="ceo-approve-btn"
                onClick={handleApprove}
                disabled={approving}
                aria-label="Approuver ce livrable"
              >
                {approving ? "..." : "✓ Approuver"}
              </button>
            ) : null}
            {(isWebsite || isCode) && result.primaryArtifactId && (
              <button
                type="button"
                className="ceo-preview-modal-download"
                onClick={() => setEditMode(true)}
                aria-label="Modifier le contenu"
                style={{ gap: 4 }}
              >
                <Pencil size={13} />
                Modifier
              </button>
            )}
            {downloadHref && (
              <a
                href={downloadHref}
                download
                className="ceo-preview-modal-download"
                aria-label="Télécharger"
              >
                <Download size={14} />
                Télécharger
              </a>
            )}
            <button
              type="button"
              className="ceo-preview-modal-close"
              onClick={onClose}
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {editMode && result.primaryArtifactId && (
          <ContentEditor
            artifactId={result.primaryArtifactId}
            initialContent={result.summary ?? ""}
            title={title}
            onClose={() => setEditMode(false)}
            onRequestCEO={(msg) => { onRequestCEO?.(msg); onClose(); }}
          />
        )}

        <div className="ceo-preview-modal-body">
          {!hasArtifact ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              Génération en cours...
            </div>
          ) : isWebsite && result.primaryArtifactId ? (
            <iframe
              src={`/api/preview/${result.primaryArtifactId}`}
              title={title}
              width="100%"
              height="500px"
              style={{ border: "none", borderRadius: 6 }}
            />
          ) : isCode && result.primaryArtifactId ? (
            <CodePreviewFrame
              artifactId={result.primaryArtifactId}
              code={result.summary}
              title={title}
            />
          ) : isImage ? (
            <img
              src={result.primaryVisual ?? ""}
              alt={title}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", margin: "0 auto" }}
            />
          ) : isSvg ? (
            <div
              style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
              dangerouslySetInnerHTML={{ __html: result.primaryVisual ?? "" }}
            />
          ) : (
            <div style={{ padding: 24 }}>
              <strong style={{ display: "block", marginBottom: 12, color: "#f4f4f5" }}>{title}</strong>
              <p style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.6 }}>{result.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CEOProjectPanel({
  mission, result, turns, loading, pipelineStages = [],
  onCompare, onArchiveTurn, onDeleteTurn, projectId, onAddRequest,
}: ProjectPanelProps & { projectId?: string }) {
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [shareLinks, setShareLinks] = useState<Record<string, string>>({});
  const [sharing, setSharing] = useState<string | null>(null);

  type Row = { id: string; name: string; version: number; dots: number; status: CEOMissionStatus | undefined; active: boolean };

  const rows: Row[] = turns.map((t, i) => ({
    id: t.id,
    name: t.result.brandName || t.mission.prompt.slice(0, 40),
    version: i + 1,
    dots: Math.min(t.result.artifactPaths?.length ?? 0, 5),
    status: t.result.status,
    active: false,
  }));

  if (loading && mission && !turns.find((t) => t.id === mission.id)) {
    rows.push({
      id: `active-${mission.id}`,
      name: result?.brandName || mission.prompt.slice(0, 40),
      version: turns.length + 1,
      dots: 0,
      status: mission.status,
      active: true,
    });
  }

  if (rows.length === 0) return null;

  const codeIds = turns
    .filter((t) => t.result.deliverableType === "code" || t.result.sourceType === "nvidia_text")
    .map((t) => t.id);
  const canCompare = codeIds.length >= 2 && onCompare;

  const handleShare = useCallback(async (row: Row) => {
    if (shareLinks[row.id]) {
      navigator.clipboard.writeText(shareLinks[row.id]).catch(() => {});
      return;
    }
    const turn = turns.find((t) => t.id === row.id);
    if (!turn) return;
    setSharing(row.id);
    try {
      const res = await fetch("/api/client-portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: turn.result.brandName || turn.mission.prompt.slice(0, 60),
          conversationId: projectId ?? turn.id,
          artifactIds: turn.result.primaryArtifactId ? [turn.result.primaryArtifactId] : [],
          missionId: turn.id,
        }),
      });
      const data = await res.json() as { ok: boolean; url?: string };
      if (data.ok && data.url) {
        setShareLinks((prev) => ({ ...prev, [row.id]: data.url! }));
        navigator.clipboard.writeText(data.url).catch(() => {});
      }
    } finally {
      setSharing(null);
    }
  }, [turns, shareLinks, projectId]);

  function openPreview(row: Row) {
    const turn = turns.find((t) => t.id === row.id);
    if (!turn) return;
    setPreview({
      title: turn.result.brandName || turn.mission.prompt.slice(0, 60),
      version: row.version,
      result: turn.result,
    });
  }

  const visibleStages = pipelineStages.filter((s) => s.stage !== "done");

  return (
    <>
      {preview && (
        <PreviewModal
          target={preview}
          onClose={() => setPreview(null)}
          projectId={projectId}
          onRequestCEO={onAddRequest}
        />
      )}
      <section className="ceo-project-zone" aria-label="Projets">
        {canCompare && (
          <div className="ceo-project-compare-bar">
            <button
              className="ceo-pr-compare-btn"
              onClick={() => onCompare(codeIds[codeIds.length - 2], codeIds[codeIds.length - 1])}
            >
              Comparer v{codeIds.length - 1} ↔ v{codeIds.length}
            </button>
          </div>
        )}
        {rows.map((row) => {
          const { label } = statusBadge(row.status, row.active);
          const isExpanded = row.active && visibleStages.length > 0;
          const turnId = row.id.startsWith("active-") ? row.id.slice(7) : row.id;
          return (
            <div key={row.id} className={`ceo-project-card${isExpanded ? " ceo-project-card-expanded" : ""}`}>
              {/* Compact summary row — always visible */}
              <div className="ceo-project-card-row">
                <span className="ceo-project-card-name">{row.name}</span>
                <span className="ceo-project-card-version">v{row.version}</span>
                {!isExpanded && (
                  <span className="ceo-project-card-steps" aria-hidden="true">
                    {Array.from({ length: 5 }, (_, i) => {
                      const dotCls = i < row.dots
                        ? (row.active && i === row.dots - 1 ? "ceo-step-running" : "ceo-step-done")
                        : "ceo-step-waiting";
                      return <span key={i} className={`ceo-step-dot ${dotCls}`} />;
                    })}
                  </span>
                )}
                <span className="ceo-project-card-status">{label}</span>
                <div className="ceo-project-card-actions">
                  <button
                    className="ceo-project-card-action"
                    title="Voir"
                    onClick={() => openPreview(row)}
                    disabled={row.active}
                  >
                    👁
                  </button>
                  <button
                    className="ceo-project-card-action"
                    title={shareLinks[row.id] ? "Lien copié ✓" : "Partager avec client"}
                    disabled={row.active || sharing === row.id}
                    onClick={() => handleShare(row)}
                    style={shareLinks[row.id] ? { color: "var(--accent)" } : undefined}
                  >
                    <Link size={12} />
                  </button>
                  <button
                    className="ceo-project-card-action"
                    title="Archiver"
                    disabled={row.active}
                    onClick={() => onArchiveTurn?.(turnId)}
                  >
                    🗄
                  </button>
                  <button
                    className="ceo-project-card-action"
                    title="Supprimer"
                    disabled={row.active}
                    onClick={() => onDeleteTurn?.(turnId)}
                  >
                    🗑
                  </button>
                </div>
                {shareLinks[row.id] && (
                  <span className="ceo-share-link" title={shareLinks[row.id]}>
                    🔗 {shareLinks[row.id].replace(/^https?:\/\/[^/]+/, "")}
                  </span>
                )}
              </div>

              {/* Expanded step-by-step progress — only when pipeline is running */}
              {isExpanded && (
                <div className="ceo-project-steps-expanded" aria-label="Étapes du pipeline">
                  {visibleStages.map((s) => (
                    <div key={s.stage} className={`ceo-project-step ceo-project-step-${s.status}`}>
                      <span className="ceo-project-step-icon" aria-hidden="true">
                        {s.status === "completed" ? "✅" : s.status === "failed" ? "❌" : "⏳"}
                      </span>
                      <span className="ceo-project-step-label">
                        {STAGE_LABELS[s.stage] ?? s.stage}
                      </span>
                      <span className="ceo-project-step-status">
                        {s.status === "completed" ? "Complété" : s.status === "failed" ? "Erreur" : "En cours..."}
                      </span>
                      {s.status === "started" && (
                        <div className="ceo-project-step-bar" aria-hidden="true">
                          <div className="ceo-project-step-bar-fill" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
