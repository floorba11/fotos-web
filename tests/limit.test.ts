import { describe, expect, it } from "vitest";
import { createLimiter, guardStream } from "../src/lib/limit";

const bytes = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const s of chunks) c.enqueue(new TextEncoder().encode(s));
      c.close();
    },
  });

describe("createLimiter", () => {
  it("lehnt ab, wenn alles belegt ist, und gibt Plätze frei", () => {
    const l = createLimiter(2);
    const a = l.acquire();
    const b = l.acquire();
    expect(a && b).toBeTruthy();
    expect(l.acquire()).toBeNull();
    a!();
    expect(l.acquire()).not.toBeNull();
  });

  it("release zählt nur einmal", () => {
    const l = createLimiter(1);
    const r = l.acquire()!;
    r();
    r();
    expect(l.running).toBe(0);
    expect(l.acquire()).not.toBeNull();
    expect(l.acquire()).toBeNull();
  });
});

describe("guardStream", () => {
  it("gibt nach dem Ende des Datenstroms frei", async () => {
    const l = createLimiter(1);
    const out = guardStream(bytes("ab", "cd"), l.acquire()!);
    expect(await new Response(out).text()).toBe("abcd");
    expect(l.running).toBe(0);
  });

  it("gibt frei, wenn der Browser abbricht", async () => {
    const l = createLimiter(1);
    const out = guardStream(bytes("ab", "cd"), l.acquire()!);
    const reader = out.getReader();
    await reader.read();
    await reader.cancel();
    expect(l.running).toBe(0);
  });

  it("gibt frei, wenn der Datenstrom scheitert", async () => {
    const l = createLimiter(1);
    const broken = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error("Verbindung weg");
      },
    });
    await expect(new Response(guardStream(broken, l.acquire()!)).text()).rejects.toThrow();
    expect(l.running).toBe(0);
  });
});
