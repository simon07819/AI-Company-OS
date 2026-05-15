"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import type { Edge, Node, NodeProps } from "@xyflow/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

type TaskStatus = "completed" | "running" | "queued" | "blocked" | "failed";
type TaskPriority = "critical" | "high" | "normal" | "low";

interface TaskNodeData {
  title:       string;
  agent:       string;
  agentEmoji:  string;
  agentColor:  string;
  status:      TaskStatus;
  progress:    number;
  priority:    TaskPriority;
  eta:         string;
  project:     string;
  phase:       string;
  files:       string[];
  reasoning:   string;
  logs:        string[];
  [key: string]: unknown;
}

// ─── Static data ────────────────────────────────────────────────────────────

const AGENT_MAP: Record<string, { emoji: string; color: string }> = {
  product_agent:   { emoji: "🧠", color: "#a78bfa" },
  architect_agent: { emoji: "🏗️", color: "#6366f1" },
  frontend_agent:  { emoji: "🎨", color: "#f472b6" },
  backend_agent:   { emoji: "⚙️",  color: "#34d399" },
  qa_agent:        { emoji: "🔬", color: "#fb923c" },
  devops_agent:    { emoji: "🚀", color: "#38bdf8" },
};

const NVIDIA_REASONING: Record<string, string> = {
  "p1-prd":  "Analyzing product requirements via NVIDIA llama-3.1-70b-instruct. Synthesizing market context, user personas and feature scope into structured PRD. Token usage: 9,240.",
  "p1-arch": "Multi-step architectural reasoning executed. Evaluating 3 candidate patterns (monolith, modular monolith, microservices). Selecting modular monolith for V1 scope.",
  "p2-db":   "Inspecting domain entities. Generating normalized PostgreSQL schema with proper foreign keys, indexes and constraints. 14 tables, 38 relations identified.",
  "p2-api":  "Parsing PRD feature list. Mapping 23 user stories to REST endpoints. Applying REST conventions + OpenAPI 3.1 spec generation. Coverage: 100%.",
  "p2-adr":  "Documenting 7 Architecture Decision Records covering auth, storage, caching, observability and deployment. NVIDIA context: 12,800 tokens.",
  "p3-auth": "Generating JWT + refresh token auth system. Implementing RBAC with 4 permission levels. Bcrypt password hashing. 342 lines generated, passing tsc strict.",
  "p3-api":  "Building CRUD routes for 8 core resources. Zod validation schemas, error handling middleware, rate limiting. Integration with Prisma ORM layer.",
  "p3-ui":   "Scaffolding 18 reusable UI components using design system tokens. Storybook stories auto-generated. Accessibility audit: WCAG AA compliant.",
  "p3-dash": "Generating dashboard page with real-time data hooks, chart components, skeleton loading states. Responsive breakpoints: mobile/tablet/desktop.",
  "p4-unit": "Writing 142 unit tests covering critical business logic paths. Edge cases: null states, concurrent mutations, permission boundaries. Coverage target: 85%.",
  "p4-int":  "E2E integration tests for 8 user flows. Playwright-based browser automation. Database seeding with deterministic fixtures.",
  "p4-cicd": "Configuring GitHub Actions CI/CD pipeline: test → lint → build → deploy → smoke. Matrix testing across Node 18/20. Docker multi-stage build.",
  "p5-stg":  "Deploying to staging environment (Fly.io). Health checks: /health, /ready, /live. Canary routing: 10% traffic to new revision.",
  "p5-val":  "Running full validation suite: 38 quality gates, security scan (OWASP), performance benchmark (p95 < 200ms), contract tests. Final approval gate.",
};

const FILE_MAP: Record<string, string[]> = {
  "p1-prd":  ["docs/PRD.md", "docs/user-stories.md"],
  "p1-arch": ["docs/architecture.md", "docs/ADR-000-overview.md"],
  "p2-db":   ["prisma/schema.prisma", "prisma/migrations/001_init.sql"],
  "p2-api":  ["docs/openapi.yaml", "src/api/routes.ts"],
  "p2-adr":  ["docs/ADR-001-auth.md", "docs/ADR-002-storage.md", "docs/ADR-003-cache.md"],
  "p3-auth": ["src/modules/auth/index.ts", "src/modules/auth/jwt.ts", "src/modules/auth/rbac.ts"],
  "p3-api":  ["src/api/users.ts", "src/api/projects.ts", "src/api/tasks.ts"],
  "p3-ui":   ["src/components/Button.tsx", "src/components/Card.tsx", "src/components/DataTable.tsx"],
  "p3-dash": ["src/app/dashboard/page.tsx", "src/hooks/useDashboard.ts"],
  "p4-unit": ["tests/unit/auth.test.ts", "tests/unit/api.test.ts"],
  "p4-int":  ["tests/e2e/flows.spec.ts", "tests/fixtures/seed.ts"],
  "p4-cicd": [".github/workflows/ci.yml", "Dockerfile", "fly.toml"],
  "p5-stg":  ["scripts/deploy-staging.sh", "config/staging.env"],
  "p5-val":  ["scripts/validate.sh", "docs/launch-checklist.md"],
};

