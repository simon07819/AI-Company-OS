"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  DollarSign,
  FileText,
  Layers3,
  Mail,
  Phone,
  PlusCircle,
  RefreshCw,
  Send,
  Star,
  UserCheck,
  Users,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

type LeadStatus = "new" | "contacted" | "qualified" | "proposal_sent" | "won" | "lost";
type ClientStatus = "active" | "paused" | "completed" | "archived";

interface Lead {
  leadId: string;
  name: string;
  email: string;
  company: string | null;
  source: string;
  status: LeadStatus;
  estimatedValue: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface Client {
  clientId: string;
  name: string;
  email: string;
  company: string | null;
  status: ClientStatus;
  linkedMissionIds: string[];
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}

interface Opportunity {
  opportunityId: string;
  clientId: string;
  title: string;
  value: number;
  status: "open" | "won" | "lost";
  probability: number;
  createdAt: string;
  updatedAt: string;
}

interface ClientInteraction {
  interactionId: string;
  clientId: string | null;
  leadId: string | null;
  type: "call" | "email" | "meeting" | "note" | "delivery";
  summary: string;
  createdAt: string;
}

interface AutopilotSessionSummary {
  sessionId: string;
  projectName: string;
  missionType: string;
  status: string;
}

interface Proposal {
  proposalId: string;
  leadId: string | null;
  clientId: string | null;
  missionId: string | null;
  missionType: string;
  status: "draft" | "sent" | "viewed" | "accepted" | "rejected";
  amount: number;
}

interface CrmOverview {
  totalLeads: number;
  activeLeads: number;
  totalClients: number;
  activeClients: number;
  openOpportunities: number;
  pipelineValue: number;
  wonValue: number;
  leadsByStatus: Record<LeadStatus, number>;
  clientsByStatus: Record<ClientStatus, number>;
  recentInteractions: ClientInteraction[];
}

// ─── Constants ────────────────────────────────────────────────────────────

const LEAD_STATUS_CFG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new:           { label: "New",           color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
  contacted:     { label: "Contacted",     color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  qualified:     { label: "Qualified",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  proposal_sent: { label: "Proposal Sent", color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  won:           { label: "Won",           color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  lost:          { label: "Lost",          color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
};

const CLIENT_STATUS_CFG: Record<ClientStatus, { label: string; color: string; bg: string }> = {
  active:    { label: "Active",    color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  paused:    { label: "Paused",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  completed: { label: "Completed", color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  archived:  { label: "Archived",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

const INTERACTION_ICONS: Record<string, React.ReactNode> = {
  call: <Phone size={11} />,
  email: <Mail size={11} />,
  meeting: <Users size={11} />,
  note: <FileText size={11} />,
  delivery: <Briefcase size={11} />,
};

// ─── Page ─────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const [overview, setOverview] = useState<CrmOverview | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [sessions, setSessions] = useState<AutopilotSessionSummary[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [missionSelections, setMissionSelections] = useState<Record<string, string>>({});

  // Lead form
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadValue, setLeadValue] = useState("");

  // Client form
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientValue, setClientValue] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [oRes, lRes, cRes] = await Promise.all([
        fetch("/api/crm/overview"),
        fetch("/api/crm/leads"),
        fetch("/api/crm/clients"),
      ]);
      if (oRes.ok) {
        const d = await oRes.json();
        setOverview(d.overview);
        setOpportunities(d.opportunities ?? []);
      }
      if (lRes.ok) { const d = await lRes.json(); setLeads(d.leads); }
      if (cRes.ok) { const d = await cRes.json(); setClients(d.clients); }
      try {
        const sRes = await fetch("/api/autopilot/sessions");
        if (sRes.ok) {
          const d = await sRes.json();
          setSessions(d.sessions ?? []);
        }
      } catch { /* missions optional */ }
      try {
        const rRes = await fetch("/api/revenue/proposals");
        if (rRes.ok) {
          const d = await rRes.json();
          setProposals(d.proposals ?? []);
        }
      } catch { /* revenue optional */ }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateLead = async () => {
    await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: leadName, email: leadEmail, company: leadCompany, estimatedValue: Number(leadValue) || 0 }),
    });
    setLeadName(""); setLeadEmail(""); setLeadCompany(""); setLeadValue("");
    setShowLeadForm(false);
    loadData();
  };

  const handleCreateClient = async () => {
    await fetch("/api/crm/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clientName, email: clientEmail, company: clientCompany, totalValue: Number(clientValue) || 0 }),
    });
    setClientName(""); setClientEmail(""); setClientCompany(""); setClientValue("");
    setShowClientForm(false);
    loadData();
  };

  const handleConvertLead = async (leadId: string) => {
    await fetch(`/api/crm/leads/${leadId}/convert`, { method: "POST" });
    loadData();
  };

  const handleLinkMission = async (clientId: string) => {
    const sessionId = missionSelections[clientId];
    if (!sessionId) return;
    await fetch(`/api/crm/clients/${clientId}/link-mission`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    setMissionSelections((current) => ({ ...current, [clientId]: "" }));
    loadData();
  };

  const handleCreateLeadProposal = async (lead: Lead) => {
    await fetch("/api/revenue/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${lead.name} proposal`,
        leadId: lead.leadId,
        amount: lead.estimatedValue || undefined,
        status: "sent",
      }),
    });
    loadData();
  };

  const handleCreateClientProposal = async (client: Client) => {
    const missionId = client.linkedMissionIds[0] ?? null;
    await fetch("/api/revenue/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${client.name} proposal`,
        clientId: client.clientId,
        missionId,
        amount: client.totalValue || undefined,
        status: "sent",
      }),
    });
    loadData();
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            <Users size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3 }} />
            Client CRM
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: "4px 0 0" }}>Leads, clients, opportunities and interactions</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowLeadForm(true)} style={{ fontSize: 11, background: "#3b82f6", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <PlusCircle size={11} /> Lead
          </button>
          <button onClick={() => setShowClientForm(true)} style={{ fontSize: 11, background: "#22c55e", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <PlusCircle size={11} /> Client
          </button>
          <button onClick={loadData} disabled={loading} style={{ fontSize: 11, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 12px", cursor: "pointer", color: "var(--text-2)", display: "flex", alignItems: "center", gap: 5 }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      {/* Lead Form Modal */}
      {showLeadForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, width: 400, maxWidth: "90vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: "var(--text)" }}>New Lead</h3>
              <button onClick={() => setShowLeadForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="Name *" value={leadName} onChange={(e) => setLeadName(e.target.value)} style={inputStyle} />
              <input placeholder="Email *" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} style={inputStyle} />
              <input placeholder="Company" value={leadCompany} onChange={(e) => setLeadCompany(e.target.value)} style={inputStyle} />
              <input placeholder="Estimated Value ($)" type="number" value={leadValue} onChange={(e) => setLeadValue(e.target.value)} style={inputStyle} />
              <button onClick={handleCreateLead} disabled={!leadName} style={{ ...btnPrimary, opacity: leadName ? 1 : 0.5 }}>Create Lead</button>
            </div>
          </div>
        </div>
      )}

      {/* Client Form Modal */}
      {showClientForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, width: 400, maxWidth: "90vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: "var(--text)" }}>New Client</h3>
              <button onClick={() => setShowClientForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="Name *" value={clientName} onChange={(e) => setClientName(e.target.value)} style={inputStyle} />
              <input placeholder="Email *" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} style={inputStyle} />
              <input placeholder="Company" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} style={inputStyle} />
              <input placeholder="Total Value ($)" type="number" value={clientValue} onChange={(e) => setClientValue(e.target.value)} style={inputStyle} />
              <button onClick={handleCreateClient} disabled={!clientName} style={{ ...btnPrimary, background: "#22c55e", opacity: clientName ? 1 : 0.5 }}>Create Client</button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

          {/* ── OVERVIEW CARDS ── */}
          {overview && (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
              {[
                { label: "Total Leads", value: overview.totalLeads, icon: <Layers3 size={15} />, color: "#3b82f6" },
                { label: "Active Leads", value: overview.activeLeads, icon: <Star size={15} />, color: "#f59e0b" },
                { label: "Total Clients", value: overview.totalClients, icon: <Users size={15} />, color: "#6366f1" },
                { label: "Active Clients", value: overview.activeClients, icon: <UserCheck size={15} />, color: "#22c55e" },
                { label: "Open Opportunities", value: overview.openOpportunities, icon: <Briefcase size={15} />, color: "#fb923c" },
                { label: "Pipeline Value", value: `$${overview.pipelineValue.toLocaleString()}`, icon: <DollarSign size={15} />, color: "#a78bfa" },
                { label: "Won Value", value: `$${overview.wonValue.toLocaleString()}`, icon: <DollarSign size={15} />, color: "#22c55e" },
                { label: "Proposal Value", value: `$${proposals.reduce((sum, proposal) => sum + proposal.amount, 0).toLocaleString()}`, icon: <FileText size={15} />, color: "#38bdf8" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ color }}>{icon}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </section>
          )}

          {/* ── LEADS PIPELINE ── */}
          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
              Leads Pipeline
            </div>

            {/* Pipeline bars */}
            {overview && (
              <div style={{ display: "flex", gap: 4, marginBottom: 16, height: 24, borderRadius: 4, overflow: "hidden" }}>
                {(["new", "contacted", "qualified", "proposal_sent", "won", "lost"] as LeadStatus[]).map((status) => {
                  const count = overview.leadsByStatus[status] ?? 0;
                  const cfg = LEAD_STATUS_CFG[status];
                  if (count === 0) return null;
                  return (
                    <div key={status} style={{ flex: count, background: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 600, minWidth: count > 0 ? 30 : 0 }}>
                      {count}
                    </div>
                  );
                })}
              </div>
            )}

            {leads.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 13 }}>No leads yet. Click &quot;Lead&quot; to add your first prospect.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {leads.filter((l) => l.status !== "won" && l.status !== "lost").map((lead) => {
                  const cfg = LEAD_STATUS_CFG[lead.status];
                  const leadProposalValue = proposals
                    .filter((proposal) => proposal.leadId === lead.leadId)
                    .reduce((sum, proposal) => sum + proposal.amount, 0);
                  return (
                    <div key={lead.leadId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{lead.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{lead.email} {lead.company ? `— ${lead.company}` : ""}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)" }}>${lead.estimatedValue.toLocaleString()}</span>
                      {leadProposalValue > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#38bdf8" }}>${leadProposalValue.toLocaleString()} proposed</span>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: "3px 8px", borderRadius: "var(--radius-sm)", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                        {cfg.label}
                      </span>
                      <button onClick={() => handleCreateLeadProposal(lead)} style={{ fontSize: 10, background: "#6366f1", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                        <FileText size={10} /> Proposal
                      </button>
                      <button onClick={() => handleConvertLead(lead.leadId)} style={{ fontSize: 10, background: "#22c55e", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                        <CheckCircle2 size={10} /> Convert
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── CLIENTS ── */}
          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
              Clients
            </div>
            {clients.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 13 }}>No clients yet. Convert a lead or create a client directly.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {clients.map((client) => {
                  const cfg = CLIENT_STATUS_CFG[client.status];
                  const clientProposalValue = proposals
                    .filter((proposal) => proposal.clientId === client.clientId)
                    .reduce((sum, proposal) => sum + proposal.amount, 0);
                  return (
                    <div key={client.clientId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{client.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                          {client.email} {client.company ? `— ${client.company}` : ""}
                          {client.linkedMissionIds.length > 0 && (
                            <span style={{ marginLeft: 8, color: "#6366f1" }}>{client.linkedMissionIds.length} mission(s)</span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)" }}>${client.totalValue.toLocaleString()}</span>
                      {clientProposalValue > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#38bdf8" }}>${clientProposalValue.toLocaleString()} proposed</span>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: "3px 8px", borderRadius: "var(--radius-sm)", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                        {cfg.label}
                      </span>
                      <button onClick={() => handleCreateClientProposal(client)} style={{ fontSize: 10, background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                        <FileText size={10} /> Proposal
                      </button>
                      <select
                        value={missionSelections[client.clientId] ?? ""}
                        onChange={(e) => setMissionSelections((current) => ({ ...current, [client.clientId]: e.target.value }))}
                        style={{ ...inputStyle, width: 180, padding: "5px 8px", fontSize: 10 }}
                      >
                        <option value="">Link mission</option>
                        {sessions
                          .filter((session) => !client.linkedMissionIds.includes(session.sessionId))
                          .map((session) => (
                            <option key={session.sessionId} value={session.sessionId}>
                              {session.projectName || session.sessionId}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleLinkMission(client.clientId)}
                        disabled={!missionSelections[client.clientId]}
                        style={{ fontSize: 10, background: "#6366f1", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "5px 8px", cursor: missionSelections[client.clientId] ? "pointer" : "default", opacity: missionSelections[client.clientId] ? 1 : 0.5, display: "flex", alignItems: "center", gap: 3 }}
                      >
                        <Send size={10} /> Link
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── OPPORTUNITIES ── */}
          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
              Opportunities
            </div>
            {opportunities.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 13 }}>No opportunities yet. Open deals will appear here once they are created.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {opportunities.map((opportunity) => {
                  const client = clients.find((item) => item.clientId === opportunity.clientId);
                  return (
                    <div key={opportunity.opportunityId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{opportunity.title}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{client?.name ?? opportunity.clientId}</div>
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600 }}>{opportunity.probability}%</span>
                      <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700 }}>${opportunity.value.toLocaleString()}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: opportunity.status === "open" ? "#fb923c" : opportunity.status === "won" ? "#22c55e" : "#f43f5e", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                        {opportunity.status.replace("_", " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── RECENT INTERACTIONS ── */}
          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
              Recent Interactions
            </div>
            {overview?.recentInteractions?.length === 0 || !overview ? (
              <div style={{ color: "var(--text-3)", fontSize: 13 }}>No interactions recorded yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {overview.recentInteractions.map((int) => (
                  <div key={int.interactionId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                    <span style={{ color: "var(--text-3)" }}>{INTERACTION_ICONS[int.type] ?? <FileText size={11} />}</span>
                    <span style={{ color: "var(--text-2)", flex: 1 }}>{int.summary}</span>
                    <span style={{ color: "var(--text-3)", fontSize: 10 }}>{new Date(int.createdAt).toLocaleDateString()}</span>
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

// ─── Styles ───────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 12,
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  fontSize: 12,
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "8px 16px",
  cursor: "pointer",
  fontWeight: 600,
};
