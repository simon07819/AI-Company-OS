import Link from "next/link";
import { listTraceableArtifacts } from "@/lib/providers/providerRegistry";

export const dynamic = "force-dynamic";

function statusBadge(sourceType: string) {
  if (sourceType === "nvidia_text" || sourceType === "nvidia_image") return { label: "Complété", color: "#22c55e" };
  if (sourceType === "deepinfra_image") return { label: "Complété", color: "#a78bfa" };
  if (sourceType === "local_svg") return { label: "Prototype", color: "#f59e0b" };
  if (sourceType === "provider_unavailable" || sourceType === "none") return { label: "En attente", color: "#71717a" };
  return { label: "Produit", color: "#60a5fa" };
}

export default function MissionsPlatformPage() {
  const artifacts = listTraceableArtifacts();

  // Group by missionId
  const missionMap = new Map<string, typeof artifacts>();
  for (const a of artifacts) {
    const list = missionMap.get(a.missionId) ?? [];
    list.push(a);
    missionMap.set(a.missionId, list);
  }

  const missions = Array.from(missionMap.entries())
    .map(([missionId, items]) => ({
      missionId,
      title: items.at(-1)?.title ?? missionId,
      artifactCount: items.length,
      createdAt: items[0]?.createdAt ?? "",
      sourceType: items.at(-1)?.sourceType ?? "none",
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section className="platform-page">
      <header className="platform-page-header">
        <span>Missions</span>
        <h1>Missions actives</h1>
        <p>{missions.length} mission{missions.length !== 1 ? "s" : ""} tracée{missions.length !== 1 ? "s" : ""}.</p>
      </header>

      {missions.length === 0 ? (
        <div className="platform-card-grid">
          <Link href="/ceo" className="platform-card-link">
            <strong>Nouvelle mission</strong>
            <span>Lance une demande au CEO pour démarrer une mission.</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {missions.map((m) => {
            const { label, color } = statusBadge(m.sourceType);
            return (
              <div key={m.missionId} style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                background: "rgba(24,24,27,0.6)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
              }}>
                <span style={{
                  padding: "2px 8px", fontSize: 10, fontWeight: 700, borderRadius: 6,
                  background: `${color}18`, color, border: `1px solid ${color}44`,
                }}>
                  {label}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f4f4f5" }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>
                    {new Date(m.createdAt).toLocaleString("fr-CA")} · {m.artifactCount} artifact{m.artifactCount !== 1 ? "s" : ""}
                  </div>
                </div>
                <Link
                  href={`/artifacts`}
                  style={{ fontSize: 11, color: "#60a5fa", textDecoration: "none" }}
                >
                  Voir artifacts →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
