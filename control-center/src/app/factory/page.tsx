"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FactoryState = "idle" | "running" | "paused" | "stopping";
type WorkerStatus = "active" | "busy" | "idle" | "error";
type TaskStatus   = "queued" | "running" | "completed" | "failed" | "retrying";
type TaskPriority = "critical" | "high" | "normal" | "low";

interface Worker {
  id: string;
  name: string;
  agent: string;
  agentEmoji: string;
  agentColor: string;
  task: string;
  status: WorkerStatus;
  progress: number;
  uptime: number;
  cpu: number;
  memory: number;
  tasksCompleted: number;
}

interface Task {
  id: string;
  name: string;
  project: string;
  status: TaskStatus;
  priority: TaskPriority;
  worker: string | null;
  deps: number;
  eta: string;
  createdAt: number;
  attempts: number;
}

interface ActionFeedback {
  id: string;
  action: string;
  status: "running" | "success" | "error";
  message: string;
}

interface BridgeResponse {
  ok: boolean;
  mode?: "real" | "mock";
  message?: string;
  command?: string;
  stderr?: string;
}

// ─── Data pools ───────────────────────────────────────────────────────────────

const AGENT_POOL = [
  { name: "product_agent",   emoji: "🧠", color: "#a78bfa" },
  { name: "architect_agent", emoji: "🏗️", color: "#6366f1" },
  { name: "frontend_agent",  emoji: "🎨", color: "#f472b6" },
  { name: "backend_agent",   emoji: "⚙️",  color: "#34d399" },
  { name: "qa_agent",        emoji: "🔬", color: "#fb923c" },
  { name: "devops_agent",    emoji: "🚀", color: "#38bdf8" },
];

const TASK_NAMES = [
  "Generate Prisma schema",       "Build REST API routes",
  "Scaffold UI components",       "Write integration tests",
  "Validate API contracts",       "Generate TypeScript types",
  "Create Docker config",         "Run static analysis",
  "Generate roadmap v2",          "Build auth module",
  "Optimize query performance",   "Deploy to staging",
  "Generate product PRD",         "Run E2E test suite",
  "Build billing integration",    "Validate security policies",
];

const PROJECTS = ["ai-company-os", "control-center", "analytics-engine", "billing-module"];

let _uid = 1;
const uid = () => `${_uid++}`;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const fmt   = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

function mkWorker(id: string): Worker {
  const a = pick(AGENT_POOL);
  return {
    id,
    name: `worker-${id}`,
    agent: a.name,
    agentEmoji: a.emoji,
    agentColor: a.color,
    task: pick(TASK_NAMES),
    status: pick(["active", "active", "busy", "idle"] as WorkerStatus[]),
    progress: rand(5, 90),
    uptime: rand(30, 3600),
    cpu: rand(12, 88),
    memory: rand(20, 75),
    tasksCompleted: rand(1, 42),
  };
}

