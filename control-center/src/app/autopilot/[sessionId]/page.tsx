"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Cpu,
  FileText,
  Layers3,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Rocket,
  RotateCcw,
  Terminal,
  Zap,
} from "lucide-react";

type SessionStatus = "draft" | "running" | "paused" | "completed" | "failed";
type TaskStatus = "queued" | "running" | "completed" | "blocked" | "failed";
type LogLevel = "info" | "success" | "warning" | "error";

interface AutopilotTask {
  id: string;
  title: string;
  description: string;
  phase: string;
  agent: string;
  status: TaskStatus;
  priority: number;
  progress: number;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
}

interface AutopilotLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  agent: string;
  message: string;
  source: string;
}

interface AutopilotAgentAssignment {
  agentId: string;
  role: string;
  status: string;
  provider: string;
}

interface AutopilotRuntime {
  status: string;
  provider: string;
  activeWorkers: number;
  lastEvent: string;
}

interface AutopilotSession {
  sessionId: string;
  projectName: string;
  projectIdea: string;
  productType: string | null;
  template: string | null;
  stack: string | null;
  status: SessionStatus;
  currentPhase: string;
  progress: number;
  assignedAgents: AutopilotAgentAssignment[];
  roadmap: string[];
  tasks: AutopilotTask[];
  logs: AutopilotLog[];
  runtime: AutopilotRuntime;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string; bg: string }> = {
  running:   { label: "RUNNING",   color: "#34d399", bg: "rgba(16,185,129,0.12)" },
  paused:    { label: "PAUSED",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  completed: { label: "COMPLETED", color: "#38bdf8", bg: "rgba(59,130,246,0.12)" },
  failed:    { label: "FAILED",    color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
  draft:     { label: "DRAFT",     color: "#8b97b2", bg: "rgba(139,151,178,0.1)" },
};

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  queued:    { label: "QUEUED",    color: "#8b97b2", bg: "rgba(139,151,178,0.08)" },
  running:   { label: "RUNNING",   color: "#34d399", bg: "rgba(16,185,129,0.10)" },
  completed: { label: "DONE",      color: "#38bdf8", bg: "rgba(59,130,246,0.10)" },
  blocked:   { label: "BLOCKED",   color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  failed:    { label: "FAILED",    color: "#f43f5e", bg: "rgba(244,63,94,0.10)" },
};

const LOG_LEVEL_CONFIG: Record<LogLevel, { color: string; label: string }> = {
  info:    { color: "#38bdf8", label: "INFO" },
  success: { color: "#34d399", label: "OK" },
  warning: { color: "#f59e0b", label: "WARN" },
  error:   { color: "#f43f5e", label: "ERR" },
};

const PHASE_ORDER = ["idea", "planning", "architecture", "frontend", "backend", "validation", "build", "runtime"];

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

const AGENT_COLORS: Record<string, string> = {
  product_agent: "#a78bfa",
  architect_agent: "#f59e0b",
  frontend_agent: "#3b82f6",
  backend_agent: "#22c55e",
  qa_agent: "#ef4444",
  devops_agent: "#6c63ff",
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-CA", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "--:--:--";
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AutopilotSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = (() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [id, setId] = useState("");
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      params.then((p) => setId(p.sessionId));
    }, [params]);
    return { sessionId: id };
  })();

  const router = useRouter();
  const [session, setSession] = useState<AutopilotSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<string>("all");

  const loadSession = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}`, { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; session?: AutopilotSession };
      if (payload.ok && payload.session) {
        setSession(payload.session);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSession();
    const iv = setInterval(() => void loadSession(), 4000);
    return () => clearInterval(iv);
  }, [sessionId]);

  const handleAction = async (action: string) => {
    if (!sessionId) return;
    setActionLoading(action);
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await res.json()) as { ok: boolean; session?: AutopilotSession };
      if (payload.ok && payload.session) {
        setSession(payload.session);
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <main className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          style={{ fontSize: 24 }}
        >
          ⚙️
        </motion.div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page" style={{ textAlign: "center", paddingTop: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🔍</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Session Not Found</h2>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginBottom: 20 }}>This autopilot session does not exist or has been removed.</p>
        <Link href="/autopilot" className="btn" style={{ textDecoration: "none" }}>
          Back to Sessions
        </Link>
      </main>
    );
  }

  const cfg = STATUS_CONFIG[session.status];
  const currentPhaseIndex = PHASE_ORDER.indexOf(session.currentPhase);
  const tasksByPhase = PHASE_ORDER.map((phase) => ({
    phase,
    label: PHASE_LABELS[phase],
    tasks: session.tasks.filter((t) => t.phase === phase),
  }));

  const filteredLogs = session.logs.filter((log) => {
    if (logFilter === "all") return true;
    return log.level === logFilter || log.agent === logFilter;
  });

  return (
    <main className="page" style={{ maxWidth: 1100 }}>
      {/* ── HEADER ── */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/autopilot" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 14 }}>
          &larr; Autopilot Sessions
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: cfg.bg,
            border: `1px solid ${cfg.color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: cfg.color,
            fontSize: 20,
          }}>
            <Rocket size={22} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.4px", color: "var(--text)", margin: 0 }}>
                {session.projectName}
              </h1>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.5px",
                padding: "3px 10px", borderRadius: 99,
                color: cfg.color, background: cfg.bg,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {cfg.label}
              </span>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--text-3)" }}>
                {session.sessionId.slice(0, 16)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                Phase: <strong style={{ color: "var(--text)" }}>{PHASE_LABELS[session.currentPhase] ?? session.currentPhase}</strong>
              </span>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                Progress: <strong style={{ color: cfg.color }}>{session.progress}%</strong>
              </span>
            </div>
          </div>

          {/* Progress ring */}
          <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
            <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={28} cy={28} r={24} fill="none" stroke="var(--border)" strokeWidth={4} />
              <circle
                cx={28} cy={28} r={24} fill="none" stroke={cfg.color}
                strokeWidth={4} strokeLinecap="round"
                strokeDasharray={`${(session.progress / 100) * 150.8} 150.8`}
              />
            </svg>
            <span style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, color: cfg.color,
            }}>
              {session.progress}%
            </span>
          </div>
        </div>
      </div>

      {/* ── CONTROL BUTTONS ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { id: "continue", label: "Continue", icon: <Play size={14} />, color: "#34d399", disabled: session.status !== "paused" && session.status !== "running" },
          { id: "pause",    label: "Pause",    icon: <Pause size={14} />, color: "#f59e0b", disabled: session.status !== "running" },
          { id: "retry",    label: "Retry Failed", icon: <RotateCcw size={14} />, color: "#a78bfa", disabled: !session.tasks.some((t) => t.status === "failed" || t.status === "blocked") },
        ].map(({ id, label, icon, color, disabled }) => (
          <button
            key={id}
            onClick={() => handleAction(id)}
            disabled={disabled || actionLoading === id}
            style={{
              padding: "8px 16px", borderRadius: "var(--radius-sm)",
              background: disabled ? "var(--surface-2)" : `${color}14`,
              border: `1px solid ${disabled ? "var(--border-2)" : `${color}30`}`,
              color: disabled ? "var(--text-3)" : color,
              fontWeight: 600, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
              opacity: disabled ? 0.5 : 1,
              transition: "all 140ms ease",
            }}
          >
            {actionLoading === id ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-block" }}>⚙</motion.span> : icon}
            {label}
          </button>
        ))}

        <div style={{ width: 1, height: 28, background: "var(--border)", alignSelf: "center" }} />

        {[
          { href: "/operations/live", label: "Live Ops", icon: <Activity size={14} /> },
          { href: "/logs",            label: "Logs",     icon: <FileText size={14} /> },
          { href: "/runtime",         label: "Runtime",  icon: <Cpu size={14} /> },
        ].map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            style={{
              padding: "8px 16px", borderRadius: "var(--radius-sm)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-2)", fontWeight: 600, fontSize: 12,
              textDecoration: "none",
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 140ms ease",
            }}
          >
            {icon} {label}
          </Link>
        ))}

        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => loadSession()}
          style={{ marginLeft: "auto" }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── OVERVIEW ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12 }}>Overview</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {[
            { label: "Idea", value: session.projectIdea },
            { label: "Product Type", value: session.productType ?? "—" },
            { label: "Template", value: session.template ?? "—" },
            { label: "Stack", value: session.stack ?? "—" },
            { label: "Created", value: formatDate(session.createdAt) },
            { label: "Updated", value: formatDate(session.updatedAt) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12 }}>
          <Layers3 size={12} style={{ display: "inline", marginRight: 4 }} /> Roadmap
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {session.roadmap.map((step, i) => {
            const isActive = i <= currentPhaseIndex;
            const color = isActive ? "#6366f1" : "var(--text-3)";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: isActive ? "#6366f1" : "var(--border)",
                    marginTop: 2,
                  }} />
                  {i < session.roadmap.length - 1 && (
                    <div style={{ width: 1, height: 20, background: isActive ? "#6366f1" : "var(--border)", marginTop: 2 }} />
                  )}
                </div>
                <span style={{ fontSize: 13, color, fontWeight: isActive ? 600 : 400, lineHeight: 1.4 }}>
                  {step}
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── PHASE PROGRESS ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Phase Progress</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {PHASE_ORDER.map((phase, i) => {
            const isCurrent = i === currentPhaseIndex;
            const isDone = i < currentPhaseIndex;
            const phaseTasks = session.tasks.filter((t) => t.phase === phase);
            const done = phaseTasks.filter((t) => t.status === "completed").length;
            const total = phaseTasks.length;
            return (
              <div
                key={phase}
                title={`${PHASE_LABELS[phase]}: ${done}/${total}`}
                style={{
                  flex: 1, height: 28, borderRadius: "var(--radius-sm)",
                  background: isDone ? "#6366f1" : isCurrent ? "#6366f140" : "var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: isDone || isCurrent ? "#fff" : "var(--text-3)",
                  letterSpacing: "0.3px",
                  transition: "all 200ms ease",
                }}
              >
                {PHASE_LABELS[phase].split(" ")[0]}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── AGENT TEAM ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
          <Bot size={12} style={{ display: "inline", marginRight: 4 }} /> Agent Team
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {session.assignedAgents.map((agent) => {
            const agentColor = AGENT_COLORS[agent.agentId] ?? "#8b97b2";
            const isDone = agent.status === "done";
            const isActive = agent.status === "active";
            return (
              <div key={agent.agentId} style={{
                background: "var(--bg-2)", border: `1px solid ${agentColor}20`,
                borderRadius: "var(--radius-sm)", padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: isDone ? "#38bdf8" : isActive ? "#34d399" : "var(--text-3)",
                    boxShadow: isActive ? "0 0 8px #34d39960" : "none",
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: agentColor, fontFamily: "ui-monospace, monospace" }}>
                    {agent.agentId}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 4 }}>{agent.role}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                  {agent.provider}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── TASK TIMELINE ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Task Timeline</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {tasksByPhase.filter((p) => p.tasks.length > 0).map(({ phase, label, tasks }) => {
            const phaseActive = phase === session.currentPhase;
            return (
              <div key={phase}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: phaseActive ? "#6366f1" : "var(--text-3)",
                    textTransform: "uppercase", letterSpacing: "0.5px",
                  }}>
                    {label}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontSize: 10, color: "var(--text-3)" }}>
                    {tasks.filter((t) => t.status === "completed").length}/{tasks.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {tasks.map((task) => {
                    const tc = TASK_STATUS_CONFIG[task.status];
                    const ac = AGENT_COLORS[task.agent] ?? "#8b97b2";
                    return (
                      <div key={task.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px",
                        background: tc.bg,
                        borderLeft: `2px solid ${tc.color}`,
                        borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
                      }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          padding: "1px 6px", borderRadius: 4,
                          background: tc.bg, color: tc.color,
                          fontFamily: "ui-monospace, monospace",
                        }}>
                          {tc.label}
                        </span>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                          {task.title}
                        </span>
                        <span style={{ fontSize: 10, color: ac, fontFamily: "ui-monospace, monospace", flexShrink: 0 }}>
                          {task.agent.replace("_agent", "")}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--text-3)", flexShrink: 0 }}>P{task.priority}</span>
                        {task.progress > 0 && task.status === "running" && (
                          <span style={{ fontSize: 10, color: "var(--text-3)" }}>{task.progress}%</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── LIVE LOGS ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            <Radio size={12} style={{ display: "inline", marginRight: 4 }} /> Live Logs
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["all", "info", "success", "warning", "error"].map((f) => (
              <button
                key={f}
                onClick={() => setLogFilter(f)}
                style={{
                  padding: "2px 8px", borderRadius: 4,
                  fontSize: 10, fontWeight: 600, cursor: "pointer",
                  border: "1px solid",
                  borderColor: logFilter === f ? "var(--accent)" : "var(--border)",
                  background: logFilter === f ? "var(--accent-dim)" : "transparent",
                  color: logFilter === f ? "var(--accent-light)" : "var(--text-3)",
                  transition: "all 120ms ease",
                }}
              >
                {f === "all" ? "All" : LOG_LEVEL_CONFIG[f as LogLevel].label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
          <AnimatePresence initial={false}>
            {filteredLogs.slice(0, 30).map((log) => {
              const lc = LOG_LEVEL_CONFIG[log.level];
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "5px 8px", borderRadius: 4,
                    background: "rgba(255,255,255,0.02)",
                    fontFamily: "ui-monospace, monospace", fontSize: 11,
                  }}
                >
                  <span style={{ color: "var(--text-3)", flexShrink: 0, minWidth: 60 }}>{formatTime(log.timestamp)}</span>
                  <span style={{ color: lc.color, fontWeight: 700, flexShrink: 0, width: 32 }}>{lc.label}</span>
                  <span style={{ color: AGENT_COLORS[log.agent] ?? "var(--text-3)", flexShrink: 0, minWidth: 90 }}>{log.agent.replace("_agent", "")}</span>
                  <span style={{ color: "var(--text-2)", flex: 1 }}>{log.message}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredLogs.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>No logs match the filter.</div>
          )}
        </div>
      </section>

      {/* ── RUNTIME HEALTH ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
          <Terminal size={12} style={{ display: "inline", marginRight: 4 }} /> Runtime Health
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {[
            {
              label: "Status",
              value: session.runtime.status === "online" ? "Online" : session.runtime.status === "offline" ? "Offline" : "Unknown",
              color: session.runtime.status === "online" ? "#34d399" : "#f43f5e",
              icon: <Zap size={14} />,
            },
            { label: "Provider", value: session.runtime.provider, color: "#a78bfa", icon: <Cpu size={14} /> },
            { label: "Active Workers", value: String(session.runtime.activeWorkers), color: "#38bdf8", icon: <Bot size={14} /> },
            {
              label: "Last Event",
              value: session.runtime.lastEvent.length > 40 ? session.runtime.lastEvent.slice(0, 40) + "..." : session.runtime.lastEvent,
              color: "var(--text-2)",
              icon: <Radio size={14} />,
            },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{
              background: "var(--bg-2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ color: color, display: "flex" }}>{icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{value}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
