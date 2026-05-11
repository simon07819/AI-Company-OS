import { NextRequest, NextResponse } from "next/server";
import { archiveWorkspace, getWorkspace, restoreWorkspace, softDeleteWorkspace, updateWorkspace } from "@/lib/companyWorkspace";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const workspace = getWorkspace(workspaceId);
  if (!workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, workspace });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  const workspace = action === "archive" ? archiveWorkspace(workspaceId)
    : action === "restore" ? restoreWorkspace(workspaceId)
      : updateWorkspace(workspaceId, body);
  if (!workspace) return NextResponse.json({ ok: false, message: "Workspace not found" }, { status: 404 });
  return NextResponse.json({ ok: true, workspace });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const workspace = softDeleteWorkspace(workspaceId);
  if (!workspace) return NextResponse.json({ ok: false, message: "Workspace not found" }, { status: 404 });
  return NextResponse.json({ ok: true, workspace });
}