function mkTask(status?: TaskStatus): Task {
  return {
    id: uid(),
    name: pick(TASK_NAMES),
    project: pick(PROJECTS),
    status: status ?? pick(["queued", "queued", "running", "completed", "failed"] as TaskStatus[]),
    priority: pick(["critical", "high", "high", "normal", "normal", "low"] as TaskPriority[]),
    worker: Math.random() > 0.4 ? `worker-${rand(1, 4)}` : null,
    deps: rand(0, 3),
    eta: `${rand(1, 15)}m`,
    createdAt: Date.now() - rand(0, 300_000),
    attempts: rand(1, 3),
  };
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const WORKER_STATUS_MAP: Record<WorkerStatus, { label: string; color: string; bg: string }> = {
  active:  { label: "ACTIVE",  color: "#34d399", bg: "rgba(16,185,129,0.12)" },
  busy:    { label: "BUSY",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  idle:    { label: "IDLE",    color: "#8b97b2", bg: "rgba(139,151,178,0.1)" },
  error:   { label: "ERROR",   color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
};

const TASK_STATUS_MAP: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  queued:    { label: "QUEUED",    color: "#8b97b2", bg: "rgba(139,151,178,0.08)", border: "var(--border)" },
  running:   { label: "RUNNING",   color: "#34d399", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.25)" },
  completed: { label: "DONE",      color: "#38bdf8", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.2)" },
  failed:    { label: "FAILED",    color: "#f43f5e", bg: "rgba(244,63,94,0.10)",  border: "rgba(244,63,94,0.25)" },
  retrying:  { label: "RETRYING",  color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)" },
};

const PRIORITY_MAP: Record<TaskPriority, { color: string; label: string }> = {
  critical: { color: "#f43f5e", label: "CRIT" },
  high:     { color: "#f59e0b", label: "HIGH" },
  normal:   { color: "#38bdf8", label: "NORM" },
  low:      { color: "#46566e", label: "LOW"  },
};

const FACTORY_COLORS: Record<FactoryState, { color: string; bg: string; label: string }> = {
  idle:     { color: "#8b97b2", bg: "rgba(139,151,178,0.12)", label: "IDLE"     },
  running:  { color: "#34d399", bg: "rgba(16,185,129,0.14)",  label: "RUNNING"  },
  paused:   { color: "#f59e0b", bg: "rgba(245,158,11,0.14)",  label: "PAUSED"   },
  stopping: { color: "#f43f5e", bg: "rgba(244,63,94,0.14)",   label: "STOPPING" },
};

// ─── Pulse dot ────────────────────────────────────────────────────────────────

const Pulse = ({ color, size = 8 }: { color: string; size?: number }) => (
  <span style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
    <span style={{
      position: "absolute", inset: 0, borderRadius: "50%", background: color,
      animation: "pulse-ring 2s ease infinite", opacity: 0.6,
    }} />
    <span style={{ position: "relative", width: size, height: size, borderRadius: "50%", background: color, display: "inline-block" }} />
  </span>
);

// ─── Mini progress bar ────────────────────────────────────────────────────────

const ProgressBar = ({ value, color, height = 3 }: { value: number; color: string; height?: number }) => (
  <div style={{ height, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${color}88, ${color})` }}
    />
  </div>
);

// ─── Action button ────────────────────────────────────────────────────────────

interface ActionDef {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  glow: string;
  desc: string;
  endpoint: string;
}

const ACTIONS: ActionDef[] = [
  { id: "start",    label: "Start Factory",    emoji: "▶",  color: "#34d399", bg: "rgba(16,185,129,0.15)",  glow: "rgba(16,185,129,0.3)",  desc: "Launch full factory_cycle",   endpoint: "/api/factory/start"    },
  { id: "pause",    label: "Pause",            emoji: "⏸",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  glow: "rgba(245,158,11,0.25)",  desc: "Pause all active workers",    endpoint: "/api/factory/pause"    },
  { id: "resume",   label: "Resume",           emoji: "⏯",  color: "#38bdf8", bg: "rgba(56,189,248,0.12)",  glow: "rgba(56,189,248,0.25)",  desc: "Resume paused execution",     endpoint: "/api/factory/resume"   },
  { id: "stop",     label: "Stop",             emoji: "⏹",  color: "#f43f5e", bg: "rgba(244,63,94,0.12)",   glow: "rgba(244,63,94,0.25)",   desc: "Graceful shutdown",           endpoint: "/api/factory/stop"     },
  { id: "retry",    label: "Retry Failed",     emoji: "↻",  color: "#a78bfa", bg: "rgba(167,139,250,0.12)", glow: "rgba(167,139,250,0.25)", desc: "Requeue all failed tasks",    endpoint: "/api/factory/retry"    },
  { id: "build",    label: "Auto Build",       emoji: "🔨", color: "#6366f1", bg: "rgba(99,102,241,0.14)",  glow: "rgba(99,102,241,0.3)",   desc: "Trigger auto_build pipeline", endpoint: "/api/build/auto"      },
  { id: "validate", label: "Validate Project", emoji: "✓",  color: "#34d399", bg: "rgba(16,185,129,0.12)",  glow: "rgba(16,185,129,0.25)",  desc: "Run full validation suite",   endpoint: "/api/validation/run" },
  { id: "roadmap",  label: "Gen Roadmap",      emoji: "🗺",  color: "#f472b6", bg: "rgba(244,114,182,0.12)", glow: "rgba(244,114,182,0.25)", desc: "Roadmap generation (NVIDIA)", endpoint: "/api/factory/roadmap"  },
];

// ─── Factory Action Button ────────────────────────────────────────────────────

function ActionBtn({ def, onAction }: { def: ActionDef; onAction: (id: string) => void }) {
  const [pressed, setPressed] = useState(false);

  const handleClick = () => {
    setPressed(true);
    onAction(def.id);
    setTimeout(() => setPressed(false), 800);
  };

  return (
    <motion.button
      whileHover={{ y: -3, boxShadow: `0 8px 24px ${def.glow}` }}
      whileTap={{ scale: 0.96 }}
      onClick={handleClick}
      style={{
        background: pressed ? def.color + "22" : def.bg,
        border: `1px solid ${pressed ? def.color + "60" : def.color + "30"}`,
        borderRadius: "var(--radius)",
        padding: "14px 16px",
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "flex-start",
        transition: "background 150ms ease, border-color 150ms ease",
        width: "100%",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
        <span style={{
          width: 32, height: 32, borderRadius: 9,
          background: def.color + "20",
          border: `1px solid ${def.color}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, flexShrink: 0,
          boxShadow: pressed ? `0 0 12px ${def.glow}` : "none",
          transition: "box-shadow 150ms ease",
        }}>
          {def.emoji}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", flex: 1 }}>{def.label}</span>
        {pressed && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: 10, color: def.color, fontWeight: 700 }}
          >
            ✓ SENT
          </motion.span>
        )}
      </div>
      <span style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>{def.desc}</span>
    </motion.button>
  );
}

