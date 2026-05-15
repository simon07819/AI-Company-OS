"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import type { CEOCurrentMission, CEOCurrentResult, CEOMissionStatus } from "./types";
import CodePreviewFrame from "./CodePreviewFrame";

interface ProjectPanelProps {
  mission: CEOCurrentMission | null;
  result: CEOCurrentResult | null;
  turns: Array<{ id: string; mission: CEOCurrentMission; result: CEOCurrentResult }>;
  loading: boolean;
  onAddRequest: (prompt: string) => void;
  onCompare?: (idA: string, idB: string) => void;
}

function statusBadge(s: CEOMissionStatus | undefined, active: boolean): { label: string; cls: string } {
  if (active) return { label: "En cours", cls: "running" };
  if (!s) return { label: "En attente", cls: "waiting" };
  if (s === "completed" || s === "ready") return { label: "Terminé", cls: "done" };
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

function PreviewModal({ target, onClose }: { target: PreviewTarget; onClose: () => void }) {
  const { result, title, version } = target;
  const isCode = result.deliverableType === "code" || result.sourceType === "codex_code" || result.sourceType === "nvidia_text";
  const isImage = Boolean(result.primaryVisual && /^data:image\//i.test(result.primaryVisual ?? ""));
  const isSvg = Boolean(result.primaryVisual && /<svg[\s>]/i.test(result.primaryVisual ?? "") && !isImage);
  const downloadHref = result.primaryArtifactId ? `/api/export/${result.primaryArtifactId}` : undefined;

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

        <div className="ceo-preview-modal-body">
          {isCode && result.primaryArtifactId ? (
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

export default function CEOProjectPanel({ mission, result, turns, loading, onCompare }: ProjectPanelProps) {
  const [preview, setPreview] = useState<PreviewTarget | null>(null);

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

  function openPreview(row: Row) {
    const turn = turns.find((t) => t.id === row.id);
    if (!turn) return;
    setPreview({
      title: turn.result.brandName || turn.mission.prompt.slice(0, 60),
      version: row.version,
      result: turn.result,
    });
  }

  return (
    <>
      {preview && <PreviewModal target={preview} onClose={() => setPreview(null)} />}
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
          return (
            <div key={row.id} className="ceo-project-card">
              <span className="ceo-project-card-name">{row.name}</span>
              <span className="ceo-project-card-version">v{row.version}</span>
              <span className="ceo-project-card-steps" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => {
                  const dotCls = i < row.dots
                    ? (row.active && i === row.dots - 1 ? "ceo-step-running" : "ceo-step-done")
                    : "ceo-step-waiting";
                  return <span key={i} className={`ceo-step-dot ${dotCls}`} />;
                })}
              </span>
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
                <button className="ceo-project-card-action" title="Archiver">🗄</button>
                <button className="ceo-project-card-action" title="Supprimer">🗑</button>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
