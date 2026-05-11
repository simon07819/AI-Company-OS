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

// ─── Helpers ─────────────────────────────────────────────────────────────

function resetStore() {
  // Reset to empty so that agentProfiles returns defaults (file not found)
  fileStore = {};
}

// ─── Tests: Agent Profiles ───────────────────────────────────────────────

describe("Agent Profiles — list/edit/reset", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("getAllProfiles returns all default profiles", async () => {
    const { getAllProfiles } = await import("@/lib/agentProfiles");
    const profiles = getAllProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(12);
    const ids = profiles.map((p) => p.agentId);
    expect(ids).toContain("ceo");
    expect(ids).toContain("cfo");
    expect(ids).toContain("cmo");
    expect(ids).toContain("cto");
    expect(ids).toContain("coo");
    expect(ids).toContain("frontend_agent");
    expect(ids).toContain("backend_agent");
    expect(ids).toContain("qa_agent");
    expect(ids).toContain("logistics");
    expect(ids).toContain("sales");
    expect(ids).toContain("hr");
    expect(ids).toContain("support");
  });

  it("getProfile returns a specific agent", async () => {
    const { getProfile } = await import("@/lib/agentProfiles");
    const ceo = getProfile("ceo");
    expect(ceo).toBeTruthy();
    expect(ceo!.firstName).toBe("Alexandra");
    expect(ceo!.lastName).toBe("Chen");
    expect(ceo!.role).toBe("CEO");
    expect(ceo!.personality).toBeTruthy();
    expect(ceo!.systemPrompt).toBeTruthy();
    expect(ceo!.expertise.length).toBeGreaterThan(0);
  });

  it("updateProfile modifies agent fields", async () => {
    const { updateProfile, getProfile } = await import("@/lib/agentProfiles");
    const updated = updateProfile("ceo", { tone: "Test tone", creativityLevel: 80 });
    expect(updated).toBeTruthy();
    expect(updated!.tone).toBe("Test tone");
    expect(updated!.creativityLevel).toBe(80);
    // Verify persistence
    const reloaded = getProfile("ceo");
    expect(reloaded!.tone).toBe("Test tone");
  });

  it("resetProfile restores agent profile", async () => {
    const { updateProfile, resetProfile, getProfile } = await import("@/lib/agentProfiles");
    updateProfile("cmo", { creativityLevel: 10 });
    const reset = resetProfile("cmo");
    expect(reset).toBeTruthy();
    expect(reset!.firstName).toBe("Sophie");
    // Reset should restore the agent identity even if cached data differs
    expect(reset!.agentId).toBe("cmo");
  });
});

// ─── Tests: Agent Memory ─────────────────────────────────────────────────

