"use client";

import { useState } from "react";
import type { CEOCurrentMission, CEOCurrentResult } from "./types";

const ADD_OPTIONS = [
  { id: "logo_variation", label: "Nouvelle variation de logo", icon: "🖼" },
  { id: "website", label: "Site web / Landing page", icon: "🌐" },
  { id: "mobile_app", label: "Interface app mobile", icon: "📱" },
  { id: "business_card", label: "Carte d'affaires", icon: "💼" },
  { id: "social_kit", label: "Kit réseaux sociaux", icon: "📣" },
  { id: "brand_guidelines", label: "Guide de marque PDF", icon: "📋" },
  { id: "saas_dashboard", label: "Dashboard SaaS", icon: "⚙️" },
  { id: "custom", label: "Demande personnalisée…", icon: "✏️" },
];

const AGENT_ICONS: Record<string, string> = {
  ceo: "👔",
  creative_project_manager: "📋",
  brand_strategist: "🎯",
  marketing_strategist: "📣",
  art_director: "🎨",
  logo_designer: "🖼",
  copy_concept_agent: "✍️",
  image_designer: "🖼",
  creative_critic: "🔍",
  ceo_synthesis: "👔",
  artifact_manager: "💾",
  product_owner: "📋",
  ux_designer: "🎨",
  qa: "🔍",
  critic: "🔍",
  reviewer: "✅",
};

interface TimelineStep {
  agent: string;
  role?: string;
  status?: string;
  summary?: string;
  providerUsed?: string;
  durationMs?: number;
}

interface ProjectPanelProps {
  mission: CEOCurrentMission | null;
  result: CEOCurrentResult | null;
  turns: Array<{ id: string; mission: CEOCurrentMission; result: CEOCurrentResult }>;
  loading: boolean;
  onAddRequest: (prompt: string) => void;
}

function getTimeline(result: CEOCurrentResult | null): TimelineStep[] {
  if (!result?.expert) return [];
  const runtime = result.expert.runtime as { timeline?: TimelineStep[] } | null;
  return runtime?.timeline ?? [];
}

function getSelectedDirection(result: CEOCurrentResult | null): string | null {
  if (!result?.expert) return null;
  const runtime = result.expert.runtime as { creativeAgency?: { imageGenerationPlan?: { selectedDirection?: string } } } | null;
  return runtime?.creativeAgency?.imageGenerationPlan?.selectedDirection ?? null;
}

function stepLabel(step: TimelineStep, isActive: boolean): string {
  if (isActive) return step.role || step.agent;
  return step.summary ? `${step.role || step.agent} — ${step.summary.slice(0, 60)}` : (step.role || step.agent);
}

function stepIcon(step: TimelineStep, isActive: boolean): string {
  if (step.status === "completed") return "✅";
  if (isActive) return "⏳";
  return "⬜";
}

export default function CEOProjectPanel({ mission, result, turns, loading, onAddRequest }: ProjectPanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [customText, setCustomText] = useState("");

  const latestResult = result ?? (turns.length > 0 ? turns[turns.length - 1].result : null);
  const latestMission = mission ?? (turns.length > 0 ? turns[turns.length - 1].mission : null);

  if (!latestMission) return null;

  const brandName = latestResult?.brandName || latestMission.prompt.slice(0, 40);
  const timeline = getTimeline(latestResult);
  const selectedDirection = getSelectedDirection(latestResult);
  const hasImage = Boolean(latestResult?.primaryVisual?.startsWith("data:image/"));
  const totalVersions = turns.filter((t) => t.result.primaryVisual?.startsWith("data:image/")).length + (hasImage && result ? 1 : 0);

  const projectTitle = brandName
    ? brandName.toUpperCase().slice(0, 30) + (latestResult?.deliverableType ? ` — ${latestResult.deliverableType.replace(/_/g, " ")}` : "")
    : "Nouveau projet";

  function handleAddOption(opt: typeof ADD_OPTIONS[0]) {
    if (opt.id === "custom") return;
    const approvedContext = selectedDirection ? ` Direction approuvée: ${selectedDirection}.` : "";
    const brandCtx = latestResult?.brandName ? ` Marque: ${latestResult.brandName}.` : "";
    onAddRequest(`Ajoute "${opt.label}" au projet ${projectTitle}.${brandCtx}${approvedContext} Utilise la même identité de marque.`);
    setAddOpen(false);
  }

  function handleCustomSubmit() {
    if (!customText.trim()) return;
    onAddRequest(customText.trim());
    setCustomText("");
    setAddOpen(false);
  }

  return (
    <section className="ceo-project-panel" aria-label="Panneau projet actif">
      <div className="ceo-project-panel-inner">
        <div className="ceo-project-header">
          <div className="ceo-project-title">
            <span className="ceo-project-icon">📁</span>
            <strong>{projectTitle}</strong>
            {totalVersions > 0 && <span className="ceo-project-badge">v{totalVersions}</span>}
          </div>
          <div className="ceo-project-meta">
            {latestMission.createdAt && (
              <span className="ceo-project-date">
                {new Date(latestMission.createdAt).toLocaleDateString("fr-CA", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>

        <div className="ceo-project-body">
          {timeline.length > 0 && (
            <div className="ceo-pipeline">
              <div className="ceo-pipeline-label">Pipeline</div>
              <ul className="ceo-pipeline-steps">
                {timeline.map((step, i) => {
                  const isActive = loading && step.status !== "completed" && i === timeline.findLastIndex((s) => s.status === "completed") + 1;
                  return (
                    <li key={`${step.agent}-${i}`} className={`ceo-pipeline-step ceo-step-${step.status ?? "waiting"}${isActive ? " ceo-step-active" : ""}`}>
                      <span className="ceo-step-icon">{AGENT_ICONS[step.agent] ?? "🤖"}</span>
                      <span className="ceo-step-status">{stepIcon(step, isActive)}</span>
                      <span className="ceo-step-label">{stepLabel(step, isActive)}</span>
                      {step.durationMs && step.durationMs > 0 && (
                        <span className="ceo-step-duration">{(step.durationMs / 1000).toFixed(1)}s</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {hasImage && latestResult?.primaryVisual && (
            <div className="ceo-deliverables">
              <div className="ceo-deliverables-label">Livrables</div>
              <div className="ceo-deliverables-grid">
                {turns
                  .filter((t) => t.result.primaryVisual?.startsWith("data:image/"))
                  .concat(result?.primaryVisual?.startsWith("data:image/") ? [{ id: "current", mission: latestMission, result }] : [])
                  .map((t, i) => (
                    <div key={t.id} className="ceo-deliverable-thumb">
                      <img src={t.result.primaryVisual!} alt={`Logo v${i + 1}`} />
                      <span className="ceo-deliverable-version">v{i + 1}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="ceo-project-actions">
          <button
            className="ceo-add-btn"
            onClick={() => setAddOpen((o) => !o)}
            disabled={loading}
            aria-expanded={addOpen}
          >
            <span>+ Ajouter au projet</span>
            <span className="ceo-add-chevron">{addOpen ? "▲" : "▼"}</span>
          </button>

          {addOpen && (
            <div className="ceo-add-menu">
              {ADD_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  className="ceo-add-option"
                  onClick={() => handleAddOption(opt)}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
              <div className="ceo-add-custom">
                <input
                  className="ceo-add-custom-input"
                  placeholder="Décris ta demande…"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                />
                <button className="ceo-add-custom-send" onClick={handleCustomSubmit} disabled={!customText.trim()}>
                  ▶
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
