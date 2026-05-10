import { NextRequest, NextResponse } from "next/server";
import { loadDeliveryPackage } from "@/lib/deliveryPackage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const pkg = loadDeliveryPackage(sessionId);

  if (!pkg) {
    return NextResponse.json(
      { ok: false, message: "No delivery package found. Generate one first." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, package: pkg });
}