// ─── Worker Card ──────────────────────────────────────────────────────────────

function WorkerCard({ worker }: { worker: Worker }) {
  const s = WORKER_STATUS_MAP[worker.status];
  const isLive = worker.status === "active" || worker.status === "busy";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: "var(--surface)",
        border: `1px solid ${isLive ? worker.agentColor + "30" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "16px",
        transition: "border-color 200ms ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isLive && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${worker.agentColor}, transparent)`,
          animation: "fadeInUp 2s ease infinite alternate",
          opacity: 0.6,
        }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: worker.agentColor + "18",
          border: `1px solid ${worker.agentColor}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
          boxShadow: isLive ? `0 0 10px ${worker.agentColor}25` : "none",
        }}>
          {worker.agentEmoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
              {worker.name}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.5px",
              padding: "1px 6px", borderRadius: 99,
              color: s.color, background: s.bg,
              display: "flex", alignItems: "center", gap: 3,
            }}>
              {isLive && <Pulse color={s.color} size={5} />}
              {s.label}
            </span>
          </div>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: worker.agentColor, marginTop: 1 }}>
            {worker.agent}
          </div>
        </div>
      </div>

      {/* Task */}
      <div style={{
        background: "var(--bg-2)", borderRadius: "var(--radius-xs)",
        padding: "7px 10px", marginBottom: 10,
        fontSize: 11, color: "var(--text-2)", lineHeight: 1.4,
      }}>
        {worker.task}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>progress</span>
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--text-2)" }}>{worker.progress}%</span>
        </div>
        <ProgressBar value={worker.progress} color={worker.agentColor} />
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
        {[
          { label: "CPU",    value: `${worker.cpu}%`,              color: worker.cpu > 75 ? "#f43f5e" : "var(--text-2)" },
          { label: "MEM",    value: `${worker.memory}%`,           color: worker.memory > 70 ? "#f59e0b" : "var(--text-2)" },
          { label: "UP",     value: fmt(worker.uptime),            color: "var(--text-2)" },
          { label: "DONE",   value: String(worker.tasksCompleted), color: "var(--green)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: Task }) {
  const s = TASK_STATUS_MAP[task.status];
  const p = PRIORITY_MAP[task.priority];
  const isLive = task.status === "running" || task.status === "retrying";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10, height: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 12px",
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: "var(--radius-sm)",
        marginBottom: 5,
      }}
    >
      {isLive && <Pulse color={s.color} size={6} />}
      {!isLive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0, display: "inline-block" }} />}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {task.name}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--text-3)" }}>{task.project}</span>
          {task.worker && <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--text-3)" }}>→ {task.worker}</span>}
          {task.deps > 0 && <span style={{ fontSize: 10, color: "var(--text-3)" }}>⛓ {task.deps} deps</span>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.4px", color: s.color, background: s.bg, padding: "1px 6px", borderRadius: 99 }}>
          {s.label}
        </span>
        <span style={{ fontSize: 9, color: p.color, fontWeight: 700, letterSpacing: "0.4px" }}>{p.label}</span>
      </div>
    </motion.div>
  );
}

// ─── Metric Widget ────────────────────────────────────────────────────────────

function MetricWidget({ icon, label, value, sub, color, trend }: {
  icon: string; label: string; value: string | number; sub: string; color: string; trend?: number;
}) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: color + "15", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14,
        }}>
          {icon}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.6px", color: "var(--text)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{sub}</span>
        {trend !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? "#34d399" : "#f43f5e" }}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Activity log line ────────────────────────────────────────────────────────

interface LogLine { id: string; time: string; type: "action" | "info" | "warn" | "success" | "error"; msg: string; }

const LOG_POOL = [
  { type: "info"    as const, msg: "Worker pool health check passed" },
  { type: "success" as const, msg: "Task completed: Generate Prisma schema" },
  { type: "info"    as const, msg: "NVIDIA API handshake confirmed — latency 210ms" },
  { type: "warn"    as const, msg: "Queue depth > 20 — consider scaling workers" },
  { type: "success" as const, msg: "auto_build pipeline completed successfully" },
  { type: "info"    as const, msg: "factory_cycle iteration 14 started" },
  { type: "error"   as const, msg: "worker-3 task timeout — requeueing" },
  { type: "success" as const, msg: "Validation suite: 38 checks passed" },
  { type: "info"    as const, msg: "roadmap_generation agent invoked (NVIDIA)" },
  { type: "warn"    as const, msg: "worker-2 memory usage 74% — monitoring" },
];

const LOG_COLORS: Record<LogLine["type"], string> = {
  action:  "#a78bfa",
  info:    "#8b97b2",
  warn:    "#f59e0b",
  success: "#34d399",
  error:   "#f43f5e",
};

let _logId = 0;
function mkLog(): LogLine {
  const l = pick(LOG_POOL);
  return {
    id: String(++_logId),
    time: new Date().toLocaleTimeString("en-CA", { hour12: false }),
    type: l.type,
    msg: l.msg,
  };
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function FactoryPage() {
  const [factoryState, setFactoryState] = useState<FactoryState>("running");
  const [workers,      setWorkers]      = useState<Worker[]>(() => ["1","2","3","4"].map(mkWorker));
  const [tasks,        setTasks]        = useState<Task[]>(() => Array.from({ length: 12 }, () => mkTask()));
  const [logs,         setLogs]         = useState<LogLine[]>(() => Array.from({ length: 6 }, mkLog));
  const [feedback,     setFeedback]     = useState<ActionFeedback | null>(null);
  const [metrics,      setMetrics]      = useState({ throughput: 14, tasksMin: 3.2, buildsToday: 7, validations: 22, retries: 4, successRate: 94.7 });

  const logEnd = useRef<HTMLDivElement>(null);

  // Live simulation
  useEffect(() => {
    if (factoryState !== "running") return;

    const t = setInterval(() => {
      // Update workers
      setWorkers((prev) => prev.map((w) => {
        const newProg = w.status === "idle" ? 0 : Math.min(100, w.progress + rand(2, 8));
        const done    = newProg >= 98;
        return {
          ...w,
          progress:       done ? rand(5, 25) : newProg,
          cpu:            Math.max(5, Math.min(95, w.cpu + rand(-8, 8))),
          memory:         Math.max(10, Math.min(85, w.memory + rand(-4, 5))),
          uptime:         w.uptime + 3,
          status:         done ? (pick(["active", "busy", "idle"]) as WorkerStatus) : w.status,
          task:           done ? pick(TASK_NAMES) : w.task,
          tasksCompleted: done ? w.tasksCompleted + 1 : w.tasksCompleted,
        };
      }));

      // Advance tasks
      setTasks((prev) => {
        let next = prev.map((t) => {
          if (t.status === "queued" && Math.random() < 0.15) return { ...t, status: "running" as TaskStatus };
          if (t.status === "running" && Math.random() < 0.12) return { ...t, status: Math.random() < 0.85 ? "completed" as TaskStatus : "failed" as TaskStatus };
          return t;
        });
        // Keep max 18, add new queued task
        if (next.length < 18 && Math.random() < 0.4) next = [...next, mkTask("queued")];
        if (next.filter(t => t.status === "completed").length > 6) {
          const i = next.findIndex(t => t.status === "completed");
          if (i !== -1) next.splice(i, 1);
        }
        return next;
      });

      // Rolling log
      if (Math.random() < 0.6) {
        setLogs((prev) => [...prev.slice(-30), mkLog()]);
      }

      // Metrics drift
      setMetrics((m) => ({
        throughput:  Math.max(5,  m.throughput  + rand(-1, 2)),
        tasksMin:    Math.max(0.5, parseFloat((m.tasksMin + (Math.random() - 0.5) * 0.4).toFixed(1))),
        buildsToday: m.buildsToday + (Math.random() < 0.03 ? 1 : 0),
        validations: m.validations + (Math.random() < 0.08 ? 1 : 0),
        retries:     m.retries     + (Math.random() < 0.04 ? 1 : 0),
        successRate: Math.max(80, Math.min(99, parseFloat((m.successRate + (Math.random() - 0.45) * 0.2).toFixed(1)))),
      }));
    }, 2_400);

    return () => clearInterval(t);
  }, [factoryState]);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const handleAction = async (id: string) => {
    const def = ACTIONS.find((a) => a.id === id)!;
    const fb: ActionFeedback = { id: uid(), action: def.label, status: "running", message: `Sending ${def.label} to ${def.endpoint}…` };
    setFeedback(fb);

    if (id === "start")   setFactoryState("running");
    if (id === "pause")   setFactoryState("paused");
    if (id === "resume")  setFactoryState("running");
    if (id === "stop")    setFactoryState("stopping");
    if (id === "retry") {
      setTasks((prev) => prev.map((t) => t.status === "failed" ? { ...t, status: "retrying" as TaskStatus, attempts: t.attempts + 1 } : t));
    }

    setLogs((prev) => [...prev, { id: uid(), time: new Date().toLocaleTimeString("en-CA", { hour12: false }), type: "action", msg: `→ ${def.label} dispatched (${def.endpoint})` }]);

    try {
      const res = await fetch(def.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await res.json()) as BridgeResponse;
      const nextStatus: ActionFeedback["status"] = res.ok && payload.ok ? "success" : "error";
      const modeLabel = payload.mode === "mock" ? "mock mode · " : "";
      const message = payload.message ?? (nextStatus === "success" ? `${def.label} acknowledged.` : `${def.label} failed.`);

      setFeedback({ ...fb, status: nextStatus, message: `${modeLabel}${message}` });
      setLogs((prev) => [...prev, {
        id: uid(),
        time: new Date().toLocaleTimeString("en-CA", { hour12: false }),
        type: nextStatus === "success" ? "success" : "error",
        msg: `${nextStatus === "success" ? "✓" : "!"} ${def.label}: ${message}${payload.command ? ` · ${payload.command}` : ""}`,
      }]);
    } catch (error) {
      const message = `Bridge request failed: ${error instanceof Error ? error.message : String(error)}`;
      setFeedback({ ...fb, status: "error", message });
      setLogs((prev) => [...prev, { id: uid(), time: new Date().toLocaleTimeString("en-CA", { hour12: false }), type: "error", msg: message }]);
    } finally {
      setTimeout(() => setFeedback(null), 3_500);
      if (id === "stop") setTimeout(() => setFactoryState("idle"), 1_000);
    }
  };

  const fs = FACTORY_COLORS[factoryState];
  const activeWorkers    = workers.filter((w) => w.status === "active" || w.status === "busy").length;
  const runningTasks     = tasks.filter((t) => t.status === "running").length;
  const queuedTasks      = tasks.filter((t) => t.status === "queued").length;
  const failedTasks      = tasks.filter((t) => t.status === "failed").length;
  const isLive           = factoryState === "running";

  return (
    <main style={{ padding: "0 0 80px" }}>

      {/* ── TOP HEADER BAR ── */}
      <div style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "16px 32px",
        position: "sticky", top: 0, zIndex: 20,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          {/* Title + state */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #a78bfa)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, boxShadow: "0 0 16px rgba(99,102,241,0.35)",
            }}>
              🏭
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px", color: "var(--text)" }}>
                  Factory Control Center
                </span>
                <span style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
                  color: fs.color, background: fs.bg,
                  padding: "2px 10px", borderRadius: 99,
                }}>
                  {isLive && <Pulse color={fs.color} size={5} />}
                  {fs.label}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                NVIDIA API · factory_cycle · auto_build · validation
              </div>
            </div>
          </div>

          {/* Live metrics strip */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Workers",  value: `${activeWorkers}/${workers.length}`, color: "#34d399" },
              { label: "Running",  value: runningTasks,                          color: "#38bdf8" },
              { label: "Queued",   value: queuedTasks,                           color: "#f59e0b" },
              { label: "Failed",   value: failedTasks,                           color: failedTasks > 0 ? "#f43f5e" : "var(--text-3)" },
              { label: "Rate",     value: `${metrics.successRate}%`,             color: "#34d399" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                background: "var(--bg-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", padding: "6px 14px",
                minWidth: 58,
              }}>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
                <span style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 300px", gap: 0, minHeight: "calc(100vh - 70px)" }}>

        {/* ─ LEFT: ACTIONS ─ */}
        <div style={{ borderRight: "1px solid var(--border)", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 4 }}>
            FACTORY ACTIONS
          </div>
          {ACTIONS.map((def) => (
            <ActionBtn key={def.id} def={def} onAction={handleAction} />
          ))}

          {/* Feedback toast */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: feedback.status === "success" ? "rgba(16,185,129,0.12)" : feedback.status === "error" ? "rgba(244,63,94,0.12)" : "var(--surface-2)",
                  border: `1px solid ${feedback.status === "success" ? "rgba(16,185,129,0.3)" : feedback.status === "error" ? "rgba(244,63,94,0.3)" : "var(--border)"}`,
                  fontSize: 11, color: "var(--text-2)", lineHeight: 1.5,
                }}
              >
                {feedback.status === "running" && (
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-block", marginRight: 6 }}>⚙</motion.span>
                )}
                {feedback.status === "success" && <span style={{ marginRight: 6 }}>✓</span>}
                {feedback.message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─ CENTER: WORKERS + METRICS + LOG ─ */}
        <div style={{ padding: "20px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Workers grid */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
                ⬡ Live Workers
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--text-3)" }}>
                {activeWorkers} active
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              <AnimatePresence>
                {workers.map((w) => <WorkerCard key={w.id} worker={w} />)}
              </AnimatePresence>
            </div>
          </div>

          {/* System metrics */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
                📊 System Metrics
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 10 }}>
              <MetricWidget icon="⚡" label="Throughput"   value={metrics.throughput}              sub="tasks/hour"   color="#6366f1" trend={4}    />
              <MetricWidget icon="🔄" label="Tasks/min"    value={metrics.tasksMin}                sub="avg rate"     color="#38bdf8" trend={2}    />
              <MetricWidget icon="🔨" label="Builds Today" value={metrics.buildsToday}             sub="auto_build"   color="#a78bfa" trend={12}   />
              <MetricWidget icon="✓"  label="Validations"  value={metrics.validations}             sub="this session" color="#34d399" trend={7}    />
              <MetricWidget icon="↻"  label="Retries"      value={metrics.retries}                 sub="total"        color="#f59e0b" trend={-3}   />
              <MetricWidget icon="📈" label="Success Rate" value={`${metrics.successRate}%`}       sub="all tasks"    color="#34d399" trend={1}    />
            </div>
          </div>

          {/* Activity log */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
                ⬛ Activity Log
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            <div style={{
              background: "#03040a", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", padding: "12px 14px",
              maxHeight: 200, overflowY: "auto",
              display: "flex", flexDirection: "column", gap: 3,
            }}>
              <AnimatePresence initial={false}>
                {logs.slice(-25).map((l) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: "flex", gap: 10, fontFamily: "ui-monospace, monospace", fontSize: 11 }}
                  >
                    <span style={{ color: "var(--text-3)", flexShrink: 0 }}>{l.time}</span>
                    <span style={{ color: LOG_COLORS[l.type], fontWeight: 600, flexShrink: 0, width: 50, textTransform: "uppercase", fontSize: 10 }}>{l.type}</span>
                    <span style={{ color: "#8b97b2" }}>{l.msg}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={logEnd} />
            </div>
          </div>
        </div>

        {/* ─ RIGHT: TASK QUEUE ─ */}
        <div style={{ borderLeft: "1px solid var(--border)", padding: "20px 16px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
              Task Queue
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#f59e0b",
              background: "rgba(245,158,11,0.12)", padding: "1px 7px", borderRadius: 99,
            }}>
              {queuedTasks + runningTasks}
            </span>
          </div>

          {/* Tabs summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
            {[
              { label: "Running",   count: runningTasks, color: "#34d399" },
              { label: "Queued",    count: queuedTasks,  color: "#f59e0b" },
              { label: "Failed",    count: failedTasks,  color: "#f43f5e" },
              { label: "Done",      count: tasks.filter(t => t.status === "completed").length, color: "#38bdf8" },
            ].map(({ label, count, color }) => (
              <div key={label} style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", padding: "8px 10px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{count}</span>
                <span style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Task list ordered by status priority */}
          <AnimatePresence initial={false}>
            {[...tasks]
              .sort((a, b) => {
                const order: Record<TaskStatus, number> = { running: 0, retrying: 1, failed: 2, queued: 3, completed: 4 };
                return order[a.status] - order[b.status];
              })
              .map((t) => <TaskRow key={t.id} task={t} />)
            }
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
