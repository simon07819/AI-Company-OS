"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  DollarSign,
  Eye,
  FileText,
  Layers3,
  Package,
  RefreshCw,
  Rocket,
  Repeat,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

type BusinessStatus = "idea" | "in_production" | "review" | "client_ready" | "delivered" | "recurring";

interface BusinessOverview {
  totalMissions: number;
  activeMissions: number;
  clientReadyMissions: number;
  deliveredMissions: number;
  recurringMissions: number;
  approvedDeliverables: number;
  deliveryPackagesGenerated: number;
  activeLoops: number;
  estimatedRevenuePotential: number;
  missionsByStatus: Record<BusinessStatus, number>;
  missionsByType: Record<string, number>;
}

interface PipelineEntry {
  sessionId: string;
  projectName: string;
  missionType: string;
  missionLabel: string;
  businessStatus: BusinessStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface RecommendedAction {
  sessionId: string;
  projectName: string;
  action: "review" | "approve" | "package" | "deliver" | "activate_loop" | "retry";
  label: string;
  priority: "high" | "medium" | "low";
  description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

const BIZ_STATUS_CONFIG: Record<BusinessStatus, { label: string; color: string; bg: string }> = {
  idea:          { label: "Idea",          color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  in_production: { label: "In Production", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  review:        { label: "Review",        color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  client_ready:  { label: "Client-Ready",  color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  delivered:     { label: "Delivered",      color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  recurring:     { label: "Recurring",     color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  review:        <Eye size={13} />,
  approve:       <ShieldCheck size={13} />,
  package:       <Package size={13} />,
  deliver:       <Rocket size={13} />,
  activate_loop: <Repeat size={13} />,
  retry:         <RefreshCw size={13} />,
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   "#f43f5e",
  medium: "#f59e0b",
  low:    "#94a3b8",
};

const MISSION_TYPE_EMOJIS: Record<string, string> = {
  saas_project: "🏢",
  website: "🌐",
  branding_pack: "🎨",
  flyer: "📄",
  business_card: "💳",
  ecommerce_store: "🛒",
  social_campaign: "📣",
  automation_workflow: "⚡",
};

// ─── Page ─────────────────────────────────────────────────────────────────

export default function BusinessPage() {
  const [overview, setOverview] = useState<BusinessOverview | null>(null);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [actions, setActions] = useState<RecommendedAction[]>([]);
  const [crmSnapshot, setCrmSnapshot] = useState<{ activeLeads: number; activeClients: number; openOpportunities: number; pipelineValue: number } | null>(null);
  const [revenueSnapshot, setRevenueSnapshot] = useState<{ monthlyRevenue: number; proposalConversionRate: number; outstandingInvoices: number; outstandingInvoiceValue: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [oRes, pRes, aRes] = await Promise.all([
        fetch("/api/business/overview"),
        fetch("/api/business/pipeline"),
        fetch("/api/business/actions"),
      ]);
      if (oRes.ok) { const d = await oRes.json(); setOverview(d.overview); }
      if (pRes.ok) { const d = await pRes.json(); setPipeline(d.pipeline); }
      if (aRes.ok) { const d = await aRes.json(); setActions(d.actions); }
      try {
        const crmRes = await fetch("/api/crm/overview");
        if (crmRes.ok) { const d = await crmRes.json(); setCrmSnapshot(d.overview); }
      } catch { /* CRM optional */ }
      try {
        const revenueRes = await fetch("/api/revenue/overview");
        if (revenueRes.ok) { const d = await revenueRes.json(); setRevenueSnapshot(d.overview); }
      } catch { /* Revenue optional */ }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            <BarChart3 size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3 }} />
            Business Operations Center
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: "4px 0 0" }}>
            Mission pipeline, revenue tracking and operational insights
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          style={{ fontSize: 11, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 12px", cursor: "pointer", color: "var(--text-2)", display: "flex", alignItems: "center", gap: 5 }}
        >
          <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

          {/* ── OVERVIEW CARDS ── */}
          {overview && (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 32 }}>
              {[
                { label: "Total Missions", value: overview.totalMissions, icon: <Layers3 size={16} />, color: "#a78bfa" },
                { label: "Active", value: overview.activeMissions, icon: <Zap size={16} />, color: "#34d399" },
                { label: "Client-Ready", value: overview.clientReadyMissions, icon: <CheckCircle2 size={16} />, color: "#22c55e" },
                { label: "Delivered", value: overview.deliveredMissions, icon: <Rocket size={16} />, color: "#6366f1" },
                { label: "Recurring", value: overview.recurringMissions, icon: <Repeat size={16} />, color: "#8b5cf6" },
                { label: "Approved Deliverables", value: overview.approvedDeliverables, icon: <ShieldCheck size={16} />, color: "#38bdf8" },
                { label: "Delivery Packages", value: overview.deliveryPackagesGenerated, icon: <Package size={16} />, color: "#fb923c" },
                { label: "Active Loops", value: overview.activeLoops, icon: <Repeat size={16} />, color: "#f472b6" },
                { label: "Revenue Potential", value: `$${overview.estimatedRevenuePotential.toLocaleString()}`, icon: <DollarSign size={16} />, color: "#22c55e" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ color }}>{icon}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </section>
          )}

          {/* ── STATUS DISTRIBUTION ── */}
          {overview && (
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
              {/* Status pipeline */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
                  Mission Pipeline by Status
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(["idea", "in_production", "review", "client_ready", "delivered", "recurring"] as BusinessStatus[]).map((status) => {
                    const count = overview.missionsByStatus[status] ?? 0;
                    const cfg = BIZ_STATUS_CONFIG[status];
                    const total = Math.max(overview.totalMissions, 1);
                    return (
                      <div key={status} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 90, fontSize: 11, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                        <div style={{ flex: 1, height: 8, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${(count / total) * 100}%`, height: "100%", background: cfg.color, borderRadius: 4, minWidth: count > 0 ? 8 : 0, transition: "width 300ms ease" }} />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600, width: 24, textAlign: "right" }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mission types */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
                  Missions by Type
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.entries(overview.missionsByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <div key={type} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                      <span style={{ width: 20 }}>{MISSION_TYPE_EMOJIS[type] ?? "📋"}</span>
                      <span style={{ flex: 1, color: "var(--text-2)" }}>{type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                      <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                  {Object.keys(overview.missionsByType).length === 0 && (
                    <div style={{ color: "var(--text-3)", fontSize: 12 }}>No missions yet</div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── MISSION PIPELINE ── */}
          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
              <FileText size={12} style={{ display: "inline", marginRight: 4 }} /> Mission Pipeline
            </div>
            {pipeline.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 13, padding: "12px 0" }}>No missions in the pipeline yet. <Link href="/projects/new" style={{ color: "#6366f1" }}>Launch your first mission</Link>.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {pipeline.map((entry) => {
                  const cfg = BIZ_STATUS_CONFIG[entry.businessStatus];
                  return (
                    <Link key={entry.sessionId} href={`/autopilot/${entry.sessionId}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", transition: "border-color 150ms" }}>
                      <span style={{ fontSize: 18 }}>{MISSION_TYPE_EMOJIS[entry.missionType] ?? "📋"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{entry.projectName.replace(/-/g, " ")}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{entry.missionLabel}</div>
                      </div>
                      <div style={{ width: 100 }}>
                        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
                          <div style={{ width: `${entry.progress}%`, height: "100%", background: cfg.color, borderRadius: 2, transition: "width 300ms ease" }} />
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", textAlign: "right" }}>{entry.progress}%</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: "3px 8px", borderRadius: "var(--radius-sm)", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                        {cfg.label}
                      </span>
                      <ArrowRight size={14} style={{ color: "var(--text-3)" }} />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── CRM SNAPSHOT ── */}
          {crmSnapshot && (
            <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  <Users size={12} style={{ display: "inline", marginRight: 4 }} /> CRM Snapshot
                </div>
                <Link href="/crm" style={{ fontSize: 11, color: "#6366f1", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                  Open CRM <ArrowRight size={11} />
                </Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {[
                  { label: "Active Leads", value: crmSnapshot.activeLeads, color: "#3b82f6" },
                  { label: "Active Clients", value: crmSnapshot.activeClients, color: "#22c55e" },
                  { label: "Open Opportunities", value: crmSnapshot.openOpportunities, color: "#fb923c" },
                  { label: "Pipeline Value", value: `$${crmSnapshot.pipelineValue.toLocaleString()}`, color: "#a78bfa" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── REVENUE SNAPSHOT ── */}
          {revenueSnapshot && (
            <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  <DollarSign size={12} style={{ display: "inline", marginRight: 4 }} /> Revenue Snapshot
                </div>
                <Link href="/revenue" style={{ fontSize: 11, color: "#6366f1", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                  Open Revenue <ArrowRight size={11} />
                </Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {[
                  { label: "Monthly Revenue", value: `$${revenueSnapshot.monthlyRevenue.toLocaleString()}`, color: "#22c55e" },
                  { label: "Proposal Conversion", value: `${revenueSnapshot.proposalConversionRate}%`, color: "#f59e0b" },
                  { label: "Outstanding Invoices", value: revenueSnapshot.outstandingInvoices, color: "#fb923c" },
                  { label: "Outstanding Value", value: `$${revenueSnapshot.outstandingInvoiceValue.toLocaleString()}`, color: "#a78bfa" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── RECOMMENDED ACTIONS ── */}
          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <Sparkles size={12} style={{ color: "#f59e0b" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Recommended Next Actions</span>
            </div>
            {actions.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 13, padding: "12px 0" }}>No pending actions. All missions are on track.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {actions.map((action, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <span style={{ color: PRIORITY_COLORS[action.priority] }}>{ACTION_ICONS[action.action] ?? <Zap size={13} />}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 1 }}>{action.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text-3)" }}>{action.description}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 600, color: PRIORITY_COLORS[action.priority], textTransform: "uppercase", letterSpacing: "0.3px" }}>{action.priority}</span>
                    <Link href={`/autopilot/${action.sessionId}`} style={{ fontSize: 11, color: "#6366f1", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                      Go <ArrowRight size={11} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
