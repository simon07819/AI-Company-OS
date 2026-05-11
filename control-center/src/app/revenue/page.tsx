"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Archive,
  CheckCircle2,
  Copy,
  DollarSign,
  Edit3,
  FileText,
  PlusCircle,
  Receipt,
  RefreshCw,
  Send,
  Trash2,
  TrendingUp,
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

type ProposalStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected";
type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

interface PricingEstimate {
  missionType: string;
  complexity: string;
  estimatedValue: number;
  monthlyRecurring: number;
}

interface Proposal {
  proposalId: string;
  title: string;
  leadId: string | null;
  clientId: string | null;
  missionId: string | null;
  missionType: string;
  status: ProposalStatus;
  estimate: PricingEstimate;
  amount: number;
  validUntil: string;
  updatedAt: string;
  archivedAt?: string | null;
}

interface Invoice {
  invoiceId: string;
  proposalId: string | null;
  clientId: string | null;
  missionId: string | null;
  status: InvoiceStatus;
  amount: number;
  subtotal?: number;
  tpsRate?: number;
  tpsAmount?: number;
  tvqRate?: number;
  tvqAmount?: number;
  total?: number;
  dueDate: string;
  paidAt: string | null;
  updatedAt: string;
  archivedAt?: string | null;
}

interface RevenueRecord {
  recordId: string;
  invoiceId: string;
  amount: number;
  recordedAt: string;
}

interface RevenueOverview {
  totalRevenue: number;
  monthlyRevenue: number;
  estimatedMonthlyRevenue: number;
  pipelineValue: number;
  acceptedProposalValue: number;
  outstandingInvoices: number;
  outstandingInvoiceValue: number;
  paidInvoices: number;
  proposalConversionRate: number;
  totalProposals: number;
  openProposals: number;
  totalInvoices: number;
  proposalsByStatus: Record<ProposalStatus, number>;
  invoicesByStatus: Record<InvoiceStatus, number>;
}

