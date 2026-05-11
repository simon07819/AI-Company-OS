import { NextResponse } from "next/server";
import { getAllProfiles } from "@/lib/agentProfiles";

export const dynamic = "force-dynamic";

export async function GET() {
  const profiles = getAllProfiles();
  return NextResponse.json({
    ok: true,
    profiles,
    total: profiles.length,
    online: profiles.filter((p) => p.online).length,
    departments: Array.from(new Set(profiles.map((p) => p.department))),
  });
}
