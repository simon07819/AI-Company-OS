import { NextResponse } from "next/server";
import { generatePrivacyPolicy } from "@/lib/agents/prelaunch-auditor/autoFixer";
import { listTraceableArtifacts } from "@/lib/providers/providerRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const { projectId } = params;

  let projectSummary: string | undefined;
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (typeof body.summary === "string") projectSummary = body.summary;
  } catch {}

  // Infer project name from latest artifact title
  const artifacts = listTraceableArtifacts().filter(
    (a) => a.projectId === projectId || a.missionId === projectId,
  );
  const projectName = artifacts.at(-1)?.title ?? projectId;

  try {
    const policyHtml = await generatePrivacyPolicy(projectName, projectSummary);
    return NextResponse.json({ ok: true, projectName, policyHtml });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
