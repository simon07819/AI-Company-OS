import { getAllProjects, computeStats } from "@/lib/projects";
import { AGENTS } from "@/lib/agents";
import Link from "next/link";

function statusBadge(status?: string) {
  if (!status) return <span className="badge badge-gray">unknown</span>;
  const map: Record<string, string> = {
    active: "badge-green",
    initialized: "badge-blue",
    paused: "badge-yellow",
    completed: "badge-purple",
    failed: "badge-red",
  };
  return (
    <span className={`badge ${map[status] ?? "badge-gray"}`}>{status}</span>
  );
}

function priorityBadge(priority?: string) {
  if (!priority) return null;
  const map: Record<string, string> = {
    high: "badge-red",
    medium: "badge-yellow",
    low: "badge-blue",
  };
  return (
    <span className={`badge ${map[priority] ?? "badge-gray"}`}>{priority}</span>
  );
}

export default function DashboardPage() {
  const projects = getAllProjects();
  const stats = computeStats(projects);
  const availableAgents = AGENTS.filter((a) => a.status === "available").length;

  return (
    <main className="page">
      <h1>Factory Dashboard</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Projects</div>
          <div className="stat-value accent">{stats.totalProjects}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value">{stats.totalTasks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Queued</div>
          <div className="stat-value blue">{stats.queued}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value green">{stats.completedReal}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed</div>
          <div className="stat-value red">{stats.failed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Archived</div>
          <div className="stat-value">{stats.archived}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Retrying</div>
          <div className="stat-value yellow">{stats.retrying}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Success Rate</div>
          <div className="stat-value green">{stats.successRate}%</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${stats.successRate}%` }}
            />
          </div>
        </div>
      </div>

      <div className="section">
        <h2>AI Agents</h2>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Selected</th>
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((agent) => (
                <tr key={agent.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: agent.color,
                          flexShrink: 0,
                        }}
                      />
                      <Link href="/agents">{agent.name}</Link>
                    </div>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{agent.role}</td>
                  <td><span className="badge badge-green">available</span></td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>not tracked yet</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {AGENTS.length} agents · {availableAgents} available
            </span>
            <Link href="/agents" style={{ fontSize: 12 }}>
              View details →
            </Link>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Projects</h2>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Tasks</th>
                <th>Completed</th>
                <th>Failed</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const done = p.tasks.filter(
                  (t) => t.status === "completed_real" || t.status === "completed"
                ).length;
                const failed = p.tasks.filter((t) => t.status === "failed").length;
                return (
                  <tr key={p.name}>
                    <td>
                      <Link href={`/projects/${p.name}`}>{p.name}</Link>
                    </td>
                    <td>{statusBadge(p.meta.status)}</td>
                    <td>{priorityBadge(p.meta.project_priority)}</td>
                    <td>{p.tasks.length}</td>
                    <td>
                      <span className="badge badge-green">{done}</span>
                    </td>
                    <td>
                      {failed > 0 ? (
                        <span className="badge badge-red">{failed}</span>
                      ) : (
                        <span className="badge badge-gray">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
