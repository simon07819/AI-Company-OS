"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority   = "speed" | "quality" | "design" | "security";
type Autonomy   = "supervised" | "assisted" | "autonomous";
type Template   = typeof TEMPLATES[number]["id"];
type AgentId    = typeof AGENTS[number]["id"];
type StackId    = typeof STACKS[number]["id"];

interface FormState {
  name:        string;
  idea:        string;
  market:      string;
  template:    Template | null;
  agents:      AgentId[];
  stack:       StackId | null;
  priorities:  Priority[];
  autonomy:    Autonomy | null;
}

interface LaunchResponse {
  ok: boolean;
  message?: string;
  project?: string;
  data?: { project?: string };
  stderr?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: "b2b-saas",    emoji: "🏢", label: "B2B SaaS",        desc: "Multi-tenant platform with billing, teams & roles",   color: "#6366f1" },
  { id: "dev-tool",    emoji: "🛠",  label: "Developer Tool",  desc: "CLI, SDK or platform for engineers",                  color: "#38bdf8" },
  { id: "consumer",    emoji: "📱", label: "Consumer App",    desc: "Mobile-first product for end users",                  color: "#f472b6" },
  { id: "api",         emoji: "⚡", label: "API Platform",    desc: "Headless backend, webhooks & REST/GraphQL",           color: "#fb923c" },
  { id: "ai-product",  emoji: "🤖", label: "AI Product",      desc: "LLM-powered features, agents or copilots",            color: "#a78bfa" },
  { id: "marketplace", emoji: "🛒", label: "Marketplace",     desc: "Two-sided platform with listings & payments",         color: "#34d399" },
] as const;

const AGENTS = [
  { id: "product_agent",   emoji: "🧠", label: "Product Agent",    desc: "PRD, roadmap, user stories",             color: "#a78bfa" },
  { id: "architect_agent", emoji: "🏗️", label: "Architect Agent",  desc: "System design, ADRs, schema",            color: "#6366f1" },
  { id: "frontend_agent",  emoji: "🎨", label: "Frontend Agent",   desc: "UI components, pages, UX",               color: "#f472b6" },
  { id: "backend_agent",   emoji: "⚙️",  label: "Backend Agent",   desc: "APIs, business logic, database",         color: "#34d399" },
  { id: "qa_agent",        emoji: "🔬", label: "QA Agent",         desc: "Tests, coverage, bug reports",           color: "#fb923c" },
  { id: "devops_agent",    emoji: "🚀", label: "DevOps Agent",     desc: "CI/CD, infra, deployments",              color: "#38bdf8" },
] as const;

const STACKS = [
  { id: "nextjs-prisma", label: "Next.js + Prisma",     tags: ["TypeScript", "PostgreSQL", "Tailwind"] },
  { id: "t3",            label: "T3 Stack",              tags: ["tRPC", "Prisma", "NextAuth"] },
  { id: "fastapi-react", label: "FastAPI + React",       tags: ["Python", "PostgreSQL", "Vite"] },
  { id: "nestjs",        label: "NestJS + React",        tags: ["TypeScript", "MongoDB", "GraphQL"] },
  { id: "rails",         label: "Ruby on Rails",         tags: ["Ruby", "PostgreSQL", "Hotwire"] },
  { id: "laravel",       label: "Laravel + Inertia",     tags: ["PHP", "MySQL", "Vue"] },
] as const;

const PRIORITIES: { id: Priority; emoji: string; label: string; desc: string; color: string }[] = [
  { id: "speed",    emoji: "⚡", label: "Speed",    desc: "Ship fast, iterate quickly",     color: "#fb923c" },
  { id: "quality",  emoji: "💎", label: "Quality",  desc: "Robust, tested, maintainable",   color: "#6366f1" },
  { id: "design",   emoji: "✨", label: "Design",   desc: "Premium UI/UX first",            color: "#f472b6" },
  { id: "security", emoji: "🔒", label: "Security", desc: "Secure by default, audit-ready", color: "#34d399" },
];

const AUTONOMY_LEVELS: { id: Autonomy; emoji: string; label: string; desc: string; color: string }[] = [
  { id: "supervised",  emoji: "👁️",  label: "Supervised",  desc: "Every action requires approval",     color: "#fb923c" },
  { id: "assisted",    emoji: "🤝", label: "Assisted",    desc: "AI proposes, human decides on key steps", color: "#6366f1" },
  { id: "autonomous",  emoji: "🤖", label: "Autonomous",  desc: "AI executes independently end-to-end",    color: "#a78bfa" },
];

