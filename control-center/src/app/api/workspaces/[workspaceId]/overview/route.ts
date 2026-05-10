import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceOverview, getWorkspaceRevenue, getWorkspaceCampaigns } from "@/lib/companyWorkspace";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { workspaceId: string } },
) {
  const overview = getWorkspaceOverview(params.workspaceId);
  if (!overview) {
    return NextResponse.json({ ok: false, message: "Workspace not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    overview,
    revenue: getWorkspaceRevenue(params.workspaceId),
    campaigns: getWorkspaceCampaigns(params.workspaceId),
  });
}
