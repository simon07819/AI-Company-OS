import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock fs ──────────────────────────────────────────────────────────────

const fileStore: Record<string, string> = {};

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => p in fileStore),
    readFileSync: vi.fn((p: string) => {
      if (p in fileStore) return fileStore[p];
      throw new Error(`ENOENT: no such file: ${p}`);
    }),
    writeFileSync: vi.fn((p: string, data: string | Buffer) => {
      fileStore[p] = typeof data === "string" ? data : data.toString("base64");
    }),
  },
}));

vi.mock("path", async () => {
  const actual = await vi.importActual<typeof import("path")>("path");
  return { default: actual };
});

// ─── Tests: detectFileCategory ─────────────────────────────────────────────

describe("detectFileCategory", () => {
  it("detects image by MIME type", async () => {
    const { detectFileCategory } = await import("@/lib/ceoUploads");
    expect(detectFileCategory("image/jpeg", "photo.jpg")).toBe("image");
    expect(detectFileCategory("image/png", "img.png")).toBe("image");
    expect(detectFileCategory("image/svg+xml", "logo.svg")).toBe("image");
  });

  it("detects pdf by MIME type", async () => {
    const { detectFileCategory } = await import("@/lib/ceoUploads");
    expect(detectFileCategory("application/pdf", "doc.pdf")).toBe("pdf");
  });

  it("detects text types", async () => {
    const { detectFileCategory } = await import("@/lib/ceoUploads");
    expect(detectFileCategory("text/plain", "notes.txt")).toBe("text");
    expect(detectFileCategory("text/markdown", "readme.md")).toBe("text");
  });

  it("detects data types", async () => {
    const { detectFileCategory } = await import("@/lib/ceoUploads");
    expect(detectFileCategory("application/json", "data.json")).toBe("data");
  });

  it("falls back to extension when MIME is unknown", async () => {
    const { detectFileCategory } = await import("@/lib/ceoUploads");
    expect(detectFileCategory("application/octet-stream", "image.jpg")).toBe("image");
    expect(detectFileCategory("application/octet-stream", "doc.pdf")).toBe("pdf");
    expect(detectFileCategory("application/octet-stream", "file.json")).toBe("data");
  });

  it("returns unknown for unrecognized types", async () => {
    const { detectFileCategory } = await import("@/lib/ceoUploads");
    expect(detectFileCategory("application/zip", "archive.zip")).toBe("unknown");
  });
});

// ─── Tests: generateFileAnalysis ──────────────────────────────────────────

describe("generateFileAnalysis", () => {
  it("delegates logo images to CMO with design_review", async () => {
    const { generateFileAnalysis } = await import("@/lib/ceoUploads");
    const result = generateFileAnalysis("logo.png", "image");
    expect(result.delegateTo).toBe("cmo");
    expect(result.taskType).toBe("design_review");
    expect(result.summary).toBeTruthy();
    expect(result.delegationMessage).toContain("logo.png");
  });

  it("delegates competitor screenshots to CMO with competitive_analysis", async () => {
    const { generateFileAnalysis } = await import("@/lib/ceoUploads");
    const result = generateFileAnalysis("competitor-screenshot.png", "image");
    expect(result.delegateTo).toBe("cmo");
    expect(result.taskType).toBe("competitive_analysis");
  });

  it("delegates product images to CMO with product_review", async () => {
    const { generateFileAnalysis } = await import("@/lib/ceoUploads");
    const result = generateFileAnalysis("product-hero.jpg", "image");
    expect(result.delegateTo).toBe("cmo");
    expect(result.taskType).toBe("product_review");
  });

  it("delegates invoice PDFs to CFO with finance_review", async () => {
    const { generateFileAnalysis } = await import("@/lib/ceoUploads");
    const result = generateFileAnalysis("facture-client.pdf", "pdf");
    expect(result.delegateTo).toBe("cfo");
    expect(result.taskType).toBe("finance_review");
  });

  it("delegates strategy PDFs to COO with strategy_review", async () => {
    const { generateFileAnalysis } = await import("@/lib/ceoUploads");
    const result = generateFileAnalysis("brief-strategy.pdf", "pdf");
    expect(result.delegateTo).toBe("coo");
    expect(result.taskType).toBe("strategy_review");
  });

  it("delegates JSON data to CTO with data_analysis", async () => {
    const { generateFileAnalysis } = await import("@/lib/ceoUploads");
    const result = generateFileAnalysis("metrics.json", "data");
    expect(result.delegateTo).toBe("cto");
    expect(result.taskType).toBe("data_analysis");
  });

  it("delegates text docs to COO with content_review", async () => {
    const { generateFileAnalysis } = await import("@/lib/ceoUploads");
    const result = generateFileAnalysis("notes.txt", "text");
    expect(result.delegateTo).toBe("coo");
    expect(result.taskType).toBe("content_review");
  });

  it("returns analyzedAt timestamp", async () => {
    const { generateFileAnalysis } = await import("@/lib/ceoUploads");
    const result = generateFileAnalysis("file.png", "image");
    expect(result.analyzedAt).toBeTruthy();
    expect(new Date(result.analyzedAt).getTime()).toBeGreaterThan(0);
  });
});

