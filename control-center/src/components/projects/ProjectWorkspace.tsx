"use client";

import Link from "next/link";
import { CheckCircle2, Code2, Layers3, ShieldCheck } from "lucide-react";
import { useViewMode } from "@/components/os/ViewModeProvider";
import type { GeneratedProjectWorkspace } from "@/lib/product-builder/workspace";
import ArtifactList from "./ArtifactList";
import ProjectActions from "./ProjectActions";
import VersionTimeline from "./VersionTimeline";

function statusLabel(status: string) {
  if (status === "ready") return "Pret";
  if (status === "needs_review") return "A ameliorer";
  if (status === "failed") return "Incomplet";
  return "Projet cree";
}

function typeLabel(type: string) {
  if (type === "saas") return "SaaS";
  if (type === "website") return "Site web";
  if (type === "app") return "App";
  return type;
}

function nextAction(workspace: GeneratedProjectWorkspace) {
  if (workspace.status === "needs_review") return "Verifier les points qualité puis demander une iteration au CEO.";
  if (workspace.requestType === "website") return "Revoir le contenu, ajuster la direction visuelle, puis préparer le prototype.";
  return "Ouvrir le prototype local, tester les écrans, puis continuer l'itération avec le CEO.";
}

export default function ProjectWorkspace({ workspace }: { workspace: GeneratedProjectWorkspace }) {
  const { isExpert } = useViewMode();
  const qualityStatus = workspace.qualityGate?.ok ? "Qualité validée" : workspace.qualityGate ? "Qualité à vérifier" : "Qualité non évaluée";
  const visibleArtifacts = isExpert ? workspace.artifactPaths : workspace.primaryArtifactPaths;

  return (
    <main className="project-workspace" aria-label="Project workspace">
      <section className="project-workspace-hero">
        <div>
          <Link className="project-workspace-back" href="/projects">Retour aux projets</Link>
          <span className="os-eyebrow">Workspace projet</span>
          <h1>{workspace.title}</h1>
          <p>{workspace.summary}</p>
          <div className="project-workspace-pills">
            <span className={`os-pill ${workspace.status === "needs_review" ? "warning" : "approved"}`}>{statusLabel(workspace.status)}</span>
            <span className="os-pill neutral">{typeLabel(workspace.requestType)}</span>
            <span className="os-pill neutral">{workspace.domain}</span>
          </div>
        </div>
        <ProjectActions slug={workspace.slug} projectPath={workspace.projectPath} />
      </section>

      <section className="project-workspace-grid">
        <article className="project-workspace-preview os-card">
          <div className="project-workspace-card-heading">
            <span><Layers3 size={16} /> Aperçu central</span>
            <span className="os-pill working">Prototype local</span>
          </div>
          <h2>{workspace.preview.title}</h2>
          <p>{workspace.preview.body}</p>
          {workspace.preview.features.length > 0 && (
            <div className="project-workspace-feature-grid">
              {workspace.preview.features.slice(0, 6).map((feature) => <span key={feature}>{feature}</span>)}
            </div>
          )}
        </article>

        <article className="os-card project-workspace-next">
          <div className="project-workspace-card-heading">
            <span><CheckCircle2 size={16} /> Prochaine action</span>
          </div>
          <h2>{nextAction(workspace)}</h2>
          <p>{workspace.launch.length > 0 ? `Lancement local: ${workspace.launch.join(" · ")}` : "Le projet est prêt pour une prochaine itération."}</p>
        </article>
      </section>

      <section className="project-workspace-section">
        <div className="os-section-title">
          <div><span className="os-eyebrow">Artifacts</span><h2>Fichiers générés</h2></div>
          <span className="project-workspace-muted">{visibleArtifacts.length} visibles</span>
        </div>
        <ArtifactList artifacts={visibleArtifacts} expert={isExpert} />
      </section>

      <section className="project-workspace-section">
        <div className="os-section-title">
          <div><span className="os-eyebrow">Versions</span><h2>Historique des versions</h2></div>
        </div>
        <VersionTimeline versions={workspace.versions} />
      </section>

      <section className="project-workspace-section">
        <div className="os-section-title">
          <div><span className="os-eyebrow">Décisions</span><h2>Décision actuelle</h2></div>
        </div>
        <div className="os-card project-workspace-decision">
          <ShieldCheck size={18} />
          <div>
            <strong>{qualityStatus}</strong>
            <p>{workspace.qualityGate?.summary ?? "Le rapport qualité apparaîtra quand la génération aura été validée."}</p>
          </div>
        </div>
      </section>

      {isExpert && (
        <section className="project-workspace-section project-workspace-expert">
          <div className="os-section-title">
            <div><span className="os-eyebrow">Mode expert</span><h2>Détails techniques</h2></div>
          </div>
          <div className="project-workspace-expert-grid">
            <article className="os-card">
              <h3>Identifiants</h3>
              <dl>
                <dt>projectId</dt><dd>{workspace.projectId}</dd>
                <dt>requestType</dt><dd>{workspace.requestType}</dd>
                <dt>sourcePrompt</dt><dd>{workspace.sourcePrompt || "Non renseigné"}</dd>
              </dl>
            </article>
            <article className="os-card">
              <h3>Ledger</h3>
              {workspace.ledger ? (
                <div className="project-workspace-ledger">
                  {workspace.ledger.steps.map((step) => (
                    <div key={step.id}>
                      <strong>{step.id} · {step.title}</strong>
                      <span>{step.status}</span>
                      <p>{step.summary}</p>
                      <small>{step.artifactPaths.join(", ")}</small>
                    </div>
                  ))}
                </div>
              ) : <p>Aucun ledger technique disponible.</p>}
            </article>
            <article className="os-card">
              <h3>Raw outputs</h3>
              <pre>{JSON.stringify({
                manifest: workspace.rawManifest,
                qualityGate: workspace.qualityGate,
                outputQuality: workspace.outputQuality,
              }, null, 2)}</pre>
            </article>
            <article className="os-card">
              <h3>Runtime events</h3>
              <p>Aucun event runtime lié à ce projet généré localement.</p>
              <div className="project-workspace-code-line"><Code2 size={14} /> {workspace.projectPath}</div>
            </article>
          </div>
        </section>
      )}
    </main>
  );
}
