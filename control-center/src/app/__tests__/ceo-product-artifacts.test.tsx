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
      if (String(url).includes("/api/ceo/command")) {
        expect(String(init?.body)).toContain("clinique");
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            title: "Clinic appointments SaaS",
            projectId: "clinic-appointments-saas",
            workspaceHref: "/projects/clinic-appointments-saas",
            requestType: "saas",
            status: "ready",
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
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, view: emptyView() }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(React.createElement(CeoPage));

    const input = await screen.findByPlaceholderText("Message");
    fireEvent.change(input, { target: { value: "Je veux un SaaS pour gérer les rendez-vous d'une clinique" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(input).toHaveValue(""));
    expect(await screen.findByText("Clinic appointments SaaS")).toBeInTheDocument();
    expect(screen.queryByText("README.md")).not.toBeInTheDocument();
    expect(screen.queryByText("91/100")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ouvrir workspace/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Voir travail de l’équipe/ }));
    expect(screen.getByRole("link", { name: /Ouvrir workspace/ })).toHaveAttribute("href", "/projects/clinic-appointments-saas");
    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.queryByText(/Mission Room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/autopilot/i)).not.toBeInTheDocument();
  });

  it("resets the current result when a second command starts", async () => {
    let chatCount = 0;
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (String(url).includes("/api/ceo/command")) {
        chatCount += 1;
        const title = chatCount === 1 ? "Construction Website" : "Clinic appointments SaaS";
        const slug = chatCount === 1 ? "construction-website" : "clinic-appointments-saas";
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            title,
            projectId: slug,
            workspaceHref: `/projects/${slug}`,
            requestType: chatCount === 1 ? "website" : "saas",
            status: "ready",
            qualityStatus: "Prêt",
            artifactPaths: [`generated-products/${slug}/README.md`],
            summary: `${title} summary`,
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, view: emptyView() }) });
    }));

    render(React.createElement(CeoPage));
    const input = await screen.findByPlaceholderText("Message");
    fireEvent.change(input, { target: { value: "Je veux un site web premium pour une entreprise de construction" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(await screen.findByText("Construction Website")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Je veux un SaaS pour gérer les rendez-vous d'une clinique" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(screen.queryByText("Construction Website")).not.toBeInTheDocument());
    expect(await screen.findByText("Clinic appointments SaaS")).toBeInTheDocument();
  });

  it("does not show fake success when no artifacts are returned", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (String(url).includes("/api/ceo/command")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({
            ok: false,
            status: "failed",
            title: "Aucun artifact réel créé",
            summary: "Le système refuse de l’afficher comme résultat prêt.",
            error: "Aucun fichier traçable n'a été créé.",
            artifactPaths: [],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, view: emptyView() }) });
    }));

    render(React.createElement(CeoPage));
    const input = await screen.findByPlaceholderText("Message");
    fireEvent.change(input, { target: { value: "Je veux un système vague" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(screen.getAllByText(/Je n’ai pas encore produit un résultat exploitable/i).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Aucun fichier traçable/i).length).toBeGreaterThan(0);
  });
});
