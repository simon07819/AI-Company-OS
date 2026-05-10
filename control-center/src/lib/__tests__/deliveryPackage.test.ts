import { describe, expect, it, vi, beforeEach } from "vitest";
import path from "path";
import type { AutopilotSession } from "@/lib/autopilotStore";
import type { ReviewReport } from "@/lib/deliverableReview";

// ─── Mock setup ──────────────────────────────────────────────────────────────

const fileStore = new Map<string, string>();

vi.mock("fs", () => {
  const existsSync = vi.fn((p: string) => fileStore.has(p));
  const readFileSync = vi.fn((p: string) => fileStore.get(p) ?? "");
  const writeFileSync = vi.fn((p: string, data: string) => { fileStore.set(p, data); });
  const mkdirSync = vi.fn();
  const statSync = vi.fn((p: string) => {
    const content = fileStore.get(p);
    return { size: content ? Buffer.byteLength(content, "utf-8") : 0 };
  });

  return {
    default: { existsSync, readFileSync, writeFileSync, mkdirSync, statSync },
    existsSync, readFileSync, writeFileSync, mkdirSync, statSync,
  };
});

// ─── Path helpers ─────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(process.cwd(), "..");
const WORKSPACES_ROOT = path.join(REPO_ROOT, "generated", "autopilot-workspaces");
const SESSION_ID = "ap-delivery-test-001";
const WS = path.join(WORKSPACES_ROOT, SESSION_ID);

