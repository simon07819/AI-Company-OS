import { NextRequest, NextResponse } from "next/server";
import { readProjectBrand, saveProjectBrand, approveBrand } from "@/lib/brand/projectBrandStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const brand = readProjectBrand(projectId);
  if (!brand) return NextResponse.json({ ok: false, brand: null }, { status: 404 });
  return NextResponse.json({ ok: true, brand });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const brand = saveProjectBrand(projectId, { ...body, projectId });
  return NextResponse.json({ ok: true, brand });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.action === "approve") {
    const brand = approveBrand(projectId);
    return brand
      ? NextResponse.json({ ok: true, brand })
      : NextResponse.json({ ok: false, error: "Brand not found" }, { status: 404 });
  }
  const brand = saveProjectBrand(projectId, { ...body, projectId });
  return NextResponse.json({ ok: true, brand });
}
