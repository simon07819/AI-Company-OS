import type { ToolAdapter } from "../types";

export const browserPreviewAdapter: ToolAdapter<{ url?: string; html?: string }, { enabled: boolean; message: string }> = {
  id: "browser.preview",
  name: "Browser Preview",
  description: "Optional browser/visual QA adapter. Disabled unless a browser integration is explicitly configured.",
  permissions: [{ id: "browser.optional", description: "Use browser preview only when configured by runtime.", allowed: false, reason: "No implicit browser automation." }],
  run() {
    return { enabled: false, message: "Browser preview adapter disabled until Playwright/MCP is explicitly configured." };
  },
};
