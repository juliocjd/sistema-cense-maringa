import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/bairros/route";
import {
  GET as GET_BAIRRO,
  PUT,
  DELETE,
} from "@/app/api/bairros/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const bairro = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const operador = { findUnique: vi.fn() };
  const logAuditoria = { create: vi.fn() };

  return {
    prisma: {
      bairro,
      operador,
      logAuditoria,
    },
  };
});

const mockedAuth = vi.mocked(auth);
const mockedPrisma = prisma as unknown as {
  bairro: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
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

describe("GET /api/bairros", () => {
  it("lista bairros com sucesso", async () => {
    mockedPrisma.bairro.findMany.mockResolvedValue([
      {
        id: "bairro-1",
        nomeBairro: "Zona 7",
        cidade: "Maringa",
        _count: { adolescentes: 5 },
      },
    ]);

    const request = buildRequest(
      "GET",
      "http://localhost/api/bairros?incluirTotal=true"
    );
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.bairros[0].totalAdolescentes).toBe(5);
  });
});

describe("POST /api/bairros", () => {
  const url = "http://localhost/api/bairros";

  it("retorna 401 sem autenticacao", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = buildRequest("POST", url, {
      nomeBairro: "Zona 7",
      cidade: "Maringa",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("retorna 403 quando operador nao encontrado", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue(null);

    const request = buildRequest("POST", url, {
      nomeBairro: "Zona 7",
      cidade: "Maringa",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.erro).toBe("Operador nao encontrado");
  });

  it("cria bairro quando dados validos", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findFirst.mockResolvedValue(null);
    mockedPrisma.bairro.create.mockResolvedValue({
      id: "bairro-1",
      nomeBairro: "Zona 7",
      cidade: "Maringa",
    });

    const request = buildRequest("POST", url, {
      nomeBairro: "Zona 7",
      cidade: "Maringa",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.nomeBairro).toBe("Zona 7");
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });
});

describe("PUT /api/bairros/[id]", () => {
  const bairroId = "11111111-1111-1111-1111-111111111111";
  const url = `http://localhost/api/bairros/${bairroId}`;

  it("retorna 401 sem autenticacao", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = buildRequest("PUT", url, { cidade: "Sarandi" });
    const response = await PUT(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("atualiza bairro com sucesso", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findUnique
      .mockResolvedValueOnce({
        id: bairroId,
        nomeBairro: "Zona 7",
        cidade: "Maringa",
      })
      .mockResolvedValueOnce(null);
    mockedPrisma.bairro.update.mockResolvedValue({
      id: bairroId,
      nomeBairro: "Zona 7",
      cidade: "Sarandi",
    });

    const request = buildRequest("PUT", url, { cidade: "Sarandi" });
    const response = await PUT(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.cidade).toBe("Sarandi");
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });
});

describe("DELETE /api/bairros/[id]", () => {
  const bairroId = "11111111-1111-1111-1111-111111111111";
  const url = `http://localhost/api/bairros/${bairroId}`;

  it("retorna 409 quando ha vinculacoes", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findUnique.mockResolvedValue({
      id: bairroId,
      nomeBairro: "Zona 7",
      cidade: "Maringa",
      _count: { adolescentes: 1, bairrosConflitosA: 0, bairrosConflitosB: 2 },
    });

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.erro).toBe(
      "Nao e possivel remover bairro com vinculacoes ativas"
    );
  });

  it("remove bairro quando sem vinculacoes", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.bairro.findUnique.mockResolvedValue({
      id: bairroId,
      nomeBairro: "Zona 7",
      cidade: "Maringa",
      _count: { adolescentes: 0, bairrosConflitosA: 0, bairrosConflitosB: 0 },
    });

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: bairroId }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.sucesso).toBe(true);
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });
});

