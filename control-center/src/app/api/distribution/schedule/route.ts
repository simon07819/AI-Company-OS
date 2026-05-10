import { NextRequest, NextResponse } from "next/server";
import { scheduleCampaign } from "@/lib/distributionEngine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const campaign = scheduleCampaign({
      missionId: body.missionId,
      name: body.name,
      channels: body.channels,
      scheduledAt: body.scheduledAt,
    });
    return NextResponse.json({ ok: true, campaign });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
