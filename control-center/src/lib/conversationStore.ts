import fs from "fs";
import path from "path";
import { EXECUTIVES, type ExecutiveId } from "./executiveTeam";
import { getProfile, type AgentId } from "./agentProfiles";
import {
  generateSmartResponseAsync,
  updateCeoMemory,
  type ConversationIntent,
} from "./ceoConversation";
import { archiveEntity, restoreEntity, softDeleteEntity } from "./archiveSystem";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const CONV_PATH = path.join(DATA_DIR, "conversations.json");

// ─── Types ────────────────────────────────────────────────────────────────

export type ParticipantRole = AgentId | "custom_agent";

export interface ConversationParticipant {
  id: ParticipantRole;
  name: string;
  avatar: string;
  color: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | ParticipantRole;
  text: string;
  timestamp: string;
  metadata?: { escalateTo?: ParticipantRole; linkedMissionId?: string; linkedInvoiceId?: string };
}

export interface ConversationThread {
  id: string;
  title: string;
  folderId: string | null;
  participants: ConversationParticipant[];
  messages: ConversationMessage[];
  linkedMissionId: string | null;
  linkedWorkspaceId: string | null;
  pinned: boolean;
  archived: boolean;
  unread: number;
  typing: ParticipantRole[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ConversationFolder {
  id: string;
  name: string;
  color: string;
  order: number;
  createdAt: string;
}

export interface ConversationOverview {
  totalFolders: number;
  totalThreads: number;
  activeThreads: number;
  archivedThreads: number;
  pinnedThreads: number;
  recentThreads: ConversationThread[];
}

interface ConversationData {
  folders: ConversationFolder[];
  threads: ConversationThread[];
}

// ─── Persistence ──────────────────────────────────────────────────────────

function emptyData(): ConversationData {
  return { folders: [], threads: [] };
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(): ConversationData {
  ensureDataDir();
  if (!fs.existsSync(CONV_PATH)) return emptyData();
  try {
    const parsed = JSON.parse(fs.readFileSync(CONV_PATH, "utf-8")) as Partial<ConversationData>;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      threads: Array.isArray(parsed.threads) ? parsed.threads : [],
    };
  } catch {
    return emptyData();
  }
}

function writeData(data: ConversationData) {
  ensureDataDir();
  fs.writeFileSync(CONV_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ─── Helpers ──────────────────────────────────────────────────────────────

let idCounter = Date.now();
function nextId(prefix: string): string {
  return `${prefix}-${(idCounter++).toString(36)}`;
}

function participantFromRole(role: ParticipantRole): ConversationParticipant {
  if (role === "custom_agent") {
    return { id: "custom_agent", name: "Custom Agent", avatar: "🤖", color: "#94a3b8" };
  }
  // Prefer agentProfile data when available
  const profile = getProfile(role as AgentId);
  if (profile) {
    return { id: role, name: profile.displayName, avatar: profile.avatarEmoji, color: profile.avatarColor };
  }
  const exec = EXECUTIVES[role as ExecutiveId];
  return { id: role, name: exec?.name ?? role, avatar: exec?.avatar ?? "🤖", color: exec?.color ?? "#94a3b8" };
}

function directThreadTitle(role: ParticipantRole): string {
  const participant = participantFromRole(role);
  return `Conversation avec ${participant.name}`;
}

// ─── Real AI Response Engine ──────────────────────────────────────────────

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

function classifyIntent(text: string): ConversationIntent {
  const lower = text.toLowerCase();
  if (/^(salut|bonjour|hello|hey|coucou|hi)/.test(lower)) return "greeting";
  if (/logo|branding|identité|charte|visual/.test(lower)) return "marketing";
  if (/facture|invoice|budget|coût|tax|tps|tvq|roi|revenu|profit|financ/.test(lower)) return "financial";
  if (/site|website|plateforme|app|api|stack|architecture|backend|frontend/.test(lower)) return "create_website";
  if (/flyer|affiche|promotion|campagne|pub|ad/.test(lower)) return "create_flyer";
  if (/dropshipping|fournisseur|supplier|supply chain|livraison/.test(lower)) return "dropshipping";
  if (/mission|projet|project|lancer|créer une|démarrer/.test(lower)) return "business_mission";
  if (/statut|status|progress|avancement|rapport/.test(lower)) return "status_check";
  if (/délègue|delegate|assign|coordonn/.test(lower)) return "delegate";
  if (/problème|bug|issue|erreur|error|fix/.test(lower)) return "problem";
  return "unknown";
}

export function buildAgentSystemPrompt(agentId: ParticipantRole, thread: ConversationThread): string {
  const profile = getProfile(agentId as AgentId);
  const exec = agentId !== "custom_agent" ? EXECUTIVES[agentId as ExecutiveId] : null;
  const name = profile?.firstName ?? exec?.name?.split(" ")[0] ?? "Agent";

  const parts: string[] = [];

  if (profile) {
    parts.push(`You are ${profile.firstName} ${profile.lastName}, ${profile.title}.`);
    parts.push(`Personality: ${profile.personality}`);
    parts.push(`Tone: ${profile.tone}`);
    parts.push(`Communication style: ${profile.communicationStyle}`);
    parts.push(`Specialization: ${profile.specialization}`);
    parts.push(`Expertise: ${profile.expertise.join(", ")}`);
    parts.push(`Creative level: ${profile.creativityLevel}/100`);
    if (profile.visualStyle) parts.push(`Visual style: ${profile.visualStyle}`);
  } else if (exec) {
    parts.push(`You are ${exec.name}, ${exec.title}.`);
    parts.push(`Specialty: ${exec.specialty}`);
    parts.push(`Personality: ${exec.personality}`);
  }

  // Thread context
  const recentMsgs = thread.messages.slice(-6);
  if (recentMsgs.length > 0) {
    parts.push("\nRecent conversation:");
    for (const m of recentMsgs) {
      const who = m.role === "user" ? "User" : (profile?.firstName ?? exec?.name?.split(" ")[0] ?? m.role);
      parts.push(`  ${who}: ${m.text.slice(0, 120)}`);
    }
  }

  if (thread.linkedMissionId) {
    parts.push(`\nThis thread is linked to mission: ${thread.linkedMissionId}`);
  }

  parts.push("\nRules:");
  parts.push("- Never say 'Je suis sur ton projet. Dis-moi ce dont tu as besoin.' or any generic template.");
  parts.push("- Be specific, proactive, and show real expertise.");
  parts.push("- If the user asks for something actionable, propose next steps or take action immediately.");
  parts.push("- Match the user's language (French/English).");
  parts.push("- Keep responses concise but expert-level. Under 4 sentences unless explaining something complex.");

  return parts.join("\n");
}

function buildIntelligentFallback(agentId: ParticipantRole, userText: string, thread: ConversationThread): string {
  const profile = getProfile(agentId as AgentId);
  const exec = agentId !== "custom_agent" ? EXECUTIVES[agentId as ExecutiveId] : null;
  const name = profile?.firstName ?? exec?.name?.split(" ")[0] ?? "Agent";
  const role = profile?.role ?? exec?.title?.split(" — ")[0] ?? "Agent";
  const lower = userText.toLowerCase();
  const recentMsgs = thread.messages.slice(-4);
  const hasContext = recentMsgs.length > 1;

  // CEO responses — strategic and action-oriented
  if (agentId === "ceo") {
    if (lower.includes("logo") || lower.includes("branding") || lower.includes("identité")) {
      return `Je lance la direction branding. On vise du niveau Apple/Dribbble top 1%. ${hasContext ? "Vu notre discussion, " : ""}Dis-moi l'émotion que tu veux transmettre et je crée la mission tout de suite.`;
    }
    if (lower.includes("site") || lower.includes("website") || lower.includes("plateforme")) {
      return `Architecture en route. Next.js 15 + Tailwind, performance-first. ${hasContext ? "En lien avec notre projet, " : ""}Quel type — landing, SaaS, e-commerce?`;
    }
    if (lower.includes("facture") || lower.includes("invoice")) {
      return `Diana prépare la facture avec TPS/TVQ. Je lui délègue immédiatement. Client et montant?`;
    }
    if (lower.includes("flyer") || lower.includes("affiche")) {
      return `Sophie lance le concept créatif. Style premium Nike/Apple. Quel est l'événement?`;
    }
    if (lower.includes("mission") || lower.includes("projet") || lower.includes("lancer")) {
      return `Mission en cours de création. ${hasContext ? "En lien avec notre discussion, " : ""}Je définis le scope et je délègue aux bons directeurs. Objectif principal?`;
    }
    if (lower.includes("statut") || lower.includes("status") || lower.includes("avancement")) {
      return `Je vérifie l'état des missions actives et je te fais un rapport rapide.`;
    }
    return `Je prends en charge. ${hasContext ? "Dans la continuité de notre discussion, " : ""}Je coordonne l'équipe et on avance. Précise l'objectif si nécessaire, sinon je lance avec ce qu'on a.`;
  }

  // CMO — Sophie
  if (profile?.role === "CMO" || agentId === "cmo") {
    if (lower.includes("logo") || lower.includes("branding") || lower.includes("identité") || lower.includes("charte")) {
      return `${name}: Direction créative en route. Apple/Dribbble quality. ${hasContext ? "En lien avec notre travail, " : ""}Quelle émotion — sportive, premium, luxe, fun? Je lance le design.`;
    }
    if (lower.includes("flyer") || lower.includes("affiche") || lower.includes("campagne") || lower.includes("promotion")) {
      return `${name}: Concept premium en préparation. Impact visuel Nike-level. ${hasContext ? "En continuité, " : ""}Call-to-action et public cible?`;
    }
    return `${name}: Stratégie créative et branding premium. ${hasContext ? "Vu notre discussion, " : ""}On vise quel segment et quelle émotion?`;
  }

  // CTO — Raj
  if (profile?.role === "CTO" || agentId === "cto") {
    if (lower.includes("site") || lower.includes("website") || lower.includes("api") || lower.includes("architecture")) {
      return `${name}: Architecture en préparation. Next.js 15 + TypeScript + Tailwind + PostgreSQL. Vercel-quality deploy. ${hasContext ? "En lien avec notre projet, " : ""}Type — landing, SaaS, e-commerce?`;
    }
    return `${name}: Stack technique et architecture scalable. ${hasContext ? "Dans la continuité, " : ""}Qu'est-ce qu'on construit?`;
  }

  // CFO — Diana
  if (profile?.role === "CFO" || agentId === "cfo") {
    if (lower.includes("facture") || lower.includes("invoice")) {
      return `${name}: Facture en préparation. TPS 5% + TVQ 9.975%. Client et items?`;
    }
    if (lower.includes("budget") || lower.includes("coût") || lower.includes("roi")) {
      return `${name}: Analyse budgétaire en cours. ${hasContext ? "Vu nos échanges, " : ""}Quelles dépenses — ops, marketing, dev?`;
    }
    return `${name}: Finances et stratégie fiscale. ${hasContext ? "En lien avec notre discussion, " : ""}Chiffres ou décision à prendre?`;
  }

  // COO — Marcus
  if (profile?.role === "COO" || agentId === "coo") {
    return `${name}: Opérations et exécution. ${hasContext ? "Dans la continuité de notre travail, " : ""}Process à optimiser ou délai à respecter?`;
  }

  // Logistics — Emma
  if (profile?.role === "Logistics" || agentId === "logistics") {
    return `${name}: Supply chain et logistique. ${hasContext ? "Vu nos échanges, " : ""}Fournisseurs, commandes, ou livraison?`;
  }

  // Sales — Rachel
  if (profile?.role === "Sales" || agentId === "sales") {
    return `${name}: Pipeline et revenue. ${hasContext ? "En lien avec notre discussion, " : ""}Leads, deals, ou objectifs?`;
  }

  // HR — James
  if (profile?.role === "HR" || agentId === "hr") {
    return `${name}: Culture et équipes. ${hasContext ? "Dans la continuité, " : ""}Recrutement, performance, ou bien-être?`;
  }

  // Support — Carlos
  if (profile?.role === "Support" || agentId === "support") {
    return `${name}: Support client. ${hasContext ? "Vu notre discussion, " : ""}Problème ou escalade?`;
  }

  // Generic intelligent fallback using profile
  return `${name}: ${role}. ${hasContext ? "En lien avec notre discussion, " : ""}Je m'en occupe. Donne-moi le détail et je lance le travail.`;
}

async function generateAgentResponse(agentId: ParticipantRole, userText: string, thread: ConversationThread): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY ?? "";

  // CEO thread — use the full CEO engine (intent detection + proactive response)
  if (agentId === "ceo" && thread.id === "ceo-main-thread") {
    try {
      const intent = classifyIntent(userText);
      updateCeoMemory(intent, userText);
      const { text, mode } = await generateSmartResponseAsync(intent, userText);
      if (mode === "nvidia" && text) return text;
    } catch { /* fall through to intelligent fallback */ }
  }

  // NVIDIA call for any agent when API key is available
  if (apiKey && apiKey.length >= 8) {
    try {
      const profile = getProfile(agentId as AgentId);
      const systemPrompt = buildAgentSystemPrompt(agentId, thread);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(NVIDIA_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.NVIDIA_MODEL ?? "nvidia/llama-3.1-nemotron-70b-instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText },
          ],
          temperature: profile ? (profile.creativityLevel / 100) * 0.5 + 0.3 : 0.5,
          max_tokens: 180,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        const payload = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
        if (content) return content;
      }
    } catch { /* fall through to intelligent fallback */ }
  }

  // Intelligent fallback — never a generic template
  return buildIntelligentFallback(agentId, userText, thread);
}

// ─── Public API: Folders ──────────────────────────────────────────────────

export function createFolder(name: string, color = "#3b82f6"): ConversationFolder {
  const data = readData();
  const folder: ConversationFolder = {
    id: nextId("fld"),
    name,
    color,
    order: data.folders.length,
    createdAt: new Date().toISOString(),
  };
  data.folders.push(folder);
  writeData(data);
  return folder;
}

export function listFolders(): ConversationFolder[] {
  return readData().folders.sort((a, b) => a.order - b.order);
}

// ─── Public API: Threads ──────────────────────────────────────────────────

export function createThread(input: {
  title: string;
  folderId?: string | null;
  participants?: ParticipantRole[];
  linkedMissionId?: string | null;
  linkedWorkspaceId?: string | null;
}): ConversationThread {
  const data = readData();
  const roles = input.participants ?? ["ceo"];
  const participants = roles.map(participantFromRole);

  const thread: ConversationThread = {
    id: nextId("thr"),
    title: input.title,
    folderId: input.folderId ?? null,
    participants,
    messages: [],
    linkedMissionId: input.linkedMissionId ?? null,
    linkedWorkspaceId: input.linkedWorkspaceId ?? null,
    pinned: false,
    archived: false,
    unread: 0,
    typing: [],
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.threads.push(thread);
  writeData(data);
  return thread;
}

export function createDirectThread(participant: ParticipantRole, title?: string): ConversationThread {
  return createThread({
    title: title ?? directThreadTitle(participant),
    participants: [participant],
  });
}

export function findOrCreateDirectThread(participant: ParticipantRole): ConversationThread {
  if (participant === "ceo") return findOrCreateCeoThread();
  const data = readData();
  const existing = data.threads
    .filter((t) => !t.archived)
    .find((t) => t.participants.length === 1 && t.participants[0]?.id === participant && !t.linkedMissionId);
  if (existing) return existing;
  return createDirectThread(participant);
}

export function listThreads(options?: { folderId?: string | null; includeArchived?: boolean; includeDeleted?: boolean }): ConversationThread[] {
  const data = readData();
  let threads = data.threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (options?.folderId !== undefined) {
    threads = threads.filter((t) => t.folderId === options.folderId);
  }
  if (!options?.includeArchived) {
    threads = threads.filter((t) => !t.archived);
  }
  if (!options?.includeDeleted) {
    threads = threads.filter((t) => !t.deletedAt);
  }
  return threads;
}

export function getThread(threadId: string): ConversationThread | null {
  return readData().threads.find((t) => t.id === threadId) ?? null;
}

export async function addMessage(threadId: string, role: "user" | ParticipantRole, text: string, metadata?: ConversationMessage["metadata"]): Promise<ConversationMessage | null> {
  const data = readData();
  const idx = data.threads.findIndex((t) => t.id === threadId);
  if (idx === -1) return null;

  const msg: ConversationMessage = {
    id: nextId("cmsg"),
    role,
    text,
    timestamp: new Date().toISOString(),
    metadata,
  };

  data.threads[idx].messages.push(msg);
  data.threads[idx].updatedAt = new Date().toISOString();
  writeData(data); // persist user message first

  // If user message, auto-respond from primary participant via real AI engine
  if (role === "user" && data.threads[idx].participants.length > 0) {
    const primaryAgent = data.threads[idx].participants[0].id;
    const response = await generateAgentResponse(primaryAgent, text, data.threads[idx]);
    const agentMsg: ConversationMessage = {
      id: nextId("cmsg"),
      role: primaryAgent,
      text: response,
      timestamp: new Date().toISOString(),
    };
    // Re-read data (may have changed) and append agent response
    const freshData = readData();
    const freshIdx = freshData.threads.findIndex((t) => t.id === threadId);
    if (freshIdx !== -1) {
      freshData.threads[freshIdx].messages.push(agentMsg);
      freshData.threads[freshIdx].updatedAt = new Date().toISOString();
      writeData(freshData);
    }
  }

  // If agent message, increment unread
  if (role !== "user") {
    const freshData2 = readData();
    const freshIdx2 = freshData2.threads.findIndex((t) => t.id === threadId);
    if (freshIdx2 !== -1) {
      freshData2.threads[freshIdx2].unread = (freshData2.threads[freshIdx2].unread ?? 0) + 1;
      writeData(freshData2);
    }
  }

  return msg;
}

export function renameThread(threadId: string, title: string): ConversationThread | null {
  const data = readData();
  const idx = data.threads.findIndex((t) => t.id === threadId);
  if (idx === -1) return null;
  data.threads[idx].title = title;
  data.threads[idx].updatedAt = new Date().toISOString();
  writeData(data);
  return data.threads[idx];
}

export function archiveThread(threadId: string, archived = true): ConversationThread | null {
  const data = readData();
  const idx = data.threads.findIndex((t) => t.id === threadId);
  if (idx === -1) return null;
  data.threads[idx].archived = archived;
  data.threads[idx].updatedAt = new Date().toISOString();
  writeData(data);
  if (archived) archiveEntity({ entityType: "conversations", entityId: threadId, snapshot: data.threads[idx], label: data.threads[idx].title });
  else restoreEntity("conversations", threadId);
  return data.threads[idx];
}

export function softDeleteThread(threadId: string): ConversationThread | null {
  const data = readData();
  const idx = data.threads.findIndex((t) => t.id === threadId);
  if (idx === -1) return null;
  data.threads[idx].archived = true;
  data.threads[idx].deletedAt = new Date().toISOString();
  data.threads[idx].updatedAt = new Date().toISOString();
  writeData(data);
  softDeleteEntity({ entityType: "conversations", entityId: threadId, snapshot: data.threads[idx], label: data.threads[idx].title });
  return data.threads[idx];
}

export function pinThread(threadId: string, pinned = true): ConversationThread | null {
  const data = readData();
  const idx = data.threads.findIndex((t) => t.id === threadId);
  if (idx === -1) return null;
  data.threads[idx].pinned = pinned;
  data.threads[idx].updatedAt = new Date().toISOString();
  writeData(data);
  return data.threads[idx];
}

export function moveThreadToFolder(threadId: string, folderId: string | null): ConversationThread | null {
  const data = readData();
  const idx = data.threads.findIndex((t) => t.id === threadId);
  if (idx === -1) return null;
  data.threads[idx].folderId = folderId;
  data.threads[idx].updatedAt = new Date().toISOString();
  writeData(data);
  return data.threads[idx];
}

export async function continueThread(threadId: string, userText: string): Promise<ConversationMessage | null> {
  return addMessage(threadId, "user", userText);
}

export function findOrCreateMissionThread(missionId: string, participant: ParticipantRole = "ceo"): ConversationThread {
  const data = readData();
  const existing = data.threads.find((t) => t.linkedMissionId === missionId && !t.archived);
  if (existing) return existing;
  return createThread({
    title: `Mission ${missionId}`,
    participants: [participant],
    linkedMissionId: missionId,
  });
}

export function getConversationOverview(): ConversationOverview {
  const data = readData();
  const active = data.threads.filter((t) => !t.archived);
  const pinned = data.threads.filter((t) => t.pinned && !t.archived);
  const recent = active.slice(0, 10);

  return {
    totalFolders: data.folders.length,
    totalThreads: data.threads.length,
    activeThreads: active.length,
    archivedThreads: data.threads.filter((t) => t.archived).length,
    pinnedThreads: pinned.length,
    recentThreads: recent,
  };
}

// ─── Unread, Favorites, Typing, Search ─────────────────────────────────────

export function markThreadRead(threadId: string): void {
  const data = readData();
  const idx = data.threads.findIndex((t) => t.id === threadId);
  if (idx === -1) return;
  data.threads[idx].unread = 0;
  writeData(data);
}

export function toggleFavorite(threadId: string): ConversationThread | null {
  const data = readData();
  const idx = data.threads.findIndex((t) => t.id === threadId);
  if (idx === -1) return null;
  data.threads[idx].favorite = !data.threads[idx].favorite;
  data.threads[idx].updatedAt = new Date().toISOString();
  writeData(data);
  return data.threads[idx];
}

export function setTyping(threadId: string, agentId: ParticipantRole, isTyping: boolean): void {
  const data = readData();
  const idx = data.threads.findIndex((t) => t.id === threadId);
  if (idx === -1) return;
  const typing = data.threads[idx].typing ?? [];
  if (isTyping) {
    if (!typing.includes(agentId)) typing.push(agentId);
  } else {
    const ti = typing.indexOf(agentId);
    if (ti !== -1) typing.splice(ti, 1);
  }
  data.threads[idx].typing = typing;
  writeData(data);
}

export function searchThreads(query: string): ConversationThread[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  const data = readData();
  return data.threads.filter((t) =>
    t.title.toLowerCase().includes(lower) ||
    t.messages.some((m) => m.text.toLowerCase().includes(lower))
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getTotalUnread(): number {
  return readData().threads.reduce((sum, t) => sum + (t.unread ?? 0), 0);
}

// ─── CEO Chat Sync ────────────────────────────────────────────────────────

const CEO_THREAD_ID = "ceo-main-thread";

export function findOrCreateCeoThread(): ConversationThread {
  const data = readData();
  const existing = data.threads.find((t) => t.id === CEO_THREAD_ID);
  if (existing) return existing;

  const ceoParticipant = participantFromRole("ceo");
  const thread: ConversationThread = {
    id: CEO_THREAD_ID,
    title: "CEO Cockpit",
    folderId: null,
    participants: [ceoParticipant],
    messages: [],
    linkedMissionId: null,
    linkedWorkspaceId: null,
    pinned: true,
    archived: false,
    unread: 0,
    typing: [],
    favorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.threads.push(thread);
  writeData(data);
  return thread;
}

export function syncCeoMessageToConversation(role: "user" | "ceo", text: string, metadata?: ConversationMessage["metadata"]): ConversationMessage | null {
  const thread = findOrCreateCeoThread();
  const data = readData();
  const idx = data.threads.findIndex((t) => t.id === thread.id);
  if (idx === -1) return null;

  const msg: ConversationMessage = {
    id: nextId("cmsg"),
    role,
    text,
    timestamp: new Date().toISOString(),
    metadata,
  };

  data.threads[idx].messages.push(msg);
  data.threads[idx].updatedAt = new Date().toISOString();
  writeData(data);
  return msg;
}

export function getCeoThreadMessages(limit = 100): ConversationMessage[] {
  const data = readData();
  const thread = data.threads.find((t) => t.id === CEO_THREAD_ID);
  if (!thread) return [];
  return thread.messages.slice(-limit);
}
