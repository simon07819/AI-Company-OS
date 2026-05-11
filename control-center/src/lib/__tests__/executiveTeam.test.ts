import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock fs so we don't touch disk ───────────────────────────────────────

const discussionStore = { discussions: [] as unknown[] };
const ceoChatStore = { messages: [] as unknown[] };

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn((filePath: string) => {
      if (String(filePath).includes("ceo-chat")) return JSON.stringify(ceoChatStore);
      if (String(filePath).includes("executive-discussions")) return JSON.stringify(discussionStore);
      return "{}";
    }),
    writeFileSync: vi.fn((filePath: string, data: string) => {
      const parsed = JSON.parse(data);
      if (String(filePath).includes("ceo-chat")) ceoChatStore.messages = parsed.messages ?? [];
      if (String(filePath).includes("executive-discussions")) discussionStore.discussions = parsed.discussions ?? [];
    }),
  },
}));

vi.mock("path", async () => {
  const actual = await vi.importActual<typeof import("path")>("path");
  return { default: actual };
});

// ─── Tests: executiveTeam ─────────────────────────────────────────────────

describe("executiveTeam", () => {
  it("exports 9 executives", async () => {
    const { getAllExecutives } = await import("@/lib/executiveTeam");
    const execs = getAllExecutives();
    expect(execs).toHaveLength(9);
  });

  it("each executive has required fields", async () => {
    const { getAllExecutives } = await import("@/lib/executiveTeam");
    for (const exec of getAllExecutives()) {
      expect(exec.id).toBeTruthy();
      expect(exec.name).toBeTruthy();
      expect(exec.title).toBeTruthy();
      expect(exec.avatar).toBeTruthy();
      expect(exec.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(exec.responsibilities.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("getExecutive returns correct executive", async () => {
    const { getExecutive } = await import("@/lib/executiveTeam");
    const ceo = getExecutive("ceo");
    expect(ceo.name).toBe("Alexandra Chen");
    expect(ceo.avatar).toBe("👑");

    const cfo = getExecutive("cfo");
    expect(cfo.name).toBe("Diana Park");
    expect(cfo.color).toBe("#22c55e");
  });

  it("INTENT_EXECUTIVES maps intents to correct directors", async () => {
    const { INTENT_EXECUTIVES } = await import("@/lib/executiveTeam");

    expect(INTENT_EXECUTIVES["create_dropshipping_business"]).toContain("cfo");
    expect(INTENT_EXECUTIVES["create_dropshipping_business"]).toContain("cmo");
    expect(INTENT_EXECUTIVES["create_dropshipping_business"]).toContain("logistics");

    expect(INTENT_EXECUTIVES["create_invoice"]).toContain("cfo");
    expect(INTENT_EXECUTIVES["create_website"]).toContain("cto");
  });
});

// ─── Tests: executiveDiscussion ───────────────────────────────────────────

describe("executiveDiscussion", () => {
  beforeEach(() => {
    discussionStore.discussions = [];
  });

  it("createDiscussion returns a well-formed discussion", async () => {
    const { createDiscussion } = await import("@/lib/executiveDiscussion");
    const disc = createDiscussion("Lancer une boutique dropshipping", "create_dropshipping_business");

    expect(disc.id).toBeTruthy();
    expect(disc.userRequest).toBe("Lancer une boutique dropshipping");
    expect(disc.intent).toBe("create_dropshipping_business");
    expect(disc.status).toBe("awaiting_approval");
    expect(disc.involvedExecutives).toContain("ceo");
    expect(disc.involvedExecutives).toContain("cfo");
    expect(disc.messages.length).toBeGreaterThan(0);
  });

  it("discussion messages have required fields", async () => {
    const { createDiscussion } = await import("@/lib/executiveDiscussion");
    const disc = createDiscussion("Je veux lancer une mission", "launch_mission");

    for (const msg of disc.messages) {
      expect(msg.id).toBeTruthy();
      expect(msg.from).toBeTruthy();
      expect(msg.text.length).toBeGreaterThan(0);
      expect(msg.type).toBeTruthy();
      expect(msg.delayMs).toBeGreaterThan(0);
    }
  });

  it("CEO always opens the discussion", async () => {
    const { createDiscussion } = await import("@/lib/executiveDiscussion");
    const disc = createDiscussion("Créer un site web", "create_website");
    expect(disc.messages[0].from).toBe("ceo");
  });

  it("dropshipping discussion includes a proposal", async () => {
    const { createDiscussion } = await import("@/lib/executiveDiscussion");
    const disc = createDiscussion("Boutique dropshipping", "create_dropshipping_business");

    expect(disc.proposal).toBeDefined();
    expect(disc.proposal!.headline).toBeTruthy();
    expect(disc.proposal!.estimatedCost).toBeTruthy();
    expect(disc.proposal!.estimatedTime).toBeTruthy();
    expect(disc.proposal!.risks.length).toBeGreaterThan(0);
    expect(disc.proposal!.alternatives.length).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(disc.proposal!.difficulty);
  });

  it("getLatestDiscussion returns last created discussion", async () => {
    const { createDiscussion, getLatestDiscussion } = await import("@/lib/executiveDiscussion");
    createDiscussion("Premier", "greeting");
    const second = createDiscussion("Deuxième", "create_invoice");
    const latest = getLatestDiscussion();
    expect(latest?.id).toBe(second.id);
  });

  it("updateDiscussionStatus changes status correctly", async () => {
    const { createDiscussion, updateDiscussionStatus, getLatestDiscussion } = await import("@/lib/executiveDiscussion");
    const disc = createDiscussion("Mission test", "launch_mission");
    updateDiscussionStatus(disc.id, "approved");
    const updated = getLatestDiscussion();
    expect(updated?.status).toBe("approved");
  });

  it("updateDiscussionStatus returns ok:false for unknown id", async () => {
    const { updateDiscussionStatus } = await import("@/lib/executiveDiscussion");
    const result = updateDiscussionStatus("nonexistent-id", "approved");
    expect(result.ok).toBe(false);
  });

  it("discussions are limited to 20 entries", async () => {
    const { createDiscussion, getDiscussions } = await import("@/lib/executiveDiscussion");
    for (let i = 0; i < 25; i++) {
      createDiscussion(`Request ${i}`, "greeting");
    }
    const all = getDiscussions();
    expect(all.length).toBeLessThanOrEqual(20);
  });

  it("messages have progressive delayMs values", async () => {
    const { createDiscussion } = await import("@/lib/executiveDiscussion");
    const disc = createDiscussion("Test progressive delays", "create_dropshipping_business");

    for (let i = 1; i < disc.messages.length; i++) {
      expect(disc.messages[i].delayMs).toBeGreaterThan(disc.messages[i - 1].delayMs);
    }
  });
});

// ─── Tests: ceoCommand integration ───────────────────────────────────────

describe("ceoCommand with executive discussions", () => {
  beforeEach(() => {
    discussionStore.discussions = [];
  });

  vi.mock("@/lib/autopilotStore", () => ({
    listSessions: vi.fn(() => []),
    createSession: vi.fn((opts: { name: string; missionType: string | null }) => ({
      sessionId: "test-session-123",
      projectName: opts.name,
      missionType: opts.missionType,
    })),
    getSession: vi.fn(() => null),
  }));

  vi.mock("@/lib/agentRuntime", () => ({
    getAllAgentStates: vi.fn(() => []),
  }));

  vi.mock("@/lib/businessOps", () => ({
    getBusinessOverview: vi.fn(() => ({ activeMissions: 0, deliveredMissions: 0 })),
  }));

  vi.mock("@/lib/clientCrm", () => ({
    getCrmOverview: vi.fn(() => ({
      totalLeads: 0, activeLeads: 0, totalClients: 0, activeClients: 0,
      openOpportunities: 0, pipelineValue: 0,
    })),
  }));

  vi.mock("@/lib/revenueSystem", () => ({
    getRevenueOverview: vi.fn(() => ({
      totalRevenue: 0, monthlyRevenue: 0, pipelineValue: 0,
      outstandingInvoices: 0, outstandingInvoiceValue: 0, proposalConversionRate: 0,
    })),
    createInvoice: vi.fn(() => ({ invoiceId: "inv-001" })),
  }));

  it("sendMessage returns ceoMessage and discussion", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const result = sendMessage("Je veux lancer une boutique dropshipping");
    expect(result.ceoMessage).toBeDefined();
    expect(result.discussion).toBeDefined();
    expect(result.ceoMessage.role).toBe("ceo");
    expect(result.discussion.involvedExecutives).toContain("ceo");
  });

  it("CEO asks questions on greeting", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const result = sendMessage("Bonjour");
    expect(result.ceoMessage.text).toContain("CEO");
    expect(result.discussion.messages.length).toBeGreaterThan(0);
  });

  it("discussion is linked to ceoMessage via discussionId", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const result = sendMessage("Créer un site web");
    expect(result.ceoMessage.discussionId).toBe(result.discussion.id);
  });

  it("director delegation is visible in discussion", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const result = sendMessage("Lancer une boutique dropshipping");
    const delegationMessages = result.discussion.messages.filter((m) => m.type === "delegation");
    expect(delegationMessages.length).toBeGreaterThan(0);
  });

  it("CEO synthesizes at the end", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const result = sendMessage("Je veux lancer une boutique dropshipping");
    const synthesisMessages = result.discussion.messages.filter((m) => m.type === "synthesis");
    expect(synthesisMessages.length).toBeGreaterThan(0);
    expect(synthesisMessages.some((m) => m.from === "ceo")).toBe(true);
  });

  it("approval and rejection update discussion status", async () => {
    const { updateDiscussionStatus, createDiscussion, getLatestDiscussion } = await import("@/lib/executiveDiscussion");
    const disc = createDiscussion("Test approval", "launch_mission");

    updateDiscussionStatus(disc.id, "approved");
    expect(getLatestDiscussion()?.status).toBe("approved");

    updateDiscussionStatus(disc.id, "rejected");
    expect(getLatestDiscussion()?.status).toBe("rejected");

    updateDiscussionStatus(disc.id, "revision_requested");
    expect(getLatestDiscussion()?.status).toBe("revision_requested");
  });
});
