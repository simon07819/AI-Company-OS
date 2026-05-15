"use client";

import { useCallback, useEffect, useState } from "react";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";

interface ApprovalItem {
  id: string;
  title: string;
  type: string;
  status: "pending" | "approved" | "rejected";
  agentId: string;
  agentName: string;
  sessionId?: string;
  createdAt: string;
  qualityScore?: number;
  summary: string;
  hasPreviewContent: boolean;
  previewType: string;
  rejectionReason?: string;
}

interface ApprovalsResponse {
  ok: boolean;
  pending: ApprovalItem[];
  total: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export default function ApprovalsPage() {
  const [data, setData] = useState<ApprovalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "all">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals", { cache: "no-store" });
      if (res.ok) setData(await res.json() as ApprovalsResponse);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleAction = async (id: string, action: "approve" | "reject", reason?: string) => {
    await fetch(`/api/approvals/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    void load();
  };

  return (
    <section className="platform-page">
      <header className="platform-page-header">
        <span>Approbations</span>
        <h1>Livrables en attente</h1>
        {data && (
          <p>{data.pendingCount} en attente · {data.approvedCount} approuvés · {data.rejectedCount} refusés</p>
        )}
      </header>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          style={{
            padding: "6px 14px", fontSize: 12, borderRadius: 8, cursor: "pointer",
            background: tab === "pending" ? "rgba(59,130,246,0.15)" : "transparent",
            border: `1px solid ${tab === "pending" ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`,
            color: tab === "pending" ? "#60a5fa" : "var(--text-2)",
          }}
          onClick={() => setTab("pending")}
        >
          En attente {data ? `(${data.pendingCount})` : ""}
        </button>
        <button
          style={{
            padding: "6px 14px", fontSize: 12, borderRadius: 8, cursor: "pointer",
            background: tab === "all" ? "rgba(59,130,246,0.15)" : "transparent",
            border: `1px solid ${tab === "all" ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`,
            color: tab === "all" ? "#60a5fa" : "var(--text-2)",
          }}
          onClick={() => setTab("all")}
        >
          Tous {data ? `(${data.total})` : ""}
        </button>
        <button
          style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 12, borderRadius: 8, cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-3)" }}
          onClick={() => { void load(); }}
        >
          ↺ Rafraîchir
        </button>
      </div>

      {loading && <p style={{ color: "var(--text-3)", fontSize: 13 }}>Chargement…</p>}

      {!loading && data && (
        <>
          {data.pending.length === 0 && tab === "pending" && (
            <div className="platform-card-grid">
              <div className="platform-card-link" style={{ cursor: "default" }}>
                <strong>Aucun livrable en attente</strong>
                <span>Tous les livrables ont été traités.</span>
              </div>
            </div>
          )}
          {data.pending.map((item) => (
            <ApprovalCard
              key={item.id}
              item={item as Parameters<typeof ApprovalCard>[0]["item"]}
              onPreview={(id) => window.open(`/api/approvals/${id}/preview`, "_blank")}
              onApprove={() => void handleAction(item.id, "approve")}
              onReject={(reason: string | undefined) => void handleAction(item.id, "reject", reason)}
            />
          ))}
        </>
      )}
    </section>
  );
}
