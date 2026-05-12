import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import CEOCommandComposer from "@/components/ceo/CEOCommandComposer";
import CEOResultStage from "@/components/ceo/CEOResultStage";
import type { CEOCurrentMission, CEOCurrentResult } from "@/components/ceo/types";

const mission: CEOCurrentMission = {
  id: "mission-1",
  prompt: "Je veux un SaaS pour gérer une clinique",
  requestType: "saas",
  status: "ready",
  createdAt: "2026-05-11T12:00:00.000Z",
  artifactCount: 2,
  workspaceHref: "/projects/clinic-saas",
  qualityScore: 88,
};

const result: CEOCurrentResult = {
  title: "Clinic appointments SaaS",
  requestType: "saas",
  status: "ready",
  summary: "Produit clinique généré avec artifacts locaux.",
  artifactPaths: [
    "generated-products/clinic-saas/README.md",
    "generated-products/clinic-saas/product-spec.json",
  ],
  workspaceHref: "/projects/clinic-saas",
  qualityScore: 88,
  qualityStatus: "Prêt",
};

describe("CEO command components", () => {
  it("submits text, clears the input and prevents double submit while busy", async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    render(React.createElement(CEOCommandComposer, { loading: false, onSubmit }));

    const textarea = screen.getByPlaceholderText("Décris ce que tu veux construire...");
    const button = screen.getByRole("button", { name: "Construire" });

    expect(button).toBeDisabled();
    fireEvent.change(textarea, { target: { value: "Je veux un site web" } });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(textarea).toHaveValue("");
  });

  it("disables submit while loading", () => {
    render(React.createElement(CEOCommandComposer, { loading: true, onSubmit: vi.fn() }));

    fireEvent.change(screen.getByPlaceholderText("Décris ce que tu veux construire..."), { target: { value: "Créer un SaaS" } });
    expect(screen.getByRole("button", { name: "Construire" })).toBeDisabled();
  });

  it("renders artifacts, actions and workspace link in the result stage", () => {
    const { container } = render(React.createElement(CEOResultStage, {
      result,
      mission,
      expertMode: false,
      loading: false,
      error: null,
      onModify: vi.fn(),
      onContinue: vi.fn(),
    }));

    expect(screen.getByRole("heading", { name: "Clinic appointments SaaS" })).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByText("product-spec.json")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ouvrir workspace/ })).toHaveAttribute("href", "/projects/clinic-saas");
    expect(screen.getByRole("button", { name: /Voir fichiers/ })).not.toBeDisabled();
    expect(screen.queryByText(/raw output|runtime id|sessionId/i)).not.toBeInTheDocument();
    expect(container.querySelector(".ceo-os-result-stage")).not.toHaveClass("text-white");
    expect(container.querySelector(".ceo-os-result-stage")).not.toHaveClass("text-slate-50");
  });

  it("does not fake success when artifacts are missing", () => {
    render(React.createElement(CEOResultStage, {
      result: { ...result, artifactPaths: [], workspaceHref: undefined, status: "rejected", qualityStatus: "Aucun artifact réel créé" },
      mission: { ...mission, artifactCount: 0, workspaceHref: undefined, status: "rejected" },
      expertMode: false,
      loading: false,
      error: null,
      onModify: vi.fn(),
      onContinue: vi.fn(),
    }));

    expect(screen.getByText("Aucun artifact réel créé.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ouvrir workspace/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Voir fichiers/ })).toBeDisabled();
  });

  it("shows quality report only in expert mode", () => {
    const { rerender } = render(React.createElement(CEOResultStage, {
      result: { ...result, expert: { qualityReport: { score: 88 }, revisions: [{ attempt: 1 }] } },
      mission,
      expertMode: false,
      loading: false,
      error: null,
      onModify: vi.fn(),
      onContinue: vi.fn(),
    }));

    expect(screen.queryByText(/Mode expert/)).not.toBeInTheDocument();

    rerender(React.createElement(CEOResultStage, {
      result: { ...result, expert: { qualityReport: { score: 88 }, revisions: [{ attempt: 1 }] } },
      mission,
      expertMode: true,
      loading: false,
      error: null,
      onModify: vi.fn(),
      onContinue: vi.fn(),
    }));

    expect(screen.getByText("Mode expert · plan, qualité et révisions")).toBeInTheDocument();
  });
});
