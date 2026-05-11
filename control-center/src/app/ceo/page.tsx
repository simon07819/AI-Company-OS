"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Moon, RotateCcw, Send, Sparkles, Wand2 } from "lucide-react";
import { VisualOutputPreview } from "@/components/previews/VisualOutputPreview";
import type { ApprovalItem, ApprovalPreview } from "@/lib/approvalPreview";
import type { OutputVisualPreview } from "@/lib/visibleOutputs";

interface CeoMessage {
  id: string;
  role: "user" | "ceo";
  text: string;
  sessionId?: string;
  timestamp: string;
}

interface CeoProject {
  id: string;
  name: string;
  sessionId: string | null;
  workspaceId?: string | null;
  progress: number;
  outputsCount: number;
}

interface AutopilotSession {
  sessionId: string;
  projectName: string;
  status: "draft" | "running" | "paused" | "waiting_approval" | "completed" | "failed";
  progress: number;
  tasks: { id: string; title: string; agent: string; status: string }[];
  logs: { id: string; timestamp: string; level: string; agent: string; message: string; source: string }[];
}

interface VisibleOutput {
  id: string;
  sessionId: string;
  projectId: string | null;
  title: string;
  type: string;
  summary: string;
  preview: string;
  status: string;
  assignedAgent: string;
  visualPreview?: OutputVisualPreview | null;
  updatedAt: string;
}

interface CompanyGroup {
  id: string;
  name: string;
  type?: string;
  status: string;
  avatar: string;
  projectIds: string[];
}

interface ApprovalCardData {
  item: ApprovalItem;
  preview: ApprovalPreview | null;
  visualPreview: OutputVisualPreview | null;
  canApprove: boolean;
}

interface FinalResult {
  title: string;
  brandName: string;
  tagline: string;
  summary: string;
  status: "preparing" | "ready" | "accepted";
  outputId?: string;
  approvalId?: string;
  sessionId?: string;
  visualPreview: OutputVisualPreview | null;
  colors: string[];
  typography: string;
  keywords: string[];
}

const LOGO_OUTPUT_TYPES = new Set(["logo_direction", "style_direction", "color_palette", "typography", "moodboard", "concept_card", "creative_brief"]);
const HIDDEN_MESSAGE_PATTERNS = [
  /Mission Room/gi,
  /autopilot/gi,
  /sessionId/gi,
  /projectId/gi,
  /workspaceId/gi,
  /Hypothèses[\s\S]*/gi,
  /\d+\s+étapes exécutées[\s\S]*/gi,
  /\d+\s+etapes executees[\s\S]*/gi,
  /Mission créée[\s\S]*/gi,
  /Projet créé[\s\S]*/gi,
];

function sanitizeMessage(text: string, role: "user" | "ceo") {
  if (role === "user") return text;
  let cleaned = text;
  for (const pattern of HIDDEN_MESSAGE_PATTERNS) cleaned = cleaned.replace(pattern, "");
  cleaned = cleaned.replace(/\n{2,}/g, "\n").trim();
  if (!cleaned || cleaned.length > 180) return "Parfait. Je prépare un premier concept clair et visuel.";
  return cleaned;
}

function isLogoOutput(output: VisibleOutput) {
  const text = `${output.title} ${output.type} ${output.summary} ${output.preview}`.toLowerCase();
  return LOGO_OUTPUT_TYPES.has(output.type) || /logo|brand|palette|typograph|creative|direction/.test(text);
}

function brandFrom(company?: CompanyGroup, output?: VisibleOutput, approval?: ApprovalCardData) {
  const title = output?.visualPreview?.mockup?.title ?? approval?.visualPreview?.mockup?.title;
  if (company?.name) return company.name;
  if (title && !/logo concept|approval preview|simple visual/i.test(title)) return title;
  return "Studio Lumière";
}

