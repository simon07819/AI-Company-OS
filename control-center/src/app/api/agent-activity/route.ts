import { NextResponse } from "next/server";
import { getRecentActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  const activities = getRecentActivity(50);
  return NextResponse.json({ activities, total: activities.length });
}
