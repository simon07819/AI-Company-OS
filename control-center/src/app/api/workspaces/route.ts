import { NextRequest, NextResponse } from "next/server";
import { createWorkspace, listWorkspaces } from "@/lib/companyWorkspace";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, workspaces: listWorkspaces() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const workspace = createWorkspace({
      name: body.name ?? "New Workspace",
      description: body.description,
      industry: body.industry,
      primaryMissionTypes: body.primaryMissionTypes,
      automationLevel: body.automationLevel,
      branding: body.branding,
    });
    return NextResponse.json({ ok: true, workspace });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
