"use client";

import Link from "next/link";
import { Activity, FolderOpen } from "lucide-react";
import type { CEOCurrentMission } from "./types";

function statusLabel(status: CEOCurrentMission["status"]) {
  if (status === "preparing") return "Préparation";
  if (status === "production") return "Production en cours";
  if (status === "validation") return "Validation qualité";
  if (status === "ready") return "Résultat prêt";
  if (status === "needs_revision") return "À améliorer";
  if (status === "rejected") return "Rejeté";
  if (status === "error") return "Erreur";
  return "En attente";
}

function typeLabel(type: CEOCurrentMission["requestType"]) {
  if (type === "saas") return "SaaS";
  if (type === "website") return "Site web";
  if (type === "app") return "App";
  if (type === "branding" || type === "logo") return "Branding";
  if (type === "business-system") return "Système business";
  return "Demande";
}

export default function CEOMissionStatus({ mission }: { mission: CEOCurrentMission | null }) {
  if (!mission) {
    return (
      <section className="ceo-os-mission-strip empty" aria-label="Mission actuelle">
        <Activity size={16} />
        <div>
          <strong>Aucune mission active</strong>
          <span>Décris une compagnie, un SaaS, un site, une app ou un système business.</span>
        </div>
      </section>
    );
  }

  return (
    <section className={`ceo-os-mission-strip ${mission.status}`} aria-label="Mission actuelle">
      <Activity size={16} />
      <div className="ceo-os-mission-copy">
        <span>{typeLabel(mission.requestType)} · {statusLabel(mission.status)}</span>
        <strong>{mission.prompt}</strong>
      </div>
      <div className="ceo-os-mission-meta">
        <span>{mission.artifactCount} artifact{mission.artifactCount > 1 ? "s" : ""}</span>
        {typeof mission.qualityScore === "number" && <span>{mission.qualityScore}/100</span>}
        {mission.workspaceHref && (
          <Link href={mission.workspaceHref}>
            <FolderOpen size={14} />
            Workspace
          </Link>
        )}
      </div>
    </section>
  );
}
