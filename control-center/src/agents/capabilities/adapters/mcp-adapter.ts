import type { ToolAdapter } from "../types";

function disabled(id: "mcp.generic" | "mcp.github" | "mcp.playwright", name: string): ToolAdapter {
  return {
    id,
    name,
    description: "Optional MCP adapter. It is disabled by default and requires explicit runtime configuration.",
    permissions: [{ id: `${id}.disabled`, description: "No MCP connection without explicit configuration.", allowed: false }],
    run() {
      return { enabled: false, message: `${name} is disabled by default.` };
    },
  };
}

export const mcpAdapter = disabled("mcp.generic", "Generic MCP");
export const githubMcpAdapter = disabled("mcp.github", "GitHub MCP");
export const playwrightMcpAdapter = disabled("mcp.playwright", "Playwright MCP");
