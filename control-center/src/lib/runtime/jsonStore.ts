import fs from "fs";
import path from "path";
import { resolveDataPath } from "./dataRoot";

export function readJsonFile<T>(fileName: string, fallback: T): T {
  const filePath = resolveDataPath(fileName);
  if (!fs.existsSync(filePath)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch (error) {
    const corruptPath = `${filePath}.corrupt-${Date.now()}`;
    try {
      fs.renameSync(filePath, corruptPath);
      console.error("Corrupt runtime JSON quarantined", { filePath, corruptPath, error });
    } catch (renameError) {
      console.error("Corrupt runtime JSON could not be quarantined", { filePath, error, renameError });
    }
    return fallback;
  }
}

export function writeJsonFileAtomic<T>(fileName: string, value: T): void {
  const filePath = resolveDataPath(fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2) + "\n", "utf-8");
  fs.renameSync(tempPath, filePath);
}
