import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events: каждое открытое окно (Клиент, Мастер, Админ) получает событие,
 * как только версия данных в базе меняется. Работает между вкладками и устройствами.
 */
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      let last = -1;
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const tick = async () => {
        try {
          const s = await prisma.syncState.findUnique({ where: { id: 1 } });
          const v = s?.version ?? 0;
          if (v !== last) {
            last = v;
            send(`event: version\ndata: ${v}\n\n`);
          }
        } catch {
          /* база занята — попробуем на следующем тике */
        }
      };
      await tick();
      timer = setInterval(tick, 600);
      heartbeat = setInterval(() => send(`: ping\n\n`), 15000);
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(timer);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      clearInterval(timer);
      clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
