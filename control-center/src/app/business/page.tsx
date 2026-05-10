"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Eye,
  FileText,
  Layers3,
  Megaphone,
  Package,
  RefreshCw,
  Rocket,
  Repeat,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  Building2,
} from "lucide-react";
import {
  PageHeader,
  MetricCard,
  Panel,
  SectionHeader,
  StatusBadge,
  EmptyState,
  GhostButton,
  LocalBadge,
  Row,
} from "@/components/ui";

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

const BIZ_STATUS_CFG: Record<BusinessStatus, { label: string; color: string; bg: string }> = {
  idea:          { label: "Idea",          color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  in_production: { label: "In Production", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  review:        { label: "Review",        color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  client_ready:  { label: "Client-Ready",  color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  delivered:     { label: "Delivered",      color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  recurring:     { label: "Recurring",     color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  review: <Eye size={13} />,
  approve: <ShieldCheck size={13} />,
  package: <Package size={13} />,
  deliver: <Rocket size={13} />,
  activate_loop: <Repeat size={13} />,
  retry: <RefreshCw size={13} />,
};

const PRIORITY_COLORS: Record<string, string> = { high: "#f43f5e", medium: "#f59e0b", low: "#94a3b8" };

const MISSION_EMOJI: Record<string, string> = {
  saas_project: "🏢", website: "🌐", branding_pack: "🎨", flyer: "📄",
  business_card: "💳", ecommerce_store: "🛒", social_campaign: "📣", automation_workflow: "⚡",
};

// ─── Page ─────────────────────────────────────────────────────────────────

export default function BusinessPage() {
  const [overview, setOverview] = useState<BusinessOverview | null>(null);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [actions, setActions] = useState<RecommendedAction[]>([]);
  const [crmSnap, setCrmSnap] = useState<{ activeLeads: number; activeClients: number; openOpportunities: number; pipelineValue: number } | null>(null);
  const [revSnap, setRevSnap] = useState<{ monthlyRevenue: number; proposalConversionRate: number; outstandingInvoices: number; outstandingInvoiceValue: number } | null>(null);
  const [distSnap, setDistSnap] = useState<{ publishedAssets: number; activeCampaigns: number; distributionSuccessRate: number } | null>(null);
  const [wsSnap, setWsSnap] = useState<{ id: string; name: string; metrics: { revenue: number; activeMissions: number; activeCampaigns: number; crmClients: number } }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [oRes, pRes, aRes] = await Promise.all([
        fetch("/api/business/overview"), fetch("/api/business/pipeline"), fetch("/api/business/actions"),
      ]);
      if (oRes.ok) { const d = await oRes.json(); setOverview(d.overview); }
      if (pRes.ok) { const d = await pRes.json(); setPipeline(d.pipeline); }
      if (aRes.ok) { const d = await aRes.json(); setActions(d.actions); }
      // Optional snapshots
      try { const r = await fetch("/api/crm/overview"); if (r.ok) { const d = await r.json(); setCrmSnap(d.overview); } } catch { /* */ }
      try { const r = await fetch("/api/revenue/overview"); if (r.ok) { const d = await r.json(); setRevSnap(d.overview); } } catch { /* */ }
      try { const r = await fetch("/api/distribution/overview"); if (r.ok) { const d = await r.json(); setDistSnap(d.overview); } } catch { /* */ }
      try { const r = await fetch("/api/workspaces"); if (r.ok) { const d = await r.json(); setWsSnap(d.workspaces ?? []); } } catch { /* */ }
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader
        icon={<BarChart3 size={20} />}
        title="Business Operations Center"
        description="Mission pipeline, revenue tracking and operational insights"
        badge={<LocalBadge />}
        actions={<GhostButton onClick={loadData} disabled={loading}><RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh</GhostButton>}
      />

      <AnimatePresence mode="wait">
        <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

          {/* ── OVERVIEW METRICS ── */}
          {overview && (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 32 }}>
              <MetricCard label="Total Missions" value={overview.totalMissions} icon={<Layers3 size={16} />} color="#a78bfa" />
              <MetricCard label="Active" value={overview.activeMissions} icon={<Zap size={16} />} color="#34d399" />
              <MetricCard label="Client-Ready" value={overview.clientReadyMissions} icon={<CheckCircle2 size={16} />} color="#22c55e" />
              <MetricCard label="Delivered" value={overview.deliveredMissions} icon={<Rocket size={16} />} color="#6366f1" />
              <MetricCard label="Recurring" value={overview.recurringMissions} icon={<Repeat size={16} />} color="#8b5cf6" />
              <MetricCard label="Approved Deliverables" value={overview.approvedDeliverables} icon={<ShieldCheck size={16} />} color="#38bdf8" />
              <MetricCard label="Delivery Packages" value={overview.deliveryPackagesGenerated} icon={<Package size={16} />} color="#fb923c" />
              <MetricCard label="Active Loops" value={overview.activeLoops} icon={<Repeat size={16} />} color="#f472b6" />
              <MetricCard label="Revenue Potential" value={`$${overview.estimatedRevenuePotential.toLocaleString()}`} icon={<DollarSign size={16} />} color="#22c55e" />
            </section>
          )}

          {/* ── STATUS & TYPE BREAKDOWN ── */}
          {overview && (
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
              <Panel>
                <SectionHeader title="Mission Pipeline by Status" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(["idea", "in_production", "review", "client_ready", "delivered", "recurring"] as BusinessStatus[]).map((s) => {
                    const c = overview.missionsByStatus[s] ?? 0;
                    const cfg = BIZ_STATUS_CFG[s];
                    const total = Math.max(overview.totalMissions, 1);
                    return (
                      <div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 90, fontSize: 11, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                        <div style={{ flex: 1, height: 8, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${(c / total) * 100}%`, height: "100%", background: cfg.color, borderRadius: 4, minWidth: c > 0 ? 8 : 0, transition: "width 300ms ease" }} />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600, width: 24, textAlign: "right" }}>{c}</span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
              <Panel>
                <SectionHeader title="Missions by Type" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.entries(overview.missionsByType).sort((a, b) => b[1] - a[1]).map(([t, c]) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                      <span style={{ width: 20 }}>{MISSION_EMOJI[t] ?? "📋"}</span>
                      <span style={{ flex: 1, color: "var(--text-2)" }}>{t.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}</span>
                      <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{c}</span>
                    </div>
                  ))}
                  {Object.keys(overview.missionsByType).length === 0 && <div style={{ color: "var(--text-3)", fontSize: 12 }}>No missions yet</div>}
                </div>
              </Panel>
            </section>
          )}

          {/* ── MISSION PIPELINE ── */}
          <Panel>
            <SectionHeader title="Mission Pipeline" icon={<FileText size={12} />} />
            {pipeline.length === 0 ? (
              <EmptyState title="No missions yet" description="Launch your first mission to see the pipeline fill up with live progress." action={<Link href="/projects/new" style={{ color: "#6366f1", fontSize: 12, fontWeight: 600 }}>Launch Mission →</Link>} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {pipeline.map((e) => {
                  const cfg = BIZ_STATUS_CFG[e.businessStatus];
                  return (
                    <Link key={e.sessionId} href={`/autopilot/${e.sessionId}`} style={{ textDecoration: "none" }}>
                      <Row>
                        <span style={{ fontSize: 18 }}>{MISSION_EMOJI[e.missionType] ?? "📋"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{e.projectName.replace(/-/g, " ")}</div>
                          <div style={{ fontSize: 10, color: "var(--text-3)" }}>{e.missionLabel}</div>
                        </div>
                        <div style={{ width: 100 }}>
                          <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
                            <div style={{ width: `${e.progress}%`, height: "100%", background: cfg.color, borderRadius: 2, transition: "width 300ms ease" }} />
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-3)", textAlign: "right" }}>{e.progress}%</div>
                        </div>
                        <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                        <ArrowRight size={14} style={{ color: "var(--text-3)" }} />
                      </Row>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* ── CRM SNAPSHOT ── */}
          {crmSnap && (
            <Panel>
              <SectionHeader title="CRM Snapshot" icon={<Users size={12} />} action={<Link href="/crm" style={{ fontSize: 11, color: "#6366f1", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>Open CRM <ArrowRight size={11} /></Link>} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                <MetricCard label="Active Leads" value={crmSnap.activeLeads} color="#3b82f6" />
                <MetricCard label="Active Clients" value={crmSnap.activeClients} color="#22c55e" />
                <MetricCard label="Open Opportunities" value={crmSnap.openOpportunities} color="#fb923c" />
                <MetricCard label="Pipeline Value" value={`$${crmSnap.pipelineValue.toLocaleString()}`} color="#a78bfa" />
              </div>
            </Panel>
          )}

          {/* ── REVENUE SNAPSHOT ── */}
          {revSnap && (
            <Panel>
              <SectionHeader title="Revenue Snapshot" icon={<DollarSign size={12} />} action={<Link href="/revenue" style={{ fontSize: 11, color: "#6366f1", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>Open Revenue <ArrowRight size={11} /></Link>} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                <MetricCard label="Monthly Revenue" value={`$${revSnap.monthlyRevenue.toLocaleString()}`} color="#22c55e" />
                <MetricCard label="Proposal Conversion" value={`${revSnap.proposalConversionRate}%`} color="#f59e0b" />
                <MetricCard label="Outstanding Invoices" value={revSnap.outstandingInvoices} color="#fb923c" />
                <MetricCard label="Outstanding Value" value={`$${revSnap.outstandingInvoiceValue.toLocaleString()}`} color="#a78bfa" />
              </div>
            </Panel>
          )}

          {/* ── DISTRIBUTION SNAPSHOT ── */}
          {distSnap && (
            <Panel>
              <SectionHeader title="Distribution Snapshot" icon={<Megaphone size={12} />} action={<Link href="/distribution" style={{ fontSize: 11, color: "#6366f1", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>Open Distribution <ArrowRight size={11} /></Link>} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                <MetricCard label="Published Assets" value={distSnap.publishedAssets} color="#22c55e" />
                <MetricCard label="Active Campaigns" value={distSnap.activeCampaigns} color="#a78bfa" />
                <MetricCard label="Success Rate" value={`${distSnap.distributionSuccessRate}%`} color="#34d399" />
              </div>
            </Panel>
          )}

          {/* ── WORKSPACE SEGMENTATION ── */}
          {wsSnap.length > 0 && (
            <Panel>
              <SectionHeader title="Workspace Segmentation" icon={<Building2 size={12} />} action={<Link href="/workspaces" style={{ fontSize: 11, color: "#6366f1", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>Open Workspaces <ArrowRight size={11} /></Link>} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {wsSnap.slice(0, 5).map((w) => (
                  <Row key={w.id}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{w.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-3)" }}>Workspace activity</div>
                    </div>
                    <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>${w.metrics.revenue.toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>{w.metrics.activeMissions} missions</span>
                    <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>{w.metrics.activeCampaigns} campaigns</span>
                  </Row>
                ))}
              </div>
            </Panel>
          )}

          {/* ── RECOMMENDED ACTIONS ── */}
          <Panel>
            <SectionHeader title="Recommended Next Actions" icon={<Sparkles size={12} style={{ color: "#f59e0b" }} />} />
            {actions.length === 0 ? (
              <EmptyState title="All on track" description="No pending actions right now. Everything is moving smoothly." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {actions.map((a, i) => (
                  <Row key={i}>
                    <span style={{ color: PRIORITY_COLORS[a.priority] }}>{ACTION_ICONS[a.action] ?? <Zap size={13} />}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 1 }}>{a.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text-3)" }}>{a.description}</div>
                    </div>
                    <StatusBadge label={a.priority} color={PRIORITY_COLORS[a.priority]} />
                    <Link href={`/autopilot/${a.sessionId}`} style={{ fontSize: 11, color: "#6366f1", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>Go <ArrowRight size={11} /></Link>
                  </Row>
                ))}
              </div>
            )}
          </Panel>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
