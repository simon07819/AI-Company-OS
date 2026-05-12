import path from "path";
import type { CapabilityPack } from "./types";

const SECRET_PATTERN = /\.env(?:\.local|\.production|\.development)?$|NVIDIA_API_KEY|OPENAI_API_KEY|SECRET|TOKEN|PRIVATE_KEY/i;
const BLOCKED_SHELL_PATTERN = /\brm\s+-rf\b|\bsudo\b|\bchmod\s+777\b|\bprintenv\b|\bdeploy\b|\bvercel\b|\bnetlify\b|\bflyctl\b|\bcat\s+\.env\b|\bcat\s+.*\.env|NVIDIA_API_KEY|SECRET|TOKEN|PRIVATE_KEY/i;
const SIMPLE_INTERNAL_PATTERN = /Brand system|Marque à nommer|quality report|score|artifact|README|workspace|runtime|sessionId|projectId|process|logs|toolTrace|Tool trace|NVIDIA_API_KEY/i;

export function assertNoSecretsAccess(pathOrCommand: string) {
  if (SECRET_PATTERN.test(pathOrCommand)) {
    throw new Error("Secret access is blocked.");
  }
}

export function assertRepoScopedPath(filePath: string, repoRoot: string) {
  assertNoSecretsAccess(filePath);
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(repoRoot, filePath);
  const relative = path.relative(repoRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Filesystem access outside the repo is blocked.");
  }
  return absolute;
}

export function assertSafeShellCommand(command: string) {
  assertNoSecretsAccess(command);
  if (BLOCKED_SHELL_PATTERN.test(command)) {
    throw new Error("Unsafe shell command blocked.");
  }
  const safe = [
    /^git status --short$/,
    /^git log --oneline -10$/,
    /^git diff(?: -- .*)?$/,
    /^rg\b .+/,
    /^npm run lint$/,
    /^npm test$/,
    /^npm run build$/,
  ];
  if (!safe.some((pattern) => pattern.test(command.trim()))) {
    throw new Error("Shell command is not in the safe allowlist.");
  }
}

export function assertSimpleModeDoesNotExposeInternals(output: unknown) {
  const text = typeof output === "string" ? output : JSON.stringify(output ?? "");
  if (SIMPLE_INTERNAL_PATTERN.test(text)) {
    throw new Error("Internal details are visible in simple mode.");
  }
}

export function assertNoPreviousDeliverableLeak(current: { deliverableType?: string; primaryVisual?: string }, previous?: { deliverableType?: string | null; primaryVisual?: string | null } | null) {
  if (!previous?.primaryVisual) return;
  if (current.deliverableType && previous.deliverableType && current.deliverableType !== previous.deliverableType && current.primaryVisual === previous.primaryVisual) {
    throw new Error("Previous deliverable leaked into a new deliverable type.");
  }
}

export function assertToolAllowedForAgent(agentRole: string, toolId: string, allowedTools: string[]) {
  if (!allowedTools.includes(toolId)) {
    throw new Error(`Tool ${toolId} is not allowed for ${agentRole}.`);
  }
}

export function assertCapabilityPackValid(pack: CapabilityPack) {
  if (!pack.id || !pack.name || pack.agentRoles.length === 0 || pack.tools.length === 0 || pack.skills.length === 0) {
    throw new Error(`Capability pack ${pack.id || "unknown"} is incomplete.`);
  }
}