function wsFile(rel: string): string {
  return path.join(WS, rel);
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_SESSION: AutopilotSession = {
  sessionId: SESSION_ID,
  projectName: "TestApp",
  projectIdea: "A SaaS app for team workflow automation.",
  missionType: "saas_project",
  status: "completed",
  tasks: [],
  log: [],
  roadmap: ["Design the MVP", "Build core features", "Launch beta"],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T12:00:00.000Z",
};

function makeReview(overrides: Partial<ReviewReport> = {}): ReviewReport {
  return {
    sessionId: SESSION_ID,
    globalScore: 100,
    status: "approved",
    clientReady: true,
    generatedAt: "2024-01-01T10:00:00.000Z",
    updatedAt: "2024-01-01T11:00:00.000Z",
    deliverables: [
      {
        path: "product/brief.md",
        name: "brief.md",
        score: 100,
        status: "approved",
        checks: [],
        warnings: [],
        reviewedAt: "2024-01-01T10:00:00.000Z",
        approvedAt: "2024-01-01T11:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("deliveryPackage — generateDeliveryPackage", () => {
  beforeEach(() => {
    fileStore.clear();
    vi.clearAllMocks();
  });

  it("writes all 6 delivery files", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    generateDeliveryPackage(MOCK_SESSION, makeReview());

    const expectedFiles = [
      "delivery/client-summary.md",
      "delivery/deliverables-index.md",
      "delivery/approval-status.md",
      "delivery/next-steps.md",
      "delivery/handoff-checklist.md",
      "delivery/delivery-manifest.json",
    ];

    for (const rel of expectedFiles) {
      expect(fileStore.has(wsFile(rel))).toBe(true);
    }
  });

  it("returns package with clientReady: true when review is approved", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    const pkg = generateDeliveryPackage(MOCK_SESSION, makeReview());

    expect(pkg.clientReady).toBe(true);
    expect(pkg.qualityScore).toBe(100);
    expect(pkg.sessionId).toBe(SESSION_ID);
    expect(pkg.files).toHaveLength(6);
  });

  it("returns package with clientReady: false when review is not client ready", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    const review = makeReview({ clientReady: false, status: "needs_review", globalScore: 70 });
    const pkg = generateDeliveryPackage(MOCK_SESSION, review);

    expect(pkg.clientReady).toBe(false);
    expect(pkg.qualityScore).toBe(70);
  });

  it("handles null review — score 0, clientReady false, blockers set", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    const pkg = generateDeliveryPackage(MOCK_SESSION, null);

    expect(pkg.clientReady).toBe(false);
    expect(pkg.qualityScore).toBe(0);
    expect(pkg.manifest.blockers).toContain(
      "No quality review found — run Review Deliverables first"
    );
  });

  it("computes correct approved/rejected/pending counts", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    const review = makeReview({
      clientReady: false,
      status: "needs_review",
      globalScore: 50,
      deliverables: [
        { path: "product/brief.md", name: "brief.md", score: 100, status: "approved", checks: [], warnings: [], reviewedAt: "2024-01-01T10:00:00.000Z", approvedAt: "2024-01-01T11:00:00.000Z" },
        { path: "product/user-stories.md", name: "user-stories.md", score: 20, status: "rejected", checks: [], warnings: ["Too short"], reviewedAt: "2024-01-01T10:00:00.000Z", rejectedAt: "2024-01-01T11:00:00.000Z", rejectionReason: "Missing acceptance criteria" },
        { path: "product/roadmap.md", name: "roadmap.md", score: 80, status: "needs_review", checks: [], warnings: [], reviewedAt: "2024-01-01T10:00:00.000Z" },
      ],
    });

    const pkg = generateDeliveryPackage(MOCK_SESSION, review);
    expect(pkg.manifest.approvedCount).toBe(1);
    expect(pkg.manifest.rejectedCount).toBe(1);
    expect(pkg.manifest.pendingCount).toBe(1);
    expect(pkg.manifest.deliverableCount).toBe(3);
  });

  it("blockers include rejected deliverables", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    const review = makeReview({
      clientReady: false,
      status: "rejected",
      deliverables: [
        { path: "product/brief.md", name: "brief.md", score: 20, status: "rejected", checks: [], warnings: [], reviewedAt: "2024-01-01T10:00:00.000Z", rejectedAt: "2024-01-01T11:00:00.000Z" },
      ],
    });

    const pkg = generateDeliveryPackage(MOCK_SESSION, review);
    expect(pkg.manifest.blockers.some((b) => b.includes("rejected"))).toBe(true);
    expect(pkg.manifest.blockers.some((b) => b.includes("brief.md"))).toBe(true);
  });

  it("blockers include pending approval deliverables", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    const review = makeReview({
      clientReady: false,
      status: "needs_review",
      deliverables: [
        { path: "product/brief.md", name: "brief.md", score: 90, status: "needs_review", checks: [], warnings: [], reviewedAt: "2024-01-01T10:00:00.000Z" },
      ],
    });

    const pkg = generateDeliveryPackage(MOCK_SESSION, review);
    expect(pkg.manifest.blockers.some((b) => b.includes("pending approval"))).toBe(true);
  });

  it("no blockers when all deliverables are approved", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    const pkg = generateDeliveryPackage(MOCK_SESSION, makeReview());
    expect(pkg.manifest.blockers).toHaveLength(0);
  });

  it("client-summary.md contains project name and score", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    generateDeliveryPackage(MOCK_SESSION, makeReview({ globalScore: 95 }));

    const summary = fileStore.get(wsFile("delivery/client-summary.md")) ?? "";
    expect(summary).toContain("TestApp");
    expect(summary).toContain("95/100");
    expect(summary).toContain("A SaaS app for team workflow automation.");
  });

  it("deliverables-index.md contains a table row for each deliverable", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    const review = makeReview({
      deliverables: [
        { path: "product/brief.md", name: "brief.md", score: 100, status: "approved", checks: [], warnings: [], reviewedAt: "2024-01-01T10:00:00.000Z" },
        { path: "product/user-stories.md", name: "user-stories.md", score: 80, status: "needs_review", checks: [], warnings: [], reviewedAt: "2024-01-01T10:00:00.000Z" },
      ],
    });
    generateDeliveryPackage(MOCK_SESSION, review);

    const index = fileStore.get(wsFile("delivery/deliverables-index.md")) ?? "";
    expect(index).toContain("brief.md");
    expect(index).toContain("user-stories.md");
    expect(index).toContain("|");
  });

  it("handoff-checklist.md shows ready status when clientReady", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    generateDeliveryPackage(MOCK_SESSION, makeReview({ clientReady: true }));

    const checklist = fileStore.get(wsFile("delivery/handoff-checklist.md")) ?? "";
    expect(checklist).toContain("Ready for handoff");
    expect(checklist).toContain("[x] All deliverables approved");
  });

  it("handoff-checklist.md shows not ready when clientReady: false", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    generateDeliveryPackage(
      MOCK_SESSION,
      makeReview({ clientReady: false, status: "needs_review" })
    );

    const checklist = fileStore.get(wsFile("delivery/handoff-checklist.md")) ?? "";
    expect(checklist).toContain("Not yet ready");
  });

  it("manifest JSON is valid and has required fields", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    generateDeliveryPackage(MOCK_SESSION, makeReview());

    const raw = fileStore.get(wsFile("delivery/delivery-manifest.json"));
    expect(raw).toBeDefined();
    const manifest = JSON.parse(raw!) as { sessionId: string; qualityScore: number; files: string[] };
    expect(manifest.sessionId).toBe(SESSION_ID);
    expect(typeof manifest.qualityScore).toBe("number");
    expect(Array.isArray(manifest.files)).toBe(true);
    expect(manifest.files).toHaveLength(6);
  });

  it("next-steps.md contains mission-specific actions", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    generateDeliveryPackage(MOCK_SESSION, makeReview());

    const nextSteps = fileStore.get(wsFile("delivery/next-steps.md")) ?? "";
    expect(nextSteps).toContain("TestApp");
    expect(nextSteps).toContain("staging environment");
  });

  it("recommendations include quality improvement message for low score", async () => {
    const { generateDeliveryPackage } = await import("@/lib/deliveryPackage");
    const pkg = generateDeliveryPackage(
      MOCK_SESSION,
      makeReview({ clientReady: false, globalScore: 45, status: "draft" })
    );
    expect(
      pkg.manifest.recommendations.some((r) => r.includes("60%") || r.includes("threshold"))
    ).toBe(true);
  });
});

