"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Files, FolderOpen, Moon, RotateCcw, Send, Sparkles, Wand2 } from "lucide-react";
import type { ApprovalItem, ApprovalPreview } from "@/lib/approvalPreview";
import type { OutputVisualPreview } from "@/lib/visibleOutputs";
import { generateBrandBrief, generateLogoConcepts, type BrandBrief, type LogoConcept } from "@/lib/brandGeneration";

interface CeoMessage {
  id: string;
  role: "user" | "ceo";
  text: string;
  sessionId?: string;
  actions?: CeoAction[];
  timestamp: string;
}

interface CeoAction {
  type: string;
  label: string;
  targetId?: string;
  href?: string;
  artifactPaths?: string[];
  summary?: string;
  kind?: string;
  limitations?: string[];
  launchInstructions?: string[];
  qualityStatus?: string;
  qualityScore?: number;
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
  brief: BrandBrief;
  concepts: LogoConcept[];
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

function latestUserRequest(messages: CeoMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.text ?? "";
}

function isGenericBrandName(name?: string | null) {
  return !name || /nouvelle marque ai|nouvelle entreprise ai|logo concept|approval preview|simple visual/i.test(name);
}

function buildBriefForResult(requestText: string, company?: CompanyGroup, project?: CeoProject, output?: VisibleOutput, approval?: ApprovalCardData) {
  const directBrief = generateBrandBrief(requestText || `${project?.name ?? ""} ${output?.summary ?? ""} ${approval?.item.summary ?? ""}`);
  if (directBrief.explicitBrandName) return directBrief;

  const inferredBrand = brandFrom(company, output, approval);
  if (!isGenericBrandName(inferredBrand)) {
    return generateBrandBrief(`Je veux un logo pour une compagnie qui s'appelle ${inferredBrand}. ${requestText} ${project?.name ?? ""}`);
  }
  return directBrief;
}

function buildFinalResult(messages: CeoMessage[], companies: CompanyGroup[], projects: CeoProject[], sessions: AutopilotSession[], outputs: VisibleOutput[], approvals: ApprovalCardData[]): FinalResult | null {
  const approval = approvals.find((item) => item.visualPreview || item.preview?.outputs?.length) ?? approvals[0] ?? null;
  const logoOutput = outputs.find((output) => output.id === approval?.item.id.replace(/^output-/, "")) ?? outputs.find(isLogoOutput) ?? outputs[0] ?? null;
  const sessionId = approval?.item.sessionId ?? logoOutput?.sessionId ?? projects.find((project) => project.sessionId)?.sessionId ?? sessions[0]?.sessionId;
  const project = projects.find((item) => item.sessionId === sessionId) ?? projects[0];
  const company = companies.find((item) => item.projectIds.includes(project?.id ?? "")) ?? companies[0];
  const brief = buildBriefForResult(latestUserRequest(messages), company, project, logoOutput ?? undefined, approval ?? undefined);
  const brandName = brief.brandName;
  const concepts = generateLogoConcepts(brief);
  const status = approval ? "ready" : logoOutput?.status === "approved" ? "accepted" : logoOutput || sessions.length > 0 ? "preparing" : "preparing";

  if (!logoOutput && !approval && sessions.length === 0 && projects.length === 0) return null;

  return {
    title: `Logo Concept — ${brandName}`,
    brandName,
    tagline: brief.taglineOptions[0],
    summary: logoOutput?.summary || approval?.item.summary || `Un concept premium et cohérent pour ${brandName}, adapté au secteur ${brief.industry}.`,
    status,
    outputId: logoOutput?.id,
    approvalId: approval?.item.id,
    sessionId,
    brief,
    concepts,
  };
}

function LogoPrototypeMark({ concept }: { concept: LogoConcept }) {
  if (concept.visualStyle === "vertical-signal") {
    return (
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <rect x="24" y="16" width="72" height="88" rx="22" fill="currentColor" opacity="0.1" />
        <path d="M60 26v68" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
        <path d="M44 42 60 26l16 16M44 78l16 16 16-16" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="60" cy="60" r="10" fill="currentColor" />
      </svg>
    );
  }
  if (concept.visualStyle === "safety-reliability") {
    return (
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <path d="M60 14 96 28v30c0 24-13 41-36 51-23-10-36-27-36-51V28l36-14Z" fill="currentColor" opacity="0.12" />
        <path d="M60 22 88 33v25c0 18-9 32-28 41-19-9-28-23-28-41V33l28-11Z" fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
        <path d="m43 62 12 12 25-29" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <rect x="22" y="70" width="76" height="26" rx="8" fill="currentColor" opacity="0.12" />
      <path d="M30 82h60M42 82V48l18-18 18 18v34" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 58h24M48 70h24" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M82 28 94 16M88 36l14-2" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function LogoConceptCard({ concept, onAccept, onModify, onRemake, disabled }: {
  concept: LogoConcept;
  onAccept: () => void;
  onModify: () => void;
  onRemake: () => void;
  disabled: boolean;
}) {
  const accent = concept.palette[1]?.hex ?? concept.palette[0]?.hex ?? "#2F6FED";
  return (
    <article className="logo-concept-card">
      <div className="concept-preview" style={{ color: accent }}>
        <div className="concept-letter">{concept.label}</div>
        <LogoPrototypeMark concept={concept} />
        <div>
          <strong>{concept.brandName}</strong>
          <span>{concept.tagline}</span>
        </div>
      </div>
      <div className="concept-body">
        <div className="concept-title-row">
          <h3>{concept.label}. {concept.title}</h3>
          {concept.recommended && <span>Recommandé</span>}
        </div>
        <p className="prototype-notice">{concept.prototypeNotice}</p>
        <p>{concept.rationale}</p>
        <div className="concept-swatches">
          {concept.palette.slice(0, 4).map((color) => <i key={`${concept.id}-${color.hex}`} style={{ background: color.hex }} title={`${color.name}: ${color.justification}`} />)}
        </div>
        <div className="concept-keywords">{concept.keywords.map((keyword) => <b key={keyword}>{keyword}</b>)}</div>
      </div>
      <div className="concept-actions">
        <button className="accept" onClick={onAccept} disabled={disabled}><CheckCircle2 size={15} /> Accepter</button>
        <button onClick={onModify} disabled={disabled}><Wand2 size={15} /> Modifier</button>
        <button onClick={onRemake} disabled={disabled}><RotateCcw size={15} /> Refaire</button>
      </div>
    </article>
  );
}

function activitySummary(sessions: AutopilotSession[], outputs: VisibleOutput[]) {
  if (outputs.length > 0) return "L'équipe AI a préparé le concept.";
  if (sessions.some((session) => session.status === "running")) return "Création du concept en cours...";
  if (sessions.some((session) => session.status === "waiting_approval")) return "Le concept est prêt.";
  return "Prêt à créer le premier concept.";
}

function latestProductAction(messages: CeoMessage[]): CeoAction | null {
  for (const message of [...messages].reverse()) {
    const action = message.actions?.find((item) => item.type === "product_artifacts_created" && item.artifactPaths?.length);
    if (action) return action;
  }
  return null;
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
    try {
      for (const storage of [window.localStorage, window.sessionStorage]) {
        for (let index = storage.length - 1; index >= 0; index -= 1) {
          const key = storage.key(index);
          if (key && /ai-company|company-os|ceo-simple|simple-agency/i.test(key) && key !== "ai-company-os-theme" && key !== "ai-company-os-nav-mode") {
            storage.removeItem(key);
          }
        }
      }
    } catch {
      // Browser storage is optional in test and server-like runtimes.
    }
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, outputs.length, approvals.length]);

  const finalResult = useMemo(() => buildFinalResult(messages, companies, projects, sessions, outputs, approvals), [messages, companies, projects, sessions, outputs, approvals]);
  const productAction = useMemo(() => latestProductAction(messages), [messages]);
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
      text: /logo/i.test(text)
        ? `Parfait. Je prépare un premier concept de logo pour ${generateBrandBrief(text).brandName}.`
        : "Parfait. Je prépare une première version claire.",
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
      <section className="ceo-simple-shell command-surface" aria-label="Command Surface">
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

              <div className="brand-brief-panel">
                <div>
                  <span>Secteur</span>
                  <strong>{finalResult.brief.industry}</strong>
                </div>
                <div>
                  <span>Audience</span>
                  <p>{finalResult.brief.targetAudience}</p>
                </div>
                <div>
                  <span>Direction créative</span>
                  <p>{finalResult.brief.creativeDirection}</p>
                </div>
              </div>

              <p className="result-summary">{finalResult.summary}</p>

              <div className="logo-concepts">
                {finalResult.concepts.map((concept) => (
                  <LogoConceptCard
                    key={concept.id}
                    concept={concept}
                    disabled={actionBusy !== null || (!finalResult.approvalId && !finalResult.outputId)}
                    onAccept={() => void accept()}
                    onModify={() => setChangeOpen(true)}
                    onRemake={() => void remake()}
                  />
                ))}
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

        {productAction && (
          <section className="product-artifact-card" aria-label="Projet créé">
            <div className="product-artifact-head">
              <span><FolderOpen size={15} /> Projet créé</span>
              <strong>{productAction.label.replace(/^Projet créé:\s*/, "")}</strong>
              {productAction.qualityStatus && <em className="product-quality-pill">{productAction.qualityStatus}</em>}
              <p>{productAction.summary ?? "Artifacts produit créés localement."}</p>
            </div>
            <details>
              <summary><Files size={15} /> Voir les fichiers</summary>
              <ul>
                {productAction.artifactPaths?.slice(0, 10).map((artifact) => <li key={artifact}>{artifact}</li>)}
              </ul>
            </details>
            {productAction.launchInstructions?.length ? (
              <div className="product-launch-box">
                <strong>Comment lancer</strong>
                <code>{productAction.launchInstructions.join(" && ")}</code>
              </div>
            ) : null}
            {productAction.limitations?.length ? (
              <div className="product-limitations">
                <strong>Limites actuelles</strong>
                <span>{productAction.limitations.slice(0, 2).join(" ")}</span>
              </div>
            ) : null}
            <div className="product-artifact-actions">
              <button type="button" onClick={() => setShowActivity(true)}>Ouvrir le workspace</button>
              <button type="button" onClick={() => setShowActivity(true)}>Voir les fichiers</button>
              <button type="button" onClick={() => document.querySelector<HTMLInputElement>(".ceo-composer input")?.focus()}>Continuer / Modifier</button>
            </div>
          </section>
        )}

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
.product-artifact-card,
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
.product-artifact-card {
  display: grid;
  gap: 14px;
  padding: 20px;
}
.product-artifact-head {
  display: grid;
  gap: 7px;
}
.product-artifact-head span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}
.product-artifact-head strong {
  color: var(--text);
  font-size: 22px;
  letter-spacing: -0.03em;
}
.product-artifact-head p {
  margin: 0;
  color: var(--text-2);
  font-size: 14px;
}
.product-quality-pill {
  width: max-content;
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(47,143,97,0.22);
  border-radius: 999px;
  background: rgba(47,143,97,0.1);
  color: var(--green);
  padding: 5px 9px;
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}
.product-artifact-card details {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-soft);
  padding: 12px;
}
.product-artifact-card summary {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-size: 13px;
  font-weight: 850;
}
.product-artifact-card ul {
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--text-2);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.7;
}
.product-launch-box,
.product-limitations {
  display: grid;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(255,255,255,0.5);
  padding: 12px;
}
.product-launch-box strong,
.product-limitations strong {
  color: var(--text);
  font-size: 12px;
  font-weight: 900;
}
.product-launch-box code {
  width: 100%;
  overflow-x: auto;
  color: var(--text-2);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
.product-limitations span {
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.5;
}
.product-artifact-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.product-artifact-actions button {
  min-height: 36px;
  padding: 0 13px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-weight: 850;
  cursor: pointer;
}
.product-artifact-actions button:first-child {
  border-color: transparent;
  background: var(--accent);
  color: white;
}
.final-result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}
.final-result-head span,
.brand-brief-panel span {
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
.brand-brief-panel {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 14px;
}
.brand-brief-panel > div {
  min-width: 0;
  display: grid;
  gap: 9px;
  padding: 13px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-2);
}
.brand-brief-panel strong {
  color: var(--text);
  font-size: 16px;
  line-height: 1.35;
}
.brand-brief-panel p {
  margin: 0;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.5;
}
.concept-swatches,
.concept-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.concept-swatches i {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(15,23,42,0.14);
}
.concept-keywords b {
  border-radius: 999px;
  padding: 7px 9px;
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 11px;
}
.logo-concepts {
  display: grid;
  gap: 14px;
}
.logo-concept-card {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(240px, 0.86fr) minmax(0, 1fr);
  gap: 16px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255,255,255,0.78), rgba(248,246,241,0.72));
}
.concept-preview {
  min-height: 260px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 13px;
  border-radius: 18px;
  border: 1px solid rgba(15,23,42,0.08);
  background:
    radial-gradient(circle at top left, color-mix(in srgb, currentColor 17%, transparent), transparent 32%),
    linear-gradient(145deg, #fbfaf7, #ebe6dc);
  color: #2f6fed;
  text-align: center;
}
.concept-letter {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: currentColor;
  color: white;
  font-size: 12px;
  font-weight: 950;
}
.concept-preview svg {
  width: min(46%, 150px);
  height: auto;
}
.concept-preview strong {
  display: block;
  color: var(--text);
  font-size: clamp(32px, 6vw, 58px);
  line-height: 0.98;
  letter-spacing: 0.02em;
}
.concept-preview span {
  display: block;
  margin-top: 8px;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 800;
}
.concept-body {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 11px;
}
.concept-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.concept-title-row h3 {
  margin: 0;
  color: var(--text);
  font-size: 18px;
  line-height: 1.2;
}
.concept-title-row span,
.prototype-notice {
  border-radius: 999px;
  padding: 6px 8px;
  background: rgba(47,143,97,0.11);
  color: var(--green);
  font-size: 11px;
  font-weight: 900;
}
.prototype-notice {
  justify-self: start;
  margin: 0;
  background: rgba(183,121,31,0.12);
  color: var(--yellow);
}
.concept-body p:not(.prototype-notice) {
  margin: 0;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.55;
}
.concept-actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}
.concept-actions button {
  min-height: 38px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  padding: 0 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}
