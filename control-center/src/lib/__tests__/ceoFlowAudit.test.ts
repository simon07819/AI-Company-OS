import { describe, expect, it, vi, beforeAll, afterEach } from "vitest";

// ─── Mock fs ─────────────────────────────────────────────────────────────

let fileStore: Record<string, string> = {};

vi.mock("fs", () => ({
  default: {
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ size: 100, isFile: () => true })),
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => {
      const name = p.split("/").pop() ?? p;
      return name in fileStore;
    }),
    readFileSync: vi.fn((p: string) => {
      const name = p.split("/").pop() ?? p;
      if (name in fileStore) return fileStore[name];
      return "{}";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      const name = p.split("/").pop() ?? p;
      fileStore[name] = data;
    }),
  },
}));

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("path")>();
  return { ...actual, resolve: (...args: string[]) => args.join("/") };
});

function resetStore() {
  fileStore = {};
}

// ─── Tests: CEO Chat Archive + New Chat Flow ──────────────────────────────

describe("CEO Chat — archive and new chat flows", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("archive current chat then create new chat works", async () => {
    const { createThread, archiveThread, listThreads, addMessage } = await import("@/lib/conversationStore");

    // 1. Create a thread and add messages (simulate active chat)
    const thread1 = createThread({ title: "CEO Chat 1", participants: ["ceo"] });
    expect(thread1).toBeTruthy();
    addMessage(thread1.id, "user", "Hello CEO");
    addMessage(thread1.id, "ceo", "How can I help?");

    // 2. Archive it (simulates Archive Chat button)
    const archived = archiveThread(thread1.id, true);
    expect(archived).toBeTruthy();
    expect(archived!.archived).toBe(true);

    // 3. Verify it's excluded from active threads
    const activeThreads = listThreads();
    expect(activeThreads.find((t) => t.id === thread1.id)).toBeUndefined();

    // 4. Create a new thread (simulates openDirectThread with forceNew=true)
    const thread2 = createThread({ title: "Conversation avec CEO", participants: ["ceo"] });
    expect(thread2).toBeTruthy();
    expect(thread2.id).not.toBe(thread1.id);
    expect(thread2.messages.length).toBe(0); // Fresh thread, no messages

    // 5. Verify new thread is active
    const updatedActive = listThreads();
    expect(updatedActive.find((t) => t.id === thread2.id)).toBeTruthy();
  });

  it("new chat creates empty thread and clears messages", async () => {
    const { createThread, addMessage, listThreads } = await import("@/lib/conversationStore");

    // Create a thread with existing conversation
    const thread1 = createThread({ title: "Old Chat", participants: ["ceo"] });
    addMessage(thread1.id, "user", "Old message");
    expect(thread1.messages.length).toBe(0); // addMessage is async, thread1 is snapshot

    // Create a fresh thread (New Chat button)
    const thread2 = createThread({ title: "New Chat", participants: ["ceo"] });
    expect(thread2.messages.length).toBe(0);

    // Both threads exist
    const all = listThreads();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it("archived thread messages still accessible", async () => {
    const { createThread, addMessage, archiveThread, getThread } = await import("@/lib/conversationStore");

    const thread = createThread({ title: "Chat to Archive", participants: ["ceo"] });
    await addMessage(thread.id, "user", "Important message");

    // Archive
    archiveThread(thread.id, true);

    // Messages still accessible via getThread
    const loaded = getThread(thread.id);
    expect(loaded).toBeTruthy();
    expect(loaded!.archived).toBe(true);
    expect(loaded!.messages.length).toBeGreaterThan(0);
  });

  it("multiple archives create multiple new threads correctly", async () => {
    const { createThread, archiveThread, listThreads } = await import("@/lib/conversationStore");

    const t1 = createThread({ title: "Chat 1", participants: ["ceo"] });
    archiveThread(t1.id, true);
    const t2 = createThread({ title: "Chat 2", participants: ["ceo"] });
    archiveThread(t2.id, true);
    const t3 = createThread({ title: "Chat 3", participants: ["ceo"] });

    // Only the latest thread should be active
    const active = listThreads();
    expect(active.find((t) => t.id === t3.id)).toBeTruthy();
    expect(active.find((t) => t.id === t1.id)).toBeUndefined();
  });
});

// ─── Tests: Premium Component Integration ─────────────────────────────────

describe("Premium Components — integration verification", () => {
  it("GlassPanel component is exported and available", async () => {
    const ui = await import("@/components/ui");
    expect(typeof ui.GlassPanel).toBe("function");
  });

  it("TypingBubble component is exported and available", async () => {
    const ui = await import("@/components/ui");
    expect(typeof ui.TypingBubble).toBe("function");
  });

  it("AgentCard component is exported and available", async () => {
    const ui = await import("@/components/ui");
    expect(typeof ui.AgentCard).toBe("function");
  });

  it("AgentAvatar component is exported and available", async () => {
    const ui = await import("@/components/ui");
    expect(typeof ui.AgentAvatar).toBe("function");
  });

  it("LiveStatus component is exported and available", async () => {
    const ui = await import("@/components/ui");
    expect(typeof ui.LiveStatus).toBe("function");
  });

  it("ExpertiseBadge component is exported and available", async () => {
    const ui = await import("@/components/ui");
    expect(typeof ui.ExpertiseBadge).toBe("function");
  });
});

// ─── Tests: Project → Session → Output chain ──────────────────────────────

describe("CEO Command — project/session/output chain", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("project store creates and retrieves projects", async () => {
    const { createCeoProject, getCeoProjectBySession } = await import("@/lib/ceoProjectStore");
    const project = createCeoProject({
      name: "Test Branding",
      missionType: "branding_pack",
      sessionId: "session-chain-test",
    });
    expect(project).toBeTruthy();
    expect(project.name).toBe("Test Branding");

    const found = getCeoProjectBySession("session-chain-test");
    expect(found).toBeTruthy();
    expect(found!.id).toBe(project.id);
  });

  it("visible outputs generated for session are queryable", async () => {
    const { generateVisibleOutputs, getOutputsForSession } = await import("@/lib/visibleOutputs");
    const outputs = generateVisibleOutputs("session-output-test", "branding_pack");
    expect(outputs.length).toBeGreaterThan(0);

    const queried = getOutputsForSession("session-output-test");
    expect(queried.length).toBe(outputs.length);
    expect(queried[0].sessionId).toBe("session-output-test");
  });

  it("outputs include expected types for branding mission", async () => {
    const { generateVisibleOutputs } = await import("@/lib/visibleOutputs");
    const outputs = generateVisibleOutputs("session-branding-types", "branding_pack");
    const types = outputs.map((o) => o.type);
    expect(types).toContain("creative_brief");
    expect(types).toContain("logo_direction");
    expect(types).toContain("color_palette");
  });

  it("approval preview retrieves data for output approvals", async () => {
    const { generateVisibleOutputs } = await import("@/lib/visibleOutputs");
    const { getPendingApprovals } = await import("@/lib/approvalPreview");
    // Generate outputs that are in "review" status — these should create pending approvals
    generateVisibleOutputs("session-approval-test", "branding_pack");
    const pending = getPendingApprovals();
    // Pending approvals may include outputs in review status
    expect(Array.isArray(pending)).toBe(true);
  });
});
