"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BackendStatusBar } from "@/components/BackendStatusBar";

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentStatus = "running" | "validating" | "waiting" | "completed" | "error";
type ActionType = "generate" | "validate" | "deploy" | "review" | "build" | "test";

interface AgentActivity {
  id: string;
  agent: string;
  agentColor: string;
  agentEmoji: string;
  task: string;
  status: AgentStatus;
  progress: number;
  duration: number;
  project: string;
  branch: string;
  worker: string;
  actionType: ActionType;
  filesModified: string[];
  reasoning: string;
  commits: { sha: string; msg: string }[];
}

interface LogLine {
  id: string;
  time: string;
  level: "info" | "success" | "warn" | "debug";
  message: string;
}

// ─── Data pools ───────────────────────────────────────────────────────────────

const AGENTS = [
  { name: "frontend_agent",  emoji: "🎨", color: "#818cf8" },
  { name: "backend_agent",   emoji: "⚙️",  color: "#34d399" },
  { name: "qa_agent",        emoji: "🔬", color: "#fb923c" },
  { name: "devops_agent",    emoji: "🚀", color: "#38bdf8" },
  { name: "content_agent",   emoji: "✍️",  color: "#f472b6" },
  { name: "architect_agent", emoji: "🏗️", color: "#a78bfa" },
];

const TASKS = [
  "generating live dashboard UI",
  "validating API routes integrity",
  "creating Prisma schema migration",
  "running deployment checks",
  "optimizing React component tree",
  "generating TypeScript interfaces",
  "writing integration test suite",
  "reviewing pull request diff",
  "building production bundle",
  "analyzing performance metrics",
  "scaffolding new feature module",
  "resolving dependency conflicts",
];

const PROJECTS   = ["ai-company-os", "control-center", "newsroom-engine", "crm-module", "analytics"];
const BRANCHES   = ["feat/live-ops", "main", "feat/agent-v2", "fix/realtime", "feat/dashboard"];
const WORKERS    = ["worker-1", "worker-2", "worker-3", "worker-gpu"];

const REASONING = [
  "Analyzing component hierarchy to ensure optimal re-render boundaries. Identified 3 memoization opportunities that will reduce unnecessary renders by ~40%.",
  "Cross-referencing API schema with Prisma models. Found type mismatch in User.createdAt — applying coercion fix before route generation.",
  "Running static analysis on modified files. Coverage at 87%. Generating edge-case tests for null-state handling and concurrent mutations.",
  "Evaluating deployment readiness. All health checks passing. Rolling to staging with canary config (10% traffic split).",
  "Parsing Git diff for semantic understanding. Detected breaking change in public API surface — flagging for human review.",
  "Resolving circular dependency between auth middleware and session store. Applying lazy initialization to break the cycle safely.",
];

const COMMIT_MSGS = [
  "feat: add realtime agent status websocket",
  "fix: resolve null state in activity feed",
  "chore: update Prisma schema for agent logs",
  "feat: inspector panel with streaming output",
  "fix: race condition in task queue flush",
  "feat: add GPU worker auto-scaling",
];

const FILES = [
  "src/app/operations/live/page.tsx",
  "src/components/AgentCard.tsx",
  "prisma/schema.prisma",
  "src/api/agents/route.ts",
  "src/lib/orchestrator.ts",
  "tests/integration/agents.test.ts",
  "src/hooks/useRealtime.ts",
  "docker-compose.yml",
  "src/workers/gpu-worker.ts",
];

