import { NextResponse } from "next/server";
import { getDistributionOverview, listCampaigns, listDistributionJobs, listPublishedAssets } from "@/lib/distributionEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    overview: getDistributionOverview(),
    campaigns: listCampaigns(),
    jobs: listDistributionJobs(),
    assets: listPublishedAssets(),
  });
}
