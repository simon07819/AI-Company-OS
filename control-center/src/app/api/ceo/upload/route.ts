import { NextRequest, NextResponse } from "next/server";
import { saveUpload } from "@/lib/ceoUploads";
import { createFileDiscussion } from "@/lib/executiveDiscussion";
import { requireUser } from "@/lib/auth/serverAuth";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_PREFIXES = ["image/"];
const ALLOWED_MIME_EXACT = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "pdf", "txt", "md", "csv", "json"]);
const BLOCKED_EXTENSIONS = new Set(["html", "htm", "js", "mjs", "cjs", "ts", "tsx", "jsx", "css", "svg", "zip", "doc", "docx", "xls", "xlsx", "exe", "sh"]);
const MAX_SIZE = 25 * 1024 * 1024;

function extensionFromName(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isAllowed(file: File): boolean {
  const extension = extensionFromName(file.name);
  if (BLOCKED_EXTENSIONS.has(extension)) return false;
  return ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))
    || ALLOWED_MIME_EXACT.has(file.type)
    || ALLOWED_EXTENSIONS.has(extension);
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, message: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, message: "File too large (max 25 MB)" }, { status: 413 });
    }
    if (!isAllowed(file)) {
      return NextResponse.json({ ok: false, message: `File type not supported: ${file.type}` }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const record = saveUpload(file.name, file.size, file.type, buffer);

    const analysis = record.analysis!;
    const discussion = createFileDiscussion({
      fileName: record.name,
      fileId: record.id,
      category: record.category,
      delegateTo: analysis.delegateTo,
      delegationMessage: analysis.delegationMessage,
      taskType: analysis.taskType,
    });

    return NextResponse.json({
      ok: true,
      file: {
        id: record.id,
        name: record.name,
        size: record.size,
        mimeType: record.mimeType,
        category: record.category,
        uploadedAt: record.uploadedAt,
        analysis: {
          summary: analysis.summary,
          delegateTo: analysis.delegateTo,
          taskType: analysis.taskType,
        },
      },
      discussion,
      ceoResponse: analysis.summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
