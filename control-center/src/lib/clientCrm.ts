import fs from "fs";
import path from "path";
import { archiveEntity, restoreEntity, softDeleteEntity } from "./archiveSystem";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const CRM_PATH = path.join(DATA_DIR, "client-crm.json");

// ─── Types ────────────────────────────────────────────────────────────────

export type LeadStatus = "new" | "contacted" | "qualified" | "proposal_sent" | "won" | "lost";
export type ClientStatus = "active" | "paused" | "completed" | "archived";

export interface Lead {
  leadId: string;
  name: string;
  email: string;
  company: string | null;
  source: string;
  status: LeadStatus;
  estimatedValue: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  archivedAt?: string | null;
  deletedAt?: string | null;
}

export interface Client {
  clientId: string;
  name: string;
  email: string;
  company: string | null;
  status: ClientStatus;
  linkedMissionIds: string[];
  totalValue: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  tags?: string[];
  conversationId?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
}

export interface Opportunity {
  opportunityId: string;
  clientId: string;
  title: string;
  value: number;
  status: "open" | "won" | "lost";
  probability: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface ClientInteraction {
  interactionId: string;
  clientId: string | null;
  leadId: string | null;
  type: "call" | "email" | "meeting" | "note" | "delivery";
  summary: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CrmOverview {
  totalLeads: number;
  activeLeads: number;
  totalClients: number;
  activeClients: number;
  openOpportunities: number;
  pipelineValue: number;
  wonValue: number;
  leadsByStatus: Record<LeadStatus, number>;
  clientsByStatus: Record<ClientStatus, number>;
  recentInteractions: ClientInteraction[];
}

// ─── Persistence ──────────────────────────────────────────────────────────

interface CrmData {
  leads: Lead[];
  clients: Client[];
  opportunities: Opportunity[];
  interactions: ClientInteraction[];
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readCrm(): CrmData {
  ensureDataDir();
  if (!fs.existsSync(CRM_PATH)) {
    return { leads: [], clients: [], opportunities: [], interactions: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(CRM_PATH, "utf-8")) as CrmData;
  } catch {
    return { leads: [], clients: [], opportunities: [], interactions: [] };
  }
}

function writeCrm(data: CrmData) {
  ensureDataDir();
  fs.writeFileSync(CRM_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ─── ID Generation ────────────────────────────────────────────────────────

let idCounter = Date.now();
function nextId(prefix: string): string {
  return `${prefix}-${(idCounter++).toString(36)}`;
}

// ─── Lead Functions ───────────────────────────────────────────────────────

export interface CreateLeadInput {
  name: string;
  email: string;
  company?: string;
  source?: string;
  estimatedValue?: number;
  notes?: string;
}

export function createLead(input: CreateLeadInput): Lead {
  const now = new Date().toISOString();
  const lead: Lead = {
    leadId: nextId("lead"),
    name: input.name,
    email: input.email,
    company: input.company ?? null,
    source: input.source ?? "manual",
    status: "new",
    estimatedValue: input.estimatedValue ?? 0,
    notes: input.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };

  const data = readCrm();
  data.leads.push(lead);
  writeCrm(data);
  return lead;
}

export function listLeads(options?: { includeArchived?: boolean; includeDeleted?: boolean }): Lead[] {
  return readCrm().leads
    .filter((lead) => options?.includeDeleted || !lead.deletedAt)
    .filter((lead) => options?.includeArchived || !lead.archivedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getLead(leadId: string): Lead | null {
  return readCrm().leads.find((l) => l.leadId === leadId) ?? null;
}

export function updateLead(leadId: string, patch: Partial<Lead>): Lead | null {
  const data = readCrm();
  const idx = data.leads.findIndex((l) => l.leadId === leadId);
  if (idx === -1) return null;

  data.leads[idx] = {
    ...data.leads[idx],
    ...patch,
    leadId,
    updatedAt: new Date().toISOString(),
  };
  writeCrm(data);
  return data.leads[idx];
}

export function convertLeadToClient(leadId: string): { client: Client; lead: Lead } | null {
  const data = readCrm();
  const leadIdx = data.leads.findIndex((l) => l.leadId === leadId);
  if (leadIdx === -1) return null;

  const lead = data.leads[leadIdx];
  const now = new Date().toISOString();

  const client: Client = {
    clientId: nextId("cli"),
    name: lead.name,
    email: lead.email,
    company: lead.company,
    status: "active",
    linkedMissionIds: [],
    totalValue: lead.estimatedValue,
    createdAt: now,
    updatedAt: now,
  };

  // Update lead status
  data.leads[leadIdx] = { ...lead, status: "won", updatedAt: now };
  data.clients.push(client);

  // Add interaction
  data.interactions.push({
    interactionId: nextId("int"),
    clientId: client.clientId,
    leadId: lead.leadId,
    type: "note",
    summary: `Lead "${lead.name}" converted to client`,
    createdAt: now,
  });

  writeCrm(data);
  return { client, lead: data.leads[leadIdx] };
}

// ─── Client Functions ─────────────────────────────────────────────────────

export interface CreateClientInput {
  name: string;
  email: string;
  company?: string;
  totalValue?: number;
}

export function createClient(input: CreateClientInput): Client {
  const now = new Date().toISOString();
  const client: Client = {
    clientId: nextId("cli"),
    name: input.name,
    email: input.email,
    company: input.company ?? null,
    status: "active",
    linkedMissionIds: [],
    totalValue: input.totalValue ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  const data = readCrm();
  data.clients.push(client);
  writeCrm(data);
  return client;
}

export function listClients(options?: { includeArchived?: boolean; includeDeleted?: boolean }): Client[] {
  return readCrm().clients
    .filter((client) => options?.includeDeleted || !client.deletedAt)
    .filter((client) => options?.includeArchived || !client.archivedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getClient(clientId: string): Client | null {
  return readCrm().clients.find((c) => c.clientId === clientId) ?? null;
}

export function updateClient(clientId: string, patch: Partial<Client>): Client | null {
  const data = readCrm();
  const idx = data.clients.findIndex((c) => c.clientId === clientId);
  if (idx === -1) return null;

  data.clients[idx] = {
    ...data.clients[idx],
    ...patch,
    clientId,
    updatedAt: new Date().toISOString(),
  };
  writeCrm(data);
  return data.clients[idx];
}

export function linkMissionToClient(clientId: string, sessionId: string): Client | null {
  const data = readCrm();
  const idx = data.clients.findIndex((c) => c.clientId === clientId);
  if (idx === -1) return null;

  const linked = data.clients[idx].linkedMissionIds;
  if (!linked.includes(sessionId)) {
    linked.push(sessionId);
  }

  data.clients[idx].updatedAt = new Date().toISOString();

  // Add interaction
  data.interactions.push({
    interactionId: nextId("int"),
    clientId,
    leadId: null,
    type: "note",
    summary: `Mission ${sessionId} linked to client`,
    createdAt: new Date().toISOString(),
  });

  writeCrm(data);
  return data.clients[idx];
}

export function archiveClient(clientId: string): Client | null {
  const client = updateClient(clientId, { status: "archived", archivedAt: new Date().toISOString() });
  if (client) archiveEntity({ entityType: "clients", entityId: clientId, snapshot: client, label: client.name });
  return client;
}

export function restoreClient(clientId: string): Client | null {
  const client = updateClient(clientId, { status: "active", archivedAt: null, deletedAt: null });
  if (client) restoreEntity("clients", clientId);
  return client;
}

export function softDeleteClient(clientId: string): Client | null {
  const client = updateClient(clientId, { status: "archived", archivedAt: new Date().toISOString(), deletedAt: new Date().toISOString() });
  if (client) softDeleteEntity({ entityType: "clients", entityId: clientId, snapshot: client, label: client.name });
  return client;
}

export function archiveLead(leadId: string): Lead | null {
  const lead = updateLead(leadId, { archivedAt: new Date().toISOString() });
  if (lead) archiveEntity({ entityType: "clients", entityId: leadId, snapshot: lead, label: lead.name });
  return lead;
}

export function restoreLead(leadId: string): Lead | null {
  const lead = updateLead(leadId, { archivedAt: null, deletedAt: null });
  if (lead) restoreEntity("clients", leadId);
  return lead;
}

export function softDeleteLead(leadId: string): Lead | null {
  const lead = updateLead(leadId, { archivedAt: new Date().toISOString(), deletedAt: new Date().toISOString() });
  if (lead) softDeleteEntity({ entityType: "clients", entityId: leadId, snapshot: lead, label: lead.name });
  return lead;
}

// ─── Interaction Functions ────────────────────────────────────────────────

export interface AddInteractionInput {
  clientId?: string;
  leadId?: string;
  type: "call" | "email" | "meeting" | "note" | "delivery";
  summary: string;
}

export function addInteraction(input: AddInteractionInput): ClientInteraction {
  const now = new Date().toISOString();
  const interaction: ClientInteraction = {
    interactionId: nextId("int"),
    clientId: input.clientId ?? null,
    leadId: input.leadId ?? null,
    type: input.type,
    summary: input.summary,
    createdAt: now,
    updatedAt: now,
  };

  const data = readCrm();
  data.interactions.push(interaction);
  writeCrm(data);
  return interaction;
}

export function updateInteraction(interactionId: string, patch: Partial<ClientInteraction>): ClientInteraction | null {
  const data = readCrm();
  const idx = data.interactions.findIndex((interaction) => interaction.interactionId === interactionId);
  if (idx === -1) return null;
  data.interactions[idx] = { ...data.interactions[idx], ...patch, interactionId, updatedAt: new Date().toISOString() };
  writeCrm(data);
  return data.interactions[idx];
}

export function listInteractions(limit = 20): ClientInteraction[] {
  return readCrm()
    .interactions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// ─── Opportunity Functions ────────────────────────────────────────────────

export interface CreateOpportunityInput {
  clientId: string;
  title: string;
  value: number;
  probability?: number;
}

export function createOpportunity(input: CreateOpportunityInput): Opportunity | null {
  const data = readCrm();
  if (!data.clients.find((c) => c.clientId === input.clientId)) return null;

  const now = new Date().toISOString();
  const opp: Opportunity = {
    opportunityId: nextId("opp"),
    clientId: input.clientId,
    title: input.title,
    value: input.value,
    status: "open",
    probability: input.probability ?? 50,
    createdAt: now,
    updatedAt: now,
  };

  data.opportunities.push(opp);
  writeCrm(data);
  return opp;
}

export function listOpportunities(): Opportunity[] {
  return readCrm().opportunities.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// ─── Overview ─────────────────────────────────────────────────────────────

export function getCrmOverview(): CrmOverview {
  const data = readCrm();

  const leadsByStatus: Record<LeadStatus, number> = {
    new: 0, contacted: 0, qualified: 0, proposal_sent: 0, won: 0, lost: 0,
  };
  const clientsByStatus: Record<ClientStatus, number> = {
    active: 0, paused: 0, completed: 0, archived: 0,
  };

  for (const lead of data.leads) {
    leadsByStatus[lead.status]++;
  }
  for (const client of data.clients) {
    clientsByStatus[client.status]++;
  }

  const activeLeads = data.leads.filter((l) => l.status !== "won" && l.status !== "lost").length;
  const openOpportunityValue = data.opportunities
    .filter((o) => o.status === "open")
    .reduce((sum, o) => sum + o.value * (o.probability / 100), 0);
  const activeLeadValue = data.leads
    .filter((l) => l.status !== "won" && l.status !== "lost")
    .reduce((sum, l) => sum + l.estimatedValue, 0);
  const wonValue = data.opportunities
    .filter((o) => o.status === "won")
    .reduce((sum, o) => sum + o.value, 0);

  const recentInteractions = data.interactions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    totalLeads: data.leads.length,
    activeLeads,
    totalClients: data.clients.length,
    activeClients: clientsByStatus.active,
    openOpportunities: data.opportunities.filter((o) => o.status === "open").length,
    pipelineValue: Math.round(openOpportunityValue + activeLeadValue),
    wonValue: Math.round(wonValue),
    leadsByStatus,
    clientsByStatus,
    recentInteractions,
  };
}
