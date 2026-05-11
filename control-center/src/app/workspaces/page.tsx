"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Archive,
  Building2,
  DollarSign,
  Edit3,
  Layers3,
  Megaphone,
  Palette,
  PlusCircle,
  RefreshCw,
  Settings2,
  Trash2,
  Users,
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
  PrimaryButton,
  Row,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";

interface WorkspaceMetrics {
  activeMissions: number;
  totalMissions: number;
  revenue: number;
  proposalValue: number;
  activeCampaigns: number;
  publishedAssets: number;
  crmClients: number;
  crmLeads: number;
}

interface CompanyWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  industry: string;
  primaryMissionTypes: string[];
  activeMissionIds: string[];
  revenue: number;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    tone: string;
    logoUrl: string | null;
  };
  automationLevel: "manual" | "assisted" | "autonomous";
  metrics: WorkspaceMetrics;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string | null;
}

interface WorkspaceOverview {
  totalWorkspaces: number;
  activeWorkspaces: number;
  totalRevenue: number;
  activeMissions: number;
  activeCampaigns: number;
  publishedAssets: number;
  crmClients: number;
  crmLeads: number;
  workspaces: CompanyWorkspace[];
}

interface MissionSummary {
  sessionId: string;
  projectName: string;
  missionType: string;
  status: string;
}

const AUTOMATION_COLORS = {
  manual: "#94a3b8",
  assisted: "#3b82f6",
  autonomous: "#22c55e",
};

