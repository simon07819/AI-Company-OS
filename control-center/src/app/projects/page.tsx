import { getAllProjects } from "@/lib/projects";
import Link from "next/link";

function statusClass(status?: string) {
  const map: Record<string, string> = {
    active: "badge-green",
    initialized: "badge-blue",
    paused: "badge-yellow",
    completed: "badge-purple",
    failed: "badge-red",
  };
  return map[status ?? ""] ?? "badge-gray";
}

function priorityStyle(priority?: string) {
  if (priority === "high")   return { color: "var(--red)",    bg: "var(--red-dim)" };
  if (priority === "medium") return { color: "var(--yellow)", bg: "var(--yellow-dim)" };
  if (priority === "low")    return { color: "var(--blue)",   bg: "var(--blue-dim)" };
  return { color: "var(--text-3)", bg: "rgba(139,151,178,0.1)" };
}

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            {projects.length} project{projects.length !== 1 ? "s" : ""} in the factory
          </p>
        </div>
        <div className="page-actions">
          <Link href="/actions" className="btn">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
            </svg>
            New Project
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: 36, opacity: 0.2 }}>
              <svg width="48" height="48" viewBox="0 0 20 20" fill="var(--text-3)">
                <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
              </svg>
            </div>
            <div className="empty-state-title">No projects yet</div>
            <div className="empty-state-sub">Create your first product to get started.</div>
            <Link href="/actions" className="btn" style={{ marginTop: 4 }}>Create Product</Link>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 14,
          }}
        >
          {projects.map((p) => {
            const done = p.tasks.filter(
              (t) => t.status === "completed_real" || t.status === "completed"
            ).length;
            const failed = p.tasks.filter((t) => t.status === "failed").length;
            const queued = p.tasks.filter((t) => t.status === "queued" || t.status === "pending").length;
            const rate = p.tasks.length > 0 ? Math.round((done / p.tasks.length) * 100) : 0;
            const { color: priColor, bg: priBg } = priorityStyle(p.meta.project_priority);
            const hasApp = true; // simplified — the project detail checks the filesystem

            return (
              <Link key={p.name} href={`/projects/${p.name}`} className="project-card-link">
                <div className="project-card">
                  {/* Header */}
                  <div className="project-card-header">
                    <span className="project-name">{p.name}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {p.meta.project_priority && (
                        <span
                          className="badge"
                          style={{ background: priBg, color: priColor }}
                        >
                          {p.meta.project_priority}
                        </span>
                      )}
                      <span className={`badge ${statusClass(p.meta.status)}`}>
                        {p.meta.status}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="project-progress-bar">
                    <div
                      className="project-progress-fill"
                      style={{
                        width: `${rate}%`,
                        background: rate === 100
                          ? "var(--green)"
                          : failed > 0
                          ? "var(--yellow)"
                          : "linear-gradient(90deg, var(--accent), var(--accent-light))",
                      }}
                    />
                  </div>

                  {/* Stats row */}
                  <div className="project-stats">
                    <div className="project-stat">
                      <span className="project-stat-value">{p.tasks.length}</span>
                      <span className="project-stat-label">Tasks</span>
                    </div>
                    <div className="project-stat">
                      <span className="project-stat-value" style={{ color: "var(--green)" }}>{done}</span>
                      <span className="project-stat-label">Done</span>
                    </div>
                    {queued > 0 && (
                      <div className="project-stat">
                        <span className="project-stat-value" style={{ color: "var(--blue)" }}>{queued}</span>
                        <span className="project-stat-label">Queued</span>
                      </div>
                    )}
                    {failed > 0 && (
                      <div className="project-stat">
                        <span className="project-stat-value" style={{ color: "var(--red)" }}>{failed}</span>
                        <span className="project-stat-label">Failed</span>
                      </div>
                    )}
                    <div className="project-stat" style={{ marginLeft: "auto" }}>
                      <span
                        className="project-stat-value"
                        style={{ color: rate >= 80 ? "var(--green)" : rate >= 40 ? "var(--yellow)" : "var(--text-3)" }}
                      >
                        {rate}%
                      </span>
                      <span className="project-stat-label">Success</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
