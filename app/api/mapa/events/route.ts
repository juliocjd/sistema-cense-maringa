import { NextRequest } from "next/server";
import mapaEventBus, {
  MAPA_EVENT,
  type MapaEventPayload,
} from "@/lib/mapa-event-bus";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const encoder = new TextEncoder();
  let closed = false;
  let keepAlive: NodeJS.Timeout | null = null;
  let abortHandler: (() => void) | null = null;
  let eventListener: ((payload: MapaEventPayload) => void) | null = null;

  const terminate = (controller: ReadableStreamDefaultController<any>) => {
    if (closed) {
      return;
    }
    closed = true;
    if (keepAlive) {
      clearInterval(keepAlive);
      keepAlive = null;
    }
    if (eventListener) {
      mapaEventBus.off(MAPA_EVENT, eventListener);
      eventListener = null;
    }
    if (abortHandler) {
      _request.signal.removeEventListener("abort", abortHandler);
      abortHandler = null;
    }
    try {
      controller.close();
    } catch {
      // stream already closed
    }
  };

  const push = (
    controller: ReadableStreamDefaultController<any>,
    payload: MapaEventPayload | { tipo: string }
  ) => {
    if (closed) {
      return;
    }
    try {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
      );
    } catch {
      terminate(controller);
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: MapaEventPayload | { tipo: string }) =>
        push(controller, payload);

      send({ tipo: "connected" });

      eventListener = (payload: MapaEventPayload) =>
        send(payload);

      mapaEventBus.on(MAPA_EVENT, eventListener);

      keepAlive = setInterval(() => {
        if (closed) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          terminate(controller);
        }
      }, 20000);

      abortHandler = () => terminate(controller);
      if (_request.signal.aborted) {
        terminate(controller);
      } else {
        _request.signal.addEventListener("abort", abortHandler);
      }
    },
    cancel(controller) {
      terminate(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
