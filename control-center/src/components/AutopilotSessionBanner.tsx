"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cpu, Rocket } from "lucide-react";
import { motion } from "framer-motion";

interface MiniSession {
  sessionId: string;
  projectName: string;
  status: string;
  progress: number;
  currentPhase: string;
}

const STATUS_COLORS: Record<string, string> = {
  running: "#34d399",
  paused: "#f59e0b",
  completed: "#38bdf8",
  failed: "#f43f5e",
  draft: "#8b97b2",
};

const PHASE_LABELS: Record<string, string> = {
  idea: "Idea Analysis",
  planning: "Product Planning",
  architecture: "Architecture Design",
  frontend: "Frontend Tasks",
  backend: "Backend Tasks",
  validation: "Validation",
  build: "Build Preparation",
  runtime: "Runtime Monitoring",
};

export default function AutopilotSessionBanner() {
  const [sessions, setSessions] = useState<MiniSession[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/autopilot/sessions", { cache: "no-store" });
        const payload = (await res.json()) as { sessions?: MiniSession[] };
        if (!mounted) return;
        const active = (payload.sessions ?? [])
          .filter((s) => s.status === "running" || s.status === "paused")
          .slice(0, 2);
        setSessions(active);
      } catch {
        // ignore
      }
    }
    void load();
    const iv = setInterval(() => void load(), 6000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  if (sessions.length === 0) return null;

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)", padding: "10px 14px",
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        <Cpu size={12} /> Active Autopilot Sessions
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sessions.map((s) => (
          <Link
            key={s.sessionId}
            href={`/autopilot/${s.sessionId}`}
            style={{ textDecoration: "none" }}
          >
            <motion.div
              whileHover={{ x: 2 }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 10px", borderRadius: 6,
                background: "var(--bg-2)", border: "1px solid var(--border)",
                transition: "border-color 120ms ease",
              }}
            >
              <Rocket size={12} color={STATUS_COLORS[s.status] ?? "#8b97b2"} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", flex: 1 }}>{s.projectName}</span>
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>{PHASE_LABELS[s.currentPhase] ?? s.currentPhase}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLORS[s.status] ?? "#8b97b2" }}>{s.progress}%</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
