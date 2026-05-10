import { NextRequest, NextResponse } from "next/server";
import { getWorkspace } from "@/lib/companyWorkspace";

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