const LOG_POOL: { level: LogLine["level"]; message: string }[] = [
  { level: "info",    message: "Initializing worker thread pool (4 cores)" },
  { level: "success", message: "Agent handshake confirmed — ready to receive tasks" },
  { level: "debug",   message: "Context window: 128k tokens | Used: 12.4k" },
  { level: "info",    message: "Reading filesystem snapshot for project root" },
  { level: "success", message: "Generated 847 lines of TypeScript — passing tsc strict" },
  { level: "warn",    message: "Rate limit approaching — throttling requests (92%)" },
  { level: "info",    message: "Task dependency resolved — unblocking downstream agent" },
  { level: "success", message: "Unit tests: 142 passed, 0 failed" },
  { level: "debug",   message: "Vector embedding similarity: 0.94 (context match)" },
  { level: "info",    message: "Committing changes to branch feat/live-ops" },
  { level: "success", message: "Build artifact validated — checksum OK" },
  { level: "warn",    message: "Memory usage high on worker-gpu: 78%" },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

let _id = 0;
const uid = () => `${++_id}-${Math.random().toString(36).slice(2, 6)}`;
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(s: number) { return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; }

function mkActivity(): AgentActivity {
  const a = pick(AGENTS);
  return {
    id: uid(),
    agent: a.name,
    agentColor: a.color,
    agentEmoji: a.emoji,
    task: pick(TASKS),
    status: pick(["running", "running", "running", "validating", "waiting"] as AgentStatus[]),
    progress: Math.floor(Math.random() * 80) + 5,
    duration: Math.floor(Math.random() * 200) + 5,
    project: pick(PROJECTS),
    branch: pick(BRANCHES),
    worker: pick(WORKERS),
    actionType: pick(["generate","validate","deploy","review","build","test"] as ActionType[]),
    filesModified: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () => pick(FILES)),
    reasoning: pick(REASONING),
    commits: Array.from({ length: Math.floor(Math.random() * 2) + 1 }, () => ({
      sha: Math.random().toString(16).slice(2, 9),
      msg: pick(COMMIT_MSGS),
    })),
  };
}

function mkLog(): LogLine {
  const l = pick(LOG_POOL);
  return { id: uid(), time: new Date().toLocaleTimeString("en-CA", { hour12: false }), ...l };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  running:    { label: "RUNNING",    color: "#34d399", bg: "rgba(16,185,129,0.12)" },
  validating: { label: "VALIDATING", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  waiting:    { label: "WAITING",    color: "#8b97b2", bg: "rgba(139,151,178,0.1)" },
  completed:  { label: "DONE",       color: "#38bdf8", bg: "rgba(59,130,246,0.12)" },
  error:      { label: "ERROR",      color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
};

const ACTION_MAP: Record<ActionType, { label: string; color: string; bg: string }> = {
  generate: { label: "GENERATE", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  validate: { label: "VALIDATE", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  deploy:   { label: "DEPLOY",   color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
  review:   { label: "REVIEW",   color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  build:    { label: "BUILD",    color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  test:     { label: "TEST",     color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
};

// ─── SVG Icons (inline, no import needed for trivial shapes) ──────────────────

const IconBrain = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5M2 9.5a2.5 2.5 0 0 1 0 5H3.5M2 14.5a2.5 2.5 0 0 0 0 5H3.5M22 9.5a2.5 2.5 0 0 0 0 5H20.5M22 14.5a2.5 2.5 0 0 1 0 5H20.5M9.5 22a2.5 2.5 0 0 0 5 0v-1.5"/>
    <ellipse cx="12" cy="12" rx="4" ry="5"/>
  </svg>
);

const IconFile = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
  </svg>
);

const IconGit = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 009 9"/>
  </svg>
);

const IconTerminal = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/>
  </svg>
);

const IconActivity = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
  </svg>
);

const IconCheck = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

// ─── Activity Card ─────────────────────────────────────────────────────────────

function ActivityCard({
  item,
  selected,
  onSelect,
}: {
  item: AgentActivity;
  selected: boolean;
  onSelect: () => void;
}) {
  const [elapsed, setElapsed] = useState(item.duration);
  const isLive = item.status === "running" || item.status === "validating";
  const status = STATUS_MAP[item.status];
  const action = ACTION_MAP[item.actionType];

  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [isLive]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, y: 6 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      onClick={onSelect}
      style={{
        background: selected ? "var(--surface-2)" : "var(--surface)",
        border: `1px solid ${selected ? item.agentColor + "40" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "16px 18px",
        cursor: "pointer",
        transition: "border-color 140ms ease, background 140ms ease",
        position: "relative",
        overflow: "hidden",
        boxShadow: selected ? `0 0 0 1px ${item.agentColor}20, 0 8px 32px rgba(0,0,0,0.4)` : "none",
      }}
    >
      {/* Glow accent when selected */}
      {selected && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse at top left, ${item.agentColor}10 0%, transparent 65%)`,
        }} />
      )}

      <div style={{ position: "relative", display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17,
          background: item.agentColor + "18",
          border: `1px solid ${item.agentColor}30`,
          boxShadow: `0 0 12px ${item.agentColor}18`,
        }}>
          {item.agentEmoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: name + badges + time */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 700, color: item.agentColor }}>
              {item.agent}
            </span>
            {/* Action badge */}
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.6px",
              padding: "1px 7px", borderRadius: 4,
              color: action.color, background: action.bg,
            }}>
              {action.label}
            </span>
            {/* Status badge */}
            <span style={{
              fontSize: 10, fontWeight: 600,
              padding: "1px 7px", borderRadius: 99,
              color: status.color, background: status.bg,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {isLive && (
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: status.color,
                  display: "inline-block",
                  animation: "pulse-ring 2s ease infinite",
                }} />
              )}
              {status.label}
            </span>
            <span style={{ marginLeft: "auto", fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--text-3)" }}>
              {fmt(elapsed)}
            </span>
          </div>

          {/* Task */}
          <p style={{ marginTop: 5, fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.35 }}>
            {item.task}
          </p>

          {/* Meta */}
          <div style={{ marginTop: 7, display: "flex", gap: 14, flexWrap: "wrap" }}>
            {[
              { icon: "📁", val: item.project },
              { icon: "⎇", val: item.branch },
              { icon: "⬡", val: item.worker },
            ].map(({ icon, val }) => (
              <span key={val} style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--text-3)" }}>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{icon}</span>{val}
              </span>
            ))}
          </div>

          {/* Progress */}
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 3, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.progress}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{
                  height: "100%", borderRadius: 99,
                  background: `linear-gradient(90deg, ${item.agentColor}88, ${item.agentColor})`,
                }}
              />
            </div>
            <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--text-3)" }}>progress</span>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--text-2)" }}>{item.progress}%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Inspector Panel ──────────────────────────────────────────────────────────