// ─── Graph initial state ────────────────────────────────────────────────────

function makeNode(
  id: string, title: string, agent: string,
  x: number, y: number, status: TaskStatus,
  progress: number, priority: TaskPriority,
  phase: string, eta: string, project: string,
): Node<TaskNodeData> {
  const a = AGENT_MAP[agent];
  return {
    id, type: "task",
    position: { x, y },
    data: {
      title, agent,
      agentEmoji: a.emoji,
      agentColor: a.color,
      status, progress, priority, phase, eta, project,
      files:     FILE_MAP[id] ?? [],
      reasoning: NVIDIA_REASONING[id] ?? "",
      logs:      [],
    },
  };
}

const INIT_NODES: Node<TaskNodeData>[] = [
  // Phase 1 — Planning
  makeNode("p1-prd",  "Generate Product PRD",    "product_agent",   0,    80,  "completed", 100, "critical", "Planning",      "done",  "ai-company-os"),
  makeNode("p1-arch", "Define Architecture",     "architect_agent", 0,    300, "completed", 100, "critical", "Planning",      "done",  "ai-company-os"),
  // Phase 2 — Architecture
  makeNode("p2-db",   "Design DB Schema",        "architect_agent", 320,  0,   "completed", 100, "critical", "Architecture",  "done",  "ai-company-os"),
  makeNode("p2-api",  "Plan API Routes",         "architect_agent", 320,  180, "running",   72,  "high",     "Architecture",  "3m",    "ai-company-os"),
  makeNode("p2-adr",  "Create System ADRs",      "architect_agent", 320,  360, "completed", 100, "normal",   "Architecture",  "done",  "ai-company-os"),
  // Phase 3 — Development
  makeNode("p3-auth", "Build Auth Module",       "backend_agent",   640,  0,   "running",   58,  "critical", "Development",   "5m",    "ai-company-os"),
  makeNode("p3-api",  "Build Core API",          "backend_agent",   640,  200, "queued",    0,   "high",     "Development",   "12m",   "ai-company-os"),
  makeNode("p3-ui",   "Scaffold UI Components",  "frontend_agent",  640,  400, "running",   41,  "high",     "Development",   "8m",    "ai-company-os"),
  makeNode("p3-dash", "Build Dashboard",         "frontend_agent",  640,  600, "queued",    0,   "normal",   "Development",   "15m",   "ai-company-os"),
  // Phase 4 — Quality
  makeNode("p4-unit", "Write Unit Tests",        "qa_agent",        960,  80,  "queued",    0,   "high",     "Quality",       "10m",   "ai-company-os"),
  makeNode("p4-int",  "Integration Tests",       "qa_agent",        960,  280, "queued",    0,   "high",     "Quality",       "14m",   "ai-company-os"),
  makeNode("p4-cicd", "Configure CI/CD",         "devops_agent",    960,  480, "queued",    0,   "normal",   "Quality",       "6m",    "ai-company-os"),
  // Phase 5 — Deployment
  makeNode("p5-stg",  "Deploy to Staging",       "devops_agent",    1280, 160, "queued",    0,   "critical", "Deployment",    "8m",    "ai-company-os"),
  makeNode("p5-val",  "Run Validations",         "qa_agent",        1280, 360, "queued",    0,   "critical", "Deployment",    "5m",    "ai-company-os"),
];

type DepPair = [string, string];
const DEP_PAIRS: DepPair[] = [
  ["p1-prd",  "p2-db"],   ["p1-prd",  "p2-api"],
  ["p1-arch", "p2-api"],  ["p1-arch", "p2-adr"],
  ["p2-db",   "p3-auth"], ["p2-db",   "p3-api"],
  ["p2-api",  "p3-api"],  ["p2-api",  "p3-dash"],
  ["p2-adr",  "p3-ui"],
  ["p3-auth", "p4-unit"],
  ["p3-api",  "p4-unit"], ["p3-api",  "p4-int"],
  ["p3-ui",   "p4-int"],  ["p3-ui",   "p4-cicd"],
  ["p3-dash", "p4-int"],
  ["p4-unit", "p5-stg"],  ["p4-int",  "p5-stg"],  ["p4-cicd", "p5-stg"],
  ["p5-stg",  "p5-val"],
];

