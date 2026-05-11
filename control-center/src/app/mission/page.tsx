"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Rocket } from "lucide-react";
import { EmptyState, PageHeader, PrimaryButton, StatusBadge } from "@/components/ui";

type MissionStatus = "draft" | "running" | "paused" | "completed" | "failed";

interface MissionSummary {
  sessionId: string;
  projectName: string;
  projectIdea: string;
  status: MissionStatus;
  currentPhase: string;
  progress: number;
  updatedAt: string;
}

const STATUS: Record<MissionStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "#8b97b2", bg: "rgba(139,151,178,0.1)" },
  running: { label: "Running", color: "#34d399", bg: "rgba(16,185,129,0.12)" },
  paused: { label: "Paused", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  completed: { label: "Completed", color: "#38bdf8", bg: "rgba(59,130,246,0.12)" },
  failed: { label: "Failed", color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<MissionSummary[]>([]);

  useEffect(() => {
    void fetch("/api/autopilot/sessions", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => setMissions(payload.sessions ?? []))
      .catch(() => setMissions([]));
  }, []);

  return (
    <main className="page" style={{ maxWidth: 980 }}>
      <PageHeader
        icon={<Rocket size={20} color="#34d399" />}
        title="Recent Missions"
        description="Guided Mission Rooms for CEO supervision, approvals, and generated results."
        actions={
          <Link href="/ceo">
            <PrimaryButton color="#f59e0b">Talk to CEO</PrimaryButton>
          </Link>
        }
      />

      {missions.length === 0 ? (
        <EmptyState
          icon={<Rocket />}
          title="No missions yet"
          description="Start from the CEO Cockpit. A Mission Room is created automatically."
          action={
            <Link href="/ceo">
              <PrimaryButton color="#f59e0b">Open CEO Cockpit</PrimaryButton>
            </Link>
          }
        />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <AnimatePresence initial={false}>
            {missions.map((mission, index) => {
              const cfg = STATUS[mission.status];
              return (
                <motion.div key={mission.sessionId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                  <Link
                    href={`/mission/${mission.sessionId}`}
                    style={{
                      display: "block",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "16px 18px",
                      color: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <Rocket size={17} style={{ color: cfg.color }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <strong style={{ color: "var(--text)" }}>{mission.projectName}</strong>
                          <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {mission.projectIdea}
                        </div>
                      </div>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, color: mission.status === "completed" ? "#38bdf8" : "#34d399", fontSize: 12, fontWeight: 800 }}>
                        {mission.status === "completed" ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
                        {mission.status === "completed" ? "Open Mission" : "Resume Mission"}
                      </span>
                    </div>
                    <div style={{ height: 5, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                      <motion.div animate={{ width: `${mission.progress}%` }} style={{ height: "100%", background: cfg.color }} />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </main>
  );
}
