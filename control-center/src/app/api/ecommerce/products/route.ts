import { NextRequest, NextResponse } from "next/server";
import { createProduct, listProducts } from "@/lib/dropshippingStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = listProducts();
  return NextResponse.json({ ok: true, products });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { name: string; description?: string; price: number; cost: number; supplierId?: string | null; category?: string };
    if (!body.name || body.price == null || body.cost == null) {
      return NextResponse.json({ ok: false, message: "name, price and cost required" }, { status: 400 });
    }
    const product = createProduct(body);
    return NextResponse.json({ ok: true, product });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
