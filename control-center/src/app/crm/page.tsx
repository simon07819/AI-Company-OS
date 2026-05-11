"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Archive,
  DollarSign,
  Edit3,
  FileText,
  Layers3,
  Mail,
  Phone,
  PlusCircle,
  RefreshCw,
  Star,
  Search,
  Tag,
  Trash2,
  UserCheck,
  Users,
  X,
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
  Row,
} from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────

type LeadStatus = "new" | "contacted" | "qualified" | "proposal_sent" | "won" | "lost";
type ClientStatus = "active" | "paused" | "completed" | "archived";

interface Lead {
  leadId: string; name: string; email: string; company: string | null;
  source: string; status: LeadStatus; estimatedValue: number; notes: string;
  tags?: string[];
  createdAt: string; updatedAt: string;
}

interface Client {
  clientId: string; name: string; email: string; company: string | null;
  status: ClientStatus; linkedMissionIds: string[]; totalValue: number;
  notes?: string; tags?: string[]; conversationId?: string | null;
  createdAt: string; updatedAt: string;
}

interface ClientInteraction {
  interactionId: string; clientId: string | null; leadId: string | null;
  type: "call" | "email" | "meeting" | "note" | "delivery";
  summary: string; createdAt: string;
}

interface CrmOverview {
  totalLeads: number; activeLeads: number; totalClients: number; activeClients: number;
  openOpportunities: number; pipelineValue: number; wonValue: number;
  leadsByStatus: Record<LeadStatus, number>; clientsByStatus: Record<ClientStatus, number>;
  recentInteractions: ClientInteraction[];
}

// ─── Constants ────────────────────────────────────────────────────────────

