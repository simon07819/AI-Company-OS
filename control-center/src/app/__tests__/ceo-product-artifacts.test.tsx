import { render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CeoPage from "@/app/ceo/page";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CEO product artifacts", () => {
  it("shows concrete product artifact actions in simple mode", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        view: {
          messages: [{
            id: "ceo-product",
            role: "ceo",
            text: "Projet créé avec des artifacts locaux.",
            timestamp: "2026-05-11T12:00:00.000Z",
            actions: [{
              type: "product_artifacts_created",
              label: "Projet créé: Gym management SaaS",
              targetId: "gym-management-saas",
              href: "generated-products/gym-management-saas",
              summary: "Generated product passed the local artifact quality gate.",
              artifactPaths: [
                "generated-products/gym-management-saas/README.md",
                "generated-products/gym-management-saas/product-spec.json",
                "generated-products/gym-management-saas/next-app/package.json",
              ],
            }],
          }],
          companies: [],
          projects: [],
          sessions: [],
          outputs: [],
          approvals: [],
        },
      }),
    })));

    render(React.createElement(CeoPage));

    expect(await screen.findByText("Projet créé")).toBeInTheDocument();
    expect(screen.getByText("Gym management SaaS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ouvrir le workspace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voir les fichiers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuer / Modifier" })).toBeInTheDocument();
    expect(screen.queryByText(/Mission Room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/autopilot/i)).not.toBeInTheDocument();
  });
});