function Inspector({ item, logs }: { item: AgentActivity | null; logs: LogLine[] }) {
  const logEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const LOG_COLORS: Record<LogLine["level"], string> = {
    info:    "#38bdf8",
    success: "#34d399",
    warn:    "#f59e0b",
    debug:   "var(--text-3)",
  };

  if (!item) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, textAlign: "center" }}>
        <div style={{ fontSize: 32, opacity: 0.3 }}>🔬</div>
        <p style={{ color: "var(--text-3)", fontSize: 13 }}>Select an agent to inspect</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{item.agentEmoji}</span>
        <div>
          <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 700, color: item.agentColor }}>{item.agent}</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{item.task}</p>
        </div>
      </div>

      {/* Reasoning */}
      <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--text-3)", fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 600, letterSpacing: "0.6px" }}>
          <IconBrain />
          AI REASONING
        </div>
        <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65 }}>{item.reasoning}</p>
      </div>

      {/* Stats 2×2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "STATUS",   value: item.status.toUpperCase() },
          { label: "PROGRESS", value: `${item.progress}%` },
          { label: "BRANCH",   value: item.branch },
          { label: "WORKER",   value: item.worker },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
            <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.6px", textTransform: "uppercase" }}>{label}</p>
            <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, fontWeight: 700, color: "var(--text)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Files modified */}
      <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--text-3)", fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 600, letterSpacing: "0.6px" }}>
          <IconFile />
          FILES MODIFIED
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {item.filesModified.map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.03)", borderRadius: 5, padding: "4px 8px" }}>
              <span style={{ color: "#a78bfa", flexShrink: 0 }}><IconFile /></span>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Commits */}
      {item.commits.length > 0 && (
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--text-3)", fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 600, letterSpacing: "0.6px" }}>
            <IconGit />
            COMMITS GENERATED
          </div>
          {item.commits.map((c) => (
            <div key={c.sha} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "var(--accent-light)", fontFamily: "ui-monospace, monospace", fontSize: 11, flexShrink: 0 }}>{c.sha}</span>
              <span style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.4 }}>{c.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Live logs */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#03040a", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-3)", fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 600, letterSpacing: "0.6px" }}>
          <IconTerminal />
          LIVE OUTPUT
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
          <AnimatePresence initial={false}>
            {logs.slice(-24).map((l) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18 }}
                style={{ display: "flex", gap: 8, fontFamily: "ui-monospace, monospace", fontSize: 11 }}
              >
                <span style={{ color: "var(--text-3)", flexShrink: 0 }}>{l.time}</span>
                <span style={{ color: LOG_COLORS[l.level], fontWeight: 600, flexShrink: 0, width: 56 }}>{l.level.toUpperCase()}</span>
                <span style={{ color: "#8b97b2" }}>{l.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={logEnd} />
        </div>
        {/* Streaming cursor */}
        <div style={{ padding: "6px 12px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--text-3)" }}>▶</span>
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 0.9 }}
            style={{ display: "inline-block", width: 2, height: 13, background: "#34d399", borderRadius: 1 }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Metrics bar ──────────────────────────────────────────────────────────────

function MetricsBar({ activeCount }: { activeCount: number }) {
  const [tasks, setTasks]   = useState(1_247);
  const [tokens, setTokens] = useState(4_821_903);

  useEffect(() => {
    const t = setInterval(() => {
      setTasks((c)  => c + Math.floor(Math.random() * 3));
      setTokens((c) => c + Math.floor(Math.random() * 600));
    }, 2_000);
    return () => clearInterval(t);
  }, []);

  const items = [
    { icon: "🤖", label: "Active Agents",    value: String(activeCount),                        sub: "orchestrating",     accent: true },
    { icon: "✅", label: "Tasks Completed",   value: tasks.toLocaleString(),                     sub: "this session" },
    { icon: "⚡", label: "Tokens Consumed",   value: `${(tokens / 1_000_000).toFixed(2)}M`,     sub: "context used" },
    { icon: "📊", label: "Success Rate",      value: "94.7%",                                    sub: "all agents" },
    { icon: "⏱",  label: "Avg Task Time",     value: "2m 14s",                                   sub: "per cycle" },
  ];

  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
      {items.map(({ icon, label, value, sub, accent }) => (
        <div key={label} style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 12,
          background: accent ? "var(--accent-dim)" : "var(--surface)",
          border: `1px solid ${accent ? "var(--accent-glow)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          padding: "12px 18px",
          boxShadow: accent ? "0 0 20px var(--accent-dim)" : "none",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>
            {icon}
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px", color: accent ? "var(--accent-light)" : "var(--text)", lineHeight: 1.1 }}>{value}</p>
            <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LiveOpsPage() {
  const [activities, setActivities] = useState<AgentActivity[]>(() =>
    Array.from({ length: 5 }, mkActivity)
  );
  const [logs, setLogs]             = useState<LogLine[]>(() => Array.from({ length: 10 }, mkLog));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Live simulation
  useEffect(() => {
    const t = setInterval(() => {
      setActivities((prev) => {
        let next = prev.map((a) => {
          if (a.status !== "running" && a.status !== "validating") return a;
          const prog = Math.min(100, a.progress + Math.floor(Math.random() * 7));
          return { ...a, progress: prog, status: (prog >= 100 ? "completed" : a.status) as AgentStatus, duration: a.duration + 2 };
        });

        // Spawn new agent
        if (Math.random() < 0.35 && next.length < 8) {
          next = [mkActivity(), ...next];
        }

        // Retire first completed if too many
        if (next.filter(a => a.status === "completed").length > 2 || next.length > 8) {
          const i = next.findIndex(a => a.status === "completed");
          if (i !== -1) next.splice(i, 1);
        }

        return next;
      });
      setLogs((prev) => [...prev.slice(-50), mkLog()]);
    }, 2_200);
    return () => clearInterval(t);
  }, []);

  const selected = activities.find((a) => a.id === selectedId) ?? activities[0] ?? null;
  const activeCount = activities.filter((a) => a.status === "running" || a.status === "validating").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

      {/* ── Top bar ── */}
      <header style={{
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
        height: 54,
        borderBottom: "1px solid var(--border)",
        background: "rgba(7,8,15,0.9)",
        backdropFilter: "blur(12px)",
        gap: 12,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>
            Live Operations Center
          </span>
          {/* LIVE badge */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 10, fontWeight: 700,
            color: "var(--green)", background: "var(--green-dim)",
            padding: "2px 9px", borderRadius: 99,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse-ring 2s ease infinite" }} />
            LIVE
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
            fontSize: 12, color: "var(--text-2)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", animation: "pulse-ring 2s ease infinite" }} />
            {activeCount} agent{activeCount !== 1 ? "s" : ""} active
          </span>
          <span style={{
            padding: "5px 12px",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
            fontFamily: "ui-monospace, monospace", fontSize: 12, color: "var(--text-3)",
          }}>
            {new Date().toLocaleTimeString("en-CA", { hour12: false })}
          </span>
        </div>
      </header>

      {/* ── Body: feed + inspector ── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

        {/* ── Center: activity feed ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 24px 48px" }}>

          {/* Backend status */}
          <div style={{ marginBottom: 16 }}>
            <BackendStatusBar />
          </div>

          {/* Metrics */}
          <MetricsBar activeCount={activeCount} />

          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "22px 0 12px" }}>
            <IconActivity />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
              Agent Activity Feed
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 4 }} />
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--text-3)" }}>
              {activities.length} streams
            </span>
          </div>

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <AnimatePresence initial={false} mode="popLayout">
              {activities.map((a) => (
                <ActivityCard
                  key={a.id}
                  item={a}
                  selected={selected?.id === a.id}
                  onSelect={() => setSelectedId(a.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Commits timeline */}
          <div style={{ margin: "28px 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <IconGit />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
              Recent Commits
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 4 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { sha: "a3f9c2e", msg: "feat: add realtime agent status websocket", agent: "backend_agent",  ago: "42s" },
              { sha: "7d81b4a", msg: "fix: resolve null state in activity feed",   agent: "qa_agent",       ago: "2m" },
              { sha: "2e45f9c", msg: "chore: update Prisma schema for agent logs", agent: "backend_agent",  ago: "4m" },
              { sha: "9c3a17f", msg: "feat: inspector panel with streaming output", agent: "frontend_agent", ago: "7m" },
            ].map(({ sha, msg, agent, ago }) => (
              <div key={sha} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", padding: "10px 14px",
              }}>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--accent-light)", flexShrink: 0 }}>{sha}</span>
                <span style={{ fontSize: 12, color: "var(--text-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg}</span>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--text-3)", flexShrink: 0 }}>{agent}</span>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--text-3)", flexShrink: 0 }}>{ago}</span>
                <span style={{ color: "#34d399", flexShrink: 0 }}><IconCheck /></span>
              </div>
            ))}
          </div>
        </main>

        {/* ── Right: Inspector ── */}
        <aside style={{
          width: 320, flexShrink: 0,
          borderLeft: "1px solid var(--border)",
          background: "var(--bg-2)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 16px 10px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
          }}>
            <span style={{ fontSize: 12 }}>🔬</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
              AI Inspector
            </span>
            <span style={{
              marginLeft: "auto",
              fontSize: 10, fontWeight: 700,
              color: "#f59e0b", background: "rgba(245,158,11,0.12)",
              padding: "1px 8px", borderRadius: 99,
            }}>
              LIVE
            </span>
          </div>
          <div style={{ flex: 1, overflow: "hidden", padding: "14px 16px" }}>
            <Inspector item={selected} logs={logs} />
          </div>
        </aside>
      </div>

      {/* ── Bottom ticker ── */}
      <motion.div
        initial={{ y: 32 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          flexShrink: 0,
          height: 32, overflow: "hidden",
          borderTop: "1px solid var(--border)",
          background: "rgba(7,8,15,0.95)",
          display: "flex", alignItems: "center", gap: 12,
          paddingLeft: 16,
          zIndex: 10,
        }}
      >
        <span style={{
          flexShrink: 0, fontSize: 10, fontWeight: 700,
          color: "var(--green)", background: "var(--green-dim)",
          padding: "1px 8px", borderRadius: 4,
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse-ring 2s ease infinite" }} />
          LIVE
        </span>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <motion.div
            animate={{ x: [0, -900] }}
            transition={{ repeat: Infinity, duration: 22, ease: "linear" }}
            style={{ display: "flex", gap: 36, whiteSpace: "nowrap", fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--text-3)" }}
          >
            {[
              "frontend_agent → generating dashboard UI",
              "qa_agent → running 142 unit tests",
              "backend_agent → migrating Prisma schema",
              "devops_agent → validating Docker compose",
              "architect_agent → reviewing module dependencies",
              "content_agent → drafting release notes",
              "frontend_agent → optimizing bundle size",
              "qa_agent → validating API contract",
            ].map((item, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--green)", fontSize: 9 }}>▸</span>
                {item}
              </span>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