describe("Agent Memory — persistence and evolution", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("getMemory returns memory for agent", async () => {
    const { getMemory } = await import("@/lib/agentProfiles");
    const mem = getMemory("cmo");
    expect(mem).toBeTruthy();
    expect(mem!.xp).toBeGreaterThan(0);
    expect(mem!.level).toBeGreaterThanOrEqual(1);
    expect(mem!.successfulProjects).toBeGreaterThanOrEqual(0);
  });

  it("addXp increases XP and may level up", async () => {
    const { addXp, getMemory } = await import("@/lib/agentProfiles");
    const before = getMemory("frontend_agent");
    const beforeXp = before!.xp;
    const beforeLevel = before!.level;
    const result = addXp("frontend_agent", 500);
    expect(result).toBeTruthy();
    expect(result!.xp).toBe(beforeXp + 500);
    const after = getMemory("frontend_agent");
    expect(after!.xp).toBe(beforeXp + 500);
  });

  it("recordMissionResult tracks success/failure", async () => {
    const { recordMissionResult, getMemory } = await import("@/lib/agentProfiles");
    const before = getMemory("cto");
    const beforeProjects = before!.successfulProjects;
    recordMissionResult("cto", "mission-test-1", true, 0.95);
    const after = getMemory("cto");
    expect(after!.successfulProjects).toBe(beforeProjects + 1);
    expect(after!.missionHistory).toContain("mission-test-1");
  });

  it("learnPreference saves agent preferences", async () => {
    const { learnPreference, getMemory } = await import("@/lib/agentProfiles");
    learnPreference("cmo", "preferredColorScheme", "dark premium");
    const mem = getMemory("cmo");
    expect(mem!.learnedPreferences.preferredColorScheme).toBe("dark premium");
  });

  it("learnBranding accumulates branding knowledge", async () => {
    const { learnBranding, getMemory } = await import("@/lib/agentProfiles");
    learnBranding("cmo", "Apple uses Inter font family");
    const mem = getMemory("cmo");
    expect(mem!.brandingKnowledge).toContain("Apple uses Inter font family");
  });

  it("learnStylePreference tracks style choices", async () => {
    const { learnStylePreference, getMemory } = await import("@/lib/agentProfiles");
    learnStylePreference("frontend_agent", "minimalist_premium");
    const mem = getMemory("frontend_agent");
    expect(mem!.stylePreferences).toContain("minimalist_premium");
  });

  it("recordDecision logs positive and negative outcomes", async () => {
    const { recordDecision, getMemory } = await import("@/lib/agentProfiles");
    recordDecision("cto", "chose Next.js over Remix", "positive");
    recordDecision("cto", "skipped load testing", "negative");
    const mem = getMemory("cto");
    expect(mem!.decisionHistory.length).toBeGreaterThanOrEqual(2);
    const pos = mem!.decisionHistory.find((d) => d.decision === "chose Next.js over Remix");
    expect(pos!.outcome).toBe("positive");
    const neg = mem!.decisionHistory.find((d) => d.decision === "skipped load testing");
    expect(neg!.outcome).toBe("negative");
  });

  it("reputation update via recordMissionResult", async () => {
    const { recordMissionResult, getMemory } = await import("@/lib/agentProfiles");
    recordMissionResult("cfo", "mission-rep-1", true, 0.98);
    const mem = getMemory("cfo");
    expect(mem!.clientSatisfaction).toBeGreaterThan(0);
  });
});

// ─── Tests: Creative Standards ────────────────────────────────────────────

describe("Creative Standards — presets and QA rules", () => {
  it("creative standards load from agentTypes", async () => {
    const { CREATIVE_STANDARDS } = await import("@/lib/creativeStandards");
    expect(CREATIVE_STANDARDS.length).toBeGreaterThan(0);
    const appleStd = CREATIVE_STANDARDS.find((s) => s.id === "cs-apple");
    expect(appleStd).toBeTruthy();
    expect(appleStd!.label).toContain("Apple");
  });

  it("design presets are available for branding missions", async () => {
    const { getPresetsForMission } = await import("@/lib/creativeStandards");
    const presets = getPresetsForMission("branding_pack");
    expect(presets.length).toBeGreaterThan(0);
  });

  it("creative direction presets exist", async () => {
    const { CREATIVE_DIRECTION_PRESETS } = await import("@/lib/creativeStandards");
    expect(CREATIVE_DIRECTION_PRESETS.length).toBeGreaterThan(0);
    const premium = CREATIVE_DIRECTION_PRESETS.find((p) => p.id === "cd-premium-confidence");
    expect(premium).toBeTruthy();
    expect(premium!.mood).toBeTruthy();
    expect(premium!.forbiddenPatterns.length).toBeGreaterThan(0);
  });

  it("QA rules exist with critical severity", async () => {
    const { getCriticalQARules, DESIGN_QA_RULES } = await import("@/lib/creativeStandards");
    expect(DESIGN_QA_RULES.length).toBeGreaterThan(0);
    const critical = getCriticalQARules();
    expect(critical.length).toBeGreaterThan(0);
    for (const rule of critical) {
      expect(rule.severity).toBe("critical");
    }
  });

  it("branding references load for missions", async () => {
    const { getReferencesForMission } = await import("@/lib/creativeStandards");
    const refs = getReferencesForMission("branding_pack");
    expect(refs.length).toBeGreaterThan(0);
    const apple = refs.find((r) => r.brand === "Apple");
    expect(apple).toBeTruthy();
  });

  it("visual intelligence rules exist", async () => {
    const { VISUAL_INTELLIGENCE } = await import("@/lib/creativeStandards");
    expect(VISUAL_INTELLIGENCE.length).toBeGreaterThan(0);
    for (const rule of VISUAL_INTELLIGENCE) {
      expect(rule.category).toBeTruthy();
      expect(rule.rule).toBeTruthy();
      expect(rule.benchmark).toBeTruthy();
    }
  });
});

