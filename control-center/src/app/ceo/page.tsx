"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Files, FolderOpen, Moon, Play, RotateCcw, Send, Sparkles, Wand2 } from "lucide-react";
import type { ApprovalItem, ApprovalPreview } from "@/lib/approvalPreview";
import type { OutputVisualPreview } from "@/lib/visibleOutputs";
import { generateBrandBrief, generateLogoConcepts, type BrandBrief, type LogoConcept } from "@/lib/brand-builder";
import { cleanupCompanyOsClientStorage } from "@/lib/clientStorageReset";

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
  /Action terminée/gi,
  /Action terminee/gi,
  /sessionId/gi,
  /projectId/gi,
  /workspaceId/gi,
  /Hypothèses[\s\S]*/gi,
  /\d+\s+étapes exécutées[\s\S]*/gi,
  /\d+\s+etapes executees[\s\S]*/gi,
  /Mission créée[\s\S]*/gi,
  /Projet créé[\s\S]*/gi,
  /created[\s\S]*/gi,
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
        <div className="concept-detail-block">
          <span>Typographie</span>
          <p>{concept.typography}</p>
        </div>
        <div className="concept-detail-block">
          <span>Palette</span>
          <ul>
            {concept.palette.slice(0, 4).map((color) => (
              <li key={`${concept.id}-${color.hex}-detail`}>
                <i style={{ background: color.hex }} />
                <strong>{color.name}</strong>
                <em>{color.justification}</em>
              </li>
            ))}
          </ul>
        </div>
        <div className="concept-swatches">
          {concept.palette.slice(0, 4).map((color) => <i key={`${concept.id}-${color.hex}`} style={{ background: color.hex }} title={`${color.name}: ${color.justification}`} />)}
        </div>
        <div className="concept-keywords">{concept.keywords.map((keyword) => <b key={keyword}>{keyword}</b>)}</div>
      </div>
      <div className="concept-actions">
        <button className="accept" onClick={onAccept} disabled={disabled}><CheckCircle2 size={15} /> Accepter cette direction</button>
        <button onClick={onModify} disabled={disabled}><Wand2 size={15} /> Modifier</button>
        <button onClick={onRemake} disabled={disabled}><RotateCcw size={15} /> Refaire</button>
      </div>
    </article>
  );
}