function buildFallbackVisual(brandName: string): OutputVisualPreview {
  return {
    kind: "brand_card",
    logoText: brandName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SL",
    tagline: "Capture the light",
    colors: ["#101827", "#6AA8FF", "#F7F3EA", "#6FD09B"],
    typography: { heading: "Inter SemiBold", body: "Inter Regular" },
    mockup: {
      title: brandName,
      subtitle: "Photo brand",
      blocks: ["Premium", "Lumineux", "Moderne"],
    },
  };
}

function buildFinalResult(companies: CompanyGroup[], projects: CeoProject[], sessions: AutopilotSession[], outputs: VisibleOutput[], approvals: ApprovalCardData[]): FinalResult | null {
  const approval = approvals.find((item) => item.visualPreview || item.preview?.outputs?.length) ?? approvals[0] ?? null;
  const logoOutput = outputs.find((output) => output.id === approval?.item.id.replace(/^output-/, "")) ?? outputs.find(isLogoOutput) ?? outputs[0] ?? null;
  const sessionId = approval?.item.sessionId ?? logoOutput?.sessionId ?? projects.find((project) => project.sessionId)?.sessionId ?? sessions[0]?.sessionId;
  const project = projects.find((item) => item.sessionId === sessionId) ?? projects[0];
  const company = companies.find((item) => item.projectIds.includes(project?.id ?? "")) ?? companies[0];
  const brandName = brandFrom(company, logoOutput ?? undefined, approval ?? undefined);
  const visualPreview = approval?.visualPreview ?? logoOutput?.visualPreview ?? buildFallbackVisual(brandName);
  const colors = visualPreview.colors?.length ? visualPreview.colors.slice(0, 4) : ["#101827", "#6AA8FF", "#F7F3EA", "#6FD09B"];
  const status = approval ? "ready" : logoOutput?.status === "approved" ? "accepted" : logoOutput || sessions.length > 0 ? "preparing" : "preparing";

  if (!logoOutput && !approval && sessions.length === 0 && projects.length === 0) return null;

  return {
    title: `Logo Concept — ${brandName}`,
    brandName,
    tagline: visualPreview.tagline ?? "Capture the light",
    summary: logoOutput?.summary || approval?.item.summary || "Un concept premium et lumineux pour une marque photo moderne.",
    status,
    outputId: logoOutput?.id,
    approvalId: approval?.item.id,
    sessionId,
    visualPreview,
    colors,
    typography: visualPreview.typography?.heading ?? "Inter SemiBold",
    keywords: (visualPreview.mockup?.blocks?.length ? visualPreview.mockup.blocks : ["Premium", "Lumineux", "Moderne"]).slice(0, 3),
  };
}

function activitySummary(sessions: AutopilotSession[], outputs: VisibleOutput[]) {
  if (outputs.length > 0) return "L'équipe AI a préparé le concept.";
  if (sessions.some((session) => session.status === "running")) return "Création du concept en cours...";
  if (sessions.some((session) => session.status === "waiting_approval")) return "Le concept est prêt.";
  return "Prêt à créer le premier concept.";
}

