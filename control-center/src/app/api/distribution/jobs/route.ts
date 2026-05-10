import { NextResponse } from "next/server";
import { listDistributionJobs } from "@/lib/distributionEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, jobs: listDistributionJobs() });
}
