"use client";

import { useEffect, useState, useCallback } from "react";

interface ActivityEntry {
  timestamp: string;
  project: string;
  task_id: number | string;
  task_title: string;
  agent: string;
  status: string;
  message: string;
}

const STATUS_CLASS: Record<string, string> = {
  completed: "badge-green",
  selected:  "badge-yellow",
  error:     "badge-red",
};

const AGENT_COLORS: Record<string, string> = {
  frontend_agent:  "#3b82f6",
  backend_agent:   "#22c55e",
  qa_agent:        "#ef4444",
  devops_agent:    "#6c63ff",
  architect_agent: "#f59e0b",
  product_agent:   "#a78bfa",
};

function fmt(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return ts; }
}

interface Props {
  limit?: number;
  compact?: boolean;
}

export default function LiveActivityFeed({ limit = 50, compact = false }: Props) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/agent-activity", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { activities: ActivityEntry[] };
      setEntries((data.activities ?? []).slice(0, limit));
      setUpdatedAt(new Date());
    } catch {
      // fail silently — keep stale data
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ color: "var(--muted)", fontSize: 13, padding: "16px 0" }}>
        Loading activity…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="card empty" style={{ fontStyle: "italic" }}>
        No activity logged yet. Run <code style={{ fontFamily: "monospace" }}>auto_build.py</code> to start tracking.
      </div>
    );
  }

  const shown = compact ? entries.slice(0, 5) : entries;

  return (
    <div>
      {!compact && updatedAt && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
          Auto-refreshing every 5s · Updated {updatedAt.toLocaleTimeString()}
        </div>
      )}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Agent</th>
              {!compact && <th>Project</th>}
              <th>Task</th>
              <th>Status</th>
              {!compact && <th>Message</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((e, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: "nowrap", fontSize: 11, color: "var(--muted)" }}>
                  {fmt(e.timestamp)}
                </td>
                <td>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "ui-monospace, monospace",
                      color: AGENT_COLORS[e.agent] ?? "var(--text)",
                    }}
                  >
                    {e.agent}
                  </span>
                </td>
                {!compact && (
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{e.project}</td>
                )}
                <td style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--muted)" }}>[{e.task_id}]</span>{" "}
                  {e.task_title}
                </td>
                <td>
                  <span className={`badge ${STATUS_CLASS[e.status] ?? "badge-gray"}`}>
                    {e.status}
                  </span>
                </td>
                {!compact && (
                  <td style={{ fontSize: 11, color: "var(--muted)", maxWidth: 260 }}>
                    {e.message}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
