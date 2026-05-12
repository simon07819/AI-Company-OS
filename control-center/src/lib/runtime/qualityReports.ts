import { readRuntimeJson, writeRuntimeJson } from "./runtimeFileStore";
import type { QualityReport } from "@/lib/orchestrator/types";

const FILE = "quality-reports.json";

export function listRuntimeQualityReports(): QualityReport[] {
  return readRuntimeJson<QualityReport[]>(FILE, []);
}

export function saveRuntimeQualityReport(report: QualityReport): QualityReport {
  const existing = listRuntimeQualityReports().filter((item) => item.id !== report.id);
  writeRuntimeJson(FILE, [report, ...existing].slice(0, 500));
  return report;
}
