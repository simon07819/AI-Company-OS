import { NextResponse } from "next/server";
import { getCrmOverview } from "@/lib/clientCrm";

export const dynamic = "force-dynamic";

export async function GET() {
  const overview = getCrmOverview();
  return NextResponse.json({ ok: true, overview });
}