export default function CeoSimplePage() {
  const [messages, setMessages] = useState<CeoMessage[]>([]);
  const [projects, setProjects] = useState<CeoProject[]>([]);
  const [sessions, setSessions] = useState<AutopilotSession[]>([]);
  const [outputs, setOutputs] = useState<VisibleOutput[]>([]);
  const [approvals, setApprovals] = useState<ApprovalCardData[]>([]);
  const [companies, setCompanies] = useState<CompanyGroup[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeText, setChangeText] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/ceo/simple-agency", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      const view = payload.view ?? {};
      setMessages(view.messages ?? []);
      setProjects(view.projects ?? []);
      setSessions(view.sessions ?? []);
      setOutputs(view.outputs ?? []);
      setApprovals(view.approvals ?? []);
      setCompanies(view.companies ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, outputs.length, approvals.length]);

  const finalResult = useMemo(() => buildFinalResult(companies, projects, sessions, outputs, approvals), [companies, projects, sessions, outputs, approvals]);
  const visibleMessages = useMemo(() => messages.slice(-4).map((message) => ({ ...message, text: sanitizeMessage(message.text, message.role) })).filter((message) => message.text), [messages]);
  const simpleActivity = activitySummary(sessions, outputs);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    const localUser: CeoMessage = { id: `local-user-${Date.now()}`, role: "user", text, timestamp: new Date().toISOString() };
    const localCeo: CeoMessage = {
      id: `local-ceo-${Date.now()}`,
      role: "ceo",
      text: /logo/i.test(text) ? "Parfait. Je prépare un premier concept de logo pour une compagnie de photo." : "Parfait. Je prépare une première version claire.",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, localUser, localCeo]);
    try {
      await fetch("/api/ceo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      await load();
    } finally {
      setSending(false);
    }
  };

  const accept = async () => {
    if (!finalResult) return;
    const target = finalResult.approvalId ?? finalResult.outputId;
    if (!target) return;
    setActionBusy("accept");
    try {
      if (finalResult.approvalId) {
        await fetch(`/api/approvals/${finalResult.approvalId}/approve`, { method: "POST" });
      } else {
        await fetch("/api/visible-outputs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outputId: finalResult.outputId, status: "approved" }),
        });
      }
      await load();
    } finally {
      setActionBusy(null);
    }
  };

  const requestChange = async (reason: string) => {
    if (!finalResult?.approvalId) return;
    setActionBusy("change");
    try {
      await fetch(`/api/approvals/${finalResult.approvalId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      setChangeOpen(false);
      setChangeText("");
      await load();
    } finally {
      setActionBusy(null);
    }
  };

  const remake = async () => {
    if (finalResult?.approvalId) {
      await requestChange("Refaire une version plus forte et plus simple.");
      return;
    }
    setMessages((prev) => [...prev, { id: `remake-${Date.now()}`, role: "ceo", text: "Je prépare une nouvelle version.", timestamp: new Date().toISOString() }]);
  };

  return (
    <main className="ceo-simple-page">
      <style>{styles}</style>
      <section className="ceo-simple-shell">
        <header className="ceo-simple-header">
          <div>
            <div className="ceo-eyebrow"><Sparkles size={14} /> CEO AI</div>
            <h1>Demande, reçois, décide.</h1>
            <p>Le CEO transforme ta demande en résultat final. Les détails techniques restent en mode expert.</p>
          </div>
          <Link className="ceo-expert-link" href="/ceo/expert">Mode expert</Link>
        </header>

        <div className="ceo-chat">
          {loading && <div className="ceo-status">Connexion au CEO...</div>}
          {!loading && visibleMessages.length === 0 && (
            <div className="ceo-empty">
              <Moon size={22} />
              <strong>Prêt pour une nouvelle demande.</strong>
              <span>Exemple: Je veux un logo pour une compagnie de photo</span>
            </div>
          )}
          {visibleMessages.map((message) => (
            <motion.div key={message.id} className={`ceo-message ${message.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <span>{message.role === "user" ? "Vous" : "CEO AI"}</span>
              <p>{message.text}</p>
            </motion.div>
          ))}
          {(sessions.length > 0 || outputs.length > 0) && <div className="ceo-status">{simpleActivity}</div>}
          <div ref={endRef} />
        </div>

        <AnimatePresence>
          {finalResult && (
            <motion.section className="final-result-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
              <div className="final-result-head">
                <div>
                  <span>{finalResult.status === "ready" ? "Version prête" : finalResult.status === "accepted" ? "Version acceptée" : "Préparation"}</span>
                  <h2>{finalResult.title}</h2>
                </div>
                <div className={`final-result-pill ${finalResult.status}`}>{finalResult.status === "ready" ? "Prêt" : finalResult.status === "accepted" ? "Accepté" : "En cours"}</div>
              </div>

              <VisualOutputPreview visualPreview={finalResult.visualPreview} title={finalResult.title} summary={finalResult.summary} />

              <div className="brand-board-details">
                <div>
                  <span>Palette</span>
                  <div className="swatches">
                    {finalResult.colors.map((color) => <i key={color} style={{ background: color }} title={color} />)}
                  </div>
                </div>
                <div>
                  <span>Typographie</span>
                  <strong>{finalResult.typography}</strong>
                </div>
                <div>
                  <span>Direction</span>
                  <div className="keyword-row">{finalResult.keywords.map((keyword) => <b key={keyword}>{keyword}</b>)}</div>
                </div>
              </div>

              <p className="result-summary">{finalResult.summary}</p>

              <div className="final-actions">
                <button className="accept" onClick={() => void accept()} disabled={actionBusy !== null || (!finalResult.approvalId && !finalResult.outputId)}>
                  <CheckCircle2 size={16} /> Accepter cette version
                </button>
                <button onClick={() => setChangeOpen((value) => !value)} disabled={actionBusy !== null || !finalResult.approvalId}>
                  <Wand2 size={16} /> Modifier
                </button>
                <button onClick={() => void remake()} disabled={actionBusy !== null}>
                  <RotateCcw size={16} /> Refaire
                </button>
              </div>

              {changeOpen && (
                <form className="change-inline" onSubmit={(event) => {
                  event.preventDefault();
                  void requestChange(changeText.trim() || "Je veux une version plus luxe et minimaliste.");
                }}>
                  <textarea value={changeText} onChange={(event) => setChangeText(event.target.value)} placeholder="Ex: Je veux quelque chose de plus luxe et minimaliste" />
                  <button disabled={actionBusy !== null}>Envoyer la modification</button>
                </form>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        <details className="activity-details" open={showActivity} onToggle={(event) => setShowActivity(event.currentTarget.open)}>
          <summary>Voir activité <ChevronDown size={14} /></summary>
          <div>
            <p>{simpleActivity}</p>
            {sessions[0]?.tasks?.filter((task) => task.status === "completed" || task.status === "running").slice(0, 2).map((task) => (
              <span key={task.id}>{task.status === "completed" ? "Terminé" : "En cours"} · {task.title}</span>
            ))}
          </div>
        </details>

        <form className="ceo-composer" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Je veux un logo pour une compagnie de photo" />
          <button disabled={sending || !input.trim()}><Send size={17} /></button>
        </form>
      </section>
    </main>
  );
}

const styles = `
.ceo-simple-page {
  width: 100%;
  min-width: 0;
  min-height: calc(100vh - 62px);
  padding: 34px 24px 72px;
  color: var(--text);
}
.ceo-simple-shell {
  width: min(100%, 1040px);
  margin: 0 auto;
  display: grid;
  gap: 18px;
}
.ceo-simple-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}
.ceo-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.ceo-simple-header h1 {
  margin: 8px 0 6px;
  color: var(--text);
  font-size: clamp(31px, 4vw, 48px);
  line-height: 1.02;
  letter-spacing: -0.04em;
}
.ceo-simple-header p {
  max-width: 620px;
  color: var(--text-2);
  font-size: 15px;
}
.ceo-expert-link {
  flex: 0 0 auto;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 850;
}
.ceo-chat,
.final-result-card,
.activity-details,
.ceo-composer {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  border: 1px solid rgba(222,216,204,0.88);
  border-radius: 22px;
  background: rgba(255,255,255,0.82);
  box-shadow: var(--shadow);
}
.ceo-chat {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
}
.ceo-empty {
  margin: auto;
  display: grid;
  justify-items: center;
  gap: 8px;
  text-align: center;
  color: var(--text-2);
}
.ceo-empty strong {
  color: var(--text);
  font-size: 18px;
}
.ceo-empty span {
  color: var(--text-3);
  font-size: 13px;
}
.ceo-message {
  max-width: min(720px, 88%);
  display: grid;
  gap: 5px;
}
.ceo-message span {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
.ceo-message p {
  margin: 0;
  padding: 13px 15px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.ceo-message.user {
  justify-self: end;
  align-self: flex-end;
}
.ceo-message.user span {
  text-align: right;
}
.ceo-message.user p {
  background: linear-gradient(135deg, #2f6fed, #1f5eff);
  border-color: transparent;
  color: white;
}
.ceo-status {
  align-self: center;
  padding: 8px 12px;
  border: 1px solid rgba(47,111,237,0.18);
  border-radius: 999px;
  background: rgba(47,111,237,0.08);
  color: var(--accent);
  font-size: 12px;
  font-weight: 850;
}
.final-result-card {
  display: grid;
  gap: 18px;
  padding: clamp(16px, 3vw, 26px);
}
.final-result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}
.final-result-head span,
.brand-board-details span {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.final-result-head h2 {
  margin: 4px 0 0;
  color: var(--text);
  font-size: clamp(23px, 3vw, 34px);
  letter-spacing: -0.035em;
  line-height: 1.08;
}
.final-result-pill {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 900;
}
.final-result-pill.ready {
  border-color: rgba(183,121,31,0.28);
  background: rgba(183,121,31,0.12);
  color: var(--yellow);
}
.final-result-pill.accepted {
  border-color: rgba(47,143,97,0.28);
  background: rgba(47,143,97,0.12);
  color: var(--green);
}
.brand-board-details {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 0.8fr) minmax(0, 1fr);
  gap: 14px;
}
.brand-board-details > div {
  min-width: 0;
  display: grid;
  gap: 9px;
  padding: 13px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-2);
}
.swatches,
.keyword-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.swatches i {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(15,23,42,0.14);
}
.brand-board-details strong {
  color: var(--text);
  font-size: 17px;
}
.keyword-row b {
  border-radius: 999px;
  padding: 7px 9px;
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 11px;
}
.result-summary {
  margin: 0;
  max-width: 760px;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.6;
}
.final-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.final-actions button,
.change-inline button,
.ceo-composer button {
  min-height: 40px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}
.final-actions .accept {
  border-color: #2f8f61;
  background: #2f8f61;
  color: white;
}
.final-actions button:disabled,
.change-inline button:disabled,
.ceo-composer button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.change-inline {
  display: grid;
  gap: 9px;
}
.change-inline textarea {
  min-height: 94px;
  resize: vertical;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-2);
  color: var(--text);
  padding: 12px;
  font: inherit;
}
.change-inline button {
  justify-self: start;
}
.activity-details {
  padding: 12px 14px;
}
.activity-details summary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}
.activity-details div {
  display: grid;
  gap: 8px;
  padding-top: 12px;
  color: var(--text-2);
  font-size: 13px;
}
.activity-details p {
  margin: 0;
}
.activity-details span {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-2);
}
.ceo-composer {
  position: sticky;
  bottom: 18px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding: 10px;
}
.ceo-composer input {
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-2);
  color: var(--text);
  padding: 0 16px;
  font: inherit;
  outline: none;
}
.ceo-composer button {
  width: 44px;
  padding: 0;
  border-color: #2f6fed;
  background: #2f6fed;
  color: white;
}
html[data-theme="dark"] .ceo-chat,
html[data-theme="dark"] .final-result-card,
html[data-theme="dark"] .activity-details,
html[data-theme="dark"] .ceo-composer {
  background: rgba(26,35,48,0.86);
  border-color: var(--border);
}
html[data-theme="dark"] .ceo-message p,
html[data-theme="dark"] .brand-board-details > div,
html[data-theme="dark"] .activity-details span,
html[data-theme="dark"] .final-actions button,
html[data-theme="dark"] .ceo-composer input,
html[data-theme="dark"] .change-inline textarea {
  background: rgba(16,23,34,0.72);
  border-color: var(--border);
}
@media (max-width: 1024px) {
  .ceo-simple-page { padding: 28px 18px 64px; }
}
@media (max-width: 720px) {
  .ceo-simple-page { padding: 22px 12px 48px; }
  .ceo-simple-header { display: grid; }
  .ceo-expert-link { justify-self: start; }
  .brand-board-details { grid-template-columns: 1fr; }
  .ceo-message { max-width: 96%; }
}
`;
