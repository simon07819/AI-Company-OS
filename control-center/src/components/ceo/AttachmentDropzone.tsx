"use client";

import { useState } from "react";
import type { DragEvent, ReactNode } from "react";

export default function AttachmentDropzone({
  children,
  disabled,
  onFiles,
}: {
  children: ReactNode;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const onDrag = (event: DragEvent<HTMLElement>) => {
    if (disabled) return;
    if (Array.from(event.dataTransfer.types).includes("Files")) {
      event.preventDefault();
      setDragging(true);
    }
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    if (disabled) return;
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    setDragging(false);
    onFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      className={`ceo-attachment-dropzone ${dragging ? "dragging" : ""}`}
      onDragEnter={onDrag}
      onDragOver={onDrag}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      {children}
    </div>
  );
}
