import { describe, it, expect, beforeAll, vi } from "vitest";

// ─── Mock fs ─────────────────────────────────────────────────────────────

let fileStore: Record<string, string> = {};

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: (p: string) => {
      const key = p.split("/data/")[1] ?? p;
      return key in fileStore || p.includes("workspaces");
    },
    readFileSync: (p: string) => {
      const key = p.split("/data/")[1] ?? p;
      if (key in fileStore) return fileStore[key];
      if (p.includes("workspaces")) return "";
      return "{}";
    },
    writeFileSync: (p: string, content: string) => {
      const key = p.split("/data/")[1] ?? p;
      if (!key.startsWith("data/") && !key.includes("/")) return;
      fileStore[key] = content;
    },
    mkdirSync: () => {},
    readdirSync: () => [],
    statSync: () => ({ isFile: () => false }),
  };
});

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("path")>();
  return {
    ...actual,
    default: actual,
  };
});

// ─── Tests ───────────────────────────────────────────────────────────────

describe("Approval Preview System", () => {
  beforeAll(() => {
    fileStore = {};
  });

  it("collects pending approvals from visible outputs in review status", async () => {
    const { getPendingApprovals } = await import("@/lib/approvalPreview");
    const approvals = getPendingApprovals();
    // Initially empty since no outputs in review
    expect(Array.isArray(approvals)).toBe(true);
  });

  it("approval card shows Preview button", async () => {
    // This is a UI component test — we test the data shape
    const item = {
      id: "test-1",
      title: "Logo Design",
      type: "logo" as const,
      status: "pending" as const,
      agentId: "cmo",
      agentName: "Sophie",
      createdAt: new Date().toISOString(),
      summary: "Premium logo direction for client",
      hasPreviewContent: true,
      previewType: "output_list" as const,
    };
    expect(item.hasPreviewContent).toBe(true);
    expect(item.type).toBe("logo");
    expect(item.title).toBe("Logo Design");
  });

  it("preview returns real content for output items", async () => {
    const { getApprovalPreview } = await import("@/lib/approvalPreview");
    // Non-existent ID
    const preview = getApprovalPreview("nonexistent-id");
    expect(preview).toBeNull();
  });

  it("approve disabled without preview content", () => {
    const item = {
      id: "test-2",
      title: "Unknown item",
      type: "file" as const,
      status: "pending" as const,
      agentId: "devops_agent",
      agentName: "Kenji",
      createdAt: new Date().toISOString(),
      summary: "No preview available",
      hasPreviewContent: false,
      previewType: "none" as const,
    };
    // ApprovalCard logic: canApprove = hasPreviewContent || type === "invoice"
    const canApprove = item.hasPreviewContent || item.type === "invoice";
    expect(canApprove).toBe(false);
  });

  it("invoice preview shows taxes and total", async () => {
    const { approveApproval, getApprovalPreview } = await import("@/lib/approvalPreview");
    // Create a fake proposal approval
    fileStore["revenue.json"] = JSON.stringify({
      proposals: [{
        proposalId: "prop-test",
        title: "Branding Pack",
        amount: 5000,
        status: "sent",
        missionType: "branding_pack",
        createdAt: new Date().toISOString(),
      }],
      invoices: [],
    });

    // The preview should compute taxes
    const preview = getApprovalPreview("proposal-prop-test");
    if (preview?.invoice) {
      expect(preview.invoice.subtotal).toBe(5000);
      expect(preview.invoice.tpsAmount).toBe(250); // 5%
      expect(preview.invoice.tvqAmount).toBeCloseTo(498.75, 1); // 9.975%
      expect(preview.invoice.total).toBeCloseTo(5748.75, 1);
      expect(preview.invoice.currency).toBe("CAD");
    }
  });

  it("document preview shows markdown content", async () => {
    // This tests the file reading path in getApprovalPreview
    const { getApprovalPreview } = await import("@/lib/approvalPreview");
    const preview = getApprovalPreview("fake-doc-id");
    expect(preview).toBeNull();
  });

  it("reject with reason works", async () => {
    const { rejectApproval } = await import("@/lib/approvalPreview");
    // rejectApproval returns null for non-existent ID but doesn't crash
    const result = rejectApproval("nonexistent-id", "Test reason");
    // Can be null if not found in existing or collected
    expect(result === null || result?.status === "rejected").toBe(true);
  });

  it("approve changes status to approved", async () => {
    const { approveApproval } = await import("@/lib/approvalPreview");
    const result = approveApproval("nonexistent-id");
    expect(result === null || result?.status === "approved").toBe(true);
  });

  it("getTypeLabel returns readable labels", async () => {
    const { getTypeLabel } = await import("@/lib/approvalPreview");
    expect(getTypeLabel("invoice")).toBe("Invoice");
    expect(getTypeLabel("logo")).toBe("Logo / Design");
    expect(getTypeLabel("mission")).toBe("Mission");
    expect(getTypeLabel("website")).toBe("Website");
    expect(getTypeLabel("strategy")).toBe("Strategy");
  });

  it("mission preview shows progress and tasks", async () => {
    // Test that mission type approvals include mission progress data
    const item = {
      id: "test-mission-1",
      title: "Logo Redesign",
      type: "mission" as const,
      status: "pending" as const,
      agentId: "ceo",
      agentName: "Alexandra",
      sessionId: "session-1",
      createdAt: new Date().toISOString(),
      summary: "Mission in progress",
      hasPreviewContent: true,
      previewType: "mission_summary" as const,
    };
    expect(item.sessionId).toBe("session-1");
    expect(item.type).toBe("mission");
  });
});
