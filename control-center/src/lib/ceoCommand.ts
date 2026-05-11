import fs from "fs";
import path from "path";
import { listSessions, createSession, getSession, runStep, startMissionAutopilot, type AutopilotSession } from "./autopilotStore";
import { createCeoProject, getCeoProjectBySession, updateProjectProgress, type CeoProject } from "./ceoProjectStore";
import { generateVisibleOutputs, getOutputsForSession } from "./visibleOutputs";
import { getAllAgentStates, type AgentRuntimeState } from "./agentRuntime";
import { getBusinessOverview } from "./businessOps";
import { getCrmOverview } from "./clientCrm";
import { getRevenueOverview, createInvoice, type Invoice } from "./revenueSystem";
import { createDiscussion, type ExecutiveDiscussion } from "./executiveDiscussion";
import {
  generateSmartResponseAsync,
  generateSmartResponse,
  getThinkingState,
  updateCeoMemory,
  recordCeoDecision,
  type ThinkingState,
} from "./ceoConversation";
import { syncCeoMessageToConversation } from "./conversationStore";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const CEO_CHAT_PATH = path.join(DATA_DIR, "ceo-chat.json");

// ─── Types ────────────────────────────────────────────────────────────────

export type CeoIntent =
  | "launch_mission"
  | "create_invoice"
  | "create_flyer"
  | "create_website"
  | "create_dropshipping_business"
  | "review_business"
  | "delegate_tasks"
  | "greeting"
  | "status_check"
  | "redesign_logo"
  | "branding_pack"
  | "design_review"
  | "unknown";

export interface CeoMessage {
  id: string;
  role: "user" | "ceo";
  text: string;
  intent?: CeoIntent;
  sessionId?: string;
  actions?: CeoAction[];
  assumptions?: Assumption[];
  delegation?: Delegation[];
  discussionId?: string;
  thinkingState?: ThinkingState;
  timestamp: string;
}

export interface CeoAction {
  type: "created_session" | "created_project" | "auto_started" | "delegated_task" | "created_invoice" | "approval_needed" | "review_ready";
  label: string;
  targetId?: string;
  href?: string;
}

export interface CeoOverview {
  activeMissions: number;
  pendingApprovals: number;
  totalRevenue: number;
  agents: AgentRuntimeState[];
  recentMessages: CeoMessage[];
  pendingDecisions: PendingDecision[];
}

export interface PendingDecision {
  id: string;
  type: "approve_deliverable" | "approve_invoice" | "retry_task" | "review_result";
  label: string;
  sessionId?: string;
  invoiceId?: string;
  timestamp: string;
}

interface CeoChatData {
  messages: CeoMessage[];
}

// ─── Persistence ──────────────────────────────────────────────────────────

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readChat(): CeoChatData {
  ensureDataDir();
  if (!fs.existsSync(CEO_CHAT_PATH)) return { messages: [] };
  try {
    return JSON.parse(fs.readFileSync(CEO_CHAT_PATH, "utf-8")) as CeoChatData;
  } catch {
    return { messages: [] };
  }
}

