import fs from "fs";
import path from "path";
import { listSessions } from "./autopilotStore";
import { listClients, listLeads } from "./clientCrm";
import { listCampaigns, listPublishedAssets } from "./distributionEngine";
import { listProposals, listRevenueRecords } from "./revenueSystem";

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const WORKSPACES_PATH = path.join(DATA_DIR, "company-workspaces.json");
const DEFAULT_WORKSPACE_ID = "workspace-default";

export interface BrandProfile {
  primaryColor: string;
  secondaryColor: string;
  tone: string;
  logoUrl: string | null;
}

export interface WorkspaceSettings {
  defaultChannels: string[];
  preferredCurrency: "USD";
  timezone: string;
}

export interface WorkspaceMetrics {
  activeMissions: number;
  totalMissions: number;
  revenue: number;
  proposalValue: number;
  activeCampaigns: number;
  publishedAssets: number;
  crmClients: number;
  crmLeads: number;
}

export interface CompanyWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  industry: string;
  primaryMissionTypes: string[];
  activeMissionIds: string[];
  revenue: number;
  branding: BrandProfile;
  automationLevel: "manual" | "assisted" | "autonomous";
  settings: WorkspaceSettings;
  metrics: WorkspaceMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceOverview {
  totalWorkspaces: number;
  activeWorkspaces: number;
  totalRevenue: number;
  activeMissions: number;
  activeCampaigns: number;
  publishedAssets: number;
  crmClients: number;
  crmLeads: number;
  workspaces: CompanyWorkspace[];
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  industry?: string;
  primaryMissionTypes?: string[];
  automationLevel?: CompanyWorkspace["automationLevel"];
  branding?: Partial<BrandProfile>;
}

interface WorkspaceData {
  workspaces: CompanyWorkspace[];
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "workspace";
}

