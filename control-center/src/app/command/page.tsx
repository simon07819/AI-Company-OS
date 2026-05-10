"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  DollarSign,
  Layers3,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

interface CommandAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
}

interface CommandAction {
  id: string;
  priority: "high" | "medium" | "low";
  label: string;
  description: string;
  href: string;
}

interface CommandOverview {
  healthScore: number;
  healthGrade: "excellent" | "stable" | "watch" | "critical";
  workspaces: { total: number; active: number; top: Array<{ id: string; name: string; metrics: { revenue: number; activeMissions: number; activeCampaigns: number } }> };
  missions: { total: number; active: number; clientReady: number; delivered: number; pendingApprovals: number; pipeline: Array<{ sessionId: string; projectName: string; missionLabel: string; businessStatus: string; progress: number }> };
  runtime: { totalAgents: number; activeAgents: number; failedAgents: number; queuedTasks: number; agents: Array<{ agentId: string; status: string; progress: number; currentMissionId: string | null }> };
  revenue: { monthlyRevenue: number; pipelineValue: number; outstandingInvoiceValue: number; proposalConversionRate: number };
  crm: { activeLeads: number; activeClients: number; openOpportunities: number; pipelineValue: number };
  distribution: { publishedAssets: number; activeCampaigns: number; failedJobs: number; distributionSuccessRate: number };
  loops: { total: number; active: number; paused: number };
  deliveryPackages: { generated: number; pendingApprovals: number };
  alerts: CommandAlert[];
  actions: CommandAction[];
}

const HEALTH_COLOR = {
  excellent: "#22c55e",
  stable: "#3b82f6",
  watch: "#f59e0b",
  critical: "#f43f5e",
};

const ALERT_COLOR = {
  critical: "#f43f5e",
  warning: "#f59e0b",
  info: "#38bdf8",
};

