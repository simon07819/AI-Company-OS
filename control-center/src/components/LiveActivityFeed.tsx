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
  selected:  "badge-accent",
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
      // keep stale data
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 44,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              animation: "fadeInUp 0.3s ease forwards",
              opacity: 1 - i * 0.2,
            }}
          />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="card">
        <div className="empty-state" style={{ padding: 32 }}>
          <svg width="40" height="40" viewBox="0 0 20 20" fill="var(--text-3)">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
          </svg>
          <div className="empty-state-title">No activity yet</div>
          <div className="empty-state-sub">
            Run <code style={{ fontFamily: "monospace", fontSize: 12, color: "var(--accent-light)" }}>auto_build.py</code> to start the factory.
          </div>
        </div>
      </div>
    );
  }

  const shown = compact ? entries.slice(0, 5) : entries;

  return (
    <div>
      {!compact && updatedAt && (
        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <span className="live-dot" style={{ width: 5, height: 5 }} />
          Auto-refreshing every 5s · Updated {updatedAt.toLocaleTimeString()}
        </div>
      )}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
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
            {shown.map((e, i) => {
              const agentColor = AGENT_COLORS[e.agent] ?? "var(--text-2)";
              return (
                <tr key={i} className="animate-in" style={{ animationDelay: `${i * 20}ms` }}>
                  <td style={{ whiteSpace: "nowrap", fontSize: 11, color: "var(--text-3)" }}>
                    {fmt(e.timestamp)}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: agentColor,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "ui-monospace, monospace",
                          color: agentColor,
                          fontWeight: 600,
                        }}
                      >
                        {e.agent}
                      </span>
                    </div>
                  </td>
                  {!compact && (
                    <td style={{ fontSize: 12, color: "var(--text-3)" }}>{e.project}</td>
                  )}
                  <td style={{ fontSize: 12 }}>
                    <span style={{ color: "var(--text-3)", marginRight: 4 }}>[{e.task_id}]</span>
                    {e.task_title}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_CLASS[e.status] ?? "badge-gray"}`}>
                      {e.status}
                    </span>
                  </td>
                  {!compact && (
                    <td
                      style={{
                        fontSize: 11,
                        color: "var(--text-3)",
                        maxWidth: 240,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={e.message}
                    >
                      {e.message}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
