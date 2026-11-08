"use client";

import { useEffect, useRef, useState } from "react";
import { copyText, TOAST_EVENT, type ToastDetail } from "@/lib/toast";
import "@/styles/fairplay.css";

const DAUER_MS = 6000;

export function Toaster() {
  const [toast, setToast] = useState<(ToastDetail & { id: number }) | null>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let id = 0;
    const onToast = (e: Event) => {
      setCopied(false);
      setToast({ ...(e as CustomEvent<ToastDetail>).detail, id: ++id });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), DAUER_MS);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="fp-toast-region" role="status" aria-live="polite">
      {toast && (
        <div className="fp-toast" key={toast.id}>
          <span>{toast.message}</span>
          {toast.copy && (
            <button
              type="button"
              className="fp-toast-btn"
              onClick={async () => {
                if (await copyText(toast.copy!.text)) setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Kopiert!" : toast.copy.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
