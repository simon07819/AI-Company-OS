import fs from "fs";
import path from "path";
import type { ExecutionLedger, ExecutionLedgerEntry } from "./types";

function now() {
  return new Date().toISOString();
}

export function createLedger(projectSlug: string, titles: string[]): ExecutionLedger {
  const timestamp = now();
  return {
    projectSlug,
    createdAt: timestamp,
    updatedAt: timestamp,
    steps: titles.map((title, index) => ({
      id: `step-${index + 1}`,
      title,
      status: "pending",
      startedAt: null,
      completedAt: null,
      artifactPaths: [],
      summary: "",
    })),
  };
}

export function startLedgerStep(ledger: ExecutionLedger, stepId: string): ExecutionLedger {
  return updateStep(ledger, stepId, (step) => ({
    ...step,
    status: "running",
    startedAt: step.startedAt ?? now(),
  }));
}

export function completeLedgerStep(ledger: ExecutionLedger, stepId: string, artifactPaths: string[], summary: string): ExecutionLedger {
  if (artifactPaths.length === 0) {
    throw new Error(`Cannot complete ledger step ${stepId} without artifactPaths`);
  }
  const timestamp = now();
  return updateStep(ledger, stepId, (step) => ({
    ...step,
    status: "completed",
    startedAt: step.startedAt ?? timestamp,
    completedAt: timestamp,
    artifactPaths,
    summary,
  }));
}

export function failLedgerStep(ledger: ExecutionLedger, stepId: string, error: string): ExecutionLedger {
  return updateStep(ledger, stepId, (step) => ({
    ...step,
    status: "failed",
    completedAt: now(),
    summary: "Step failed before artifacts were created.",
    error,
  }));
}

export function assertNoCompletedStepWithoutArtifacts(ledger: ExecutionLedger): void {
  const invalid = ledger.steps.find((step) => step.status === "completed" && step.artifactPaths.length === 0);
  if (invalid) throw new Error(`Completed ledger step has no artifactPaths: ${invalid.id}`);
}

export function writeExecutionLedger(projectDir: string, ledger: ExecutionLedger): string {
  assertNoCompletedStepWithoutArtifacts(ledger);
  const filePath = path.join(projectDir, "execution-ledger.json");
  fs.writeFileSync(filePath, JSON.stringify({ ...ledger, updatedAt: now() }, null, 2) + "\n", "utf-8");
  return filePath;
}

export function readExecutionLedger(projectDir: string): ExecutionLedger | null {
  const filePath = path.join(projectDir, "execution-ledger.json");
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as ExecutionLedger;
}

function updateStep(ledger: ExecutionLedger, stepId: string, updater: (step: ExecutionLedgerEntry) => ExecutionLedgerEntry): ExecutionLedger {
  return {
    ...ledger,
    updatedAt: now(),
    steps: ledger.steps.map((step) => step.id === stepId ? updater(step) : step),
  };
}
