import { NextResponse } from "next/server";
import { getAllProjects, computeStats } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET() {
  const projects = getAllProjects();
  const stats = computeStats(projects);
  return NextResponse.json({ projects, stats });
}
