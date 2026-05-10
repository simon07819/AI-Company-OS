import { NextResponse } from "next/server";
import { PLANS } from "../../../lib/billing";

export async function GET() {
  return NextResponse.json({
    plans: Object.entries(PLANS).map(([name, config]) => ({
      name,
      price: config.price,
      maxMembers: config.maxMembers,
      features: config.features,
    })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { plan?: string; email?: string };
  const plan = (body.plan ?? "starter") as keyof typeof PLANS;

  if (!PLANS[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  return NextResponse.json({
    subscribed: true,
    plan,
    price: PLANS[plan].price,
    currency: "USD",
  });
}
