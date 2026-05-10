import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceSummary } from "@/lib/workspaceStore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const summary = getWorkspaceSummary(sessionId);

  return NextResponse.json({
    ok: true,
    message: summary.exists
      ? `Workspace has ${summary.fileCount} files (${(summary.totalSize / 1024).toFixed(1)}KB).`
      : "Workspace not yet created.",
    summary,
  });
}
