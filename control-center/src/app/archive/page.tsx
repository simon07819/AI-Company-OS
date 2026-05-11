"use client";

import { useEffect, useState } from "react";
import { Archive, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import { EmptyState, ErrorBanner, GhostButton, LocalBadge, PageHeader, Panel, SectionHeader, StatusBadge } from "@/components/ui";

type EntityType = "projects" | "revenues" | "clients" | "outputs" | "conversations" | "workspaces";

interface ArchivedEntity {
  id: string;
  entityType: EntityType;
  entityId: string;
  label: string;
  action: "archived" | "soft_deleted";
  archivedAt: string;
}

const TYPES: EntityType[] = ["projects", "revenues", "clients", "outputs", "conversations", "workspaces"];

export default function ArchivePage() {
  const [entities, setEntities] = useState<ArchivedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EntityType | "all">("all");

  const loadArchive = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = typeFilter === "all" ? "/api/archive" : `/api/archive?entityType=${typeFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Archive API failed");
      const data = await res.json();
      setEntities(data.entities ?? []);
    } catch {
      setError("Failed to load archive");
    }
    setLoading(false);
  };

  useEffect(() => { loadArchive(); }, [typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const restore = async (entity: ArchivedEntity) => {
    await fetch(`/api/archive/${entity.entityType}/${entity.entityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    loadArchive();
  };

  const remove = async (entity: ArchivedEntity) => {
    if (!confirm(`Permanently delete ${entity.label}?`)) return;
    await fetch(`/api/archive/${entity.entityType}/${entity.entityId}`, { method: "DELETE" });
    loadArchive();
  };

  const filtered = entities.filter((entity) => {
    const q = search.toLowerCase();
    return !q || entity.label.toLowerCase().includes(q) || entity.entityId.toLowerCase().includes(q) || entity.entityType.includes(q);
  });

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1180, margin: "0 auto" }}>
      <PageHeader
        icon={<Archive size={20} />}
        title="Global Archive"
        description="Review archived and soft-deleted projects, revenue items, clients, outputs, conversations, and workspaces."
        badge={<LocalBadge />}
        actions={<GhostButton onClick={loadArchive} disabled={loading}><RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh</GhostButton>}
      />

      {error && <ErrorBanner message={error} onRetry={loadArchive} />}

      <Panel>
        <SectionHeader icon={<Search size={12} />} title="Search Archive" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 8 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search archived items..." style={inputStyle} />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as EntityType | "all")} style={inputStyle}>
            <option value="all">All types</option>
            {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </Panel>

      <Panel>
        <SectionHeader icon={<Archive size={12} />} title="Archived Items" />
        {filtered.length === 0 ? (
          <EmptyState title="No archived items" description="Archived and soft-deleted records will appear here." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map((entity) => (
              <div key={entity.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-2)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{entity.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>{entity.entityType} · {entity.entityId} · {new Date(entity.archivedAt).toLocaleString()}</div>
                </div>
                <StatusBadge label={entity.action === "soft_deleted" ? "Soft deleted" : "Archived"} color={entity.action === "soft_deleted" ? "#f43f5e" : "#f59e0b"} />
                <GhostButton onClick={() => restore(entity)}><RotateCcw size={10} /> Restore</GhostButton>
                <GhostButton onClick={() => remove(entity)}><Trash2 size={10} /> Delete forever</GhostButton>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 12,
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  outline: "none",
};