function writeChat(data: CeoChatData) {
  ensureDataDir();
  fs.writeFileSync(CEO_CHAT_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ─── Helpers ──────────────────────────────────────────────────────────────

let idCounter = Date.now();
function nextId(prefix: string): string {
  return `${prefix}-${(idCounter++).toString(36)}`;
}

const INTENT_KEYWORDS: Record<CeoIntent, string[]> = {
  launch_mission:               ["mission", "lancer", "launch", "démarrer", "start", "projet", "project"],
  create_invoice:               ["facture", "invoice", "facturation", "billing", "payer", "paiement"],
  create_flyer:                 ["flyer", "dépliant", "affiche", "poster", "promotionnel"],
  create_website:               ["site web", "website", "site internet", "landing", "page web"],
  create_dropshipping_business: ["dropshipping", "e-commerce", "boutique", "ecommerce", "boutique en ligne", "magasin"],
  review_business:              ["état", "status", "résumé", "bilan", "review", "vérifie", "check", "situation"],
  delegate_tasks:               ["délègue", "delegate", "assigne", "assign", "tâche", "task"],
  greeting:                     ["bonjour", "salut", "hello", "hi", "hey", "bonsoir"],
  status_check:                 ["comment", "how", "quoi de neuf", "what's up", "avance", "progress"],
  redesign_logo:                ["refaire le logo", "redesign logo", "logo plus", "changer le logo", "refaire logo", "nouveau logo", "logo redesign", "update logo", "modifier le logo", "refaire l'identité"],
  branding_pack:                ["branding", "identité visuelle", "identité de marque", "charte graphique", "visual identity", "rebranding", "rebrand", "nouvelle identité", "style plus sportif", "style plus premium", "style plus moderne", "plus sportif", "plus premium", "plus moderne", "plus élégant", "plus professionnel", "look plus", "rendre plus"],
  design_review:                ["design review", "review design", "évaluer le design", "vérifier le design", "tester le visuel", "valider le visuel", "feedback sur le design"],
  unknown:                      [],
};

function detectIntent(text: string): CeoIntent {
  const lower = text.toLowerCase();
  // Find the best match: count matching keywords per intent, pick the one with most matches
  // If tied, pick the one with the longest single keyword match (more specific)
  let bestIntent: CeoIntent = "unknown";
  let bestScore = 0;
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === "unknown") continue;
    let matches = 0;
    let longestMatch = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        matches++;
        if (kw.length > longestMatch) longestMatch = kw.length;
      }
    }
    // Score = matches * 1000 + longest keyword length (favor more matches = more specific)
    const score = matches * 1000 + longestMatch;
    if (score > bestScore) {
      bestIntent = intent as CeoIntent;
      bestScore = score;
    }
  }
  if (bestIntent !== "unknown") return bestIntent;
  // Proactive inference: short action requests are likely actionable
  return inferActionableIntent(text);
}

// ─── Proactive Intent Inference ───────────────────────────────────────────

interface Assumption {
  field: string;
  value: string;
  source: "inferred" | "file" | "message" | "default";
}

interface Delegation {
  agentId: string;
  role: string;
  task: string;
}

function inferActionableIntent(text: string): CeoIntent {
  const lower = text.toLowerCase();

  // Logo/visual requests (even without exact keyword match)
  if (lower.includes("logo")) return "redesign_logo";
  if (lower.includes("sportif") || lower.includes("moderne") || lower.includes("premium") ||
      lower.includes("élégant") || lower.includes("professionnel")) return "branding_pack";

  // Design/visual keywords
  if (lower.includes("design") || lower.includes("visuel") || lower.includes("charte") ||
      lower.includes("couleur") || lower.includes("style") || lower.includes("look")) return "branding_pack";

  // If the message is a short imperative (>5 chars, no question mark), treat as launch_mission
  if (text.length > 5 && !text.includes("?") && !lower.startsWith("comment") &&
      !lower.startsWith("pourquoi") && !lower.startsWith("quand") && !lower.startsWith("c'est quoi")) {
    return "launch_mission";
  }

  return "unknown";
}