export default function CommandPage() {
  const [overview, setOverview] = useState<CommandOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/command/overview");
      if (res.ok) {
        const data = await res.json();
        setOverview(data.overview);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>
            <ShieldCheck size={22} style={{ display: "inline", marginRight: 8, verticalAlign: -4 }} />
            CEO Command Center
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: "4px 0 0" }}>Executive overview across workspaces, missions, revenue, clients, runtime and distribution</p>
        </div>
        <button onClick={loadData} disabled={loading} style={ghostButton}>
          <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key="command" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {overview && (
            <>
              <section style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, marginBottom: 32 }}>
                <div style={{ ...panelStyle, marginBottom: 0 }}>
                  <div style={sectionTitle}><ShieldCheck size={12} /> Company Health Score</div>
                  <div style={{ fontSize: 54, lineHeight: 1, fontWeight: 800, color: HEALTH_COLOR[overview.healthGrade] }}>{overview.healthScore}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginTop: 8 }}>{overview.healthGrade}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                  <Metric label="Monthly Revenue" value={`$${overview.revenue.monthlyRevenue.toLocaleString()}`} icon={<DollarSign size={15} />} color="#22c55e" />
                  <Metric label="Revenue Pipeline" value={`$${overview.revenue.pipelineValue.toLocaleString()}`} icon={<BarChart3 size={15} />} color="#a78bfa" />
                  <Metric label="Active Workspaces" value={overview.workspaces.active} icon={<Building2 size={15} />} color="#6366f1" />
                  <Metric label="Active Agents" value={`${overview.runtime.activeAgents}/${overview.runtime.totalAgents}`} icon={<Bot size={15} />} color="#38bdf8" />
                  <Metric label="Approvals" value={overview.missions.pendingApprovals} icon={<CheckCircle2 size={15} />} color="#f59e0b" />
                  <Metric label="Published Assets" value={overview.distribution.publishedAssets} icon={<Megaphone size={15} />} color="#34d399" />
                </div>
              </section>

              <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                <Panel title="Revenue Snapshot" icon={<DollarSign size={12} />}>
                  <MiniGrid items={[
                    ["Monthly", `$${overview.revenue.monthlyRevenue.toLocaleString()}`, "#22c55e"],
                    ["Pipeline", `$${overview.revenue.pipelineValue.toLocaleString()}`, "#a78bfa"],
                    ["Outstanding", `$${overview.revenue.outstandingInvoiceValue.toLocaleString()}`, "#fb923c"],
                    ["Conversion", `${overview.revenue.proposalConversionRate}%`, "#f59e0b"],
                  ]} />
                </Panel>
                <Panel title="Client Pipeline" icon={<Users size={12} />}>
                  <MiniGrid items={[
                    ["Active Leads", overview.crm.activeLeads, "#f59e0b"],
                    ["Active Clients", overview.crm.activeClients, "#22c55e"],
                    ["Opportunities", overview.crm.openOpportunities, "#a78bfa"],
                    ["CRM Pipeline", `$${overview.crm.pipelineValue.toLocaleString()}`, "#38bdf8"],
                  ]} />
                </Panel>
              </section>

              <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                <Panel title="Active Workspaces" icon={<Building2 size={12} />}>
                  {overview.workspaces.top.length === 0 ? <Empty /> : overview.workspaces.top.map((workspace) => (
                    <Row key={workspace.id} title={workspace.name} sub={`${workspace.metrics.activeMissions} active missions · ${workspace.metrics.activeCampaigns} campaigns`} value={`$${workspace.metrics.revenue.toLocaleString()}`} color="#22c55e" />
                  ))}
                </Panel>
                <Panel title="Autonomous Agents Status" icon={<Bot size={12} />}>
                  {overview.runtime.agents.map((agent) => (
                    <Row key={agent.agentId} title={agent.agentId.replace(/_/g, " ")} sub={agent.currentMissionId ?? "No active mission"} value={agent.status} color={agent.status === "failed" ? "#f43f5e" : agent.status === "idle" ? "#94a3b8" : "#22c55e"} />
                  ))}
                </Panel>
              </section>

              <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                <Panel title="Mission Pipeline" icon={<Layers3 size={12} />}>
                  {overview.missions.pipeline.length === 0 ? <Empty /> : overview.missions.pipeline.map((mission) => (
                    <Link key={mission.sessionId} href={`/autopilot/${mission.sessionId}`} style={{ textDecoration: "none" }}>
                      <Row title={mission.projectName.replace(/-/g, " ")} sub={`${mission.missionLabel} · ${mission.businessStatus.replace(/_/g, " ")}`} value={`${mission.progress}%`} color="#6366f1" />
                    </Link>
                  ))}
                </Panel>
                <Panel title="Distribution Activity" icon={<Megaphone size={12} />}>
                  <MiniGrid items={[
                    ["Assets", overview.distribution.publishedAssets, "#22c55e"],
                    ["Campaigns", overview.distribution.activeCampaigns, "#a78bfa"],
                    ["Failures", overview.distribution.failedJobs, "#f43f5e"],
                    ["Success", `${overview.distribution.distributionSuccessRate}%`, "#34d399"],
                  ]} />
                  <div style={{ height: 12 }} />
                  <MiniGrid items={[
                    ["Loops Active", overview.loops.active, "#22c55e"],
                    ["Loops Paused", overview.loops.paused, "#f59e0b"],
                    ["Packages", overview.deliveryPackages.generated, "#38bdf8"],
                    ["Pending", overview.deliveryPackages.pendingApprovals, "#fb923c"],
                  ]} />
                </Panel>
              </section>

              <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                <Panel title="Critical Alerts" icon={<AlertTriangle size={12} />}>
                  {overview.alerts.length === 0 ? <Empty text="No critical alerts." /> : overview.alerts.map((alert) => (
                    <div key={alert.id} style={{ ...alertRow, borderColor: `${ALERT_COLOR[alert.severity]}55` }}>
                      <div style={{ color: ALERT_COLOR[alert.severity] }}><AlertTriangle size={13} /></div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{alert.title}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{alert.description}</div>
                      </div>
                    </div>
                  ))}
                </Panel>
                <Panel title="Recommended CEO Actions" icon={<Sparkles size={12} />}>
                  {overview.actions.length === 0 ? <Empty text="No recommended actions." /> : overview.actions.map((action) => (
                    <Link key={action.id} href={action.href} style={{ textDecoration: "none" }}>
                      <div style={actionRow}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{action.label}</div>
                          <div style={{ fontSize: 10, color: "var(--text-3)" }}>{action.description}</div>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: action.priority === "high" ? "#f43f5e" : action.priority === "medium" ? "#f59e0b" : "#94a3b8", textTransform: "uppercase" }}>{action.priority}</span>
                        <ArrowRight size={12} style={{ color: "var(--text-3)" }} />
                      </div>
                    </Link>
                  ))}
                </Panel>
              </section>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Metric({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div style={metricCard}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ color }}>{icon}</span>
        <span style={metricLabel}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={panelStyle}>
      <div style={sectionTitle}>{icon} {title}</div>
      {children}
    </section>
  );
}

function MiniGrid({ items }: { items: Array<[string, string | number, string]> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
      {items.map(([label, value, color]) => (
        <div key={label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 17, fontWeight: 800, color }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function Row({ title, sub, value, color }: { title: string; sub: string; value: string | number; color: string }) {
  return (
    <div style={rowStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: "capitalize" }}>{value}</span>
    </div>
  );
}

function Empty({ text = "No data yet." }: { text?: string }) {
  return <div style={{ color: "var(--text-3)", fontSize: 13, padding: "8px 0" }}>{text}</div>;
}

const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "18px 22px",
  marginBottom: 0,
};

const metricCard: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "14px 16px",
};

const metricLabel: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text-3)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const sectionTitle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-3)",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: 14,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 12px",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  marginBottom: 5,
};

const alertRow: React.CSSProperties = {
  display: "flex",
  gap: 9,
  padding: "10px 12px",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  marginBottom: 6,
};

const actionRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  marginBottom: 6,
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
