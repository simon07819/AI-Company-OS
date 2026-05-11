import { NextResponse } from "next/server";
import { getDropshippingOverview } from "@/lib/dropshippingStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const overview = getDropshippingOverview();
  return NextResponse.json({ ok: true, overview });
}
