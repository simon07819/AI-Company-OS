"use client";

import { GitBranch } from "lucide-react";
import type { ProductArtifactManifestVersion } from "@/lib/product-builder/types";

function displayDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "Date inconnue";
  }
}

export default function VersionTimeline({ versions }: { versions: ProductArtifactManifestVersion[] }) {
  return (
    <div className="project-version-timeline">
      {versions.map((version) => (
        <div className="project-version-item" key={version.id}>
          <div className="project-version-dot"><GitBranch size={14} /></div>
          <div>
            <div className="project-version-heading">
              <strong>{version.label}</strong>
              <span>{displayDate(version.createdAt)}</span>
            </div>
            <p>{version.summary}</p>
            <span className="project-workspace-muted">{version.artifactPaths.length} artifacts</span>
          </div>
        </div>
      ))}
    </div>
  );
}
