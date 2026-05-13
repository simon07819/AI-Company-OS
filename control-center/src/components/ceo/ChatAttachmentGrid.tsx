"use client";

import ChatAttachmentPreview from "./ChatAttachmentPreview";
import type { ChatAttachment } from "./types";

export default function ChatAttachmentGrid({
  attachments,
  onRemove,
  compact = false,
}: {
  attachments: ChatAttachment[];
  onRemove?: (id: string) => void;
  compact?: boolean;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className={`ceo-attachment-grid ${compact ? "compact" : ""}`} aria-label="Pièces jointes">
      {attachments.map((attachment) => (
        <ChatAttachmentPreview key={attachment.id} attachment={attachment} onRemove={onRemove} compact={compact} />
      ))}
    </div>
  );
}