function buildAssumptions(text: string, intent: CeoIntent): Assumption[] {
  const assumptions: Assumption[] = [];
  const lower = text.toLowerCase();

  // Smart project name inference (French-first, descriptive)
  let projectName = "";
  if (lower.includes("refaire le logo") || lower.includes("redesign logo") || lower.includes("nouveau logo")) projectName = "Refonte logo";
  else if (lower.includes("logo") && (lower.includes("sportif"))) projectName = "Logo sportif";
  else if (lower.includes("logo") && (lower.includes("premium"))) projectName = "Logo premium";
  else if (lower.includes("logo")) projectName = "Refonte logo";
  else if (lower.includes("flyer") || lower.includes("affiche") || lower.includes("dépliant")) projectName = "Flyer promotionnel";
  else if (lower.includes("site web") || lower.includes("website") || lower.includes("site internet")) {
    const match = lower.match(/(?:site (?:web|internet)?\s*(?:pour|de|d'une?)\s+)(.+)/);
    projectName = match ? `Site web ${match[1].slice(0, 25).trim()}` : "Site web";
  }
  else if (lower.includes("branding") || lower.includes("identité visuelle") || lower.includes("charte graphique")) projectName = "Identité visuelle";
  else if (lower.includes("dropshipping")) projectName = "Boutique dropshipping";
  else if (lower.includes("boutique") || lower.includes("e-commerce") || lower.includes("ecommerce")) projectName = "Boutique en ligne";
  else if (lower.includes("facture") || lower.includes("invoice")) projectName = "Facture";
  else if (text.length > 5) projectName = text.slice(0, 40).trim();
  else projectName = "Nouvelle mission";

  assumptions.push({ field: "Project name", value: projectName, source: "inferred" });

  // Objective inference
  let objective = text;
  if (lower.includes("plus sportif")) objective = "Style plus sportif et dynamique";
  else if (lower.includes("plus premium")) objective = "Style plus premium et haut de gamme";
  else if (lower.includes("plus moderne")) objective = "Style plus moderne et épuré";
  else if (lower.includes("redesign") || lower.includes("refaire")) objective = `Refonte: ${text.slice(0, 60).trim()}`;
  assumptions.push({ field: "Objective", value: objective, source: "message" });

  // Style inference
  if (lower.includes("sportif")) assumptions.push({ field: "Style", value: "Sportif / Dynamique", source: "inferred" });
  else if (lower.includes("premium")) assumptions.push({ field: "Style", value: "Premium / Luxe", source: "inferred" });
  else if (lower.includes("moderne")) assumptions.push({ field: "Style", value: "Moderne / Épuré", source: "inferred" });
  else if (lower.includes("élégant")) assumptions.push({ field: "Style", value: "Élégant / Sophistiqué", source: "inferred" });

  // Check for recent uploaded files
  try {
    const { getFileMemory } = require("./ceoUploads") as typeof import("./ceoUploads");
    const files = getFileMemory().files;
    const recent = files.slice(-3);
    for (const f of recent) {
      assumptions.push({ field: "Linked file", value: f.name, source: "file" });
    }
  } catch { /* uploads not available */ }

  // Default client/workspace
  assumptions.push({ field: "Client", value: "(auto — modifiable)", source: "default" });

  return assumptions;
}

function buildDelegation(intent: CeoIntent): Delegation[] {
  const delegationMap: Record<string, Delegation[]> = {
    redesign_logo: [
      { agentId: "cmo", role: "CMO — Direction créative", task: "Définir direction artistique et moodboard" },
      { agentId: "frontend_agent", role: "Design — Propositions visuelles", task: "Créer propositions logo" },
      { agentId: "qa_agent", role: "QA — Vérification lisibilité", task: "Valider lisibilité multi-supports" },
    ],
    branding_pack: [
      { agentId: "cmo", role: "CMO — Direction créative", task: "Définir identité et charte graphique" },
      { agentId: "frontend_agent", role: "Design — Propositions visuelles", task: "Créer déclinaisons branding" },
      { agentId: "qa_agent", role: "QA — Validation cohérence", task: "Vérifier cohérence multi-canal" },
    ],
    design_review: [
      { agentId: "cmo", role: "CMO — Review créatif", task: "Évaluer design actuel et recommander" },
      { agentId: "qa_agent", role: "QA — Tests visuels", task: "Vérifier lisibilité et accessibilité" },
    ],
    create_website: [
      { agentId: "cto", role: "CTO — Architecture", task: "Définir stack et architecture" },
      { agentId: "frontend_agent", role: "Frontend — UI/UX", task: "Créer interface" },
      { agentId: "backend_agent", role: "Backend — API", task: "Développer endpoints" },
    ],
    create_flyer: [
      { agentId: "cmo", role: "CMO — Message et cible", task: "Définir message et audience" },
      { agentId: "frontend_agent", role: "Design — Création visuelle", task: "Créer flyer" },
    ],
    create_dropshipping_business: [
      { agentId: "logistics", role: "Logistics — Fournisseurs", task: "Rechercher et valider fournisseurs" },
      { agentId: "cmo", role: "CMO — Marketing", task: "Analyser niche et créer campagne" },
      { agentId: "cfo", role: "CFO — Budget", task: "Structurer budget et projections" },
    ],
  };
  return delegationMap[intent] ?? [
    { agentId: "coo", role: "COO — Coordination", task: "Structurer et coordonner la mission" },
  ];
}

function missionTypeForIntent(intent: CeoIntent): string | null {
  const map: Record<string, string> = {
    create_flyer: "flyer",
    create_website: "website",
    create_dropshipping_business: "ecommerce_store",
    redesign_logo: "branding_pack",
    branding_pack: "branding_pack",
    design_review: "branding_pack",
  };
  return map[intent] ?? null;
}

// ─── Proactive Response Builder ──────────────────────────────────────────

async function buildProactiveResponse(
  intent: CeoIntent,
  userText: string,
  actions: CeoAction[],
  assumptions: Assumption[],
  delegation: Delegation[],
): Promise<string> {
  // For non-actionable intents, use the existing smart response system
  const nonActionable: CeoIntent[] = ["greeting", "unknown"];
  if (nonActionable.includes(intent) || intent === "review_business" || intent === "status_check") {
    return buildCeoResponse(intent, userText, actions);
  }

  // For actionable intents, build proactive response
  const projectName = assumptions.find((a) => a.field === "Project name")?.value ?? "New mission";
  const objective = assumptions.find((a) => a.field === "Objective")?.value ?? userText;
  const sessionCreated = actions.some((a) => a.type === "created_session");

  // Build assumption lines
  const assumptionLines = assumptions
    .filter((a) => a.source !== "default")
    .map((a) => `  • ${a.field}: ${a.value} (${a.source === "inferred" ? "inféré" : a.source === "file" ? "fichier" : "message"})`)
    .join("\n");

  // Build delegation lines
  const delegationLines = delegation
    .map((d) => `  • ${d.role}: ${d.task}`)
    .join("\n");

  // Construct response
  const parts: string[] = [];

  // Opening — direct action statement
  if (intent === "redesign_logo" || intent === "branding_pack" || intent === "design_review") {
    parts.push(`Parfait. Je pars avec l'objectif: ${objective}.`);
    // Check for linked files
    const linkedFiles = assumptions.filter((a) => a.field === "Linked file");
    if (linkedFiles.length > 0) {
      parts.push(`Fichier(s) lié(s): ${linkedFiles.map((f) => f.value).join(", ")} — je les utilise automatiquement.`);
    }
  } else if (intent === "create_invoice") {
    parts.push("Facture créée. Diana s'en occupe — tu peux suivre dans Revenue.");
  } else if (intent === "create_dropshipping_business") {
    parts.push("Business dropshipping lancé. L'équipe est mobilisée.");
  } else if (intent === "create_website") {
    parts.push("Site web lancé. Raj sur l'architecture, l'équipe est briefée.");
  } else if (intent === "create_flyer") {
    parts.push("Flyer en cours. Sophie sur la direction créative.");
  } else {
    parts.push(`Mission lancée: ${projectName}.`);
  }

  // Mission creation confirmation
  const projectCreated = actions.some((a) => a.type === "created_project");
  const autoStarted = actions.find((a) => a.type === "auto_started");
  if (sessionCreated && projectCreated) {
    parts.push(`Projet créé: ${projectName}. J'ai démarré l'équipe automatiquement:`);
  } else if (sessionCreated) {
    parts.push(`Je crée une mission et je délègue:`);
  } else {
    parts.push(`Délégation:`);
  }

  // Add delegation
  parts.push(delegationLines);

  // Add assumptions section
  if (assumptionLines) {
    parts.push(`\nHypothèses (modifiables dans la Mission Room):`);
    parts.push(assumptionLines);
  }

  // Closing
  if (sessionCreated && autoStarted) {
    parts.push(`\n${autoStarted.label}. L'équipe travaille déjà — suis l'avancement dans la Mission Room.`);
  } else if (sessionCreated) {
    parts.push(`\nTu peux modifier les infos dans la Mission Room. C'est parti.`);
  } else {
    parts.push(`\nTu peux affiner les détails quand tu veux.`);
  }

  // Only ask a question if truly necessary (financial/legal risk)
  if (intent === "create_invoice" && !userText.includes("$") && !userText.includes("montant")) {
    parts.push(`Montant et client à préciser — mais le brouillon est créé.`);
  }

  return parts.join("\n");
}

// ─── CEO Response Logic ───────────────────────────────────────────────────

function buildBusinessReview(): string {
  try {
    const biz = getBusinessOverview();
    const crm = getCrmOverview();
    const rev = getRevenueOverview();
    return `Missions actives: ${biz.activeMissions} | Livrées: ${biz.deliveredMissions}\nClients: ${crm.totalClients} (${crm.activeClients} actifs) | Leads: ${crm.totalLeads}\nRevenus: $${rev.totalRevenue} | Pipeline: $${rev.pipelineValue} | Factures en attente: ${rev.outstandingInvoices}`;
  } catch {
    return "Données pas encore disponibles — seed les données demo si nécessaire.";
  }
}

function buildStatusCheck(): string {
  try {
    const agents = getAllAgentStates();
    const active = agents.filter((a) => a.status !== "idle").length;
    const sessions = listSessions();
    const running = sessions.filter((s) => s.status === "running").length;
    return `${agents.length} agents (${active} actifs) | ${sessions.length} sessions (${running} en cours)\nAgents: ${agents.map((a) => `${a.agentId} (${a.status})`).join(", ")}`;
  } catch {
    return "Système en initialisation. Agents bientôt disponibles.";
  }
}

async function buildCeoResponse(
  intent: CeoIntent,
  userText: string,
  actions: CeoAction[],
): Promise<string> {
  // For intents that need live system data, prepend smart intro to real data
  if (intent === "review_business") {
    const intro = generateSmartResponse("review_business");
    const data = buildBusinessReview();
    return `${intro}\n${data}`;
  }

  if (intent === "status_check") {
    const intro = generateSmartResponse("status_check");
    const data = buildStatusCheck();
    return `${intro}\n${data}`;
  }

  // Use smart response (NVIDIA if available, else intelligent simulation)
  const { text } = await generateSmartResponseAsync(intent, userText);
  return text;
}

// ─── Public API ───────────────────────────────────────────────────────────

export function getMessages(limit = 50): CeoMessage[] {
  const data = readChat();
  return data.messages.slice(-limit);
}

export async function sendMessage(text: string): Promise<{ ceoMessage: CeoMessage; discussion: ExecutiveDiscussion }> {
  const data = readChat();

  // Save user message
  const userMsg: CeoMessage = {
    id: nextId("msg"),
    role: "user",
    text,
    timestamp: new Date().toISOString(),
  };
  data.messages.push(userMsg);
  // Sync to conversationStore
  syncCeoMessageToConversation("user", text);

  // Detect intent (proactive inference included)
  const intent = detectIntent(text);
  const actions: CeoAction[] = [];
  const assumptions = buildAssumptions(text, intent);
  const delegation = buildDelegation(intent);

  // Update conversation memory
  updateCeoMemory(intent, text);

  let sessionId: string | undefined;

  // ── Proactive mission creation for actionable intents ──
  const actionableIntents: CeoIntent[] = [
    "launch_mission", "create_flyer", "create_website",
    "create_dropshipping_business", "redesign_logo", "branding_pack", "design_review",
  ];

  if (actionableIntents.includes(intent)) {
    const missionTypeKey = missionTypeForIntent(intent);
    const projectName = assumptions.find((a) => a.field === "Project name")?.value ?? text.slice(0, 40).trim();

    // Collect linked file IDs from CEO uploads
    let linkedFileIds: string[] = [];
    try {
      const { getFileMemory } = require("./ceoUploads") as typeof import("./ceoUploads");
      const fileMemory = getFileMemory();
      linkedFileIds = fileMemory.files.slice(-5).map((f: { id: string }) => f.id);
    } catch { /* no uploads */ }

    try {
      // 1. Create autopilot session
      const session = createSession({ name: projectName, missionType: missionTypeKey ?? null });
      sessionId = session.sessionId;

      // 2. Start mission autopilot (generates outputs, runs steps, links delegation)
      const autopilotResult = await startMissionAutopilot(
        projectName,
        missionTypeKey ?? "saas_project",
        projectName,
        session.sessionId,
      );

      // 3. Create CEO project (visible in /projects) with full context
      const project = createCeoProject({
        name: projectName,
        missionType: missionTypeKey ?? "saas_project",
        sessionId: session.sessionId,
        conversationId: "ceo-main-thread",
        uploadedFileIds: linkedFileIds,
      });

      // 4. Update project progress from autopilot result
      if (autopilotResult.ok) {
        updateProjectProgress(project.id, autopilotResult.progress, autopilotResult.outputsGenerated);
      }

      actions.push({
        type: "created_session",
        label: "Mission créée — ouvrir la Mission Room",
        targetId: session.sessionId,
        href: `/mission/${session.sessionId}`,
      });
      actions.push({
        type: "created_project",
        label: `Projet créé: ${projectName}`,
        targetId: project.id,
        href: `/mission/${session.sessionId}`,
      });
      actions.push({
        type: "auto_started",
        label: `${autopilotResult.stepsExecuted} étapes exécutées automatiquement`,
        targetId: session.sessionId,
      });

      // 5. Add delegation actions visible in CEO chat
      for (const d of delegation) {
        actions.push({
          type: "delegated_task",
          label: `${d.role}: ${d.task}`,
          targetId: session.sessionId,
          href: `/mission/${session.sessionId}`,
        });
      }
    } catch {
      actions.push({ type: "created_session", label: "Erreur lors de la création de session" });
    }
  }

  if (intent === "create_invoice") {
    try {
      const inv = createInvoice({
        amount: 0,
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      });
      if (inv) {
        actions.push({
          type: "created_invoice",
          label: `Facture ${inv.invoiceId} créée`,
          targetId: inv.invoiceId,
          href: "/revenue",
        });
      }
    } catch {
      actions.push({ type: "created_invoice", label: "Erreur création facture" });
    }
  }

  if (intent === "review_business" || intent === "status_check") {
    try {
      const sessions = listSessions();
      for (const s of sessions) {
        if (s.businessStatus === "review") {
          actions.push({
            type: "approval_needed",
            label: `Mission "${s.projectName}" requiert approbation`,
            targetId: s.sessionId,
            href: `/mission/${s.sessionId}`,
          });
        }
      }
    } catch { /* */ }
  }

  // Generate executive discussion
  const discussion = createDiscussion(text, intent);

  // Build proactive CEO response
  const responseText = await buildProactiveResponse(intent, text, actions, assumptions, delegation);
  const thinkingState = getThinkingState(intent);

  const ceoMsg: CeoMessage = {
    id: nextId("msg"),
    role: "ceo",
    text: responseText,
    intent,
    sessionId,
    actions,
    assumptions,
    delegation,
    discussionId: discussion.id,
    thinkingState,
    timestamp: new Date().toISOString(),
  };
  data.messages.push(ceoMsg);

  // Sync CEO response to conversationStore
  syncCeoMessageToConversation("ceo", responseText, {
    linkedMissionId: sessionId,
  });

  writeChat(data);
  return { ceoMessage: ceoMsg, discussion };
}

export function getCeoOverview(): CeoOverview {
  const agents = getAllAgentStates();
  const sessions = listSessions();
  const biz = getBusinessOverview();
  const rev = getRevenueOverview();
  const messages = getMessages(10);

  const pendingDecisions: PendingDecision[] = [];

  for (const s of sessions) {
    if (s.businessStatus === "review") {
      pendingDecisions.push({
        id: `dec-${s.sessionId}`,
        type: "approve_deliverable",
        label: `Approuver: ${s.projectName}`,
        sessionId: s.sessionId,
        timestamp: s.updatedAt,
      });
    }
    if (s.status === "failed") {
      pendingDecisions.push({
        id: `dec-retry-${s.sessionId}`,
        type: "retry_task",
        label: `Réessayer: ${s.projectName}`,
        sessionId: s.sessionId,
        timestamp: s.updatedAt,
      });
    }
  }

  try {
    if (rev.outstandingInvoices > 0) {
      pendingDecisions.push({
        id: "dec-invoices",
        type: "approve_invoice",
        label: `${rev.outstandingInvoices} facture(s) en attente`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch { /* */ }

  return {
    activeMissions: biz.activeMissions,
    pendingApprovals: pendingDecisions.length,
    totalRevenue: rev.totalRevenue,
    agents,
    recentMessages: messages,
    pendingDecisions,
  };
}

export function delegateTask(sessionId: string, agentId: string): { ok: boolean; message: string } {
  try {
    const session = getSession(sessionId);
    if (!session) return { ok: false, message: "Session introuvable" };
    return { ok: true, message: `Tâche déléguée à ${agentId} pour la session ${sessionId}. Exécution en cours.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return { ok: false, message: msg };
  }
}

export function approveDecision(decisionId: string): { ok: boolean; message: string } {
  const data = readChat();
  const msg: CeoMessage = {
    id: nextId("msg"),
    role: "ceo",
    text: `✅ Décision approuvée: ${decisionId}`,
    timestamp: new Date().toISOString(),
  };
  data.messages.push(msg);
  writeChat(data);
  recordCeoDecision(`approved: ${decisionId}`);
  return { ok: true, message: `Décision ${decisionId} approuvée` };
}

export function rejectDecision(decisionId: string): { ok: boolean; message: string } {
  const data = readChat();
  const msg: CeoMessage = {
    id: nextId("msg"),
    role: "ceo",
    text: `❌ Décision rejetée: ${decisionId}`,
    timestamp: new Date().toISOString(),
  };
  data.messages.push(msg);
  writeChat(data);
  recordCeoDecision(`rejected: ${decisionId}`);
  return { ok: true, message: `Décision ${decisionId} rejetée` };
}