function activitySummary(sessions: AutopilotSession[], outputs: VisibleOutput[], productAction?: CeoAction | null) {
  if (productAction) return "Projet produit généré avec fichiers de départ.";
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

function productTypeLabel(kind?: string) {
  if (kind === "saas") return "SaaS";
  if (kind === "website") return "Site web";
  if (kind === "app") return "App";
  return "Produit";
}

function artifactName(path: string) {
  return path.replace(/^generated-products\/[^/]+\//, "");
}

function hasProductIntent(text: string) {
  return /\bsaas\b|site web|site internet|website|\bapp\b|application/i.test(text);
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
      cleanupCompanyOsClientStorage();
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
  const simpleActivity = activitySummary(sessions, outputs, productAction);

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
        ? `Parfait. Je prépare un premier concept de marque pour ${generateBrandBrief(text).brandName}.`
        : hasProductIntent(text)
          ? "Parfait. Je prépare une première version produit avec structure, pages, dashboard et fichiers de départ."
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
      <section className="ceo-simple-shell command-surface" aria-label="Command Surface">
        <header className="ceo-simple-header">
          <div>
            <div className="ceo-eyebrow"><Sparkles size={14} /> CEO AI · Command Surface</div>
            <h1>Décris ce que tu veux construire.</h1>
            <p>Le CEO transforme ta demande en premier résultat concret: concept, fichiers, prototype ou prochaine version.</p>
          </div>
          <Link className="ceo-expert-link" href="/ceo/expert">Mode expert</Link>
        </header>

        <div className="ceo-chat ceo-command-surface">
          {loading && <div className="ceo-status">Connexion au CEO...</div>}
          {!loading && visibleMessages.length === 0 && (
            <div className="ceo-empty">
              <Moon size={22} />
              <strong>Commence par une demande naturelle.</strong>
              <span>Exemple: Je veux un SaaS pour gérer les rendez-vous d&apos;une clinique</span>
            </div>
          )}
          {visibleMessages.map((message) => (
            <motion.div key={message.id} className={`ceo-message ${message.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <span>{message.role === "user" ? "Vous" : "CEO AI"}</span>
              <p>{message.text}</p>
            </motion.div>
          ))}
          {(sessions.length > 0 || outputs.length > 0 || productAction) && <div className="ceo-status">{simpleActivity}</div>}
          <div ref={endRef} />
        </div>

        {productAction && (
          <section className="product-artifact-card current-result-card" aria-label="Résultat courant">
            <div className="product-artifact-head">
              <span><FolderOpen size={15} /> Résultat courant</span>
              <strong>{productAction.label.replace(/^Projet créé:\s*/, "")}</strong>
              <div className="product-meta-row">
                <em>{productTypeLabel(productAction.kind)}</em>
                {productAction.qualityStatus && <em className="product-quality-pill">{productAction.qualityStatus}</em>}
                <em>{Math.min(productAction.artifactPaths?.length ?? 0, 100)} artifacts</em>
              </div>
              <p>{productAction.summary ?? "Première version produit générée avec fichiers locaux et structure de départ."}</p>
            </div>

            <div className="product-progress">
              <span>Progression</span>
              <div><i style={{ width: `${productAction.qualityStatus === "Prêt" ? 100 : 72}%` }} /></div>
              <strong>{productAction.qualityStatus === "Prêt" ? "Prêt à explorer" : "À améliorer"}</strong>
            </div>

            <div className="artifact-preview-grid">
              {(productAction.artifactPaths ?? []).slice(0, 6).map((artifact) => (
                <article key={artifact}>
                  <Files size={14} />
                  <span>{artifactName(artifact)}</span>
                </article>
              ))}
            </div>

            <div className="next-actions-card">
              <strong>Prochaines actions</strong>
              <span>Ouvre le workspace, inspecte les fichiers, puis demande au CEO de continuer ou modifier le produit.</span>
            </div>

            <details>
              <summary><Files size={15} /> Voir les fichiers</summary>
              <ul>
                {productAction.artifactPaths?.map((artifact) => <li key={artifact}>{artifact}</li>)}
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
              <button type="button"><CheckCircle2 size={15} /> Accepter</button>
              <button type="button" onClick={() => document.querySelector<HTMLInputElement>(".ceo-composer input")?.focus()}><Wand2 size={15} /> Modifier</button>
              <button type="button" onClick={() => setMessages((prev) => [...prev, { id: `product-remake-${Date.now()}`, role: "ceo", text: "Je prépare une nouvelle version du projet.", timestamp: new Date().toISOString() }])}><RotateCcw size={15} /> Refaire</button>
              <button type="button" onClick={() => setShowActivity(true)}><FolderOpen size={15} /> Ouvrir le workspace</button>
              <button type="button" onClick={() => setShowActivity(true)}><Files size={15} /> Voir les fichiers</button>
              <button type="button" onClick={() => document.querySelector<HTMLInputElement>(".ceo-composer input")?.focus()}><Play size={15} /> Continuer le projet</button>
            </div>
          </section>
        )}

        <AnimatePresence>
          {finalResult && !productAction && (
            <motion.section className="final-result-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
              <div className="final-result-head">
                <div>
                  <span>{finalResult.status === "ready" ? "Concept de marque prêt" : finalResult.status === "accepted" ? "Concept accepté" : "Préparation"}</span>
                  <h2>Concept de marque — {finalResult.brandName}</h2>
                  <p className="prototype-disclosure">Prototype visuel: ces directions sont rendues en SVG/CSS. Aucune image finale bitmap n&apos;a encore été générée.</p>
                </div>
                <div className={`final-result-pill ${finalResult.status}`}>{finalResult.status === "ready" ? "Prêt" : finalResult.status === "accepted" ? "Accepté" : "En cours"}</div>
              </div>

              <div className="brand-brief-panel">
                <div>
                  <span>Secteur</span>
                  <strong>{finalResult.brief.industry}</strong>
                  {finalResult.brief.industryConfidence === "weak" && <p>{finalResult.brief.industryAssumption}</p>}
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
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Décris ce que tu veux construire..." />
          <button disabled={sending || !input.trim()}><Send size={17} /></button>
        </form>
      </section>
    </main>
  );
}
