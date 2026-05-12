import fs from "fs";
import path from "path";
import { readRuntimeJson, writeRuntimeJson } from "./runtimeFileStore";

const FILE = "artifact-registry.json";

export interface RegisteredArtifact {
  path: string;
  type: string;
  title: string;
  createdAt: string;
  status: "created" | "failed";
  qualityScore?: number;
  sourceAgent: string;
}

function resolveArtifact(artifactPath: string) {
  return path.isAbsolute(artifactPath) ? artifactPath : path.resolve(process.cwd(), artifactPath);
}

export function listRegisteredArtifacts(): RegisteredArtifact[] {
  return readRuntimeJson<RegisteredArtifact[]>(FILE, []);
}

export function registerArtifact(input: Omit<RegisteredArtifact, "createdAt" | "status">): RegisteredArtifact {
  const absolute = resolveArtifact(input.path);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Artifact does not exist: ${input.path}`);
  }
  const artifact: RegisteredArtifact = {
    ...input,
    path: path.relative(process.cwd(), absolute),
    createdAt: new Date().toISOString(),
    status: "created",
  };
  const existing = listRegisteredArtifacts().filter((item) => item.path !== artifact.path);
  writeRuntimeJson(FILE, [artifact, ...existing].slice(0, 1000));
  return artifact;
}

export function registerArtifacts(paths: string[], sourceAgent: string, qualityScore?: number): RegisteredArtifact[] {
  return paths.map((artifactPath) => registerArtifact({
    path: artifactPath,
    type: path.extname(artifactPath).replace(".", "") || "file",
    title: path.basename(artifactPath),
    sourceAgent,
    qualityScore,
  }));
}
