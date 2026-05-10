"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLogStream, type BackendLogEntry } from "@/hooks/useLogStream";
import AutopilotPanel from "@/components/AutopilotPanel";
import AutopilotSessionBanner from "@/components/AutopilotSessionBanner";

type LogLevel = "info" | "success" | "warn" | "error" | "debug" | "nvidia" | "stream";
type LogCategory =
  | "all" | "nvidia" | "orchestration" | "backend" | "frontend"
  | "qa" | "devops" | "build" | "validation" | "errors" | "warnings";

interface LogEntry {
  id: string;
  ts: string;
  epoch: number;
  level: LogLevel;
  category: Exclude<LogCategory, "all" | "errors" | "warnings">;
  agent: string;
  agentColor: string;
  agentEmoji: string;
  title: string;
  message: string;
  model?: string;
  tokens?: number;
  latencyMs?: number;
  taskId?: string;
  taskName?: string;
  files?: string[];
  meta?: Record<string, string | number>;
  streaming?: boolean;
}

const AGENTS = [
  { name: "nvidia_orchestrator", color: "#76b900", emoji: "⚡", category: "nvidia" as const },
  { name: "frontend_agent",      color: "#3b82f6", emoji: "🎨", category: "frontend" as const },
  { name: "backend_agent",       color: "#10b981", emoji: "⚙️", category: "backend" as const },
  { name: "qa_agent",            color: "#ef4444", emoji: "🔬", category: "qa" as const },
  { name: "devops_agent",        color: "#8b5cf6", emoji: "🚀", category: "devops" as const },
  { name: "architect_agent",     color: "#f59e0b", emoji: "🏗️", category: "orchestration" as const },
  { name: "build_runner",        color: "#06b6d4", emoji: "🔧", category: "build" as const },
  { name: "validator",           color: "#a78bfa", emoji: "✅", category: "validation" as const },
];

