import { expect, test } from "@playwright/test";

const logoPrompt = "je veux un logo ekida";
const websitePrompt = "Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge";

async function submitLogoRequest(page: import("@playwright/test").Page) {
  await page.goto("/ceo");
  await expect(page.locator(".platform-sidebar")).toBeVisible();
  await page.getByPlaceholder("Message").fill(logoPrompt);
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText(/Agent Graphiste prêt|Voici votre visuel final/i).first()).toBeVisible({ timeout: 30_000 });
}

test.describe("CEO runtime shell", () => {
  test("opens the product home and starts a new CEO chat", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Accueil" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Agents" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Projets" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Outputs" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Expert Mode" })).toBeVisible();
    await expect(page.getByLabel("Chat CEO")).toBeVisible();
    await expect(page.getByPlaceholder("Message")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter des fichiers" })).toBeVisible();
    await expect(page.getByRole("button", { name: /mode clair|mode sombre/i })).toBeVisible();
    await expect(page.getByText("CEO en ligne")).toHaveCount(0);
    await expect(page.getByText("Nouveau chat")).toHaveCount(0);
  });

  test("shows the black sidebar and complete simple CEO controls", async ({ page }) => {
    await page.goto("/ceo");

    const sidebar = page.locator(".platform-sidebar");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveCSS("background-color", "rgb(5, 5, 5)");

    for (const label of ["AI Company OS", "Accueil", "CEO Chat", "Projets", "Agents", "Outputs", "Expert Mode"]) {
      await expect(sidebar.getByText(label, { exact: label !== "AI Company OS" })).toBeVisible();
    }
    await expect(sidebar.getByRole("link", { name: /chat|conversation/i })).toHaveCount(1);
    await expect(sidebar.getByRole("link", { name: "CEO Chat", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Conversations/i })).toHaveCount(0);

    for (const label of ["Accueil", "CEO Chat", "Projets", "Agents", "Outputs"]) {
      const item = sidebar.getByRole("link", { name: label });
      const box = await item.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(150);
    }

    await expect(page.locator(".ceo-chat-shell")).toBeVisible();
    await expect(page.getByPlaceholder("Message")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter des fichiers" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Envoyer" })).toBeVisible();
    await expect(page.getByText("CEO en ligne")).toHaveCount(0);
  });

  test("routes logo flow to Agent Graphiste with real artifacts or clear provider error", async ({ page }) => {
    await submitLogoRequest(page);
    await page.screenshot({ path: "test-results/ceo-shell.png", fullPage: true });

    await expect(page.getByLabel(/Prototype de logo/i)).toHaveCount(0);
    await expect(page.locator(".ceo-chat-visual-reply.brand")).toHaveCount(0);
    await expect(page.getByText("Timeline équipe")).toHaveCount(0);
    await expect(page.getByText(/providerUsed:/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Préparer le brief|Créer prompts visuels|Prototype SVG local/ })).toHaveCount(0);
    if (await page.locator(".ceo-chat-generated-image").count()) {
      await expect(page.getByText("Provider réel").first()).toBeVisible();
      await expect(page.getByText("Travail de l’équipe").first()).toBeVisible();
    } else {
      await expect(page.getByText("Action requise").first()).toBeVisible();
      await expect(page.getByText("Agent Graphiste prêt, mais aucun moteur DeepInfra n’est configuré.").first()).toBeVisible();
    }
    await page.screenshot({ path: "test-results/ceo-logo-flow.png", fullPage: true });

    await page.getByRole("button", { name: "Voir travail de l’équipe" }).last().click();
    await expect(page.getByLabel("Détails du résultat")).toBeVisible();
    if (await page.locator(".ceo-chat-generated-image").count()) {
      await expect(page.getByText("Artifacts créés").first()).toBeVisible();
      await expect(page.getByText("Aucun artifact réel créé")).toHaveCount(0);
    } else {
      await expect(page.getByText("Aucun artifact réel créé")).toBeVisible();
    }

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

  test("real CEO logo flow uses Agent Graphiste and never shows fake SVG without DeepInfra", async ({ page }) => {
    await page.goto("/ceo");
    await page.getByPlaceholder("Message").fill("je veux un logo EKIDA CANADA");
    await page.getByRole("button", { name: "Envoyer" }).click();

    await expect(page.getByText(/Agent Graphiste prêt|Voici votre visuel final/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/^Aucun générateur visuel réel branché$/)).toHaveCount(0);
    await expect(page.getByLabel(/Prototype de logo/i)).toHaveCount(0);
    if (await page.locator(".ceo-chat-generated-image").count()) {
      await expect(page.locator(".ceo-chat-generated-image").first()).toBeVisible();
      await expect(page.getByText("Voici votre visuel final.").first()).toBeVisible();
      await expect(page.getByText("Provider réel").first()).toBeVisible();
    } else {
      await expect(page.getByText("Agent Graphiste prêt, mais aucun moteur DeepInfra n’est configuré.").first()).toBeVisible();
    }

    await page.screenshot({ path: "test-results/deepinfra-real-logo-flow.png", fullPage: true });
  });
});

