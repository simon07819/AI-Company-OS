import fs from "fs";
import path from "path";

export function runtimeDataRoot() {
  return path.resolve(process.env.AI_COMPANY_RUNTIME_DIR ?? path.join(process.cwd(), "data"));
}

function ensureInsideDataRoot(target: string) {
  const root = runtimeDataRoot();
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Runtime store path escaped data root");
  }
}

export function readRuntimeJson<T>(fileName: string, fallback: T): T {
  const filePath = path.join(runtimeDataRoot(), fileName);
  ensureInsideDataRoot(filePath);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeRuntimeJson<T>(fileName: string, value: T): void {
  const filePath = path.join(runtimeDataRoot(), fileName);
  ensureInsideDataRoot(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf-8");
}
