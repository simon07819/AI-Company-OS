import { NextRequest, NextResponse } from "next/server";
import { createClient, listClients } from "@/lib/clientCrm";

export const dynamic = "force-dynamic";

export async function GET() {
  const clients = listClients();
  return NextResponse.json({ ok: true, clients });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const client = createClient({
      name: body.name ?? "Unnamed Client",
      email: body.email ?? "",
      company: body.company,
      totalValue: body.totalValue,
    });
    return NextResponse.json({ ok: true, client });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
