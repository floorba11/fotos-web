"use client";

import { useEffect } from "react";

/** Meldet den Aufruf eines Albums einmal pro Browser-Tab. Keine Cookies, nichts Persönliches. */
export function ViewBeacon({ albumId }: { albumId: string }) {
  useEffect(() => {
    const key = `fotos:gesehen:${albumId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // ohne sessionStorage (z.B. privater Modus mancher Browser) trotzdem zählen
    }
    const body = new Blob([albumId], { type: "text/plain" });
    if (!navigator.sendBeacon?.("/api/stats/view", body)) {
      fetch("/api/stats/view", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, [albumId]);
  return null;
}
