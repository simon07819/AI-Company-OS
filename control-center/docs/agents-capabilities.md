# AI Company OS Agent Capabilities

AI Company OS agents are wired through three layers:

- **Skills**: typed functions for parsing, planning, rendering, critique and validation.
- **Tools**: guarded adapters in `src/agents/capabilities` for SVG rendering, website previews, quality gates, artifact packaging, safe repo inspection and optional MCP/browser integrations.
- **Capability packs**: role-specific bundles that declare which skills and tools an agent may use.

## Guardrails

- Filesystem access is repo-scoped and blocks `.env`, `.env.local`, secrets and paths outside the repo.
- Shell access is allowlisted only; destructive commands, deploys, `printenv`, and secret reads are blocked.
- MCP, GitHub MCP and Playwright MCP adapters are disabled by default until explicitly configured.
- Simple CEO chat must not expose scores, artifacts, files, logs, runtime IDs, workspace links, process text or tool traces.
- A previous deliverable cannot be reused as the primary result when the requested deliverable type changes.

## Active Packs

- `ceo-core`: route work and validate simple visible output.
- `product-brief`: create typed briefs and acceptance criteria.
- `design-system` / `logo-production`: create, render and validate visual logo prototypes.
- `website-production`: create structured page previews with header, hero, CTA and sections.
- `quality-core`: block fake deliverables and internal-detail leaks.
- `browser-qa`, `git-repo`, `code-builder`: optional/guarded operational packs.

## Adding A Tool

1. Add an adapter in `src/agents/capabilities/adapters`.
2. Register it in `toolRegistry`.
3. Add it to a capability pack.
4. Add it to `toolsAllowed` on the agents that may use it.
5. Add guardrail tests before using it in a workflow.

## Adding A Workflow

1. Parse the prompt into a work order.
2. Select agents and capability packs.
3. Run skills and guarded tools.
4. Return only `visibleOutput` to simple chat.
5. Put `agentRuns`, `toolTrace`, quality checks and artifacts in hidden details only.