const LOG_POOL: Omit<LogEntry, "id" | "ts" | "epoch">[] = [
  {
    level: "nvidia", category: "nvidia", agent: "nvidia_orchestrator",
    agentColor: "#76b900", agentEmoji: "⚡",
    title: "NVIDIA API — LLM inference completed",
    message: "Model llama-3.1-70b-instruct returned 1,842 tokens. Context window: 8,192. Temperature: 0.3.",
    model: "llama-3.1-70b-instruct", tokens: 1842, latencyMs: 1240,
    taskId: "T-0041", taskName: "Generate component scaffold",
    meta: { stop_reason: "end_of_text", prompt_tokens: 512, completion_tokens: 1330 },
  },
  {
    level: "stream", category: "nvidia", agent: "nvidia_orchestrator",
    agentColor: "#76b900", agentEmoji: "⚡",
    title: "NVIDIA streaming — token generation in progress",
    message: "Streaming response for task T-0042 · 38 tokens/s · ETA ~4s",
    model: "llama-3.1-70b-instruct", tokens: 0, latencyMs: 0,
    taskId: "T-0042", taskName: "Refine API schema",
    streaming: true,
  },
  {
    level: "info", category: "frontend", agent: "frontend_agent",
    agentColor: "#3b82f6", agentEmoji: "🎨",
    title: "Component generated — DashboardCard.tsx",
    message: "Wrote 312 lines. Imports: React, framer-motion, lucide-react. Props interface validated.",
    taskId: "T-0038", taskName: "Build dashboard UI",
    files: ["src/components/DashboardCard.tsx", "src/components/DashboardCard.test.tsx"],
  },
  {
    level: "success", category: "backend", agent: "backend_agent",
    agentColor: "#10b981", agentEmoji: "⚙️",
    title: "REST endpoint registered — POST /api/projects",
    message: "Handler wired, Zod schema validated, Prisma migration applied. Response time: 48ms avg.",
    taskId: "T-0035", taskName: "Create projects API",
    files: ["src/app/api/projects/route.ts", "prisma/migrations/20250110_add_projects.sql"],
    meta: { p95_latency_ms: 72, status: 201 },
  },
  {
    level: "warn", category: "qa", agent: "qa_agent",
    agentColor: "#ef4444", agentEmoji: "🔬",
    title: "Test coverage below threshold — 67%",
    message: "Expected ≥80%. Missing: error boundaries, loading states, mobile breakpoints. Flagging for review.",
    taskId: "T-0039", taskName: "QA — dashboard module",
    meta: { coverage: "67%", threshold: "80%", failing_suites: 3 },
  },
  {
    level: "info", category: "devops", agent: "devops_agent",
    agentColor: "#8b5cf6", agentEmoji: "🚀",
    title: "Docker layer cache invalidated",
    message: "Layer hash changed: package-lock.json modified. Full npm install triggered. ETA 40s.",
    taskId: "T-0033", taskName: "Containerize app",
    files: ["Dockerfile", "package-lock.json"],
  },
  {
    level: "nvidia", category: "nvidia", agent: "nvidia_orchestrator",
    agentColor: "#76b900", agentEmoji: "⚡",
    title: "NVIDIA API — reasoning chain emitted",
    message: "Chain-of-thought: 6 steps. Intermediate conclusions logged. Final decision: decompose into 4 subtasks.",
    model: "llama-3.1-70b-instruct", tokens: 2104, latencyMs: 1870,
    taskId: "T-0040", taskName: "Plan project architecture",
    meta: { reasoning_steps: 6, subtasks_created: 4, confidence: "0.91" },
  },
  {
    level: "success", category: "build", agent: "build_runner",
    agentColor: "#06b6d4", agentEmoji: "🔧",
    title: "Build succeeded — 0 errors, 2 warnings",
    message: "Next.js production build completed in 38.4s. Bundle size: 284kB gzip. Chunks: 42.",
    taskId: "T-0036", taskName: "Production build",
    meta: { duration_s: 38.4, bundle_kb: 284, chunks: 42 },
  },
  {
    level: "success", category: "validation", agent: "validator",
    agentColor: "#a78bfa", agentEmoji: "✅",
    title: "Schema validation passed — OpenAPI 3.1",
    message: "All 18 endpoints conform to spec. No breaking changes detected vs. previous version.",
    taskId: "T-0037", taskName: "Validate API schema",
    meta: { endpoints_checked: 18, breaking_changes: 0, warnings: 1 },
  },
  {
    level: "error", category: "qa", agent: "qa_agent",
    agentColor: "#ef4444", agentEmoji: "🔬",
    title: "E2E test failed — /dashboard route 404",
    message: "Playwright test: navigate to /dashboard → expected 200, got 404. Route not registered in app router.",
    taskId: "T-0039", taskName: "QA — dashboard module",
    files: ["tests/e2e/dashboard.spec.ts"],
    meta: { test_id: "e2e-007", expected: 200, actual: 404 },
  },
  {
    level: "debug", category: "orchestration", agent: "architect_agent",
    agentColor: "#f59e0b", agentEmoji: "🏗️",
    title: "Task graph recomputed — 14 nodes",
    message: "Dependency resolution: 3 parallel paths identified. Critical path: T-0033 → T-0036 → T-0041. ETA 8m.",
    taskId: "T-0040", taskName: "Plan project architecture",
    meta: { nodes: 14, parallel_paths: 3, eta_min: 8 },
  },
  {
    level: "info", category: "frontend", agent: "frontend_agent",
    agentColor: "#3b82f6", agentEmoji: "🎨",
    title: "CSS design tokens applied",
    message: "Synced 47 tokens from Figma export. Updated globals.css. Verified contrast ratios: all WCAG AA compliant.",
    taskId: "T-0038", taskName: "Build dashboard UI",
    files: ["src/styles/globals.css", "src/styles/tokens.css"],
    meta: { tokens_synced: 47, contrast_failures: 0 },
  },
  {
    level: "info", category: "devops", agent: "devops_agent",
    agentColor: "#8b5cf6", agentEmoji: "🚀",
    title: "GitHub Actions workflow triggered",
    message: "Push to main branch detected. Running: lint → type-check → test → build. ETA 4m 20s.",
    taskId: "T-0033", taskName: "CI/CD pipeline",
    meta: { workflow: "ci.yml", trigger: "push", branch: "main" },
  },
  {
    level: "nvidia", category: "nvidia", agent: "nvidia_orchestrator",
    agentColor: "#76b900", agentEmoji: "⚡",
    title: "NVIDIA API — rate limit headroom: 94%",
    message: "Current usage: 6 req/min of 100 allowed. Token budget: 52k/100k used. No throttling risk.",
    model: "llama-3.1-70b-instruct",
    meta: { req_per_min: 6, limit: 100, tokens_used: 52000, token_limit: 100000 },
  },
  {
    level: "success", category: "backend", agent: "backend_agent",
    agentColor: "#10b981", agentEmoji: "⚙️",
    title: "Database migration applied — v42",
    message: "Added: projects table (9 cols), tasks table (12 cols). Indexes created. Rollback script saved.",
    taskId: "T-0035", taskName: "DB schema update",
    files: ["prisma/migrations/20250110_v42.sql"],
    meta: { tables_added: 2, indexes_created: 5 },
  },
  {
    level: "warn", category: "build", agent: "build_runner",
    agentColor: "#06b6d4", agentEmoji: "🔧",
    title: "TypeScript — 2 type errors suppressed",
    message: "Used @ts-ignore on lines 142, 287. Reason: third-party type mismatch with @xyflow/react v2.",
    taskId: "T-0036", taskName: "Production build",
    files: ["src/app/tasks/graph/page.tsx"],
    meta: { suppressed: 2, file: "graph/page.tsx" },
  },
  {
    level: "debug", category: "validation", agent: "validator",
    agentColor: "#a78bfa", agentEmoji: "✅",
    title: "Performance budget check",
    message: "LCP: 1.2s (budget: 2.5s ✓). FID: 18ms (budget: 100ms ✓). CLS: 0.04 (budget: 0.1 ✓).",
    taskId: "T-0037", taskName: "Performance validation",
    meta: { lcp_ms: 1200, fid_ms: 18, cls: 0.04 },
  },
  {
    level: "stream", category: "nvidia", agent: "nvidia_orchestrator",
    agentColor: "#76b900", agentEmoji: "⚡",
    title: "NVIDIA streaming — code generation active",
    message: "Writing implementation for backend route handler. 127 tokens so far · 41 tokens/s",
    model: "llama-3.1-70b-instruct", tokens: 127, latencyMs: 0,
    taskId: "T-0035", taskName: "Generate route handler",
    streaming: true,
  },
];

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function nowTs() {
  return new Date().toLocaleTimeString("en-CA", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function spawnEntry(): LogEntry {
  const template = LOG_POOL[Math.floor(Math.random() * LOG_POOL.length)];
  return { ...template, id: genId(), ts: nowTs(), epoch: Date.now() };
}

function getInitialEntries(): LogEntry[] {
  const now = Date.now();
  return Array.from({ length: 18 }, (_, i) => {
    const tmpl = LOG_POOL[i % LOG_POOL.length];
    const offset = (18 - i) * 8000;
    const epoch = now - offset;
    const d = new Date(epoch);
    const ts = d.toLocaleTimeString("en-CA", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return { ...tmpl, id: genId(), ts, epoch, streaming: false };
  });
}

const LEVEL_STYLES: Record<LogLevel, { bg: string; color: string; label: string }> = {
  info:    { bg: "rgba(99,102,241,0.12)",  color: "#818cf8", label: "INFO" },
  success: { bg: "rgba(16,185,129,0.12)",  color: "#34d399", label: "OK" },
  warn:    { bg: "rgba(245,158,11,0.12)",  color: "#fbbf24", label: "WARN" },
  error:   { bg: "rgba(239,68,68,0.14)",   color: "#f87171", label: "ERR" },
  debug:   { bg: "rgba(148,163,184,0.08)", color: "#94a3b8", label: "DBG" },
  nvidia:  { bg: "rgba(118,185,0,0.12)",   color: "#a3d977", label: "GPU" },
  stream:  { bg: "rgba(6,182,212,0.10)",   color: "#22d3ee", label: "SSE" },
};

const CATEGORIES: { id: LogCategory; label: string }[] = [
  { id: "all",          label: "All" },
  { id: "nvidia",       label: "NVIDIA" },
  { id: "orchestration",label: "Orchestration" },
  { id: "backend",      label: "Backend" },
  { id: "frontend",     label: "Frontend" },
  { id: "qa",           label: "QA" },
  { id: "devops",       label: "DevOps" },
  { id: "build",        label: "Build" },
  { id: "validation",   label: "Validation" },
  { id: "errors",       label: "Errors" },
  { id: "warnings",     label: "Warnings" },
];

function StreamingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center", marginLeft: 6 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{ width: 4, height: 4, borderRadius: "50%", background: "#22d3ee", display: "inline-block" }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
        />
      ))}
    </span>
  );
}

