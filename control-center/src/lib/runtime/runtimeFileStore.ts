import { dataRoot, resolveDataPath } from "./dataRoot";
import { readJsonFile, writeJsonFileAtomic } from "./jsonStore";

export function runtimeDataRoot() {
  return dataRoot();
}

export function readRuntimeJson<T>(fileName: string, fallback: T): T {
  resolveDataPath(fileName);
  return readJsonFile(fileName, fallback);
}

export function writeRuntimeJson<T>(fileName: string, value: T): void {
  resolveDataPath(fileName);
  writeJsonFileAtomic(fileName, value);
}
