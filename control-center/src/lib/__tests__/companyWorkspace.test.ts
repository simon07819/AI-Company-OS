import { beforeEach, describe, expect, it, vi } from "vitest";

let workspaceData: Record<string, unknown> = { workspaces: [] };
let sessions: Array<{ sessionId: string; status: string; missionType: string; projectName: string }> = [];
let records: Array<{ missionId: string | null; amount: number; recordedAt: string }> = [];
let proposals: Array<{ missionId: string | null; amount: number }> = [];
let campaigns: Array<{ missionId: string | null; status: string }> = [];
let assets: Array<{ missionId: string | null }> = [];
let clients: Array<{ linkedMissionIds: string[] }> = [];
let leads: Array<{ notes: string }> = [];

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => p.includes("company-workspaces.json")),
    readFileSync: vi.fn((p: string) => {
      if (p.includes("company-workspaces.json")) return JSON.stringify(workspaceData);
      return "{}";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      if (p.includes("company-workspaces.json")) {
        try { workspaceData = JSON.parse(data); } catch { /* ignore */ }
      }
    }),
  },
}));

vi.mock("@/lib/autopilotStore", () => ({
  listSessions: vi.fn(() => sessions),
}));

vi.mock("@/lib/revenueSystem", () => ({
  listRevenueRecords: vi.fn(() => records),
  listProposals: vi.fn(() => proposals),
}));

vi.mock("@/lib/distributionEngine", () => ({
  listCampaigns: vi.fn(() => campaigns),
  listPublishedAssets: vi.fn(() => assets),
}));

vi.mock("@/lib/clientCrm", () => ({
  listClients: vi.fn(() => clients),
  listLeads: vi.fn(() => leads),
}));

describe("companyWorkspace", () => {
  beforeEach(() => {
    workspaceData = { workspaces: [] };
    sessions = [];
    records = [];
    proposals = [];
    campaigns = [];
    assets = [];
    clients = [];
    leads = [];
  });

  it("creates a workspace", async () => {
    const { createWorkspace, listWorkspaces } = await import("@/lib/companyWorkspace");

    const workspace = createWorkspace({ name: "Acme Studio", industry: "design", primaryMissionTypes: ["website"] });

    expect(workspace.id).toMatch(/^workspace-/);
    expect(workspace.slug).toBe("acme-studio");
    expect(workspace.industry).toBe("design");
    expect(listWorkspaces().some((item) => item.id === workspace.id)).toBe(true);
  });

  it("assigns mission to workspace and removes it from default", async () => {
    sessions = [{ sessionId: "ap-1", status: "running", missionType: "website", projectName: "Site" }];
    const { assignMissionToWorkspace, createWorkspace, listWorkspaces } = await import("@/lib/companyWorkspace");

    const workspace = createWorkspace({ name: "Client Brand" });
    const updated = assignMissionToWorkspace(workspace.id, "ap-1");

    expect(updated?.activeMissionIds).toContain("ap-1");
    const defaultWorkspace = listWorkspaces().find((item) => item.id === "workspace-default");
    expect(defaultWorkspace?.activeMissionIds).not.toContain("ap-1");
  });

  it("updates, archives, restores and soft deletes workspaces", async () => {
    const { archiveWorkspace, createWorkspace, listAllWorkspaces, listWorkspaces, restoreWorkspace, softDeleteWorkspace, updateWorkspace } = await import("@/lib/companyWorkspace");

    const workspace = createWorkspace({ name: "Managed Workspace", industry: "services" });
    const edited = updateWorkspace(workspace.id, { name: "Managed Workspace Updated", automationLevel: "autonomous" });
    expect(edited?.name).toBe("Managed Workspace Updated");
    expect(edited?.automationLevel).toBe("autonomous");

    archiveWorkspace(workspace.id);
    expect(listWorkspaces().find((item) => item.id === workspace.id)).toBeUndefined();
    expect(listAllWorkspaces().find((item) => item.id === workspace.id)?.archivedAt).toBeTruthy();

    restoreWorkspace(workspace.id);
    expect(listWorkspaces().find((item) => item.id === workspace.id)).toBeTruthy();

    softDeleteWorkspace(workspace.id);
    expect(listWorkspaces().find((item) => item.id === workspace.id)).toBeUndefined();
    expect(listAllWorkspaces().find((item) => item.id === workspace.id)?.deletedAt).toBeTruthy();
  });

  it("calculates workspace overview metrics", async () => {
    sessions = [{ sessionId: "ap-2", status: "running", missionType: "social_campaign", projectName: "Launch" }];
    records = [{ missionId: "ap-2", amount: 5000, recordedAt: new Date().toISOString() }];
    proposals = [{ missionId: "ap-2", amount: 7000 }];
    campaigns = [{ missionId: "ap-2", status: "active" }];
    assets = [{ missionId: "ap-2" }];
    clients = [{ linkedMissionIds: ["ap-2"] }];
    const { assignMissionToWorkspace, createWorkspace, getWorkspaceOverview } = await import("@/lib/companyWorkspace");

    const workspace = createWorkspace({ name: "Growth Co", primaryMissionTypes: ["social_campaign"] });
    assignMissionToWorkspace(workspace.id, "ap-2");
    const overview = getWorkspaceOverview(workspace.id);

    expect(overview).not.toBeNull();
    expect("metrics" in overview!).toBe(true);
    if (overview && "metrics" in overview) {
      expect(overview.metrics.revenue).toBe(5000);
      expect(overview.metrics.proposalValue).toBe(7000);
      expect(overview.metrics.activeCampaigns).toBe(1);
      expect(overview.metrics.publishedAssets).toBe(1);
      expect(overview.metrics.crmClients).toBe(1);
    }
  });

  it("workspace API works", async () => {
    const workspacesRoute = await import("@/app/api/workspaces/route");
    const workspaceRoute = await import("@/app/api/workspaces/[workspaceId]/route");
    const assignRoute = await import("@/app/api/workspaces/[workspaceId]/assign-mission/route");
    const overviewRoute = await import("@/app/api/workspaces/[workspaceId]/overview/route");

    const createResponse = await workspacesRoute.POST(new Request("http://test.local/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "API Workspace", industry: "media" }),
    }) as never);
    const createPayload = await createResponse.json();
    expect(createPayload.ok).toBe(true);

    const getPayload = await (await workspaceRoute.GET(new Request("http://test.local") as never, {
      params: { workspaceId: createPayload.workspace.id },
    })).json();
    expect(getPayload.workspace.name).toBe("API Workspace");

    const assignPayload = await (await assignRoute.POST(new Request("http://test.local", {
      method: "POST",
      body: JSON.stringify({ missionId: "ap-api" }),
    }) as never, {
      params: { workspaceId: createPayload.workspace.id },
    })).json();
    expect(assignPayload.workspace.activeMissionIds).toContain("ap-api");

    const overviewPayload = await (await overviewRoute.GET(new Request("http://test.local") as never, {
      params: { workspaceId: createPayload.workspace.id },
    })).json();
    expect(overviewPayload.ok).toBe(true);
    expect(overviewPayload.overview.id).toBe(createPayload.workspace.id);
  });
});
