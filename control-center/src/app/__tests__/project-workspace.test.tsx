import fs from "fs";
import os from "os";
import path from "path";
import { render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppShell from "@/components/AppShell";
import { AgencyDashboard } from "@/components/os/AgencyDashboard";
import ProjectWorkspace from "@/components/projects/ProjectWorkspace";
import { buildProductArtifacts } from "@/lib/product-builder/artifactWriter";
import { readGeneratedProject } from "@/lib/product-builder/workspace";

let root = "";

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

function buildClinicWorkspace() {
  const result = buildProductArtifacts({
    requestText: "Je veux un SaaS pour gérer les rendez-vous d'une clinique",
    requestType: "saas",
  });
  const workspace = readGeneratedProject(result.spec.slug);
  if (!workspace) throw new Error("Expected generated workspace");
  return workspace;
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-company-workspace-"));
  vi.stubEnv("AI_COMPANY_PRODUCTS_DIR", root);
  installLocalStorage();
  globalThis.__TEST_PATHNAME__ = "/projects";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fs.rmSync(root, { recursive: true, force: true });
});

describe("generated project workspaces", () => {
  it("shows generated products in /projects", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        view: {
          companies: [],
          projects: [],
          sessions: [],
          outputs: [],
          approvals: [],
          generatedProjects: [{
            id: "clinic-appointments-saas",
            slug: "clinic-appointments-saas",
            title: "Clinic appointments SaaS",
            requestType: "saas",
            status: "generated",
            updatedAt: "2026-05-11T12:00:00.000Z",
            summary: "Produit clinique généré avec artifacts locaux.",
            artifactCount: 18,
          }],
        },
      }),
    })));

    render(React.createElement(AgencyDashboard, { variant: "projects" }));

    expect(await screen.findByText("Clinic appointments SaaS")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ouvrir le workspace" })).toHaveAttribute("href", "/projects/clinic-appointments-saas");
    expect(screen.queryByText("Aucun projet actif")).not.toBeInTheDocument();
  });

  it("renders a simple workspace with primary artifacts and versions", async () => {
    const workspace = buildClinicWorkspace();
    globalThis.__TEST_PATHNAME__ = `/projects/${workspace.slug}`;

    const { container } = render(React.createElement(AppShell, null, React.createElement(ProjectWorkspace, { workspace })));

    expect(screen.getByRole("heading", { level: 1, name: "Clinic appointments SaaS" })).toBeInTheDocument();
    expect(screen.getByText("Fichiers générés")).toBeInTheDocument();
    expect(screen.getByText("Historique des versions")).toBeInTheDocument();
    expect(screen.getByText("Version 1")).toBeInTheDocument();
    expect(screen.getAllByText(/README.md/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/product-spec.json/).length).toBeGreaterThan(0);
    expect(container.textContent ?? "").not.toContain("projectId");
    expect(container.textContent ?? "").not.toContain("execution-ledger.json");
    expect(container.textContent ?? "").not.toContain("Raw outputs");
  });

  it("shows ledger, raw outputs and technical details in expert mode", async () => {
    const workspace = buildClinicWorkspace();
    installLocalStorage([["ai-company-os-view-mode", "expert"]]);
    globalThis.__TEST_PATHNAME__ = `/projects/${workspace.slug}`;

    const { container } = render(React.createElement(AppShell, null, React.createElement(ProjectWorkspace, { workspace })));

    await waitFor(() => expect(screen.getByText("Détails techniques")).toBeInTheDocument());
    expect(screen.getByText("projectId")).toBeInTheDocument();
    expect(screen.getByText("Ledger")).toBeInTheDocument();
    expect(screen.getByText("Quality report et révisions")).toBeInTheDocument();
    expect(screen.getByText("Raw outputs")).toBeInTheDocument();
    expect(container.textContent ?? "").toContain("execution-ledger.json");
    expect(container.textContent ?? "").toContain("step-1");
  });

  it("shows an honest empty state when a manifest has no real artifacts", () => {
    const workspace = buildClinicWorkspace();
    globalThis.__TEST_PATHNAME__ = `/projects/${workspace.slug}`;

    render(React.createElement(AppShell, null, React.createElement(ProjectWorkspace, {
      workspace: {
        ...workspace,
        artifactPaths: [],
        primaryArtifactPaths: [],
        artifactCount: 0,
        versions: [{ ...workspace.versions[0], artifactPaths: [] }],
      },
    })));

    expect(screen.getByText("Aucun artifact réel trouvé.")).toBeInTheDocument();
  });

  it("keeps simple mode free of technical logs and ids while expert navigation remains global", async () => {
    const workspace = buildClinicWorkspace();
    globalThis.__TEST_PATHNAME__ = `/projects/${workspace.slug}`;

    const { container } = render(React.createElement(AppShell, null, React.createElement(ProjectWorkspace, { workspace })));
    const dock = container.querySelector(".os-dock") as HTMLElement;
    const dockScope = within(dock);

    expect(dockScope.getByRole("link", { name: "CEO Chat" })).toBeInTheDocument();
    expect(dockScope.getByRole("link", { name: "Missions" })).toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/runtime events|sessionId|workspaceId|logs/i);
  });
});
