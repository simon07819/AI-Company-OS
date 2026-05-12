import { NextResponse } from "next/server";
import { RESET_CONFIRMATION, RESET_UI_CONFIRMATION, resetCompanyOs } from "@/lib/resetCompanyOs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { confirmation?: string; resetGeneratedProducts?: boolean };
  if (body.confirmation !== RESET_UI_CONFIRMATION) {
    return NextResponse.json({ ok: false, message: `Confirmation invalide. Tape exactement: ${RESET_UI_CONFIRMATION}` }, { status: 400 });
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_RESET !== "true") {
    return NextResponse.json({ ok: false, message: "Reset refuse en production sans ALLOW_PRODUCTION_RESET=true." }, { status: 403 });
  }

  try {
    const result = resetCompanyOs({
      confirm: RESET_CONFIRMATION,
      allowProduction: process.env.ALLOW_PRODUCTION_RESET === "true",
      resetGeneratedProducts: body.resetGeneratedProducts === true,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Reset impossible." }, { status: 500 });
  }
}
