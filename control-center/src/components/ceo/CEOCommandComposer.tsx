"use client";

import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ChatAttachmentButton from "./ChatAttachmentButton";
import ChatAttachmentGrid from "./ChatAttachmentGrid";
import {
  ACCEPTED_ATTACHMENT_TYPES,
  createChatAttachment,
  MAX_ATTACHMENTS,
  validateAttachmentFile,
} from "./attachments";
import type { ChatAttachment } from "./types";

export default function CEOCommandComposer({
  onSubmit,
  loading,
  droppedFiles = [],
  onDroppedFilesConsumed,
}: {
  onSubmit: (value: string, attachments: ChatAttachment[]) => Promise<void> | void;
  loading: boolean;
  droppedFiles?: File[];
  onDroppedFilesConsumed?: () => void;
}) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submittingRef = useRef(false);
  const canSubmit = (value.trim().length > 0 || attachments.length > 0) && !loading;

  useEffect(() => {
    if (droppedFiles.length === 0) return;
    addFiles(droppedFiles);
    onDroppedFilesConsumed?.();
    // addFiles intentionally reads current attachments through setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppedFiles, onDroppedFilesConsumed]);

  const addFiles = (files: File[]) => {
    setAttachmentError(null);
    if (!files.length) return;
    setAttachments((current) => {
      const next = [...current];
      for (const file of files) {
        if (next.length >= MAX_ATTACHMENTS) {
          setAttachmentError(`Maximum ${MAX_ATTACHMENTS} fichiers par message.`);
          break;
        }
        const validation = validateAttachmentFile(file);
        if (!validation.ok) {
          setAttachmentError(validation.message);
          continue;
        }
        next.push(createChatAttachment(file));
      }
      return next;
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
    setAttachmentError(null);
  };

  const submit = async () => {
    const prompt = value.trim();
    if ((!prompt && attachments.length === 0) || loading || submittingRef.current) return;
    submittingRef.current = true;
    const submittedAttachments = attachments;
    setValue("");
    setAttachments([]);
    setAttachmentError(null);
    try {
      await onSubmit(prompt, submittedAttachments);
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <form
      className="ceo-os-composer"
      aria-label="CEO command composer"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <input
        ref={fileInputRef}
        className="ceo-file-input"
        type="file"
        multiple
        accept={ACCEPTED_ATTACHMENT_TYPES}
        aria-label="Choisir des fichiers"
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }}
      />
      <ChatAttachmentGrid attachments={attachments} onRemove={removeAttachment} />
      {attachmentError && <p className="ceo-attachment-error" role="alert">{attachmentError}</p>}
      <textarea
        value={value}
        rows={2}
        placeholder="Message"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
        onDrop={(event) => {
          if (!event.dataTransfer.files.length) return;
          event.preventDefault();
          addFiles(Array.from(event.dataTransfer.files));
        }}
      />
      <ChatAttachmentButton disabled={loading} onClick={() => fileInputRef.current?.click()} />
      <button type="submit" disabled={!canSubmit} aria-label="Envoyer">
        <SendHorizontal size={16} />
        <span>{loading ? "..." : "Envoyer"}</span>
      </button>
    </form>
  );
}
