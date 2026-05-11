"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, Clock, DollarSign, Eye, FileText,
  Image as ImageIcon, Layout, Palette, Rocket, X, XCircle, ShieldCheck, Sparkles,
} from "lucide-react";
import { VisualOutputPreview } from "@/components/previews/VisualOutputPreview";
import type { OutputVisualPreview } from "@/lib/visibleOutputs";

// ─── Types ────────────────────────────────────────────────────────────────

type ApprovalType = "invoice" | "deliverable" | "logo" | "flyer" | "website" | "strategy" | "mission" | "document" | "file";
type ApprovalStatus = "pending" | "approved" | "rejected";

interface ApprovalItem {
  id: string;
  title: string;
  type: ApprovalType;
  status: ApprovalStatus;
  agentId: string;
  agentName: string;
  sessionId?: string;
  createdAt: string;
  qualityScore?: number;
  summary: string;
  hasPreviewContent: boolean;
  previewType: "invoice" | "markdown" | "file_list" | "output_list" | "mission_summary" | "none";
  rejectionReason?: string;
}

interface ApprovalPreview {
  id: string;
  title: string;
  type: ApprovalType;
  agentName: string;
  createdAt: string;
  qualityScore?: number;
  content: string;
  invoice?: {
    subtotal: number;
    tpsAmount: number;
    tvqAmount: number;
    total: number;
    currency: string;
    client: string;
    items: { description: string; quantity: number; unitPrice: number; total: number }[];
  };
  files?: { name: string; path: string; score?: number; status: string; preview?: string; imageUrl?: string; mimeType?: string }[];
  outputs?: { id: string; title: string; type: string; status: string; preview: string; visualKind?: "image" | "website" | "invoice" | "document" | "brand"; colors?: string[]; visualPreview?: OutputVisualPreview | null }[];
  mission?: {
    name: string;
    missionType: string;
    status: string;
    progress: number;
    completedTasks: number;
    totalTasks: number;
  };
  warnings: string[];
}

// ─── Type icon helper ──────────────────────────────────────────────────────

function typeIcon(type: ApprovalType, size = 14) {
  const props = { size, style: { flexShrink: 0 } };
  switch (type) {
    case "invoice": return <DollarSign {...props} style={{ ...props.style, color: "#22c55e" }} />;
    case "logo": return <Palette {...props} style={{ ...props.style, color: "#8b5cf6" }} />;
    case "flyer": return <ImageIcon {...props} style={{ ...props.style, color: "#ec4899" }} />;
    case "website": return <Layout {...props} style={{ ...props.style, color: "#06b6d4" }} />;
    case "strategy": return <Rocket {...props} style={{ ...props.style, color: "#f59e0b" }} />;
    case "mission": return <Rocket {...props} style={{ ...props.style, color: "#3b82f6" }} />;
    case "document": return <FileText {...props} style={{ ...props.style, color: "#94a3b8" }} />;
    case "file": return <FileText {...props} style={{ ...props.style, color: "#94a3b8" }} />;
    default: return <ShieldCheck {...props} style={{ ...props.style, color: "#64748b" }} />;
  }
}

const TYPE_LABELS: Record<ApprovalType, string> = {
  invoice: "Invoice", deliverable: "Deliverable", logo: "Logo / Design", flyer: "Flyer",
  website: "Website", strategy: "Strategy", mission: "Mission", document: "Document", file: "File",
};

const TYPE_COLORS: Record<ApprovalType, string> = {
  invoice: "#22c55e", deliverable: "#3b82f6", logo: "#8b5cf6", flyer: "#ec4899",
  website: "#06b6d4", strategy: "#f59e0b", mission: "#3b82f6", document: "#94a3b8", file: "#94a3b8",
};

// ─── ApprovalCard ─────────────────────────────────────────────────────────

