import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CeoPage from "@/app/ceo/page";

function emptyView() {
  return {
    messages: [],
    companies: [],
    projects: [],
    sessions: [],
    outputs: [],
    approvals: [],
    generatedProjects: [],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CEO command surface flow", () => {
  it("creates a current product result from real artifact actions", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (String(url).includes("/api/ceo/chat")) {
        expect(String(init?.body)).toContain("clinique");
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            response: {
              id: "ceo-product",
              role: "ceo",
              text: "Projet créé avec des artifacts locaux.",
              timestamp: "2026-05-11T12:00:00.000Z",
              actions: [{
                type: "product_artifacts_created",
                label: "Projet créé: Clinic appointments SaaS",
                targetId: "clinic-appointments-saas",
                href: "/projects/clinic-appointments-saas",
                kind: "saas",
                qualityStatus: "Prêt",
                qualityScore: 91,
                summary: "Generated product passed the local artifact quality gate.",
                artifactPaths: [
                  "generated-products/clinic-appointments-saas/README.md",
                  "generated-products/clinic-appointments-saas/product-spec.json",
                  "generated-products/clinic-appointments-saas/next-app/package.json",
                  "generated-products/clinic-appointments-saas/next-app/app/dashboard/page.tsx",
                ],
                launchInstructions: ["cd next-app", "npm install", "npm run dev"],
              }],
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, view: emptyView() }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(React.createElement(CeoPage));

    const input = await screen.findByPlaceholderText("Décris ce que tu veux construire...");
    fireEvent.change(input, { target: { value: "Je veux un SaaS pour gérer les rendez-vous d'une clinique" } });
    fireEvent.click(screen.getByRole("button", { name: "Construire" }));

    await waitFor(() => expect(input).toHaveValue(""));
    expect(await screen.findByRole("heading", { name: "Clinic appointments SaaS" })).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ouvrir workspace/ })).toHaveAttribute("href", "/projects/clinic-appointments-saas");
    expect(screen.queryByText(/Mission Room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/autopilot/i)).not.toBeInTheDocument();
  });

  it("resets the current result when a second command starts", async () => {
    let chatCount = 0;
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (String(url).includes("/api/ceo/chat")) {
        chatCount += 1;
        const title = chatCount === 1 ? "Construction Website" : "Clinic appointments SaaS";
        const slug = chatCount === 1 ? "construction-website" : "clinic-appointments-saas";
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            response: {
              id: `ceo-${chatCount}`,
              role: "ceo",
              text: "Projet créé.",
              timestamp: "2026-05-11T12:00:00.000Z",
              actions: [{
                type: "product_artifacts_created",
                label: `Projet créé: ${title}`,
                targetId: slug,
                href: `/projects/${slug}`,
                kind: chatCount === 1 ? "website" : "saas",
                qualityStatus: "Prêt",
                artifactPaths: [`generated-products/${slug}/README.md`],
                summary: `${title} summary`,
              }],
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, view: emptyView() }) });
    }));

    render(React.createElement(CeoPage));
    const input = await screen.findByPlaceholderText("Décris ce que tu veux construire...");
    fireEvent.change(input, { target: { value: "Je veux un site web premium pour une entreprise de construction" } });
    fireEvent.click(screen.getByRole("button", { name: "Construire" }));
    expect(await screen.findByRole("heading", { name: "Construction Website" })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Je veux un SaaS pour gérer les rendez-vous d'une clinique" } });
    fireEvent.click(screen.getByRole("button", { name: "Construire" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Construction Website" })).not.toBeInTheDocument());
    expect(await screen.findByRole("heading", { name: "Clinic appointments SaaS" })).toBeInTheDocument();
  });

  it("does not show fake success when no artifacts are returned", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (String(url).includes("/api/ceo/chat")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            response: { id: "ceo-empty", role: "ceo", text: "Réponse sans artifact", timestamp: "2026-05-11T12:00:00.000Z", actions: [] },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, view: emptyView() }) });
    }));

    render(React.createElement(CeoPage));
    const input = await screen.findByPlaceholderText("Décris ce que tu veux construire...");
    fireEvent.change(input, { target: { value: "Je veux un système vague" } });
    fireEvent.click(screen.getByRole("button", { name: "Construire" }));

    expect(await screen.findByRole("heading", { name: "Aucun artifact réel créé" })).toBeInTheDocument();
    expect(screen.getByText(/refuse de l’afficher comme résultat prêt/i)).toBeInTheDocument();
  });
});
