"use client";

import { copyText, showToast } from "@/lib/toast";

export function CopyButton({ text, label, doneMessage }: { text: string; label: string; doneMessage: string }) {
  return (
    <button
      type="button"
      className="btn fp-copy"
      onClick={async () => {
        if (await copyText(text)) showToast({ message: doneMessage });
        else showToast({ message: `Kopieren nicht möglich. Bitte manuell: ${text}` });
      }}
    >
      {label}
    </button>
  );
}
