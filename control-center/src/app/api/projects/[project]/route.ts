import { NextResponse } from "next/server";
import { getProject } from "@/lib/projects";
import { deleteGeneratedProject } from "@/lib/product-builder/workspace";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ project: string }> }
) {
  const { project: projectName } = await params;
  const project = getProject(projectName);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ project: string }> }
) {
  const { project: slug } = await params;
  const deleted = deleteGeneratedProject(slug);
  if (!deleted) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