function buildEdges(nodes: Node<TaskNodeData>[]): Edge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return DEP_PAIRS.map(([src, tgt]) => {
    const s = nodeMap.get(src)!;
    const d = s.data;
    const isActive = d.status === "running";
    const isDone   = d.status === "completed";
    return {
      id:     `e-${src}-${tgt}`,
      source: src, target: tgt,
      type:   "smoothstep",
      animated: isActive,
      style: {
        stroke:      isDone ? d.agentColor + "55" : isActive ? d.agentColor : "#1a2438",
        strokeWidth: isActive ? 2.5 : 1.5,
        strokeDasharray: (!isDone && !isActive) ? "5 4" : undefined,
      },
      markerEnd: {
        type:  MarkerType.ArrowClosed,
        color: isDone ? d.agentColor + "55" : isActive ? d.agentColor : "#283650",
        width: 14, height: 14,
      },
    };
  });
}

// ─── Design ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  completed: { label: "DONE",      color: "#38bdf8", bg: "rgba(56,189,248,0.12)"  },
  running:   { label: "RUNNING",   color: "#34d399", bg: "rgba(16,185,129,0.14)"  },
  queued:    { label: "QUEUED",    color: "#8b97b2", bg: "rgba(139,151,178,0.1)"  },
  blocked:   { label: "BLOCKED",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  failed:    { label: "FAILED",    color: "#f43f5e", bg: "rgba(244,63,94,0.12)"   },
};

const PRIORITY_CFG: Record<TaskPriority, { color: string }> = {
  critical: { color: "#f43f5e" },
  high:     { color: "#f59e0b" },
  normal:   { color: "#38bdf8" },
  low:      { color: "#46566e" },
};

// ─── Custom TaskNode ────────────────────────────────────────────────────────

function TaskNode({ data: raw, selected }: NodeProps) {
  const d = raw as TaskNodeData;
  const s = STATUS_CFG[d.status];
  const isLive = d.status === "running";

  return (
    <div
      style={{
        width: 210,
        background: "#0c0f1d",
        border: `1.5px solid ${selected ? d.agentColor : isLive ? d.agentColor + "50" : "#1a2438"}`,
        borderRadius: 12,
        padding: "12px 13px",
        cursor: "pointer",
        transition: "border-color 200ms ease, box-shadow 200ms ease",
        boxShadow: isLive
          ? `0 0 0 1px ${d.agentColor}20, 0 0 24px ${d.agentColor}25, 0 4px 20px rgba(0,0,0,0.5)`
          : selected
          ? `0 0 0 1px ${d.agentColor}30, 0 8px 24px rgba(0,0,0,0.4)`
          : "0 2px 12px rgba(0,0,0,0.3)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top glow bar for running nodes */}
      {isLive && (
        <div
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${d.agentColor}, transparent)`,
            opacity: 0.8,
          }}
        />
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: d.agentColor, width: 8, height: 8, border: "2px solid #0c0f1d", left: -5 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: d.agentColor, width: 8, height: 8, border: "2px solid #0c0f1d", right: -5 }}
      />

      {/* Agent row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <span
          style={{
            width: 26, height: 26, borderRadius: 7,
            background: d.agentColor + "18",
            border: `1px solid ${d.agentColor}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, flexShrink: 0,
          }}
        >
          {d.agentEmoji}
        </span>
        <span
          style={{
            fontFamily: "ui-monospace, monospace", fontSize: 9.5,
            fontWeight: 700, color: d.agentColor,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}
        >
          {d.agent}
        </span>
        <span
          style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.4px",
            color: s.color, background: s.bg,
            padding: "1px 6px", borderRadius: 99,
            display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
          }}
        >
          {isLive && (
            <span style={{
              width: 4, height: 4, borderRadius: "50%",
              background: s.color, display: "inline-block",
              animation: "pulse-ring 2s ease infinite",
            }} />
          )}
          {s.label}
        </span>
      </div>

      {/* Title */}
      <p
        style={{
          fontSize: 12, fontWeight: 700,
          color: d.status === "queued" ? "#46566e" : "#edf2fa",
          lineHeight: 1.35, marginBottom: 7,
        }}
      >
        {d.title}
      </p>

      {/* Progress bar */}
      {(isLive || d.status === "completed") && (
        <div style={{ marginBottom: 7 }}>
          <div style={{ height: 2.5, background: "#1a2438", borderRadius: 99, overflow: "hidden" }}>
            <div
              style={{
                height: "100%", borderRadius: 99,
                width: `${d.progress}%`,
                background: `linear-gradient(90deg, ${d.agentColor}88, ${d.agentColor})`,
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Footer row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9.5, color: "#46566e", fontFamily: "ui-monospace, monospace" }}>
          {d.phase}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: PRIORITY_CFG[d.priority].color, letterSpacing: "0.4px" }}>
          {d.priority.toUpperCase()}
        </span>
        <span style={{ fontSize: 9.5, color: "#46566e", fontFamily: "ui-monospace, monospace" }}>
          {d.eta !== "done" ? `ETA ${d.eta}` : "✓ done"}
        </span>
      </div>
    </div>
  );
}

