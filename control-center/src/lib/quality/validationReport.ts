import fs from "fs";
import path from "path";
import type { OutputQualityReport } from "./outputQuality";

export function writeValidationReport(projectDir: string, report: OutputQualityReport, fileName = "output-quality-report.json"): string {
  fs.mkdirSync(projectDir, { recursive: true });
  const target = path.join(projectDir, fileName);
  fs.writeFileSync(target, JSON.stringify(report, null, 2) + "\n", "utf-8");
  return target;
}

export function readValidationReport(projectDir: string, fileName = "output-quality-report.json"): OutputQualityReport | null {
  const target = path.join(projectDir, fileName);
  if (!fs.existsSync(target)) return null;
  return JSON.parse(fs.readFileSync(target, "utf-8")) as OutputQualityReport;
}
