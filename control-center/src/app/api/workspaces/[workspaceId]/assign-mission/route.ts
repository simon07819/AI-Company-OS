import { NextRequest, NextResponse } from "next/server";
import { assignMissionToWorkspace } from "@/lib/companyWorkspace";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.missionId) {
      return NextResponse.json({ ok: false, message: "Missing missionId" }, { status: 400 });
    }
    const workspace = assignMissionToWorkspace(workspaceId, body.missionId);
    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, workspace });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
