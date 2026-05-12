import fs from "fs";
import type { ToolAdapter } from "../types";
import { assertRepoScopedPath } from "../guards";

type FilesystemInput =
  | { action: "exists"; path: string }
  | { action: "read"; path: string }
  | { action: "write"; path: string; content: string };

export const filesystemProjectAdapter: ToolAdapter<FilesystemInput, { path: string; exists?: boolean; content?: string; written?: boolean }> = {
  id: "filesystem.project",
  name: "Project Filesystem",
  description: "Repo-scoped filesystem adapter with secret path blocking and explicit write permission.",
  permissions: [
    { id: "filesystem.repo.read", description: "Read non-secret files inside the repository.", allowed: true },
    { id: "filesystem.repo.write", description: "Write non-secret files inside the repository only when context allows it.", allowed: false, reason: "Requires allowFilesystemWrite=true." },
  ],
  run(input, context) {
    const absolute = assertRepoScopedPath(input.path, context.repoRoot);
    if (input.action === "exists") return { path: input.path, exists: fs.existsSync(absolute) };
    if (input.action === "read") return { path: input.path, content: fs.readFileSync(absolute, "utf-8") };
    if (!context.allowFilesystemWrite) throw new Error("Filesystem writes require explicit permission.");
    fs.writeFileSync(absolute, input.content, "utf-8");
    return { path: input.path, written: true };
  },
};
