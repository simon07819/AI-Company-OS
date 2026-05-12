import fs from "fs";
import path from "path";
import type { QualityGateCheck, QualityGateResult } from "./types";

export function validateGeneratedProduct(projectDir: string): QualityGateResult {
  const required = ["README.md", "product-spec.json", "app-map.md"];
  const checks: QualityGateCheck[] = required.map((file) => {
    const ok = fs.existsSync(path.join(projectDir, file));
    return {
      id: `required-${file}`,
      title: `${file} exists`,
      ok,
      detail: ok ? "Found" : "Missing",
    };
  });

  const nextAppDir = path.join(projectDir, "next-app");
  if (fs.existsSync(nextAppDir)) {
    const packageOk = fs.existsSync(path.join(nextAppDir, "package.json"));
    checks.push({
      id: "next-package",
      title: "next-app/package.json exists",
      ok: packageOk,
      detail: packageOk ? "Found" : "Missing",
    });
  }

  const missingFiles = checks.filter((check) => !check.ok).map((check) => check.title.replace(" exists", ""));
  const ok = missingFiles.length === 0;
  return {
    ok,
    checks,
    missingFiles,
    summary: ok ? "Generated product passed the local artifact quality gate." : "Generated product is missing required files.",
    limits: [
      "Prototype local seulement.",
      "Les données sont mockées tant qu'une vraie base de données n'est pas branchée.",
      "Aucun déploiement automatique n'a été effectué.",
    ],
  };
}