function LevelBadge({ level }: { level: LogLevel }) {
  const s = LEVEL_STYLES[level];
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
      fontFamily: "ui-monospace, monospace",
      padding: "2px 6px", borderRadius: 4,
      background: s.bg, color: s.color, flexShrink: 0,
    }}>
      {s.label}
    </span>
  );
}

function LogRow({ entry, isSelected, onClick }: { entry: LogEntry; isSelected: boolean; onClick: () => void }) {
  const s = LEVEL_STYLES[entry.level];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "9px 14px",
        background: isSelected ? "rgba(99,102,241,0.10)" : "transparent",
        borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
        cursor: "pointer",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        transition: "background 0.12s",
      }}
      whileHover={{ background: isSelected ? "rgba(99,102,241,0.10)" : "rgba(255,255,255,0.025)" }}
    >
      <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "ui-monospace, monospace", flexShrink: 0, minWidth: 64, paddingTop: 1 }}>
        {entry.ts}
      </span>
      <LevelBadge level={entry.level} />
      <span style={{ fontSize: 11, fontWeight: 600, color: entry.agentColor, flexShrink: 0, minWidth: 130, fontFamily: "ui-monospace, monospace", paddingTop: 1 }}>
        {entry.agentEmoji} {entry.agent}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>{entry.title}</span>
          {entry.streaming && <StreamingDots />}
          {entry.taskId && (
            <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "ui-monospace, monospace", background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 3 }}>
              {entry.taskId}
            </span>
          )}
          {entry.model && (
            <span style={{ fontSize: 10, color: "#a3d977", background: "rgba(118,185,0,0.10)", padding: "1px 5px", borderRadius: 3, fontFamily: "ui-monospace, monospace" }}>
              {entry.model}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {entry.message}
        </div>
      </div>
      {entry.latencyMs ? (
        <span style={{ fontSize: 10, color: s.color, fontFamily: "ui-monospace, monospace", flexShrink: 0, paddingTop: 1 }}>
          {entry.latencyMs}ms
        </span>
      ) : null}
    </motion.div>
  );
}