const NODE_TYPES = { task: TaskNode };

// ─── Inspector Panel ────────────────────────────────────────────────────────

let _lid = 0;
const LIVE_LOG_POOL = [
  "NVIDIA API → inference started (llama-3.1-70b-instruct)",
  "Context loaded — 11,240 tokens",
  "Generating implementation plan…",
  "Code block 1/3 complete",
  "Running self-validation pass",
  "Type-checking generated code — 0 errors",
  "Writing output to worktree",
  "Committing changes to branch feat/agent-v2",
];

function Inspector({
  node,
  liveLog,
}: {
  node: Node<TaskNodeData> | null;
  liveLog: string[];
}) {
  const logEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { logEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [liveLog.length]);

  if (!node) {
    return (
      <div
        style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          height: "100%", gap: 10, textAlign: "center",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.25 }}>🔬</div>
        <p style={{ color: "#46566e", fontSize: 12 }}>Click any node to inspect</p>
      </div>
    );
  }

  const d = node.data;
  const s = STATUS_CFG[d.status];
  const isLive = d.status === "running";

  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", overflow: "hidden" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 11,
            background: d.agentColor + "18",
            border: `1px solid ${d.agentColor}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 19, flexShrink: 0,
            boxShadow: isLive ? `0 0 14px ${d.agentColor}30` : "none",
          }}
        >
          {d.agentEmoji}
        </div>
        <div>
          <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 700, color: d.agentColor }}>{d.agent}</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#edf2fa", marginTop: 2, lineHeight: 1.3 }}>{d.title}</p>
        </div>
      </div>

      {/* Status + Progress */}
      <div style={{ background: "#0c0f1d", border: "1px solid #1a2438", borderRadius: 9, padding: "10px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: s.color, background: s.bg, padding: "2px 8px", borderRadius: 99 }}>
            {isLive && <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, display: "inline-block", animation: "pulse-ring 2s ease infinite" }} />}
            {s.label}
          </span>
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#8b97b2" }}>{d.phase}</span>
        </div>
        {(isLive || d.status === "completed") && (
          <div>
            <div style={{ height: 4, background: "#162035", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${d.progress}%`, background: `linear-gradient(90deg, ${d.agentColor}88, ${d.agentColor})`, borderRadius: 99, transition: "width 0.6s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 9.5, color: "#46566e", fontFamily: "ui-monospace, monospace" }}>progress</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#8b97b2", fontFamily: "ui-monospace, monospace" }}>{d.progress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* NVIDIA Reasoning */}
      <div style={{ background: "#0c0f1d", border: "1px solid #1a2438", borderRadius: 9, padding: "10px 12px", flexShrink: 0 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "#46566e", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
          🟢 NVIDIA Reasoning
        </p>
        <p style={{ fontSize: 11, color: "#8b97b2", lineHeight: 1.65 }}>{d.reasoning || "Waiting for agent assignment…"}</p>
      </div>

      {/* Stats 2x2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, flexShrink: 0 }}>
        {[
          { label: "Priority", value: d.priority.toUpperCase(),            color: PRIORITY_CFG[d.priority].color },
          { label: "ETA",      value: d.eta,                               color: "#8b97b2" },
          { label: "Project",  value: d.project,                           color: "#8b97b2" },
          { label: "Progress", value: `${d.progress}%`,                    color: d.agentColor },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#0c0f1d", border: "1px solid #1a2438", borderRadius: 8, padding: "8px 10px" }}>
            <p style={{ fontSize: 9, color: "#46566e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
            <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 700, color, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Files */}
      {d.files.length > 0 && (
        <div style={{ background: "#0c0f1d", border: "1px solid #1a2438", borderRadius: 9, padding: "10px 12px", flexShrink: 0 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#46566e", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>📁 Files Modified</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {d.files.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.03)", borderRadius: 5, padding: "3px 8px" }}>
                <span style={{ color: d.agentColor, fontSize: 9 }}>▸</span>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "#8b97b2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live output */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#03040a", border: "1px solid #1a2438", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ padding: "7px 10px", borderBottom: "1px solid #1a2438", background: "#0a0c14", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#46566e", textTransform: "uppercase", letterSpacing: "0.6px" }}>▶ NVIDIA Agent Output</span>
          {isLive && <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          <AnimatePresence initial={false}>
            {liveLog.map((line, i) => (
              <motion.p
                key={i + line}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "#46566e", lineHeight: 1.6 }}
              >
                <span style={{ color: "#283650", marginRight: 6 }}>›</span>
                {line}
              </motion.p>
            ))}
          </AnimatePresence>
          <div ref={logEnd} />
        </div>
        {isLive && (
          <div style={{ padding: "5px 10px", borderTop: "1px solid #1a2438", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "#283650" }}>▶</span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 0.9 }}
              style={{ display: "inline-block", width: 1.5, height: 11, background: "#34d399", borderRadius: 1 }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Metrics bar ────────────────────────────────────────────────────────────

function MetricsBar({ nodes }: { nodes: Node<TaskNodeData>[] }) {
  const counts = {
    total:     nodes.length,
    running:   nodes.filter((n) => n.data.status === "running").length,
    completed: nodes.filter((n) => n.data.status === "completed").length,
    queued:    nodes.filter((n) => n.data.status === "queued").length,
    blocked:   nodes.filter((n) => n.data.status === "blocked").length,
    failed:    nodes.filter((n) => n.data.status === "failed").length,
  };
  const health = Math.round(((counts.completed + counts.running * 0.5) / counts.total) * 100);
  const agents = new Set(nodes.filter((n) => n.data.status === "running").map((n) => n.data.agent)).size;

  const items = [
    { label: "Total Tasks",   value: counts.total,     color: "#8b97b2" },
    { label: "Running",       value: counts.running,   color: "#34d399" },
    { label: "Completed",     value: counts.completed, color: "#38bdf8" },
    { label: "Queued",        value: counts.queued,    color: "#f59e0b" },
    { label: "Blocked",       value: counts.blocked,   color: counts.blocked > 0 ? "#f59e0b" : "#46566e" },
    { label: "Failed",        value: counts.failed,    color: counts.failed  > 0 ? "#f43f5e" : "#46566e" },
    { label: "Health",        value: `${health}%`,     color: health > 80 ? "#34d399" : health > 50 ? "#f59e0b" : "#f43f5e" },
    { label: "Active Agents", value: agents,           color: "#a78bfa" },
  ];

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "10px 20px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        overflowX: "auto",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 10, flexShrink: 0 }}>
        <div
          style={{
            width: 34, height: 34, borderRadius: 9,
            background: "linear-gradient(135deg, #6366f1, #a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: "0 0 14px rgba(99,102,241,0.35)",
          }}
        >
          🕸
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#edf2fa", letterSpacing: "-0.3px" }}>
            AI Orchestration Graph
          </div>
          <div style={{ fontSize: 10, color: "#46566e" }}>
            NVIDIA · factory_cycle · task dependencies
            <span style={{ marginLeft: 8, padding: "1px 7px", borderRadius: 99, background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontSize: 9, fontWeight: 700, letterSpacing: "0.5px" }}>
              SIMULATION
            </span>
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 32, background: "var(--border)", marginRight: 6, flexShrink: 0 }} />

      {items.map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "5px 12px", flexShrink: 0,
            background: "var(--bg-2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            minWidth: 54,
          }}
        >
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 17, fontWeight: 800, color, lineHeight: 1 }}>
            {value}
          </span>
          <span style={{ fontSize: 9, color: "#46566e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TaskGraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TaskNodeData>>(INIT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(INIT_NODES));
  const [selectedId, setSelectedId]     = useState<string | null>("p3-auth");
  const [liveLog,    setLiveLog]        = useState<string[]>(LIVE_LOG_POOL.slice(0, 4));

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // ── Live orchestration simulation ──────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      const current = nodesRef.current;
      const currentEdges = edgesRef.current;

      // Progress running nodes
      let next = current.map((node) => {
        const d = node.data;
        if (d.status !== "running") return node;
        const newProg = Math.min(100, d.progress + Math.floor(Math.random() * 8) + 3);
        return {
          ...node,
          data: {
            ...d,
            progress: newProg,
            status: (newProg >= 100 ? "completed" : "running") as TaskStatus,
            eta: newProg >= 100 ? "done" : d.eta,
          },
        };
      });

      // Start queued nodes whose deps are all completed
      const completedIds = new Set(next.filter((n) => n.data.status === "completed").map((n) => n.id));
      const startable = next.filter((n) => {
        if (n.data.status !== "queued") return false;
        const deps = currentEdges.filter((e) => e.target === n.id).map((e) => e.source);
        if (deps.length === 0) return false;
        return deps.every((id) => completedIds.has(id));
      });

      // Start up to 2 new nodes
      const toStart = new Set(startable.slice(0, 2).map((n) => n.id));
      next = next.map((n) =>
        toStart.has(n.id)
          ? { ...n, data: { ...n.data, status: "running" as TaskStatus, progress: Math.floor(Math.random() * 8) + 2 } }
          : n
      );

      setNodes(next);

      // Sync edge styles
      const nodeMap = new Map(next.map((n) => [n.id, n]));
      setEdges(
        currentEdges.map((e) => {
          const src = nodeMap.get(e.source);
          if (!src) return e;
          const d   = src.data;
          const isActive = d.status === "running";
          const isDone   = d.status === "completed";
          return {
            ...e,
            animated: isActive,
            style: {
              stroke:           isDone ? d.agentColor + "55" : isActive ? d.agentColor : "#1a2438",
              strokeWidth:      isActive ? 2.5 : 1.5,
              strokeDasharray:  (!isDone && !isActive) ? "5 4" : undefined,
            },
            markerEnd: {
              type:   MarkerType.ArrowClosed,
              color:  isDone ? d.agentColor + "55" : isActive ? d.agentColor : "#283650",
              width:  14,
              height: 14,
            },
          };
        })
      );

      // Rolling log
      if (Math.random() < 0.65) {
        setLiveLog((prev) => [
          ...prev.slice(-18),
          LIVE_LOG_POOL[Math.floor(Math.random() * LIVE_LOG_POOL.length)],
        ]);
      }
    }, 2_600);

    return () => clearInterval(tick);
  }, []); // uses refs — no dep list needed

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      {/* Metrics bar */}
      <MetricsBar nodes={nodes} />

      {/* Body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* ── React Flow graph ── */}
        <div style={{ flex: 1, position: "relative" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
            style={{ background: "transparent" }}
            minZoom={0.3}
            maxZoom={1.8}
          >
            {/* Dark dot grid */}
            <Background
              variant={BackgroundVariant.Dots}
              color="rgba(255,255,255,0.045)"
              gap={22}
              size={1.2}
            />

            {/* Controls */}
            <Controls
              style={{
                background: "#0c0f1d",
                border: "1px solid #1a2438",
                borderRadius: 10,
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              }}
            />

            {/* Minimap */}
            <MiniMap
              nodeColor={(n) => {
                const d = n.data as TaskNodeData;
                const st = STATUS_CFG[d.status as TaskStatus];
                return st?.color ?? "#1a2438";
              }}
              style={{
                background: "#0c0f1d",
                border: "1px solid #1a2438",
                borderRadius: 10,
              }}
              maskColor="rgba(0,0,0,0.5)"
            />
          </ReactFlow>
        </div>

        {/* ── Inspector panel ── */}
        <div
          style={{
            width: 300,
            flexShrink: 0,
            borderLeft: "1px solid #1a2438",
            background: "#08090f",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 14px 9px",
              borderBottom: "1px solid #1a2438",
              display: "flex", alignItems: "center", gap: 7,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 12 }}>🔬</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#46566e", textTransform: "uppercase", letterSpacing: "0.7px" }}>
              Inspector
            </span>
            {selectedNode?.data.status === "running" && (
              <span style={{
                marginLeft: "auto", fontSize: 9, fontWeight: 700,
                color: "#34d399", background: "rgba(16,185,129,0.12)",
                padding: "1px 8px", borderRadius: 99,
              }}>
                LIVE
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflow: "hidden", padding: "12px 14px" }}>
            <Inspector node={selectedNode} liveLog={liveLog} />
          </div>
        </div>
      </div>
    </div>
  );
}
