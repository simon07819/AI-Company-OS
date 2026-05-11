"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft, CheckCircle2, Clock, Eye, FileText, Image, Layout, Palette,
  RefreshCw, Rocket, ShieldCheck, XCircle,
} from "lucide-react";
import { EmptyState, ErrorBanner, PageHeader, Panel, SectionHeader, StatusBadge } from "@/components/ui";
import { VisualOutputPreview } from "@/components/previews/VisualOutputPreview";
import type { OutputVisualPreview } from "@/lib/visibleOutputs";

type OutputStatus = "draft" | "in_progress" | "review" | "approved" | "delivered";

interface VisibleOutput {
  id: string;
  sessionId: string;
  projectId: string | null;
  title: string;
  type: string;
  summary: string;
  preview: string;
  status: OutputStatus;
  assignedAgent: string;
  sourceFile: string | null;
  sourceFiles: string[];
  visualPreview?: OutputVisualPreview | null;
  createdAt: string;
  updatedAt: string;
}

interface Revision {
  id: string;
  outputId: string;
  comment: string;
  direction: string;
  createdAt: string;
  agentId: string;
  status: "pending" | "in_progress" | "completed";
}

const TYPE_META: Record<string, { icon: typeof Palette; color: string; label: string }> = {
  creative_brief: { icon: FileText, color: "#a78bfa", label: "Creative Brief" },
  logo_direction: { icon: Palette, color: "#8b5cf6", label: "Logo Direction" },
  style_direction: { icon: Palette, color: "#ec4899", label: "Style Direction" },
  color_palette: { icon: Palette, color: "#f472b6", label: "Color Palette" },
  typography: { icon: FileText, color: "#06b6d4", label: "Typography" },
  moodboard: { icon: Image, color: "#f59e0b", label: "Moodboard" },
  concept_card: { icon: Rocket, color: "#6366f1", label: "Concept Card" },
  architecture_doc: { icon: Layout, color: "#38bdf8", label: "Architecture" },
  hero_section: { icon: Layout, color: "#818cf8", label: "Hero Section" },
  page_preview: { icon: Layout, color: "#38bdf8", label: "Page Preview" },
};

const STATUS_META: Record<OutputStatus, { color: string; label: string }> = {
  draft: { color: "#94a3b8", label: "Draft" },
  in_progress: { color: "#3b82f6", label: "In Progress" },
  review: { color: "#f59e0b", label: "Review" },
  approved: { color: "#22c55e", label: "Approved" },
  delivered: { color: "#34d399", label: "Delivered" },
};

const AGENT_EMOJI: Record<string, string> = { cmo: "📣", cto: "🔧", cfo: "💰", coo: "⚙️", ceo: "👑", frontend_agent: "🎨", backend_agent: "🗄️", qa_agent: "🔍", product_agent: "📋" };

