/** "Anna Maria Muster" → Vorname "Anna Maria", Nachname "Muster" (ein Wort: nur Nachname) */
export function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return { first: "", last: parts[0] ?? "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}
