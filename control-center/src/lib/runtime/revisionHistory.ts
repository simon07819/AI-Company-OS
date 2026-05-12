import { readRuntimeJson, writeRuntimeJson } from "./runtimeFileStore";
import type { RevisionAttempt } from "@/lib/orchestrator/types";

const FILE = "revision-history.json";

export function listRuntimeRevisions(): RevisionAttempt[] {
  return readRuntimeJson<RevisionAttempt[]>(FILE, []);
}

export function saveRuntimeRevisions(revisions: RevisionAttempt[]): RevisionAttempt[] {
  const existing = listRuntimeRevisions().filter((item) => !revisions.some((revision) => revision.id === item.id));
  writeRuntimeJson(FILE, [...revisions, ...existing].slice(0, 500));
  return revisions;
}
