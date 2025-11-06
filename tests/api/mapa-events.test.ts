import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/mapa/events/route";
import { emitMapaEvent } from "@/lib/mapa-event-bus";

const decoder = new TextDecoder();

const buildRequest = () =>
  new NextRequest(new Request("http://localhost/api/mapa/events"));

async function readChunk(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Stream reader indisponivel");
  }
  const result = await reader.read();
  return { reader, result };
}

describe("GET /api/mapa/events", () => {
  beforeEach(() => {
    // nada específico; cada teste cria seu stream
  });

  it("retorna stream SSE com evento inicial", async () => {
    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");

    const { reader, result } = await readChunk(response);
    const chunk = decoder.decode(result.value);
    expect(chunk).toContain("connected");
    await reader.cancel();
  });

  it("propaga eventos de mapa emitidos", async () => {
    const response = await GET(buildRequest());
    const reader = response.body?.getReader();
    expect(reader).toBeTruthy();
    if (!reader) return;

    // consumir linha inicial
    await reader.read();

    const awaiting = reader.read();
    emitMapaEvent({
      tipo: "alocacao",
      adolescenteId: "ado-1",
      alojamentoId: "aloj-1",
    });
    const eventChunk = await awaiting;
    const data = decoder.decode(eventChunk.value);
    expect(data).toContain("alocacao");
    expect(data).toContain("ado-1");
    await reader.cancel();
  });
});
