import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

let fileStore: Record<string, string> = {};

vi.mock("fs", () => ({
  default: {
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ size: 100, mtime: new Date(), isFile: () => true })),
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => {
      const name = p.split("/").pop() ?? p;
      return name in fileStore;
    }),
    readFileSync: vi.fn((p: string) => {
      const name = p.split("/").pop() ?? p;
      return fileStore[name] ?? "{}";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      const name = p.split("/").pop() ?? p;
      fileStore[name] = data;
    }),
  },
}));

vi.mock("@/lib/runtimeEvents", () => ({
  emitEvent: vi.fn(),
}));

vi.mock("@/lib/workspaceStore", () => ({
  createWorkspaceForSession: vi.fn(),
  updateWorkspaceAfterStep: vi.fn(),
  generateAgentArtifact: vi.fn(() => []),
  generateProjectScaffold: vi.fn(() => []),
  projectScaffoldExists: vi.fn(() => false),
  writeAgentRun: vi.fn(),
}));

function resetStore() {
  fileStore = {
    "agent-runtime-events.json": "[]",
    "agent-runtime-queue.json": "[]",
    "approvals.json": '{"approvals":[]}',
    "autopilot-sessions.json": "[]",
    "ceo-chat.json": '{"messages":[]}',
    "ceo-memory.json": '{"entries":[],"recentIntents":[],"messageCount":0,"lastSeen":""}',
    "ceo-projects.json": '{"projects":[]}',
    "conversations.json": '{"folders":[],"threads":[]}',
    "project-archive.json": '{"entities":[]}',
    "runtime-state.json": '{"agents":[],"queue":[],"pausedAgents":[],"stats":{"totalEventsEmitted":0},"savedAt":""}',
    "settings.json": '{"runtimeMode":"simulation","nvidiaKeyPresent":false}',
    "visible-outputs.json": '{"outputs":[]}',
  };
}

async function jsonFrom(response: Response) {
  return await response.json() as Record<string, unknown>;
}

