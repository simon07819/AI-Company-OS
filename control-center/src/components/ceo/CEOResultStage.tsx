"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, FolderOpen, GitBranch, Layers3, RefreshCw, Wand2 } from "lucide-react";
import type { CEOCurrentMission, CEOCurrentResult } from "./types";

function projectTypeLabel(type?: string) {
  if (type === "saas") return "SaaS";
  if (type === "website") return "Site web";
  if (type === "app") return "App";
  if (type === "branding" || type === "logo") return "Branding";
  if (type === "business-system") return "Système business";
  return "Projet";
}

function statusLabel(status: CEOCurrentResult["status"]) {
  if (status === "ready") return "Prêt";
  if (status === "needs_revision") return "À améliorer";
  if (status === "rejected") return "Aucun succès";
  if (status === "production") return "Production";
  if (status === "validation") return "Validation";
  if (status === "error") return "Erreur";
  return "Préparation";
}

function artifactName(artifactPath: string) {
  return artifactPath.replace(/^generated-products\/[^/]+\//, "");
}

export default function CEOResultStage({
  result,
  mission,
  expertMode,
  loading,
  error,
  onModify,
  onContinue,
}: {
  result: CEOCurrentResult | null;
  mission: CEOCurrentMission | null;
  expertMode: boolean;
  loading: boolean;
  error: string | null;
  onModify: () => void;
  onContinue: () => void;
}) {
  if (loading || mission?.status === "production" || mission?.status === "preparing") {
    return (
      <section className="ceo-os-result-stage active" aria-label="Result Stage">
        <div className="ceo-os-stage-orbit" />
        <div className="ceo-os-stage-empty">
          <span className="ceo-os-stage-kicker">Production en cours</span>
          <h2>{mission?.prompt ?? "Nouvelle mission"}</h2>
          <p>Le CEO prépare le plan, route les experts, crée les artifacts et lance la validation qualité.</p>
          <div className="ceo-os-progress-line"><i /></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="ceo-os-result-stage error" aria-label="Result Stage">
        <div className="ceo-os-stage-empty">
          <AlertTriangle size={24} />
          <span className="ceo-os-stage-kicker">Erreur</span>
          <h2>La mission n’a pas pu être produite.</h2>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="ceo-os-result-stage" aria-label="Result Stage">
        <div className="ceo-os-stage-orbit" />
        <div className="ceo-os-stage-empty">
          <span className="ceo-os-stage-kicker">CEO AI</span>
          <h2>Prêt à construire.</h2>
          <p>Décris une compagnie, un SaaS, un site, une app ou un système business. Aucun résultat fictif ne sera affiché.</p>
        </div>
      </section>
    );
  }

  const hasArtifacts = result.artifactPaths.length > 0;
  const visibleArtifacts = result.artifactPaths.slice(0, 8);

  return (
    <section className="ceo-os-result-stage ready" aria-label="Result Stage">
      <div className="ceo-os-result-head">
        <div>
          <span className="ceo-os-stage-kicker">{projectTypeLabel(result.requestType)} · {statusLabel(result.status)}</span>
          <h2>{result.title}</h2>
          <p>{result.summary}</p>
        </div>
        <div className={`ceo-os-quality ${hasArtifacts ? "ok" : "bad"}`}>
          {hasArtifacts ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{hasArtifacts ? result.qualityStatus ?? "Artifacts réels" : "Aucun artifact réel créé"}</span>
          {typeof result.qualityScore === "number" && <strong>{result.qualityScore}/100</strong>}
        </div>
      </div>

      {hasArtifacts ? (
        <div className="ceo-os-artifact-grid">
          {visibleArtifacts.map((artifact) => (
            <article key={artifact}>
              <FileText size={15} />
              <span>{artifactName(artifact)}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="ceo-os-no-artifacts">
          <AlertTriangle size={18} />
          <strong>Aucun artifact réel créé.</strong>
          <span>Le système ne marquera pas cette mission comme prête tant qu’aucun fichier traçable n’existe.</span>
        </div>
      )}

      <div className="ceo-os-next-actions">
        <strong>Prochaines actions</strong>
        <span>{hasArtifacts ? "Ouvre le workspace, inspecte les fichiers, puis continue ou modifie le projet." : "Raffine la demande ou relance une production."}</span>
      </div>

      <div className="ceo-os-result-actions">
        {result.workspaceHref ? (
          <Link className="primary" href={result.workspaceHref}><FolderOpen size={15} /> Ouvrir workspace</Link>
        ) : (
          <button type="button" disabled><FolderOpen size={15} /> Ouvrir workspace</button>
        )}
        <button type="button" disabled={!hasArtifacts}><Layers3 size={15} /> Voir fichiers</button>
        <button type="button" onClick={onModify}><Wand2 size={15} /> Modifier</button>
        <button type="button" onClick={onContinue}><RefreshCw size={15} /> Continuer</button>
        <button type="button" disabled={!hasArtifacts}><GitBranch size={15} /> Exporter</button>
      </div>

      {expertMode && (
        <details className="ceo-os-expert-panel">
          <summary>Mode expert · plan, qualité et révisions</summary>
          <pre>{JSON.stringify({
            mission,
            plan: result.expert?.plan,
            qualityReport: result.expert?.qualityReport,
            revisions: result.expert?.revisions,
            manifest: result.expert?.manifest,
            runtime: result.expert?.runtime,
          }, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
