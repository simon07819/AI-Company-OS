import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OutputsPage from "@/app/outputs/page";

describe("Outputs visual gallery", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        view: {
          companies: [],
          projects: [],
          sessions: [],
          approvals: [],
          outputs: [{
            id: "vo-visual-logo",
            sessionId: "ap-logo",
            projectId: "proj-logo",
            title: "Logo Concept",
            type: "logo_direction",
            summary: "A real visual logo card",
            preview: "Logo Concept with Color Palette #0F172A #38BDF8.",
            status: "review",
            assignedAgent: "cmo",
            sourceFile: null,
            sourceFiles: [],
            visualPreview: {
              kind: "brand_card",
              logoText: "PHOTO",
              tagline: "Logo Concept",
              colors: ["#0F172A", "#38BDF8", "#F8FAFC"],
              typography: { heading: "Inter Bold", body: "Inter Regular" },
              mockup: { title: "Logo concept", subtitle: "Simple visual identity preview", blocks: ["Primary mark", "Color system"] },
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
        },
      }),
    })));
  });

  it("/outputs affiche rendu visuel", async () => {
    render(React.createElement(OutputsPage));

    await waitFor(() => expect(screen.getAllByText("Logo Concept").length).toBeGreaterThan(0));
    expect(screen.getByText("PHOTO")).toBeInTheDocument();
    expect(screen.getAllByText("Logo concept").length).toBeGreaterThan(0);
  });
});
