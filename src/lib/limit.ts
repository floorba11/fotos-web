/** Begrenzt gleichzeitige Vorgänge: acquire() liefert eine einmalig nutzbare release-Funktion oder null, wenn alles belegt ist */
export function createLimiter(max: number) {
  let running = 0;
  return {
    get running() {
      return running;
    },
    acquire(): (() => void) | null {
      if (running >= max) return null;
      running++;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          running--;
        }
      };
    },
  };
}

/** Reicht den Datenstrom durch und gibt den Platz frei, egal ob er zu Ende läuft, abbricht oder scheitert */
export function guardStream(source: ReadableStream<Uint8Array>, release: () => void): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          release();
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (e) {
        release();
        controller.error(e);
      }
    },
    cancel(reason) {
      release();
      return reader.cancel(reason);
    },
  });
}