.concept-actions .accept {
  border-color: #2f8f61;
  background: #2f8f61;
  color: white;
}
.concept-actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.result-summary {
  margin: 0;
  max-width: 760px;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.6;
}
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
html[data-theme="dark"] .brand-brief-panel > div,
html[data-theme="dark"] .logo-concept-card,
html[data-theme="dark"] .activity-details span,
html[data-theme="dark"] .concept-actions button,
html[data-theme="dark"] .ceo-composer input,
html[data-theme="dark"] .change-inline textarea {
  background: rgba(16,23,34,0.72);
  border-color: var(--border);
}
html[data-theme="dark"] .concept-preview {
  background:
    radial-gradient(circle at top left, color-mix(in srgb, currentColor 18%, transparent), transparent 34%),
    linear-gradient(145deg, #17202a, #101722);
  border-color: var(--border);
}
@media (max-width: 1024px) {
  .ceo-simple-page { padding: 28px 18px 64px; }
}
@media (max-width: 720px) {
  .ceo-simple-page { padding: 22px 12px 48px; }
  .ceo-simple-header { display: grid; }
  .ceo-expert-link { justify-self: start; }
  .brand-brief-panel { grid-template-columns: 1fr; }
  .logo-concept-card { grid-template-columns: 1fr; }
  .ceo-message { max-width: 96%; }
}
`;
