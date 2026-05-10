import { AGENTS } from "@/lib/agents";
import Link from "next/link";

export default function AgentsPage() {
  const available = AGENTS.filter((a) => a.status === "available").length;

  return (
    <main className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>AI Agents</h1>
        <Link href="/agents/activity" style={{ fontSize: 13 }}>
          View live activity →
        </Link>
      </div>

      {/* Summary bar */}
      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-label">Total Agents</div>
          <div className="stat-value accent">{AGENTS.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Available</div>
          <div className="stat-value green">{available}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last Selected</div>
          <div className="stat-value" style={{ fontSize: 13, color: "var(--muted)", paddingTop: 6 }}>
            not tracked yet
          </div>
        </div>
      </div>

      {/* Agent cards */}
      <div className="section">
        <h2>Specialized Agents</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {AGENTS.map((agent) => (
            <div
              key={agent.id}
              className="card"
              style={{
                borderLeft: `3px solid ${agent.color}`,
                marginBottom: 0,
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `${agent.color}22`,
                      border: `1px solid ${agent.color}44`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: agent.color,
                    }}
                  >
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {agent.id}
                    </div>
                  </div>
                </div>
                <span className="badge badge-green">available</span>
              </div>

              {/* Role */}
              <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
                {agent.role}
              </p>

              {/* Responsibilities */}
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: 6,
                  }}
                >
                  Responsibilities
                </div>
                <ul style={{ paddingLeft: 14, margin: 0 }}>
                  {agent.responsibilities.map((r) => (
                    <li
                      key={r}
                      style={{ fontSize: 12, color: "var(--text)", marginBottom: 3, lineHeight: 1.4 }}
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Task examples */}
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: 6,
                  }}
                >
                  Example Tasks
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {agent.examples.map((ex) => (
                    <span
                      key={ex}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 9999,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: 6,
                  }}
                >
                  Routing Keywords
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {agent.keywords.slice(0, 6).map((kw) => (
                    <span
                      key={kw}
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: `${agent.color}18`,
                        color: agent.color,
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                  {agent.keywords.length > 6 && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        color: "var(--muted)",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      +{agent.keywords.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
