"use client";

import { FileCode2 } from "lucide-react";

function artifactLabel(path: string) {
  const parts = path.split("/");
  return parts.slice(-2).join("/");
}

export default function ArtifactList({ artifacts, expert = false }: { artifacts: string[]; expert?: boolean }) {
  const visibleArtifacts = expert ? artifacts : artifacts.filter((artifact) => {
    const name = artifact.split("/").at(-1);
    return name !== "artifact-manifest.json" && name !== "execution-ledger.json" && name !== "quality-report.json" && name !== "output-quality-report.json";
  });

  return (
    <div className="project-workspace-artifacts">
      {visibleArtifacts.map((artifact) => (
        <div className="project-workspace-artifact" key={artifact}>
          <FileCode2 size={16} />
          <div>
            <strong>{artifactLabel(artifact)}</strong>
            <span>{artifact}</span>
          </div>
        </div>
      ))}
      {visibleArtifacts.length === 0 && <p className="project-workspace-muted">Aucun artifact réel trouvé.</p>}
    </div>
  );
}
