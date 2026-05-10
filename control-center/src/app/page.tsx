import { getAllProjects, computeStats } from "@/lib/projects";
import { AGENTS } from "@/lib/agents";
import Link from "next/link";
import LiveActivityFeed from "@/components/LiveActivityFeed";

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

export default function DashboardPage() {
  const projects = getAllProjects();
  const stats = computeStats(projects);
  const onlineAgents = AGENTS.filter((a) => a.status === "available").length;
  const activeProjects = projects.filter((p) => p.meta.status === "active").length;

  return (
    <main className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Factory Dashboard</h1>
          <p className="page-subtitle">
            {projects.length} project{projects.length !== 1 ? "s" : ""} · {onlineAgents} agents online · Real-time monitoring
          </p>
        </div>
        <div className="page-actions">
          <Link href="/actions" className="btn">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
            </svg>
            Run Action
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Projects</span>
            <div className="metric-icon" style={{ background: "var(--accent-dim)" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--accent-light)">
                <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
              </svg>
            </div>
          </div>
          <div className="metric-value accent">{stats.totalProjects}</div>
          <div className="metric-sub">{activeProjects} active</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Total Tasks</span>
            <div className="metric-icon" style={{ background: "var(--blue-dim)" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--blue)">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
          <div className="metric-value">{stats.totalTasks}</div>
          <div className="metric-sub">{stats.queued} queued</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Completed</span>
            <div className="metric-icon" style={{ background: "var(--green-dim)" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--green)">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
          <div className="metric-value green">{stats.completedReal}</div>
          <div className="metric-sub">{stats.failed > 0 ? `${stats.failed} failed` : "no failures"}</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Success Rate</span>
            <div className="metric-icon" style={{ background: "var(--green-dim)" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--green)">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
          <div className="metric-value green">{stats.successRate}%</div>
          <div className="metric-progress">
            <div className="metric-progress-fill" style={{ width: `${stats.successRate}%` }} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Agents</span>
            <div className="metric-icon" style={{ background: "var(--accent-dim)" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--accent-light)">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zm-4.07 7c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
              </svg>
            </div>
          </div>
          <div className="metric-value accent">{onlineAgents}</div>
          <div className="metric-sub">all online</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Retrying</span>
            <div className="metric-icon" style={{ background: "var(--yellow-dim)" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--yellow)">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
          <div className="metric-value yellow">{stats.retrying}</div>
          <div className="metric-sub">{stats.archived} archived</div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 292px", gap: 24, alignItems: "start" }}>

        {/* Left: Live Activity */}
        <div>
          <div className="section-header">
            <h2 style={{ margin: 0 }}>Live Activity</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="live-badge"><span className="live-dot" />live</span>
              <Link href="/agents/activity" style={{ fontSize: 12, color: "var(--text-3)" }}>View all →</Link>
            </div>
          </div>
          <LiveActivityFeed limit={15} compact={false} />
        </div>

        {/* Right: Projects + Agents */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

          {/* Projects summary */}
          <div>
            <div className="section-header">
              <h2 style={{ margin: 0 }}>Projects</h2>
              <Link href="/projects" style={{ fontSize: 12, color: "var(--text-3)" }}>See all →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {projects.length === 0 ? (
                <div className="card" style={{ padding: "14px 16px" }}>
                  <p style={{ color: "var(--text-3)", fontSize: 12 }}>No projects yet.</p>
                </div>
              ) : projects.map((p) => {
                const done = p.tasks.filter((t) => t.status === "completed_real" || t.status === "completed").length;
                const rate = p.tasks.length > 0 ? Math.round((done / p.tasks.length) * 100) : 0;
                return (
                  <Link key={p.name} href={`/projects/${p.name}`} className="project-card-link">
                    <div className="project-card" style={{ padding: "12px 16px" }}>
                      <div className="project-card-header" style={{ marginBottom: 8 }}>
                        <span className="project-name" style={{ fontSize: 13 }}>{p.name}</span>
                        <span className={`badge ${statusClass(p.meta.status)}`}>{p.meta.status}</span>
                      </div>
                      <div className="project-progress-bar">
                        <div
                          className="project-progress-fill"
                          style={{
                            width: `${rate}%`,
                            background: rate === 100
                              ? "var(--green)"
                              : "linear-gradient(90deg, var(--accent), var(--accent-light))",
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{done}/{p.tasks.length} tasks</span>
                        <span style={{ fontSize: 11, color: rate >= 80 ? "var(--green)" : "var(--text-3)" }}>{rate}%</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Agent Team */}
          <div>
            <div className="section-header">
              <h2 style={{ margin: 0 }}>Agent Team</h2>
              <Link href="/agents" style={{ fontSize: 12, color: "var(--text-3)" }}>Details →</Link>
            </div>
            <div className="card" style={{ padding: 0 }}>
              {AGENTS.map((agent, i) => (
                <div
                  key={agent.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderBottom: i < AGENTS.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: `${agent.color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      color: agent.color,
                      flexShrink: 0,
                    }}
                  >
                    {agent.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {agent.name}
                    </div>
                  </div>
                  <span className="online-badge" style={{ fontSize: 10 }}>
                    <span className="status-dot online" />
                    online
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
