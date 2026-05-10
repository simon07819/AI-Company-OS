import fs from "fs";
import path from "path";
import Link from "next/link";

const REPO_ROOT = path.resolve(process.cwd(), "..");

const AGENT_COLORS: Record<string, string> = {
  frontend_agent:  "#3b82f6",
  backend_agent:   "#22c55e",
  qa_agent:        "#ef4444",
  devops_agent:    "#6c63ff",
  architect_agent: "#f59e0b",
  product_agent:   "#a78bfa",
};

interface LogEntry {
  timestamp: string;
  project?: string;
  task_id?: number | string;
  task_title?: string;
  agent?: string;
  status?: string;
  message?: string;
  event?: string;
  [key: string]: unknown;
}

function readJsonl(filePath: string): LogEntry[] {
  try {
    return fs
      .readFileSync(filePath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => { try { return JSON.parse(line) as LogEntry; } catch { return null; } })
      .filter(Boolean) as LogEntry[];
  } catch { return []; }
}

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return ts; }
}

function statusClass(status?: string) {
  if (status === "completed") return "badge-green";
  if (status === "selected")  return "badge-accent";
  if (status === "error")     return "badge-red";
  return "badge-gray";
}

export default function LogsPage() {
  const activityEntries = readJsonl(path.join(REPO_ROOT, "logs", "agent_activity.jsonl"))
    .reverse()
    .slice(0, 200);

  const projectDirs = (() => {
    try {
      return fs.readdirSync(path.join(REPO_ROOT, "projects")).filter((d) => {
        try { return fs.statSync(path.join(REPO_ROOT, "projects", d)).isDirectory(); }
        catch { return false; }
      });
    } catch { return []; }
  })();

  const projectLogs = projectDirs
    .map((project) => ({
      project,
      entries: readJsonl(path.join(REPO_ROOT, "projects", project, "logs", "events.jsonl"))
        .reverse()
        .slice(0, 50),
    }))
    .filter((p) => p.entries.length > 0);

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Logs</h1>
          <p className="page-subtitle">
            Agent activity log and project event streams
          </p>
        </div>
        <div className="page-actions">
          <Link href="/agents/activity" className="btn btn-ghost">
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            Live Feed
          </Link>
        </div>
      </div>

      {/* Agent Activity Log */}
      <div className="section">
        <div className="section-header">
          <h2 style={{ margin: 0 }}>Agent Activity</h2>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            {activityEntries.length} entries · last 200
          </span>
        </div>

        {activityEntries.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: 36 }}>
              <div className="empty-state-title">No activity logged yet</div>
              <div className="empty-state-sub">Run <code style={{ fontFamily: "monospace", color: "var(--accent-light)" }}>auto_build.py</code> to generate logs.</div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Agent</th>
                  <th>Project</th>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {activityEntries.map((e, i) => {
                  const color = AGENT_COLORS[e.agent ?? ""] ?? "var(--text-3)";
                  return (
                    <tr key={i}>
                      <td style={{ whiteSpace: "nowrap", fontSize: 11, color: "var(--text-3)" }}>
                        {fmt(e.timestamp ?? "")}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color, fontWeight: 600 }}>
                            {e.agent}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-3)" }}>{e.project}</td>
                      <td style={{ fontSize: 12 }}>
                        {e.task_id != null && <span style={{ color: "var(--text-3)", marginRight: 4 }}>[{e.task_id}]</span>}
                        {e.task_title}
                      </td>
                      <td>
                        <span className={`badge ${statusClass(e.status)}`}>{e.status}</span>
                      </td>
                      <td
                        style={{ fontSize: 11, color: "var(--text-3)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={e.message}
                      >
                        {e.message}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-project event logs */}
      {projectLogs.map(({ project, entries }) => (
        <div className="section" key={project}>
          <div className="section-header">
            <h2 style={{ margin: 0 }}>{project} Events</h2>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>{entries.length} entries</span>
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: "nowrap", fontSize: 11, color: "var(--text-3)" }}>
                      {fmt(e.timestamp ?? "")}
                    </td>
                    <td style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "var(--accent-light)" }}>
                      {e.event ?? e.status}
                    </td>
                    <td style={{ fontSize: 11, color: "var(--text-3)", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={JSON.stringify(e)}
                    >
                      {JSON.stringify(e).slice(0, 200)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </main>
  );
}
