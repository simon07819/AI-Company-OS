import { NextResponse } from "next/server";
import { getOnboardingOverview } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, onboarding: getOnboardingOverview() });
}
