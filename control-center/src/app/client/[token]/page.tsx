import { notFound } from "next/navigation";
import { listTraceableArtifacts, type TraceableArtifact } from "@/lib/providers/providerRegistry";
import { getPortal } from "@/lib/clientPortalStore";

export const dynamic = "force-dynamic";

function renderContent(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("<svg")) {
    return (
      <div
        className="client-artifact-svg"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  return (
    <pre className="client-artifact-code">
      <code>{content}</code>
    </pre>
  );
}

function ArtifactCard({ artifact }: { artifact: TraceableArtifact }) {
  const isCode = artifact.type === "code" || artifact.sourceType === "nvidia_text";
  return (
    <div className="client-artifact-card">
      <h2 className="client-artifact-card-title">{artifact.title}</h2>
      <div className="client-artifact-card-meta">
        {new Date(artifact.createdAt).toLocaleDateString("fr-CA", { dateStyle: "long" })}
      </div>
      {isCode && artifact.content ? (
        <iframe
          src={`/api/preview/${artifact.artifactId}`}
          className="client-portal-iframe"
          sandbox="allow-scripts"
          title={artifact.title}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : artifact.content ? (
        renderContent(artifact.content)
      ) : (
        <p className="client-portal-empty">Contenu non prévisualisable.</p>
      )}
      <a
        href={`/api/export/${artifact.artifactId}`}
        className="client-artifact-download"
        download
      >
        Télécharger
      </a>
    </div>
  );
}

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const allArtifacts = listTraceableArtifacts();

  // Try portal token first
  const portal = getPortal(token);
  if (portal) {
    const portalArtifacts = portal.artifactIds.length > 0
      ? allArtifacts.filter((a) => portal.artifactIds.includes(a.artifactId))
      : allArtifacts.filter((a) => a.missionId === portal.missionId).slice(0, 10);

    return (
      <main className="client-portal">
        <header className="client-portal-header">
          <div className="client-portal-brand">AI Company OS</div>
          <h1 className="client-portal-title">{portal.title}</h1>
          <div className="client-portal-meta">
            Partagé le {new Date(portal.createdAt).toLocaleDateString("fr-CA", { dateStyle: "long" })}
          </div>
        </header>

        <section className="client-portal-body">
          {portalArtifacts.length === 0 ? (
            <p className="client-portal-empty">Aucun livrable disponible.</p>
          ) : portalArtifacts.length === 1 ? (
            <ArtifactCard artifact={portalArtifacts[0]} />
          ) : (
            <div className="client-portal-gallery">
              {portalArtifacts.map((a) => (
                <ArtifactCard key={a.artifactId} artifact={a} />
              ))}
            </div>
          )}
        </section>

        <footer className="client-portal-footer">
          <span className="client-portal-footer-note">Livrable confidentiel — ne pas redistribuer</span>
        </footer>
      </main>
    );
  }

  // Fallback: token is an artifactId or missionId
  const artifact =
    allArtifacts.find((a) => a.artifactId === token) ??
    allArtifacts.filter((a) => a.missionId === token).at(-1);

  if (!artifact) notFound();

  const isCode = artifact.type === "code" || artifact.sourceType === "nvidia_text";

  return (
    <main className="client-portal">
      <header className="client-portal-header">
        <div className="client-portal-brand">AI Company OS</div>
        <h1 className="client-portal-title">{artifact.title}</h1>
        <div className="client-portal-meta">
          Produit le {new Date(artifact.createdAt).toLocaleDateString("fr-CA", { dateStyle: "long" })}
        </div>
      </header>

      <section className="client-portal-body">
        {isCode && artifact.content ? (
          <iframe
            src={`/api/preview/${artifact.artifactId}`}
            className="client-portal-iframe"
            sandbox="allow-scripts"
            title={artifact.title}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : artifact.content ? (
          renderContent(artifact.content)
        ) : (
          <p className="client-portal-empty">Ce livrable n'a pas de contenu prévisualisable.</p>
        )}
      </section>

      <footer className="client-portal-footer">
        <a href={`/api/export/${artifact.artifactId}`} className="client-portal-download" download>
          Télécharger ce livrable
        </a>
      </footer>
    </main>
  );
}
