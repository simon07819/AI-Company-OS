import { NextRequest, NextResponse } from "next/server";
import { createOrder, listOrders, updateOrderStatus, type OrderStatus } from "@/lib/dropshippingStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = listOrders();
  return NextResponse.json({ ok: true, orders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { productId: string; customerName: string; customerEmail?: string | null; quantity?: number };
    if (!body.productId || !body.customerName) {
      return NextResponse.json({ ok: false, message: "productId and customerName required" }, { status: 400 });
    }
    const order = createOrder(body);
    if (!order) return NextResponse.json({ ok: false, message: "Product not found" }, { status: 404 });
    return NextResponse.json({ ok: true, order });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { orderId: string; status: OrderStatus; tracking?: string };
    if (!body.orderId || !body.status) {
      return NextResponse.json({ ok: false, message: "orderId and status required" }, { status: 400 });
    }
    const order = updateOrderStatus(body.orderId, body.status, body.tracking);
    if (!order) return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });
    return NextResponse.json({ ok: true, order });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