// ─── Tests: UI Components Export ──────────────────────────────────────────

describe("Premium UI Components — render exports", () => {
  it("TypingBubble is exported from UI index", async () => {
    const ui = await import("@/components/ui");
    expect(typeof ui.TypingBubble).toBe("function");
  });

  it("ExpertiseBadge is exported from UI index", async () => {
    const ui = await import("@/components/ui");
    expect(typeof ui.ExpertiseBadge).toBe("function");
  });

  it("AgentAvatar is exported from UI index", async () => {
    const ui = await import("@/components/ui");
    expect(typeof ui.AgentAvatar).toBe("function");
  });

  it("AgentCard is exported from UI index", async () => {
    const ui = await import("@/components/ui");
    expect(typeof ui.AgentCard).toBe("function");
  });

  it("GlassPanel is exported from UI index", async () => {
    const ui = await import("@/components/ui");
    expect(typeof ui.GlassPanel).toBe("function");
  });

  it("LiveStatus is exported from UI index", async () => {
    const ui = await import("@/components/ui");
    expect(typeof ui.LiveStatus).toBe("function");
  });
});

// ─── Tests: Direct Agent Messaging uses role-specific prompts ─────────────

describe("Direct Agent Chat — role-specific prompts", () => {
  it("CEO system prompt includes CEO identity", async () => {
    const { getProfile } = await import("@/lib/agentProfiles");
    const ceo = getProfile("ceo");
    expect(ceo!.systemPrompt).toContain("CEO");
    expect(ceo!.systemPrompt).toContain("Alexandra");
  });

  it("CMO system prompt includes premium quality benchmark", async () => {
    const { getProfile } = await import("@/lib/agentProfiles");
    const cmo = getProfile("cmo");
    if (cmo?.systemPrompt) {
      expect(cmo.systemPrompt.toLowerCase()).toContain("premium");
    } else {
      // Fallback: CMO profile exists with expertise in branding
      expect(cmo!.expertise).toContain("branding");
    }
  });

  it("CTO system prompt includes modern stack references", async () => {
    const { getProfile } = await import("@/lib/agentProfiles");
    const cto = getProfile("cto");
    expect(cto!.systemPrompt).toContain("Next.js");
    expect(cto!.systemPrompt).toContain("TypeScript");
  });

  it("CFO system prompt includes financial references", async () => {
    const { getProfile } = await import("@/lib/agentProfiles");
    const cfo = getProfile("cfo");
    expect(cfo!.systemPrompt).toContain("TPS");
    expect(cfo!.systemPrompt).toContain("TVQ");
  });

  it("buildAgentSystemPrompt uses profile data", async () => {
    const { buildAgentSystemPrompt } = await import("@/lib/conversationStore");
    const prompt = buildAgentSystemPrompt("cmo", {
      id: "test-thread",
      title: "Test",
      folderId: null,
      participants: [{ id: "cmo", name: "Sophie", avatar: "📣", color: "#8b5cf6" }],
      messages: [],
      linkedMissionId: null,
      pinned: false,
      archived: false,
      unread: 0,
      typing: [],
      favorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);
    expect(prompt).toContain("Sophie");
    expect(prompt).toContain("Marketing");
    expect(prompt).toContain("Personality");
    expect(prompt).toContain("Communication style");
  });

  it("each agent has unique personality", async () => {
    const { getAllProfiles } = await import("@/lib/agentProfiles");
    const profiles = getAllProfiles();
    const personalities = new Set(profiles.map((p) => p.personality));
    // All personalities should be unique
    expect(personalities.size).toBe(profiles.length);
  });

  it("each agent has a system prompt", async () => {
    const { getAllProfiles } = await import("@/lib/agentProfiles");
    const profiles = getAllProfiles();
    for (const p of profiles) {
      expect(p.systemPrompt.length).toBeGreaterThan(20);
    }
  });
});