interface ApprovalCardProps {
  item: ApprovalItem;
  onPreview: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ApprovalCard({ item, onPreview, onApprove, onReject }: ApprovalCardProps) {
  const color = TYPE_COLORS[item.type] ?? "#64748b";
  const isPending = item.status === "pending";
  void onApprove;
  void onReject;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        background: isPending ? `${color}06` : "var(--surface)",
        border: `1px solid ${isPending ? `${color}25` : "var(--border)"}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        padding: 14,
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${color}14`, border: `1px solid ${color}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {typeIcon(item.type)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <span style={{
              fontSize: 9, padding: "1px 6px", borderRadius: 4,
              background: `${color}12`, color, fontWeight: 600,
            }}>
              {TYPE_LABELS[item.type]}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>
              {item.agentName}
            </span>
            <span style={{ fontSize: 9, color: "var(--text-3)" }}>
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        {item.status === "approved" && <CheckCircle2 size={14} color="#22c55e" />}
        {item.status === "rejected" && <XCircle size={14} color="#ef4444" />}
      </div>

      {/* Summary */}
      <p style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5, margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {item.summary}
      </p>

      {/* Quality score */}
      {item.qualityScore != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>Quality:</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: item.qualityScore >= 80 ? "#22c55e" : item.qualityScore >= 50 ? "#f59e0b" : "#ef4444" }}>
            {item.qualityScore}/100
          </span>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => onPreview(item.id)}
            style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
              background: `${color}10`, border: `1px solid ${color}25`, color,
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <Eye size={10} /> Preview
          </button>
          {!item.hasPreviewContent && (
            <button
              onClick={() => onPreview(item.id)}
              style={{
                padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <Sparkles size={10} /> Generate preview
            </button>
          )}
        </div>
      )}

      {/* No preview warning */}
      {isPending && !item.hasPreviewContent && (
        <div style={{
          marginTop: 8, padding: "6px 8px", borderRadius: 6,
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <AlertTriangle size={10} color="#f59e0b" />
          <span style={{ fontSize: 9, color: "#f59e0b", fontWeight: 600 }}>Aucun apercu disponible — impossible d&apos;approuver</span>
        </div>
      )}

      {/* Rejection reason */}
      {item.status === "rejected" && item.rejectionReason && (
        <div style={{
          marginTop: 8, padding: "6px 8px", borderRadius: 6,
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
        }}>
          <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 600 }}>Reason: </span>
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>{item.rejectionReason}</span>
        </div>
      )}
    </motion.div>
  );
}

// ─── ApprovalPreviewModal ─────────────────────────────────────────────────

interface ApprovalPreviewModalProps {
  preview: ApprovalPreview | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ApprovalPreviewModal({ preview, open, onClose, onApprove, onReject }: ApprovalPreviewModalProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  if (!open || !preview) return null;

  const canApprove = preview.warnings.length === 0;
  const color = TYPE_COLORS[preview.type] ?? "#64748b";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "90%", maxWidth: 700, maxHeight: "85vh",
            background: "var(--bg-1)", border: `1px solid ${color}30`,
            borderRadius: 14, overflow: "hidden",
            boxShadow: `0 8px 40px ${color}15, 0 0 0 1px ${color}10`,
            display: "flex", flexDirection: "column",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 12,
            background: `linear-gradient(135deg, ${color}08, transparent)`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: `${color}14`, border: `1px solid ${color}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {typeIcon(preview.type, 18)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{preview.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 10, color }}>{TYPE_LABELS[preview.type]}</span>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>by {preview.agentName}</span>
                <span style={{ fontSize: 9, color: "var(--text-3)" }}>
                  <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} />
                  {new Date(preview.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: 4 }}>
              <X size={16} />
            </button>
          </div>