describe("CEO logo request execution flow", () => {
  beforeEach(() => {
    delete process.env.NVIDIA_API_KEY;
    vi.resetModules();
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  it("CEO logo request creates project, starts mission, creates visible output", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { getSession } = await import("@/lib/autopilotStore");
    const { listCeoProjects } = await import("@/lib/ceoProjectStore");
    const { getOutputsForSession } = await import("@/lib/visibleOutputs");
    const { POST: ceoChatPost } = await import("@/app/api/ceo/chat/route");
    const { GET: projectsGet } = await import("@/app/api/ceo-projects/route");
    const { GET: outputsGet } = await import("@/app/api/visible-outputs/route");
    const { GET: missionGet } = await import("@/app/api/autopilot/sessions/[sessionId]/route");
    const { GET: simpleAgencyGet } = await import("@/app/api/ceo/simple-agency/route");

    const { ceoMessage } = await sendMessage("Je veux un logo simple pour une compagnie de photo");

    expect(ceoMessage.intent).toBe("redesign_logo");
    expect(ceoMessage.sessionId).toBeTruthy();

    const sessionId = ceoMessage.sessionId!;
    const project = listCeoProjects().find((p) => p.sessionId === sessionId);
    expect(project).toBeTruthy();
    expect(project!.name.toLowerCase()).toContain("logo");
    expect(project!.missionType).toBe("branding_pack");
    expect(project!.workspaceId).toBeTruthy();

    const session = getSession(sessionId);
    expect(session).toBeTruthy();
    expect(session!.status).toBe("waiting_approval");
    expect(session!.businessStatus).toBe("review");
    expect(session!.progress).toBeGreaterThan(0);

    const outputs = getOutputsForSession(sessionId);
    expect(outputs.length).toBeGreaterThan(0);
    expect(project!.outputsCount).toBe(outputs.length);
    expect(outputs.every((output) => output.projectId === project!.id)).toBe(true);

    const missionResponse = await missionGet(
      new NextRequest(`http://test.local/api/autopilot/sessions/${sessionId}`),
      { params: Promise.resolve({ sessionId }) },
    );
    expect(missionResponse.status).toBe(200);
    const missionPayload = await jsonFrom(missionResponse);
    expect(missionPayload.ok).toBe(true);
    expect((missionPayload.session as { sessionId: string }).sessionId).toBe(sessionId);

    const missionOutputsResponse = await outputsGet(
      new NextRequest(`http://test.local/api/visible-outputs?sessionId=${sessionId}`),
    );
    const missionOutputsPayload = await jsonFrom(missionOutputsResponse);
    expect((missionOutputsPayload.outputs as unknown[]).length).toBe(outputs.length);

    const projectOutputsResponse = await outputsGet(
      new NextRequest(`http://test.local/api/visible-outputs?projectId=${project!.id}`),
    );
    const projectOutputsPayload = await jsonFrom(projectOutputsResponse);
    expect((projectOutputsPayload.outputs as unknown[]).length).toBe(outputs.length);

    const projectsResponse = await projectsGet(new NextRequest("http://test.local/api/ceo-projects"));
    const projectsPayload = await jsonFrom(projectsResponse);
    expect((projectsPayload.projects as Array<{ id: string }>).some((p) => p.id === project!.id)).toBe(true);

    const allOutputsResponse = await outputsGet(new NextRequest("http://test.local/api/visible-outputs"));
    const allOutputsPayload = await jsonFrom(allOutputsResponse);
    expect((allOutputsPayload.outputs as Array<{ id: string }>).some((o) => o.id === outputs[0].id)).toBe(true);

    const simpleAgencyResponse = await simpleAgencyGet();
    const simpleAgencyPayload = await jsonFrom(simpleAgencyResponse);
    const view = simpleAgencyPayload.view as {
      companies: Array<{ name: string; projectIds: string[] }>;
      projects: Array<{ id: string }>;
      outputs: Array<{ id: string; visualPreview?: unknown }>;
      approvals: Array<{ item: { id: string }; visualPreview?: unknown; canApprove: boolean }>;
      logs: unknown[];
    };
    expect(view.companies.some((company) => company.name === "Studio Lumiere" && company.projectIds.includes(project!.id))).toBe(true);
    expect(view.projects.some((item) => item.id === project!.id)).toBe(true);
    expect(view.outputs.some((output) => output.id === outputs[0].id && output.visualPreview)).toBe(true);
    expect(view.approvals.some((approval) => approval.canApprove && approval.visualPreview)).toBe(true);
    expect(view.logs.length).toBeGreaterThan(0);

    const postResponse = await ceoChatPost(new NextRequest("http://test.local/api/ceo/chat", {
      method: "POST",
      body: JSON.stringify({ text: "Je veux un logo simple pour une compagnie de photo" }),
      headers: { "content-type": "application/json" },
    }));
    const postPayload = await jsonFrom(postResponse);
    expect(postPayload.ok).toBe(true);
    expect((postPayload.response as { actions: Array<{ type: string }> }).actions.some((a) => a.type === "created_session")).toBe(true);
  });

  it("mission logo ne reste pas bloquee a 70 percent", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { getSession } = await import("@/lib/autopilotStore");

    const { ceoMessage } = await sendMessage("Je veux un logo simple pour une compagnie de photo");
    const session = getSession(ceoMessage.sessionId!);

    expect(session?.progress).toBeGreaterThanOrEqual(70);
    expect(session?.status).toBe("waiting_approval");
    expect(session?.runtime.lastEvent).toContain("approval");
    expect(session?.tasks.some((task) => task.status === "running")).toBe(false);
  });

  it("mission 70 percent plus sans output cree un fallback visible output", async () => {
    const { createSession, runAll, updateSession } = await import("@/lib/autopilotStore");
    const { getOutputsForSession } = await import("@/lib/visibleOutputs");

    const session = createSession({ name: "Fallback Logo", missionType: "branding_pack" });
    const completedTasks = session.tasks.map((task, index) => ({
      ...task,
      status: index < 5 ? "completed" as const : "queued" as const,
      progress: index < 5 ? 100 : 0,
    }));
    updateSession(session.sessionId, { tasks: completedTasks, progress: 71, status: "running" });
    fileStore["visible-outputs.json"] = '{"outputs":[]}';

    const result = await runAll(session.sessionId, 0);
    const outputs = getOutputsForSession(session.sessionId);

    expect(result.session?.progress).toBeGreaterThanOrEqual(70);
    expect(outputs.length).toBe(1);
    expect(outputs[0].visualPreview).toBeTruthy();
  });
});
