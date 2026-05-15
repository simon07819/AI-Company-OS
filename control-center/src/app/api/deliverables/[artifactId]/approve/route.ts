import { NextRequest, NextResponse } from "next/server";
import { approveDeliverable, getApproval, revokeApproval } from "@/lib/deliverableStore";
import { saveProjectBrand } from "@/lib/brand/projectBrandStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ artifactId: string }> }) {
  const { artifactId } = await params;
  const approval = getApproval(artifactId);
  return NextResponse.json({ ok: true, approved: Boolean(approval), approval });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ artifactId: string }> }) {
  const { artifactId } = await params;
  const body = await req.json().catch(() => ({}));
  const approval = approveDeliverable({
    artifactId,
    projectId: body.projectId ?? "unknown",
    title: body.title ?? "Livrable",
    deliverableType: body.deliverableType ?? "unknown",
    lockedVersion: body.version ?? 1,
  });

  // Also approve brand if this is a logo/branding deliverable
  if (/logo|brand|graphic_image/i.test(body.deliverableType ?? "") && body.projectId) {
    saveProjectBrand(body.projectId, { approvedAt: approval.approvedAt });
  }

  return NextResponse.json({ ok: true, approval });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ artifactId: string }> }) {
  const { artifactId } = await params;
  const revoked = revokeApproval(artifactId);
  return NextResponse.json({ ok: revoked });
}
