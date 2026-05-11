"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────

export interface LiveActivity {
  id: string;
  agentId: string;
  agentEmoji: string;
  agentColor: string;
  action: string;
  task: string;
  status: "running" | "completed" | "waiting" | "error";
  progress: number;
  timestamp: string;
  sessionId?: string;
}

interface AgentActivityCardProps {
  activity: LiveActivity;
  onClick?: () => void;
  compact?: boolean;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  running: { label: "WORKING", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  completed: { label: "DONE", color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
  waiting: { label: "WAITING", color: "#8b97b2", bg: "rgba(139,151,178,0.1)" },
  error: { label: "ERROR", color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
};

// ─── AgentActivityCard ────────────────────────────────────────────────────

export function AgentActivityCard({ activity, onClick, compact = false }: AgentActivityCardProps) {
  const status = STATUS_META[activity.status] ?? STATUS_META.waiting;
  const isLive = activity.status === "running";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: `1px solid ${activity.agentColor}20`,
        borderLeft: `3px solid ${activity.agentColor}`,
        borderRadius: 8,
        padding: compact ? "8px 12px" : "12px 14px",
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {/* Avatar */}
        <div style={{
          width: compact ? 26 : 32, height: compact ? 26 : 32, borderRadius: 8, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: compact ? 13 : 15,
          background: `${activity.agentColor}14`, border: `1px solid ${activity.agentColor}25`,
        }}>
          {activity.agentEmoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Agent + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: activity.agentColor, fontFamily: "ui-monospace, monospace" }}>
              {activity.agentId.replace(/_/g, " ")}
            </span>
            {activity.action && (
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: "0.5px", padding: "1px 5px", borderRadius: 3,
                color: activity.agentColor, background: `${activity.agentColor}12`,
              }}>
                {activity.action.toUpperCase()}
              </span>
            )}
            <span style={{
              fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 10,
              color: status.color, background: status.bg,
              display: "flex", alignItems: "center", gap: 3,
            }}>
              {isLive && (
                <span style={{
                  width: 4, height: 4, borderRadius: "50%", background: status.color,
                  animation: "pulse-ring 2s ease infinite",
                }} />
              )}
              {status.label}
            </span>
          </div>

          {/* Task */}
          <p style={{
            marginTop: 3, fontSize: compact ? 11 : 12, fontWeight: 600, color: "var(--text)", lineHeight: 1.35,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {activity.task}
          </p>

          {/* Progress bar */}
          {!compact && isLive && (
            <div style={{ marginTop: 6 }}>
              <div style={{ background: "var(--bg-2)", borderRadius: 3, height: 4, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(activity.progress, 100)}%` }}
                  transition={{ duration: 0.5 }}
                  style={{ height: "100%", background: activity.agentColor, borderRadius: 3 }}
                />
              </div>
            </div>
          )}

          {/* Timestamp */}
          <span style={{ fontSize: 9, color: "var(--text-3)", marginTop: 3, display: "block" }}>
            {new Date(activity.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