export default function OutputDetailPage() {
  const { outputId } = useParams<{ outputId: string }>();
  const [output, setOutput] = useState<VisibleOutput | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revComment, setRevComment] = useState("");
  const [revDirection, setRevDirection] = useState("");
  const [submittingRev, setSubmittingRev] = useState(false);

  const loadOutput = async () => {
    setLoading(true);
    setError(null);
    try {
      const [outRes, revRes] = await Promise.all([
        fetch(`/api/visible-outputs?outputId=${outputId}`),
        fetch(`/api/revisions?outputId=${outputId}`),
      ]);
      if (outRes.ok) {
        const data = await outRes.json();
        setOutput(data.output ?? null);
      } else {
        setError("Output not found");
      }
      if (revRes.ok) {
        const data = await revRes.json();
        setRevisions(data.revisions ?? []);
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  useEffect(() => { loadOutput(); }, [outputId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (newStatus: OutputStatus) => {
    if (!output) return;
    try {
      const res = await fetch("/api/visible-outputs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputId: output.id, status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setOutput(data.output ?? output);
      }
    } catch { /* ignore */ }
  };

  const handleRevision = async () => {
    if (!revComment.trim() || !output) return;
    setSubmittingRev(true);
    try {
      const res = await fetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputId: output.id, comment: revComment, direction: revDirection, agentId: output.assignedAgent }),
      });
      if (res.ok) {
        const data = await res.json();
        setRevisions((prev) => [data.revision, ...prev]);
        setRevComment("");
        setRevDirection("");
      }
    } catch { /* ignore */ }
    setSubmittingRev(false);
  };

  if (error) return <ErrorBanner message={error} onRetry={loadOutput} />;

  if (!output && !loading) {
    return (
      <div style={{ padding: 40 }}>
        <EmptyState title="Output not found" description="This output may have been removed or the ID is invalid." />
        <Link href="/outputs" style={{ fontSize: 12, color: "#3b82f6", marginTop: 16, display: "inline-block" }}>Back to gallery</Link>
      </div>
    );
  }

  const meta = TYPE_META[output?.type ?? ""] ?? { icon: FileText, color: "#94a3b8", label: output?.type ?? "Output" };
  const statusMeta = STATUS_META[output?.status ?? "draft"];
  const Icon = meta.icon;
  const emoji = AGENT_EMOJI[output?.assignedAgent ?? ""] ?? "🤖";

  return (
    <div style={{ padding: "32px 40px", maxWidth: 960, margin: "0 auto" }}>
      <Link href="/outputs" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-3)", marginBottom: 16, textDecoration: "none" }}>
        <ArrowLeft size={12} /> Back to gallery
      </Link>

      {output && (
        <>
          <PageHeader
            icon={<Icon size={22} style={{ color: meta.color }} />}
            title={output.title}
            description={output.summary}
            badge={<StatusBadge label={statusMeta.label} color={statusMeta.color} size="md" />}
            actions={
              <div style={{ display: "flex", gap: 6 }}>
                {output.status === "review" && (
                  <>
                    <button
                      onClick={() => handleStatusChange("approved")}
                      style={{
                        padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      <CheckCircle2 size={11} /> Approve
                    </button>
                    <button
                      onClick={() => handleStatusChange("draft")}
                      style={{
                        padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      <XCircle size={11} /> Request Changes
                    </button>
                  </>
                )}
                {output.status === "approved" && (
                  <button
                    onClick={() => handleStatusChange("delivered")}
                    style={{
                      padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399",
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <CheckCircle2 size={11} /> Mark Delivered
                  </button>
                )}
              </div>
            }
          />

          {/* Preview content */}
          <Panel style={{ marginBottom: 20 }}>
            <SectionHeader icon={<Eye size={12} style={{ color: meta.color }} />} title="Preview" />
            <div style={{
              background: `${meta.color}04`, border: `1px solid ${meta.color}15`,
              borderRadius: 8, padding: 18, marginTop: 10,
            }}>
              <VisualOutputPreview visualPreview={output.visualPreview} title={output.title} summary={output.summary} />
              <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7, margin: output.visualPreview ? "14px 0 0" : 0, whiteSpace: "pre-wrap" }}>
                {output.preview || "No preview content available yet."}
              </p>
            </div>
          </Panel>

          {/* Meta info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            <Panel style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Agent</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>{emoji} {output.assignedAgent.replace(/_/g, " ")}</div>
            </Panel>
            <Panel style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Type</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: meta.color, marginTop: 4 }}>{meta.label}</div>
            </Panel>
            <Panel style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Mission</div>
              <Link href={`/mission/${output.sessionId}`} style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", marginTop: 4, display: "block", textDecoration: "none" }}>
                {output.sessionId}
              </Link>
            </Panel>
          </div>

          {/* Source files */}
          {output.sourceFiles.length > 0 && (
            <Panel style={{ marginBottom: 20 }}>
              <SectionHeader icon={<FileText size={12} />} title="Source Files" />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                {output.sourceFiles.map((f, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: "var(--text)", fontFamily: "ui-monospace, monospace",
                    padding: "6px 10px", background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--border)",
                  }}>
                    {f}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Revision request */}
          <Panel style={{ marginBottom: 20 }}>
            <SectionHeader icon={<RefreshCw size={12} style={{ color: "#f59e0b" }} />} title="Request Revision" />
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                placeholder="What needs to change? e.g. 'Le logo est trop agressif', 'Je veux plus premium'"
                value={revComment}
                onChange={(e) => setRevComment(e.target.value)}
                rows={3}
                style={{
                  padding: "10px 12px", borderRadius: 8, fontSize: 12, resize: "vertical",
                  background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none",
                }}
              />
              <input
                type="text"
                placeholder="New direction (optional): e.g. 'Rendre plus minimaliste', 'Style Apple'"
                value={revDirection}
                onChange={(e) => setRevDirection(e.target.value)}
                style={{
                  padding: "8px 12px", borderRadius: 6, fontSize: 12,
                  background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none",
                }}
              />
              <button
                onClick={handleRevision}
                disabled={submittingRev || !revComment.trim()}
                style={{
                  padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b",
                  alignSelf: "flex-end",
                  opacity: revComment.trim() ? 1 : 0.5,
                }}
              >
                {submittingRev ? "Sending..." : "Request Revision"}
              </button>
            </div>
          </Panel>

          {/* Revision history */}
          {revisions.length > 0 && (
            <Panel style={{ marginBottom: 20 }}>
              <SectionHeader icon={<Clock size={12} />} title="Revision History" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {revisions.map((rev) => {
                  const revEmoji = AGENT_EMOJI[rev.agentId] ?? "🤖";
                  return (
                    <div key={rev.id} style={{
                      padding: "10px 12px", borderRadius: 8,
                      background: rev.status === "completed" ? "rgba(34,197,94,0.06)" : rev.status === "in_progress" ? "rgba(59,130,246,0.06)" : "rgba(245,158,11,0.06)",
                      border: `1px solid ${rev.status === "completed" ? "rgba(34,197,94,0.2)" : rev.status === "in_progress" ? "rgba(59,130,246,0.2)" : "rgba(245,158,11,0.2)"}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{revEmoji} Feedback</span>
                        <StatusBadge
                          label={rev.status === "completed" ? "Done" : rev.status === "in_progress" ? "Working" : "Pending"}
                          color={rev.status === "completed" ? "#22c55e" : rev.status === "in_progress" ? "#3b82f6" : "#f59e0b"}
                          size="xs"
                        />
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5, margin: 0 }}>{rev.comment}</p>
                      {rev.direction && (
                        <p style={{ fontSize: 10, color: "#f59e0b", marginTop: 4, marginBottom: 0 }}>
                          Direction: {rev.direction}
                        </p>
                      )}
                      <span style={{ fontSize: 9, color: "var(--text-3)", marginTop: 4, display: "block" }}>
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
