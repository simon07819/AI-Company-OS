import { NextRequest, NextResponse } from "next/server";
import { readRuntimeJson, writeRuntimeJson } from "@/lib/runtime/runtimeFileStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ContentStore {
  [artifactId: string]: { content: string; updatedAt: string };
}

function readStore(): ContentStore {
  return readRuntimeJson<ContentStore>("deliverable-content-overrides.json", {});
}
function writeStore(store: ContentStore) {
  writeRuntimeJson("deliverable-content-overrides.json", store);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ artifactId: string }> }) {
  const { artifactId } = await params;
  const store = readStore();
  const entry = store[artifactId];
  if (!entry) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, content: entry.content, updatedAt: entry.updatedAt });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ artifactId: string }> }) {
  const { artifactId } = await params;
  const { content } = await req.json().catch(() => ({ content: "" })) as { content: string };
  if (typeof content !== "string") {
    return NextResponse.json({ ok: false, error: "content must be string" }, { status: 400 });
  }
  const store = readStore();
  store[artifactId] = { content, updatedAt: new Date().toISOString() };
  writeStore(store);
  return NextResponse.json({ ok: true });
}
