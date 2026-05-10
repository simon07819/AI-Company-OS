import { NextResponse } from "next/server";
import { getCrmOverview, listOpportunities } from "@/lib/clientCrm";

export const dynamic = "force-dynamic";

export async function GET() {
  const overview = getCrmOverview();
  const opportunities = listOpportunities();
  return NextResponse.json({ ok: true, overview, opportunities });
}
