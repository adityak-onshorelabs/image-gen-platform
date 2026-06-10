import "server-only";

/**
 * Bounded in-process concurrency gate for the render engine (FRD §16.6).
 * Up to `max` renders run at once; further callers wait in FIFO order until a
 * slot frees or `timeoutMs` elapses (→ throws so the API can map to 429).
 */
export class Semaphore {
  private active = 0;
  private queue: Array<{
    resolve: () => void;
    reject: (e: Error) => void;
    timer: NodeJS.Timeout;
  }> = [];

  constructor(private readonly max: number) {}

  async acquire(timeoutMs: number): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this.queue.findIndex((w) => w.timer === timer);
        if (i >= 0) this.queue.splice(i, 1);
        reject(new Error("RATE_LIMITED"));
      }, timeoutMs);
      this.queue.push({ resolve, reject, timer });
    });
    // a release() handed us the slot; active was already incremented there.
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      clearTimeout(next.timer);
      // slot stays occupied, just handed to the waiter
      next.resolve();
    } else {
      this.active = Math.max(0, this.active - 1);
    }
  }

  get inFlight(): number {
    return this.active;
  }
  get waiting(): number {
    return this.queue.length;
  }
}

// Single shared pool for the whole process. Module-level so it survives across
// requests within the same server instance.
const MAX = Number(process.env.RENDER_MAX_CONCURRENCY ?? 20);
const QUEUE_TIMEOUT_MS = Number(process.env.RENDER_QUEUE_TIMEOUT_MS ?? 15000);

export const renderPool = new Semaphore(MAX > 0 ? MAX : 20);
export const RENDER_QUEUE_TIMEOUT_MS = QUEUE_TIMEOUT_MS;

/** Run `fn` inside the render pool; throws Error("RATE_LIMITED") on overflow. */
export async function withRenderSlot<T>(fn: () => Promise<T>): Promise<T> {
  await renderPool.acquire(RENDER_QUEUE_TIMEOUT_MS);
  try {
    return await fn();
  } finally {
    renderPool.release();
  }
}
