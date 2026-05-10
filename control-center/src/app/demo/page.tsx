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
  Sparkles,
  Zap,
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadReadiness = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/demo/readiness");
      if (res.ok) {
        const data = await res.json();
        setReadiness(data.readiness);
      }
    } catch { /* ignore */ }
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

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>
            <Sparkles size={22} style={{ display: "inline", marginRight: 8, verticalAlign: -4 }} />
            Demo Readiness Center
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: "4px 0 0" }}>Seed and walk through AI Company OS end to end</p>
        </div>
        <button onClick={loadReadiness} disabled={loading || busy} style={ghostButton}>
          <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
        </button>
      </div>

      {readiness?.simulationFallbackActive && (
        <section style={{ ...panelStyle, borderColor: "rgba(245,158,11,0.45)", background: "rgba(245,158,11,0.10)", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={17} style={{ color: "#f59e0b" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>NVIDIA runtime key not detected</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>Demo remains safe to run. AI Company OS will present simulation fallback behavior without exposing any secret.</div>
            </div>
          </div>
        </section>
      )}

      <AnimatePresence mode="wait">
        <motion.div key="demo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <section style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, marginBottom: 32 }}>
            <div style={panelStyle}>
              <div style={sectionTitle}><Gauge size={12} /> Demo Readiness Score</div>
              <div style={{ fontSize: 58, lineHeight: 1, fontWeight: 900, color: readiness && readiness.score >= 80 ? "#22c55e" : readiness && readiness.score >= 50 ? "#f59e0b" : "#f43f5e" }}>
                {readiness?.score ?? 0}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8 }}>Ready when score reaches 100</div>
              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <button onClick={seed} disabled={busy} style={primaryButton}><Database size={12} /> Seed Demo Data</button>
                <button onClick={reset} disabled={busy} style={dangerButton}><RotateCcw size={12} /> Reset Demo</button>
              </div>
            </div>

            <div style={panelStyle}>
              <div style={sectionTitle}><Play size={12} /> End-to-End Scenario</div>
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
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
            <div style={panelStyle}>
              <div style={sectionTitle}><CheckCircle2 size={12} /> Checklist</div>
              {readiness?.checklist.map((item) => (
                <Link key={item.id} href={item.href} style={{ textDecoration: "none" }}>
                  <div style={rowStyle}>
                    <span style={{ color: item.completed ? "#22c55e" : "#94a3b8" }}>{item.completed ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}</span>
                    <span style={{ flex: 1, color: "var(--text-2)", fontSize: 12 }}>{item.label}</span>
                    <ArrowRight size={12} style={{ color: "var(--text-3)" }} />
                  </div>
                </Link>
              ))}
            </div>

            <div style={panelStyle}>
              <div style={sectionTitle}><Zap size={12} /> Demo Data Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 18 }}>
                {readiness && Object.entries(readiness.summary).map(([label, value]) => (
                  <div key={label} style={metricCard}>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4, textTransform: "capitalize" }}>{label.replace(/([A-Z])/g, " $1")}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#6366f1" }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={sectionTitle}>Pages clés</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {readiness?.links.map((link) => (
                  <Link key={link.href} href={link.href} style={{ ...pillLink, textDecoration: "none" }}>{link.label}</Link>
                ))}
              </div>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitle}><Sparkles size={12} /> Suggested Demo Flow</div>
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
          </section>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "18px 22px",
};

const sectionTitle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  fontWeight: 800,
  color: "var(--text-3)",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: 14,
};

const ghostButton: React.CSSProperties = {
  fontSize: 11,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 12px",
  cursor: "pointer",
  color: "var(--text-2)",
  display: "flex",
  alignItems: "center",
  gap: 5,
};

const primaryButton: React.CSSProperties = {
  fontSize: 11,
  background: "#22c55e",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  gap: 5,
};

const dangerButton: React.CSSProperties = {
  ...primaryButton,
  background: "#f43f5e",
};

const scenarioCard: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "12px 14px",
  minHeight: 86,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "9px 11px",
  marginBottom: 6,
};

const metricCard: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 12px",
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