test.describe("CEO expert runtime evidence", () => {
  test("loads real mission diagnostics with agents, provider and review details", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/ceo/expert");

    const sidebar = page.locator(".platform-sidebar");
    await expect(sidebar).toBeVisible();
    for (const label of ["Accueil", "CEO Chat", "Projets", "Agents", "Outputs", "Companies", "Runtime", "Expert Mode"]) {
      await expect(sidebar.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await expect(sidebar.getByRole("link", { name: /chat|conversation/i })).toHaveCount(1);
    await expect(sidebar.getByRole("link", { name: "CEO Chat", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Conversations/i })).toHaveCount(0);

    await page.getByRole("button", { name: "Charger preuve runtime" }).click();
    await expect(page.getByRole("button", { name: "Charger preuve runtime" })).toBeEnabled({ timeout: 60_000 });
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("Timeline équipe", { timeout: 60_000 });
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("graphic-designer");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("providerUsed");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("sourceType");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("critic");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("reviewer");
    await page.screenshot({ path: "test-results/ceo-expert.png", fullPage: true });

    await page.getByRole("link", { name: "CEO Chat", exact: true }).click();
    await expect(page).toHaveURL(/\/ceo$/);
    await expect(page.getByRole("link", { name: "Companies", exact: true })).toBeVisible();
    await expect(page.locator(".platform-shell")).toHaveAttribute("data-mode", "expert");
    await page.getByRole("button", { name: "Mode normal" }).click();
    await expect(page.locator(".platform-shell")).toHaveAttribute("data-mode", "simple");
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

  test("loads long mission autopilot proof with subtasks and checkpoints", async ({ page }) => {
    await page.goto("/ceo/expert");
    await page.getByRole("button", { name: "Preuve mission longue" }).click();
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("Autopilot long mission");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("Sous-tâches");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("Checkpoints / événements");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("providerUsed");
    await expect(page.getByTestId("ceo-expert-runtime-proof")).toContainText("sourceType");
  });

  test("shows expert diagnostics without exposing secret values", async ({ page }) => {
    await page.goto("/ceo/expert/diagnostics");

    await expect(page.getByRole("heading", { name: "CEO Runtime Diagnostics" })).toBeVisible();
    await expect(page.getByText("Git SHA")).toBeVisible();
    await expect(page.getByText("Provider image réel")).toBeVisible();
    await expect(page.getByText("aucun configuré")).toBeVisible();
    await expect(page.getByText("NVIDIA_API_KEY", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copier config requise" })).toBeVisible();
    await expect(page.getByLabel("Configuration NVIDIA image requise")).toContainText("IMAGE_PROVIDER=nvidia");
    await expect(page.getByLabel("Configuration NVIDIA image requise")).toContainText("NVIDIA_IMAGE_ENDPOINT=<endpoint NVIDIA image réel depuis build.nvidia.com>");
    await page.getByRole("button", { name: "Tester NVIDIA Image" }).click();
    await expect(page.getByText(/Échec NVIDIA Image|Succès NVIDIA Image/)).toBeVisible();
    await expect(page.getByText(/variables manquantes|artifact test créé/i).first()).toBeVisible();
    await expect(page.getByText(/npm run test:e2e/)).toBeVisible();
    await expect(page.getByText(/nvapi-|PRIVATE KEY|BEGIN PRIVATE/i)).toHaveCount(0);
    await page.screenshot({ path: "test-results/real-nvidia-diagnostics.png", fullPage: true });
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
    if (noProvider.status === "completed") {
      expect(noProvider.sourceType).toBe("deepinfra_image");
      expect(noProvider.providerUsed).toBe("deepinfra");
      expect(noProvider.primaryVisual).toMatch(/^data:image\//);
      expect(noProvider.primaryArtifactId).toBeTruthy();
    } else {
      expect(noProvider.status).toBe("needs_action");
      expect(noProvider.sourceType).toBe("provider_unavailable");
      expect(noProvider.primaryVisual).toBeNull();
      expect(noProvider.primaryArtifactId).toBeNull();
      expect(noProvider.providerUsed).toBe("deepinfra_unavailable");
      expect(noProvider.summary).toBe("Agent Graphiste prêt, mais aucun moteur DeepInfra n’est configuré.");
    }

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
