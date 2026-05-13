import { expect, test } from "@playwright/test";

const logoPrompt = "je veux un logo ekida";
const websitePrompt = "Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge";

async function submitLogoRequest(page: import("@playwright/test").Page) {
  await page.goto("/ceo");
  await expect(page.locator(".platform-sidebar")).toBeVisible();
  await page.getByPlaceholder("Message").fill(logoPrompt);
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Action requise").first()).toBeVisible();
  await expect(page.getByText(/Aucun generateur visuel reel branche|Aucun générateur visuel réel branché/).first()).toBeVisible();
}

test.describe("CEO runtime shell", () => {
  test("opens the product home and starts a new CEO chat", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Que veux-tu construire aujourd'hui?" })).toBeVisible();
    await page.getByRole("link", { name: /Parler au CEO/ }).click();
    await expect(page).toHaveURL(/\/ceo$/);
    await expect(page.getByLabel("Chat CEO")).toBeVisible();
    await page.getByRole("link", { name: "Nouveau chat" }).click();
    await expect(page.getByPlaceholder("Message")).toBeVisible();
  });

  test("shows the black sidebar and complete simple CEO controls", async ({ page }) => {
    await page.goto("/ceo");

    const sidebar = page.locator(".platform-sidebar");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveCSS("background-color", "rgb(5, 5, 5)");

    for (const label of ["AI Company OS", "CEO Chat", "Missions", "Agents", "Mode expert"]) {
      await expect(sidebar.getByText(label, { exact: label !== "AI Company OS" })).toBeVisible();
    }

    for (const label of ["CEO Chat", "Missions", "Agents"]) {
      const item = sidebar.getByRole("link", { name: label });
      const box = await item.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(150);
    }

    await expect(page.locator(".ceo-chat-shell")).toBeVisible();
    await expect(page.getByPlaceholder("Message")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter des fichiers" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Envoyer" })).toBeVisible();
  });

  test("runs the logo flow without automatic image and only renders local SVG after explicit action", async ({ page }) => {
    await submitLogoRequest(page);
    await page.screenshot({ path: "test-results/ceo-shell.png", fullPage: true });

    await expect(page.getByLabel(/Prototype de logo/i)).toHaveCount(0);
    await expect(page.locator(".ceo-chat-visual-reply.brand")).toHaveCount(0);
    await expect(page.getByText("Timeline équipe")).toHaveCount(0);
    await expect(page.getByText(/providerUsed:/)).toHaveCount(0);

    await page.getByRole("button", { name: /Preparer le brief|Préparer le brief/ }).click();
    await expect(page.getByText(/Brief logo EKIDA/i)).toBeVisible();
    await expect(page.getByText(/Brief disponible|analyse demande|directions/i).first()).toBeVisible();

    await page.getByRole("button", { name: /Créer prompts visuels|Creer prompts visuels/ }).last().click();
    await expect(page.getByText(/Prompts visuels EKIDA/i)).toBeVisible();
    await expect(page.getByText(/NVIDIA qwen-image|NVIDIA FLUX|NVIDIA visual-genai NIM/i).first()).toBeVisible();

    await expect(page.getByLabel(/Prototype de logo EKIDA/i)).toHaveCount(0);
    await page.getByRole("button", { name: "Prototype SVG local" }).last().click();
    await expect(page.getByText("Prototype local").last()).toBeVisible();
    await expect(page.getByLabel("Prototype de logo EKIDA")).toBeVisible();
    await page.screenshot({ path: "test-results/ceo-logo-flow.png", fullPage: true });

    await page.getByRole("button", { name: "Voir détails" }).last().click();
    await expect(page.getByLabel("Détails du résultat")).toBeVisible();
    await expect(page.getByText(/Prototype SVG local|Prototype vectoriel local/i).first()).toBeVisible();

    await expect(page.getByRole("link", { name: "Ouvrir le mode expert" })).toHaveAttribute("href", "/ceo/expert");
  });

  test("handles a website request as a traceable preview without old logo fallback", async ({ page }) => {
    await page.goto("/ceo");
    await page.getByPlaceholder("Message").fill(websitePrompt);
    await page.getByRole("button", { name: "Envoyer" }).click();

    await expect(page.getByLabel(/Preview .*EKIDA|Preview site web EKIDA/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Provider réel").first()).toBeVisible();
    await expect(page.locator(".ceo-chat-visual-reply.brand")).toHaveCount(0);
    await expect(page.getByText(/Brand system|Marque à nommer|Prototype visuel/i)).toHaveCount(0);
  });
});

