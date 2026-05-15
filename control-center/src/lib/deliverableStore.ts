import { readRuntimeJson, writeRuntimeJson } from "@/lib/runtime/runtimeFileStore";

export interface DeliverableApproval {
  artifactId: string;
  projectId: string;
  title: string;
  deliverableType: string;
  approvedAt: string;
  lockedVersion: number;
}

type ApprovalsStore = Record<string, DeliverableApproval>;

const FILE = "deliverable-approvals.json";

function read(): ApprovalsStore {
  return readRuntimeJson<ApprovalsStore>(FILE, {});
}
function write(store: ApprovalsStore) {
  writeRuntimeJson(FILE, store);
}

export function approveDeliverable(approval: Omit<DeliverableApproval, "approvedAt">): DeliverableApproval {
  const store = read();
  const entry: DeliverableApproval = { ...approval, approvedAt: new Date().toISOString() };
  store[approval.artifactId] = entry;
  write(store);
  return entry;
}

export function isApproved(artifactId: string): boolean {
  return Boolean(read()[artifactId]);
}

export function getApproval(artifactId: string): DeliverableApproval | null {
  return read()[artifactId] ?? null;
}

export function listApprovals(): DeliverableApproval[] {
  return Object.values(read());
}

export function revokeApproval(artifactId: string): boolean {
  const store = read();
  if (!store[artifactId]) return false;
  delete store[artifactId];
  write(store);
  return true;
}
