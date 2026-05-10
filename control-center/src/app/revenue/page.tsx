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
  const [title, setTitle] = useState("");
  const [missionType, setMissionType] = useState("website");
  const [amount, setAmount] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/revenue/overview");
      if (res.ok) {
        const data = await res.json();
        setOverview(data.overview);
        setProposals(data.proposals ?? []);
        setInvoices(data.invoices ?? []);
        setRecords(data.records ?? []);
      }
    } catch { /* ignore */ }
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            <DollarSign size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3 }} />
            Revenue System
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: "4px 0 0" }}>Proposals, estimates, invoices and revenue tracking</p>
        </div>
        <button onClick={loadData} disabled={loading} style={{ fontSize: 11, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 12px", cursor: "pointer", color: "var(--text-2)", display: "flex", alignItems: "center", gap: 5 }}>
          <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {overview && (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 12, marginBottom: 32 }}>
              {[
                { label: "Monthly Revenue", value: `$${overview.monthlyRevenue.toLocaleString()}`, icon: <DollarSign size={15} />, color: "#22c55e" },
                { label: "Pipeline Value", value: `$${overview.pipelineValue.toLocaleString()}`, icon: <BarChart3 size={15} />, color: "#a78bfa" },
                { label: "Accepted Value", value: `$${overview.acceptedProposalValue.toLocaleString()}`, icon: <CheckCircle2 size={15} />, color: "#34d399" },
                { label: "Estimated Monthly", value: `$${overview.estimatedMonthlyRevenue.toLocaleString()}`, icon: <TrendingUp size={15} />, color: "#38bdf8" },
                { label: "Conversion Rate", value: `${overview.proposalConversionRate}%`, icon: <Send size={15} />, color: "#f59e0b" },
                { label: "Outstanding", value: `$${overview.outstandingInvoiceValue.toLocaleString()}`, icon: <Receipt size={15} />, color: "#fb923c" },
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

          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
              <PlusCircle size={12} style={{ display: "inline", marginRight: 4 }} /> Create Proposal
            </div>
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
              <button onClick={createProposal} style={btnPrimary}><PlusCircle size={12} /> Create</button>
            </div>
          </section>

          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 32 }}>
            <div style={sectionTitle}><FileText size={12} /> Proposals</div>
            {proposals.length === 0 ? (
              <div style={emptyStyle}>No proposals yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {proposals.map((proposal) => {
                  const cfg = PROPOSAL_STATUS[proposal.status];
                  return (
                    <div key={proposal.proposalId} style={rowStyle}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{proposal.title}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{proposal.missionType.replace(/_/g, " ")} · ${proposal.estimate.monthlyRecurring.toLocaleString()} monthly est.</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>${proposal.amount.toLocaleString()}</span>
                      <span style={{ ...pillStyle, color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                      {proposal.status !== "accepted" && proposal.status !== "rejected" && (
                        <>
                          <button onClick={() => acceptProposal(proposal.proposalId)} style={smallSuccess}>Accept</button>
                          <button onClick={() => rejectProposal(proposal.proposalId)} style={smallDanger}>Reject</button>
                        </>
                      )}
                      {proposal.status === "accepted" && (
                        <button onClick={() => createInvoice(proposal)} style={smallPrimary}>Invoice</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 32 }}>
            <div style={sectionTitle}><Receipt size={12} /> Invoices</div>
            {invoices.length === 0 ? (
              <div style={emptyStyle}>No invoices yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {invoices.map((invoice) => {
                  const cfg = INVOICE_STATUS[invoice.status];
                  return (
                    <div key={invoice.invoiceId} style={rowStyle}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{invoice.invoiceId}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>Due {new Date(invoice.dueDate).toLocaleDateString()}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#fb923c" }}>${invoice.amount.toLocaleString()}</span>
                      <span style={{ ...pillStyle, color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                      {invoice.status !== "paid" && <button onClick={() => markPaid(invoice.invoiceId)} style={smallSuccess}>Pay</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 32 }}>
            <div style={sectionTitle}><TrendingUp size={12} /> Revenue History</div>
            {records.length === 0 ? (
              <div style={emptyStyle}>No paid revenue recorded yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {records.map((record) => (
                  <div key={record.recordId} style={rowStyle}>
                    <div style={{ flex: 1, fontSize: 12, color: "var(--text-2)" }}>{record.invoiceId}</div>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{new Date(record.recordedAt).toLocaleDateString()}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>${record.amount.toLocaleString()}</span>
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

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  background: "var(--bg-2)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
};

const pillStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  padding: "3px 8px",
  borderRadius: "var(--radius-sm)",
  textTransform: "uppercase",
  letterSpacing: "0.3px",
};

const emptyStyle: React.CSSProperties = {
  color: "var(--text-3)",
  fontSize: 13,
  padding: "8px 0",
};

const smallPrimary: React.CSSProperties = {
  fontSize: 10,
  background: "#6366f1",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "4px 8px",
  cursor: "pointer",
};

const smallSuccess: React.CSSProperties = {
  ...smallPrimary,
  background: "#22c55e",
};

const smallDanger: React.CSSProperties = {
  ...smallPrimary,
  background: "#f43f5e",
};
