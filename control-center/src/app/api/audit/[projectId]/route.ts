import { NextResponse } from "next/server";
import { runPreLaunchAudit, getLastAuditReport } from "@/lib/agents/prelaunch-auditor/preLaunchAuditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const { projectId } = params;

  try {
    const report = await runPreLaunchAudit(projectId);
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const { projectId } = params;
  let streamId: string | undefined;

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (typeof body.streamId === "string" && body.streamId.trim()) {
      streamId = body.streamId.trim();
    }
  } catch {}

  try {
    const report = await runPreLaunchAudit(projectId, streamId);
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
