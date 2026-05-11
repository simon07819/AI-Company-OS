import { describe, expect, it, vi, beforeAll, afterEach } from "vitest";

// ─── Mock fs ─────────────────────────────────────────────────────────────

let fileStore: Record<string, string> = {};

vi.mock("fs", () => ({
  default: {
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ size: 100 })),
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

vi.mock("@/lib/executiveTeam", () => ({
  EXECUTIVES: {
    ceo: { id: "ceo", name: "Alexandra Chen", title: "CEO", avatar: "👑", color: "#f59e0b", personality: "Strategic", specialty: "Strategy", communicationStyle: "Direct", responsibilities: ["Vision"] },
    cfo: { id: "cfo", name: "Diana Park", title: "CFO", avatar: "💰", color: "#22c55e", personality: "Analytical", specialty: "Finance", communicationStyle: "Numbers-based", responsibilities: ["Budget"] },
    coo: { id: "coo", name: "Marcus Torres", title: "COO", avatar: "⚙️", color: "#3b82f6", personality: "Pragmatic", specialty: "Operations", communicationStyle: "Precise", responsibilities: ["Ops"] },
    cmo: { id: "cmo", name: "Sophie Laurent", title: "CMO", avatar: "📣", color: "#8b5cf6", personality: "Creative", specialty: "Marketing", communicationStyle: "Impactful", responsibilities: ["Marketing"] },
    cto: { id: "cto", name: "Raj Patel", title: "CTO", avatar: "🔧", color: "#06b6d4", personality: "Technical", specialty: "Technology", communicationStyle: "Pragmatic", responsibilities: ["Tech"] },
    logistics: { id: "logistics", name: "Emma Whitfield", title: "Logistics Director", avatar: "📦", color: "#f97316", personality: "Organized", specialty: "Supply chain", communicationStyle: "Practical", responsibilities: ["Logistics"] },
    support: { id: "support", name: "Carlos Rivera", title: "Support Director", avatar: "🎧", color: "#ec4899", personality: "Empathetic", specialty: "Support", communicationStyle: "Warm", responsibilities: ["Support"] },
    sales: { id: "sales", name: "Rachel Kim", title: "Sales Director", avatar: "🎯", color: "#ef4444", personality: "Ambitious", specialty: "Sales", communicationStyle: "Direct", responsibilities: ["Sales"] },
    hr: { id: "hr", name: "James Okafor", title: "HR Director", avatar: "👥", color: "#a78bfa", personality: "Diplomatic", specialty: "HR", communicationStyle: "Benevolent", responsibilities: ["HR"] },
  },
  getExecutive: vi.fn((id: string) => ({
    id, name: `Exec ${id}`, title: id.toUpperCase(), avatar: "🤖", color: "#94a3b8",
    personality: "Test", specialty: "Test", communicationStyle: "Test", responsibilities: [],
  })),
  getAllExecutives: vi.fn(() => Object.values({
    ceo: { id: "ceo", name: "Alexandra Chen" },
  })),
  INTENT_EXECUTIVES: {},
}));

// ─── Helpers ─────────────────────────────────────────────────────────────

function resetStore() {
  fileStore = {
    "conversations.json": '{"folders":[],"threads":[]}',
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("conversationStore", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("creates a folder", async () => {
    const { createFolder, listFolders } = await import("@/lib/conversationStore");
    const folder = createFolder("Finance", "#22c55e");

    expect(folder.id).toBeTruthy();
    expect(folder.name).toBe("Finance");
    expect(folder.color).toBe("#22c55e");

    const folders = listFolders();
    expect(folders.length).toBe(1);
  });

  it("creates a thread", async () => {
    const { createThread, listThreads } = await import("@/lib/conversationStore");
    const thread = createThread({ title: "Invoice Discussion", participants: ["cfo"] });

    expect(thread.id).toBeTruthy();
    expect(thread.title).toBe("Invoice Discussion");
    expect(thread.participants.length).toBe(1);
    expect(thread.participants[0].id).toBe("cfo");
    expect(thread.archived).toBe(false);
    expect(thread.pinned).toBe(false);

    const threads = listThreads();
    expect(threads.length).toBe(1);
  });

  it("adds a message and gets agent response", async () => {
    const { createThread, addMessage } = await import("@/lib/conversationStore");
    const thread = createThread({ title: "Chat with CFO", participants: ["cfo"] });
    const msg = await addMessage(thread.id, "user", "Prépare-moi une facture avec TPS/TVQ");

    expect(msg).not.toBeNull();
    expect(msg!.role).toBe("user");
    expect(msg!.text).toContain("facture");

    // Verify the thread now has the agent auto-response
    const { getThread } = await import("@/lib/conversationStore");
    const updated = getThread(thread.id);
    expect(updated!.messages.length).toBe(2);
    expect(updated!.messages[1].role).toBe("cfo");
    expect(updated!.messages[1].text.length).toBeGreaterThan(10);
  });

  it("continues an existing thread", async () => {
    const { createThread, continueThread, getThread } = await import("@/lib/conversationStore");
    const thread = createThread({ title: "CEO Chat", participants: ["ceo"] });
    await continueThread(thread.id, "What's the status?");
    await continueThread(thread.id, "Any updates?");

    const updated = getThread(thread.id);
    // 2 user messages + 2 auto-responses = 4 messages
    expect(updated!.messages.length).toBe(4);
  });

  it("archives a thread", async () => {
    const { createThread, archiveThread, listThreads } = await import("@/lib/conversationStore");
    const thread = createThread({ title: "Old Chat" });

    const archived = archiveThread(thread.id, true);
    expect(archived!.archived).toBe(true);

    // Default list excludes archived
    const active = listThreads();
    expect(active.find((t) => t.id === thread.id)).toBeUndefined();

    // With includeArchived
    const all = listThreads({ includeArchived: true });
    expect(all.find((t) => t.id === thread.id)).toBeTruthy();
  });

  it("soft deletes a thread", async () => {
    const { createThread, listThreads, softDeleteThread } = await import("@/lib/conversationStore");
    const thread = createThread({ title: "Delete me" });
    softDeleteThread(thread.id);

    expect(listThreads({ includeArchived: true }).find((t) => t.id === thread.id)).toBeUndefined();
    expect(listThreads({ includeArchived: true, includeDeleted: true }).find((t) => t.id === thread.id)).toBeTruthy();
  });

  it("pins a thread", async () => {
    const { createThread, pinThread } = await import("@/lib/conversationStore");
    const thread = createThread({ title: "Important" });

    const pinned = pinThread(thread.id, true);
    expect(pinned!.pinned).toBe(true);

    const unpinned = pinThread(thread.id, false);
    expect(unpinned!.pinned).toBe(false);
  });

  it("moves a thread to a folder", async () => {
    const { createFolder, createThread, moveThreadToFolder } = await import("@/lib/conversationStore");
    const folder = createFolder("Finance");
    const thread = createThread({ title: "Budget" });

    const moved = moveThreadToFolder(thread.id, folder.id);
    expect(moved!.folderId).toBe(folder.id);

    // Move out of folder
    const movedOut = moveThreadToFolder(thread.id, null);
    expect(movedOut!.folderId).toBeNull();
  });

  it("renames a thread", async () => {
    const { createThread, renameThread } = await import("@/lib/conversationStore");
    const thread = createThread({ title: "Old Title" });

    const renamed = renameThread(thread.id, "New Title");
    expect(renamed!.title).toBe("New Title");
  });

  it("creates thread linked to mission", async () => {
    const { createThread, getThread } = await import("@/lib/conversationStore");
    const thread = createThread({ title: "Mission Chat", linkedMissionId: "mission-123" });

    expect(thread.linkedMissionId).toBe("mission-123");
    const loaded = getThread(thread.id);
    expect(loaded!.linkedMissionId).toBe("mission-123");
  });

  it("findOrCreateMissionThread reuses existing thread", async () => {
    const { findOrCreateMissionThread } = await import("@/lib/conversationStore");
    const t1 = findOrCreateMissionThread("mission-456", "ceo");
    const t2 = findOrCreateMissionThread("mission-456", "ceo");

    expect(t1.id).toBe(t2.id);
  });

  it("direct employee chat responds by role", async () => {
    const { createThread, addMessage, getThread } = await import("@/lib/conversationStore");

    // CFO responds about invoices
    const cfoThread = createThread({ title: "CFO Chat", participants: ["cfo"] });
    await addMessage(cfoThread.id, "user", "Prépare-moi une facture avec TPS/TVQ");
    const cfoUpdated = getThread(cfoThread.id);
    const cfoResponse = cfoUpdated!.messages.find((m) => m.role === "cfo");
    expect(cfoResponse).toBeTruthy();
    expect(cfoResponse!.text.length).toBeGreaterThan(10);

    // Logistics responds about dropshipping
    const logThread = createThread({ title: "Logistics Chat", participants: ["logistics"] });
    await addMessage(logThread.id, "user", "Trouve comment gérer les commandes dropshipping");
    const logUpdated = getThread(logThread.id);
    const logResponse = logUpdated!.messages.find((m) => m.role === "logistics");
    expect(logResponse).toBeTruthy();
    expect(logResponse!.text.length).toBeGreaterThan(10);
  });

  it("getConversationOverview returns correct counts", async () => {
    const { createFolder, createThread, archiveThread, pinThread, getConversationOverview } = await import("@/lib/conversationStore");
    createFolder("Test Folder");
    createThread({ title: "Active 1" });
    createThread({ title: "Active 2" });
    const t3 = createThread({ title: "Archived" });
    archiveThread(t3.id, true);
    const t4 = createThread({ title: "Pinned" });
    pinThread(t4.id, true);

    const overview = getConversationOverview();
    expect(overview.totalFolders).toBe(1);
    expect(overview.totalThreads).toBe(4);
    expect(overview.activeThreads).toBe(3);
    expect(overview.archivedThreads).toBe(1);
    expect(overview.pinnedThreads).toBe(1);
  });

  it("lists threads filtered by folder", async () => {
    const { createFolder, createThread, listThreads } = await import("@/lib/conversationStore");
    const folder = createFolder("Finance");
    createThread({ title: "In Folder", folderId: folder.id });
    createThread({ title: "No Folder" });

    const inFolder = listThreads({ folderId: folder.id });
    expect(inFolder.length).toBe(1);
    expect(inFolder[0].title).toBe("In Folder");
  });
});

// ─── CEO Sync + Unread + Favorites + Search Tests ───────────────────────

describe("Conversation CEO Sync & Features", () => {
  beforeAll(() => { fileStore = {}; });

  it("findOrCreateCeoThread creates pinned CEO thread", async () => {
    const { findOrCreateCeoThread } = await import("@/lib/conversationStore");
    const thread = findOrCreateCeoThread();
    expect(thread.id).toBe("ceo-main-thread");
    expect(thread.title).toBe("CEO Cockpit");
    expect(thread.pinned).toBe(true);
    expect(thread.favorite).toBe(true);
  });

  it("findOrCreateCeoThread returns same thread on second call", async () => {
    const { findOrCreateCeoThread } = await import("@/lib/conversationStore");
    const t1 = findOrCreateCeoThread();
    const t2 = findOrCreateCeoThread();
    expect(t1.id).toBe(t2.id);
  });

  it("syncCeoMessageToConversation adds messages to CEO thread", async () => {
    const { syncCeoMessageToConversation, getCeoThreadMessages } = await import("@/lib/conversationStore");
    syncCeoMessageToConversation("user", "Build me a logo");
    syncCeoMessageToConversation("ceo", "Parfait. Je crée la mission logo.");
    const msgs = getCeoThreadMessages(10);
    expect(msgs.length).toBeGreaterThanOrEqual(2);
    expect(msgs[msgs.length - 2].role).toBe("user");
    expect(msgs[msgs.length - 1].role).toBe("ceo");
  });

  it("unread field exists on new threads", async () => {
    const { createThread } = await import("@/lib/conversationStore");
    const t = createThread({ title: "Unread Field Test", participants: ["cmo"] });
    // New threads should have unread field initialized to 0
    expect(t.unread).toBe(0);
    expect(t.typing).toEqual([]);
    expect(t.favorite).toBe(false);
  });

  it("markThreadRead sets unread to 0", async () => {
    const { createThread, addMessage, markThreadRead, getThread } = await import("@/lib/conversationStore");
    const t = createThread({ title: "Mark Read", participants: ["cto"] });
    await addMessage(t.id, "user", "Check architecture");
    markThreadRead(t.id);
    const updated = getThread(t.id)!;
    expect(updated.unread).toBe(0);
  });

  it("toggleFavorite toggles favorite status", async () => {
    const { createThread, toggleFavorite } = await import("@/lib/conversationStore");
    const t = createThread({ title: "Fav Test" });
    const favorited = toggleFavorite(t.id)!;
    expect(favorited.favorite).toBe(true);
    const unfavorited = toggleFavorite(t.id)!;
    expect(unfavorited.favorite).toBe(false);
  });

  it("searchThreads finds threads by title and message content", async () => {
    const { createThread, addMessage, searchThreads } = await import("@/lib/conversationStore");
    createThread({ title: "Branding Discussion" });
    const t2 = createThread({ title: "Random" });
    await addMessage(t2.id, "user", "I need a new logo for my startup");
    const results = searchThreads("logo");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("getTotalUnread returns sum of all thread unread counts", async () => {
    const { getTotalUnread, createThread, addMessage } = await import("@/lib/conversationStore");
    const before = getTotalUnread();
    const t = createThread({ title: "More Unread", participants: ["cfo"] });
    await addMessage(t.id, "user", "Check budget");
    const after = getTotalUnread();
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it("CEO chat sync persists to conversations.json", async () => {
    const { syncCeoMessageToConversation, getCeoThreadMessages } = await import("@/lib/conversationStore");
    syncCeoMessageToConversation("user", "Sync test message");
    const msgs = getCeoThreadMessages(5);
    const lastMsg = msgs[msgs.length - 1];
    expect(lastMsg.text).toBe("Sync test message");
    expect(lastMsg.role).toBe("user");
  });
});

// ─── Real AI Engine Tests ───────────────────────────────────────────────

describe("Real AI Response Engine", () => {
  beforeAll(() => { fileStore = {}; });

  it("conversation never responds with generic template", async () => {
    const { createThread, addMessage, getThread } = await import("@/lib/conversationStore");
    const t = createThread({ title: "No Template Test", participants: ["ceo"] });
    await addMessage(t.id, "user", "je veux un nouveau logo");
    const updated = getThread(t.id)!;
    const agentMsg = updated.messages.find((m) => m.role === "ceo");
    expect(agentMsg).toBeTruthy();
    // Must NOT contain the banned template phrase
    expect(agentMsg!.text).not.toContain("Je suis sur ton projet. Dis-moi ce dont tu as besoin");
    expect(agentMsg!.text).not.toContain("Je comprends votre demande");
  });

  it("response uses thread history for context", async () => {
    const { createThread, addMessage, getThread } = await import("@/lib/conversationStore");
    const t = createThread({ title: "Context Test", participants: ["cmo"] });
    await addMessage(t.id, "user", "Je veux un style sportif");
    await addMessage(t.id, "user", "Et premium aussi");
    const updated = getThread(t.id)!;
    // Should have multiple agent responses (one per user message)
    const agentMsgs = updated.messages.filter((m) => m.role === "cmo");
    expect(agentMsgs.length).toBeGreaterThanOrEqual(2);
    // Responses should be substantial, not generic
    for (const msg of agentMsgs) {
      expect(msg.text.length).toBeGreaterThan(15);
    }
  });

  it("direct agent response is role-specific", async () => {
    const { createThread, addMessage, getThread } = await import("@/lib/conversationStore");

    // CTO should respond about tech
    const ctoT = createThread({ title: "CTO Tech", participants: ["cto"] });
    await addMessage(ctoT.id, "user", "Quelle architecture pour mon site?");
    const ctoUpdated = getThread(ctoT.id)!;
    const ctoResp = ctoUpdated.messages.find((m) => m.role === "cto");
    expect(ctoResp).toBeTruthy();
    expect(ctoResp!.text.toLowerCase()).toMatch(/next\.js|architecture|stack|scalab|vercel/);

    // CFO should respond about finance
    const cfoT = createThread({ title: "CFO Finance", participants: ["cfo"] });
    await addMessage(cfoT.id, "user", "Calcule les taxes sur 1000$");
    const cfoUpdated = getThread(cfoT.id)!;
    const cfoResp = cfoUpdated.messages.find((m) => m.role === "cfo");
    expect(cfoResp).toBeTruthy();
    expect(cfoResp!.text.toLowerCase()).toMatch(/tps|tvq|tax|factur|diana/);
  });

  it("fallback is still intelligent when NVIDIA unavailable", async () => {
    // Without NVIDIA_API_KEY, the engine uses intelligent fallback
    const { createThread, addMessage, getThread } = await import("@/lib/conversationStore");
    const t = createThread({ title: "Fallback Intel", participants: ["cmo"] });
    await addMessage(t.id, "user", "Je veux un logo premium pour ma startup");
    const updated = getThread(t.id)!;
    const agentMsg = updated.messages.find((m) => m.role === "cmo");
    expect(agentMsg).toBeTruthy();
    // Fallback should be role-specific, not generic
    expect(agentMsg!.text.length).toBeGreaterThan(20);
    expect(agentMsg!.text).not.toContain("Je suis sur ton projet");
    // CMO fallback should mention branding/creative concepts
    expect(agentMsg!.text.toLowerCase()).toMatch(/brand|créati|design|logo|premium|apple|dribbble/);
  });

  it("CEO conversation uses ceoConversation engine", async () => {
    const { createThread, addMessage, getThread } = await import("@/lib/conversationStore");
    const t = createThread({ title: "CEO Engine Test", participants: ["ceo"] });
    await addMessage(t.id, "user", "Lance une mission pour un site e-commerce");
    const updated = getThread(t.id)!;
    const ceoMsg = updated.messages.find((m) => m.role === "ceo");
    expect(ceoMsg).toBeTruthy();
    expect(ceoMsg!.text.length).toBeGreaterThan(20);
    expect(ceoMsg!.text).not.toContain("Je comprends votre demande");
    expect(ceoMsg!.text).not.toContain("Je suis sur ton projet");
  });

  it("agent system prompt includes thread history", async () => {
    const { buildAgentSystemPrompt } = await import("@/lib/conversationStore");
    // This is an internal function test — it's exported for testing
    const thread = {
      id: "test-thread",
      title: "Test",
      folderId: null,
      participants: [{ id: "cmo" as ParticipantRole, name: "Sophie", avatar: "📣", color: "#8b5cf6" }],
      messages: [
        { id: "m1", role: "user" as const, text: "Je veux un logo", timestamp: new Date().toISOString() },
        { id: "m2", role: "cmo" as ParticipantRole, text: "On vise premium", timestamp: new Date().toISOString() },
        { id: "m3", role: "user" as const, text: "Style sportif", timestamp: new Date().toISOString() },
      ],
      linkedMissionId: "mission-123",
      linkedWorkspaceId: null,
      pinned: false,
      archived: false,
      unread: 0,
      typing: [],
      favorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const prompt = buildAgentSystemPrompt("cmo", thread);
    expect(prompt).toContain("Sophie");
    expect(prompt).toContain("Je veux un logo");
    expect(prompt).toContain("mission-123");
    expect(prompt).toContain("Never say");
  });
});
