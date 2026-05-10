import fs from "fs";
import path from "path";
import { createSession, listSessions, updateSession, type AutopilotSession } from "./autopilotStore";
import { createClient, linkMissionToClient, listClients } from "./clientCrm";
import { createWorkspace, assignMissionToWorkspace, listWorkspaces } from "./companyWorkspace";
import { generateMissionDeliverables } from "./missionDeliverables";
import { generateDeliveryPackage } from "./deliveryPackage";
import { createProposal, acceptProposal, createInvoice, markInvoicePaid, listProposals, listInvoices } from "./revenueSystem";
import { publishAsset, scheduleCampaign, listPublishedAssets, listCampaigns } from "./distributionEngine";
import type { ReviewReport } from "./deliverableReview";

const CONTROL_ROOT = process.cwd();
const REPO_ROOT = path.resolve(process.cwd(), "..");
const LOCAL_DATA_DIR = path.join(CONTROL_ROOT, "data");
const SHARED_DATA_DIR = path.join(REPO_ROOT, "data");

const DEMO_MARKER = "Demo";
const DEMO_WORKSPACE_NAME = "Demo Company OS";
const DEMO_CLIENT_NAME = "Demo Client";
const DEMO_MISSION_NAME = "Demo-Launch-Website";

export interface DemoReadiness {
  score: number;
  nvidiaConfigured: boolean;
  simulationFallbackActive: boolean;
  checklist: { id: string; label: string; completed: boolean; href: string }[];
  links: { label: string; href: string }[];
  summary: {
    workspaces: number;
    clients: number;
    missions: number;
    proposals: number;
    invoices: number;
    campaigns: number;
    publishedAssets: number;
  };
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function includesDemo(value: unknown): boolean {
  return String(value ?? "").toLowerCase().includes("demo");
}

function demoMissionIds(): string[] {
  return listSessions()
    .filter((session) => includesDemo(session.projectName) || includesDemo(session.projectIdea))
    .map((session) => session.sessionId);
}

export function resetDemoData(): { ok: true; removed: Record<string, number> } {
  const removed: Record<string, number> = {};
  const missionIds = new Set(demoMissionIds());

  const sessionsPath = path.join(SHARED_DATA_DIR, "autopilot-sessions.json");
  const sessions = readJson<AutopilotSession[]>(sessionsPath, []);
  const keptSessions = sessions.filter((session) => !missionIds.has(session.sessionId) && !includesDemo(session.projectName));
  removed.missions = sessions.length - keptSessions.length;
  writeJson(sessionsPath, keptSessions);

  const crmPath = path.join(LOCAL_DATA_DIR, "client-crm.json");
  const crm = readJson<{ leads: unknown[]; clients: Array<{ clientId?: string; name?: string; linkedMissionIds?: string[] }>; opportunities: unknown[]; interactions: unknown[] }>(crmPath, {
    leads: [],
    clients: [],
    opportunities: [],
    interactions: [],
  });
  const demoClientIds = new Set(crm.clients.filter((client) => includesDemo(client.name)).map((client) => client.clientId).filter(Boolean));
  const keptClients = crm.clients.filter((client) => !demoClientIds.has(client.clientId));
  removed.clients = crm.clients.length - keptClients.length;
  writeJson(crmPath, {
    leads: crm.leads.filter((lead) => !includesDemo(JSON.stringify(lead))),
    clients: keptClients,
    opportunities: crm.opportunities.filter((item) => !includesDemo(JSON.stringify(item))),
    interactions: crm.interactions.filter((item) => !includesDemo(JSON.stringify(item))),
  });

  const workspacePath = path.join(LOCAL_DATA_DIR, "company-workspaces.json");
  const workspaceData = readJson<{ workspaces: Array<{ name?: string; activeMissionIds?: string[] }> }>(workspacePath, { workspaces: [] });
  const keptWorkspaces = workspaceData.workspaces.filter((workspace) => !includesDemo(workspace.name));
  removed.workspaces = workspaceData.workspaces.length - keptWorkspaces.length;
  writeJson(workspacePath, { workspaces: keptWorkspaces });

  const revenuePath = path.join(LOCAL_DATA_DIR, "revenue-system.json");
  const revenue = readJson<{ proposals: Array<{ proposalId?: string; title?: string; missionId?: string | null }>; invoices: Array<{ proposalId?: string | null; missionId?: string | null; invoiceId?: string }>; records: Array<{ invoiceId?: string; missionId?: string | null }> }>(revenuePath, {
    proposals: [],
    invoices: [],
    records: [],
  });
  const demoProposalIds = new Set(revenue.proposals.filter((proposal) => includesDemo(proposal.title) || (proposal.missionId && missionIds.has(proposal.missionId))).map((proposal) => proposal.proposalId));
  const demoInvoiceIds = new Set(revenue.invoices.filter((invoice) => (invoice.proposalId && demoProposalIds.has(invoice.proposalId)) || (invoice.missionId && missionIds.has(invoice.missionId))).map((invoice) => invoice.invoiceId));
  writeJson(revenuePath, {
    proposals: revenue.proposals.filter((proposal) => !demoProposalIds.has(proposal.proposalId)),
    invoices: revenue.invoices.filter((invoice) => !demoInvoiceIds.has(invoice.invoiceId)),
    records: revenue.records.filter((record) => !demoInvoiceIds.has(record.invoiceId) && !(record.missionId && missionIds.has(record.missionId))),
  });
  removed.revenue = demoProposalIds.size + demoInvoiceIds.size;

  const distributionPath = path.join(LOCAL_DATA_DIR, "distribution-engine.json");
  const distribution = readJson<{ jobs: Array<{ jobId?: string; title?: string; missionId?: string | null }>; assets: Array<{ jobId?: string; title?: string; missionId?: string | null }>; campaigns: Array<{ campaignId?: string; name?: string; missionId?: string | null }> }>(distributionPath, {
    jobs: [],
    assets: [],
    campaigns: [],
  });
  const demoJobIds = new Set(distribution.jobs.filter((job) => includesDemo(job.title) || (job.missionId && missionIds.has(job.missionId))).map((job) => job.jobId));
  const demoCampaignIds = new Set(distribution.campaigns.filter((campaign) => includesDemo(campaign.name) || (campaign.missionId && missionIds.has(campaign.missionId))).map((campaign) => campaign.campaignId));
  writeJson(distributionPath, {
    jobs: distribution.jobs.filter((job) => !demoJobIds.has(job.jobId)),
    assets: distribution.assets.filter((asset) => !demoJobIds.has(asset.jobId) && !includesDemo(asset.title) && !(asset.missionId && missionIds.has(asset.missionId))),
    campaigns: distribution.campaigns.filter((campaign) => !demoCampaignIds.has(campaign.campaignId)),
  });
  removed.distribution = demoJobIds.size + demoCampaignIds.size;

  return { ok: true, removed };
}

export function seedDemoCompany() {
  return { name: DEMO_WORKSPACE_NAME, industry: "AI services", description: "Demo-ready autonomous AI company." };
}

export function seedDemoWorkspace() {
  const existing = listWorkspaces().find((workspace) => workspace.name === DEMO_WORKSPACE_NAME);
  if (existing) return existing;
  return createWorkspace({
    name: DEMO_WORKSPACE_NAME,
    description: "Demo-ready autonomous AI company workspace.",
    industry: "AI services",
    primaryMissionTypes: ["website", "social_campaign", "automation_workflow"],
    automationLevel: "autonomous",
    branding: { primaryColor: "#6366f1", secondaryColor: "#22c55e", tone: "executive" },
  });
}

export function seedDemoClient() {
  const existing = listClients().find((client) => client.name === DEMO_CLIENT_NAME);
  if (existing) return existing;
  return createClient({
    name: DEMO_CLIENT_NAME,
    email: "demo.client@example.com",
    company: "Demo Client Inc.",
    totalValue: 7500,
  });
}

function makeDemoReview(session: AutopilotSession): ReviewReport {
  const now = new Date().toISOString();
  return {
    sessionId: session.sessionId,
    globalScore: 96,
    status: "approved",
    clientReady: true,
    generatedAt: now,
    updatedAt: now,
    deliverables: [{
      path: "deliverables/homepage-copy.md",
      name: "homepage-copy.md",
      score: 96,
      status: "approved",
      checks: [],
      warnings: [],
      reviewedAt: now,
      approvedAt: now,
    }],
  };
}

export function seedDemoMission(workspaceId?: string) {
  const existing = listSessions().find((session) => session.projectName === DEMO_MISSION_NAME);
  if (existing) return existing;
  const session = createSession({
    name: DEMO_MISSION_NAME,
    idea: "Create a polished launch website and campaign for a demo client.",
    missionType: "website",
    agents: ["product_agent", "frontend_agent", "qa_agent", "devops_agent"],
  });
  const completedTasks = session.tasks.map((task) => ({ ...task, status: "completed" as const, progress: 100, updatedAt: new Date().toISOString() }));
  const updated = updateSession(session.sessionId, {
    status: "completed",
    businessStatus: "client_ready",
    progress: 100,
    tasks: completedTasks,
    logs: [
      { id: `log-demo-delivery-${Date.now()}`, timestamp: new Date().toISOString(), level: "success", agent: "delivery", source: "delivery", message: "Delivery package generated for demo client" },
      ...session.logs,
    ],
  }) ?? session;
  generateMissionDeliverables(updated);
  generateDeliveryPackage(updated, makeDemoReview(updated));
  if (workspaceId) assignMissionToWorkspace(workspaceId, updated.sessionId);
  return updated;
}

export function seedDemoRevenue(clientId: string, missionId: string) {
  const existing = listProposals().find((proposal) => proposal.missionId === missionId && includesDemo(proposal.title));
  if (existing) return existing;
  const proposal = createProposal({
    title: "Demo Website Launch Proposal",
    clientId,
    missionId,
    missionType: "website",
    amount: 7500,
    status: "sent",
  });
  acceptProposal(proposal.proposalId);
  const invoice = createInvoice({ proposalId: proposal.proposalId });
  if (invoice) markInvoicePaid(invoice.invoiceId);
  return proposal;
}

export function seedDemoDistribution(missionId: string) {
  const existing = listCampaigns().find((campaign) => campaign.missionId === missionId && includesDemo(campaign.name));
  if (!existing) {
    scheduleCampaign({
      missionId,
      name: "Demo Launch Distribution",
      channels: ["website", "linkedin", "email", "internal_feed"],
    });
  }
  return publishAsset({
    missionId,
    channel: "website",
    title: "Demo Homepage Published",
    content: "Demo launch homepage copy published for executive walkthrough.",
  });
}

export function seedDemoData() {
  resetDemoData();
  seedDemoCompany();
  const workspace = seedDemoWorkspace();
  const client = seedDemoClient();
  const mission = seedDemoMission(workspace.id);
  linkMissionToClient(client.clientId, mission.sessionId);
  const proposal = seedDemoRevenue(client.clientId, mission.sessionId);
  const asset = seedDemoDistribution(mission.sessionId);
  return { workspace, client, mission, proposal, asset, readiness: getDemoReadiness() };
}

export function getDemoReadiness(): DemoReadiness {
  const workspaces = listWorkspaces().filter((workspace) => includesDemo(workspace.name));
  const clients = listClients().filter((client) => includesDemo(client.name));
  const missions = listSessions().filter((session) => includesDemo(session.projectName));
  const proposals = listProposals().filter((proposal) => includesDemo(proposal.title) || (proposal.missionId && missions.some((mission) => mission.sessionId === proposal.missionId)));
  const invoices = listInvoices().filter((invoice) => invoice.missionId && missions.some((mission) => mission.sessionId === invoice.missionId));
  const campaigns = listCampaigns().filter((campaign) => includesDemo(campaign.name) || (campaign.missionId && missions.some((mission) => mission.sessionId === campaign.missionId)));
  const assets = listPublishedAssets().filter((asset) => includesDemo(asset.title) || (asset.missionId && missions.some((mission) => mission.sessionId === asset.missionId)));
  const nvidiaConfigured = Boolean(process.env.NVIDIA_API_KEY);
  const checklist = [
    { id: "setup", label: "Setup company", completed: workspaces.length > 0, href: "/onboarding" },
    { id: "workspace", label: "Create workspace", completed: workspaces.length > 0, href: "/workspaces" },
    { id: "mission", label: "Launch mission", completed: missions.length > 0, href: "/autopilot" },
    { id: "agents", label: "Run agents", completed: missions.some((mission) => mission.progress >= 100), href: "/runtime" },
    { id: "deliverables", label: "Review deliverables", completed: missions.some((mission) => mission.businessStatus === "client_ready" || mission.businessStatus === "delivered"), href: missions[0] ? `/autopilot/${missions[0].sessionId}` : "/autopilot" },
    { id: "package", label: "Create delivery package", completed: missions.some((mission) => mission.logs.some((log) => log.source === "delivery")), href: missions[0] ? `/autopilot/${missions[0].sessionId}` : "/autopilot" },
    { id: "revenue", label: "Create proposal/invoice", completed: proposals.length > 0 && invoices.length > 0, href: "/revenue" },
    { id: "distribution", label: "Publish distribution job", completed: assets.length > 0, href: "/distribution" },
    { id: "command", label: "View command center", completed: true, href: "/command" },
  ];
  const completed = checklist.filter((item) => item.completed).length;
  return {
    score: Math.round((completed / checklist.length) * 100),
    nvidiaConfigured,
    simulationFallbackActive: !nvidiaConfigured,
    checklist,
    links: [
      { label: "Onboarding", href: "/onboarding" },
      { label: "Workspaces", href: "/workspaces" },
      { label: "Autopilot", href: "/autopilot" },
      { label: "Runtime", href: "/runtime" },
      { label: "Revenue", href: "/revenue" },
      { label: "Distribution", href: "/distribution" },
      { label: "Command Center", href: "/command" },
    ],
    summary: {
      workspaces: workspaces.length,
      clients: clients.length,
      missions: missions.length,
      proposals: proposals.length,
      invoices: invoices.length,
      campaigns: campaigns.length,
      publishedAssets: assets.length,
    },
  };
}
