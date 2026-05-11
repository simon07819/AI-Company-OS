"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle2, Clock, Eye, FileText, Filter, Image, Layout, Palette,
  Archive, GitCompare, Heart, Pencil, RefreshCw, Rocket, Search, ShieldCheck, Trash2, XCircle,
} from "lucide-react";
import { EmptyState, ErrorBanner, GhostButton, PageHeader, Panel, SectionHeader, StatusBadge } from "@/components/ui";

type OutputType = "creative_brief" | "logo_direction" | "style_direction" | "color_palette" | "typography" | "moodboard" | "concept_card" | "architecture_doc" | "api_spec" | "sitemap" | "wireframe" | "copywriting" | "marketing_plan" | "financial_projection" | "task_list" | "progress_report" | "validation_report" | "before_after" | "estimate_preview" | "invoice_preview" | "taxes_summary" | "profit_summary" | "hero_section" | "ux_recommendation" | "page_preview" | "uploaded_file_analysis";
type OutputStatus = "draft" | "in_progress" | "review" | "approved" | "delivered";

interface VisibleOutput {
  id: string;
  sessionId: string;
  projectId: string | null;
  title: string;
  type: OutputType;
  summary: string;
  preview: string;
  status: OutputStatus;
  assignedAgent: string;
  sourceFile: string | null;
  sourceFiles: string[];
  archivedAt?: string | null;
  favorite?: boolean;
  versionHistory?: { version: number; title: string; preview: string; updatedAt: string }[];
  revisions?: { id: string; note: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

const TYPE_META: Record<string, { icon: typeof Palette; color: string; label: string }> = {
  creative_brief: { icon: FileText, color: "#a78bfa", label: "Creative Brief" },
  logo_direction: { icon: Palette, color: "#8b5cf6", label: "Logo" },
  style_direction: { icon: Palette, color: "#ec4899", label: "Style Guide" },
  color_palette: { icon: Palette, color: "#f472b6", label: "Color Palette" },
  typography: { icon: FileText, color: "#06b6d4", label: "Typography" },
  moodboard: { icon: Image, color: "#f59e0b", label: "Moodboard" },
  concept_card: { icon: Rocket, color: "#6366f1", label: "Concept" },
  architecture_doc: { icon: Layout, color: "#38bdf8", label: "Architecture" },
  api_spec: { icon: FileText, color: "#34d399", label: "API Spec" },
  sitemap: { icon: Layout, color: "#06b6d4", label: "Sitemap" },
  wireframe: { icon: Layout, color: "#818cf8", label: "Wireframe" },
  copywriting: { icon: FileText, color: "#f472b6", label: "Copywriting" },
  marketing_plan: { icon: Rocket, color: "#f59e0b", label: "Marketing Plan" },
  financial_projection: { icon: FileText, color: "#22c55e", label: "Financial" },
  task_list: { icon: CheckCircle2, color: "#3b82f6", label: "Task List" },
  progress_report: { icon: Clock, color: "#38bdf8", label: "Progress" },
  validation_report: { icon: ShieldCheck, color: "#22c55e", label: "Validation" },
  before_after: { icon: Eye, color: "#a78bfa", label: "Before/After" },
  estimate_preview: { icon: FileText, color: "#f59e0b", label: "Estimate" },
  invoice_preview: { icon: FileText, color: "#22c55e", label: "Invoice" },
  taxes_summary: { icon: FileText, color: "#fb923c", label: "Taxes" },
  profit_summary: { icon: FileText, color: "#22c55e", label: "Profit" },
  hero_section: { icon: Layout, color: "#818cf8", label: "Hero Section" },
  ux_recommendation: { icon: Layout, color: "#06b6d4", label: "UX Notes" },
  page_preview: { icon: Layout, color: "#38bdf8", label: "Page Preview" },
  uploaded_file_analysis: { icon: FileText, color: "#94a3b8", label: "Upload Analysis" },
};

const STATUS_META: Record<OutputStatus, { color: string; label: string }> = {
  draft: { color: "#94a3b8", label: "Draft" },
  in_progress: { color: "#3b82f6", label: "In Progress" },
  review: { color: "#f59e0b", label: "Review" },
  approved: { color: "#22c55e", label: "Approved" },
  delivered: { color: "#34d399", label: "Delivered" },
};

const AGENT_EMOJI: Record<string, string> = { cmo: "📣", cto: "🔧", cfo: "💰", coo: "⚙️", ceo: "👑", frontend_agent: "🎨", backend_agent: "🗄️", qa_agent: "🔍", logistics: "📦", product_agent: "📋" };

export default function OutputsPage() {
  const [outputs, setOutputs] = useState<VisibleOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<OutputStatus | "all">("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [editing, setEditing] = useState<VisibleOutput | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");

  const loadOutputs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/visible-outputs");
      if (res.ok) {
        const data = await res.json();
        setOutputs(data.outputs ?? []);
      } else {
        setError("Failed to load outputs");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  useEffect(() => { loadOutputs(); }, []);

  const outputAction = async (id: string, body: Record<string, unknown>, method = "PATCH") => {
    await fetch(`/api/visible-outputs/${id}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditing(null);
    setRevisionNotes("");
    loadOutputs();
  };

  const startEdit = (output: VisibleOutput) => {
    setEditing(output);
    setDraftTitle(output.title);
    setDraftSummary(output.summary);
    setRevisionNotes("");
  };

  const filtered = outputs.filter((o) => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (filterType !== "all" && o.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.title.toLowerCase().includes(q) || o.summary.toLowerCase().includes(q) || o.type.toLowerCase().includes(q);
    }
    return true;
  });

  const statusCounts: Record<string, number> = {};
  for (const o of outputs) { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; }

  const typeSet = new Set(outputs.map((o) => o.type));
  const types = Array.from(typeSet).sort();

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>
      <PageHeader
        icon={<Eye size={22} />}
        title="Visual Output Gallery"
        description="Browse, preview, and review all generated outputs across missions — branding, websites, invoices, strategies, and more."
        actions={
          <GhostButton onClick={loadOutputs} disabled={loading}>
            <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
          </GhostButton>
        }
      />

      {error && <ErrorBanner message={error} onRetry={loadOutputs} />}

      {editing && (
        <Panel style={{ marginBottom: 20 }}>
          <SectionHeader icon={<Pencil size={12} />} title="Edit Output Metadata" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8 }}>
            <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Title" style={inputStyle} />
            <input value={draftSummary} onChange={(e) => setDraftSummary(e.target.value)} placeholder="Summary" style={inputStyle} />
            <button onClick={() => outputAction(editing.id, { title: draftTitle, summary: draftSummary })} style={buttonStyle}>Save</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} placeholder="Revision notes" style={inputStyle} />
            <button onClick={() => outputAction(editing.id, { action: "revision", notes: revisionNotes })} disabled={!revisionNotes.trim()} style={buttonStyle}>Add Revision</button>
          </div>
        </Panel>
      )}

      {/* Filters */}
      <Panel style={{ marginBottom: 20, padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 180 }}>
            <Search size={13} style={{ color: "var(--text-3)" }} />
            <input
              type="text" placeholder="Search outputs..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 12, background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as OutputStatus | "all")}
            style={{ padding: "6px 10px", borderRadius: 6, fontSize: 11, background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="all">All Status ({outputs.length})</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label} ({statusCounts[k] ?? 0})</option>
            ))}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 6, fontSize: 11, background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="all">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>{TYPE_META[t]?.label ?? t}</option>
            ))}
          </select>
        </div>
      </Panel>

      {/* Gallery */}
      {filtered.length === 0 ? (
        <EmptyState title="No outputs yet" description="Launch a mission to generate visual outputs. They will appear here as agents produce deliverables." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          <AnimatePresence>
            {filtered.map((output) => {
              const meta = TYPE_META[output.type] ?? { icon: FileText, color: "#94a3b8", label: output.type };
              const statusMeta = STATUS_META[output.status];
              const Icon = meta.icon;
              const emoji = AGENT_EMOJI[output.assignedAgent] ?? "🤖";
              return (
                <motion.div key={output.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Link href={`/outputs/${output.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      background: "var(--surface)", border: `1px solid ${meta.color}20`, borderLeft: `3px solid ${meta.color}`,
                      borderRadius: 10, padding: 14, cursor: "pointer", transition: "border-color 0.15s",
                    }}>
                      {/* Type + status header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                          background: `${meta.color}14`, border: `1px solid ${meta.color}25`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Icon size={13} style={{ color: meta.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {output.title}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: `${meta.color}12`, color: meta.color, fontWeight: 600 }}>
                              {meta.label}
                            </span>
                            <span style={{ fontSize: 9, color: "var(--text-3)" }}>{emoji} {output.assignedAgent.replace(/_/g, " ")}</span>
                          </div>
                        </div>
                        <StatusBadge label={statusMeta.label} color={statusMeta.color} size="xs" />
                      </div>

                      {/* Preview text */}
                      <p style={{
                        fontSize: 10, color: "var(--text-2)", lineHeight: 1.5, margin: 0,
                        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {output.preview || output.summary}
                      </p>

                      {/* Footer */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 9, color: "var(--text-3)" }}>
                          {new Date(output.updatedAt).toLocaleDateString()}
                        </span>
                        <span style={{ fontSize: 9, color: "var(--text-3)" }}>
                          {(output.versionHistory?.length ?? 0)} versions · {(output.revisions?.length ?? 0)} revisions
                        </span>
                        {output.sourceFiles.length > 0 && (
                          <span style={{ fontSize: 9, color: "var(--text-3)" }}>
                            {output.sourceFiles.length} file{output.sourceFiles.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div onClick={(e) => e.preventDefault()} style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
                        <button onClick={(e) => { e.stopPropagation(); startEdit(output); }} style={smallButtonStyle}><Pencil size={10} /> Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); outputAction(output.id, { action: "favorite", favorite: !output.favorite }); }} style={smallButtonStyle}><Heart size={10} /> {output.favorite ? "Unfavorite" : "Favorite"}</button>
                        <button onClick={(e) => { e.stopPropagation(); startEdit(output); }} style={smallButtonStyle}><GitCompare size={10} /> Compare</button>
                        <button onClick={(e) => { e.stopPropagation(); outputAction(output.id, { action: "archive" }); }} style={smallButtonStyle}><Archive size={10} /> Archive</button>
                        <button onClick={(e) => { e.stopPropagation(); outputAction(output.id, {}, "DELETE"); }} style={smallButtonStyle}><Trash2 size={10} /> Delete</button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  fontSize: 12,
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 700,
  background: "#3b82f6",
  border: "none",
  color: "#fff",
  cursor: "pointer",
};

const smallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 7px",
  borderRadius: 5,
  border: "1px solid var(--border)",
  background: "var(--bg-2)",
  color: "var(--text-2)",
  fontSize: 10,
  cursor: "pointer",
};