function DetailPanel({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.2 }}
      style={{
        width: 320, flexShrink: 0,
        background: "var(--surface-2, var(--surface))",
        border: "1px solid var(--border)",
        borderRadius: 10,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Log Detail</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 22 }}>{entry.agentEmoji}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: entry.agentColor, fontFamily: "ui-monospace, monospace" }}>{entry.agent}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>{entry.ts}</div>
          </div>
          <div style={{ marginLeft: "auto" }}><LevelBadge level={entry.level} /></div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 8, lineHeight: 1.4 }}>{entry.title}</div>
        <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 14 }}>{entry.message}</div>

        {entry.model && (
          <DetailSection label="NVIDIA Inference">
            <MetaRow label="Model" value={entry.model} accent="#a3d977" />
            {entry.tokens != null && <MetaRow label="Tokens" value={entry.tokens.toLocaleString()} />}
            {entry.latencyMs != null && entry.latencyMs > 0 && <MetaRow label="Latency" value={`${entry.latencyMs}ms`} />}
            {entry.streaming && <MetaRow label="Status" value="Streaming…" accent="#22d3ee" />}
          </DetailSection>
        )}

        {entry.taskId && (
          <DetailSection label="Task">
            <MetaRow label="ID" value={entry.taskId} mono />
            {entry.taskName && <MetaRow label="Name" value={entry.taskName} />}
          </DetailSection>
        )}

        {entry.files && entry.files.length > 0 && (
          <DetailSection label="Files">
            {entry.files.map((f) => (
              <div key={f} style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#818cf8", padding: "2px 0" }}>📄 {f}</div>
            ))}
          </DetailSection>
        )}

        {entry.meta && Object.keys(entry.meta).length > 0 && (
          <DetailSection label="Metadata">
            {Object.entries(entry.meta).map(([k, v]) => (
              <MetaRow key={k} label={k} value={String(v)} mono />
            ))}
          </DetailSection>
        )}
      </div>
    </motion.div>
  );
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
      <div style={{ background: "rgba(255,255,255,0.035)", borderRadius: 6, padding: "6px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        {children}
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 10, color: "var(--text-3)" }}>{label}</span>
      <span style={{ fontSize: 10, color: accent ?? "var(--text-2)", fontFamily: mono ? "ui-monospace, monospace" : undefined, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const AGENT_META_MAP: Record<string, { color: string; emoji: string; category: LogEntry["category"] }> = {
  product_agent:   { color: "#a78bfa", emoji: "🎯", category: "orchestration" },
  architect_agent: { color: "#f59e0b", emoji: "🏗️", category: "orchestration" },
  frontend_agent:  { color: "#3b82f6", emoji: "🎨", category: "frontend" },
  backend_agent:   { color: "#10b981", emoji: "⚙️", category: "backend" },
  qa_agent:        { color: "#ef4444", emoji: "🔬", category: "qa" },
  devops_agent:    { color: "#8b5cf6", emoji: "🚀", category: "devops" },
};

function mapBackendEntry(real: BackendLogEntry): LogEntry {
  const agent = real.agent ?? "system";
  const meta = AGENT_META_MAP[agent] ?? { color: "#94a3b8", emoji: "📋", category: "backend" as const };
  const level: LogLevel = real.status === "completed" ? "success"
    : real.status === "failed" ? "error"
    : real.status === "selected" ? "info"
    : "debug";
  const ts = (() => {
    try { return new Date(real.timestamp).toLocaleTimeString("en-CA", { hour12: false }); }
    catch { return "--:--:--"; }
  })();
  return {
    id: genId(),
    ts,
    epoch: (() => { try { return new Date(real.timestamp).getTime(); } catch { return Date.now(); } })(),
    level,
    category: meta.category,
    agent,
    agentColor: meta.color,
    agentEmoji: meta.emoji,
    title: real.task_title ? `[${real.project ?? ""}] ${real.task_title}` : real.event ?? agent,
    message: real.message ?? real.event ?? "",
    taskId: real.task_id != null ? String(real.task_id) : undefined,
  };
}

export default function LogsPage() {
  const [entries, setEntries] = useState<LogEntry[]>(getInitialEntries);
  const [category, setCategory] = useState<LogCategory>("all");
  const [search, setSearch] = useState("");
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [streamMode, setStreamMode] = useState<"simulation" | "live">("simulation");
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const [bridgeMessage, setBridgeMessage] = useState("Simulation stream");
  const pausedRef = useRef(false);
  const entriesRef = useRef<LogEntry[]>([]);
  entriesRef.current = entries;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Simulation tick — disabled when in live mode
  useEffect(() => {
    if (streamMode === "live") return;
    const iv = setInterval(() => {
      if (pausedRef.current) return;
      const newEntry = spawnEntry();
      setEntries((prev) => {
        const updated = [newEntry, ...prev];
        return updated.map((e) => {
          if (e.streaming && e.id !== newEntry.id && Math.random() > 0.5) {
            const tokens = Math.floor(Math.random() * 800) + 400;
            return { ...e, streaming: false, level: "nvidia" as LogLevel, tokens, latencyMs: Math.floor(Math.random() * 1200) + 600, message: `Completed. ${tokens} tokens generated. Latency: ${Math.floor(Math.random() * 1200) + 600}ms.` };
          }
          return e;
        }).slice(0, 300);
      });
    }, 1800);
    return () => clearInterval(iv);
  }, [streamMode]);

  // Real SSE stream — active only in live mode
  useLogStream(
    useCallback((real: BackendLogEntry) => {
      if (pausedRef.current) return;
      const entry = mapBackendEntry(real);
      setEntries((prev) => [entry, ...prev].slice(0, 300));
    }, []),
    streamMode === "live"
  );

  const filtered = entries.filter((e) => {
    if (category === "errors") return e.level === "error";
    if (category === "warnings") return e.level === "warn";
    if (category !== "all" && e.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        e.agent.toLowerCase().includes(q) ||
        (e.taskId?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const errorCount = entries.filter((e) => e.level === "error").length;
  const nvidiaCount = entries.filter((e) => e.level === "nvidia" || e.level === "stream").length;
  const streamingCount = entries.filter((e) => e.streaming).length;
  const eventsPerMin = Math.round((entries.filter((e) => e.epoch > Date.now() - 60000).length));

  const handleRowClick = useCallback((entry: LogEntry) => {
    setSelected((prev) => prev?.id === entry.id ? null : entry);
  }, []);

  const refreshLogs = useCallback(async () => {
    setRefreshingLogs(true);
    try {
      const res = await fetch("/api/logs", { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; message?: string; data?: { entries?: BackendLogEntry[] } };
      const realEntries = payload.data?.entries ?? [];
      if (realEntries.length > 0) {
        setEntries(realEntries.map(mapBackendEntry));
        setStreamMode("live");
      }
      setBridgeMessage(payload.message ?? (payload.ok ? "Logs refreshed" : "Log refresh failed"));
    } catch (error) {
      setBridgeMessage(`Log refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRefreshingLogs(false);
    }
  }, []);

  return (
    <main className="page" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", padding: 0 }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div>
            <h1 className="page-title">Execution Stream</h1>
            <p className="page-subtitle">NVIDIA agent pipeline · realtime event log</p>
          </div>
          <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Metric chips */}
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "Events/min", value: eventsPerMin, color: "var(--text-2)" },
                { label: "NVIDIA", value: nvidiaCount, color: "#a3d977" },
                { label: "Streaming", value: streamingCount, color: "#22d3ee" },
                { label: "Errors", value: errorCount, color: errorCount > 0 ? "#f87171" : "var(--text-3)" },
              ].map((m) => (
                <div key={m.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ width: 1, height: 32, background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#a3d977" }}>
              <motion.div
                style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              NVIDIA API live
            </div>
            {/* Stream mode toggle */}
            <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
              {(["simulation", "live"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setStreamMode(mode);
                    if (mode === "live") setEntries([]);
                  }}
                  style={{
                    padding: "5px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", border: "none",
                    background: streamMode === mode
                      ? mode === "live" ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.15)"
                      : "transparent",
                    color: streamMode === mode
                      ? mode === "live" ? "#34d399" : "#818cf8"
                      : "var(--text-3)",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    transition: "all 0.12s",
                  }}
                >
                  {mode === "live" ? "⚡ Live" : "◎ Sim"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPaused((p) => !p)}
              style={{
                padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border)",
                background: paused ? "rgba(245,158,11,0.12)" : "var(--surface)",
                color: paused ? "#fbbf24" : "var(--text-2)",
                transition: "all 0.15s",
              }}
            >
              {paused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button
              onClick={refreshLogs}
              disabled={refreshingLogs}
              style={{
                padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: refreshingLogs ? "not-allowed" : "pointer", border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-2)",
                transition: "all 0.15s",
              }}
            >
              {refreshingLogs ? "Refreshing..." : "Refresh Logs"}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 12, color: "var(--text-3)", fontSize: 11 }}>
          {bridgeMessage}
        </div>

        <AutopilotPanel compact />
        <AutopilotSessionBanner />

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "1px solid",
                  borderColor: category === cat.id ? "var(--accent)" : "var(--border)",
                  background: category === cat.id ? "rgba(99,102,241,0.15)" : "transparent",
                  color: category === cat.id ? "#a5b4fc" : "var(--text-3)",
                  transition: "all 0.12s",
                }}
              >
                {cat.label}
                {cat.id === "errors" && errorCount > 0 && (
                  <span style={{ marginLeft: 4, background: "#ef4444", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 9, fontWeight: 700 }}>{errorCount}</span>
                )}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search logs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "5px 12px", borderRadius: 7, border: "1px solid var(--border)",
              background: "var(--surface)", color: "var(--text-1)", fontSize: 12,
              outline: "none", minWidth: 200,
            }}
          />
          <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: "auto" }}>
            {filtered.length} entries
          </span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 0, padding: "0 24px 24px", minHeight: 0 }}>
        {/* Log stream */}
        <div
          style={{
            flex: 1, minWidth: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
          onMouseEnter={() => !paused && setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <motion.div style={{ width: 7, height: 7, borderRadius: "50%", background: paused ? "#fbbf24" : "#10b981" }} animate={{ opacity: paused ? 1 : [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}>
              {paused ? "Stream paused" : streamMode === "live" ? "Backend SSE stream" : "Simulation stream"}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
              background: streamMode === "live" ? "rgba(16,185,129,0.12)" : "rgba(99,102,241,0.12)",
              color: streamMode === "live" ? "#34d399" : "#818cf8",
            }}>
              {streamMode === "live" ? "LIVE BACKEND" : "SIMULATION"}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: "auto" }}>newest first · hover to pause</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                No logs match the current filter.
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filtered.map((entry) => (
                  <LogRow
                    key={entry.id}
                    entry={entry}
                    isSelected={selected?.id === entry.id}
                    onClick={() => handleRowClick(entry)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <div style={{ marginLeft: 12 }}>
              <DetailPanel entry={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
