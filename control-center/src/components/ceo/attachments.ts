import type { ChatAttachment, ChatAttachmentPayload } from "./types";

export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
export const MAX_ATTACHMENTS = 8;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm"]);
const FILE_EXTENSIONS = new Set(["pdf", "txt", "md", "doc", "docx", "xls", "xlsx", "csv", "json", "zip", "js", "ts", "tsx", "jsx", "py", "html", "css"]);

export const ACCEPTED_ATTACHMENT_TYPES = [
  ...Array.from(IMAGE_EXTENSIONS).map((ext) => `.${ext}`),
  ...Array.from(VIDEO_EXTENSIONS).map((ext) => `.${ext}`),
  ...Array.from(FILE_EXTENSIONS).map((ext) => `.${ext}`),
].join(",");

export function attachmentExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function attachmentKindFor(file: Pick<File, "name" | "type">) {
  const extension = attachmentExtension(file.name);
  if (file.type.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) return "image" as const;
  if (file.type.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) return "video" as const;
  if (FILE_EXTENSIONS.has(extension)) return "file" as const;
  return null;
}

export function validateAttachmentFile(file: File) {
  const kind = attachmentKindFor(file);
  if (!kind) return { ok: false as const, message: "Type de fichier non supporté." };
  if (file.size > MAX_ATTACHMENT_SIZE) return { ok: false as const, message: "Fichier trop lourd. Maximum 25 MB." };
  return { ok: true as const, kind };
}

export function createChatAttachment(file: File): ChatAttachment {
  const validation = validateAttachmentFile(file);
  const kind = validation.ok ? validation.kind : "file";
  const canPreview = validation.ok && (kind === "image" || kind === "video") && typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
  return {
    id: `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    kind,
    extension: attachmentExtension(file.name),
    previewUrl: canPreview ? URL.createObjectURL(file) : undefined,
    uploadState: validation.ok ? "ready" : "rejected",
  };
}

export function attachmentPayload(attachment: ChatAttachment): ChatAttachmentPayload {
  return {
    id: attachment.id,
    name: attachment.name,
    size: attachment.size,
    mimeType: attachment.mimeType,
    kind: attachment.kind,
    extension: attachment.extension,
  };
}

export function formatAttachmentSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