test.describe("CEO expert runtime evidence", () => {
  test("loads real mission diagnostics with agents, provider and review details", async ({ page }) => {
    await page.goto("/ceo/expert");

    const sidebar = page.locator(".platform-sidebar");
    await expect(sidebar).toBeVisible();
    for (const label of ["CEO Chat", "Missions", "Agents", "Companies", "Projects", "Outputs", "Runtime", "Expert"]) {
      await expect(sidebar.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    await page.getByRole("button", { name: "Charger preuve runtime" }).click();
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("Timeline équipe");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("CEO");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("Mission Planner");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("Brand Strategist");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("NVIDIA Image Agent");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("Artifact Manager");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("providerUsed");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("sourceType");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("critic");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("reviewer");
    await page.screenshot({ path: "test-results/ceo-expert.png", fullPage: true });

    await page.getByRole("link", { name: "CEO Chat", exact: true }).click();
    await expect(page).toHaveURL(/\/ceo$/);
    await expect(page.getByRole("link", { name: "Companies", exact: true })).toHaveCount(0);
  });

  test("loads website team diagnostics with the full website team", async ({ page }) => {
    await page.goto("/ceo/expert");
    await page.getByRole("button", { name: "Preuve équipe website" }).click();
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("website-team-playbook");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("CEO");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("Product Owner");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("UX Strategist");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("UI Designer");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("Frontend Architect");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("QA");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("Reviewer");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("Artifact Manager");
  });

  test("shows expert diagnostics without exposing secret values", async ({ page }) => {
    await page.goto("/ceo/expert/diagnostics");

    await expect(page.getByRole("heading", { name: "CEO Runtime Diagnostics" })).toBeVisible();
    await expect(page.getByText("Git SHA")).toBeVisible();
    await expect(page.getByText("Provider image réel")).toBeVisible();
    await expect(page.getByText("aucun configuré")).toBeVisible();
    await expect(page.getByText("NVIDIA_API_KEY")).toBeVisible();
    await expect(page.getByText(/npm run test:e2e/)).toBeVisible();
    await expect(page.getByText(/nvapi-|PRIVATE KEY|BEGIN PRIVATE/i)).toHaveCount(0);
  });
});

test.describe("CEO command API", () => {
  test("returns traceable logo states and keeps local SVG explicit", async ({ request }) => {
    const conversationId = `e2e-ceo-${Date.now()}`;

    const base = await request.post("/api/ceo/command", {
      data: { prompt: logoPrompt, conversationId },
    });
    expect(base.ok()).toBe(true);
    const noProvider = await base.json();
    expect(noProvider.status).toBe("needs_action");
    expect(noProvider.sourceType).toBe("none");
    expect(noProvider.primaryVisual).toBeNull();
    expect(noProvider.primaryArtifactId).toBeNull();
    expect(noProvider.providerUsed).toBe("none");

    const briefResponse = await request.post("/api/ceo/command", {
      data: { prompt: logoPrompt, conversationId, action: "prepare_brief" },
    });
    const brief = await briefResponse.json();
    expect(brief.ok).toBe(true);
    expect(brief.deliverableType).toBe("logo_brief");
    expect(brief.summary).toContain("Brief");
    expect(brief.primaryVisual).toBeNull();

    const promptsResponse = await request.post("/api/ceo/command", {
      data: { prompt: logoPrompt, conversationId, action: "create_visual_prompts" },
    });
    const prompts = await promptsResponse.json();
    expect(prompts.ok).toBe(true);
    expect(prompts.deliverableType).toBe("logo_prompts");
    expect(prompts.summary).toMatch(/NVIDIA qwen-image|NVIDIA FLUX|NVIDIA visual-genai NIM/i);
    expect(prompts.primaryVisual).toBeNull();

    const prototypeResponse = await request.post("/api/ceo/command", {
      data: { prompt: logoPrompt, conversationId, action: "request_local_prototype" },
    });
    const prototype = await prototypeResponse.json();
    expect(prototype.ok).toBe(true);
    expect(prototype.sourceType).toBe("local_svg");
    expect(prototype.providerUsed).toBe("local_svg_renderer_explicit");
    expect(prototype.primaryVisual).toContain("<svg");
    expect(prototype.primaryArtifactId).toBeTruthy();
  });
});
