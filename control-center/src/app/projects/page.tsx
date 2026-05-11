"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, Copy, Edit3, RefreshCw, Search, Trash2, Undo2 } from "lucide-react";

interface CeoProject {
  id: string;
  name: string;
  missionType: string;
  status: string;
  sessionId: string | null;
  progress: number;
  outputsCount: number;
  lastActivity: string;
  archivedAt?: string | null;
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg-2)",
  color: "var(--text)",
  fontSize: 12,
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<CeoProject[]>([]);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<CeoProject | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/ceo-projects?includeArchived=true");
    if (res.ok) {
      const data = await res.json();
      setProjects(data.projects ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => projects.filter((project) => {
    if (tab === "active" && project.archivedAt) return false;
    if (tab === "archived" && !project.archivedAt) return false;
    if (status !== "all" && project.status !== status) return false;
    const q = query.toLowerCase();
    return !q || project.name.toLowerCase().includes(q) || project.missionType.toLowerCase().includes(q);
  }), [projects, query, status, tab]);

  const action = async (projectId: string, name: string, body?: Record<string, unknown>, method = "PATCH") => {
    if (method === "DELETE" && !confirm(`Soft delete project "${name}"?`)) return;
    await fetch(`/api/ceo-projects/${projectId}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "DELETE" ? undefined : JSON.stringify(body ?? {}),
    });
    setToast(`${name}: action saved`);
    setTimeout(() => setToast(""), 2200);
    await load();
  };

  const bulk = async (kind: "archive" | "delete") => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`${kind === "archive" ? "Archive" : "Soft delete"} ${ids.length} project(s)?`)) return;
    for (const id of ids) {
      const project = projects.find((p) => p.id === id);
      if (!project) continue;
      await action(id, project.name, { action: "archive" }, kind === "delete" ? "DELETE" : "PATCH");
    }
    setSelected(new Set());
  };

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Operational project management: edit, duplicate, archive, restore and soft delete.</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={load}><RefreshCw size={13} /> Refresh</button>
          <Link href="/ceo" className="btn" style={{ background: "#f59e0b", color: "#fff", borderColor: "#f59e0b" }}>New via CEO</Link>
        </div>
      </div>

      {toast && <div className="card" style={{ marginBottom: 12, borderColor: "#22c55e", color: "#22c55e" }}>{toast}</div>}

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" onClick={() => setTab("active")} style={{ borderColor: tab === "active" ? "#3b82f6" : undefined }}>Active</button>
          <button className="btn" onClick={() => setTab("archived")} style={{ borderColor: tab === "archived" ? "#3b82f6" : undefined }}>Archive</button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 220 }}>
            <Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" style={{ ...inputStyle, flex: 1 }} />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
            <option value="all">All status</option>
            <option value="starting">Starting</option>
            <option value="in_progress">In progress</option>
            <option value="review">Review</option>
            <option value="delivered">Delivered</option>
          </select>
          <button className="btn" onClick={() => void bulk("archive")} disabled={selected.size === 0}><Archive size={13} /> Bulk archive</button>
          <button className="btn" onClick={() => void bulk("delete")} disabled={selected.size === 0}><Trash2 size={13} /> Bulk delete</button>
        </div>
      </div>

      {loading ? (
        <div className="card">Loading projects...</div>
      ) : visible.length === 0 ? (
        <div className="card"><div className="empty-state-title">No {tab} projects</div><div className="empty-state-sub">Use the CEO Cockpit to create a project, or restore archived projects from this tab.</div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {visible.map((project) => (
            <div key={project.id} className="project-card" style={{ borderLeft: "3px solid #8b5cf6" }}>
              <div className="project-card-header">
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={selected.has(project.id)} onChange={(e) => setSelected((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(project.id); else next.delete(project.id);
                    return next;
                  })} />
                  <span className="project-name">{project.name}</span>
                </label>
                <span className="badge badge-blue">{project.status.replace("_", " ")}</span>
              </div>
              <div className="project-progress-bar"><div className="project-progress-fill" style={{ width: `${project.progress}%` }} /></div>
              <div className="project-stats">
                <div className="project-stat"><span className="project-stat-value">{project.progress}%</span><span className="project-stat-label">Progress</span></div>
                <div className="project-stat"><span className="project-stat-value">{project.outputsCount}</span><span className="project-stat-label">Outputs count</span></div>
                <div className="project-stat"><span className="project-stat-value">{project.sessionId ? "Linked" : "None"}</span><span className="project-stat-label">Linked mission</span></div>
                <div className="project-stat"><span className="project-stat-value">Agents</span><span className="project-stat-label">Active agents</span></div>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 8 }}>Last activity: {new Date(project.lastActivity).toLocaleString()}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {project.sessionId && <Link className="btn" href={`/mission/${project.sessionId}`}>Mission Room</Link>}
                <button className="btn" onClick={() => { setEditing(project); setEditName(project.name); }}><Edit3 size={12} /> Edit</button>
                <button className="btn" onClick={() => action(project.id, project.name, { action: "duplicate" })}><Copy size={12} /> Duplicate</button>
                {project.archivedAt ? (
                  <button className="btn" onClick={() => action(project.id, project.name, { action: "restore" })}><Undo2 size={12} /> Restore</button>
                ) : (
                  <button className="btn" onClick={() => action(project.id, project.name, { action: "archive" })}><Archive size={12} /> Archive</button>
                )}
                <button className="btn" onClick={() => action(project.id, project.name, undefined, "DELETE")}><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="card" style={{ width: 420 }}>
            <h2 style={{ fontSize: 16 }}>Edit project</h2>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: 12 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn" onClick={async () => { await action(editing.id, editing.name, { name: editName }); setEditing(null); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
