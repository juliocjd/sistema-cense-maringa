import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/faccoes/route";
import {
  GET as GET_FACCAO,
  PUT,
  DELETE,
} from "@/app/api/faccoes/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const faccao = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const operador = {
    findUnique: vi.fn(),
  };
  const logAuditoria = {
    create: vi.fn(),
  };

  return {
    prisma: {
      faccao,
      operador,
      logAuditoria,
    },
  };
});

const mockedAuth = vi.mocked(auth);
const mockedPrisma = prisma as unknown as {
  faccao: {
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

describe("GET /api/faccoes", () => {
  it("retorna lista de faccoes", async () => {
    mockedPrisma.faccao.findMany.mockResolvedValue([
      {
        id: "fac-1",
        nomeFaccao: "Grupo A",
        descricao: "Descricao",
        _count: { adolescentes: 3 },
      },
    ]);

    const request = buildRequest("GET", "http://localhost/api/faccoes");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.faccoes[0].nomeFaccao).toBe("Grupo A");
  });
});

describe("GET /api/faccoes/[id]", () => {
  const faccaoId = "11111111-1111-1111-1111-111111111111";
  const baseUrl = `http://localhost/api/faccoes/${faccaoId}`;

  it("retorna 400 quando id invalido", async () => {
    const request = buildRequest("GET", baseUrl);
    const response = await GET_FACCAO(request, {
      params: Promise.resolve({ id: "nao-uuid" }),
    });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("Id da faccao invalido");
  });

  it("retorna 404 quando faccao nao encontrada", async () => {
    mockedPrisma.faccao.findUnique.mockResolvedValueOnce(null);

    const request = buildRequest("GET", baseUrl);
    const response = await GET_FACCAO(request, {
      params: Promise.resolve({ id: faccaoId }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.erro).toBe("Faccao nao encontrada");
  });

  it("retorna faccao com adolescentes quando solicitado", async () => {
    mockedPrisma.faccao.findUnique.mockResolvedValueOnce({
      id: faccaoId,
      nomeFaccao: "Grupo A",
      descricao: "Descricao",
      _count: { adolescentes: 2 },
      adolescentes: [
        {
          id: "ado-1",
          nomeCompleto: "Joao",
          statusUnidade: "ATIVO",
          alojamentoAtual: {
            id: "aloj-1",
            numeroAlojamento: "01",
            ala: "A",
            casa: { id: "casa-1", nome: "Casa 1", numero: 1 },
          },
        },
        {
          id: "ado-2",
          nomeCompleto: "Maria",
          statusUnidade: "ATIVO",
          alojamentoAtual: null,
        },
      ],
    });

    const request = buildRequest(
      "GET",
      `${baseUrl}?incluir_adolescentes=true`
    );
    const response = await GET_FACCAO(request, {
      params: Promise.resolve({ id: faccaoId }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.totalAdolescentes).toBe(2);
    expect(Array.isArray(json.adolescentes)).toBe(true);
    expect(json.adolescentes[0]).toEqual(
      expect.objectContaining({
        id: "ado-1",
        alojamento: expect.objectContaining({
          casa: expect.objectContaining({ nome: "Casa 1" }),
        }),
      })
    );
  });
});

describe("POST /api/faccoes", () => {
  const url = "http://localhost/api/faccoes";

  it("retorna 401 sem autenticacao", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = buildRequest("POST", url, {
      nomeFaccao: "Grupo A",
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("retorna 403 se operador nao encontrado", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue(null);

    const request = buildRequest("POST", url, {
      nomeFaccao: "Grupo A",
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.erro).toBe("Operador nao encontrado");
  });

  it("cria faccao quando dados validos", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.faccao.findUnique.mockResolvedValueOnce(null);
    mockedPrisma.faccao.create.mockResolvedValue({
      id: "fac-1",
      nomeFaccao: "Grupo A",
      descricao: null,
    });

    const request = buildRequest("POST", url, {
      nomeFaccao: "Grupo A",
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.id).toBe("fac-1");
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });

  it("retorna 400 quando payload invalido", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });

    const request = buildRequest("POST", url, { nomeFaccao: "" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("Dados invalidos");
  });

  it("retorna 409 quando nome ja existe", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.faccao.findUnique.mockResolvedValueOnce({
      id: "fac-1",
    });

    const request = buildRequest("POST", url, {
      nomeFaccao: "Grupo A",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.erro).toBe("Faccao ja cadastrada com este nome");
  });
});

describe("PUT /api/faccoes/[id]", () => {
  const faccaoId = "11111111-1111-1111-1111-111111111111";
  const baseUrl = `http://localhost/api/faccoes/${faccaoId}`;

  it("retorna 401 sem autenticacao", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = buildRequest("PUT", baseUrl, { nomeFaccao: "Novo" });
    const response = await PUT(request, {
      params: Promise.resolve({ id: faccaoId }),
    });

    const json = await response.json();
    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("atualiza faccao com sucesso", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.faccao.findUnique
      .mockResolvedValueOnce({ id: faccaoId, nomeFaccao: "Grupo A" }) // obter faccao existente
      .mockResolvedValueOnce(null); // verificar conflito de nome
    mockedPrisma.faccao.update.mockResolvedValue({
      id: faccaoId,
      nomeFaccao: "Grupo B",
      descricao: null,
    });

    const request = buildRequest("PUT", baseUrl, { nomeFaccao: "Grupo B" });
    const response = await PUT(request, {
      params: Promise.resolve({ id: faccaoId }),
    });

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.nomeFaccao).toBe("Grupo B");
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });

  it("retorna 404 quando faccao inexistente", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.faccao.findUnique.mockResolvedValueOnce(null);

    const request = buildRequest("PUT", baseUrl, {
      nomeFaccao: "Grupo Z",
    });
    const response = await PUT(request, {
      params: Promise.resolve({ id: faccaoId }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.erro).toBe("Faccao nao encontrada");
  });

  it("retorna 409 quando novo nome ja utilizado", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.faccao.findUnique
      .mockResolvedValueOnce({ id: faccaoId, nomeFaccao: "Grupo A" })
      .mockResolvedValueOnce({ id: "outro-id" });

    const request = buildRequest("PUT", baseUrl, { nomeFaccao: "Grupo B" });
    const response = await PUT(request, {
      params: Promise.resolve({ id: faccaoId }),
    });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.erro).toBe("Ja existe faccao com este nome");
  });

  it("retorna 400 quando nenhum campo informado", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.faccao.findUnique.mockResolvedValueOnce({
      id: faccaoId,
      nomeFaccao: "Grupo A",
    });

    const request = buildRequest("PUT", baseUrl, {});
    const response = await PUT(request, {
      params: Promise.resolve({ id: faccaoId }),
    });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("Dados invalidos");
  });
});

describe("DELETE /api/faccoes/[id]", () => {
  const faccaoId = "11111111-1111-1111-1111-111111111111";
  const baseUrl = `http://localhost/api/faccoes/${faccaoId}`;

  it("retorna 409 quando ha adolescentes vinculados", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.faccao.findUnique.mockResolvedValue({
      id: faccaoId,
      nomeFaccao: "Grupo A",
      _count: { adolescentes: 2 },
    });

    const request = buildRequest("DELETE", baseUrl);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: faccaoId }),
    });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.erro).toBe(
      "Nao e possivel remover faccao com adolescentes vinculados"
    );
  });

  it("remove faccao quando sem vinculacoes", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.faccao.findUnique.mockResolvedValue({
      id: faccaoId,
      nomeFaccao: "Grupo A",
      _count: { adolescentes: 0 },
    });

    const request = buildRequest("DELETE", baseUrl);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: faccaoId }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.sucesso).toBe(true);
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalled();
  });

  it("retorna 400 quando id invalido", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });

    const request = buildRequest("DELETE", baseUrl);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "invalido" }),
    });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("Id da faccao invalido");
  });

  it("retorna 404 quando faccao nao encontrada", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.faccao.findUnique.mockResolvedValueOnce(null);

    const request = buildRequest("DELETE", baseUrl);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: faccaoId }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.erro).toBe("Faccao nao encontrada");
  });
});