function nextId(): string {
  return `workspace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function defaultBrand(): BrandProfile {
  return {
    primaryColor: "#6366f1",
    secondaryColor: "#22c55e",
    tone: "pragmatic",
    logoUrl: null,
  };
}

function defaultSettings(): WorkspaceSettings {
  return {
    defaultChannels: ["internal_feed"],
    preferredCurrency: "USD",
    timezone: "America/Toronto",
  };
}

function blankMetrics(): WorkspaceMetrics {
  return {
    activeMissions: 0,
    totalMissions: 0,
    revenue: 0,
    proposalValue: 0,
    activeCampaigns: 0,
    publishedAssets: 0,
    crmClients: 0,
    crmLeads: 0,
  };
}

function makeDefaultWorkspace(now = new Date().toISOString()): CompanyWorkspace {
  return {
    id: DEFAULT_WORKSPACE_ID,
    name: "AI Company OS",
    slug: "ai-company-os",
    description: "Default workspace for unassigned missions and operations.",
    industry: "AI operations",
    primaryMissionTypes: ["saas_project", "website", "social_campaign", "automation_workflow"],
    activeMissionIds: [],
    revenue: 0,
    branding: defaultBrand(),
    automationLevel: "assisted",
    settings: defaultSettings(),
    metrics: blankMetrics(),
    createdAt: now,
    updatedAt: now,
  };
}

function readData(): WorkspaceData {
  ensureDataDir();
  if (!fs.existsSync(WORKSPACES_PATH)) return { workspaces: [makeDefaultWorkspace()] };
  try {
    const parsed = JSON.parse(fs.readFileSync(WORKSPACES_PATH, "utf-8")) as Partial<WorkspaceData>;
    const workspaces = parsed.workspaces?.length ? parsed.workspaces : [makeDefaultWorkspace()];
    if (!workspaces.some((workspace) => workspace.id === DEFAULT_WORKSPACE_ID)) {
      workspaces.unshift(makeDefaultWorkspace());
    }
    return { workspaces };
  } catch {
    return { workspaces: [makeDefaultWorkspace()] };
  }
}

function writeData(data: WorkspaceData) {
  ensureDataDir();
  fs.writeFileSync(WORKSPACES_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function syncDefaultAssignments(data: WorkspaceData): boolean {
  const defaultWorkspace = data.workspaces.find((workspace) => workspace.id === DEFAULT_WORKSPACE_ID) ?? makeDefaultWorkspace();
  if (!data.workspaces.some((workspace) => workspace.id === DEFAULT_WORKSPACE_ID)) data.workspaces.unshift(defaultWorkspace);
  const assigned = new Set(data.workspaces.flatMap((workspace) => workspace.activeMissionIds));
  const missing = listSessions().filter((session) => !assigned.has(session.sessionId)).map((session) => session.sessionId);
  if (missing.length === 0) return false;
  defaultWorkspace.activeMissionIds = Array.from(new Set([...defaultWorkspace.activeMissionIds, ...missing]));
  defaultWorkspace.updatedAt = new Date().toISOString();
  return true;
}

function withComputedMetrics(workspace: CompanyWorkspace): CompanyWorkspace {
  const missionIds = new Set(workspace.activeMissionIds);
  const sessions = listSessions().filter((session) => missionIds.has(session.sessionId));
  const records = listRevenueRecords().filter((record) => record.missionId && missionIds.has(record.missionId));
  const proposals = listProposals().filter((proposal) => proposal.missionId && missionIds.has(proposal.missionId));
  const campaigns = listCampaigns().filter((campaign) => campaign.missionId && missionIds.has(campaign.missionId));
  const assets = listPublishedAssets().filter((asset) => asset.missionId && missionIds.has(asset.missionId));
  const clients = listClients().filter((client) => client.linkedMissionIds.some((missionId) => missionIds.has(missionId)));
  const leads = listLeads().filter((lead) => workspace.primaryMissionTypes.some((type) => lead.notes.toLowerCase().includes(type.replace(/_/g, " "))));
  const revenue = records.reduce((sum, record) => sum + record.amount, 0);

  return {
    ...workspace,
    revenue,
    metrics: {
      activeMissions: sessions.filter((session) => session.status === "running").length,
      totalMissions: sessions.length,
      revenue,
      proposalValue: proposals.reduce((sum, proposal) => sum + proposal.amount, 0),
      activeCampaigns: campaigns.filter((campaign) => campaign.status === "active" || campaign.status === "scheduled").length,
      publishedAssets: assets.length,
      crmClients: clients.length,
      crmLeads: leads.length,
    },
  };
}

function loadSynced(): WorkspaceData {
  const data = readData();
  if (syncDefaultAssignments(data)) writeData(data);
  return data;
}

export function createWorkspace(input: CreateWorkspaceInput): CompanyWorkspace {
  const now = new Date().toISOString();
  const workspace: CompanyWorkspace = {
    id: nextId(),
    name: input.name,
    slug: slugify(input.name),
    description: input.description ?? "",
    industry: input.industry ?? "general",
    primaryMissionTypes: input.primaryMissionTypes ?? ["saas_project"],
    activeMissionIds: [],
    revenue: 0,
    branding: { ...defaultBrand(), ...input.branding },
    automationLevel: input.automationLevel ?? "assisted",
    settings: defaultSettings(),
    metrics: blankMetrics(),
    createdAt: now,
    updatedAt: now,
  };

  const data = loadSynced();
  data.workspaces.push(workspace);
  writeData(data);
  return workspace;
}

export function listWorkspaces(): CompanyWorkspace[] {
  const data = loadSynced();
  return data.workspaces.map(withComputedMetrics).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getWorkspace(workspaceId: string): CompanyWorkspace | null {
  return listWorkspaces().find((workspace) => workspace.id === workspaceId || workspace.slug === workspaceId) ?? null;
}

export function updateWorkspace(workspaceId: string, patch: Partial<Omit<CompanyWorkspace, "id" | "createdAt">>): CompanyWorkspace | null {
  const data = loadSynced();
  const idx = data.workspaces.findIndex((workspace) => workspace.id === workspaceId || workspace.slug === workspaceId);
  if (idx === -1) return null;
  data.workspaces[idx] = {
    ...data.workspaces[idx],
    ...patch,
    id: data.workspaces[idx].id,
    slug: patch.name ? slugify(patch.name) : data.workspaces[idx].slug,
    branding: { ...data.workspaces[idx].branding, ...patch.branding },
    settings: { ...data.workspaces[idx].settings, ...patch.settings },
    updatedAt: new Date().toISOString(),
  };
  writeData(data);
  return withComputedMetrics(data.workspaces[idx]);
}

export function assignMissionToWorkspace(workspaceId: string, missionId: string): CompanyWorkspace | null {
  const data = loadSynced();
  const idx = data.workspaces.findIndex((workspace) => workspace.id === workspaceId || workspace.slug === workspaceId);
  if (idx === -1) return null;
  for (const workspace of data.workspaces) {
    workspace.activeMissionIds = workspace.activeMissionIds.filter((id) => id !== missionId);
  }
  data.workspaces[idx].activeMissionIds.push(missionId);
  data.workspaces[idx].activeMissionIds = Array.from(new Set(data.workspaces[idx].activeMissionIds));
  data.workspaces[idx].updatedAt = new Date().toISOString();
  writeData(data);
  return withComputedMetrics(data.workspaces[idx]);
}

export function getWorkspaceRevenue(workspaceId: string): { totalRevenue: number; records: ReturnType<typeof listRevenueRecords> } {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return { totalRevenue: 0, records: [] };
  const missionIds = new Set(workspace.activeMissionIds);
  const records = listRevenueRecords().filter((record) => record.missionId && missionIds.has(record.missionId));
  return {
    totalRevenue: records.reduce((sum, record) => sum + record.amount, 0),
    records,
  };
}

export function getWorkspaceCampaigns(workspaceId: string) {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return [];
  const missionIds = new Set(workspace.activeMissionIds);
  return listCampaigns().filter((campaign) => campaign.missionId && missionIds.has(campaign.missionId));
}

export function getWorkspaceOverview(workspaceId?: string): WorkspaceOverview | (CompanyWorkspace & { campaigns: ReturnType<typeof listCampaigns> }) | null {
  if (workspaceId) {
    const workspace = getWorkspace(workspaceId);
    if (!workspace) return null;
    return {
      ...workspace,
      campaigns: getWorkspaceCampaigns(workspace.id),
    };
  }

  const workspaces = listWorkspaces();
  return {
    totalWorkspaces: workspaces.length,
    activeWorkspaces: workspaces.filter((workspace) => workspace.metrics.totalMissions > 0).length,
    totalRevenue: workspaces.reduce((sum, workspace) => sum + workspace.metrics.revenue, 0),
    activeMissions: workspaces.reduce((sum, workspace) => sum + workspace.metrics.activeMissions, 0),
    activeCampaigns: workspaces.reduce((sum, workspace) => sum + workspace.metrics.activeCampaigns, 0),
    publishedAssets: workspaces.reduce((sum, workspace) => sum + workspace.metrics.publishedAssets, 0),
    crmClients: workspaces.reduce((sum, workspace) => sum + workspace.metrics.crmClients, 0),
    crmLeads: workspaces.reduce((sum, workspace) => sum + workspace.metrics.crmLeads, 0),
    workspaces,
  };
}
