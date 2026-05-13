import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import CEOCommandComposer from "@/components/ceo/CEOCommandComposer";
import CEOCommandSurface from "@/components/ceo/CEOCommandSurface";
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
  it("renders the CEO page as a minimal dark chat shell", () => {
    const { container } = render(React.createElement(CEOCommandSurface));

    expect(container.querySelector(".ceo-chat-page")).toBeInTheDocument();
    expect(container.querySelector(".ceo-chat-shell")).toBeInTheDocument();
    expect(container.querySelector(".ceo-chat-header")).toBeInTheDocument();
    expect(screen.getByLabelText("Avatar CEO")).toBeInTheDocument();
    expect(screen.getAllByText("CEO").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("Message")).toBeInTheDocument();
    expect(screen.getByText("Qu’est-ce qu’on construit?")).toBeInTheDocument();
    expect(screen.queryByText("Conversation CEO")).not.toBeInTheDocument();
    expect(screen.queryByText("Décris ce que tu veux construire")).not.toBeInTheDocument();
    expect(screen.queryByText("Production IA active")).not.toBeInTheDocument();
    expect(screen.queryByText("Mode simple")).not.toBeInTheDocument();
  });

  it("submits text, clears the input and prevents double submit while busy", async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    render(React.createElement(CEOCommandComposer, { loading: false, onSubmit }));

    const textarea = screen.getByPlaceholderText("Message");
    const button = screen.getByRole("button", { name: "Envoyer" });

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

    fireEvent.change(screen.getByPlaceholderText("Message"), { target: { value: "Créer un SaaS" } });
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeDisabled();
  });

  it("renders a final-answer-first result with details hidden by default", () => {
    const { container } = render(React.createElement(CEOResultStage, {
      result,
      mission,
      expertMode: false,
      loading: false,
      error: null,
      onModify: vi.fn(),
      onContinue: vi.fn(),
    }));

    expect(screen.getByText("Le projet est prêt en première version.")).toBeInTheDocument();
    expect(screen.getByText("Clinic appointments SaaS")).toBeInTheDocument();
    expect(screen.queryByText("README.md")).not.toBeInTheDocument();
    expect(screen.queryByText("product-spec.json")).not.toBeInTheDocument();
    expect(screen.queryByText("88/100")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ouvrir workspace/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Voir détails/ })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Voir détails/ }));
    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByText("product-spec.json")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ouvrir workspace/ })).toHaveAttribute("href", "/projects/clinic-saas");
    expect(screen.queryByText(/raw output|runtime id|sessionId/i)).not.toBeInTheDocument();
    expect(container.querySelector(".ceo-chat-messages")).not.toHaveClass("text-white");
    expect(container.querySelector(".ceo-chat-messages")).not.toHaveClass("text-slate-50");
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

    expect(screen.getAllByText(/Je n’ai pas encore produit un résultat exploitable/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Ouvrir workspace/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Voir détails/ }));
    expect(screen.getByText("Aucun artifact réel créé")).toBeInTheDocument();
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

    expect(screen.queryByText(/Mode expert/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Voir détails/ }));
    expect(screen.getByText("Mode expert")).toBeInTheDocument();
  });

  it("renders a requested logo as the primary deliverable without generic brand-system copy", () => {
    render(React.createElement(CEOResultStage, {
      result: {
        ...result,
        title: "Logo EKIDA",
        requestType: "branding",
        brandName: "EKIDA",
        deliverableType: "logo",
        shortMessage: "Voici une première version du logo EKIDA.",
        primaryVisual: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" role="img" aria-label="Logo EKIDA"><rect width="900" height="560" fill="#030712"/><path d="M100 100h120v120H100z" fill="#22C55E"/><text x="300" y="280">EKIDA</text><text x="120" y="300">EK</text></svg>`,
        summary: "Prototype visuel pour EKIDA.",
        artifactPaths: ["generated-products/logo-ekida/logo-concept-a.svg"],
        workspaceHref: "/projects/logo-ekida",
        qualityScore: 84,
      },
      mission: { ...mission, prompt: "logo EKIDA sur fond noir", requestType: "branding" },
      expertMode: false,
      loading: false,
      error: null,
      onModify: vi.fn(),
      onContinue: vi.fn(),
    }));

    expect(screen.queryByText("Voici une première version du logo EKIDA.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Visuel EKIDA")).toBeInTheDocument();
    expect(screen.getByText("EKIDA")).toBeInTheDocument();
    expect(screen.queryByText("EKIDA sur fond noir")).not.toBeInTheDocument();
    expect(screen.queryByText(/Brand system/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Marque à nommer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prototype visuel/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^LOGO$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^A$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^B$/)).not.toBeInTheDocument();
    expect(screen.queryByText("84/100")).not.toBeInTheDocument();
    expect(screen.queryByText("logo-concept-a.svg")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ouvrir workspace/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Modifier/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Voir détails/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Voir détails/ }));
    expect(screen.getByText("logo-concept-a.svg")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ouvrir workspace/ })).toHaveAttribute("href", "/projects/logo-ekida");
  });

  it("renders website requests as a page preview instead of a logo reply", () => {
    const websiteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 760" role="img" aria-label="Preview site web EKIDA"><text>EKIDA</text><text>Collection</text><text>Voir la collection</text></svg>`;

    render(React.createElement(CEOResultStage, {
      result: {
        ...result,
        title: "EKIDA website",
        requestType: "website",
        brandName: "EKIDA",
        deliverableType: "website",
        primaryVisual: websiteSvg,
        summary: "Preview de page web EKIDA.",
        artifactPaths: ["generated-products/ekida-website/README.md"],
        workspaceHref: "/projects/ekida-website",
      },
      mission: { ...mission, prompt: "Je veux une page web bien simple avec le logo ekida", requestType: "website" },
      expertMode: false,
      loading: false,
      error: null,
      onModify: vi.fn(),
      onContinue: vi.fn(),
    }));

    expect(screen.getByLabelText("Preview EKIDA website")).toBeInTheDocument();
    expect(screen.getByText("EKIDA")).toBeInTheDocument();
    expect(screen.getByText("Collection")).toBeInTheDocument();
    expect(screen.queryByLabelText("Visuel EKIDA")).not.toBeInTheDocument();
    expect(screen.queryByText(/Brand system|Marque à nommer|README|workspace|90\/100/i)).not.toBeInTheDocument();
  });

  it("keeps simple chat free of internal production terms", () => {
    render(React.createElement(CEOResultStage, {
      result: {
        ...result,
        title: "Logo EKIDA",
        requestType: "branding",
        brandName: "EKIDA",
        deliverableType: "logo",
        primaryVisual: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" role="img" aria-label="Logo EKIDA"><rect width="900" height="560" fill="#030712"/><path d="M100 100h120v120H100z" fill="#22C55E"/><text x="300" y="280">EKIDA</text></svg>`,
        artifactPaths: ["generated-products/logo-ekida/final-logo.svg"],
        expert: { companyWorkflow: { hiddenDetails: { tournament: { candidates: [{ id: "internal-candidate" }], learningNotes: [{ id: "lesson" }] }, executionTrace: { toolsCalled: ["visual.svg"], checkpoints: [{ id: "checkpoint" }] } } } },
      },
      mission: { ...mission, prompt: "logo EKIDA", requestType: "branding" },
      expertMode: false,
      loading: false,
      error: null,
      onModify: vi.fn(),
      onContinue: vi.fn(),
    }));

    expect(screen.queryByText(/Brand system|Marque à nommer|score|quality report|artifacts|JSON|README|workspace|runtime|process|toolTrace|checkpoints|candidates|playbookTrace/i)).not.toBeInTheDocument();
  });

  it("keeps successive CEO messages tied to their own output and details", () => {
    const logoResult: CEOCurrentResult = {
      ...result,
      title: "Logo EKIDA",
      requestType: "branding",
      brandName: "EKIDA",
      deliverableType: "logo",
      primaryVisual: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560"><rect width="900" height="560" fill="#030712"/><path d="M0 0h1"/><text>EKIDA</text><text>EK</text></svg>`,
      artifactPaths: ["generated-products/logo-ekida/final-logo.svg"],
      expert: { companyWorkflow: { hiddenDetails: { qualityReview: { status: "approved", score: 100 } } } },
    };
    const websiteResult: CEOCurrentResult = {
      ...result,
      title: "EKIDA website",
      requestType: "website",
      brandName: "EKIDA",
      deliverableType: "landing_page",
      primaryVisual: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 760" role="img" aria-label="Preview site web EKIDA"><g aria-label="nav"><text>EKIDA</text></g><g aria-label="hero"><text>Essentiels</text></g><g aria-label="sections"><text>Voir la collection</text></g></svg>`,
      artifactPaths: ["generated-products/ekida-website/README.md"],
      expert: { companyWorkflow: { hiddenDetails: { qualityReview: { status: "approved", score: 95 } } } },
    };

    render(React.createElement(CEOResultStage, {
      result: websiteResult,
      mission: { ...mission, prompt: "Je veux une page web bien simple avec le logo ekida", requestType: "website" },
      turns: [
        { id: "turn-logo", mission: { ...mission, id: "turn-logo", prompt: "logo EKIDA", requestType: "branding" }, result: logoResult },
        { id: "turn-site", mission: { ...mission, id: "turn-site", prompt: "Je veux une page web bien simple avec le logo ekida", requestType: "website" }, result: websiteResult },
      ],
      expertMode: false,
      loading: false,
      error: null,
      onModify: vi.fn(),
      onContinue: vi.fn(),
    }));

    expect(screen.getByText("logo EKIDA")).toBeInTheDocument();
    expect(screen.getByText("Je veux une page web bien simple avec le logo ekida")).toBeInTheDocument();
    expect(screen.getByLabelText("Visuel EKIDA")).toBeInTheDocument();
    expect(screen.getByLabelText("Preview EKIDA website")).toBeInTheDocument();
    const detailsButtons = screen.getAllByRole("button", { name: /Voir détails/ });
    fireEvent.click(detailsButtons[1]);
    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.queryByText("final-logo.svg")).not.toBeInTheDocument();
  });

  it("keeps tool traces hidden until details are opened", () => {
    render(React.createElement(CEOResultStage, {
      result: {
        ...result,
        expert: {
          companyWorkflow: {
            workflow: "website",
            missionPlan: { id: "plan-1" },
            agentRuns: [{ role: "frontend_builder", skillId: "render_website_preview", status: "ok" }],
            hiddenDetails: {
              executionTrace: {
                agentsCalled: ["frontend_builder"],
                skillsCalled: ["render_website_preview"],
                toolsCalled: ["website.preview"],
                checkpoints: [{ taskId: "preview", status: "ok" }],
                qualityResults: [{ ok: true }],
              },
              workflowDetails: { toolTrace: [{ role: "frontend_builder", toolId: "website.preview", status: "ok" }] },
            },
          },
        },
      },
      mission,
      expertMode: false,
      loading: false,
      error: null,
      onModify: vi.fn(),
      onContinue: vi.fn(),
    }));

    expect(screen.queryByText("website.preview")).not.toBeInTheDocument();
    expect(screen.queryByText("render_website_preview")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Voir détails/ }));
    expect(screen.getByText("website.preview")).toBeInTheDocument();
    expect(screen.getByText("render_website_preview")).toBeInTheDocument();
    expect(screen.getByText(/Checkpoints: 1/)).toBeInTheDocument();
  });

  it("shows coaching lessons only inside details", () => {
    render(React.createElement(CEOResultStage, {
      result: {
        ...result,
        expert: {
          companyWorkflow: {
            hiddenDetails: {
              coaching: {
                coachingTrace: [{ agentRole: "logo_designer", lessonIds: ["lesson-ekida-wrong-initial"], checklist: ["Use EKIDA"], activeFailureModes: ["unrelated_initial_symbol"] }],
                profiles: [{ agentRole: "logo_designer", activeLessons: [{ id: "lesson-ekida-wrong-initial", failurePattern: "unrelated_initial_symbol" }], weakSkills: ["generate_logo_concepts"] }],
                skillOptimizations: [{ agentRole: "logo_designer", skillId: "generate_logo_concepts", status: "improved", changes: ["Forbid unrelated initials"] }],
              },
            },
          },
        },
      },
      mission,
      expertMode: false,
      loading: false,
      error: null,
      onModify: vi.fn(),
      onContinue: vi.fn(),
    }));

    expect(screen.queryByText("Coaching agents")).not.toBeInTheDocument();
    expect(screen.queryByText("unrelated_initial_symbol")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Voir détails/ }));
    expect(screen.getByText("Coaching agents")).toBeInTheDocument();
    expect(screen.getByText(/Lessons appliquées: 1/)).toBeInTheDocument();
    expect(screen.getByText("unrelated_initial_symbol")).toBeInTheDocument();
  });
});
