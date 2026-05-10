import { NextRequest, NextResponse } from "next/server";
import { addInteraction } from "@/lib/clientCrm";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { clientId: string } },
) {
  const { clientId } = params;
  try {
    const body = await req.json();
    const interaction = addInteraction({
      clientId,
      type: body.type ?? "note",
      summary: body.summary ?? "",
    });
    return NextResponse.json({ ok: true, interaction });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