const LEAD_CFG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new:           { label: "New",           color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
  contacted:     { label: "Contacted",     color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  qualified:     { label: "Qualified",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  proposal_sent: { label: "Proposal Sent", color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  won:           { label: "Won",           color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  lost:          { label: "Lost",          color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
};

const CLIENT_CFG: Record<ClientStatus, { label: string; color: string; bg: string }> = {
  active:    { label: "Active",    color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  paused:    { label: "Paused",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  completed: { label: "Completed", color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  archived:  { label: "Archived",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

const INT_ICONS: Record<string, React.ReactNode> = {
  call: <Phone size={11} />, email: <Mail size={11} />,
  meeting: <Users size={11} />, note: <FileText size={11} />,
  delivery: <Briefcase size={11} />,
};

// ─── Page ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "8px 12px", fontSize: 12, background: "var(--bg-2)",
  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
  color: "var(--text)", outline: "none",
};

export default function CrmPage() {
  const [overview, setOverview] = useState<CrmOverview | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);

  // Form state
  const [lName, setLName] = useState(""); const [lEmail, setLEmail] = useState("");
  const [lCompany, setLCompany] = useState(""); const [lValue, setLValue] = useState("");
  const [cName, setCName] = useState(""); const [cEmail, setCEmail] = useState("");
  const [cCompany, setCCompany] = useState(""); const [cValue, setCValue] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus | ClientStatus>("all");
  const [editing, setEditing] = useState<{ kind: "lead" | "client"; id: string } | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftCompany, setDraftCompany] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftTags, setDraftTags] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [oRes, lRes, cRes] = await Promise.all([
        fetch("/api/crm/overview"), fetch("/api/crm/leads"), fetch("/api/crm/clients"),
      ]);
      if (oRes.ok) { const d = await oRes.json(); setOverview(d.overview); }
      if (lRes.ok) { const d = await lRes.json(); setLeads(d.leads); }
      if (cRes.ok) { const d = await cRes.json(); setClients(d.clients); }
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateLead = async () => {
    await fetch("/api/crm/leads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: lName, email: lEmail, company: lCompany, estimatedValue: Number(lValue) || 0 }),
    });
    setLName(""); setLEmail(""); setLCompany(""); setLValue("");
    setShowLeadForm(false); loadData();
  };

  const handleCreateClient = async () => {
    await fetch("/api/crm/clients", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cName, email: cEmail, company: cCompany, totalValue: Number(cValue) || 0 }),
    });
    setCName(""); setCEmail(""); setCCompany(""); setCValue("");
    setShowClientForm(false); loadData();
  };

  const handleConvert = async (leadId: string) => {
    await fetch(`/api/crm/leads/${leadId}/convert`, { method: "POST" }); loadData();
  };

  const startLeadEdit = (lead: Lead) => {
    setEditing({ kind: "lead", id: lead.leadId });
    setDraftName(lead.name);
    setDraftEmail(lead.email);
    setDraftCompany(lead.company ?? "");
    setDraftValue(String(lead.estimatedValue));
    setDraftStatus(lead.status);
    setDraftNotes(lead.notes ?? "");
    setDraftTags((lead.tags ?? []).join(", "));
  };

  const startClientEdit = (client: Client) => {
    setEditing({ kind: "client", id: client.clientId });
    setDraftName(client.name);
    setDraftEmail(client.email);
    setDraftCompany(client.company ?? "");
    setDraftValue(String(client.totalValue));
    setDraftStatus(client.status);
    setDraftNotes(client.notes ?? "");
    setDraftTags((client.tags ?? []).join(", "));
  };

  const saveEntity = async () => {
    if (!editing) return;
    const endpoint = editing.kind === "lead" ? `/api/crm/leads/${editing.id}` : `/api/crm/clients/${editing.id}`;
    const payload = editing.kind === "lead"
      ? { name: draftName, email: draftEmail, company: draftCompany, estimatedValue: Number(draftValue) || 0, status: draftStatus, notes: draftNotes, tags: draftTags.split(",").map((tag) => tag.trim()).filter(Boolean) }
      : { name: draftName, email: draftEmail, company: draftCompany, totalValue: Number(draftValue) || 0, status: draftStatus, notes: draftNotes, tags: draftTags.split(",").map((tag) => tag.trim()).filter(Boolean) };
    await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setEditing(null);
    loadData();
  };

  const crmAction = async (kind: "lead" | "client", id: string, body: Record<string, unknown>, method = "PATCH") => {
    await fetch(`/api/crm/${kind === "lead" ? "leads" : "clients"}/${id}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (editing?.id === id) setEditing(null);
    loadData();
  };

  const matches = (value: string | null | undefined) => (value ?? "").toLowerCase().includes(search.toLowerCase());
  const visibleLeads = leads.filter((lead) => {
    const text = matches(lead.name) || matches(lead.email) || matches(lead.company) || matches(lead.notes) || (lead.tags ?? []).some(matches);
    const status = statusFilter === "all" || lead.status === statusFilter;
    return (!search || text) && status;
  });
  const visibleClients = clients.filter((client) => {
    const text = matches(client.name) || matches(client.email) || matches(client.company) || matches(client.notes) || (client.tags ?? []).some(matches);
    const status = statusFilter === "all" || client.status === statusFilter;
    return (!search || text) && status;
  });

  // Modal wrapper
  const Modal = ({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) => show ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, width: 400, maxWidth: "90vw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "var(--text)" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  ) : null;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader
        icon={<Users size={20} />}
        title="Client CRM"
        description="Leads, clients, opportunities and interactions"
        badge={<LocalBadge />}
        actions={
          <>
            <PrimaryButton color="#3b82f6" onClick={() => setShowLeadForm(true)}><PlusCircle size={11} /> Lead</PrimaryButton>
            <PrimaryButton color="#22c55e" onClick={() => setShowClientForm(true)}><PlusCircle size={11} /> Client</PrimaryButton>
            <GhostButton onClick={loadData} disabled={loading}><RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh</GhostButton>
          </>
        }
      />

      <Modal show={showLeadForm} onClose={() => setShowLeadForm(false)} title="New Lead">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input placeholder="Name *" value={lName} onChange={(e) => setLName(e.target.value)} style={inputStyle} />
          <input placeholder="Email *" value={lEmail} onChange={(e) => setLEmail(e.target.value)} style={inputStyle} />
          <input placeholder="Company" value={lCompany} onChange={(e) => setLCompany(e.target.value)} style={inputStyle} />
          <input placeholder="Estimated Value ($)" type="number" value={lValue} onChange={(e) => setLValue(e.target.value)} style={inputStyle} />
          <PrimaryButton color="#3b82f6" onClick={handleCreateLead} disabled={!lName}>Create Lead</PrimaryButton>
        </div>
      </Modal>

      <Modal show={showClientForm} onClose={() => setShowClientForm(false)} title="New Client">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input placeholder="Name *" value={cName} onChange={(e) => setCName(e.target.value)} style={inputStyle} />
          <input placeholder="Email *" value={cEmail} onChange={(e) => setCEmail(e.target.value)} style={inputStyle} />
          <input placeholder="Company" value={cCompany} onChange={(e) => setCCompany(e.target.value)} style={inputStyle} />
          <input placeholder="Total Value ($)" type="number" value={cValue} onChange={(e) => setCValue(e.target.value)} style={inputStyle} />
          <PrimaryButton color="#22c55e" onClick={handleCreateClient} disabled={!cName}>Create Client</PrimaryButton>
        </div>
      </Modal>

      <Modal show={!!editing} onClose={() => setEditing(null)} title={editing?.kind === "lead" ? "Edit Lead" : "Edit Client"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input placeholder="Name" value={draftName} onChange={(e) => setDraftName(e.target.value)} style={inputStyle} />
          <input placeholder="Email" value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} style={inputStyle} />
          <input placeholder="Company" value={draftCompany} onChange={(e) => setDraftCompany(e.target.value)} style={inputStyle} />
          <input placeholder="Value" type="number" value={draftValue} onChange={(e) => setDraftValue(e.target.value)} style={inputStyle} />
          <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)} style={inputStyle}>
            {(editing?.kind === "lead" ? Object.keys(LEAD_CFG) : Object.keys(CLIENT_CFG)).map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
          </select>
          <textarea placeholder="Notes" value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} style={{ ...inputStyle, minHeight: 70 }} />
          <input placeholder="Tags separated by commas" value={draftTags} onChange={(e) => setDraftTags(e.target.value)} style={inputStyle} />
          <PrimaryButton onClick={saveEntity}><Edit3 size={11} /> Save</PrimaryButton>
        </div>
      </Modal>

      <AnimatePresence mode="wait">
        <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

          {/* ── OVERVIEW ── */}
          {overview && (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
              <MetricCard label="Total Leads" value={overview.totalLeads} icon={<Layers3 size={15} />} color="#3b82f6" />
              <MetricCard label="Active Leads" value={overview.activeLeads} icon={<Star size={15} />} color="#f59e0b" />
              <MetricCard label="Total Clients" value={overview.totalClients} icon={<Users size={15} />} color="#6366f1" />
              <MetricCard label="Active Clients" value={overview.activeClients} icon={<UserCheck size={15} />} color="#22c55e" />
              <MetricCard label="Open Opportunities" value={overview.openOpportunities} icon={<Briefcase size={15} />} color="#fb923c" />
              <MetricCard label="Pipeline Value" value={`$${overview.pipelineValue.toLocaleString()}`} icon={<DollarSign size={15} />} color="#a78bfa" />
              <MetricCard label="Won Value" value={`$${overview.wonValue.toLocaleString()}`} icon={<DollarSign size={15} />} color="#22c55e" />
            </section>
          )}

          <Panel>
            <SectionHeader icon={<Search size={12} />} title="CRM Filters" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 8 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients, leads, notes, tags..." style={inputStyle} />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} style={inputStyle}>
                <option value="all">All statuses</option>
                {Object.keys(LEAD_CFG).map((status) => <option key={status} value={status}>{LEAD_CFG[status as LeadStatus].label}</option>)}
                {Object.keys(CLIENT_CFG).map((status) => <option key={status} value={status}>{CLIENT_CFG[status as ClientStatus].label}</option>)}
              </select>
            </div>
          </Panel>

          {/* ── LEADS PIPELINE ── */}
          <Panel>
            <SectionHeader title="Leads Pipeline" />
            {overview && (
              <div style={{ display: "flex", gap: 4, marginBottom: 16, height: 24, borderRadius: 4, overflow: "hidden" }}>
                {(["new", "contacted", "qualified", "proposal_sent", "won", "lost"] as LeadStatus[]).map((s) => {
                  const c = overview.leadsByStatus[s] ?? 0;
                  const cfg = LEAD_CFG[s];
                  if (c === 0) return null;
                  return <div key={s} style={{ flex: c, background: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 600, minWidth: c > 0 ? 30 : 0 }}>{c}</div>;
                })}
              </div>
            )}
            {visibleLeads.filter((l) => l.status !== "won" && l.status !== "lost").length === 0 ? (
              <EmptyState title="No active leads" description="Add your first lead to start building the pipeline." action={<PrimaryButton color="#3b82f6" onClick={() => setShowLeadForm(true)}><PlusCircle size={11} /> Add Lead</PrimaryButton>} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {visibleLeads.filter((l) => l.status !== "won" && l.status !== "lost").map((lead) => {
                  const cfg = LEAD_CFG[lead.status];
                  return (
                    <Row key={lead.leadId}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{lead.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{lead.email} {lead.company ? `— ${lead.company}` : ""}</div>
                        {(lead.tags ?? []).length > 0 && <div style={{ fontSize: 9, color: "#a78bfa", marginTop: 2 }}><Tag size={9} /> {lead.tags?.join(", ")}</div>}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)" }}>${lead.estimatedValue.toLocaleString()}</span>
                      <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                      {(lead.status === "proposal_sent" || lead.status === "qualified") && (
                        <PrimaryButton color="#22c55e" onClick={() => handleConvert(lead.leadId)}>Convert</PrimaryButton>
                      )}
                      <GhostButton onClick={() => startLeadEdit(lead)}><Edit3 size={10} /> Edit</GhostButton>
                      <GhostButton onClick={() => crmAction("lead", lead.leadId, { action: "archive" })}><Archive size={10} /> Archive</GhostButton>
                      <GhostButton onClick={() => crmAction("lead", lead.leadId, {}, "DELETE")}><Trash2 size={10} /> Delete</GhostButton>
                    </Row>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* ── CLIENTS ── */}
          <Panel>
            <SectionHeader title="Clients" />
            {visibleClients.length === 0 ? (
              <EmptyState title="No clients yet" description="Convert a lead or create a client directly to manage relationships." action={<PrimaryButton color="#22c55e" onClick={() => setShowClientForm(true)}><PlusCircle size={11} /> Add Client</PrimaryButton>} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {visibleClients.map((c) => {
                  const cfg = CLIENT_CFG[c.status];
                  return (
                    <Row key={c.clientId}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                          {c.email} {c.company ? `— ${c.company}` : ""}
                          {c.linkedMissionIds.length > 0 && <span style={{ marginLeft: 8, color: "#6366f1" }}>{c.linkedMissionIds.length} mission(s)</span>}
                        </div>
                        {(c.tags ?? []).length > 0 && <div style={{ fontSize: 9, color: "#a78bfa", marginTop: 2 }}><Tag size={9} /> {c.tags?.join(", ")}</div>}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)" }}>${c.totalValue.toLocaleString()}</span>
                      <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                      <GhostButton onClick={() => startClientEdit(c)}><Edit3 size={10} /> Edit</GhostButton>
                      <GhostButton onClick={() => crmAction("client", c.clientId, { action: "archive" })}><Archive size={10} /> Archive</GhostButton>
                      <GhostButton onClick={() => crmAction("client", c.clientId, {}, "DELETE")}><Trash2 size={10} /> Delete</GhostButton>
                    </Row>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* ── RECENT INTERACTIONS ── */}
          <Panel>
            <SectionHeader title="Recent Interactions" />
            {overview?.recentInteractions?.length === 0 || !overview ? (
              <EmptyState title="No interactions yet" description="Interactions will appear here when you add notes, calls or meetings." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {overview.recentInteractions.map((int) => (
                  <Row key={int.interactionId} style={{ padding: "8px 12px" }}>
                    <span style={{ color: "var(--text-3)" }}>{INT_ICONS[int.type] ?? <FileText size={11} />}</span>
                    <span style={{ color: "var(--text-2)", flex: 1, fontSize: 12 }}>{int.summary}</span>
                    <span style={{ color: "var(--text-3)", fontSize: 10 }}>{new Date(int.createdAt).toLocaleDateString()}</span>
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
