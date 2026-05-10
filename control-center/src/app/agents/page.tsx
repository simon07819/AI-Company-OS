import { AGENTS } from "@/lib/agents";
import Link from "next/link";

export default function AgentsPage() {
  const available = AGENTS.filter((a) => a.status === "available").length;

  return (
    <main className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Agent Team</h1>
          <p className="page-subtitle">
            {AGENTS.length} specialized agents · {available} online · Autonomous task execution
          </p>
        </div>
        <div className="page-actions">
          <Link href="/agents/activity" className="btn btn-ghost">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
            </svg>
            Live Activity
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="metric-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", maxWidth: 520, marginBottom: 32 }}>
        <div className="metric-card">
          <div className="metric-label">Total Agents</div>
          <div className="metric-value accent" style={{ marginTop: 8 }}>{AGENTS.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Online</div>
          <div className="metric-value green" style={{ marginTop: 8 }}>{available}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Specializations</div>
          <div className="metric-value" style={{ marginTop: 8 }}>6</div>
        </div>
      </div>

      {/* Agent Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        {AGENTS.map((agent) => (
          <div
            key={agent.id}
            className="agent-card"
            style={{ borderTop: `3px solid ${agent.color}` }}
          >
            {/* Card top: avatar + name + online */}
            <div className="agent-card-top">
              <div className="agent-card-header">
                <div
                  className="agent-avatar"
                  style={{
                    background: `${agent.color}18`,
                    color: agent.color,
                    border: `1px solid ${agent.color}30`,
                  }}
                >
                  {agent.name.charAt(0)}
                </div>
                <div className="agent-info">
                  <div className="agent-name">{agent.name}</div>
                  <div className="agent-id">{agent.id}</div>
                </div>
                <span className="online-badge">
                  <span className="status-dot online" />
                  online
                </span>
              </div>
              <p className="agent-role">{agent.role}</p>
            </div>

            {/* Card body */}
            <div className="agent-card-body">
              {/* Responsibilities */}
              <div>
                <div className="agent-section-label">Responsibilities</div>
                <div className="agent-resps">
                  {agent.responsibilities.map((r) => (
                    <div key={r} className="agent-resp">{r}</div>
                  ))}
                </div>
              </div>

              {/* Example Tasks */}
              <div>
                <div className="agent-section-label">Example Tasks</div>
                <div className="agent-pills">
                  {agent.examples.map((ex) => (
                    <span key={ex} className="agent-pill">{ex}</span>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div>
                <div className="agent-section-label">Routing Keywords</div>
                <div className="agent-pills">
                  {agent.keywords.slice(0, 7).map((kw) => (
                    <span
                      key={kw}
                      className="agent-keyword"
                      style={{
                        background: `${agent.color}14`,
                        color: agent.color,
                        border: `1px solid ${agent.color}28`,
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                  {agent.keywords.length > 7 && (
                    <span
                      className="agent-keyword"
                      style={{ background: "var(--surface-2)", color: "var(--text-3)", border: "1px solid var(--border)" }}
                    >
                      +{agent.keywords.length - 7} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
