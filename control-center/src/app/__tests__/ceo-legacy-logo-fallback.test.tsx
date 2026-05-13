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

const ekidaLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" role="img" aria-label="Logo EKIDA"><rect width="480" height="300" fill="#030712"/><path d="M96 86h92M96 150h70M96 214h92" stroke="#fff" stroke-width="22" stroke-linecap="round"/><text x="238" y="168" fill="#fff" font-size="58" font-weight="900">EKIDA</text></svg>`;
const ekidaWebsiteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" role="img" aria-label="Preview site web EKIDA"><rect width="900" height="620" fill="#09090b"/><g aria-label="nav"><text x="72" y="64" fill="#fff">EKIDA</text></g><g aria-label="hero"><text x="72" y="180" fill="#fff">Vêtements essentiels</text><rect x="72" y="220" width="180" height="48" rx="24" fill="#fff"/></g><g aria-label="sections"><rect x="72" y="350" width="220" height="150" fill="#18181b"/><rect x="326" y="350" width="220" height="150" fill="#18181b"/></g></svg>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CEO legacy logo fallback removal", () => {
  it("does not render the old generic SVG/card when a logo response has no validated workflow visual", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (String(url).includes("/api/ceo/command")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({
            ok: false,
            title: "Logo non généré",
            brandName: "EKIDA",
            deliverableType: "logo",
            requestType: "branding",
            status: "failed",
            summary: "Le workflow validé n'a pas produit de livrable visuel exploitable.",
            artifactPaths: [],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, view: emptyView() }) });
    }));

    const { container } = render(React.createElement(CeoPage));
    fireEvent.change(await screen.findByPlaceholderText("Message"), { target: { value: "logo EKIDA" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(screen.getAllByText(/Je n’ai pas encore produit un résultat exploitable/i).length).toBeGreaterThan(0));
    const html = container.innerHTML;
    expect(html).not.toContain("Brand system");
    expect(html).not.toContain("Marque à nommer");
    expect(html).not.toContain("Prototype visuel");
    expect(html).not.toContain("viewBox=\"0 0 520 320\"");
    expect(html).not.toContain("M30 73 L52 31 L74 73");
    expect(html).not.toContain("logo-EKIDA-bg");
    expect(html).not.toMatch(/>\s*B\s*</);
  });

  it("renders only a validated logo artifact for logo EKIDA", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (String(url).includes("/api/ceo/command")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            title: "Logo EKIDA",
            brandName: "EKIDA",
            deliverableType: "logo",
            requestType: "branding",
            status: "ready",
            summary: "Logo validé.",
            primaryArtifactId: "artifact-ekida-logo",
            primaryVisual: ekidaLogoSvg,
            artifactPaths: ["generated-products/ekida/final-logo.svg"],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, view: emptyView() }) });
    }));

    const { container } = render(React.createElement(CeoPage));
    fireEvent.change(await screen.findByPlaceholderText("Message"), { target: { value: "logo EKIDA" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect((await screen.findAllByLabelText("Logo EKIDA")).length).toBeGreaterThan(0);
    expect(container.innerHTML).toContain("EKIDA");
    expect(container.innerHTML).not.toMatch(/Brand system|Marque à nommer|Prototype visuel|viewBox="0 0 520 320"|M30 73 L52 31 L74 73|>\s*B\s*</);
  });

  it("does not reuse the previous logo as the primary response for a website request", async () => {
    let commandCount = 0;
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (String(url).includes("/api/ceo/command")) {
        commandCount += 1;
        if (commandCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              ok: true,
              title: "Logo EKIDA",
              brandName: "EKIDA",
              deliverableType: "logo",
              requestType: "branding",
              status: "ready",
              primaryArtifactId: "artifact-ekida-logo",
              primaryVisual: ekidaLogoSvg,
              artifactPaths: ["generated-products/ekida/final-logo.svg"],
              summary: "Logo validé.",
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            title: "Preview site web EKIDA",
            brandName: "EKIDA",
            deliverableType: "website",
            requestType: "website",
            status: "ready",
            primaryArtifactId: "artifact-ekida-website",
            primaryVisual: ekidaWebsiteSvg,
            artifactPaths: ["generated-products/ekida/website-preview.svg"],
            summary: "Preview website validée.",
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, view: emptyView() }) });
    }));

    const { container } = render(React.createElement(CeoPage));
    const input = await screen.findByPlaceholderText("Message");
    fireEvent.change(input, { target: { value: "logo EKIDA" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect((await screen.findAllByLabelText("Logo EKIDA")).length).toBeGreaterThan(0);

    fireEvent.change(input, { target: { value: "Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByLabelText("Preview Preview site web EKIDA")).toBeInTheDocument();
    expect(container.innerHTML).toContain("aria-label=\"nav\"");
    expect(container.innerHTML).toContain("aria-label=\"hero\"");
    expect(container.innerHTML).toContain("aria-label=\"sections\"");
  });
});
