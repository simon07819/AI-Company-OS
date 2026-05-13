import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/serverAuth";
import { recordUserMemoryAction, type CompanyMemoryAction } from "@/lib/memory/companyMemory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIONS: CompanyMemoryAction[] = ["retain_direction", "reject_direction", "avoid_style", "use_style_for_project"];

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const action = ACTIONS.includes(body.action) ? body.action as CompanyMemoryAction : undefined;
  const missionId = typeof body.missionId === "string" && body.missionId.trim() ? body.missionId.trim() : "";
  const missionType = typeof body.missionType === "string" && body.missionType.trim() ? body.missionType.trim() : "general";
  if (!action || !missionId) {
    return NextResponse.json({ ok: false, error: "Action mémoire invalide." }, { status: 400 });
  }

  const entry = recordUserMemoryAction({
    action,
    missionId,
    missionType,
    text: typeof body.text === "string" ? body.text : undefined,
    artifactId: typeof body.artifactId === "string" ? body.artifactId : null,
    brandName: typeof body.brandName === "string" ? body.brandName : null,
  });

  return NextResponse.json({
    ok: true,
    memoryId: entry.id,
    action,
    created: {
      preferences: entry.userPreferences,
      acceptedDecisions: entry.acceptedDecisions,
      visualStylePreferred: entry.visualStylePreferred,
      visualStyleRejected: entry.visualStyleRejected,
      retainedBranding: entry.retainedBranding,
      acceptedArtifacts: entry.acceptedArtifacts,
      rejectedArtifacts: entry.rejectedArtifacts,
    },
  });
}
