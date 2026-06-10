import { renderPool } from "@/lib/render/semaphore";

export const runtime = "nodejs";

/** Liveness + render-pool snapshot (FRD §16.1). No auth required. */
export async function GET() {
  return Response.json({
    status: "ok",
    time: new Date().toISOString(),
    render: {
      inFlight: renderPool.inFlight,
      waiting: renderPool.waiting,
    },
  });
}
