"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Zap, ArrowRight, ArrowUpRight, Play, Activity, CheckCircle2,
  Cpu, Target, BarChart3, Shield, Layers, Sparkles, TrendingUp, Network,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

type StepStatus = "pending" | "running" | "done";

interface BuildStep {
  id: number;
  agent: string;
  emoji: string;
  agentColor: string;
  task: string;
  detail: string;
  duration: string;
  status: StepStatus;
}

interface NvidiaLog {
  id: string;
  ts: string;
  tokens: number;
  latency: number;
  agent: string;
  task: string;
}

interface MetricState {
  projects: number;
  tasks: number;
  validations: number;
  builds: number;
  nvidiaInferences: number;
  successRate: number;
  uptimeHours: number;
  throughput: number;
}

// ── Constants ──────────────────────────────────────────────────────

const BUILD_SEQUENCE: Omit<BuildStep, "status">[] = [
  { id: 1, agent: "Product Agent",   emoji: "🎯", agentColor: "#a78bfa", task: "Roadmap generation",  detail: "6 milestones · 24 user stories · acceptance criteria", duration: "1.4s" },
  { id: 2, agent: "Architect Agent", emoji: "🏗️", agentColor: "#f59e0b", task: "System architecture", detail: "API contracts · DB schema · service map · ADRs",          duration: "2.1s" },
  { id: 3, agent: "Frontend Agent",  emoji: "🎨", agentColor: "#3b82f6", task: "UI generation",        detail: "Landing · dashboard · pricing · auth flow — 8 pages",   duration: "3.8s" },
  { id: 4, agent: "Backend Agent",   emoji: "⚙️", agentColor: "#10b981", task: "API routes & DB",      detail: "18 endpoints · Prisma schema · auth · billing webhook",  duration: "2.9s" },
  { id: 5, agent: "QA Agent",        emoji: "🔬", agentColor: "#ef4444", task: "Test generation",      detail: "42 e2e tests · Vitest units · 94% coverage target",       duration: "1.6s" },
  { id: 6, agent: "DevOps Agent",    emoji: "🚀", agentColor: "#6c63ff", task: "CI/CD pipeline",       detail: "GitHub Actions · Docker multi-stage · Vercel deploy",      duration: "1.2s" },
  { id: 7, agent: "Build Runner",    emoji: "🔧", agentColor: "#06b6d4", task: "Production build",     detail: "0 errors · 284kB bundle · deployed to production",         duration: "38.4s" },
];

const AGENTS_LIVE = [
  { id: "product_agent",   emoji: "🎯", name: "Product",   color: "#a78bfa", task: "Q3 roadmap generation",     progress: 72 },
  { id: "architect_agent", emoji: "🏗️", name: "Architect", color: "#f59e0b", task: "API contract design",        progress: 48 },
  { id: "frontend_agent",  emoji: "🎨", name: "Frontend",  color: "#3b82f6", task: "Dashboard UI generation",    progress: 89 },
  { id: "backend_agent",   emoji: "⚙️", name: "Backend",   color: "#10b981", task: "Stripe webhook handler",     progress: 61 },
  { id: "qa_agent",        emoji: "🔬", name: "QA",        color: "#ef4444", task: "Auth flow e2e test suite",   progress: 33 },
  { id: "devops_agent",    emoji: "🚀", name: "DevOps",    color: "#6c63ff", task: "GitHub Actions workflow",    progress: 55 },
];

const NVIDIA_POOL = [
  { agent: "product_agent",   task: "Roadmap synthesis",     tokens: 1842, latency: 1240 },
  { agent: "architect_agent", task: "API contract gen",      tokens: 2104, latency: 1870 },
  { agent: "frontend_agent",  task: "Component scaffold",    tokens: 3210, latency: 2140 },
  { agent: "backend_agent",   task: "Route generation",      tokens: 2890, latency: 1960 },
  { agent: "qa_agent",        task: "Test spec generation",  tokens: 1680, latency: 1120 },
  { agent: "devops_agent",    task: "CI/CD workflow gen",    tokens: 1340, latency: 890  },
];

