import { beforeEach, describe, expect, it, vi } from "vitest";

const files = new Map<string, string>();
let sessions: Array<Record<string, unknown>> = [];
let workspaces: Array<Record<string, unknown>> = [];
let clients: Array<Record<string, unknown>> = [];
let proposals: Array<Record<string, unknown>> = [];
let invoices: Array<Record<string, unknown>> = [];
let campaigns: Array<Record<string, unknown>> = [];
let assets: Array<Record<string, unknown>> = [];

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn((p: string) => files.has(p)),
    readFileSync: vi.fn((p: string) => files.get(p) ?? "[]"),
    writeFileSync: vi.fn((p: string, data: string) => { files.set(p, data); }),
    mkdirSync: vi.fn(),
    statSync: vi.fn(() => ({ size: 100 })),
  },
}));

vi.mock("@/lib/autopilotStore", () => ({
  listSessions: vi.fn(() => sessions),
  createSession: vi.fn(() => {
    const session = {
      sessionId: "ap-demo",
      projectName: "Demo-Launch-Website",
      projectIdea: "Create a demo website",
      missionType: "website",
      businessStatus: "idea",
      status: "running",
      progress: 0,
      tasks: [{ id: "AP-1", status: "running", progress: 10, updatedAt: "now" }],
      logs: [],
    };
    sessions.push(session);
    return session;
  }),
  updateSession: vi.fn((sessionId: string, patch: Record<string, unknown>) => {
    const idx = sessions.findIndex((session) => session.sessionId === sessionId);
    sessions[idx] = { ...sessions[idx], ...patch };
    return sessions[idx];
  }),
}));

vi.mock("@/lib/companyWorkspace", () => ({
  listWorkspaces: vi.fn(() => workspaces),
  createWorkspace: vi.fn((input: Record<string, unknown>) => {
    const workspace = { id: "workspace-demo", name: input.name, activeMissionIds: [], metrics: { revenue: 0, activeMissions: 0, activeCampaigns: 0 } };
    workspaces.push(workspace);
    return workspace;
  }),
  assignMissionToWorkspace: vi.fn((workspaceId: string, missionId: string) => {
    const workspace = workspaces.find((item) => item.id === workspaceId);
    if (workspace) workspace.activeMissionIds = [missionId];
    return workspace;
  }),
}));

vi.mock("@/lib/clientCrm", () => ({
  listClients: vi.fn(() => clients),
  createClient: vi.fn((input: Record<string, unknown>) => {
    const client = { clientId: "cli-demo", name: input.name, linkedMissionIds: [], totalValue: input.totalValue };
    clients.push(client);
    return client;
  }),
  linkMissionToClient: vi.fn((clientId: string, missionId: string) => {
    const client = clients.find((item) => item.clientId === clientId);
    if (client) client.linkedMissionIds = [missionId];
    return client;
  }),
}));

vi.mock("@/lib/missionDeliverables", () => ({
  generateMissionDeliverables: vi.fn(() => ["deliverables/homepage-copy.md"]),
}));

vi.mock("@/lib/deliveryPackage", () => ({
  generateDeliveryPackage: vi.fn(() => ({ sessionId: "ap-demo", clientReady: true, files: [] })),
}));

vi.mock("@/lib/revenueSystem", () => ({
  listProposals: vi.fn(() => proposals),
  listInvoices: vi.fn(() => invoices),
  createProposal: vi.fn((input: Record<string, unknown>) => {
    const proposal = { proposalId: "prop-demo", title: input.title, missionId: input.missionId, amount: input.amount };
    proposals.push(proposal);
    return proposal;
  }),
  acceptProposal: vi.fn((proposalId: string) => proposals.find((proposal) => proposal.proposalId === proposalId)),
  createInvoice: vi.fn((input: Record<string, unknown>) => {
    const proposal = proposals.find((item) => item.proposalId === input.proposalId);
    const invoice = { invoiceId: "inv-demo", proposalId: input.proposalId, missionId: proposal?.missionId, amount: proposal?.amount };
    invoices.push(invoice);
    return invoice;
  }),
  markInvoicePaid: vi.fn((invoiceId: string) => invoices.find((invoice) => invoice.invoiceId === invoiceId)),
}));

vi.mock("@/lib/distributionEngine", () => ({
  listCampaigns: vi.fn(() => campaigns),
  listPublishedAssets: vi.fn(() => assets),
  scheduleCampaign: vi.fn((input: Record<string, unknown>) => {
    const campaign = { campaignId: "camp-demo", name: input.name, missionId: input.missionId };
    campaigns.push(campaign);
    return campaign;
  }),
  publishAsset: vi.fn((input: Record<string, unknown>) => {
    const asset = { assetId: "asset-demo", title: input.title, missionId: input.missionId };
    assets.push(asset);
    return asset;
  }),
}));

describe("demoScenario", () => {
  beforeEach(() => {
    files.clear();
    sessions = [];
    workspaces = [];
    clients = [];
    proposals = [];
    invoices = [];
    campaigns = [];
    assets = [];
  });

  it("seed demo creates workspace, client and mission", async () => {
    const { seedDemoData } = await import("@/lib/demoScenario");

    const result = seedDemoData();

    expect(result.workspace.name).toBe("Demo Company OS");
    expect(result.client.name).toBe("Demo Client");
    expect(result.mission.projectName).toBe("Demo-Launch-Website");
    expect(result.readiness.score).toBe(100);
  });

  it("reset demo removes demo records from local files", async () => {
    files.set("/Users/simondore/AI-Company/data/autopilot-sessions.json", JSON.stringify([{ sessionId: "ap-demo-file", projectName: "Demo File" }, { sessionId: "ap-real", projectName: "Real" }]));
    files.set("/Users/simondore/AI-Company/control-center/data/client-crm.json", JSON.stringify({ leads: [], clients: [{ clientId: "cli-demo", name: "Demo Client" }, { clientId: "cli-real", name: "Real Client" }], opportunities: [], interactions: [] }));
    const { resetDemoData } = await import("@/lib/demoScenario");

    const result = resetDemoData();

    expect(result.ok).toBe(true);
    expect(result.removed.clients).toBe(1);
  });

  it("readiness score reflects completed checklist", async () => {
    const { seedDemoData, getDemoReadiness } = await import("@/lib/demoScenario");
    seedDemoData();

    const readiness = getDemoReadiness();

    expect(readiness.score).toBe(100);
    expect(readiness.checklist.every((item) => item.completed)).toBe(true);
    expect(readiness.simulationFallbackActive).toBe(true);
  });

  it("demo API works", async () => {
    const readinessRoute = await import("@/app/api/demo/readiness/route");
    const seedRoute = await import("@/app/api/demo/seed/route");
    const resetRoute = await import("@/app/api/demo/reset/route");

    const seedPayload = await (await seedRoute.POST()).json();
    expect(seedPayload.ok).toBe(true);
    expect(seedPayload.result.readiness.score).toBe(100);

    const readinessPayload = await (await readinessRoute.GET()).json();
    expect(readinessPayload.ok).toBe(true);
    expect(readinessPayload.readiness.score).toBe(100);

    const resetPayload = await (await resetRoute.POST()).json();
    expect(resetPayload.ok).toBe(true);
    expect(resetPayload.result.ok).toBe(true);
  });
});
