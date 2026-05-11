"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Rocket } from "lucide-react";

type MissionStatus = "draft" | "running" | "paused" | "waiting_approval" | "completed" | "failed";

interface MissionSummary {
  sessionId: string;
  projectName: string;
  projectIdea: string;
  status: MissionStatus;
  currentPhase: string;
  progress: number;
  updatedAt: string;
}

const STATUS: Record<MissionStatus, { label: string; pill: string; action: string }> = {
  draft: { label: "En preparation", pill: "neutral", action: "Ouvrir" },
  running: { label: "Agents au travail", pill: "working", action: "Voir l'activite" },
  paused: { label: "En pause", pill: "neutral", action: "Reprendre" },
  waiting_approval: { label: "Resultat pret - approbation requise", pill: "ready", action: "Approuver" },
  completed: { label: "Termine", pill: "approved", action: "Voir le resultat" },
  failed: { label: "A verifier", pill: "warning", action: "Verifier" },
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/autopilot/sessions", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => setMissions(payload.sessions ?? []))
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="os-page">
      <section className="os-hero">
        <div>
          <span className="os-eyebrow">Mission Rooms</span>
          <h1>Projets en cours</h1>
          <p>Suivez les objectifs, agents, resultats et decisions sans logs techniques.</p>
        </div>
        <div className="os-hero-actions">
          <Link className="os-button primary" href="/ceo">Parler au CEO</Link>
          <Link className="os-button subtle" href="/ceo/expert">Mode expert</Link>
        </div>
      </section>

      {loading ? (
        <div className="os-loading-grid">
          <div className="os-skeleton" />
          <div className="os-skeleton" />
          <div className="os-skeleton" />
        </div>
      ) : missions.length === 0 ? (
        <div className="os-empty">
          <div className="os-empty-icon"><Rocket size={20} /></div>
          <h3>Aucune mission pour le moment</h3>
          <p>Dites au CEO ce que vous voulez lancer. Une Mission Room sera creee automatiquement.</p>
          <Link className="os-button primary" href="/ceo">Ouvrir le CEO</Link>
        </div>
      ) : (
        <section className="os-section">
          <div className="os-section-title">
            <div><span className="os-eyebrow">Activite</span><h2>Mission Rooms actives</h2></div>
            <Link href="/approvals">Decisions</Link>
          </div>
          <div className="os-grid cards">
            {missions.map((mission) => {
              const status = STATUS[mission.status] ?? STATUS.draft;
              const progress = mission.status === "waiting_approval" ? 100 : mission.progress;
              return (
                <Link key={mission.sessionId} href={`/mission/${mission.sessionId}`} className="os-card os-project-card" style={{ color: "inherit" }}>
                  <div className="os-card-top">
                    <span className={`os-pill ${status.pill}`}>{status.label}</span>
                    <span className="os-muted">{mission.currentPhase?.replace(/_/g, " ") || "Projet"}</span>
                  </div>
                  <h3>{mission.projectName}</h3>
                  <p>{mission.projectIdea || "Projet gere par les agents AI."}</p>
                  <div className="os-progress" aria-label={`${progress}%`}><span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>
                  <div className="os-meta-line">
                    <span>{status.action}</span>
                    <span>{mission.status === "completed" ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
