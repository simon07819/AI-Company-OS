import { NextRequest, NextResponse } from "next/server";
import { publishAsset } from "@/lib/distributionEngine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const asset = publishAsset({
      jobId: body.jobId,
      missionId: body.missionId,
      campaignId: body.campaignId,
      channel: body.channel,
      title: body.title,
      content: body.content,
      scheduledAt: body.scheduledAt,
    });
    if (!asset) {
      return NextResponse.json({ ok: false, message: "Unable to publish asset" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, asset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
