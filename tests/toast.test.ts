import { afterEach, describe, expect, it, vi } from "vitest";
import { showToast, TOAST_EVENT } from "../src/lib/toast";

describe("showToast", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ohne window kein Crash", () => {
    expect(() => showToast({ message: "x" })).not.toThrow();
  });

  it("dispatcht ein CustomEvent mit detail", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal("CustomEvent", class { constructor(public type: string, public init: { detail: unknown }) {} get detail() { return this.init.detail; } });
    showToast({ message: "Hallo", copy: { label: "L", text: "T" } });
    const ev = dispatchEvent.mock.calls[0][0];
    expect(ev.type).toBe(TOAST_EVENT);
    expect(ev.detail).toEqual({ message: "Hallo", copy: { label: "L", text: "T" } });
  });
});
