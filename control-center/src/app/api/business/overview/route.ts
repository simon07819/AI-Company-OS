import { NextResponse } from "next/server";
import { getBusinessOverview } from "@/lib/businessOps";

export const dynamic = "force-dynamic";

export async function GET() {
  const overview = getBusinessOverview();
  return NextResponse.json({ ok: true, overview });
}
