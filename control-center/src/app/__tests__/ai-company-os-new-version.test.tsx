import fs from "fs";
import os from "os";
import path from "path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppShell from "@/components/AppShell";
import CeoPage from "@/app/ceo/page";
import { buildProductArtifacts } from "@/lib/product-builder/artifactWriter";
import { assertNoCompletedStepWithoutArtifacts } from "@/lib/product-builder/executionLedger";
import { validateGeneratedProduct } from "@/lib/product-builder/qualityGate";
import { RESET_CONFIRMATION, resetCompanyOs } from "@/lib/resetCompanyOs";

const platformNav = ["CEO Chat", "Missions", "Agents", "Workspaces", "Artifacts", "Skills", "Evals", "Settings"];

let tempRoot = "";

function installLocalStorage(initial: Array<[string, string]> = []) {
  const store = new Map<string, string>(initial);
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
  });
  return store;
}

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  });
}

function stubSimpleAgencyView(view: Record<string, unknown>) {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/ceo/simple-agency")) return jsonResponse({ ok: true, view });
    return jsonResponse({ ok: true });
  }));
}

beforeEach(() => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-company-os-suite-"));
  globalThis.__TEST_PATHNAME__ = "/ceo";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe("AI Company OS new version regression suite", () => {
  it("renders the active platform sidebar", () => {
    installLocalStorage();
    const { container } = render(React.createElement(AppShell, null, React.createElement("main", null, "Simple shell")));
    const dock = container.querySelector(".os-dock");
    expect(dock).toBeInTheDocument();
    const dockScope = within(dock as HTMLElement);

    for (const label of platformNav) {
      expect(dockScope.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(container.querySelector(".platform-sidebar")).toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/Mode simple|Production IA active|Conversation CEO/);
  });

  it("renders CEO simple as a central Command Surface without technical rails or IDs", async () => {
    stubSimpleAgencyView({
      messages: [],
      companies: [],
      projects: [],
      sessions: [],
      outputs: [],
      approvals: [],
    });

    const { container } = render(React.createElement(CeoPage));

    expect(await screen.findByLabelText("Chat CEO")).toBeInTheDocument();
    expect(container.querySelector(".right-rail")).not.toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/Mission Room|autopilot|sessionId|projectId|workspaceId|Décris ce que tu veux construire|Conversation CEO/i);
  });

  it("shows final-answer-first CEO logo output with details hidden by default", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (String(url).includes("/api/ceo/command")) {
        return jsonResponse({
          ok: true,
          title: "Logo ELEVIO",
          brandName: "ELEVIO",
          deliverableType: "logo",
          shortMessage: "Voici une première version du logo ELEVIO.",
          primaryArtifactId: "artifact-elevio-logo",
          primaryVisual: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" role="img" aria-label="Logo ELEVIO"><rect width="400" height="240" fill="#030712"/><path d="M92 82h72M92 120h54M92 158h72" stroke="#fff" stroke-width="18" stroke-linecap="round"/><text x="220" y="137" fill="#fff" font-size="52" font-weight="900">ELEVIO</text></svg>`,
          projectId: "elevio-brand-system",
          workspaceHref: "/projects/elevio-brand-system",
          requestType: "branding",
          status: "ready",
          qualityStatus: "Prêt",
          qualityScore: 90,
          summary: "Direction de marque pour ELEVIO avec prototypes SVG.",
          artifactPaths: [
            "generated-products/elevio-brand-system/brand-brief.json",
            "generated-products/elevio-brand-system/logo-concept-a.svg",
            "generated-products/elevio-brand-system/logo-concept-b.svg",
            "generated-products/elevio-brand-system/logo-concept-c.svg",
          ],
        });
      }
      return jsonResponse({ ok: true, view: { messages: [], companies: [], projects: [], sessions: [], outputs: [], approvals: [] } });
    }));

    render(React.createElement(CeoPage));
    fireEvent.change(await screen.findByPlaceholderText("Message"), { target: { value: "je veux un logo pour une compagnie qui s'appelle ELEVIO" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByText("ELEVIO")).toBeInTheDocument();
    expect(screen.queryByText("Voici une première version du logo ELEVIO.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Nouvelle Marque AI/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prototype visuel|90\/100|brand-brief.json/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^LOGO$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ouvrir workspace/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Modifier/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Voir détails/ })).toBeInTheDocument();
    expect(screen.queryByText("brand-brief.json")).not.toBeInTheDocument();
    expect(screen.queryByText("90/100")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Voir détails/ }));
    expect(screen.getByRole("link", { name: /Ouvrir workspace/ })).toHaveAttribute("href", "/projects/elevio-brand-system");
    expect(screen.getByText("logo-concept-a.svg")).toBeInTheDocument();
  });

  it("creates real SaaS artifacts with spec, README, ledger artifact paths and quality gate", () => {
    const productsDir = path.join(tempRoot, "generated-products");
    vi.stubEnv("AI_COMPANY_PRODUCTS_DIR", productsDir);

    const result = buildProductArtifacts({
      requestText: "Je veux un SaaS pour gérer les rendez-vous d'une clinique",
      requestType: "saas",
    });
    const projectDir = path.join(productsDir, result.spec.slug);

    expect(fs.existsSync(projectDir)).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "product-spec.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "README.md"))).toBe(true);
    expect(result.artifactPaths).toEqual(expect.arrayContaining([
      expect.stringContaining("product-spec.json"),
      expect.stringContaining("README.md"),
    ]));
    expect(result.ledger.steps.every((step) => step.status !== "completed" || step.artifactPaths.length > 0)).toBe(true);
    expect(() => assertNoCompletedStepWithoutArtifacts(result.ledger)).not.toThrow();
    expect(result.qualityGate.ok).toBe(true);
    expect(result.qualityGate.summary).toMatch(/passed|missing/i);
    expect(validateGeneratedProduct(projectDir).ok).toBe(true);
  });

  it("qualityGate explains failures instead of marking incomplete products ready", () => {
    const brokenProject = path.join(tempRoot, "generated-products", "broken");
    fs.mkdirSync(brokenProject, { recursive: true });

    const gate = validateGeneratedProduct(brokenProject);

    expect(gate.ok).toBe(false);
    expect(gate.missingFiles).toEqual(expect.arrayContaining(["README.md", "product-spec.json", "app-map.md"]));
    expect(gate.summary).toMatch(/missing required files/i);
  });

  it("resets stale data safely without deleting .env.local or letting ELEVIO return", () => {
    const rootDir = path.join(tempRoot, "control-center");
    fs.mkdirSync(path.join(rootDir, "data"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "..", "data"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "..", "logs"), { recursive: true });
    fs.writeFileSync(path.join(rootDir, ".env.local"), "NVIDIA_API_KEY=secret\n", "utf-8");
    fs.writeFileSync(path.join(rootDir, "data", "ceo-chat.json"), JSON.stringify({ messages: [{ text: "ELEVIO" }] }), "utf-8");
    fs.writeFileSync(path.join(rootDir, "data", "company-workspaces.json"), JSON.stringify({ workspaces: [{ name: "ELEVIO" }] }), "utf-8");
    fs.writeFileSync(path.join(rootDir, "data", "visible-outputs.json"), JSON.stringify({ outputs: [{ title: "ELEVIO logo" }] }), "utf-8");

    expect(() => resetCompanyOs({ rootDir })).toThrow(/CONFIRM_RESET=AI_COMPANY_OS_RESET/);
    const result = resetCompanyOs({ rootDir, confirm: RESET_CONFIRMATION });

    expect(result.ok).toBe(true);
    expect(fs.readFileSync(path.join(rootDir, ".env.local"), "utf-8")).toBe("NVIDIA_API_KEY=secret\n");
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ceo-chat.json"), "utf-8")).messages).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "company-workspaces.json"), "utf-8")).workspaces).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "visible-outputs.json"), "utf-8")).outputs).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("NVIDIA_API_KEY=secret");
    expect(JSON.stringify({
      chat: fs.readFileSync(path.join(rootDir, "data", "ceo-chat.json"), "utf-8"),
      workspaces: fs.readFileSync(path.join(rootDir, "data", "company-workspaces.json"), "utf-8"),
      outputs: fs.readFileSync(path.join(rootDir, "data", "visible-outputs.json"), "utf-8"),
    })).not.toContain("ELEVIO");
  });
});
