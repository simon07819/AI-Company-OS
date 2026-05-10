"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  DollarSign,
  Layers3,
  Megaphone,
  Palette,
  PlusCircle,
  RefreshCw,
  Settings2,
  Users,
  Zap,
} from "lucide-react";

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
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");

  const loadData = async () => {
    setLoading(true);
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
    } catch { /* ignore */ }
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

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            <Building2 size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3 }} />
            Company Workspaces
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: "4px 0 0" }}>Brands, companies and autonomous workspace segmentation</p>
        </div>
        <button onClick={loadData} disabled={loading} style={ghostButton}>
          <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {overview && (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 12, marginBottom: 32 }}>
              {[
                { label: "Workspaces", value: overview.totalWorkspaces, icon: <Building2 size={15} />, color: "#6366f1" },
                { label: "Active", value: overview.activeWorkspaces, icon: <Zap size={15} />, color: "#22c55e" },
                { label: "Revenue", value: `$${overview.totalRevenue.toLocaleString()}`, icon: <DollarSign size={15} />, color: "#34d399" },
                { label: "Active Missions", value: overview.activeMissions, icon: <Layers3 size={15} />, color: "#f59e0b" },
                { label: "Campaigns", value: overview.activeCampaigns, icon: <Megaphone size={15} />, color: "#a78bfa" },
                { label: "CRM Clients", value: overview.crmClients, icon: <Users size={15} />, color: "#38bdf8" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={metricCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ color }}>{icon}</span>
                    <span style={metricLabel}>{label}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </section>
          )}

          <section style={panelStyle}>
            <div style={sectionTitle}><PlusCircle size={12} /> Create Workspace</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 8 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace or brand name" style={inputStyle} />
              <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry" style={inputStyle} />
              <button onClick={createWorkspace} style={primaryButton}><PlusCircle size={12} /> Create</button>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitle}><Briefcase size={12} /> Brands and Workspace Activity</div>
            {!overview || overview.workspaces.length === 0 ? <div style={emptyStyle}>No workspaces yet.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {overview.workspaces.map((workspace) => (
                  <div key={workspace.id} style={workspaceCard}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: workspace.branding.primaryColor, border: `3px solid ${workspace.branding.secondaryColor}` }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{workspace.name}</div>
                          <span style={{ fontSize: 10, color: AUTOMATION_COLORS[workspace.automationLevel], background: `${AUTOMATION_COLORS[workspace.automationLevel]}18`, padding: "3px 8px", borderRadius: "var(--radius-sm)", textTransform: "uppercase" }}>
                            {workspace.automationLevel}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>{workspace.industry} · {workspace.primaryMissionTypes.join(", ")}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                          <MiniStat label="Revenue" value={`$${workspace.metrics.revenue.toLocaleString()}`} color="#22c55e" />
                          <MiniStat label="Missions" value={workspace.metrics.totalMissions} color="#f59e0b" />
                          <MiniStat label="Campaigns" value={workspace.metrics.activeCampaigns} color="#a78bfa" />
                          <MiniStat label="Assets" value={workspace.metrics.publishedAssets} color="#38bdf8" />
                          <MiniStat label="CRM" value={`${workspace.metrics.crmClients} clients`} color="#6366f1" />
                        </div>
                      </div>
                      <select onChange={(e) => e.target.value && assignMission(workspace.id, e.target.value)} value="" style={inputStyle}>
                        <option value="">Assign mission</option>
                        {missions
                          .filter((mission) => !workspace.activeMissionIds.includes(mission.sessionId))
                          .map((mission) => (
                            <option key={mission.sessionId} value={mission.sessionId}>{mission.projectName || mission.sessionId}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
            <div style={panelStyle}>
              <div style={sectionTitle}><DollarSign size={12} /> Revenue by Workspace</div>
              {overview?.workspaces.map((workspace) => (
                <BarRow key={workspace.id} label={workspace.name} value={workspace.metrics.revenue} max={Math.max(overview.totalRevenue, 1)} color="#22c55e" />
              ))}
            </div>
            <div style={panelStyle}>
              <div style={sectionTitle}><Settings2 size={12} /> Automation Level</div>
              {overview?.workspaces.map((workspace) => (
                <BarRow key={workspace.id} label={workspace.name} value={workspace.automationLevel === "autonomous" ? 100 : workspace.automationLevel === "assisted" ? 60 : 25} max={100} color={AUTOMATION_COLORS[workspace.automationLevel]} suffix="%" />
              ))}
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
            <div style={panelStyle}>
              <div style={sectionTitle}><Megaphone size={12} /> Distribution Activity</div>
              {overview?.workspaces.map((workspace) => (
                <BarRow key={workspace.id} label={workspace.name} value={workspace.metrics.publishedAssets + workspace.metrics.activeCampaigns} max={Math.max(overview.publishedAssets + overview.activeCampaigns, 1)} color="#a78bfa" />
              ))}
            </div>
            <div style={panelStyle}>
              <div style={sectionTitle}><Users size={12} /> CRM Stats</div>
              {overview?.workspaces.map((workspace) => (
                <BarRow key={workspace.id} label={workspace.name} value={workspace.metrics.crmClients + workspace.metrics.crmLeads} max={Math.max(overview.crmClients + overview.crmLeads, 1)} color="#38bdf8" />
              ))}
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitle}><Palette size={12} /> Brand Profiles</div>
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
          </section>
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

const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "18px 22px",
  marginBottom: 32,
};

const workspaceCard: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: 14,
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
  fontWeight: 600,
  color: "var(--text-3)",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: 14,
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

const primaryButton: React.CSSProperties = {
  fontSize: 12,
  background: "#6366f1",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  gap: 5,
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

const emptyStyle: React.CSSProperties = {
  color: "var(--text-3)",
  fontSize: 13,
  padding: "8px 0",
};
