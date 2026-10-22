/** Blendenzeichen: sechs Lamellen in einem Ring */
export const APERTURE = "M16 9.8L23.57 5.43M21.37 12.9L28.94 17.27M21.37 19.1L21.37 27.84M16 22.2L8.43 26.57M10.63 19.1L3.06 14.73M10.63 12.9L10.63 4.16";

export function Logo() {
  return (
    <>
      <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d={APERTURE} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="brand-text">
        <span className="brand-name">Luc Maradan</span>
        <span className="brand-sub">floorba11 · Fotografie</span>
      </span>
    </>
  );
}
