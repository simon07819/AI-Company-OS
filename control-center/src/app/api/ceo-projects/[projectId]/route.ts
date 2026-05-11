import { NextRequest, NextResponse } from "next/server";
import { archiveCeoProject, duplicateCeoProject, getCeoProject, restoreCeoProject, softDeleteCeoProject, updateCeoProject } from "@/lib/ceoProjectStore";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = getCeoProject(projectId);
  if (!project) return NextResponse.json({ ok: false, message: "Project not found" }, { status: 404 });
  return NextResponse.json({ ok: true, project });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  const project = action === "archive" ? archiveCeoProject(projectId)
    : action === "restore" ? restoreCeoProject(projectId)
      : action === "duplicate" ? duplicateCeoProject(projectId)
        : updateCeoProject(projectId, body);
  if (!project) return NextResponse.json({ ok: false, message: "Project not found" }, { status: 404 });
  return NextResponse.json({ ok: true, project });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = softDeleteCeoProject(projectId);
  if (!project) return NextResponse.json({ ok: false, message: "Project not found" }, { status: 404 });
  return NextResponse.json({ ok: true, project });
}
