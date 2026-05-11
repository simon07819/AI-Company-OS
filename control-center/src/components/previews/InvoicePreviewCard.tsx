"use client";

import { motion } from "framer-motion";
import { DollarSign, FileText } from "lucide-react";

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoicePreviewCardProps {
  invoiceNumber?: string;
  client: string;
  company?: string;
  dueDate?: string;
  items: InvoiceLineItem[];
  subtotal: number;
  tpsRate?: number;
  tvqRate?: number;
  tpsAmount: number;
  tvqAmount: number;
  total: number;
  currency?: string;
  status?: "draft" | "sent" | "paid" | "overdue";
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  sent: "#3b82f6",
  paid: "#22c55e",
  overdue: "#ef4444",
};

export function InvoicePreviewCard({
  invoiceNumber = "INV-001",
  client, company = "AI Company",
  dueDate, items, subtotal,
  tpsRate = 0.05, tvqRate = 0.09975,
  tpsAmount, tvqAmount, total,
  currency = "CAD", status = "draft",
}: InvoicePreviewCardProps) {
  const statusColor = STATUS_COLORS[status] ?? "#94a3b8";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "14px 16px", borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: `linear-gradient(135deg, ${statusColor}06, transparent)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, background: `${statusColor}14`,
            border: `1px solid ${statusColor}25`, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <DollarSign size={13} style={{ color: statusColor }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{invoiceNumber}</div>
            <div style={{ fontSize: 9, color: "var(--text-3)" }}>{company}</div>
          </div>
        </div>
        <span style={{
          fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
          background: `${statusColor}12`, color: statusColor, textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {status}
        </span>
      </div>

      {/* Client info */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Bill To</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{client}</div>
          </div>
          {dueDate && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Due Date</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginTop: 2 }}>{new Date(dueDate).toLocaleDateString()}</div>
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <div style={{ padding: "10px 16px" }}>
        <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "3px 0", color: "var(--text-3)", fontWeight: 600 }}>Description</th>
              <th style={{ textAlign: "right", padding: "3px 4px", color: "var(--text-3)", fontWeight: 600 }}>Qty</th>
              <th style={{ textAlign: "right", padding: "3px 4px", color: "var(--text-3)", fontWeight: 600 }}>Price</th>
              <th style={{ textAlign: "right", padding: "3px 0", color: "var(--text-3)", fontWeight: 600 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "5px 0", color: "var(--text)", fontSize: 10 }}>{item.description}</td>
                <td style={{ padding: "5px 4px", textAlign: "right", color: "var(--text-2)" }}>{item.quantity}</td>
                <td style={{ padding: "5px 4px", textAlign: "right", color: "var(--text-2)" }}>${item.unitPrice.toLocaleString()}</td>
                <td style={{ padding: "5px 0", textAlign: "right", color: "var(--text)", fontWeight: 600 }}>${item.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-3)", marginBottom: 2 }}>
          <span>Subtotal</span><span>${subtotal.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-3)", marginBottom: 2 }}>
          <span>TPS ({(tpsRate * 100).toFixed(0)}%)</span><span>${tpsAmount.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>
          <span>TVQ ({(tvqRate * 100).toFixed(3)}%)</span><span>${tvqAmount.toFixed(2)}</span>
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: "#22c55e",
          paddingTop: 6, borderTop: "1px solid var(--border)",
        }}>
          <span>Total ({currency})</span><span>${total.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );
}