const GRAPH_NODES = [
  { id: "idea",     x: 35,  y: 72,  label: "Idea",  color: "#a78bfa" },
  { id: "roadmap",  x: 115, y: 32,  label: "Plan",  color: "#f59e0b" },
  { id: "arch",     x: 115, y: 112, label: "Arch",  color: "#f59e0b" },
  { id: "frontend", x: 205, y: 18,  label: "UI",    color: "#3b82f6" },
  { id: "backend",  x: 205, y: 92,  label: "API",   color: "#10b981" },
  { id: "qa",       x: 295, y: 55,  label: "QA",    color: "#ef4444" },
  { id: "deploy",   x: 385, y: 55,  label: "Ship",  color: "#34d399" },
];

const GRAPH_EDGES: [string, string][] = [
  ["idea", "roadmap"],
  ["idea", "arch"],
  ["roadmap", "frontend"],
  ["arch", "backend"],
  ["frontend", "qa"],
  ["backend", "qa"],
  ["qa", "deploy"],
];

function genId() { return Math.random().toString(36).slice(2, 10); }
function nowTs() {
  return new Date().toLocaleTimeString("en-CA", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Section Wrapper ────────────────────────────────────────────────

function Section({ label, icon, accent, children }: {
  label: string;
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45 }}
      style={{ padding: "48px 40px 0" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        {icon}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{label}</h2>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${accent}40, transparent)`, marginLeft: 4 }} />
      </div>
      {children}
    </motion.section>
  );
}

// ── Hero Section ───────────────────────────────────────────────────

function HeroSection({ metrics }: { metrics: MetricState }) {
  return (
    <section style={{
      position: "relative", overflow: "hidden",
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "80px 40px 60px",
    }}>
      {/* Orb 1 — indigo */}
      <motion.div
        animate={{ x: [0, 50, 0], y: [0, -40, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          top: "-15%", left: "-5%",
          background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 68%)",
          filter: "blur(48px)", pointerEvents: "none",
        }}
      />
      {/* Orb 2 — green */}
      <motion.div
        animate={{ x: [0, -40, 0], y: [0, 50, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        style={{
          position: "absolute", width: 480, height: 480, borderRadius: "50%",
          bottom: "-5%", right: "5%",
          background: "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 68%)",
          filter: "blur(48px)", pointerEvents: "none",
        }}
      />
      {/* Orb 3 — purple */}
      <motion.div
        animate={{ x: [0, 25, 0], y: [0, 35, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        style={{
          position: "absolute", width: 350, height: 350, borderRadius: "50%",
          top: "30%", right: "25%",
          background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 68%)",
          filter: "blur(40px)", pointerEvents: "none",
        }}
      />

      {/* NVIDIA badge */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(118,185,0,0.08)", border: "1px solid rgba(118,185,0,0.28)",
          borderRadius: 24, padding: "5px 14px", marginBottom: 30,
        }}
      >
        <motion.div
          style={{ width: 6, height: 6, borderRadius: "50%", background: "#76b900" }}
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <Zap size={11} color="#76b900" />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#a3d977", letterSpacing: "0.07em" }}>
          POWERED BY NVIDIA API · llama-3.1-70b-instruct
        </span>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.1 }}
        style={{
          fontSize: "clamp(34px, 5.5vw, 72px)",
          fontWeight: 900, lineHeight: 1.06, textAlign: "center",
          maxWidth: 820, margin: "0 0 22px",
          background: "linear-gradient(140deg, #edf2fa 0%, #a5b4fc 45%, #34d399 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          letterSpacing: "-0.025em",
        }}
      >
        Autonomous AI Agency<br />Operating System
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          fontSize: "clamp(14px, 1.8vw, 18px)", color: "var(--text-2)",
          textAlign: "center", maxWidth: 540, margin: "0 0 38px",
          lineHeight: 1.7,
        }}
      >
        Six specialized AI agents. One orchestration engine.
        Ship complete SaaS products autonomously — from idea to production.
      </motion.p>

      {/* Live metric chips */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 38 }}
      >
        {([
          { label: "Projects Built",    value: metrics.projects,         suffix: "",  color: "#a5b4fc" },
          { label: "Tasks Completed",   value: metrics.tasks,            suffix: "",  color: "#34d399" },
          { label: "NVIDIA Inferences", value: metrics.nvidiaInferences, suffix: "",  color: "#a3d977" },
          { label: "Success Rate",      value: metrics.successRate,      suffix: "%", color: "#fbbf24" },
          { label: "Uptime",            value: metrics.uptimeHours,      suffix: "h", color: "var(--text-2)" },
        ] as const).map((m) => (
          <div
            key={m.label}
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 10, padding: "9px 18px", backdropFilter: "blur(10px)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: m.color, lineHeight: 1 }}>
              {typeof m.value === "number" ? m.value.toLocaleString() : m.value}{m.suffix}
            </div>
            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {m.label}
            </div>
          </div>
        ))}
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}
      >
        <Link
          href="/"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 26px", borderRadius: 10,
            background: "var(--accent)", color: "#fff",
            fontSize: 13, fontWeight: 700, textDecoration: "none",
            boxShadow: "0 0 28px rgba(99,102,241,0.45)",
          }}
        >
          Enter Control Center
          <ArrowUpRight size={14} />
        </Link>
        <Link
          href="/projects/new"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 26px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-1)",
            background: "rgba(255,255,255,0.045)", fontSize: 13, fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <Play size={12} />
          Start New Project
        </Link>
      </motion.div>

      {/* Live ticker */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        style={{
          position: "absolute", bottom: 28, left: 0, right: 0,
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 40px", overflow: "hidden",
        }}
      >
        <motion.div
          style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0 }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>
          live · frontend_agent: generating DashboardCard.tsx · backend_agent: POST /api/billing · qa_agent: auth e2e tests · devops_agent: CI/CD workflow · NVIDIA: 38 tok/s
        </span>
      </motion.div>
    </section>
  );
}

// ── Live Build Showcase ────────────────────────────────────────────

function BuildShowcase() {
  const [steps, setSteps] = useState<BuildStep[]>(
    BUILD_SEQUENCE.map((s, i) => ({ ...s, status: (i === 0 ? "running" : "pending") as StepStatus }))
  );
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % BUILD_SEQUENCE.length;
        setSteps(BUILD_SEQUENCE.map((s, i) => ({
          ...s,
          status: (i < next ? "done" : i === next ? "running" : "pending") as StepStatus,
        })));
        return next;
      });
    }, 2800);
    return () => clearInterval(iv);
  }, []);

  void activeIdx;

  return (
    <Section label="Live Build Simulation" icon={<Activity size={14} color="#818cf8" />} accent="#6366f1">
      <p style={{ fontSize: 12, color: "var(--text-3)", margin: "0 0 22px", lineHeight: 1.6 }}>
        Watch the AI agency build a complete SaaS — product roadmap to production deploy, fully autonomous.
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {steps.map((step, idx) => {
          const isActive = step.status === "running";
          const isDone = step.status === "done";
          return (
            <div key={step.id} style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
              {/* Timeline track */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 36 }}>
                <div style={{ flexShrink: 0 }}>
                  {isDone ? (
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(16,185,129,0.14)", border: "1.5px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CheckCircle2 size={13} color="#10b981" />
                    </div>
                  ) : isActive ? (
                    <motion.div
                      style={{ width: 26, height: 26, borderRadius: "50%", background: `${step.agentColor}16`, border: `2px solid ${step.agentColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}
                      animate={{ boxShadow: [`0 0 0 0 ${step.agentColor}50`, `0 0 0 8px ${step.agentColor}00`] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    >
                      <motion.div
                        style={{ width: 9, height: 9, borderRadius: "50%", background: step.agentColor }}
                        animate={{ scale: [1, 1.25, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    </motion.div>
                  ) : (
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.025)", border: "1.5px solid var(--border)" }} />
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div style={{
                    width: 2, flex: 1, minHeight: 20, margin: "3px 0",
                    background: isDone
                      ? "linear-gradient(180deg, #10b981, #10b98160)"
                      : "var(--border)",
                  }} />
                )}
              </div>

              {/* Content */}
              <motion.div
                animate={{ opacity: step.status === "pending" ? 0.4 : 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  flex: 1, padding: "7px 14px 14px 12px", marginBottom: 2,
                  background: isActive ? `${step.agentColor}07` : "transparent",
                  border: isActive ? `1px solid ${step.agentColor}20` : "1px solid transparent",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 16 }}>{step.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: step.agentColor }}>{step.agent}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>— {step.task}</span>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                    {isDone && (
                      <span style={{ fontSize: 9, color: "#34d399", fontFamily: "ui-monospace, monospace", background: "rgba(16,185,129,0.1)", padding: "1px 6px", borderRadius: 4 }}>
                        ✓ {step.duration}
                      </span>
                    )}
                    {isActive && (
                      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            style={{ width: 4, height: 4, borderRadius: "50%", background: step.agentColor }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.22 }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "ui-monospace, monospace" }}>
                  {step.detail}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ── Agent Live Panel ───────────────────────────────────────────────

function AgentLivePanel() {
  const [progresses, setProgresses] = useState(AGENTS_LIVE.map((a) => a.progress));

  useEffect(() => {
    const iv = setInterval(() => {
      setProgresses((prev) =>
        prev.map((p) => {
          const next = p + Math.random() * 5 - 1.5;
          if (next >= 98) return 8 + Math.random() * 10;
          return Math.max(5, Math.min(97, next));
        })
      );
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  return (
    <Section label="AI Team — Live" icon={<Layers size={14} color="#818cf8" />} accent="#6366f1">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
        {AGENTS_LIVE.map((agent, i) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            style={{
              background: "rgba(255,255,255,0.025)",
              border: `1px solid ${agent.color}28`,
              borderTop: `2.5px solid ${agent.color}`,
              borderRadius: 10, padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
              <span style={{ fontSize: 20 }}>{agent.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)" }}>{agent.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <motion.div
                    style={{ width: 5, height: 5, borderRadius: "50%", background: agent.color }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  />
                  <span style={{ fontSize: 9, color: agent.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</span>
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: agent.color }}>{Math.round(progresses[i])}%</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {agent.task}
            </div>
            <div style={{ height: 3, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
              <motion.div
                animate={{ width: `${progresses[i]}%` }}
                transition={{ duration: 0.9 }}
                style={{
                  height: "100%", borderRadius: 3,
                  background: `linear-gradient(90deg, ${agent.color}, ${agent.color}70)`,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ── Orchestration Graph ────────────────────────────────────────────

function OrchestrationGraph() {
  const nodeMap: Record<string, typeof GRAPH_NODES[0]> = {};
  for (const n of GRAPH_NODES) nodeMap[n.id] = n;

  return (
    <Section label="Orchestration Graph" icon={<Network size={14} color="#818cf8" />} accent="#6366f1">
      <p style={{ fontSize: 12, color: "var(--text-3)", margin: "0 0 16px", lineHeight: 1.6 }}>
        Live task dependency graph — agents execute in parallel along independent paths
      </p>
      <div style={{
        background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "24px 20px", overflow: "hidden",
      }}>
        <svg viewBox="0 0 425 140" width="100%" style={{ overflow: "visible" }}>
          {/* Edges */}
          {GRAPH_EDGES.map(([fromId, toId], i) => {
            const a = nodeMap[fromId];
            const b = nodeMap[toId];
            if (!a || !b) return null;
            const mx = (a.x + b.x) / 2;
            const d = `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
            return (
              <g key={`edge-${i}`}>
                {/* Base track */}
                <path d={d} stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
                {/* Animated flow */}
                <motion.path
                  d={d} fill="none" strokeLinecap="round"
                  stroke={a.color} strokeWidth={1.5}
                  strokeDasharray="5 9"
                  animate={{ strokeDashoffset: [0, -14] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
                  style={{ opacity: 0.65 }}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {GRAPH_NODES.map((node) => (
            <g key={node.id}>
              {/* Glow ring */}
              <circle cx={node.x} cy={node.y} r={19} fill={node.color} opacity={0.07} />
              {/* Main circle */}
              <circle cx={node.x} cy={node.y} r={14} fill={`${node.color}18`} stroke={node.color} strokeWidth={1.5} />
              {/* Label below */}
              <text
                x={node.x} y={node.y + 24}
                textAnchor="middle" fontSize={8}
                fill="rgba(139,151,178,0.9)"
                fontFamily="ui-monospace, monospace"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </Section>
  );
}

// ── Metrics Section ────────────────────────────────────────────────

function MetricsSection({ metrics }: { metrics: MetricState }) {
  const items = [
    { label: "Projects Built",      value: metrics.projects,                     color: "#a5b4fc", icon: <Target size={14} color="#a78bfa" /> },
    { label: "Tasks Completed",     value: metrics.tasks,                        color: "#34d399", icon: <CheckCircle2 size={14} color="#10b981" /> },
    { label: "Validations Passed",  value: metrics.validations,                  color: "var(--text-2)", icon: <Shield size={14} color="var(--text-3)" /> },
    { label: "Production Builds",   value: metrics.builds,                       color: "#22d3ee", icon: <BarChart3 size={14} color="#06b6d4" /> },
    { label: "NVIDIA Inferences",   value: metrics.nvidiaInferences,             color: "#a3d977", icon: <Cpu size={14} color="#76b900" /> },
    { label: "Success Rate",        value: `${metrics.successRate}%`,            color: "#fbbf24", icon: <TrendingUp size={14} color="#f59e0b" /> },
    { label: "Active Agents",       value: 6,                                    color: "var(--text-1)", icon: <Layers size={14} color="var(--text-2)" /> },
    { label: "Throughput / hr",     value: metrics.throughput,                   color: "var(--text-2)", icon: <Activity size={14} color="var(--text-3)" /> },
  ];

  return (
    <Section label="System Metrics — Live" icon={<BarChart3 size={14} color="#818cf8" />} accent="#6366f1">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
        {items.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            style={{
              background: "rgba(255,255,255,0.028)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              {m.icon}
              <span style={{ fontSize: 9, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {m.label}
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: m.color, lineHeight: 1 }}>
              {typeof m.value === "number" ? m.value.toLocaleString() : m.value}
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ── NVIDIA Inference Stream ────────────────────────────────────────

function NvidiaStream() {
  const [logs, setLogs] = useState<NvidiaLog[]>([]);

  useEffect(() => {
    const iv = setInterval(() => {
      const tmpl = NVIDIA_POOL[Math.floor(Math.random() * NVIDIA_POOL.length)];
      setLogs((prev) => [
        {
          id: genId(),
          ts: nowTs(),
          tokens: tmpl.tokens + Math.floor(Math.random() * 300 - 150),
          latency: tmpl.latency + Math.floor(Math.random() * 300 - 150),
          agent: tmpl.agent,
          task: tmpl.task,
        },
        ...prev,
      ].slice(0, 9));
    }, 1400);
    return () => clearInterval(iv);
  }, []);

  return (
    <Section label="NVIDIA Inference Stream" icon={<Zap size={14} color="#76b900" />} accent="#76b900">
      <div style={{
        background: "rgba(0,0,0,0.35)", border: "1px solid rgba(118,185,0,0.18)",
        borderRadius: 10, overflow: "hidden", fontFamily: "ui-monospace, monospace",
      }}>
        {/* Header bar */}
        <div style={{
          padding: "9px 16px", borderBottom: "1px solid rgba(118,185,0,0.1)",
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(118,185,0,0.04)",
        }}>
          <motion.div
            style={{ width: 7, height: 7, borderRadius: "50%", background: "#76b900" }}
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <span style={{ fontSize: 10, color: "#a3d977", fontWeight: 700 }}>
            llama-3.1-70b-instruct · NVIDIA API · Live
          </span>
          <span style={{ fontSize: 9, color: "var(--text-3)", marginLeft: "auto" }}>newest first</span>
        </div>

        {/* Log rows */}
        <div style={{ minHeight: 80 }}>
          {logs.length === 0 ? (
            <div style={{ padding: "18px 16px", fontSize: 11, color: "var(--text-3)" }}>
              Waiting for inferences…
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    padding: "7px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    display: "flex", alignItems: "center", gap: 10,
                    fontSize: 10,
                  }}
                >
                  <span style={{ color: "var(--text-3)", flexShrink: 0, minWidth: 56 }}>{log.ts}</span>
                  <span style={{ color: "#a3d977", flexShrink: 0 }}>⚡</span>
                  <span style={{ color: "#818cf8", flexShrink: 0, minWidth: 110 }}>{log.agent.replace("_", " ")}</span>
                  <span style={{ color: "var(--text-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.task}</span>
                  <span style={{ color: "#a3d977", flexShrink: 0 }}>{log.tokens.toLocaleString()} tok</span>
                  <span style={{ color: "var(--text-3)", flexShrink: 0 }}>{log.latency}ms</span>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </Section>
  );
}

// ── CTA Section ────────────────────────────────────────────────────

function CTASection() {
  return (
    <section style={{
      position: "relative", overflow: "hidden",
      padding: "72px 40px 80px",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      textAlign: "center",
    }}>
      {/* Background glow */}
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", width: 700, height: 320,
          background: "radial-gradient(ellipse, rgba(99,102,241,0.13) 0%, transparent 68%)",
          filter: "blur(60px)", pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        style={{ position: "relative" }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          fontSize: 11, fontWeight: 700, color: "var(--accent-light)",
          textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 18,
        }}>
          <Sparkles size={11} />
          Your AI Agency Starts Here
        </div>

        <h2 style={{
          fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 900, lineHeight: 1.08,
          margin: "0 0 18px", letterSpacing: "-0.02em",
          background: "linear-gradient(135deg, #edf2fa 25%, #a5b4fc 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Ready to build products<br />at the speed of AI?
        </h2>

        <p style={{
          fontSize: 14, color: "var(--text-2)",
          maxWidth: 440, margin: "0 auto 36px", lineHeight: 1.7,
        }}>
          Six NVIDIA-powered agents. One unified orchestration system.
          Ship full SaaS products — autonomous, validated, production-ready.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "13px 30px", borderRadius: 10,
              background: "var(--accent)", color: "#fff",
              fontSize: 13, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 0 36px rgba(99,102,241,0.45)",
            }}
          >
            Enter Control Center
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/factory"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "13px 30px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-1)", fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}
          >
            Open Factory
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ── Demo Page ──────────────────────────────────────────────────────

export default function DemoPage() {
  const [metrics, setMetrics] = useState<MetricState>({
    projects: 0, tasks: 0, validations: 0, builds: 0,
    nvidiaInferences: 0, successRate: 97, uptimeHours: 0, throughput: 0,
  });

  useEffect(() => {
    const TARGETS = {
      projects: 347, tasks: 8429, validations: 6102, builds: 892,
      nvidiaInferences: 24810, successRate: 97, uptimeHours: 2184, throughput: 23,
    };
    const STEPS = 60;
    const INTERVAL = 1800 / STEPS;
    let step = 0;

    const countUp = setInterval(() => {
      step++;
      const t = Math.min(step / STEPS, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setMetrics({
        projects:         Math.round(TARGETS.projects * ease),
        tasks:            Math.round(TARGETS.tasks * ease),
        validations:      Math.round(TARGETS.validations * ease),
        builds:           Math.round(TARGETS.builds * ease),
        nvidiaInferences: Math.round(TARGETS.nvidiaInferences * ease),
        successRate:      97,
        uptimeHours:      Math.round(TARGETS.uptimeHours * ease),
        throughput:       Math.round(TARGETS.throughput * ease),
      });
      if (step >= STEPS) clearInterval(countUp);
    }, INTERVAL);

    const ticker = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        tasks:            prev.tasks + Math.floor(Math.random() * 2),
        nvidiaInferences: prev.nvidiaInferences + Math.floor(Math.random() * 4),
        builds:           prev.builds + (Math.random() > 0.88 ? 1 : 0),
      }));
    }, 3200);

    return () => { clearInterval(countUp); clearInterval(ticker); };
  }, []);

  return (
    <main>
      <HeroSection metrics={metrics} />
      <BuildShowcase />
      <AgentLivePanel />
      <OrchestrationGraph />
      <MetricsSection metrics={metrics} />
      <NvidiaStream />
      <CTASection />
      <div style={{ height: 64 }} />
    </main>
  );
}
