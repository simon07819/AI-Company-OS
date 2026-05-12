"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import type { CEOCurrentMission, CEOCurrentResult } from "./types";

function artifactName(artifactPath: string) {
  const parts = artifactPath.split("/");
  const generatedIndex = parts.indexOf("generated-products");
  if (generatedIndex >= 0 && parts.length > generatedIndex + 2) return parts.slice(generatedIndex + 2).join("/");
  return parts.at(-1) ?? artifactPath;
}

export default function CEOResultDetails({
  result,
  mission,
  expertMode,
}: {
  result: CEOCurrentResult;
  mission: CEOCurrentMission | null;
  expertMode: boolean;
}) {
  const hasArtifacts = result.artifactPaths.length > 0;

  return (
    <div className="ceo-os-result-details" aria-label="Détails du résultat">
      {result.workspaceHref && (
        <div>
          <strong>Workspace</strong>
          <Link href={result.workspaceHref}>Ouvrir workspace</Link>
        </div>
      )}

      {hasArtifacts ? (
        <div>
          <strong>Artifacts créés</strong>
          <ul>
            {result.artifactPaths.map((artifact) => (
              <li key={artifact}>
                <FileText size={14} />
                <span>{artifactName(artifact)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <strong>Aucun artifact réel créé</strong>
          <p>Le système ne marque pas cette mission comme prête tant qu’aucun fichier traçable n’existe.</p>
        </div>
      )}

      {(result.limitations?.length || result.launchInstructions?.length) && (
        <div>
          <strong>Notes</strong>
          {result.limitations?.map((item) => <p key={item}>{item}</p>)}
          {result.launchInstructions?.map((item) => <code key={item}>{item}</code>)}
        </div>
      )}

      {expertMode && (
        <div>
          <strong>Mode expert</strong>
          <pre>{JSON.stringify({
            mission,
            qualityScore: result.qualityScore,
            qualityStatus: result.qualityStatus,
            plan: result.expert?.plan,
            qualityReport: result.expert?.qualityReport,
            revisions: result.expert?.revisions,
            manifest: result.expert?.manifest,
            runtime: result.expert?.runtime,
          }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