const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  sent: { label: "Sent", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  viewed: { label: "Viewed", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  accepted: { label: "Accepted", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  rejected: { label: "Rejected", color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
};

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  paid: { label: "Paid", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  overdue: { label: "Overdue", color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
  cancelled: { label: "Cancelled", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

export default function RevenuePage() {
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [missionType, setMissionType] = useState("website");
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | ProposalStatus | InvoiceStatus>("all");
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [draftSubtotal, setDraftSubtotal] = useState("");
  const [draftTps, setDraftTps] = useState("5");
  const [draftTvq, setDraftTvq] = useState("9.975");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/revenue/overview");
      if (res.ok) {
        const data = await res.json();
        setOverview(data.overview);
        setProposals(data.proposals ?? []);
        setInvoices(data.invoices ?? []);
        setRecords(data.records ?? []);
      } else {
        setError("Failed to load revenue overview. Check that the local API is running.");
      }
    } catch {
      setError("Network error — could not reach the local API. Ensure the dev server is running.");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const createProposal = async () => {
    await fetch("/api/revenue/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || undefined,
        missionType,
        amount: Number(amount) || undefined,
        status: "sent",
      }),
    });
    setTitle("");
    setAmount("");
    loadData();
  };

  const acceptProposal = async (proposalId: string) => {
    await fetch(`/api/revenue/proposals/${proposalId}/accept`, { method: "POST" });
    loadData();
  };

  const rejectProposal = async (proposalId: string) => {
    await fetch(`/api/revenue/proposals/${proposalId}/reject`, { method: "POST" });
    loadData();
  };

  const createInvoice = async (proposal: Proposal) => {
    await fetch("/api/revenue/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: proposal.proposalId }),
    });
    loadData();
  };

  const markPaid = async (invoiceId: string) => {
    await fetch(`/api/revenue/invoices/${invoiceId}/pay`, { method: "POST" });
    loadData();
  };

  const revenueAction = async (kind: "proposals" | "invoices", id: string, body: Record<string, unknown>, method = "PATCH") => {
    await fetch(`/api/revenue/${kind}/${id}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditingProposalId(null);
    setEditingInvoiceId(null);
    loadData();
  };

  const startProposalEdit = (proposal: Proposal) => {
    setEditingProposalId(proposal.proposalId);
    setDraftTitle(proposal.title);
    setDraftAmount(String(proposal.amount));
    setDraftStatus(proposal.status);
  };

  const startInvoiceEdit = (invoice: Invoice) => {
    setEditingInvoiceId(invoice.invoiceId);
    setDraftSubtotal(String(invoice.subtotal ?? invoice.amount));
    setDraftTps(String(invoice.tpsRate ?? 5));
    setDraftTvq(String(invoice.tvqRate ?? 9.975));
    setDraftStatus(invoice.status);
  };

  const filteredProposals = proposals.filter((proposal) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || proposal.title.toLowerCase().includes(q) || proposal.missionType.toLowerCase().includes(q);
    const matchesStatus = statusTab === "all" || proposal.status === statusTab;
    return matchesSearch && matchesStatus;
  });

  const filteredInvoices = invoices.filter((invoice) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || invoice.invoiceId.toLowerCase().includes(q) || (invoice.clientId ?? "").toLowerCase().includes(q);
    const matchesStatus = statusTab === "all" || invoice.status === statusTab;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader
        icon={<DollarSign size={20} />}
        title="Revenue System"
        description="Proposals, estimates, invoices and revenue tracking — manage your full billing cycle from pitch to payment."
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
              <MetricCard label="Monthly Revenue" value={`$${overview.monthlyRevenue.toLocaleString()}`} icon={<DollarSign size={15} />} color="#22c55e" />
              <MetricCard label="Pipeline Value" value={`$${overview.pipelineValue.toLocaleString()}`} icon={<BarChart3 size={15} />} color="#a78bfa" />
              <MetricCard label="Accepted Value" value={`$${overview.acceptedProposalValue.toLocaleString()}`} icon={<CheckCircle2 size={15} />} color="#34d399" />
              <MetricCard label="Estimated Monthly" value={`$${overview.estimatedMonthlyRevenue.toLocaleString()}`} icon={<TrendingUp size={15} />} color="#38bdf8" />
              <MetricCard label="Conversion Rate" value={`${overview.proposalConversionRate}%`} icon={<Send size={15} />} color="#f59e0b" />
              <MetricCard label="Outstanding" value={`$${overview.outstandingInvoiceValue.toLocaleString()}`} icon={<Receipt size={15} />} color="#fb923c" />
            </section>
          )}

          <Panel>
            <SectionHeader icon={<PlusCircle size={12} />} title="Create Proposal" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 150px auto", gap: 8, marginBottom: 10 }}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Proposal title" style={inputStyle} />
              <select value={missionType} onChange={(e) => setMissionType(e.target.value)} style={inputStyle}>
                <option value="website">Website</option>
                <option value="saas_project">SaaS Project</option>
                <option value="branding_pack">Branding Pack</option>
                <option value="ecommerce_store">Ecommerce Store</option>
                <option value="social_campaign">Social Campaign</option>
                <option value="automation_workflow">Automation Workflow</option>
              </select>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" type="number" style={inputStyle} />
              <PrimaryButton onClick={createProposal}><PlusCircle size={12} /> Create</PrimaryButton>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 8 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search revenue, invoices, clients..." style={inputStyle} />
              <select value={statusTab} onChange={(e) => setStatusTab(e.target.value as typeof statusTab)} style={inputStyle}>
                <option value="all">All statuses</option>
                {Object.keys(PROPOSAL_STATUS).map((status) => <option key={status} value={status}>{PROPOSAL_STATUS[status as ProposalStatus].label}</option>)}
                {Object.keys(INVOICE_STATUS).map((status) => <option key={status} value={status}>{INVOICE_STATUS[status as InvoiceStatus].label}</option>)}
              </select>
            </div>
          </Panel>

          <Panel>
            <SectionHeader icon={<FileText size={12} />} title="Proposals" />
            {proposals.length === 0 ? (
              <EmptyState title="No proposals yet" description="Create your first proposal above to start tracking deals and converting leads into revenue." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {filteredProposals.map((proposal) => {
                  const cfg = PROPOSAL_STATUS[proposal.status];
                  const editing = editingProposalId === proposal.proposalId;
                  return (
                    <Row key={proposal.proposalId}>
                      <div style={{ flex: 1 }}>
                        {editing ? (
                          <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} style={inputStyle} />
                        ) : (
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{proposal.title}</div>
                        )}
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{proposal.missionType.replace(/_/g, " ")} · ${proposal.estimate.monthlyRecurring.toLocaleString()} monthly est.</div>
                      </div>
                      {editing ? (
                        <>
                          <input value={draftAmount} onChange={(e) => setDraftAmount(e.target.value)} type="number" style={{ ...inputStyle, width: 110 }} />
                          <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)} style={inputStyle}>
                            {Object.keys(PROPOSAL_STATUS).map((status) => <option key={status} value={status}>{PROPOSAL_STATUS[status as ProposalStatus].label}</option>)}
                          </select>
                          <PrimaryButton onClick={() => revenueAction("proposals", proposal.proposalId, { title: draftTitle, amount: Number(draftAmount), status: draftStatus })}>Save</PrimaryButton>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>${proposal.amount.toLocaleString()}</span>
                          <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                        </>
                      )}
                      {proposal.status !== "accepted" && proposal.status !== "rejected" && (
                        <>
                          <PrimaryButton onClick={() => acceptProposal(proposal.proposalId)} color="#22c55e">Accept</PrimaryButton>
                          <PrimaryButton onClick={() => rejectProposal(proposal.proposalId)} color="#f43f5e">Reject</PrimaryButton>
                        </>
                      )}
                      {proposal.status === "accepted" && (
                        <PrimaryButton onClick={() => createInvoice(proposal)}>Invoice</PrimaryButton>
                      )}
                      <GhostButton onClick={() => startProposalEdit(proposal)}><Edit3 size={10} /> Edit</GhostButton>
                      <GhostButton onClick={() => revenueAction("proposals", proposal.proposalId, { action: "duplicate" })}><Copy size={10} /> Duplicate</GhostButton>
                      <GhostButton onClick={() => revenueAction("proposals", proposal.proposalId, { action: "archive" })}><Archive size={10} /> Archive</GhostButton>
                      <GhostButton onClick={() => revenueAction("proposals", proposal.proposalId, {}, "DELETE")}><Trash2 size={10} /> Delete</GhostButton>
                    </Row>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionHeader icon={<Receipt size={12} />} title="Invoices" />
            {invoices.length === 0 ? (
              <EmptyState title="No invoices yet" description="Accept a proposal to auto-generate an invoice, or create one manually from the API." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {filteredInvoices.map((invoice) => {
                  const cfg = INVOICE_STATUS[invoice.status];
                  const editing = editingInvoiceId === invoice.invoiceId;
                  const subtotal = editing ? Number(draftSubtotal) || 0 : invoice.subtotal ?? invoice.amount;
                  const tps = subtotal * ((editing ? Number(draftTps) : invoice.tpsRate ?? 5) / 100);
                  const tvq = subtotal * ((editing ? Number(draftTvq) : invoice.tvqRate ?? 9.975) / 100);
                  const total = editing ? subtotal + tps + tvq : invoice.total ?? invoice.amount;
                  return (
                    <Row key={invoice.invoiceId}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{invoice.invoiceId}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>Due {new Date(invoice.dueDate).toLocaleDateString()} · TPS ${tps.toFixed(2)} · TVQ ${tvq.toFixed(2)}</div>
                      </div>
                      {editing ? (
                        <>
                          <input value={draftSubtotal} onChange={(e) => setDraftSubtotal(e.target.value)} type="number" style={{ ...inputStyle, width: 100 }} />
                          <input value={draftTps} onChange={(e) => setDraftTps(e.target.value)} type="number" style={{ ...inputStyle, width: 80 }} />
                          <input value={draftTvq} onChange={(e) => setDraftTvq(e.target.value)} type="number" style={{ ...inputStyle, width: 90 }} />
                          <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)} style={inputStyle}>
                            {Object.keys(INVOICE_STATUS).map((status) => <option key={status} value={status}>{INVOICE_STATUS[status as InvoiceStatus].label}</option>)}
                          </select>
                          <PrimaryButton onClick={() => revenueAction("invoices", invoice.invoiceId, {
                            amount: subtotal,
                            status: draftStatus,
                            lineItems: [{ description: "Services", quantity: 1, unitPrice: subtotal }],
                            taxes: { tpsRate: Number(draftTps), tvqRate: Number(draftTvq) },
                          })}>Save</PrimaryButton>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#fb923c" }}>${total.toLocaleString()}</span>
                          <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                        </>
                      )}
                      {invoice.status !== "paid" && <PrimaryButton onClick={() => markPaid(invoice.invoiceId)} color="#22c55e">Pay</PrimaryButton>}
                      {invoice.status === "paid" && <GhostButton onClick={() => revenueAction("invoices", invoice.invoiceId, { action: "mark_unpaid" })}>Unpaid</GhostButton>}
                      <GhostButton onClick={() => startInvoiceEdit(invoice)}><Edit3 size={10} /> Edit</GhostButton>
                      <GhostButton onClick={() => revenueAction("invoices", invoice.invoiceId, { action: "duplicate" })}><Copy size={10} /> Duplicate</GhostButton>
                      <GhostButton onClick={() => revenueAction("invoices", invoice.invoiceId, { action: "archive" })}><Archive size={10} /> Archive</GhostButton>
                      <GhostButton onClick={() => revenueAction("invoices", invoice.invoiceId, {}, "DELETE")}><Trash2 size={10} /> Delete</GhostButton>
                      <GhostButton>Export PDF</GhostButton>
                    </Row>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionHeader icon={<TrendingUp size={12} />} title="Revenue History" />
            {records.length === 0 ? (
              <EmptyState title="No paid revenue recorded yet" description="Revenue entries appear here once invoices are marked as paid." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {records.map((record) => (
                  <Row key={record.recordId}>
                    <div style={{ flex: 1, fontSize: 12, color: "var(--text-2)" }}>{record.invoiceId}</div>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{new Date(record.recordedAt).toLocaleDateString()}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>${record.amount.toLocaleString()}</span>
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

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 12,
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  outline: "none",
};
