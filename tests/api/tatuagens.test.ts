import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/tatuagens/route";
import {
  GET as GET_TATUAGEM,
  PUT,
  DELETE,
} from "@/app/api/tatuagens/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const tatuagemCatalogo = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const operador = { findUnique: vi.fn() };
  const logAuditoria = { create: vi.fn() };

  return {
    prisma: {
      tatuagemCatalogo,
      operador,
      logAuditoria,
    },
  };
});

const mockedAuth = vi.mocked(auth);
const mockedPrisma = prisma as unknown as {
  tatuagemCatalogo: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  operador: { findUnique: ReturnType<typeof vi.fn> };
  logAuditoria: { create: ReturnType<typeof vi.fn> };
};

const buildRequest = (method: string, url: string, body?: unknown) => {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new Request(url, init));
};

beforeEach(() => {
  mockedAuth.mockReset();
  Object.values(mockedPrisma).forEach((value) => {
    Object.values(value).forEach((fn) => {
      if (typeof fn === "function" && "mockReset" in fn) {
        (fn as any).mockReset();
      }
    });
  });
});

describe("GET /api/tatuagens", () => {
  it("lista tatuagens com filtros", async () => {
    mockedPrisma.tatuagemCatalogo.findMany.mockResolvedValue([
      {
        id: "tat-1",
        nomeSimbolo: "Palhaco",
        significadoAssociado: "Assassino de policial",
        nivelRisco: "ALTO",
        _count: { adolescentesTatuagens: 4 },
      },
    ]);

    const request = buildRequest(
      "GET",
      "http://localhost/api/tatuagens?incluirTotal=true&nivelRisco=ALTO"
    );
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.tatuagens[0].totalUso).toBe(4);
  });
});

describe("POST /api/tatuagens", () => {
  const url = "http://localhost/api/tatuagens";

  it("retorna 401 quando sem autenticacao", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = buildRequest("POST", url, {
      nomeSimbolo: "Palhaco",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("cria tatuagem com sucesso", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.tatuagemCatalogo.findUnique.mockResolvedValue(null);
    mockedPrisma.tatuagemCatalogo.create.mockResolvedValue({
      id: "tat-1",
      nomeSimbolo: "Palhaco",
      significadoAssociado: "Assassino de policial",
      nivelRisco: "ALTO",
    });

    const request = buildRequest("POST", url, {
      nomeSimbolo: "Palhaco",
      nivelRisco: "ALTO",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.nomeSimbolo).toBe("Palhaco");
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });
});

describe("PUT /api/tatuagens/[id]", () => {
  const tatuagemId = "11111111-1111-1111-1111-111111111111";
  const url = `http://localhost/api/tatuagens/${tatuagemId}`;

  it("retorna 401 sem autenticacao", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = buildRequest("PUT", url, { nivelRisco: "MEDIO" });
    const response = await PUT(request, {
      params: Promise.resolve({ id: tatuagemId }),
    });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("atualiza tatuagem com sucesso", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.tatuagemCatalogo.findUnique
      .mockResolvedValueOnce({ id: tatuagemId, nomeSimbolo: "Palhaco" })
      .mockResolvedValueOnce(null);
    mockedPrisma.tatuagemCatalogo.update.mockResolvedValue({
      id: tatuagemId,
      nomeSimbolo: "Palhaco",
      significadoAssociado: "Recrutador",
      nivelRisco: "MEDIO",
    });

    const request = buildRequest("PUT", url, {
      significadoAssociado: "Recrutador",
      nivelRisco: "MEDIO",
    });
    const response = await PUT(request, {
      params: Promise.resolve({ id: tatuagemId }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.nivelRisco).toBe("MEDIO");
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });
});

describe("DELETE /api/tatuagens/[id]", () => {
  const tatuagemId = "11111111-1111-1111-1111-111111111111";
  const url = `http://localhost/api/tatuagens/${tatuagemId}`;

  it("retorna 409 quando existem vinculos", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.tatuagemCatalogo.findUnique.mockResolvedValue({
      id: tatuagemId,
      nomeSimbolo: "Palhaco",
      nivelRisco: "ALTO",
      _count: { adolescentesTatuagens: 3 },
    });

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: tatuagemId }),
    });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.erro).toBe(
      "Nao e possivel remover tatuagem com vinculos ativos"
    );
  });

  it("remove tatuagem quando sem vinculos", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.tatuagemCatalogo.findUnique.mockResolvedValue({
      id: tatuagemId,
      nomeSimbolo: "Palhaco",
      nivelRisco: "ALTO",
      _count: { adolescentesTatuagens: 0 },
    });

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: tatuagemId }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.sucesso).toBe(true);
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });
});
