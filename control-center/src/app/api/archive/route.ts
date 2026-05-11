import { NextRequest, NextResponse } from "next/server";
import { listArchivedEntities, type ArchivableEntityType } from "@/lib/archiveSystem";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const entityType = url.searchParams.get("entityType") as ArchivableEntityType | null;
  const entities = listArchivedEntities({ entityType: entityType ?? undefined });
  return NextResponse.json({ ok: true, entities });
}
