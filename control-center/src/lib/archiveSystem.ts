import fs from "fs";
import path from "path";

export type ArchivableEntityType = "projects" | "revenues" | "clients" | "outputs" | "conversations" | "workspaces";
export type ArchiveAction = "archived" | "soft_deleted";

export interface ArchivedEntity {
  id: string;
  entityType: ArchivableEntityType;
  entityId: string;
  label: string;
  action: ArchiveAction;
  snapshot: unknown;
  archivedAt: string;
  restoredAt: string | null;
  permanentlyDeletedAt: string | null;
}

interface ArchiveData {
  entities: ArchivedEntity[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const ARCHIVE_PATH = path.join(DATA_DIR, "project-archive.json");

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readArchive(): ArchiveData {
  ensureDataDir();
  if (!fs.existsSync(ARCHIVE_PATH)) return { entities: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(ARCHIVE_PATH, "utf-8")) as Partial<ArchiveData>;
    return { entities: Array.isArray(parsed.entities) ? parsed.entities : [] };
  } catch {
    return { entities: [] };
  }
}

function writeArchive(data: ArchiveData) {
  ensureDataDir();
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function archiveId(entityType: ArchivableEntityType, entityId: string) {
  return `arch-${entityType}-${entityId}`;
}

function labelFor(snapshot: unknown, fallback: string): string {
  if (!snapshot || typeof snapshot !== "object") return fallback;
  const record = snapshot as Record<string, unknown>;
  return String(record.name ?? record.title ?? record.invoiceNumber ?? record.invoiceId ?? record.proposalId ?? record.clientId ?? record.id ?? fallback);
}

export function archiveEntity(input: {
  entityType: ArchivableEntityType;
  entityId: string;
  snapshot: unknown;
  label?: string;
  action?: ArchiveAction;
}): ArchivedEntity {
  const data = readArchive();
  const now = new Date().toISOString();
  const id = archiveId(input.entityType, input.entityId);
  const existingIdx = data.entities.findIndex((entity) => entity.id === id);
  const entity: ArchivedEntity = {
    id,
    entityType: input.entityType,
    entityId: input.entityId,
    label: input.label ?? labelFor(input.snapshot, input.entityId),
    action: input.action ?? "archived",
    snapshot: input.snapshot,
    archivedAt: now,
    restoredAt: null,
    permanentlyDeletedAt: null,
  };
  if (existingIdx >= 0) data.entities[existingIdx] = { ...data.entities[existingIdx], ...entity };
  else data.entities.unshift(entity);
  writeArchive(data);
  return entity;
}

export function restoreEntity(entityType: ArchivableEntityType, entityId: string): ArchivedEntity | null {
  const data = readArchive();
  const idx = data.entities.findIndex((entity) => entity.entityType === entityType && entity.entityId === entityId && !entity.permanentlyDeletedAt);
  if (idx === -1) return null;
  data.entities[idx].restoredAt = new Date().toISOString();
  writeArchive(data);
  return data.entities[idx];
}

export function softDeleteEntity(input: {
  entityType: ArchivableEntityType;
  entityId: string;
  snapshot: unknown;
  label?: string;
}): ArchivedEntity {
  return archiveEntity({ ...input, action: "soft_deleted" });
}

export function permanentlyDeleteArchivedEntity(entityType: ArchivableEntityType, entityId: string): ArchivedEntity | null {
  const data = readArchive();
  const idx = data.entities.findIndex((entity) => entity.entityType === entityType && entity.entityId === entityId);
  if (idx === -1) return null;
  data.entities[idx].permanentlyDeletedAt = new Date().toISOString();
  writeArchive(data);
  return data.entities[idx];
}

export function listArchivedEntities(options?: { entityType?: ArchivableEntityType; includeDeleted?: boolean }): ArchivedEntity[] {
  return readArchive().entities
    .filter((entity) => !options?.entityType || entity.entityType === options.entityType)
    .filter((entity) => options?.includeDeleted || !entity.permanentlyDeletedAt)
    .filter((entity) => !entity.restoredAt)
    .sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());
}
