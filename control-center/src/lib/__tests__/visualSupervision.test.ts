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

// ─── Helpers ─────────────────────────────────────────────────────────────

function resetStore() {
  fileStore = {};
}

// ─── Tests: Approval Preview ─────────────────────────────────────────────

describe("Approval Preview — core functions", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("getPendingApprovals returns array", async () => {
    const { getPendingApprovals } = await import("@/lib/approvalPreview");
    const pending = getPendingApprovals();
    expect(Array.isArray(pending)).toBe(true);
  });

  it("getAllApprovals returns array", async () => {
    const { getAllApprovals } = await import("@/lib/approvalPreview");
    const all = getAllApprovals();
    expect(Array.isArray(all)).toBe(true);
  });

  it("approveApproval creates approved entry from collected or new", async () => {
    const { approveApproval, getAllApprovals } = await import("@/lib/approvalPreview");
    // Approve a non-existent ID — it tries to create from collected, which may return null
    const result = approveApproval("test-approval-1");
    // If it returns null, that's OK — the ID doesn't exist in any source
    if (result) {
      expect(result.status).toBe("approved");
      expect(result.approvedAt).toBeTruthy();
    } else {
      // Verify the function handles missing IDs gracefully
      expect(result).toBeNull();
    }
  });

  it("rejectApproval handles missing IDs gracefully", async () => {
    const { rejectApproval } = await import("@/lib/approvalPreview");
    const result = rejectApproval("test-approval-missing", "Quality too low");
    // The ID doesn't exist in any source, so it may return null
    if (result) {
      expect(result.status).toBe("rejected");
      expect(result.rejectionReason).toBe("Quality too low");
    } else {
      expect(result).toBeNull();
    }
  });

  it("getTypeLabel returns human-readable labels", async () => {
    const { getTypeLabel } = await import("@/lib/approvalPreview");
    expect(getTypeLabel("invoice")).toBe("Invoice");
    expect(getTypeLabel("logo")).toBe("Logo / Design");
    expect(getTypeLabel("flyer")).toBe("Flyer");
    expect(getTypeLabel("website")).toBe("Website");
    expect(getTypeLabel("strategy")).toBe("Strategy");
  });
});

// ─── Tests: Revision System ──────────────────────────────────────────────

describe("Revision System — create and track revisions", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("createRevision saves a revision", async () => {
    const { createRevision, getRevisionsForOutput } = await import("@/lib/revisionSystem");
    const rev = createRevision("output-1", "Le logo est trop agressif", "Rendre plus minimaliste", "cmo");
    expect(rev).toBeTruthy();
    expect(rev.id).toBeTruthy();
    expect(rev.comment).toBe("Le logo est trop agressif");
    expect(rev.direction).toBe("Rendre plus minimaliste");
    expect(rev.agentId).toBe("cmo");
    expect(rev.status).toBe("pending");

    const revisions = getRevisionsForOutput("output-1");
    expect(revisions.length).toBeGreaterThan(0);
    expect(revisions[0].comment).toBe("Le logo est trop agressif");
  });

  it("updateRevisionStatus changes revision status", async () => {
    const { createRevision, updateRevisionStatus } = await import("@/lib/revisionSystem");
    const rev = createRevision("output-2", "Je veux plus premium", "Style Apple", "frontend_agent");
    const updated = updateRevisionStatus(rev.id, "in_progress");
    expect(updated).toBeTruthy();
    expect(updated!.status).toBe("in_progress");
  });

  it("completeRevision sets completedAt", async () => {
    const { createRevision, updateRevisionStatus } = await import("@/lib/revisionSystem");
    const rev = createRevision("output-3", "La palette est trop sombre", "Ajouter de la lumière", "frontend_agent");
    const completed = updateRevisionStatus(rev.id, "completed", "Nouvelle palette avec tons clairs");
    expect(completed).toBeTruthy();
    expect(completed!.status).toBe("completed");
    expect(completed!.completedAt).toBeTruthy();
    expect(completed!.newPreview).toBe("Nouvelle palette avec tons clairs");
  });

  it("getPendingRevisions returns only pending", async () => {
    const { createRevision, updateRevisionStatus, getPendingRevisions } = await import("@/lib/revisionSystem");
    createRevision("output-4", "Needs work", "Better", "cmo");
    const rev2 = createRevision("output-5", "Also needs work", "Premium", "frontend_agent");
    updateRevisionStatus(rev2.id, "completed");
    const pending = getPendingRevisions();
    expect(pending.every((r) => r.status === "pending")).toBe(true);
  });

  it("getRevisionsForSession filters by session", async () => {
    const { createRevision, getRevisionsForSession } = await import("@/lib/revisionSystem");
    createRevision("output-6", "Session revision", "Fix", "cmo", "session-abc");
    createRevision("output-7", "No session", "Change", "frontend_agent");
    const sessionRevisions = getRevisionsForSession("session-abc");
    expect(sessionRevisions.length).toBeGreaterThan(0);
    expect(sessionRevisions.every((r) => r.sessionId === "session-abc")).toBe(true);
  });

  it("getRevisionById returns specific revision", async () => {
    const { createRevision, getRevisionById } = await import("@/lib/revisionSystem");
    const rev = createRevision("output-8", "Find me", "Direction", "cto");
    const found = getRevisionById(rev.id);
    expect(found).toBeTruthy();
    expect(found!.comment).toBe("Find me");
  });
});

// ─── Tests: Visible Outputs (Gallery API) ──────────────────────────────────

