import Link from "next/link";
import { listTraceableArtifacts } from "@/lib/providers/providerRegistry";

export const dynamic = "force-dynamic";

function typeLabel(type: string, sourceType: string): string {
  if (type === "code" || sourceType === "nvidia_text" || sourceType === "codex_code") return "Code";
  if (type === "local_prototype" || sourceType === "local_svg") return "SVG";
  if (sourceType === "nvidia_image" || sourceType === "deepinfra_image") return "Image";
  if (type === "website_preview") return "Website";
  return type || "Artifact";
}

function statusColor(sourceType: string): string {
  if (sourceType === "nvidia_text" || sourceType === "nvidia_image") return "#22c55e";
  if (sourceType === "deepinfra_image") return "#a78bfa";
  if (sourceType === "local_svg" || sourceType === "local_storage") return "#f59e0b";
  return "#71717a";
}

export default function ArtifactsPlatformPage() {
  const artifacts = listTraceableArtifacts().slice().reverse(); // newest first

  return (
    <section className="platform-page">
      <header className="platform-page-header">
        <span>Artifacts</span>
        <h1>Livrables produits</h1>
        <p>{artifacts.length} artifact{artifacts.length !== 1 ? "s" : ""} traçable{artifacts.length !== 1 ? "s" : ""} produit{artifacts.length !== 1 ? "s" : ""}.</p>
      </header>

      {artifacts.length === 0 ? (
        <div className="platform-card-grid">
          <Link href="/ceo" className="platform-card-link">
            <strong>Nouveau livrable</strong>
            <span>Demande au CEO de produire un artifact validé.</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {artifacts.map((a) => (
            <div key={a.artifactId} style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto auto auto",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "rgba(24,24,27,0.6)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
            }}>
              <span style={{
                padding: "2px 8px", fontSize: 10, fontWeight: 700,
                borderRadius: 6, background: `${statusColor(a.sourceType)}18`,
                color: statusColor(a.sourceType), border: `1px solid ${statusColor(a.sourceType)}44`,
              }}>
                {typeLabel(a.type, a.sourceType)}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f4f4f5" }}>{a.title}</div>
                <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>
                  {new Date(a.createdAt).toLocaleString("fr-CA")} · {a.providerUsed}
                </div>
              </div>
              <a
                href={`/api/preview/${a.artifactId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: "#60a5fa", textDecoration: "none" }}
              >
                Prévisualiser
              </a>
              <a
                href={`/client/${a.artifactId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: "#a78bfa", textDecoration: "none" }}
              >
                Portail
              </a>
              <a
                href={`/api/export/${a.artifactId}`}
                download
                style={{ fontSize: 11, color: "#71717a", textDecoration: "none" }}
              >
                ↓ DL
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