export default function WorkspacesPage() {
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editRevenue, setEditRevenue] = useState("");
  const [editAutomation, setEditAutomation] = useState<CompanyWorkspace["automationLevel"]>("assisted");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [workspaceRes, missionRes] = await Promise.all([
        fetch("/api/workspaces"),
        fetch("/api/autopilot/sessions"),
      ]);
      if (workspaceRes.ok) {
        const data = await workspaceRes.json();
        const workspaces = data.workspaces ?? [];
        setOverview({
          totalWorkspaces: workspaces.length,
          activeWorkspaces: workspaces.filter((workspace: CompanyWorkspace) => workspace.metrics.totalMissions > 0).length,
          totalRevenue: workspaces.reduce((sum: number, workspace: CompanyWorkspace) => sum + workspace.metrics.revenue, 0),
          activeMissions: workspaces.reduce((sum: number, workspace: CompanyWorkspace) => sum + workspace.metrics.activeMissions, 0),
          activeCampaigns: workspaces.reduce((sum: number, workspace: CompanyWorkspace) => sum + workspace.metrics.activeCampaigns, 0),
          publishedAssets: workspaces.reduce((sum: number, workspace: CompanyWorkspace) => sum + workspace.metrics.publishedAssets, 0),
          crmClients: workspaces.reduce((sum: number, workspace: CompanyWorkspace) => sum + workspace.metrics.crmClients, 0),
          crmLeads: workspaces.reduce((sum: number, workspace: CompanyWorkspace) => sum + workspace.metrics.crmLeads, 0),
          workspaces,
        });
      }
      if (missionRes.ok) {
        const data = await missionRes.json();
        setMissions(data.sessions ?? []);
      }
      if (!workspaceRes.ok) {
        setError("Failed to load workspaces. Check that the local API is running.");
      }
    } catch {
      setError("Network error — could not reach the local API. Ensure the dev server is running.");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const createWorkspace = async () => {
    await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || "New Brand Workspace",
        industry: industry || "general",
        primaryMissionTypes: ["saas_project", "website"],
      }),
    });
    setName("");
    setIndustry("");
    loadData();
  };

  const assignMission = async (workspaceId: string, missionId: string) => {
    await fetch(`/api/workspaces/${workspaceId}/assign-mission`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionId }),
    });
    loadData();
  };

  const workspaceAction = async (workspaceId: string, body: Record<string, unknown>, method = "PATCH") => {
    await fetch(`/api/workspaces/${workspaceId}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditingId(null);
    loadData();
  };

  const startEdit = (workspace: CompanyWorkspace) => {
    setEditingId(workspace.id);
    setEditName(workspace.name);
    setEditIndustry(workspace.industry);
    setEditRevenue(String(workspace.revenue ?? workspace.metrics.revenue ?? 0));
    setEditAutomation(workspace.automationLevel);
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader
        icon={<Building2 size={20} />}
        title="Company Workspaces"
        description="Brands, companies and autonomous workspace segmentation — organize your portfolio by brand, industry, or business unit."
        badge={<LocalBadge />}
        actions={
          <GhostButton onClick={loadData} disabled={loading}>
            <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
          </GhostButton>
        }
      />

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <AnimatePresence mode="wait">
        <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {overview && (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 12, marginBottom: 32 }}>
              <MetricCard label="Workspaces" value={overview.totalWorkspaces} icon={<Building2 size={15} />} color="#6366f1" />
              <MetricCard label="Active" value={overview.activeWorkspaces} icon={<Zap size={15} />} color="#22c55e" />
              <MetricCard label="Revenue" value={`$${overview.totalRevenue.toLocaleString()}`} icon={<DollarSign size={15} />} color="#34d399" />
              <MetricCard label="Active Missions" value={overview.activeMissions} icon={<Layers3 size={15} />} color="#f59e0b" />
              <MetricCard label="Campaigns" value={overview.activeCampaigns} icon={<Megaphone size={15} />} color="#a78bfa" />
              <MetricCard label="CRM Clients" value={overview.crmClients} icon={<Users size={15} />} color="#38bdf8" />
            </section>
          )}

          <Panel>
            <SectionHeader icon={<PlusCircle size={12} />} title="Create Workspace" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 8 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace or brand name" style={inputStyle} />
              <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry" style={inputStyle} />
              <PrimaryButton onClick={createWorkspace}><PlusCircle size={12} /> Create</PrimaryButton>
            </div>
          </Panel>

          <Panel>
            <SectionHeader icon={<Briefcase size={12} />} title="Brands and Workspace Activity" />
            {!overview || overview.workspaces.length === 0 ? (
              <EmptyState title="No workspaces yet" description="Create your first workspace above to start organizing brands, missions, and revenue by business unit." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {overview.workspaces.map((workspace) => (
                  <div key={workspace.id} style={workspaceCard}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: workspace.branding.primaryColor, border: `3px solid ${workspace.branding.secondaryColor}` }} />
                      <div style={{ flex: 1 }}>
                        {editingId === workspace.id ? (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 120px 130px auto", gap: 8, marginBottom: 10 }}>
                            <input value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} />
                            <input value={editIndustry} onChange={(e) => setEditIndustry(e.target.value)} style={inputStyle} />
                            <input value={editRevenue} onChange={(e) => setEditRevenue(e.target.value)} type="number" style={inputStyle} />
                            <select value={editAutomation} onChange={(e) => setEditAutomation(e.target.value as CompanyWorkspace["automationLevel"])} style={inputStyle}>
                              <option value="manual">Manual</option>
                              <option value="assisted">Assisted</option>
                              <option value="autonomous">Autonomous</option>
                            </select>
                            <PrimaryButton onClick={() => workspaceAction(workspace.id, { name: editName, industry: editIndustry, revenue: Number(editRevenue) || 0, automationLevel: editAutomation })}>Save</PrimaryButton>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{workspace.name}</div>
                              <StatusBadge label={workspace.automationLevel} color={AUTOMATION_COLORS[workspace.automationLevel]} />
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>{workspace.industry} · {workspace.primaryMissionTypes.join(", ")}</div>
                          </>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                          <MiniStat label="Revenue" value={`$${workspace.metrics.revenue.toLocaleString()}`} color="#22c55e" />
                          <MiniStat label="Missions" value={workspace.metrics.totalMissions} color="#f59e0b" />
                          <MiniStat label="Campaigns" value={workspace.metrics.activeCampaigns} color="#a78bfa" />
                          <MiniStat label="Assets" value={workspace.metrics.publishedAssets} color="#38bdf8" />
                          <MiniStat label="CRM" value={`${workspace.metrics.crmClients} clients`} color="#6366f1" />
                        </div>
                        {workspace.activeMissionIds.length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                            {workspace.activeMissionIds.map((missionId) => (
                              <button key={missionId} onClick={() => workspaceAction(workspace.id, { activeMissionIds: workspace.activeMissionIds.filter((id) => id !== missionId) })} style={smallButtonStyle}>
                                Remove {missionId.slice(0, 10)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 170 }}>
                        <select onChange={(e) => e.target.value && assignMission(workspace.id, e.target.value)} value="" style={inputStyle}>
                          <option value="">Assign mission</option>
                          {missions
                            .filter((mission) => !workspace.activeMissionIds.includes(mission.sessionId))
                            .map((mission) => (
                              <option key={mission.sessionId} value={mission.sessionId}>{mission.projectName || mission.sessionId}</option>
                            ))}
                        </select>
                        <GhostButton onClick={() => startEdit(workspace)}><Edit3 size={10} /> Edit</GhostButton>
                        <GhostButton onClick={() => workspaceAction(workspace.id, { action: "archive" })}><Archive size={10} /> Archive</GhostButton>
                        <GhostButton onClick={() => workspaceAction(workspace.id, {}, "DELETE")}><Trash2 size={10} /> Delete</GhostButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
            <Panel style={{ marginBottom: 0 }}>
              <SectionHeader icon={<DollarSign size={12} />} title="Revenue by Workspace" />
              {overview?.workspaces.map((workspace) => (
                <BarRow key={workspace.id} label={workspace.name} value={workspace.metrics.revenue} max={Math.max(overview.totalRevenue, 1)} color="#22c55e" />
              ))}
            </Panel>
            <Panel style={{ marginBottom: 0 }}>
              <SectionHeader icon={<Settings2 size={12} />} title="Automation Level" />
              {overview?.workspaces.map((workspace) => (
                <BarRow key={workspace.id} label={workspace.name} value={workspace.automationLevel === "autonomous" ? 100 : workspace.automationLevel === "assisted" ? 60 : 25} max={100} color={AUTOMATION_COLORS[workspace.automationLevel]} suffix="%" />
              ))}
            </Panel>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
            <Panel style={{ marginBottom: 0 }}>
              <SectionHeader icon={<Megaphone size={12} />} title="Distribution Activity" />
              {overview?.workspaces.map((workspace) => (
                <BarRow key={workspace.id} label={workspace.name} value={workspace.metrics.publishedAssets + workspace.metrics.activeCampaigns} max={Math.max(overview.publishedAssets + overview.activeCampaigns, 1)} color="#a78bfa" />
              ))}
            </Panel>
            <Panel style={{ marginBottom: 0 }}>
              <SectionHeader icon={<Users size={12} />} title="CRM Stats" />
              {overview?.workspaces.map((workspace) => (
                <BarRow key={workspace.id} label={workspace.name} value={workspace.metrics.crmClients + workspace.metrics.crmLeads} max={Math.max(overview.crmClients + overview.crmLeads, 1)} color="#38bdf8" />
              ))}
            </Panel>
          </section>

          <Panel>
            <SectionHeader icon={<Palette size={12} />} title="Brand Profiles" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {overview?.workspaces.map((workspace) => (
                <div key={workspace.id} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 12 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 5, background: workspace.branding.primaryColor }} />
                    <span style={{ width: 22, height: 22, borderRadius: 5, background: workspace.branding.secondaryColor }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{workspace.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>Tone: {workspace.branding.tone}</div>
                </div>
              ))}
            </div>
          </Panel>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 10px" }}>
      <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function BarRow({ label, value, max, color, suffix = "" }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ width: 120, fontSize: 11, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", background: color, borderRadius: 4, minWidth: value > 0 ? 8 : 0 }} />
      </div>
      <span style={{ width: 64, textAlign: "right", fontSize: 11, color, fontWeight: 700 }}>{suffix ? `${value}${suffix}` : value.toLocaleString()}</span>
    </div>
  );
}

const workspaceCard: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: 14,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 12,
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  outline: "none",
};

const smallButtonStyle: React.CSSProperties = {
  padding: "4px 7px",
  borderRadius: 5,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text-2)",
  fontSize: 10,
  cursor: "pointer",
};
