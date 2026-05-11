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
    const msg = addMessage(thread.id, "user", "Prépare-moi une facture avec TPS/TVQ");

    expect(msg).not.toBeNull();
    expect(msg!.role).toBe("user");
    expect(msg!.text).toContain("facture");

    // Verify the thread now has the agent auto-response
    const { getThread } = await import("@/lib/conversationStore");
    const updated = getThread(thread.id);
    expect(updated!.messages.length).toBe(2);
    expect(updated!.messages[1].role).toBe("cfo");
    expect(updated!.messages[1].text).toContain("facture");
  });

  it("continues an existing thread", async () => {
    const { createThread, continueThread, getThread } = await import("@/lib/conversationStore");
    const thread = createThread({ title: "CEO Chat", participants: ["ceo"] });
    continueThread(thread.id, "What's the status?");
    continueThread(thread.id, "Any updates?");

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
    addMessage(cfoThread.id, "user", "Prépare-moi une facture avec TPS/TVQ");
    const cfoUpdated = getThread(cfoThread.id);
    const cfoResponse = cfoUpdated!.messages.find((m) => m.role === "cfo");
    expect(cfoResponse!.text).toContain("facture");

    // Logistics responds about dropshipping
    const logThread = createThread({ title: "Logistics Chat", participants: ["logistics"] });
    addMessage(logThread.id, "user", "Trouve comment gérer les commandes dropshipping");
    const logUpdated = getThread(logThread.id);
    const logResponse = logUpdated!.messages.find((m) => m.role === "logistics");
    expect(logResponse!.text).toContain("workflow");
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
