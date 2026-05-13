"use client";

import { FileArchive, FileCode2, FileText, ImageIcon, Trash2, Video } from "lucide-react";
import { formatAttachmentSize } from "./attachments";
import type { ChatAttachment } from "./types";

function FileIcon({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.kind === "image") return <ImageIcon size={16} />;
  if (attachment.kind === "video") return <Video size={16} />;
  if (attachment.extension === "zip") return <FileArchive size={16} />;
  if (["js", "ts", "tsx", "jsx", "py", "html", "css", "json"].includes(attachment.extension)) return <FileCode2 size={16} />;
  return <FileText size={16} />;
}

export function ImageAttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
  return (
    <div className="ceo-attachment-thumb image">
      {attachment.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={attachment.previewUrl} alt={attachment.name} />
      ) : <ImageIcon size={22} />}
    </div>
  );
}

export function VideoAttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
  return (
    <div className="ceo-attachment-thumb video">
      {attachment.previewUrl ? <video src={attachment.previewUrl} muted playsInline aria-label={attachment.name} /> : <Video size={22} />}
    </div>
  );
}

export function FileAttachmentCard({ attachment }: { attachment: ChatAttachment }) {
  return (
    <div className="ceo-attachment-thumb file">
      <FileIcon attachment={attachment} />
    </div>
  );
}

export default function ChatAttachmentPreview({
  attachment,
  onRemove,
  compact = false,
}: {
  attachment: ChatAttachment;
  onRemove?: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`ceo-attachment-card ${compact ? "compact" : ""}`} data-attachment-kind={attachment.kind}>
      {attachment.kind === "image" ? (
        <ImageAttachmentPreview attachment={attachment} />
      ) : attachment.kind === "video" ? (
        <VideoAttachmentPreview attachment={attachment} />
      ) : (
        <FileAttachmentCard attachment={attachment} />
      )}
      <div className="ceo-attachment-meta">
        <strong title={attachment.name}>{attachment.name}</strong>
        <span>{attachment.kind === "file" ? attachment.extension.toUpperCase() || "FILE" : attachment.kind} · {formatAttachmentSize(attachment.size)}</span>
      </div>
      {onRemove && (
        <button type="button" onClick={() => onRemove(attachment.id)} aria-label={`Retirer ${attachment.name}`}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