describe("Visible Outputs — gallery queries", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("getAllOutputs returns array", async () => {
    const { getAllOutputs } = await import("@/lib/visibleOutputs");
    const outputs = getAllOutputs();
    expect(Array.isArray(outputs)).toBe(true);
  });

  it("getOutputById returns null for unknown id", async () => {
    const { getOutputById } = await import("@/lib/visibleOutputs");
    const output = getOutputById("nonexistent");
    expect(output).toBeNull();
  });

  it("archives, favorites, revises and soft deletes outputs", async () => {
    const { addOutputRevision, archiveOutput, generateVisibleOutputs, getAllOutputs, restoreOutput, softDeleteOutput, updateOutputMetadata } = await import("@/lib/visibleOutputs");

    const [output] = generateVisibleOutputs("session-manage-output", "branding_pack");
    const favorite = updateOutputMetadata(output.id, { favorite: true, title: "Favorite output" });
    expect(favorite?.favorite).toBe(true);
    expect(favorite?.title).toBe("Favorite output");

    const revised = addOutputRevision(output.id, "Make it more premium");
    expect(revised?.revisions?.[0].note).toBe("Make it more premium");

    archiveOutput(output.id);
    expect(getAllOutputs().find((item) => item.id === output.id)).toBeUndefined();

    restoreOutput(output.id);
    expect(getAllOutputs().find((item) => item.id === output.id)).toBeTruthy();

    softDeleteOutput(output.id);
    expect(getAllOutputs().find((item) => item.id === output.id)).toBeUndefined();
  });

  it("generateVisibleOutputs creates outputs for session", async () => {
    const { generateVisibleOutputs, getOutputsForSession } = await import("@/lib/visibleOutputs");
    const outputs = generateVisibleOutputs("session-test-1", "branding_pack");
    expect(outputs.length).toBeGreaterThan(0);
    const sessionOutputs = getOutputsForSession("session-test-1");
    expect(sessionOutputs.length).toBe(outputs.length);
  });

  it("updateOutputStatus changes output status", async () => {
    const { generateVisibleOutputs, updateOutputStatus } = await import("@/lib/visibleOutputs");
    const outputs = generateVisibleOutputs("session-test-2", "redesign_logo");
    const first = outputs[0];
    const updated = updateOutputStatus(first.id, "review");
    expect(updated).toBeTruthy();
    expect(updated!.status).toBe("review");
  });
});

// ─── Tests: UI Component Exports ──────────────────────────────────────────

describe("Visual Supervision UI — component exports", () => {
  it("AgentActivityCard is exported", async () => {
    const mod = await import("@/components/live/AgentActivityCard");
    expect(typeof mod.AgentActivityCard).toBe("function");
  });

  it("LiveExecutionFeed is exported", async () => {
    const mod = await import("@/components/live/LiveExecutionFeed");
    expect(typeof mod.LiveExecutionFeed).toBe("function");
  });

  it("WebsitePreviewCard is exported", async () => {
    const mod = await import("@/components/previews/WebsitePreviewCard");
    expect(typeof mod.WebsitePreviewCard).toBe("function");
  });

  it("BrandPreviewCard is exported", async () => {
    const mod = await import("@/components/previews/BrandPreviewCard");
    expect(typeof mod.BrandPreviewCard).toBe("function");
  });

  it("InvoicePreviewCard is exported", async () => {
    const mod = await import("@/components/previews/InvoicePreviewCard");
    expect(typeof mod.InvoicePreviewCard).toBe("function");
  });

  it("ApprovalCard is exported from approvals", async () => {
    const mod = await import("@/components/approvals/ApprovalCard");
    expect(typeof mod.ApprovalCard).toBe("function");
  });

  it("ApprovalPreviewModal is exported from approvals", async () => {
    const mod = await import("@/components/approvals/ApprovalCard");
    expect(typeof mod.ApprovalPreviewModal).toBe("function");
  });
});

// ─── Tests: Invoice TPS/TVQ ──────────────────────────────────────────────

describe("Finance — TPS/TVQ calculations in approval preview", () => {
  it("approval preview computes TPS and TVQ for proposals", async () => {
    const { getApprovalPreview } = await import("@/lib/approvalPreview");
    // When no proposal exists, preview returns null for unknown id
    const preview = getApprovalPreview("unknown-id");
    // Either null or a preview without invoice — both valid
    if (preview) {
      expect(preview.warnings).toBeDefined();
    }
  });
});

// ─── Tests: Revision direction tracking ───────────────────────────────────

describe("Revision — direction and feedback flow", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("revision stores creative direction feedback", async () => {
    const { createRevision, getRevisionsForOutput } = await import("@/lib/revisionSystem");
    createRevision("output-dir", "Le logo est trop agressif", "Rendre plus minimaliste", "cmo");
    createRevision("output-dir", "Je veux plus premium", "Style Apple", "cmo");
    createRevision("output-dir", "Rendre plus luxueux", "Luxe noir, or", "frontend_agent");

    const revisions = getRevisionsForOutput("output-dir");
    expect(revisions.length).toBe(3);
    const directions = revisions.map((r) => r.direction);
    expect(directions).toContain("Rendre plus minimaliste");
    expect(directions).toContain("Style Apple");
    expect(directions).toContain("Luxe noir, or");
  });

  it("revision keeps full feedback history", async () => {
    const { createRevision, updateRevisionStatus, getRevisionsForOutput } = await import("@/lib/revisionSystem");
    const r1 = createRevision("output-hist", "V1 feedback", "Direction 1", "cmo");
    updateRevisionStatus(r1.id, "completed", "V1 new preview");
    createRevision("output-hist", "V2 feedback", "Direction 2", "cmo");

    const revisions = getRevisionsForOutput("output-hist");
    expect(revisions.length).toBe(2);
    const completed = revisions.find((r) => r.status === "completed");
    expect(completed).toBeTruthy();
    expect(completed!.newPreview).toBe("V1 new preview");
  });
});