const STEPS = [
  { id: 1, label: "Project Idea" },
  { id: 2, label: "Product Type" },
  { id: 3, label: "AI Team" },
  { id: 4, label: "Strategy" },
  { id: 5, label: "Launch Review" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estimateComplexity(agents: AgentId[], priorities: Priority[]): { level: string; color: string; weeks: string } {
  const n = agents.length;
  const hasSecurity = priorities.includes("security");
  if (n >= 5 || hasSecurity) return { level: "High",   color: "#f43f5e", weeks: "6–10 weeks" };
  if (n >= 3)                 return { level: "Medium", color: "#f59e0b", weeks: "3–5 weeks" };
  return                             { level: "Low",    color: "#34d399", weeks: "1–2 weeks" };
}

function generateProjectId() {
  return "proj-" + Math.random().toString(36).slice(2, 9).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
      {STEPS.map((step, i) => {
        const done    = current > step.id;
        const active  = current === step.id;
        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <motion.div
                animate={{
                  background: done ? "var(--accent)" : active ? "var(--accent)" : "var(--surface-3)",
                  boxShadow: active ? "0 0 0 4px var(--accent-dim)" : "none",
                }}
                transition={{ duration: 0.25 }}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700,
                  color: done || active ? "#fff" : "var(--text-3)",
                  border: `1px solid ${done || active ? "transparent" : "var(--border-2)"}`,
                }}
              >
                {done ? "✓" : step.id}
              </motion.div>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: active ? "var(--accent-light)" : done ? "var(--text-2)" : "var(--text-3)",
                textTransform: "uppercase", letterSpacing: "0.5px",
                whiteSpace: "nowrap",
              }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, margin: "0 4px", marginBottom: 22, background: done ? "var(--accent)" : "var(--border)", transition: "background 0.3s ease" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SelectCard({
  selected, onClick, children, color, style,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: selected ? (color ? color + "14" : "var(--accent-dim)") : "var(--surface)",
        border: `1.5px solid ${selected ? (color ?? "var(--accent)") : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "16px 18px",
        cursor: "pointer",
        transition: "border-color 140ms ease, background 140ms ease",
        boxShadow: selected ? `0 0 0 1px ${(color ?? "#6366f1")}20, 0 4px 20px rgba(0,0,0,0.3)` : "none",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {selected && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          width: 18, height: 18, borderRadius: "50%",
          background: color ?? "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: "#fff", fontWeight: 700,
        }}>✓</div>
      )}
      {children}
    </motion.div>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1({ form, set }: { form: FormState; set: (f: Partial<FormState>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 8 }}>
          Project Name *
        </label>
        <input
          className="form-input"
          placeholder="e.g. Stripe for AI Agencies"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          style={{ fontSize: 16, fontWeight: 600, height: 48 }}
          autoFocus
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 8 }}>
          SaaS Idea *
        </label>
        <textarea
          className="form-input"
          placeholder="Describe your SaaS product in 2–3 sentences. What problem does it solve? Who is the target customer?"
          value={form.idea}
          onChange={(e) => set({ idea: e.target.value })}
          rows={4}
          style={{ resize: "vertical", lineHeight: 1.65 }}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 8 }}>
          Target Market
        </label>
        <input
          className="form-input"
          placeholder="e.g. Freelance developers, SMBs, Enterprise fintech teams…"
          value={form.market}
          onChange={(e) => set({ market: e.target.value })}
        />
      </div>

      {/* Inspiration strip */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 4 }}>
        <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>INSPIRATION — click to use</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            { name: "CalSync AI", idea: "AI-powered calendar that auto-schedules meetings based on priorities and energy levels." },
            { name: "FlowBilling", idea: "Usage-based billing infrastructure for AI API companies, with metering and invoicing." },
            { name: "ReviewBot", idea: "AI code review agent integrated into GitHub PRs, replacing manual review for small teams." },
            { name: "LegalDraft AI", idea: "Contract generation SaaS for startups using AI to produce NDA, MSA and SOW templates." },
          ].map(({ name, idea }) => (
            <button
              key={name}
              onClick={() => set({ name, idea })}
              style={{
                padding: "4px 12px", borderRadius: 99,
                border: "1px solid var(--border-2)",
                background: "var(--surface-2)", color: "var(--text-2)",
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                transition: "all 140ms ease",
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step2({ form, set }: { form: FormState; set: (f: Partial<FormState>) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
      {TEMPLATES.map((t) => (
        <SelectCard
          key={t.id}
          selected={form.template === t.id}
          onClick={() => set({ template: t.id })}
          color={t.color}
        >
          <div style={{ fontSize: 28, marginBottom: 10 }}>{t.emoji}</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 5 }}>{t.label}</div>
          <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>{t.desc}</div>
        </SelectCard>
      ))}
    </div>
  );
}

function Step3({ form, set }: { form: FormState; set: (f: Partial<FormState>) => void }) {
  const toggle = (id: AgentId) => {
    const exists = form.agents.includes(id);
    set({ agents: exists ? form.agents.filter((a) => a !== id) : [...form.agents, id] });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13, color: "var(--text-2)" }}>
        Select the AI agents that will work on your project. You can activate all 6 for full coverage.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {AGENTS.map((agent) => {
          const selected = form.agents.includes(agent.id);
          return (
            <SelectCard key={agent.id} selected={selected} onClick={() => toggle(agent.id)} color={agent.color}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                  background: agent.color + "18",
                  border: `1px solid ${agent.color}30`,
                  boxShadow: selected ? `0 0 12px ${agent.color}25` : "none",
                }}>
                  {agent.emoji}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{agent.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>{agent.desc}</div>
                </div>
              </div>
            </SelectCard>
          );
        })}
      </div>
      {form.agents.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--accent-dim)", borderRadius: "var(--radius-sm)", border: "1px solid var(--accent-glow)" }}>
          <span style={{ fontSize: 13 }}>✅</span>
          <span style={{ fontSize: 13, color: "var(--accent-light)", fontWeight: 600 }}>
            {form.agents.length} agent{form.agents.length > 1 ? "s" : ""} selected
          </span>
          <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 4 }}>
            — {form.agents.map((id) => AGENTS.find((a) => a.id === id)?.label).join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}

function Step4({ form, set }: { form: FormState; set: (f: Partial<FormState>) => void }) {
  const togglePriority = (p: Priority) => {
    const exists = form.priorities.includes(p);
    set({ priorities: exists ? form.priorities.filter((x) => x !== p) : [...form.priorities, p] });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Tech stack */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Tech Stack
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {STACKS.map((s) => (
            <SelectCard key={s.id} selected={form.stack === s.id} onClick={() => set({ stack: s.id })}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 6 }}>{s.label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {s.tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: 10, padding: "2px 7px", borderRadius: 4,
                    background: "var(--surface-3)", color: "var(--text-3)",
                    border: "1px solid var(--border-2)",
                  }}>{tag}</span>
                ))}
              </div>
            </SelectCard>
          ))}
        </div>
      </div>

      {/* Priorities */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Execution Priorities (pick all that apply)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
          {PRIORITIES.map((p) => (
            <SelectCard key={p.id} selected={form.priorities.includes(p.id)} onClick={() => togglePriority(p.id)} color={p.color}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{p.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{p.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 3 }}>{p.desc}</div>
            </SelectCard>
          ))}
        </div>
      </div>

      {/* Autonomy */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          AI Autonomy Level
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8 }}>
          {AUTONOMY_LEVELS.map((a) => (
            <SelectCard key={a.id} selected={form.autonomy === a.id} onClick={() => set({ autonomy: a.id })} color={a.color}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{a.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{a.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 3 }}>{a.desc}</div>
            </SelectCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step5({
  form,
  onLaunch,
  launching,
  launched,
  projectId,
}: {
  form: FormState;
  onLaunch: () => void;
  launching: boolean;
  launched: boolean;
  projectId: string | null;
}) {
  const router  = useRouter();
  const tpl     = TEMPLATES.find((t) => t.id === form.template);
  const stk     = STACKS.find((s) => s.id === form.stack);
  const cx      = estimateComplexity(form.agents, form.priorities);
  const selAgents = AGENTS.filter((a) => form.agents.includes(a.id));
  const selAuto   = AUTONOMY_LEVELS.find((a) => a.id === form.autonomy);

  const ROADMAP = [
    { phase: "Week 1",   label: "Foundation",    tasks: ["Init repo & CI/CD", "DB schema", "Auth module"],                   color: "#6366f1" },
    { phase: "Week 2–3", label: "Core Features", tasks: ["Main API routes", "UI components", "Business logic"],              color: "#38bdf8" },
    { phase: "Week 4",   label: "QA & Polish",   tasks: ["Test suite", "Performance", "Bug fixes"],                          color: "#f59e0b" },
    { phase: "Week 5+",  label: "Launch Ready",  tasks: ["Staging deploy", "Monitoring", "Production release"],              color: "#34d399" },
  ];

  if (launched && projectId) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center", padding: "24px 0" }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
          style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), #34d399)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36,
            boxShadow: "0 0 40px rgba(99,102,241,0.4)",
          }}
        >
          🚀
        </motion.div>

        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", color: "var(--text)", marginBottom: 8 }}>
            Agency Launched!
          </h2>
          <p style={{ color: "var(--text-2)", fontSize: 14 }}>
            Your AI team is being assembled and ready to build.
          </p>
        </div>

        <div style={{
          display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 360,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--text-3)" }}>Project</span>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>{form.name}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--text-3)" }}>Project ID</span>
            <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--accent-light)" }}>{projectId}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--text-3)" }}>Agents active</span>
            <span style={{ fontWeight: 700, color: "var(--green)" }}>{selAgents.length}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push("/operations/live")}
            style={{
              padding: "12px 24px", borderRadius: "var(--radius-sm)",
              background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 14,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 16px var(--accent-glow)",
            }}
          >
            Watch Live Ops →
          </button>
          <button
            onClick={() => router.push("/projects")}
            style={{
              padding: "12px 24px", borderRadius: "var(--radius-sm)",
              background: "var(--surface-2)", color: "var(--text-2)", fontWeight: 600, fontSize: 14,
              border: "1px solid var(--border-2)", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            All Projects
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {[
          { icon: "📌", label: "Project", value: form.name || "—" },
          { icon: tpl?.emoji ?? "📦", label: "Template", value: tpl?.label ?? "—" },
          { icon: "🗂️", label: "Stack", value: stk?.label ?? "—" },
          { icon: selAuto?.emoji ?? "🤖", label: "Autonomy", value: selAuto?.label ?? "—" },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", padding: "14px 16px",
          }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
              {icon} {label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* AI Team preview */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12 }}>
          🤖 AI Team ({selAgents.length} agents)
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {selAgents.map((a) => (
            <span key={a.id} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 99,
              background: a.color + "14", border: `1px solid ${a.color}30`,
              fontSize: 12, fontWeight: 600, color: a.color,
            }}>
              {a.emoji} {a.label}
            </span>
          ))}
        </div>
      </div>

      {/* Complexity + priorities */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "14px 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
            📊 Complexity
          </p>
          <div style={{ fontSize: 22, fontWeight: 800, color: cx.color }}>{cx.level}</div>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>Est. {cx.weeks}</div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "14px 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
            🎯 Priorities
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {form.priorities.length > 0
              ? form.priorities.map((p) => {
                  const P = PRIORITIES.find((x) => x.id === p)!;
                  return (
                    <span key={p} style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 99,
                      background: P.color + "14", color: P.color,
                      border: `1px solid ${P.color}30`, fontWeight: 600,
                    }}>
                      {P.emoji} {P.label}
                    </span>
                  );
                })
              : <span style={{ fontSize: 12, color: "var(--text-3)" }}>None selected</span>
            }
          </div>
        </div>
      </div>

      {/* Roadmap preview */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
          🗺️ Preview Roadmap
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ROADMAP.map((r, i) => (
            <motion.div
              key={r.phase}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{ display: "flex", alignItems: "flex-start", gap: 14 }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: r.color, marginTop: 4 }} />
                {i < ROADMAP.length - 1 && <div style={{ width: 1, height: 28, background: "var(--border)", marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: i < ROADMAP.length - 1 ? 8 : 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 700, color: r.color }}>{r.phase}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{r.label}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {r.tasks.map((task) => (
                    <span key={task} style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 4,
                      background: "var(--surface-2)", color: "var(--text-2)",
                      border: "1px solid var(--border-2)",
                    }}>{task}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* SaaS idea preview */}
      {form.idea && (
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "14px 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
            💡 Product Brief
          </p>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65 }}>{form.idea}</p>
          {form.market && (
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
              🎯 Target: {form.market}
            </p>
          )}
        </div>
      )}

      {/* LAUNCH BUTTON */}
      <motion.button
        whileHover={!launching ? { y: -2, boxShadow: "0 8px 30px rgba(99,102,241,0.5)" } : undefined}
        whileTap={!launching ? { scale: 0.98 } : undefined}
        onClick={onLaunch}
        disabled={launching}
        style={{
          width: "100%", padding: "18px",
          borderRadius: "var(--radius)",
          background: launching
            ? "var(--surface-3)"
            : "linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #a78bfa 100%)",
          color: "#fff",
          border: "none",
          fontSize: 16, fontWeight: 800, letterSpacing: "-0.2px",
          cursor: launching ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          boxShadow: launching ? "none" : "0 4px 20px rgba(99,102,241,0.35)",
          transition: "all 200ms ease",
          marginTop: 8,
        }}
      >
        {launching ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              style={{ display: "inline-block", fontSize: 18 }}
            >
              ⚙️
            </motion.span>
            Launching AI Agency…
          </>
        ) : (
          <>
            🚀 Launch AI Agency
          </>
        )}
      </motion.button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const EMPTY: FormState = {
  name: "", idea: "", market: "",
  template: null, agents: [], stack: null,
  priorities: [], autonomy: null,
};

function canProceed(step: number, form: FormState): boolean {
  if (step === 1) return form.name.trim().length > 0 && form.idea.trim().length > 0;
  if (step === 2) return form.template !== null;
  if (step === 3) return form.agents.length > 0;
  if (step === 4) return form.stack !== null && form.autonomy !== null;
  return true;
}

export default function NewProjectPage() {
  const [step,      setStep]      = useState(1);
  const [dir,       setDir]       = useState(1);
  const [form,      setForm]      = useState<FormState>(EMPTY);
  const [launching, setLaunching] = useState(false);
  const [launched,  setLaunched]  = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const handleLaunch = async () => {
    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await fetch("/api/projects/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await res.json()) as LaunchResponse;
      if (!res.ok || !payload.ok) {
        throw new Error(payload.stderr || payload.message || "Launch bridge failed");
      }

      setProjectId(payload.data?.project ?? payload.project ?? form.name ?? generateProjectId());
      setLaunched(true);
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : String(error));
    } finally {
      setLaunching(false);
    }
  };

  const ready = canProceed(step, form);

  return (
    <main className="page" style={{ maxWidth: 820 }}>
      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <a href="/projects" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--text-3)", marginBottom: 16, textDecoration: "none" }}>
          ← Projects
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, var(--accent), #a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: "0 0 20px var(--accent-glow)",
          }}>
            🚀
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.4px", color: "var(--text)", margin: 0 }}>
              Launch AI Agency
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 3 }}>
              Configure your project and deploy an autonomous AI team.
            </p>
          </div>
        </div>
      </div>

      {/* Card container */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "32px 36px",
        boxShadow: "var(--shadow-lg)",
      }}>
        {/* Step indicator */}
        {!launched && <StepIndicator current={step} />}

        {/* Step content */}
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 1 && <Step1 form={form} set={set} />}
            {step === 2 && <Step2 form={form} set={set} />}
            {step === 3 && <Step3 form={form} set={set} />}
            {step === 4 && <Step4 form={form} set={set} />}
            {step === 5 && (
              <Step5
                form={form}
                onLaunch={handleLaunch}
                launching={launching}
                launched={launched}
                projectId={projectId}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {launchError && (
          <div className="card" style={{ marginTop: 16, borderColor: "rgba(244,63,94,0.32)", background: "rgba(244,63,94,0.08)", color: "#fb7185", fontSize: 13 }}>
            Launch bridge error: {launchError}
          </div>
        )}

        {/* Navigation */}
        {!launched && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => goTo(step - 1)}
              disabled={step === 1}
              className="btn btn-ghost"
              style={{ opacity: step === 1 ? 0 : 1, pointerEvents: step === 1 ? "none" : "auto" }}
            >
              ← Back
            </button>

            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--text-3)" }}>
              {step} / {STEPS.length}
            </span>

            {step < 5 ? (
              <button
                onClick={() => goTo(step + 1)}
                disabled={!ready}
                className="btn"
                style={{ opacity: ready ? 1 : 0.4, cursor: ready ? "pointer" : "not-allowed" }}
              >
                Continue →
              </button>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
