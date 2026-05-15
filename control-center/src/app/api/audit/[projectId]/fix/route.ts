import { NextResponse } from "next/server";
import { addSecurityHeaders, addGitignoreEntries } from "@/lib/agents/prelaunch-auditor/autoFixer";
import { runPreLaunchAudit } from "@/lib/agents/prelaunch-auditor/preLaunchAuditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const { projectId } = params;
  const applied: string[] = [];

  try {
    const headers = await addSecurityHeaders();
    if (headers.applied) applied.push(headers.detail);

    const gitignore = await addGitignoreEntries();
    if (gitignore.applied) applied.push(gitignore.detail);

    // Re-run audit after fixes
    const report = await runPreLaunchAudit(projectId);

    return NextResponse.json({ ok: true, applied, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
