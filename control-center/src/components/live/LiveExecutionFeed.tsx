"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AgentActivityCard, type LiveActivity } from "./AgentActivityCard";

// ─── Types ────────────────────────────────────────────────────────────────

interface LiveExecutionFeedProps {
  activities: LiveActivity[];
  title?: string;
  maxVisible?: number;
  onActivityClick?: (activity: LiveActivity) => void;
}

// ─── LiveExecutionFeed ────────────────────────────────────────────────────

export function LiveExecutionFeed({ activities, title = "Live Agent Activity", maxVisible = 8, onActivityClick }: LiveExecutionFeedProps) {
  const [visible, setVisible] = useState<LiveActivity[]>([]);

  useEffect(() => {
    const sorted = [...activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setVisible(sorted.slice(0, maxVisible));
  }, [activities, maxVisible]);

  const running = visible.filter((a) => a.status === "running").length;
  const completed = visible.filter((a) => a.status === "completed").length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: running > 0 ? "#34d399" : "#94a3b8",
          animation: running > 0 ? "pulse-ring 2s ease infinite" : "none",
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{title}</span>
        <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: "auto" }}>
          {running} active · {completed} done
        </span>
      </div>

      {/* Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
        <AnimatePresence>
          {visible.map((activity) => (
            <AgentActivityCard
              key={activity.id}
              activity={activity}
              onClick={onActivityClick ? () => onActivityClick(activity) : undefined}
              compact
            />
          ))}
        </AnimatePresence>
      </div>

      {activities.length === 0 && (
        <div style={{ padding: "20px 0", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>No agent activity yet</span>
        </div>
      )}
    </div>
  );
}