          {/* Body — scrollable */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {/* Quality Score */}
            {preview.qualityScore != null && (
              <div style={{
                marginBottom: 16, padding: "10px 14px", borderRadius: 8,
                background: preview.qualityScore >= 80 ? "rgba(34,197,94,0.08)" : preview.qualityScore >= 50 ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${preview.qualityScore >= 80 ? "rgba(34,197,94,0.2)" : preview.qualityScore >= 50 ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)"}`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <ShieldCheck size={16} color={preview.qualityScore >= 80 ? "#22c55e" : preview.qualityScore >= 50 ? "#f59e0b" : "#ef4444"} />
                <span style={{ fontSize: 14, fontWeight: 700, color: preview.qualityScore >= 80 ? "#22c55e" : preview.qualityScore >= 50 ? "#f59e0b" : "#ef4444" }}>
                  {preview.qualityScore}/100
                </span>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>Quality Score</span>
              </div>
            )}

            {/* Invoice Preview */}
            {preview.invoice && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Invoice Preview
                </div>
                <div style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: 14,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Client: {preview.invoice.client}</div>
                  <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <th style={{ textAlign: "left", padding: "4px 0", color: "var(--text-3)", fontWeight: 600 }}>Description</th>
                        <th style={{ textAlign: "right", padding: "4px 8px", color: "var(--text-3)", fontWeight: 600 }}>Qty</th>
                        <th style={{ textAlign: "right", padding: "4px 8px", color: "var(--text-3)", fontWeight: 600 }}>Price</th>
                        <th style={{ textAlign: "right", padding: "4px 0", color: "var(--text-3)", fontWeight: 600 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.invoice.items.map((item, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "6px 0", color: "var(--text)" }}>{item.description}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-2)" }}>{item.quantity}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-2)" }}>${item.unitPrice.toLocaleString()}</td>
                          <td style={{ padding: "6px 0", textAlign: "right", color: "var(--text)", fontWeight: 600 }}>${item.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)" }}>
                      <span>Subtotal</span><span>${preview.invoice.subtotal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)" }}>
                      <span>TPS (5%)</span><span>${preview.invoice.tpsAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)" }}>
                      <span>TVQ (9.975%)</span><span>${preview.invoice.tvqAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "#22c55e", marginTop: 4, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
                      <span>Total ({preview.invoice.currency})</span><span>${preview.invoice.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mission Summary */}
            {preview.mission && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Mission Progress
                </div>
                <div style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: 14,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{preview.mission.name}</div>
                  <div style={{ fontSize: 10, color: "#3b82f6", marginBottom: 8 }}>{preview.mission.missionType} · {preview.mission.status}</div>
                  <div style={{ background: "var(--bg-2)", borderRadius: 4, height: 8, overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ height: "100%", width: `${preview.mission.progress}%`, background: "#3b82f6", borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                    {preview.mission.completedTasks}/{preview.mission.totalTasks} tasks completed ({preview.mission.progress}%)
                  </div>
                </div>
              </div>
            )}

            {/* Outputs Preview */}
            {preview.outputs && preview.outputs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Visual Deliverables
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {preview.outputs.map((out, i) => (
                    <div key={i} style={{
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 8, padding: "10px 12px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{out.title}</span>
                        <span style={{
                          fontSize: 8, padding: "1px 6px", borderRadius: 4,
                          background: out.status === "review" ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)",
                          color: out.status === "review" ? "#f59e0b" : "#22c55e",
                          fontWeight: 600,
                        }}>
                          {out.status}
                        </span>
                      </div>
                      <VisualOutputPreview visualPreview={out.visualPreview} title={out.title} summary={out.preview} />
                      {!out.visualPreview && (
                        <button
                          onClick={() => fetch(`/api/visible-outputs/${out.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "generate_visual_preview" }),
                          })}
                          style={{
                            margin: "8px 0", padding: "7px 10px", borderRadius: 7,
                            border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.08)",
                            color: "#8b5cf6", fontSize: 10, fontWeight: 700, cursor: "pointer",
                            display: "inline-flex", alignItems: "center", gap: 5,
                          }}
                        >
                          <Sparkles size={11} /> Generate visual preview
                        </button>
                      )}
                      <p style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
                        {out.preview || "No preview text available."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files Preview */}
            {preview.files && preview.files.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Files
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {preview.files.map((f, i) => (
                    <div key={i} style={{
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 6, padding: "8px 10px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", fontFamily: "ui-monospace, monospace" }}>{f.name}</span>
                        {f.score != null && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: f.score >= 80 ? "#22c55e" : f.score >= 50 ? "#f59e0b" : "#ef4444" }}>
                            {f.score}/100
                          </span>
                        )}
                      </div>
                      {f.preview && (
                        <pre style={{
                          fontSize: 9, color: "var(--text-3)", lineHeight: 1.4,
                          marginTop: 4, background: "var(--bg-2)", padding: 6, borderRadius: 4,
                          overflow: "auto", maxHeight: 120, whiteSpace: "pre-wrap", margin: 0,
                        }}>
                          {f.preview}
                        </pre>
                      )}
                      {f.imageUrl && (
                        <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", background: "#0f172a" }}>
                          <img src={f.imageUrl} alt={f.name} style={{ width: "100%", maxHeight: 260, objectFit: "contain", display: "block" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content / Summary */}
            {preview.content && !preview.invoice && !preview.mission && !preview.outputs?.length && !preview.files?.length && (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: 14,
                }}>
                  <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                    {preview.content}
                  </p>
                </div>
              </div>
            )}

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div style={{
                padding: "10px 12px", borderRadius: 8,
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <AlertTriangle size={14} color="#f59e0b" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>Warnings</span>
                </div>
                {preview.warnings.map((w, i) => (
                  <p key={i} style={{ fontSize: 11, color: "var(--text-2)", margin: "2px 0" }}>{w}</p>
                ))}
              </div>
            )}
          </div>

          {/* Footer — Actions */}
          <div style={{
            padding: "14px 20px", borderTop: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 8,
            background: `linear-gradient(135deg, ${color}04, transparent)`,
          }}>
            {!showRejectInput ? (
              <>
                <button
                  onClick={() => onApprove(preview.id)}
                  disabled={!canApprove}
                  title={!canApprove ? "Aucun apercu disponible" : undefined}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                    cursor: canApprove ? "pointer" : "not-allowed",
                    background: canApprove ? "rgba(34,197,94,0.12)" : "transparent",
                    border: "1px solid rgba(34,197,94,0.3)", color: canApprove ? "#22c55e" : "#64748b",
                    display: "flex", alignItems: "center", gap: 5,
                    opacity: canApprove ? 1 : 0.5,
                  }}
                >
                  <CheckCircle2 size={12} /> Approve
                </button>
                <button
                  onClick={() => setShowRejectInput(true)}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <XCircle size={12} /> Reject
                </button>
                <div style={{ flex: 1 }} />
                <button
                  onClick={onClose}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: "transparent", border: "1px solid var(--border)", color: "var(--text-3)",
                  }}
                >
                  Close
                </button>
              </>
            ) : (
              <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{
                    flex: 1, padding: "7px 10px", borderRadius: 6, fontSize: 11,
                    background: "var(--bg-2)", border: "1px solid var(--border)",
                    color: "var(--text)", outline: "none",
                  }}
                />
                <button
                  onClick={() => { onReject(preview.id); setRejectReason(""); setShowRejectInput(false); onClose(); }}
                  style={{
                    padding: "7px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444",
                  }}
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => setShowRejectInput(false)}
                  style={{
                    padding: "7px 14px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                    background: "transparent", border: "1px solid var(--border)", color: "var(--text-3)",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
