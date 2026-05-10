import { NextRequest, NextResponse } from "next/server";
import { getWorkspace } from "@/lib/companyWorkspace";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { workspaceId: string } },
) {
  const workspace = getWorkspace(params.workspaceId);
  if (!workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, workspace });
}
