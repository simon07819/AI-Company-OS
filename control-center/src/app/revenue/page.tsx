"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  DollarSign,
  FileText,
  PlusCircle,
  Receipt,
  RefreshCw,
  Send,
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
}

interface Invoice {
  invoiceId: string;
  proposalId: string | null;
  clientId: string | null;
  missionId: string | null;
  status: InvoiceStatus;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  updatedAt: string;
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 150px auto", gap: 8 }}>
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
          </Panel>

          <Panel>
            <SectionHeader icon={<FileText size={12} />} title="Proposals" />
            {proposals.length === 0 ? (
              <EmptyState title="No proposals yet" description="Create your first proposal above to start tracking deals and converting leads into revenue." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {proposals.map((proposal) => {
                  const cfg = PROPOSAL_STATUS[proposal.status];
                  return (
                    <Row key={proposal.proposalId}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{proposal.title}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{proposal.missionType.replace(/_/g, " ")} · ${proposal.estimate.monthlyRecurring.toLocaleString()} monthly est.</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>${proposal.amount.toLocaleString()}</span>
                      <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                      {proposal.status !== "accepted" && proposal.status !== "rejected" && (
                        <>
                          <PrimaryButton onClick={() => acceptProposal(proposal.proposalId)} color="#22c55e">Accept</PrimaryButton>
                          <PrimaryButton onClick={() => rejectProposal(proposal.proposalId)} color="#f43f5e">Reject</PrimaryButton>
                        </>
                      )}
                      {proposal.status === "accepted" && (
                        <PrimaryButton onClick={() => createInvoice(proposal)}>Invoice</PrimaryButton>
                      )}
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
                {invoices.map((invoice) => {
                  const cfg = INVOICE_STATUS[invoice.status];
                  return (
                    <Row key={invoice.invoiceId}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{invoice.invoiceId}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>Due {new Date(invoice.dueDate).toLocaleDateString()}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#fb923c" }}>${invoice.amount.toLocaleString()}</span>
                      <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                      {invoice.status !== "paid" && <PrimaryButton onClick={() => markPaid(invoice.invoiceId)} color="#22c55e">Pay</PrimaryButton>}
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
