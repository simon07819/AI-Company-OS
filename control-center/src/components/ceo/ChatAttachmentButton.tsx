"use client";

import { Paperclip } from "lucide-react";

export default function ChatAttachmentButton({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="ceo-attachment-button"
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label="Ajouter des fichiers"
      title="Ajouter des fichiers"
    >
      <Paperclip size={17} />
    </button>
  );
}
