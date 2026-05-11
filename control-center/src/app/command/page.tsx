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
  Clock,
  DollarSign,
  Eye,
  FileText,
  Layers3,
  Megaphone,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import {
  EmptyState,
  ErrorBanner,
  GhostButton,
  LocalBadge,
  MetricCard,
  PageHeader,
  Panel,
  Row,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";

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

interface OnboardingSummary {
  completed: boolean;
  currentStep: string;
}

interface PendingApproval {
  id: string;
  title: string;
  type: string;
  agentName: string;
  qualityScore?: number;
  summary: string;
  createdAt: string;
}

interface RecentOutput {
  id: string;
  title: string;
  type: string;
  status: string;
  assignedAgent: string;
  preview: string;
  updatedAt: string;
}

interface ActiveRevision {
  id: string;
  outputId: string;
  comment: string;
  direction: string;
  agentId: string;
  status: string;
  createdAt: string;
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
  const [onboarding, setOnboarding] = useState<OnboardingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [recentOutputs, setRecentOutputs] = useState<RecentOutput[]>([]);
  const [activeRevisions, setActiveRevisions] = useState<ActiveRevision[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, onboardingRes, approvalsRes, outputsRes, revisionsRes] = await Promise.all([
        fetch("/api/command/overview"),
        fetch("/api/onboarding"),
        fetch("/api/approvals"),
        fetch("/api/visible-outputs"),
        fetch("/api/revisions?pending=true"),
      ]);
      if (res.ok) {
        const data = await res.json();
        setOverview(data.overview);
      }
      if (onboardingRes.ok) {
        const data = await onboardingRes.json();
        setOnboarding(data.onboarding.state);
      }
      if (approvalsRes.ok) {
        const data = await approvalsRes.json();
        setPendingApprovals((data.pending ?? []).slice(0, 5));
      }
      if (outputsRes.ok) {
        const data = await outputsRes.json();
        setRecentOutputs((data.outputs ?? []).slice(0, 5));
      }
      if (revisionsRes.ok) {
        const data = await revisionsRes.json();
        setActiveRevisions((data.revisions ?? []).slice(0, 5));
      }
      if (!res.ok) {
        setError("Failed to load command overview. Check that the local API is running.");
      }
    } catch {
      setError("Network error — could not reach the local API. Ensure the dev server is running.");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>
      <PageHeader
        icon={<ShieldCheck size={22} />}
        title="CEO Command Center"
        description="Executive overview across workspaces, missions, revenue, clients, runtime and distribution — your single pane of glass for local-first operations."
        badge={<LocalBadge />}
        actions={
          <GhostButton onClick={loadData} disabled={loading}>
            <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
          </GhostButton>
        }
      />

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {onboarding && !onboarding.completed && (
        <Link href="/onboarding" style={{ textDecoration: "none" }}>
          <Panel style={{ marginBottom: 24, borderColor: "rgba(99,102,241,0.45)", background: "rgba(99,102,241,0.10)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Sparkles size={18} style={{ color: "#a78bfa" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>Finish AI Company OS setup</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>Complete onboarding to configure company identity, workspace defaults, revenue, CRM, distribution and autonomy.</div>
              </div>
              <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 800, display: "flex", alignItems: "center", gap: 4 }}>
                Continue setup <ArrowRight size={12} />
              </span>
            </div>
          </Panel>
        </Link>
      )}

      <AnimatePresence mode="wait">
        <motion.div key="command" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {overview && (
            <>
              <section style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, marginBottom: 32 }}>
                <Panel style={{ marginBottom: 0 }}>
                  <SectionHeader icon={<ShieldCheck size={12} />} title="Company Health Score" />
                  <div style={{ fontSize: 54, lineHeight: 1, fontWeight: 800, color: HEALTH_COLOR[overview.healthGrade] }}>{overview.healthScore}</div>
                  <StatusBadge label={overview.healthGrade} color={HEALTH_COLOR[overview.healthGrade]} size="md" />
                </Panel>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                  <MetricCard label="Monthly Revenue" value={`$${overview.revenue.monthlyRevenue.toLocaleString()}`} icon={<DollarSign size={15} />} color="#22c55e" />
                  <MetricCard label="Revenue Pipeline" value={`$${overview.revenue.pipelineValue.toLocaleString()}`} icon={<BarChart3 size={15} />} color="#a78bfa" />
                  <MetricCard label="Active Workspaces" value={overview.workspaces.active} icon={<Building2 size={15} />} color="#6366f1" />
                  <MetricCard label="Active Agents" value={`${overview.runtime.activeAgents}/${overview.runtime.totalAgents}`} icon={<Bot size={15} />} color="#38bdf8" />
                  <MetricCard label="Approvals" value={overview.missions.pendingApprovals} icon={<CheckCircle2 size={15} />} color="#f59e0b" />
                  <MetricCard label="Published Assets" value={overview.distribution.publishedAssets} icon={<Megaphone size={15} />} color="#34d399" />
                </div>
              </section>

              <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                <Panel style={{ marginBottom: 0 }}>
                  <SectionHeader icon={<DollarSign size={12} />} title="Revenue Snapshot" />
                  <MiniGrid items={[
                    ["Monthly", `$${overview.revenue.monthlyRevenue.toLocaleString()}`, "#22c55e"],
                    ["Pipeline", `$${overview.revenue.pipelineValue.toLocaleString()}`, "#a78bfa"],
                    ["Outstanding", `$${overview.revenue.outstandingInvoiceValue.toLocaleString()}`, "#fb923c"],
                    ["Conversion", `${overview.revenue.proposalConversionRate}%`, "#f59e0b"],
                  ]} />
                </Panel>
                <Panel style={{ marginBottom: 0 }}>
                  <SectionHeader icon={<Users size={12} />} title="Client Pipeline" />
                  <MiniGrid items={[
                    ["Active Leads", overview.crm.activeLeads, "#f59e0b"],
                    ["Active Clients", overview.crm.activeClients, "#22c55e"],
                    ["Opportunities", overview.crm.openOpportunities, "#a78bfa"],
                    ["CRM Pipeline", `$${overview.crm.pipelineValue.toLocaleString()}`, "#38bdf8"],
                  ]} />
                </Panel>
              </section>

              <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                <Panel style={{ marginBottom: 0 }}>
                  <SectionHeader icon={<Building2 size={12} />} title="Active Workspaces" />
                  {overview.workspaces.top.length === 0 ? (
                    <EmptyState title="No workspaces yet" description="Create a workspace to start organizing missions and revenue. Go to the Workspaces page to add one." />
                  ) : overview.workspaces.top.map((workspace) => (
                    <Row key={workspace.id}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{workspace.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{workspace.metrics.activeMissions} active missions · {workspace.metrics.activeCampaigns} campaigns</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#22c55e", textTransform: "capitalize" }}>${workspace.metrics.revenue.toLocaleString()}</span>
                    </Row>
                  ))}
                </Panel>
                <Panel style={{ marginBottom: 0 }}>
                  <SectionHeader icon={<Bot size={12} />} title="Autonomous Agents Status" />
                  {overview.runtime.agents.map((agent) => (
                    <Row key={agent.agentId}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agent.agentId.replace(/_/g, " ")}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agent.currentMissionId ?? "No active mission"}</div>
                      </div>
                      <StatusBadge label={agent.status} color={agent.status === "failed" ? "#f43f5e" : agent.status === "idle" ? "#94a3b8" : "#22c55e"} />
                    </Row>
                  ))}
                </Panel>
              </section>

              <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                <Panel style={{ marginBottom: 0 }}>
                  <SectionHeader icon={<Layers3 size={12} />} title="Mission Pipeline" />
                  {overview.missions.pipeline.length === 0 ? (
                    <EmptyState title="No missions in pipeline" description="Launch a mission from Autopilot to start generating deliverables and tracking progress." />
                  ) : overview.missions.pipeline.map((mission) => (
                    <Link key={mission.sessionId} href={`/autopilot/${mission.sessionId}`} style={{ textDecoration: "none" }}>
                      <Row>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mission.projectName.replace(/-/g, " ")}</div>
                          <div style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mission.missionLabel} · {mission.businessStatus.replace(/_/g, " ")}</div>
                        </div>
                        <StatusBadge label={`${mission.progress}%`} color="#6366f1" />
                      </Row>
                    </Link>
                  ))}
                </Panel>
                <Panel style={{ marginBottom: 0 }}>
                  <SectionHeader icon={<Megaphone size={12} />} title="Distribution Activity" />
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
                <Panel style={{ marginBottom: 0 }}>
                  <SectionHeader icon={<AlertTriangle size={12} />} title="Critical Alerts" />
                  {overview.alerts.length === 0 ? (
                    <EmptyState title="No critical alerts" description="All systems are operating normally. Alerts will appear here when issues need CEO attention." />
                  ) : overview.alerts.map((alert) => (
                    <Row key={alert.id} style={{ borderColor: `${ALERT_COLOR[alert.severity]}55` }}>
                      <div style={{ color: ALERT_COLOR[alert.severity] }}><AlertTriangle size={13} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{alert.title}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{alert.description}</div>
                      </div>
                      <StatusBadge label={alert.severity} color={ALERT_COLOR[alert.severity]} />
                    </Row>
                  ))}
                </Panel>
                <Panel style={{ marginBottom: 0 }}>
                  <SectionHeader icon={<Sparkles size={12} />} title="Recommended CEO Actions" />
                  {overview.actions.length === 0 ? (
                    <EmptyState title="No recommended actions" description="The system will surface priority actions here when decisions are needed from leadership." />
                  ) : overview.actions.map((action) => (
                    <Link key={action.id} href={action.href} style={{ textDecoration: "none" }}>
                      <Row>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{action.label}</div>
                          <div style={{ fontSize: 10, color: "var(--text-3)" }}>{action.description}</div>
                        </div>
                        <StatusBadge
                          label={action.priority}
                          color={action.priority === "high" ? "#f43f5e" : action.priority === "medium" ? "#f59e0b" : "#94a3b8"}
                        />
                        <ArrowRight size={12} style={{ color: "var(--text-3)" }} />
                      </Row>
                    </Link>
                  ))}
                </Panel>
              </section>

              {/* Pending Approvals */}
              {pendingApprovals.length > 0 && (
                <section style={{ marginBottom: 32 }}>
                  <SectionHeader icon={<CheckCircle2 size={12} style={{ color: "#f59e0b" }} />} title="Pending Approvals" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Panel style={{ marginBottom: 0 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {pendingApprovals.map((approval) => {
                          const typeColor: Record<string, string> = { invoice: "#22c55e", logo: "#8b5cf6", flyer: "#ec4899", website: "#06b6d4", strategy: "#f59e0b", mission: "#3b82f6", deliverable: "#3b82f6", document: "#94a3b8", file: "#94a3b8" };
                          const color = typeColor[approval.type] ?? "#64748b";
                          return (
                            <Link key={approval.id} href={`/ceo`} style={{ textDecoration: "none" }}>
                              <div style={{
                                padding: "10px 12px", borderRadius: 8, border: `1px solid ${color}20`,
                                borderLeft: `3px solid ${color}`, background: `${color}04`,
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{approval.title}</span>
                                  <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: `${color}12`, color, fontWeight: 600 }}>{approval.type}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontSize: 10, color: "var(--text-3)" }}>{approval.agentName}</span>
                                  {approval.qualityScore != null && (
                                    <span style={{ fontSize: 10, fontWeight: 700, color: approval.qualityScore >= 80 ? "#22c55e" : "#f59e0b" }}>{approval.qualityScore}/100</span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </Panel>

                    {/* Active Revisions */}
                    <Panel style={{ marginBottom: 0 }}>
                      <SectionHeader icon={<RefreshCw size={12} style={{ color: "#f59e0b" }} />} title="Active Revisions" />
                      {activeRevisions.length === 0 ? (
                        <div style={{ fontSize: 11, color: "var(--text-3)", padding: "10px 0" }}>No active revisions</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {activeRevisions.map((rev) => (
                            <Link key={rev.id} href={`/outputs/${rev.outputId}`} style={{ textDecoration: "none" }}>
                              <div style={{
                                padding: "10px 12px", borderRadius: 8,
                                border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)",
                              }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{rev.comment}</div>
                                {rev.direction && <div style={{ fontSize: 9, color: "#f59e0b", marginBottom: 2 }}>Direction: {rev.direction}</div>}
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 9, color: "var(--text-3)" }}>{rev.agentId.replace(/_/g, " ")}</span>
                                  <span style={{ fontSize: 9, color: "var(--text-3)" }}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </Panel>
                  </div>
                </section>
              )}

              {/* Recent Outputs */}
              {recentOutputs.length > 0 && (
                <section style={{ marginBottom: 32 }}>
                  <SectionHeader icon={<Eye size={12} style={{ color: "#a78bfa" }} />} title="Latest Generated Outputs" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                    {recentOutputs.map((output) => {
                      const typeColor: Record<string, string> = { creative_brief: "#a78bfa", logo_direction: "#8b5cf6", color_palette: "#f472b6", architecture_doc: "#38bdf8", invoice_preview: "#22c55e", hero_section: "#818cf8" };
                      const color = typeColor[output.type] ?? "#64748b";
                      return (
                        <Link key={output.id} href={`/outputs/${output.id}`} style={{ textDecoration: "none" }}>
                          <div style={{
                            padding: "10px 12px", borderRadius: 8,
                            border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`, background: `${color}04`,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{output.title}</span>
                            </div>
                            <p style={{ fontSize: 9, color: "var(--text-3)", margin: 0, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {output.preview || output.status}
                            </p>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                              <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: `${color}12`, color, fontWeight: 600 }}>{output.type.replace(/_/g, " ")}</span>
                              <span style={{ fontSize: 9, color: "var(--text-3)" }}>{new Date(output.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
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
