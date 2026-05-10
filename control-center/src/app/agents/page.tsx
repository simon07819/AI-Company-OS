"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  GitBranch, Monitor, Server, FlaskConical, Rocket,
  Zap, X, Clock, CheckCircle2, Activity,
  FileCode2, Cpu, ArrowUpRight, Plus, BarChart3,
  Target, ChevronRight, ShieldCheck, MessageSquare, Hash,
  AlertCircle, Layers, Sparkles, type LucideIcon,
} from "lucide-react";
import { AGENTS, type AgentDef } from "@/lib/agents";

type AgentIcon = LucideIcon;

interface AgentMeta {
  icon: AgentIcon;
  emoji: string;
  specialty: string;
  personality: string;
  model: string;
  tasksCompleted: number;
  successRate: number;
  lastActivity: string;
  tasksRunning: number;
  currentTask: string | null;
  recentFiles: string[];
  recentLogs: string[];
  capabilities: string[];
  limits: string[];
}

const AGENT_META: Record<string, AgentMeta> = {
  product_agent: {
    icon: Target,
    emoji: "🎯",
    specialty: "Product Strategy & Roadmapping",
    personality: "Strategic thinker. Translates vague ideas into precise specs. Pushes back on scope creep.",
    model: "llama-3.1-70b-instruct",
    tasksCompleted: 147,
    successRate: 97,
    lastActivity: "2 min ago",
    tasksRunning: 2,
    currentTask: "Generating Q3 roadmap for SaaS billing module",
    recentFiles: [
      "docs/roadmap_q3_2025.md",
      "docs/prd_billing_v2.md",
      "docs/user_stories_onboarding.md",
    ],
    recentLogs: [
      "PRD generated: billing_v2 · 3,241 tokens · 1.4s",
      "Roadmap updated: 7 milestones defined",
      "User story set created: 24 stories for auth flow",
      "Acceptance criteria written for onboarding step 3",
    ],
    capabilities: [
      "Generates full PRDs from a single sentence prompt",
      "Breaks epics into granular user stories",
      "Defines measurable acceptance criteria",
      "Prioritizes features by business impact",
      "Detects scope creep and flags blockers",
    ],
    limits: [
      "Does not write code or run tests",
      "Cannot access external databases directly",
      "Relies on human input for market research",
    ],
  },
  architect_agent: {
    icon: GitBranch,
    emoji: "🏗️",
    specialty: "System Architecture & API Design",
    personality: "Opinionated and precise. Enforces clean contracts between services. Hates ambiguity.",
    model: "llama-3.1-70b-instruct",
    tasksCompleted: 89,
    successRate: 99,
    lastActivity: "5 min ago",
    tasksRunning: 1,
    currentTask: "Designing API contract for payment webhook service",
    recentFiles: [
      "docs/architecture_v3.md",
      "docs/api_contract_billing.yaml",
      "docs/integration_patterns.md",
    ],
    recentLogs: [
      "Architecture ADR created: microservice split for billing",
      "OpenAPI 3.1 spec generated: 18 endpoints",
      "Environment variables documented: .env.example updated",
      "Integration pattern defined: event-driven billing flow",
    ],
    capabilities: [
      "Produces Architecture Decision Records (ADRs)",
      "Designs OpenAPI 3.1 compliant API specs",
      "Maps integration patterns between services",
      "Documents environment configurations",
      "Identifies single points of failure",
    ],
    limits: [
      "Does not implement the designed architecture",
      "Cannot validate live infrastructure",
      "Assumes team follows defined contracts",
    ],
  },
  frontend_agent: {
    icon: Monitor,
    emoji: "🎨",
    specialty: "Next.js UI & Component Engineering",
    personality: "Detail-obsessed. Pixel-perfect. Cares deeply about UX and accessibility.",
    model: "llama-3.1-70b-instruct",
    tasksCompleted: 214,
    successRate: 96,
    lastActivity: "30 sec ago",
    tasksRunning: 3,
    currentTask: "Building dashboard analytics page with chart components",
    recentFiles: [
      "src/app/dashboard/page.tsx",
      "src/components/ChartCard.tsx",
      "src/components/MetricWidget.tsx",
      "src/styles/globals.css",
    ],
    recentLogs: [
      "Component generated: DashboardCard.tsx · 312 lines",
      "Landing page created: hero + features + CTA sections",
      "Pricing page built: 3 tiers, toggle annual/monthly",
      "CSS tokens synced: 47 design tokens from Figma export",
    ],
    capabilities: [
      "Generates full Next.js 14 pages with App Router",
      "Builds Tailwind + shadcn/ui components",
      "Implements responsive layouts and animations",
      "Creates onboarding flows and wizard UIs",
      "Ensures WCAG AA accessibility compliance",
    ],
    limits: [
      "Does not write backend API routes",
      "Cannot manage database schemas",
      "Relies on design specs for brand decisions",
    ],
  },
  backend_agent: {
    icon: Server,
    emoji: "⚙️",
    specialty: "API Routes, Database & Server Logic",
    personality: "Reliable and thorough. Handles edge cases nobody thinks of. Obsessed with data integrity.",
    model: "llama-3.1-70b-instruct",
    tasksCompleted: 178,
    successRate: 94,
    lastActivity: "1 min ago",
    tasksRunning: 2,
    currentTask: "Creating Stripe webhook handler with idempotency keys",
    recentFiles: [
      "src/app/api/billing/webhook/route.ts",
      "src/lib/billing.ts",
      "prisma/schema.prisma",
      "prisma/migrations/20250510_add_subscriptions.sql",
    ],
    recentLogs: [
      "API route created: POST /api/billing/webhook",
      "Prisma schema updated: subscriptions table added",
      "Auth middleware written: JWT + session validation",
      "Email utility created: Resend integration",
    ],
    capabilities: [
      "Creates Next.js API routes with Zod validation",
      "Generates Prisma schemas and migrations",
      "Writes auth, billing, and webhook handlers",
      "Builds lib/ utility modules (email, stripe, auth)",
      "Fallback agent for unmatched task routing",
    ],
    limits: [
      "Does not generate frontend UI components",
      "Cannot deploy or provision infrastructure",
      "Writes code to spec — requires API contract as input",
    ],
  },
  qa_agent: {
    icon: FlaskConical,
    emoji: "🔬",
    specialty: "Testing, Quality & Coverage Assurance",
    personality: "Skeptical by design. Assumes everything will break. Finds edge cases before production does.",
    model: "llama-3.1-70b-instruct",
    tasksCompleted: 132,
    successRate: 91,
    lastActivity: "8 min ago",
    tasksRunning: 1,
    currentTask: "Writing Playwright e2e tests for auth flow — 12 scenarios",
    recentFiles: [
      "tests/e2e/auth.spec.ts",
      "tests/unit/billing.test.ts",
      "tests/integration/api.test.ts",
    ],
    recentLogs: [
      "E2E suite created: auth flow · 12 test scenarios",
      "Unit tests written: billing module · 94% coverage",
      "API integration tests: 18 endpoints validated",
      "Performance budget check: LCP 1.2s, FID 18ms ✓",
    ],
    capabilities: [
      "Writes Playwright end-to-end test suites",
      "Creates Vitest unit and integration tests",
      "Generates pytest test files for Python modules",
      "Defines coverage targets and test strategies",
      "Flags accessibility and performance issues",
    ],
    limits: [
      "Does not fix the bugs it finds",
      "Cannot run tests against live environments",
      "Requires working code to test against",
    ],
  },
  devops_agent: {
    icon: Rocket,
    emoji: "🚀",
    specialty: "CI/CD, Docker & Deployment Automation",
    personality: "Infrastructure as code evangelist. Automates everything. Zero-downtime or nothing.",
    model: "llama-3.1-70b-instruct",
    tasksCompleted: 98,
    successRate: 98,
    lastActivity: "15 min ago",
    tasksRunning: 1,
    currentTask: "Configuring GitHub Actions pipeline with staging + prod environments",
    recentFiles: [
      ".github/workflows/ci.yml",
      "Dockerfile",
      ".dockerignore",
      "vercel.json",
    ],
    recentLogs: [
      "GitHub Actions workflow created: lint → test → build → deploy",
      "Dockerfile optimized: multi-stage build, 280MB image",
      "Vercel config generated: preview + production environments",
      "Environment secrets documented: .env.example updated",
    ],
    capabilities: [
      "Creates GitHub Actions CI/CD workflows",
      "Writes Dockerfiles with multi-stage builds",
      "Generates Vercel and cloud deployment configs",
      "Defines staging and production pipelines",
      "Automates build, test, and release steps",
    ],
    limits: [
      "Does not manage cloud provider accounts",
      "Cannot access live deployment environments",
      "Requires existing CI platform credentials",
    ],
  },
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface RuntimeState {
  tasksRunning: number;
  tasksCompleted: number;
  successRate: number;
  lastActivity: string;
  currentTask: string | null;
  status: "active" | "idle" | "busy";
}

function getInitialRuntime(agentId: string): RuntimeState {
  const meta = AGENT_META[agentId];
  return {
    tasksRunning: meta.tasksRunning,
    tasksCompleted: meta.tasksCompleted,
    successRate: meta.successRate,
    lastActivity: meta.lastActivity,
    currentTask: meta.currentTask,
    status: meta.tasksRunning > 1 ? "busy" : meta.tasksRunning === 1 ? "active" : "idle",
  };
}

const ACTIVITY_LABELS = ["just now", "30 sec ago", "1 min ago", "2 min ago", "3 min ago", "5 min ago"];

const STATUS_STYLES = {
  active: { bg: "rgba(16,185,129,0.12)", color: "#34d399", label: "Active", dot: "#10b981" },
  busy:   { bg: "rgba(99,102,241,0.12)",  color: "#a5b4fc", label: "Busy",   dot: "#6366f1" },
  idle:   { bg: "rgba(148,163,184,0.08)", color: "#94a3b8", label: "Idle",   dot: "#64748b" },
};

function StatusPill({ status }: { status: "active" | "idle" | "busy" }) {
  const s = STATUS_STYLES[status];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: s.bg, border: `1px solid ${s.dot}30` }}>
      <motion.div
        style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }}
        animate={status !== "idle" ? { opacity: [1, 0.3, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span style={{ fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: "0.04em" }}>{s.label}</span>
    </div>
  );
}

function AgentCard({
  agent,
  runtime,
  isSelected,
  onClick,
}: {
  agent: AgentDef;
  runtime: RuntimeState;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meta = AGENT_META[agent.id];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: `1px solid ${isSelected ? agent.color : "var(--border)"}`,
        borderTop: `3px solid ${agent.color}`,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: isSelected
          ? `0 0 0 1px ${agent.color}40, 0 4px 24px ${agent.color}18`
          : "0 2px 8px rgba(0,0,0,0.18)",
      }}
    >
      {/* Subtle gradient overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 60% 40% at 80% 0%, ${agent.color}0a 0%, transparent 70%)`,
      }} />

      {/* Card header */}
      <div style={{ padding: "18px 18px 14px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: `${agent.color}16`,
              border: `1px solid ${agent.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}>
              {meta.emoji}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.2 }}>{agent.name}</div>
              <div style={{ fontSize: 10, color: agent.color, fontFamily: "ui-monospace, monospace", marginTop: 2 }}>{agent.id}</div>
            </div>
          </div>
          <StatusPill status={runtime.status} />
        </div>

        <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, marginBottom: 0 }}>{agent.role}</p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: `linear-gradient(90deg, ${agent.color}20, transparent)` }} />

      {/* Metrics row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
        {[
          { label: "Completed", value: runtime.tasksCompleted.toLocaleString(), color: "var(--text-1)" },
          { label: "Running", value: runtime.tasksRunning, color: runtime.tasksRunning > 0 ? "#a5b4fc" : "var(--text-3)" },
          { label: "Success", value: `${runtime.successRate}%`, color: runtime.successRate >= 95 ? "#34d399" : "#fbbf24" },
        ].map((m, i) => (
          <div
            key={m.label}
            style={{
              padding: "10px 14px",
              borderRight: i < 2 ? "1px solid var(--border)" : "none",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)" }} />

      {/* Model + last activity */}
      <div style={{ padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Zap size={10} color="#76b900" />
          <span style={{ fontSize: 10, color: "#a3d977", fontFamily: "ui-monospace, monospace" }}>{meta.model}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={10} color="var(--text-3)" />
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>{runtime.lastActivity}</span>
        </div>
      </div>

      {/* Current task */}
      {runtime.currentTask && (
        <div style={{ padding: "0 18px 12px" }}>
          <div style={{ background: `${agent.color}0e`, border: `1px solid ${agent.color}20`, borderRadius: 7, padding: "7px 10px" }}>
            <div style={{ fontSize: 9, color: agent.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Current task</div>
            <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {runtime.currentTask}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "0 18px 16px", display: "flex", gap: 8 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 7, border: `1px solid ${agent.color}40`,
            background: `${agent.color}0e`, color: agent.color,
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            transition: "background 0.12s",
          }}
        >
          <BarChart3 size={11} />
          View Details
          <ChevronRight size={10} />
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 7, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-2)",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            transition: "background 0.12s",
          }}
        >
          <Plus size={11} />
          Assign Task
        </button>
      </div>
    </motion.div>
  );
}

function DetailPanel({
  agent,
  runtime,
  onClose,
}: {
  agent: AgentDef;
  runtime: RuntimeState;
  onClose: () => void;
}) {
  const meta = AGENT_META[agent.id];

  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ duration: 0.22 }}
      style={{
        width: 360, flexShrink: 0,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderTop: `3px solid ${agent.color}`,
        borderRadius: 12,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        maxHeight: "100%",
      }}
    >
      {/* Panel header */}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: `${agent.color}16`, border: `1px solid ${agent.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>
          {meta.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>{agent.name}</div>
          <div style={{ fontSize: 10, color: agent.color, fontFamily: "ui-monospace, monospace" }}>{meta.specialty}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4, borderRadius: 6 }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        {/* Personality */}
        <div style={{ background: `${agent.color}08`, border: `1px solid ${agent.color}20`, borderRadius: 8, padding: "10px 12px", marginBottom: 18 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: agent.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
            <span style={{ marginRight: 4 }}>★</span>Personality
          </div>
          <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>{meta.personality}</p>
        </div>

        {/* NVIDIA model */}
        <PanelSection label="NVIDIA Integration" icon={<Zap size={12} color="#76b900" />}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(118,185,0,0.07)", borderRadius: 7, border: "1px solid rgba(118,185,0,0.18)" }}>
            <Cpu size={13} color="#76b900" />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#a3d977" }}>{meta.model}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)" }}>NVIDIA API · 8k context · 0.3 temp</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#34d399" }}>
              <motion.div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981" }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              Live
            </div>
          </div>
        </PanelSection>

        {/* Live metrics */}
        <PanelSection label="Live Metrics" icon={<Activity size={12} color="var(--text-3)" />}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Tasks Done", value: runtime.tasksCompleted.toLocaleString(), color: "var(--text-1)" },
              { label: "Running Now", value: runtime.tasksRunning, color: runtime.tasksRunning > 0 ? "#a5b4fc" : "var(--text-3)" },
              { label: "Success Rate", value: `${runtime.successRate}%`, color: runtime.successRate >= 95 ? "#34d399" : "#fbbf24" },
              { label: "Last Active", value: runtime.lastActivity, color: "var(--text-3)" },
            ].map((m) => (
              <div key={m.label} style={{ background: "rgba(255,255,255,0.035)", borderRadius: 7, padding: "9px 10px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </PanelSection>

        {/* Current task */}
        {runtime.currentTask && (
          <PanelSection label="Current Task" icon={<Activity size={12} color={agent.color} />}>
            <div style={{ background: `${agent.color}0a`, border: `1px solid ${agent.color}20`, borderRadius: 7, padding: "9px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                <motion.div style={{ width: 6, height: 6, borderRadius: "50%", background: agent.color }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: agent.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>In Progress</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>{runtime.currentTask}</p>
            </div>
          </PanelSection>
        )}

        {/* Capabilities */}
        <PanelSection label="Capabilities" icon={<CheckCircle2 size={12} color="var(--text-3)" />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {meta.capabilities.map((cap) => (
              <div key={cap} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11, color: "var(--text-2)", lineHeight: 1.4 }}>
                <CheckCircle2 size={12} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
                {cap}
              </div>
            ))}
          </div>
        </PanelSection>

        {/* Limits */}
        <PanelSection label="Limits" icon={<AlertCircle size={12} color="var(--text-3)" />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {meta.limits.map((lim) => (
              <div key={lim} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>
                <div style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--border)", border: "1px solid var(--text-3)" }} />
                </div>
                {lim}
              </div>
            ))}
          </div>
        </PanelSection>

        {/* Routing keywords */}
        <PanelSection label="Routing Keywords" icon={<Hash size={12} color="var(--text-3)" />}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {agent.keywords.map((kw) => (
              <span
                key={kw}
                style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 5,
                  background: `${agent.color}12`, color: agent.color,
                  border: `1px solid ${agent.color}25`,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        </PanelSection>

        {/* Recent files */}
        <PanelSection label="Recent Files" icon={<FileCode2 size={12} color="var(--text-3)" />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {meta.recentFiles.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, background: "rgba(255,255,255,0.03)" }}>
                <FileCode2 size={11} color="#818cf8" />
                <span style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#818cf8" }}>{f}</span>
              </div>
            ))}
          </div>
        </PanelSection>

        {/* Recent logs */}
        <PanelSection label="Recent Activity" icon={<MessageSquare size={12} color="var(--text-3)" />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {meta.recentLogs.map((log, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "5px 8px", borderRadius: 6, background: "rgba(255,255,255,0.025)", borderLeft: `2px solid ${agent.color}40` }}>
                <span style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.5 }}>{log}</span>
              </div>
            ))}
          </div>
        </PanelSection>
      </div>

      {/* Panel footer */}
      <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <Link
          href="/agents/activity"
          style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-2)",
            fontSize: 11, fontWeight: 600, cursor: "pointer", textDecoration: "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}
        >
          <Activity size={12} />
          Live Feed
        </Link>
        <button
          style={{
            flex: 2, padding: "8px 0", borderRadius: 8, border: `1px solid ${agent.color}50`,
            background: `${agent.color}14`, color: agent.color,
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}
        >
          <Plus size={12} />
          Assign New Task
          <ArrowUpRight size={11} />
        </button>
      </div>
    </motion.div>
  );
}

function PanelSection({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

export default function AgentsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [runtimes, setRuntimes] = useState<Record<string, RuntimeState>>(
    () => Object.fromEntries(AGENTS.map((a) => [a.id, getInitialRuntime(a.id)]))
  );

  // Simulate live runtime updates
  useEffect(() => {
    const iv = setInterval(() => {
      setRuntimes((prev) => {
        const next = { ...prev };
        for (const agentId of Object.keys(next)) {
          const cur = next[agentId];
          // Occasionally tick up tasks completed, shift activity label
          if (Math.random() > 0.7) {
            const meta = AGENT_META[agentId];
            const newCompleted = cur.tasksCompleted + (Math.random() > 0.5 ? 1 : 0);
            const newRunning = rand(0, meta.tasksRunning + 1) > 2 ? rand(1, 3) : cur.tasksRunning;
            next[agentId] = {
              ...cur,
              tasksCompleted: newCompleted,
              tasksRunning: newRunning,
              status: newRunning > 1 ? "busy" : newRunning === 1 ? "active" : "idle",
              lastActivity: ACTIVITY_LABELS[rand(0, 2)],
            };
          }
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const selectedAgent = AGENTS.find((a) => a.id === selected) ?? null;

  const totalRunning = Object.values(runtimes).reduce((s, r) => s + r.tasksRunning, 0);
  const activeCount = Object.values(runtimes).filter((r) => r.status !== "idle").length;
  const avgSuccess = Math.round(Object.values(runtimes).reduce((s, r) => s + r.successRate, 0) / AGENTS.length);

  return (
    <main className="page" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", padding: 0 }}>
      {/* Page header */}
      <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div>
            <h1 className="page-title">AI Team Command Center</h1>
            <p className="page-subtitle">6 specialized agents · NVIDIA API · autonomous task execution</p>
          </div>
          <div className="page-actions" style={{ display: "flex", gap: 10 }}>
            <Link href="/agents/activity" className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              <motion.div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              Live Activity
            </Link>
            <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={13} />
              New Task
            </button>
          </div>
        </div>

        {/* Team overview bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total Agents",  value: AGENTS.length,        color: "var(--text-1)",  icon: <Layers size={13} color="var(--text-3)" /> },
            { label: "Active Now",    value: activeCount,           color: "#a5b4fc",        icon: <Activity size={13} color="#6366f1" /> },
            { label: "Running Tasks", value: totalRunning,          color: "#22d3ee",        icon: <Sparkles size={13} color="#06b6d4" /> },
            { label: "NVIDIA API",    value: "Online",              color: "#a3d977",        icon: <Zap size={13} color="#76b900" /> },
            { label: "Team Health",   value: `${avgSuccess}%`,      color: "#34d399",        icon: <ShieldCheck size={13} color="#10b981" /> },
            { label: "Throughput",    value: `${rand(18, 26)}/hr`,  color: "var(--text-2)",  icon: <BarChart3 size={13} color="var(--text-3)" /> },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 9, padding: "8px 14px",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {m.icon}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 14, padding: "0 24px 24px", minHeight: 0 }}>
        {/* Agent grid — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: selectedAgent
              ? "repeat(auto-fill, minmax(280px, 1fr))"
              : "repeat(auto-fill, minmax(310px, 1fr))",
            gap: 14,
            alignItems: "start",
          }}>
            <AnimatePresence>
              {AGENTS.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  runtime={runtimes[agent.id]}
                  isSelected={selected === agent.id}
                  onClick={() => setSelected((prev) => prev === agent.id ? null : agent.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedAgent && (
            <div style={{ flexShrink: 0, overflowY: "auto" }}>
              <DetailPanel
                agent={selectedAgent}
                runtime={runtimes[selectedAgent.id]}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
