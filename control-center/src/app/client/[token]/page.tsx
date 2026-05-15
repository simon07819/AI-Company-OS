import { notFound } from "next/navigation";
import { listTraceableArtifacts } from "@/lib/providers/providerRegistry";

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

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const artifacts = listTraceableArtifacts();

  // token matches artifactId or missionId
  const artifact =
    artifacts.find((a) => a.artifactId === token) ??
    artifacts.filter((a) => a.missionId === token).at(-1);

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
