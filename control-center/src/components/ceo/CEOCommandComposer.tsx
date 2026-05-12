"use client";

import { SendHorizontal } from "lucide-react";
import { useRef, useState } from "react";

export default function CEOCommandComposer({
  onSubmit,
  loading,
}: {
  onSubmit: (value: string) => Promise<void> | void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");
  const submittingRef = useRef(false);
  const canSubmit = value.trim().length > 0 && !loading;

  const submit = async () => {
    const prompt = value.trim();
    if (!prompt || loading || submittingRef.current) return;
    submittingRef.current = true;
    setValue("");
    try {
      await onSubmit(prompt);
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
      <textarea
        value={value}
        rows={2}
        placeholder="Décris ce que tu veux construire..."
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
      />
      <button type="submit" disabled={!canSubmit} aria-label="Construire">
        <SendHorizontal size={16} />
        <span>{loading ? "Production..." : "Construire"}</span>
      </button>
    </form>
  );
}
