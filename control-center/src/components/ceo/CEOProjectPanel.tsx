"use client";

import type { CEOCurrentMission, CEOCurrentResult, CEOMissionStatus } from "./types";

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

export default function CEOProjectPanel({ mission, result, turns, loading, onCompare }: ProjectPanelProps) {
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

  return (
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
        const { label, cls } = statusBadge(row.status, row.active);
        return (
          <div key={row.id} className={`ceo-project-row${row.active ? " ceo-project-row-active" : ""}`}>
            <span className="ceo-pr-name">{row.name}</span>
            <span className="ceo-pr-version">v{row.version}</span>
            <span className="ceo-pr-dots" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`ceo-pr-dot${i < row.dots ? " filled" : ""}`} />
              ))}
            </span>
            <span className={`ceo-pr-status ceo-pr-status-${cls}`}>{label}</span>
            <button className="ceo-pr-action" title="Voir">👁</button>
            <button className="ceo-pr-action" title="Archiver">🗄</button>
            <button className="ceo-pr-action" title="Supprimer">🗑</button>
          </div>
        );
      })}
    </section>
  );
}
