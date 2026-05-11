import fs from "fs";
import path from "path";
import { EXECUTIVES, type ExecutiveId } from "./executiveTeam";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const CONV_PATH = path.join(DATA_DIR, "conversations.json");

// ─── Types ────────────────────────────────────────────────────────────────

export type ParticipantRole = ExecutiveId | "custom_agent";

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
  createdAt: string;
  updatedAt: string;
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
  const exec = EXECUTIVES[role];
  return { id: role, name: exec.name, avatar: exec.avatar, color: exec.color };
}

// ─── Agent Response Logic ─────────────────────────────────────────────────

function buildAgentResponse(agentId: ParticipantRole, userText: string): string {
  const lower = userText.toLowerCase();

  if (agentId === "cfo") {
    if (lower.includes("facture") || lower.includes("invoice")) {
      return "Oui. J'ai besoin du client, des items et du montant. Je peux créer un brouillon de facture avec TPS/TVQ. Voulez-vous que je prépare ça maintenant?";
    }
    if (lower.includes("budget") || lower.includes("coût") || lower.includes("cost")) {
      return "Je vais analyser le budget. Quelles sont les dépenses à considérer — opérations, marketing, ou développement?";
    }
    if (lower.includes("taxe") || lower.includes("tps") || lower.includes("tvq")) {
      return "TPS est à 5% (fédéral) et TVQ à 9.975% (Québec). Je peux calculer les taxes sur n'importe quel montant. Quel est le sous-total?";
    }
    if (lower.includes("revenue") || lower.includes("revenu") || lower.includes("profit")) {
      return "Laissez-moi vérifier les revenus récents et les marges. Je recommande de regarder le pipeline et les factures en attente.";
    }
    return "Je suis Diana Park, votre CFO. Je gère les finances, budgets et facturation. Que puis-je faire pour vous côté financier?";
  }

  if (agentId === "coo") {
    if (lower.includes("processus") || lower.includes("opération") || lower.includes("workflow")) {
      return "Je vais optimiser ce processus. Quel est le flux actuel et où voyez-vous le goulot d'étranglement?";
    }
    if (lower.includes("délai") || lower.includes("deadline") || lower.includes("livraison")) {
      return "Je vais coordonner les équipes pour respecter les délais. Quelle mission est concernée?";
    }
    return "Je suis Marcus Torres, votre COO. J'optimise les opérations et la livraison des missions. Comment puis-je améliorer l'exécution?";
  }

  if (agentId === "cmo") {
    if (lower.includes("campagne") || lower.includes("marketing") || lower.includes("branding")) {
      return "Excellente idée! Je vais préparer une stratégie marketing. Quel est le message clé et le public cible?";
    }
    if (lower.includes("flyer") || lower.includes("affiche") || lower.includes("promotion")) {
      return "Je vais créer un concept créatif. Quel est l'événement ou le produit à promouvoir? Je peux aussi recommander d'escalader au CEO pour validation.";
    }
    return "Je suis Sophie Laurent, votre CMO. Stratégie marketing, branding et croissance — quel est votre objectif?";
  }

  if (agentId === "cto") {
    if (lower.includes("site web") || lower.includes("website") || lower.includes("architecture")) {
      return "Je vais définir l'architecture technique. Quel type de site — landing page, e-commerce, SaaS? Je recommande Next.js + Tailwind pour la rapidité.";
    }
    if (lower.includes("stack") || lower.includes("techno") || lower.includes("intégration")) {
      return "Laissez-moi évaluer les options techniques. Je privilégie toujours scalabilité et maintenabilité.";
    }
    return "Je suis Raj Patel, votre CTO. Architecture système et innovation technique — que souhaitez-vous construire?";
  }

  if (agentId === "logistics") {
    if (lower.includes("dropshipping") || lower.includes("fournisseur") || lower.includes("supplier")) {
      return "Je vais préparer un workflow fournisseurs/commandes/livraison. Quel type de produits et quelle zone de livraison?";
    }
    if (lower.includes("commande") || lower.includes("order") || lower.includes("expédition")) {
      return "Je vais suivre la commande. Donnez-moi le numéro ou les détails du client et je vérifie le statut.";
    }
    return "Je suis Emma Whitfield, directrice logistique. Supply chain, fournisseurs et livraison — comment puis-je optimiser vos flux?";
  }

  if (agentId === "support") {
    if (lower.includes("problème") || lower.includes("issue") || lower.includes("bug")) {
      return "Je vais documenter et escalader ce problème. Quelle est la priorité — critique, majeure ou mineure?";
    }
    return "Je suis Carlos Rivera, directeur support. Satisfaction client et résolution de problèmes — que puis-je faire?";
  }

  if (agentId === "sales") {
    if (lower.includes("lead") || lower.includes("prospect") || lower.includes("pipeline")) {
      return "Je vais analyser le pipeline commercial. Combien de leads actifs et quel est le taux de conversion cible?";
    }
    if (lower.includes("deal") || lower.includes("contrat") || lower.includes("négociation")) {
      return "Je peux vous aider à closer ce deal. Quels sont les termes proposés et les objections du client?";
    }
    return "Je suis Rachel Kim, directrice commerciale. Pipeline, deals et revenue — quel est votre objectif de vente?";
  }

  if (agentId === "hr") {
    if (lower.includes("équipe") || lower.includes("team") || lower.includes("recrutement")) {
      return "Je vais évaluer les besoins en personnel. Quel rôle et quelles compétences recherchez-vous?";
    }
    return "Je suis James Okafor, directeur RH. Équipes, culture et performance — comment puis-je soutenir vos équipes?";
  }

  // CEO fallback
  return "Je comprends votre demande. Je peux m'en occuper ou recommander de déléguer au bon directeur. Que préférez-vous?";
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.threads.push(thread);
  writeData(data);
  return thread;
}

export function listThreads(options?: { folderId?: string | null; includeArchived?: boolean }): ConversationThread[] {
  const data = readData();
  let threads = data.threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (options?.folderId !== undefined) {
    threads = threads.filter((t) => t.folderId === options.folderId);
  }
  if (!options?.includeArchived) {
    threads = threads.filter((t) => !t.archived);
  }
  return threads;
}

export function getThread(threadId: string): ConversationThread | null {
  return readData().threads.find((t) => t.id === threadId) ?? null;
}

export function addMessage(threadId: string, role: "user" | ParticipantRole, text: string, metadata?: ConversationMessage["metadata"]): ConversationMessage | null {
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

  // If user message, auto-respond from primary participant
  if (role === "user" && data.threads[idx].participants.length > 0) {
    const primaryAgent = data.threads[idx].participants[0].id;
    const response = buildAgentResponse(primaryAgent, text);
    const agentMsg: ConversationMessage = {
      id: nextId("cmsg"),
      role: primaryAgent,
      text: response,
      timestamp: new Date().toISOString(),
    };
    data.threads[idx].messages.push(agentMsg);
  }

  writeData(data);
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

export function continueThread(threadId: string, userText: string): ConversationMessage | null {
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
