import { NextRequest, NextResponse } from "next/server";
import { permanentlyDeleteArchivedEntity, type ArchivableEntityType } from "@/lib/archiveSystem";
import { restoreCeoProject } from "@/lib/ceoProjectStore";
import { restoreRevenue } from "@/lib/revenueSystem";
import { restoreClient, restoreLead } from "@/lib/clientCrm";
import { restoreOutput } from "@/lib/visibleOutputs";
import { archiveThread } from "@/lib/conversationStore";
import { restoreWorkspace } from "@/lib/companyWorkspace";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ entityType: string; entityId: string }> }) {
  const { entityType, entityId } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.action !== "restore") return NextResponse.json({ ok: false, message: "Unsupported action" }, { status: 400 });

  const restored = entityType === "projects" ? restoreCeoProject(entityId)
    : entityType === "revenues" && body.kind === "proposal" ? restoreRevenue("proposal", entityId)
      : entityType === "revenues" ? restoreRevenue("invoice", entityId)
        : entityType === "clients" && body.kind === "lead" ? restoreLead(entityId)
          : entityType === "clients" ? restoreClient(entityId)
            : entityType === "outputs" ? restoreOutput(entityId)
              : entityType === "conversations" ? archiveThread(entityId, false)
                : entityType === "workspaces" ? restoreWorkspace(entityId)
                  : null;
  if (!restored) return NextResponse.json({ ok: false, message: "Entity not found" }, { status: 404 });
  return NextResponse.json({ ok: true, entity: restored });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ entityType: string; entityId: string }> }) {
  const { entityType, entityId } = await params;
  const deleted = permanentlyDeleteArchivedEntity(entityType as ArchivableEntityType, entityId);
  if (!deleted) return NextResponse.json({ ok: false, message: "Entity not found" }, { status: 404 });
  return NextResponse.json({ ok: true, entity: deleted });
}
