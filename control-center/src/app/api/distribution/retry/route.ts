import { NextRequest, NextResponse } from "next/server";
import { retryDistribution } from "@/lib/distributionEngine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.jobId) {
      return NextResponse.json({ ok: false, message: "Missing jobId" }, { status: 400 });
    }
    const job = retryDistribution(body.jobId);
    if (!job) {
      return NextResponse.json({ ok: false, message: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
