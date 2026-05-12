import fs from "fs";
import os from "os";
import path from "path";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppShell from "@/components/AppShell";
import CeoPage from "@/app/ceo/page";
import { buildProductArtifacts } from "@/lib/product-builder/artifactWriter";
import { assertNoCompletedStepWithoutArtifacts } from "@/lib/product-builder/executionLedger";
import { validateGeneratedProduct } from "@/lib/product-builder/qualityGate";
import { RESET_CONFIRMATION, resetCompanyOs } from "@/lib/resetCompanyOs";

const simpleNav = ["CEO", "Entreprises", "Projets", "Resultats", "Expert"];
const hiddenSimpleNav = ["Agents", "Approvals", "Mission Rooms", "Workspaces", "Settings", "Runtime", "Logs"];
const expertNav = [...hiddenSimpleNav, "System Health", "Demo Center", "Conversations", "Revenue", "CRM", "Distribution"];

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
  it("keeps simple navigation minimal and hides advanced modules", () => {
    installLocalStorage();
    const { container } = render(React.createElement(AppShell, null, React.createElement("main", null, "Simple shell")));
    const dock = container.querySelector(".os-dock");
    expect(dock).toBeInTheDocument();
    const dockScope = within(dock as HTMLElement);

    for (const label of simpleNav) {
      expect(dockScope.getByRole("link", { name: label })).toBeInTheDocument();
    }
    for (const label of hiddenSimpleNav) {
      expect(dockScope.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
  });

  it("restores advanced modules in global expert mode and persists after refresh", async () => {
    const store = installLocalStorage();
    const { container, unmount } = render(React.createElement(AppShell, null, React.createElement("main", null, "Expert shell")));

    fireEvent.click(screen.getByRole("button", { name: "Mode expert" }));
    await waitFor(() => expect(store.get("ai-company-os-view-mode")).toBe("expert"));
    let dockScope = within(container.querySelector(".os-dock") as HTMLElement);
    for (const label of expertNav) {
      expect(dockScope.getByRole("link", { name: label })).toBeInTheDocument();
    }

    unmount();
    render(React.createElement(AppShell, null, React.createElement("main", null, "Expert shell after refresh")));
    await waitFor(() => expect(screen.getAllByRole("link", { name: "Runtime" }).length).toBeGreaterThan(0));
    dockScope = within(document.querySelector(".os-dock") as HTMLElement);
    expect(dockScope.getByRole("link", { name: "Mission Rooms" })).toBeInTheDocument();
    expect(store.get("ai-company-os-view-mode")).toBe("expert");
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

    expect(await screen.findByLabelText("Command Surface")).toBeInTheDocument();
    expect(container.querySelector(".right-rail")).not.toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/Mission Room|autopilot|sessionId|projectId|workspaceId/i);
  });

  it("shows simple result actions on CEO logo artifact outputs", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (String(url).includes("/api/ceo/command")) {
        return jsonResponse({
          ok: true,
          title: "ELEVIO brand system",
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
    fireEvent.change(await screen.findByPlaceholderText("Décris ce que tu veux construire..."), { target: { value: "je veux un logo pour une compagnie qui s'appelle ELEVIO" } });
    fireEvent.click(screen.getByRole("button", { name: "Construire" }));

    expect(await screen.findByRole("heading", { name: "ELEVIO brand system" })).toBeInTheDocument();
    expect(screen.queryByText(/Nouvelle Marque AI/i)).not.toBeInTheDocument();
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
