import fs from "fs";
import path from "path";
import { listSessions, createSession, getSession, type AutopilotSession } from "./autopilotStore";
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
  | "unknown";

export interface CeoMessage {
  id: string;
  role: "user" | "ceo";
  text: string;
  intent?: CeoIntent;
  sessionId?: string;
  actions?: CeoAction[];
  discussionId?: string;
  thinkingState?: ThinkingState;
  timestamp: string;
}

export interface CeoAction {
  type: "created_session" | "delegated_task" | "created_invoice" | "approval_needed" | "review_ready";
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
  review_business:              ["état", "status", "résumé", "bilan", "review", "vérifie", "check", "situation", "compagnie"],
  delegate_tasks:               ["délègue", "delegate", "assigne", "assign", "tâche", "task"],
  greeting:                     ["bonjour", "salut", "hello", "hi", "hey", "bonsoir"],
  status_check:                 ["comment", "how", "quoi de neuf", "what's up", "avance", "progress"],
  unknown:                      [],
};

function detectIntent(text: string): CeoIntent {
  const lower = text.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === "unknown") continue;
    if (keywords.some((kw) => lower.includes(kw))) return intent as CeoIntent;
  }
  return "unknown";
}

function missionTypeForIntent(intent: CeoIntent): string | null {
  const map: Record<string, string> = {
    create_flyer: "flyer",
    create_website: "website",
    create_dropshipping_business: "ecommerce_store",
  };
  return map[intent] ?? null;
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

  // Detect intent and build actions
  const intent = detectIntent(text);
  const actions: CeoAction[] = [];

  // Update conversation memory
  updateCeoMemory(intent, text);

  let sessionId: string | undefined;

  if (
    intent === "launch_mission" ||
    intent === "create_flyer" ||
    intent === "create_website" ||
    intent === "create_dropshipping_business"
  ) {
    const missionTypeKey = missionTypeForIntent(intent);
    const projectName = text.length > 5 ? text.slice(0, 40).trim() : `Mission ${intent}`;
    try {
      const session = createSession({ name: projectName, missionType: missionTypeKey ?? null });
      sessionId = session.sessionId;
      actions.push({
        type: "created_session",
        label: `Session créée: ${session.sessionId}`,
        targetId: session.sessionId,
        href: `/autopilot/${session.sessionId}`,
      });
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
            href: `/autopilot/${s.sessionId}`,
          });
        }
      }
    } catch { /* */ }
  }

  // Generate executive discussion
  const discussion = createDiscussion(text, intent);

  // Build CEO response (smart + contextual)
  const responseText = await buildCeoResponse(intent, text, actions);
  const thinkingState = getThinkingState(intent);

  const ceoMsg: CeoMessage = {
    id: nextId("msg"),
    role: "ceo",
    text: responseText,
    intent,
    sessionId,
    actions,
    discussionId: discussion.id,
    thinkingState,
    timestamp: new Date().toISOString(),
  };
  data.messages.push(ceoMsg);

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
