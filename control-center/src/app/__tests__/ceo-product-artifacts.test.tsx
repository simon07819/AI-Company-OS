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
              kind: "saas",
              qualityStatus: "Prêt",
              summary: "Generated product passed the local artifact quality gate.",
              artifactPaths: [
                "generated-products/gym-management-saas/README.md",
                "generated-products/gym-management-saas/product-spec.json",
                "generated-products/gym-management-saas/next-app/package.json",
                "generated-products/gym-management-saas/next-app/app/dashboard/page.tsx",
              ],
              launchInstructions: ["cd next-app", "npm install", "npm run dev"],
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

    expect(await screen.findByText("Résultat courant")).toBeInTheDocument();
    expect(screen.getByText("Gym management SaaS")).toBeInTheDocument();
    expect(screen.getByText("SaaS")).toBeInTheDocument();
    expect(screen.getByText("Progression")).toBeInTheDocument();
    expect(screen.getAllByText(/next-app\/app\/dashboard\/page.tsx/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Ouvrir le workspace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voir les fichiers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuer le projet" })).toBeInTheDocument();
    expect(screen.queryByText(/Mission Room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/autopilot/i)).not.toBeInTheDocument();
  });

  it("shows the extracted brand name for logo requests without generic fallback", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        view: {
          messages: [{ id: "u1", role: "user", text: "je veux un logo pour une compagnie qui s'appelle ELEVIO", timestamp: "2026-05-11T12:00:00.000Z" }],
          companies: [],
          projects: [{ id: "proj-logo", name: "Logo ELEVIO", sessionId: "session-logo", progress: 70, outputsCount: 1 }],
          sessions: [{ sessionId: "session-logo", projectName: "Logo ELEVIO", status: "waiting_approval", progress: 70, tasks: [], logs: [] }],
          outputs: [{ id: "out-logo", sessionId: "session-logo", projectId: "proj-logo", title: "Logo Concept", type: "logo_direction", summary: "Concept premium", preview: "Palette", status: "review", assignedAgent: "frontend_agent", updatedAt: "2026-05-11T12:02:00.000Z" }],
          approvals: [],
        },
      }),
    })));

    render(React.createElement(CeoPage));

    expect(await screen.findByRole("heading", { name: "Concept de marque — ELEVIO" })).toBeInTheDocument();
    expect(screen.getAllByText("ELEVIO").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Prototype visuel/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Nouvelle Marque AI/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mission Room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/autopilot/i)).not.toBeInTheDocument();
  });
});