// ─── Tests: saveUpload & getFileById ──────────────────────────────────────

describe("saveUpload", () => {
  beforeEach(() => {
    Object.keys(fileStore).forEach((k) => delete fileStore[k]);
  });

  it("saves a file and returns a record with id and analysis", async () => {
    const { saveUpload } = await import("@/lib/ceoUploads");
    const buf = Buffer.from("test image data");
    const record = saveUpload("logo.png", buf.length, "image/png", buf);

    expect(record.id).toMatch(/^file-/);
    expect(record.name).toBe("logo.png");
    expect(record.mimeType).toBe("image/png");
    expect(record.category).toBe("image");
    expect(record.analysis).toBeDefined();
    expect(record.analysis?.delegateTo).toBe("cmo");
  });

  it("persists the file metadata to ceo-files.json", async () => {
    const { saveUpload, getFileMemory } = await import("@/lib/ceoUploads");
    const buf = Buffer.from("pdf content");
    const record = saveUpload("facture.pdf", buf.length, "application/pdf", buf);

    const memory = getFileMemory();
    const found = memory.files.find((f) => f.id === record.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("facture.pdf");
  });

  it("sanitizes upload names before writing to local storage", async () => {
    const { saveUpload } = await import("@/lib/ceoUploads");
    const buf = Buffer.from("text content");
    const record = saveUpload("../secret\nfile.txt", buf.length, "text/plain", buf);

    expect(record.name).toBe("secret_file.txt");
    expect(record.storagePath).toContain(record.id);
    expect(record.storagePath).toContain("secret_file.txt");
    expect(record.storagePath).not.toContain("../");
    expect(record.analysis?.delegationMessage).toContain("secret_file.txt");
  });

  it("getFileById returns the correct record", async () => {
    const { saveUpload, getFileById } = await import("@/lib/ceoUploads");
    const buf = Buffer.from("text content");
    const record = saveUpload("brief.txt", buf.length, "text/plain", buf);

    const found = getFileById(record.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(record.id);
    expect(found?.name).toBe("brief.txt");
  });

  it("getFileById returns null for unknown id", async () => {
    const { getFileById } = await import("@/lib/ceoUploads");
    expect(getFileById("nonexistent-id")).toBeNull();
  });
});

// ─── Tests: CEO delegates correctly (integration) ─────────────────────────

describe("CEO file delegation integration", () => {
  it("invoice PDF triggers CFO delegation message", async () => {
    const { generateFileAnalysis } = await import("@/lib/ceoUploads");
    const analysis = generateFileAnalysis("invoice-2024.pdf", "pdf");
    expect(analysis.delegationMessage).toContain("Diana");
    expect(analysis.delegationMessage).toContain("invoice-2024.pdf");
  });

  it("competitor screenshot triggers CMO delegation message", async () => {
    const { generateFileAnalysis } = await import("@/lib/ceoUploads");
    const analysis = generateFileAnalysis("competitor-screen.png", "image");
    expect(analysis.delegationMessage).toContain("Sophie");
  });

  it("data file triggers CTO delegation message", async () => {
    const { generateFileAnalysis } = await import("@/lib/ceoUploads");
    const analysis = generateFileAnalysis("analytics.json", "data");
    expect(analysis.delegationMessage).toContain("Raj");
  });
});
