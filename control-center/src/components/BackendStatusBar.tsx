"use client";

import { motion } from "framer-motion";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { Zap, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface BackendStatusBarProps {
  onAction?: (action: string, project: string) => void;
  project?: string;
  compact?: boolean;
}

export function BackendStatusBar({ onAction, project, compact = false }: BackendStatusBarProps) {
  const { status, loading, error, refresh } = useSystemStatus(8000);

  const nvidiaColor =
    status?.nvidiaStatus === "online" ? "#a3d977"
    : status?.nvidiaStatus === "offline" ? "#f87171"
    : "#94a3b8";

  const nvidiaLabel =
    status?.nvidiaStatus === "online" ? "Online"
    : status?.nvidiaStatus === "offline" ? "Offline"
    : "Checking";

  if (loading && !status) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: compact ? "6px 14px" : "10px 16px",
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 9, fontSize: 11, color: "var(--text-3)",
      }}>
        <motion.div
          style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--border)" }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        Connecting to backend…
      </div>
    );
  }

  if (error && !status) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: compact ? "6px 14px" : "10px 16px",
        background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)",
        borderRadius: 9, fontSize: 11, color: "#f87171",
      }}>
        <AlertCircle size={12} color="#f87171" />
        Backend unavailable — running in simulation mode
        <button
          onClick={() => { void refresh(); }}
          style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0, marginLeft: 4 }}
        >
          <RefreshCw size={11} />
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      padding: compact ? "6px 14px" : "10px 16px",
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 9,
    }}>
      {/* Connection status */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <motion.div
          style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#34d399" }}>Backend Live</span>
      </div>

      <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />

      {/* NVIDIA status */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
        <Zap size={11} color={nvidiaColor} />
        <span style={{ fontSize: 10, color: nvidiaColor, fontFamily: "ui-monospace, monospace" }}>
          NVIDIA {nvidiaLabel}
        </span>
      </div>

      {status && !compact && (
        <>
          <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />

          {/* Project + task counts */}
          {[
            { label: "Projects",  value: status.projects },
            { label: "Queued",    value: status.queued,   color: "#a5b4fc" },
            { label: "Running",   value: status.running,  color: "#22d3ee" },
            { label: "Failed",    value: status.failed,   color: status.failed > 0 ? "#f87171" : "var(--text-3)" },
            { label: "Done",      value: status.completed, color: "#34d399" },
          ].map((m) => (
            <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: m.color ?? "var(--text-2)" }}>{m.value}</span>
              <span style={{ fontSize: 9, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</span>
            </div>
          ))}

          <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />

          {/* Log entries */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {status.logFileExists ? (
              <CheckCircle2 size={11} color="#34d399" />
            ) : (
              <Clock size={11} color="var(--text-3)" />
            )}
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>
              {status.logEntries.toLocaleString()} log events
            </span>
          </div>
        </>
      )}

      {/* Spacer + refresh + optional actions */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {onAction && project && (
          <>
            <button
              onClick={() => onAction("auto-build", project)}
              style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.1)",
                color: "#34d399", cursor: "pointer",
              }}
            >
              Auto Build
            </button>
            <button
              onClick={() => onAction("factory-cycle", project)}
              style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text-2)", cursor: "pointer",
              }}
            >
              Factory Cycle
            </button>
          </>
        )}
        <button
          onClick={() => { void refresh(); }}
          title="Refresh status"
          style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: 2, display: "flex" }}
        >
          <RefreshCw size={12} />
        </button>
      </div>
    </div>
  );
}
