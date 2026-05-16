import { randomUUID } from "crypto";
import { readRuntimeJson, writeRuntimeJson } from "@/lib/runtime/runtimeFileStore";

const FILE = "client-portals.json";

export interface ClientPortal {
  token: string;
  title: string;
  conversationId: string;
  artifactIds: string[];
  missionId?: string;
  createdAt: string;
}

function readStore(): ClientPortal[] {
  return readRuntimeJson<ClientPortal[]>(FILE, []);
}

function writeStore(portals: ClientPortal[]) {
  writeRuntimeJson(FILE, portals);
}

export function createPortal(data: Omit<ClientPortal, "token" | "createdAt">): ClientPortal {
  const portal: ClientPortal = {
    ...data,
    token: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const portals = readStore();
  writeStore([portal, ...portals]);
  return portal;
}

export function getPortal(token: string): ClientPortal | null {
  return readStore().find((p) => p.token === token) ?? null;
}

export function listPortals(): ClientPortal[] {
  return readStore();
}

export function deletePortal(token: string): boolean {
  const portals = readStore();
  const filtered = portals.filter((p) => p.token !== token);
  if (filtered.length === portals.length) return false;
  writeStore(filtered);
  return true;
}