describe("deliveryPackage — loadDeliveryPackage", () => {
  beforeEach(() => {
    fileStore.clear();
    vi.clearAllMocks();
  });

  it("returns null if no manifest exists", async () => {
    const { loadDeliveryPackage } = await import("@/lib/deliveryPackage");
    const pkg = loadDeliveryPackage("ap-nonexistent");
    expect(pkg).toBeNull();
  });

  it("returns saved package after generateDeliveryPackage", async () => {
    const { generateDeliveryPackage, loadDeliveryPackage } = await import("@/lib/deliveryPackage");

    generateDeliveryPackage(MOCK_SESSION, makeReview());
    const loaded = loadDeliveryPackage(SESSION_ID);

    expect(loaded).not.toBeNull();
    expect(loaded!.sessionId).toBe(SESSION_ID);
    expect(loaded!.clientReady).toBe(true);
    expect(loaded!.qualityScore).toBe(100);
    expect(loaded!.files).toHaveLength(6);
  });

  it("returns null if manifest JSON is malformed", async () => {
    const { loadDeliveryPackage } = await import("@/lib/deliveryPackage");
    fileStore.set(wsFile("delivery/delivery-manifest.json"), "{ invalid json }");

    const pkg = loadDeliveryPackage(SESSION_ID);
    expect(pkg).toBeNull();
  });

  it("file sizes come from statSync", async () => {
    const { generateDeliveryPackage, loadDeliveryPackage } = await import("@/lib/deliveryPackage");

    generateDeliveryPackage(MOCK_SESSION, makeReview());
    const loaded = loadDeliveryPackage(SESSION_ID);

    expect(loaded).not.toBeNull();
    const summaryFile = loaded!.files.find((f) => f.name === "client-summary.md");
    expect(summaryFile).toBeDefined();
    expect(summaryFile!.size).toBeGreaterThan(0);
  });
});
