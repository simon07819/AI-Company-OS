"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Gauge,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  PageHeader,
  MetricCard,
  Panel,
  SectionHeader,
  StatusBadge,
  EmptyState,
  GhostButton,
  PrimaryButton,
  LocalBadge,
  SimBadge,
  Row,
  ErrorBanner,
} from "@/components/ui";

interface DemoReadiness {
  score: number;
  nvidiaConfigured: boolean;
  simulationFallbackActive: boolean;
  checklist: { id: string; label: string; completed: boolean; href: string }[];
  links: { label: string; href: string }[];
  summary: {
    workspaces: number;
    clients: number;
    missions: number;
    proposals: number;
    invoices: number;
    campaigns: number;
    publishedAssets: number;
  };
}

interface QaCheck {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  href: string;
}

interface QaResult {
  score: number;
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  checks: QaCheck[];
  runAt: string;
  recommendations: string[];
}

const SCENARIO = [
  "Setup company",
  "Create workspace",
  "Launch mission",
  "Run agents",
  "Review deliverables",
  "Create delivery package",
  "Create proposal/invoice",
  "Publish distribution job",
  "View command center",
];

export default function DemoPage() {
  const [readiness, setReadiness] = useState<DemoReadiness | null>(null);
  const [qa, setQa] = useState<QaResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [qaRunning, setQaRunning] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadReadiness = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/demo/readiness");
      if (res.ok) {
        const data = await res.json();
        setReadiness(data.readiness);
      } else {
        setFetchError("Failed to load demo readiness data. The server returned an error.");
      }
    } catch {
      setFetchError("Network error — could not reach the demo readiness API.");
    }
    // Also load QA
    try {
      const qaRes = await fetch("/api/demo/qa");
      if (qaRes.ok) { const d = await qaRes.json(); setQa(d.qa); }
    } catch { /* QA optional */ }
    setLoading(false);
  };

  useEffect(() => { loadReadiness(); }, []);

  const seed = async () => {
    setBusy(true);
    await fetch("/api/demo/seed", { method: "POST" });
    await loadReadiness();
    setBusy(false);
  };

  const reset = async () => {
    setBusy(true);
    const res = await fetch("/api/demo/reset", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setReadiness(data.readiness);
    } else {
      await loadReadiness();
    }
    setBusy(false);
  };

  const runQa = async () => {
    setQaRunning(true);
    try {
      const res = await fetch("/api/demo/qa/run", { method: "POST" });
      if (res.ok) { const d = await res.json(); setQa(d.qa); }
    } catch { /* */ }
    setQaRunning(false);
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader
        icon={<Sparkles size={22} />}
        title="Demo Readiness Center"
        description="Seed and walk through AI Company OS end to end. Simulation mode shows fallback behavior; connect an NVIDIA API key for real GPU inference."
        badge={<><LocalBadge />{readiness?.simulationFallbackActive && <SimBadge />}</>}
        actions={
          <GhostButton onClick={loadReadiness} disabled={loading || busy}>
            <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
          </GhostButton>
        }
      />

      {fetchError && (
        <ErrorBanner message={fetchError} onRetry={loadReadiness} />
      )}

      {readiness?.simulationFallbackActive && (
        <Panel style={{ borderColor: "rgba(245,158,11,0.45)", background: "rgba(245,158,11,0.10)", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={17} style={{ color: "#f59e0b" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
                NVIDIA runtime key not detected
                <span style={{ marginLeft: 8 }}><StatusBadge label="Simulation" color="#f59e0b" /></span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                Demo remains safe to run. AI Company OS will present simulation fallback behavior without exposing any secret. Connect an NVIDIA API key to enable real GPU inference.
              </div>
            </div>
          </div>
        </Panel>
      )}

      <AnimatePresence mode="wait">
        <motion.div key="demo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <section style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, marginBottom: 32 }}>
            <Panel>
              <SectionHeader icon={<Gauge size={12} />} title="Demo Readiness Score" />
              <div style={{ fontSize: 58, lineHeight: 1, fontWeight: 900, color: readiness && readiness.score >= 80 ? "#22c55e" : readiness && readiness.score >= 50 ? "#f59e0b" : "#f43f5e" }}>
                {readiness?.score ?? 0}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8 }}>Ready when score reaches 100</div>
              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <PrimaryButton onClick={seed} disabled={busy} color="#22c55e">
                  <Database size={12} /> Seed Demo Data
                </PrimaryButton>
                <PrimaryButton onClick={reset} disabled={busy} color="#f43f5e">
                  <RotateCcw size={12} /> Reset Demo
                </PrimaryButton>
              </div>
            </Panel>

            <Panel>
              <SectionHeader icon={<Play size={12} />} title="End-to-End Scenario" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                {SCENARIO.map((item, index) => {
                  const check = readiness?.checklist.find((entry) => entry.label === item);
                  return (
                    <Link key={item} href={check?.href ?? "/command"} style={{ textDecoration: "none" }}>
                      <div style={{ ...scenarioCard, borderColor: check?.completed ? "rgba(34,197,94,0.45)" : "var(--border)" }}>
                        <div style={{ color: check?.completed ? "#22c55e" : "#94a3b8", marginBottom: 8 }}>
                          {check?.completed ? <CheckCircle2 size={16} /> : <span style={{ fontSize: 12, fontWeight: 800 }}>{index + 1}</span>}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>{item}</div>
                        {check?.completed && <StatusBadge label="Done" color="#22c55e" size="sm" />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Panel>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
            <Panel>
              <SectionHeader icon={<CheckCircle2 size={12} />} title="Checklist" />
              {readiness?.checklist.length === 0 ? (
                <EmptyState
                  title="No checklist items"
                  description="Seed demo data to populate the readiness checklist."
                  action={<PrimaryButton onClick={seed} disabled={busy} color="#22c55e"><Database size={12} /> Seed Demo Data</PrimaryButton>}
                />
              ) : (
                readiness?.checklist.map((item) => (
                  <Link key={item.id} href={item.href} style={{ textDecoration: "none" }}>
                    <Row style={{ marginBottom: 6 }}>
                      {item.completed
                        ? <StatusBadge label="Done" color="#22c55e" icon={<CheckCircle2 size={10} />} />
                        : <StatusBadge label="Pending" color="#94a3b8" bg="rgba(148,163,184,0.1)" icon={<AlertTriangle size={10} />} />}
                      <span style={{ flex: 1, color: "var(--text-2)", fontSize: 12 }}>{item.label}</span>
                      <ArrowRight size={12} style={{ color: "var(--text-3)" }} />
                    </Row>
                  </Link>
                ))
              )}
            </Panel>

            <Panel>
              <SectionHeader icon={<Zap size={12} />} title="Demo Data Summary" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 18 }}>
                {readiness && Object.entries(readiness.summary).map(([label, value]) => (
                  <MetricCard
                    key={label}
                    label={label.replace(/([A-Z])/g, " $1")}
                    value={value}
                    color="#6366f1"
                  />
                ))}
              </div>
              <SectionHeader title="Pages clés" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {readiness?.links.map((link) => (
                  <Link key={link.href} href={link.href} style={{ ...pillLink, textDecoration: "none" }}>{link.label}</Link>
                ))}
              </div>
            </Panel>
          </section>

          {/* ── END-TO-END QA ── */}
          <Panel>
            <SectionHeader
              icon={<ShieldCheck size={12} />}
              title="End-to-End QA"
              action={<PrimaryButton onClick={runQa} disabled={qaRunning} color="#6366f1"><RefreshCw size={11} style={{ animation: qaRunning ? "spin 1s linear infinite" : "none" }} /> Run QA</PrimaryButton>}
            />
            {!qa ? (
              <EmptyState title="QA not run yet" description="Run the QA suite to verify the full demo flow works end-to-end." action={<PrimaryButton onClick={runQa} color="#6366f1">Run QA</PrimaryButton>} />
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, color: qa.score >= 80 ? "#22c55e" : qa.score >= 50 ? "#f59e0b" : "#f43f5e" }}>
                    {qa.score}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                      {qa.score >= 80 ? "Demo ready" : qa.score >= 50 ? "Partial — some checks failing" : "Not ready — multiple failures"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {qa.passed} passed, {qa.warnings} warnings, {qa.failed} failed — run at {new Date(qa.runAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
                  {qa.checks.map((check) => {
                    const cfg = check.status === "pass"
                      ? { color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: <CheckCircle2 size={12} />, label: "PASS" }
                      : check.status === "fail"
                      ? { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", icon: <AlertTriangle size={12} />, label: "FAIL" }
                      : { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <AlertTriangle size={12} />, label: "WARN" };
                    return (
                      <Link key={check.id} href={check.href} style={{ textDecoration: "none" }}>
                        <Row style={{ marginBottom: 0 }}>
                          <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} icon={cfg.icon} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{check.label}</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)" }}>{check.detail}</div>
                          </div>
                          <ArrowRight size={12} style={{ color: "var(--text-3)" }} />
                        </Row>
                      </Link>
                    );
                  })}
                </div>

                {qa.recommendations.length > 0 && (
                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Recommendations</div>
                    {qa.recommendations.map((rec, i) => (
                      <div key={i} style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 3 }}>• {rec}</div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Panel>

          <Panel>
            <SectionHeader
              icon={<Sparkles size={12} />}
              title="Suggested Demo Flow"
            />
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12 }}>
              Walk through the full company lifecycle. Simulation mode provides mock AI responses; real NVIDIA inference requires a configured API key.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {[
                ["Start", "Open Onboarding and show company setup defaults.", "/onboarding"],
                ["Operate", "Walk through Workspaces, Autopilot mission and Runtime agents.", "/workspaces"],
                ["Monetize", "Show proposal, invoice and paid revenue snapshot.", "/revenue"],
                ["Publish", "Open Distribution and published demo homepage asset.", "/distribution"],
                ["Lead", "Finish in Command Center with health, alerts and CEO actions.", "/command"],
              ].map(([label, copy, href]) => (
                <Link key={label} href={href} style={{ textDecoration: "none" }}>
                  <div style={scenarioCard}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text)", marginBottom: 5 }}>{label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{copy}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const scenarioCard: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "12px 14px",
  minHeight: 86,
};

const pillLink: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "7px 10px",
  color: "var(--text-2)",
  background: "var(--bg-2)",
  fontSize: 11,
  fontWeight: 700,
};
