import { readRuntimeJson, writeRuntimeJson } from "./runtimeFileStore";
import type { ProductionRun } from "@/lib/orchestrator/types";

const FILE = "mission-state.json";

export function listProductionRuns(): ProductionRun[] {
  return readRuntimeJson<ProductionRun[]>(FILE, []);
}

export function saveProductionRun(run: ProductionRun): ProductionRun {
  const runs = listProductionRuns().filter((item) => item.id !== run.id);
  const next = [run, ...runs].slice(0, 100);
  writeRuntimeJson(FILE, next);
  return run;
}

export function getProductionRun(id: string): ProductionRun | null {
  return listProductionRuns().find((run) => run.id === id || run.projectSlug === id) ?? null;
}
