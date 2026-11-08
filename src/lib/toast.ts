// Minimales Toast-Event-System ohne Library.
export const TOAST_EVENT = "fotos:toast";

export type ToastDetail = { message: string; copy?: { label: string; text: string } };

export function showToast(t: ToastDetail): void {
  // SSR-sicher: ohne window passiert nichts
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: t }));
}

// Kopiert in die Zwischenablage, mit Fallback für Browser ohne Clipboard-API.
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
