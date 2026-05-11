import { NextRequest, NextResponse } from "next/server";
import { createSupplier, listSuppliers } from "@/lib/dropshippingStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const suppliers = listSuppliers();
  return NextResponse.json({ ok: true, suppliers });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { name: string; contact: string; country?: string };
    if (!body.name || !body.contact) {
      return NextResponse.json({ ok: false, message: "name and contact required" }, { status: 400 });
    }
    const supplier = createSupplier(body);
    return NextResponse.json({ ok: true, supplier });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
