import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ─── Mock fs ──────────────────────────────────────────────────────────────

let fileStore: Record<string, string> = {};

vi.mock("fs", () => ({
  default: {
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

// ─── Helpers ─────────────────────────────────────────────────────────────

function resetStore() {
  fileStore = {};
}

// ─── detectConversationIntent ─────────────────────────────────────────────

describe("detectConversationIntent", () => {
  beforeEach(resetStore);

  it("detects greeting", async () => {
    const { detectConversationIntent } = await import("@/lib/ceoConversation");
    expect(detectConversationIntent("bonjour!")).toBe("greeting");
    expect(detectConversationIntent("hello there")).toBe("greeting");
    expect(detectConversationIntent("salut")).toBe("greeting");
  });

  it("detects dropshipping", async () => {
    const { detectConversationIntent } = await import("@/lib/ceoConversation");
    expect(detectConversationIntent("je veux lancer un dropshipping store")).toBe("dropshipping");
    expect(detectConversationIntent("dropship business ideas")).toBe("dropshipping");
  });

  it("detects ecommerce", async () => {
    const { detectConversationIntent } = await import("@/lib/ceoConversation");
    expect(detectConversationIntent("je veux ouvrir une boutique en ligne")).toBe("ecommerce");
    expect(detectConversationIntent("créer une boutique shopify")).toBe("ecommerce");
  });

  it("detects financial intent", async () => {
    const { detectConversationIntent } = await import("@/lib/ceoConversation");
    expect(detectConversationIntent("combien ça va coûter?")).toBe("financial");
    expect(detectConversationIntent("créer une facture")).toBe("financial");
  });

  it("detects marketing intent", async () => {
    const { detectConversationIntent } = await import("@/lib/ceoConversation");
    expect(detectConversationIntent("je veux faire du marketing sur tiktok")).toBe("marketing");
    expect(detectConversationIntent("lancer une campagne ads")).toBe("marketing");
  });

  it("detects problem intent", async () => {
    const { detectConversationIntent } = await import("@/lib/ceoConversation");
    expect(detectConversationIntent("j'ai un problème avec mon site")).toBe("problem");
    expect(detectConversationIntent("there's a bug in the system")).toBe("problem");
  });

  it("detects small talk", async () => {
    const { detectConversationIntent } = await import("@/lib/ceoConversation");
    expect(detectConversationIntent("merci!")).toBe("small_talk");
    expect(detectConversationIntent("comment tu vas")).toBe("small_talk");
  });

  it("falls back to unknown for unrecognized text", async () => {
    const { detectConversationIntent } = await import("@/lib/ceoConversation");
    expect(detectConversationIntent("xyzzy")).toBe("unknown");
    expect(detectConversationIntent("abc def ghi")).toBe("unknown");
  });
});

// ─── generateSmartResponse ────────────────────────────────────────────────

describe("generateSmartResponse", () => {
  beforeEach(resetStore);

  it("never returns the old template string", async () => {
    const { generateSmartResponse } = await import("@/lib/ceoConversation");
    const BANNED_PHRASE = "Je comprends votre demande";
    // Run many times to cover variants
    for (let i = 0; i < 20; i++) {
      const text = generateSmartResponse("unknown");
      expect(text).not.toContain(BANNED_PHRASE);
    }
    for (let i = 0; i < 10; i++) {
      const text = generateSmartResponse("greeting");
      expect(text).not.toContain(BANNED_PHRASE);
    }
  });

  it("greeting responses always mention CEO", async () => {
    const { generateSmartResponse } = await import("@/lib/ceoConversation");
    for (let i = 0; i < 15; i++) {
      const text = generateSmartResponse("greeting");
      expect(text).toContain("CEO");
    }
  });

  it("returns different responses on successive calls (no lock-in)", async () => {
    const { generateSmartResponse } = await import("@/lib/ceoConversation");
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      seen.add(generateSmartResponse("business_mission"));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("handles all known intents without throwing", async () => {
    const { generateSmartResponse } = await import("@/lib/ceoConversation");
    const intents = [
      "greeting", "small_talk", "question", "business_mission",
      "ecommerce", "dropshipping", "marketing", "financial",
      "supervision", "problem", "create_website", "create_flyer",
      "status_check", "delegate", "unknown",
      "launch_mission", "create_invoice", "create_dropshipping_business",
      "review_business", "delegate_tasks",
    ];
    for (const intent of intents) {
      const text = generateSmartResponse(intent);
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

// ─── generateSmartResponseAsync ──────────────────────────────────────────

describe("generateSmartResponseAsync", () => {
  beforeEach(resetStore);
  afterEach(() => { vi.unstubAllEnvs(); });

  it("returns simulation mode when no NVIDIA key configured", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "");
    const { generateSmartResponseAsync } = await import("@/lib/ceoConversation");
    const result = await generateSmartResponseAsync("greeting", "bonjour");
    expect(result.mode).toBe("simulation");
    expect(result.text).toBeTruthy();
    expect(result.text).toContain("CEO");
  });

  it("returns simulation mode when NVIDIA key is too short", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "abc");
    const { generateSmartResponseAsync } = await import("@/lib/ceoConversation");
    const result = await generateSmartResponseAsync("dropshipping", "je veux du dropshipping");
    expect(result.mode).toBe("simulation");
    expect(typeof result.text).toBe("string");
  });

  it("simulation fallback text is never the old template", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "");
    const { generateSmartResponseAsync } = await import("@/lib/ceoConversation");
    const intents = ["unknown", "greeting", "business_mission", "financial"];
    for (const intent of intents) {
      const result = await generateSmartResponseAsync(intent, "test");
      expect(result.text).not.toContain("Je comprends votre demande");
    }
  });
});

// ─── CEO Memory ───────────────────────────────────────────────────────────

describe("CEO memory", () => {
  beforeEach(resetStore);

  it("persists memory across calls", async () => {
    const { updateCeoMemory, getCeoMemory } = await import("@/lib/ceoConversation");

    updateCeoMemory("dropshipping", "je veux lancer une boutique dropshipping de vêtements");
    const mem = getCeoMemory();

    expect(mem.messageCount).toBeGreaterThan(0);
    expect(mem.recentIntents).toContain("dropshipping");
    expect(mem.entries.some((e) => e.type === "goal")).toBe(true);
  });

  it("records goals for mission intents", async () => {
    const { updateCeoMemory, getCeoMemory } = await import("@/lib/ceoConversation");

    updateCeoMemory("business_mission", "build a SaaS product for HR teams");
    updateCeoMemory("ecommerce", "open a shopify store for pet products");

    const mem = getCeoMemory();
    const goals = mem.entries.filter((e) => e.type === "goal");
    expect(goals.length).toBe(2);
    expect(goals[0].content).toContain("SaaS");
    expect(goals[1].content).toContain("pet");
  });

  it("does not record goals for non-mission intents", async () => {
    const { updateCeoMemory, getCeoMemory } = await import("@/lib/ceoConversation");

    updateCeoMemory("greeting", "bonjour");
    updateCeoMemory("small_talk", "ça va?");
    updateCeoMemory("question", "pourquoi?");

    const mem = getCeoMemory();
    expect(mem.entries.filter((e) => e.type === "goal")).toHaveLength(0);
  });

  it("records decisions", async () => {
    const { recordCeoDecision, getCeoMemory } = await import("@/lib/ceoConversation");

    recordCeoDecision("approved: launch-dropshipping-boutique");
    const mem = getCeoMemory();

    const decisions = mem.entries.filter((e) => e.type === "decision");
    expect(decisions.length).toBe(1);
    expect(decisions[0].content).toContain("approved");
  });

  it("tracks recent intents correctly", async () => {
    const { updateCeoMemory, getCeoMemory } = await import("@/lib/ceoConversation");

    updateCeoMemory("greeting", "bonjour");
    updateCeoMemory("dropshipping", "dropshipping store");
    updateCeoMemory("financial", "combien ça coûte");

    const mem = getCeoMemory();
    expect(mem.recentIntents).toContain("greeting");
    expect(mem.recentIntents).toContain("dropshipping");
    expect(mem.recentIntents).toContain("financial");
    expect(mem.messageCount).toBe(3);
  });

  it("caps entries at 50", async () => {
    const { updateCeoMemory, getCeoMemory } = await import("@/lib/ceoConversation");

    // Write 60 goal-type entries
    for (let i = 0; i < 60; i++) {
      updateCeoMemory("business_mission", `mission number ${i}`);
    }

    const mem = getCeoMemory();
    expect(mem.entries.length).toBeLessThanOrEqual(50);
  });
});

// ─── getThinkingState ─────────────────────────────────────────────────────

describe("getThinkingState", () => {
  it("returns delegating for launch intents", async () => {
    const { getThinkingState } = await import("@/lib/ceoConversation");
    expect(getThinkingState("business_mission")).toBe("delegating");
    expect(getThinkingState("ecommerce")).toBe("delegating");
    expect(getThinkingState("dropshipping")).toBe("delegating");
    expect(getThinkingState("create_website")).toBe("delegating");
    expect(getThinkingState("launch_mission")).toBe("delegating");
    expect(getThinkingState("create_dropshipping_business")).toBe("delegating");
  });

  it("returns reviewing for status/supervision intents", async () => {
    const { getThinkingState } = await import("@/lib/ceoConversation");
    expect(getThinkingState("status_check")).toBe("reviewing");
    expect(getThinkingState("review_business")).toBe("reviewing");
    expect(getThinkingState("supervision")).toBe("reviewing");
  });

  it("returns concluding for financial intents", async () => {
    const { getThinkingState } = await import("@/lib/ceoConversation");
    expect(getThinkingState("financial")).toBe("concluding");
    expect(getThinkingState("create_invoice")).toBe("concluding");
  });

  it("defaults to analyzing for unknown/conversational intents", async () => {
    const { getThinkingState } = await import("@/lib/ceoConversation");
    expect(getThinkingState("greeting")).toBe("analyzing");
    expect(getThinkingState("unknown")).toBe("analyzing");
    expect(getThinkingState("small_talk")).toBe("analyzing");
    expect(getThinkingState("question")).toBe("analyzing");
  });
});
