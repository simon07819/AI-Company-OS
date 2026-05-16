"use client";

import { useEffect, useState, useCallback } from "react";
import { Link2, Trash2, Copy, Check, ExternalLink } from "lucide-react";

interface Portal {
  token: string;
  title: string;
  conversationId: string;
  artifactIds: string[];
  createdAt: string;
}

export default function ClientPortalsPage() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/client-portals", { cache: "no-store" });
      const d = await res.json() as { ok: boolean; portals: Portal[] };
      if (d.ok) setPortals(d.portals);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/client/${token}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (token: string) => {
    if (!confirm("Supprimer ce portail client ?")) return;
    await fetch(`/api/client-portals/${token}`, { method: "DELETE" });
    void load();
  };

  return (
    <main className="page">
      <div style={{ padding: "32px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Link2 size={18} style={{ color: "var(--accent)" }} />
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Portails clients
          </h1>
          <span style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--border)", padding: "2px 8px", borderRadius: 20, marginLeft: 4 }}>
            {portals.length}
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 24px" }}>
          Liens partagés avec vos clients pour visualiser les livrables.
        </p>
      </div>

      <div style={{ padding: "0 32px 32px" }}>
        {loading && (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Chargement…</p>
        )}

        {!loading && portals.length === 0 && (
          <div style={{
            border: "1px dashed var(--border)",
            borderRadius: 10,
            padding: "40px 24px",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
          }}>
            <Link2 size={24} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Aucun portail créé.</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>
              Utilisez le bouton 🔗 dans le panneau projet CEO pour générer un lien client.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {portals.map((p) => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/client/${p.token}`;
            const isCopied = copied === p.token;
            return (
              <div
                key={p.token}
                style={{
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 3 }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    /client/{p.token}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                    {p.artifactIds.length} livrable(s) · {new Date(p.createdAt).toLocaleDateString("fr-CA", { dateStyle: "medium" })}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleCopy(p.token)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "6px 10px", fontSize: 12, borderRadius: 6, cursor: "pointer",
                      background: isCopied ? "rgba(34,197,94,0.1)" : "rgba(79,142,247,0.1)",
                      border: `1px solid ${isCopied ? "rgba(34,197,94,0.3)" : "rgba(79,142,247,0.3)"}`,
                      color: isCopied ? "#22c55e" : "var(--accent)",
                    }}
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    {isCopied ? "Copié" : "Copier"}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "6px 10px", fontSize: 12, borderRadius: 6,
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                      textDecoration: "none",
                    }}
                  >
                    <ExternalLink size={12} />
                    Ouvrir
                  </a>
                  <button
                    onClick={() => void handleDelete(p.token)}
                    style={{
                      display: "flex", alignItems: "center",
                      padding: "6px 8px", fontSize: 12, borderRadius: 6, cursor: "pointer",
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
