"use client";

import { useEffect, useState } from "react";
import { Activity, Bot, CheckCircle2, Cpu, Layers3, Radio } from "lucide-react";
import { motion } from "framer-motion";

type AutopilotTask = {
  id: string;
  title: string;
  agent: string;
  phase: string;
  status: "queued" | "running" | "completed";
};

type AutopilotLog = {
  timestamp: string;
  agent: string;
  message: string;
  phase: string;
};

type AutopilotSession = {
  id: string;
  project: string;
  idea: string;
  currentPhase: string;
  activeAgent: string;
  currentStep: string;
  roadmap: string[];
  tasks: AutopilotTask[];
  logs: AutopilotLog[];
  progress: number;
  completed: boolean;
};

const PHASES = [
  "Idea Analysis",
  "Product Planning",
  "Architecture Design",
  "Frontend Tasks",
  "Backend Tasks",
  "Validation",
  "Build Preparation",
  "Runtime Monitoring",
];

export default function AutopilotPanel({ compact = false }: { compact?: boolean }) {
  const [session, setSession] = useState<AutopilotSession | null>(null);
  const [message, setMessage] = useState("Checking Autopilot...");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/autopilot/status", { cache: "no-store" });
        const payload = (await res.json()) as { message?: string; session?: AutopilotSession | null };
        if (!mounted) return;
        setSession(payload.session ?? null);
        setMessage(payload.message ?? "Autopilot status loaded.");
      } catch (error) {
        if (!mounted) return;
        setMessage(`Autopilot unavailable: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    void load();
    const iv = setInterval(() => void load(), 3500);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  if (!session) {
    return (
      <div className="autopilot-panel compact">
        <div className="autopilot-panel-title"><Cpu size={14} /> Autopilot</div>
        <p>{message}</p>
      </div>
    );
  }

  const completed = session.tasks.filter((task) => task.status === "completed").length;
  const remaining = session.tasks.length - completed;

  return (
    <section className={`autopilot-panel${compact ? " compact" : ""}`}>
      <div className="autopilot-panel-header">
        <div>
          <div className="autopilot-panel-title"><Cpu size={14} /> Local AI Agency Autopilot</div>
          <h2>{session.project}</h2>
          <p>{session.currentStep}</p>
        </div>
        <div className="autopilot-live">
          <motion.span animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
          {session.completed ? "Complete" : "Live"}
        </div>
      </div>

      <div className="autopilot-stats">
        <div><Bot size={14} /><span>Active agent</span><strong>{session.activeAgent}</strong></div>
        <div><Activity size={14} /><span>Phase</span><strong>{session.currentPhase}</strong></div>
        <div><CheckCircle2 size={14} /><span>Completed</span><strong>{completed}</strong></div>
        <div><Layers3 size={14} /><span>Remaining</span><strong>{remaining}</strong></div>
      </div>

      <div className="autopilot-progress">
        <motion.div animate={{ width: `${session.progress}%` }} />
      </div>

      {!compact && (
        <>
          <div className="autopilot-phases">
            {PHASES.map((phase) => {
              const active = phase === session.currentPhase;
              const done = PHASES.indexOf(phase) < PHASES.indexOf(session.currentPhase);
              return (
                <span key={phase} className={active ? "active" : done ? "done" : ""}>
                  {phase}
                </span>
              );
            })}
          </div>

          <div className="autopilot-columns">
            <div>
              <div className="autopilot-subtitle">Task Queue</div>
              {session.tasks.slice(0, 6).map((task) => (
                <div key={task.id} className={`autopilot-task ${task.status}`}>
                  <span>{task.id}</span>
                  <strong>{task.title}</strong>
                  <em>{task.agent}</em>
                </div>
              ))}
            </div>
            <div>
              <div className="autopilot-subtitle"><Radio size={12} /> Live Logs</div>
              {session.logs.slice(0, 5).map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className="autopilot-log">
                  <span>{log.agent}</span>
                  <p>{log.message}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
