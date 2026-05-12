import { describe, expect, it } from "vitest";
import { createArtifactFingerprint } from "@/agents/artifacts/artifact-fingerprint";
import { createMissionArtifactStore } from "@/agents/artifacts/artifact-store";
import { buildLogoArtifact } from "@/agents/artifacts/logo-artifact-builder";
import { buildWebsiteArtifact } from "@/agents/artifacts/website-artifact-builder";
import { validateNoArtifactRecycle, validateSimpleChatDoesNotExposeArtifacts } from "@/agents/artifacts/artifact-quality";
import { runAgentMission } from "@/agents/runtime/mission-runtime";

describe("mission artifact store", () => {
  it("creates isolated artifacts with fingerprints", () => {
    const store = createMissionArtifactStore({ missionId: "mission-a", turnId: "turn-a" });
    const artifact = store.store({
      missionId: "mission-a",
      turnId: "turn-a",
      kind: "brief",
      name: "brief.md",
      mimeType: "text/markdown",
      visibility: "details_only",
      content: "# Brief",
    });

    expect(artifact.fingerprint).toBe(createArtifactFingerprint("# Brief"));
    expect(artifact.path).toContain("generated-products/_mission-artifacts/mission-a/turn-a/brief.md");
    expect(store.list("details_only")).toHaveLength(1);
  });

  it("blocks path traversal and secret markers", () => {
    const store = createMissionArtifactStore({ missionId: "mission-a", turnId: "turn-a" });
    expect(() => store.store({
      missionId: "mission-a",
      turnId: "turn-a",
      kind: "brief",
      name: "../.env",
      mimeType: "text/plain",
      visibility: "internal_only",
      content: "x",
    })).toThrow(/Sensitive artifact path|traversal|escaped/i);
    expect(() => store.store({
      missionId: "mission-a",
      turnId: "turn-a",
      kind: "brief",
      name: "safe.txt",
      mimeType: "text/plain",
      visibility: "internal_only",
      content: "NVIDIA_API_KEY=secret",
    })).toThrow(/secret/i);
  });
});

describe("deliverable artifact builders", () => {
  it("builds an EKIDA logo SVG artifact on a black background", () => {
    const result = runAgentMission("logo EKIDA sur fond noir");
    const visible = result.visibleOutput as { primaryArtifactId?: string; primaryVisual?: string };
    const artifacts = result.hiddenDetails.artifacts as { id?: string; kind?: string; fingerprint?: string }[];

    expect(visible.primaryArtifactId).toBeTruthy();
    expect(visible.primaryVisual).toContain("viewBox");
    expect(visible.primaryVisual).toMatch(/EKIDA|>EK<|>E</);
    expect(visible.primaryVisual).toMatch(/#030712|#111827/);
    expect(visible.primaryVisual).not.toMatch(/Brand system|Marque à nommer|>\s*[AB]\s*</);
    expect(artifacts.some((artifact) => artifact.id === visible.primaryArtifactId && artifact.kind === "logo_svg")).toBe(true);
  });

  it("builds a website preview artifact instead of a logo-only response", () => {
    const previous = runAgentMission("logo EKIDA");
    const previousVisible = previous.visibleOutput as { primaryVisual?: string };
    const result = runAgentMission("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge", {
      previousDeliverable: { deliverableType: "logo", primaryVisual: previousVisible.primaryVisual },
    });
    const visible = result.visibleOutput as { kind?: string; primaryArtifactId?: string; primaryVisual?: string };

    expect(visible.kind).toBe("website_preview");
    expect(visible.primaryArtifactId).toMatch(/^website_preview_svg-/);
    expect(visible.primaryVisual).not.toBe(previousVisible.primaryVisual);
    expect(visible.primaryVisual).toMatch(/aria-label="nav"/);
    expect(visible.primaryVisual).toMatch(/aria-label="hero"/);
    expect(visible.primaryVisual).toMatch(/aria-label="sections"/);
    expect(visible.primaryVisual).toMatch(/EKIDA|Voir la collection|Essentiels de linge/);
  });

  it("validates primary artifacts and hidden/simple visibility boundaries", () => {
    const result = runAgentMission("logo EKIDA");
    const visible = result.visibleOutput as { primaryArtifactId?: string };
    const artifacts = result.hiddenDetails.artifacts as { id?: string; visibility?: string; content?: string }[];

    expect(artifacts.some((artifact) => artifact.id === visible.primaryArtifactId && artifact.visibility === "simple_visible")).toBe(true);
    expect(artifacts.some((artifact) => artifact.content)).toBe(false);
    expect(validateSimpleChatDoesNotExposeArtifacts({ kind: "visual", deliverableType: "logo", primaryArtifactId: visible.primaryArtifactId, primaryVisual: "[svg]" }).ok).toBe(true);
  });

  it("blocks recycled primary artifacts across deliverable types", () => {
    const fingerprint = createArtifactFingerprint("<svg viewBox=\"0 0 10 10\"><text>EKIDA</text></svg>");
    expect(validateNoArtifactRecycle({
      artifact: {
        id: "website-preview",
        missionId: "mission-b",
        turnId: "turn-b",
        kind: "website_preview_svg",
        name: "site.svg",
        mimeType: "image/svg+xml",
        visibility: "simple_visible",
        content: "<svg viewBox=\"0 0 10 10\"><text>EKIDA</text></svg>",
        fingerprint,
        createdAt: new Date().toISOString(),
        metadata: {},
      },
      previousPrimaryVisual: "<svg viewBox=\"0 0 10 10\"><text>EKIDA</text></svg>",
      previousDeliverableType: "logo",
      currentDeliverableType: "website",
    }).ok).toBe(false);
  });

  it("rejects invalid direct builder inputs", () => {
    expect(() => buildLogoArtifact({
      missionId: "m",
      turnId: "t",
      brandName: "EKIDA",
      primaryVisual: "<svg viewBox=\"0 0 10 10\"><text>EKIDA</text></svg>",
    })).toThrow(/text-only|trop textuel/i);
    expect(() => buildWebsiteArtifact({
      missionId: "m",
      turnId: "t",
      brandName: "EKIDA",
      previousPrimaryVisual: "<svg viewBox=\"0 0 10 10\"><text>EKIDA</text></svg>",
      workflow: {
        primaryVisual: "<svg viewBox=\"0 0 10 10\"><text>EKIDA</text></svg>",
      } as never,
    })).toThrow(/logo-only|nav|hero|sections/i);
  });
});
