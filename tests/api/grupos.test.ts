import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/grupos/route";
import {
  GET as GET_GRUPO,
  PATCH,
  DELETE,
} from "@/app/api/grupos/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const mockFn = vi.fn;
  const grupo = {
    findMany: mockFn(),
    findFirst: mockFn(),
    create: mockFn(),
    findUnique: mockFn(),
    update: mockFn(),
    delete: mockFn(),
  };
  const casa = { findUnique: mockFn() };
  const operador = { findUnique: mockFn() };
  const logAuditoria = { create: mockFn() };
  const adolescente = { findMany: mockFn() };
  const conflito = { findMany: mockFn() };

  adolescente.findMany.mockResolvedValue([]);
  conflito.findMany.mockResolvedValue([]);

  return {
    prisma: {
      grupo,
      casa,
      operador,
      logAuditoria,
      adolescente,
      conflito,
    },
  };
});

const mockedAuth = vi.mocked(auth as unknown as ReturnType<typeof vi.fn>);
const mockedPrisma = prisma as unknown as {
  grupo: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  casa: { findUnique: ReturnType<typeof vi.fn> };
  operador: { findUnique: ReturnType<typeof vi.fn> };
  logAuditoria: { create: ReturnType<typeof vi.fn> };
  adolescente: { findMany: ReturnType<typeof vi.fn> };
  conflito: { findMany: ReturnType<typeof vi.fn> };
};

const CASA_ID = "00000000-0000-0000-0000-000000000001";

const buildRequest = (
  method: string,
  url: string,
  body?: Record<string, unknown>
) => {
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
  mockedPrisma.adolescente.findMany.mockResolvedValue([]);
  mockedPrisma.conflito.findMany.mockResolvedValue([]);
});
});

describe("GET /api/grupos", () => {
  it("lista grupos sem membros", async () => {
    mockedPrisma.grupo.findMany.mockResolvedValue([
      {
        id: "grupo-1",
        nomeGrupo: "Grupo Alpha",
        ordemAla: "A",
        status: "ATIVO",
        criadoEm: "2025-01-01",
        casa: { id: "00000000-0000-0000-0000-000000000001", nome: "Casa 01", numero: 1 },
      },
    ]);

    const request = buildRequest("GET", "http://localhost/api/grupos");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.grupos[0]).toMatchObject({
      id: "grupo-1",
      nomeGrupo: "Grupo Alpha",
      casa: { nome: "Casa 01" },
    });
    expect(json.grupos[0].membros).toBeUndefined();
  });

  it("lista grupos incluindo membros ativos", async () => {
    mockedPrisma.grupo.findMany.mockResolvedValue([
      {
        id: "grupo-1",
        nomeGrupo: "Grupo Beta",
        ordemAla: null,
        status: "ATIVO",
        criadoEm: "2025-01-02",
        casa: { id: "00000000-0000-0000-0000-000000000001", nome: "Casa 01", numero: 1 },
        membros: [
          {
            id: "membro-1",
            dataEntrada: "2025-01-03",
            dataSaida: null,
            adolescente: {
              id: "ado-1",
              nomeCompleto: "Fulano",
              nomeSocial: null,
              numeroSms: "12345",
              fotoUrl: null,
              statusUnidade: "ATIVO",
              alojamentoAtual: {
                id: "aloj-1",
                numeroAlojamento: "01",
                ala: "A",
              },
            },
          },
        ],
      },
    ]);

    const request = buildRequest(
      "GET",
      "http://localhost/api/grupos?incluir_membros=true"
    );
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.grupos[0].totalMembros).toBe(1);
    expect(json.grupos[0].membros[0].adolescente.nomeCompleto).toBe("Fulano");
  });
});

describe("POST /api/grupos", () => {
  const url = "http://localhost/api/grupos";

  it("retorna 401 quando nao autenticado", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = buildRequest("POST", url, {
      nomeGrupo: "Grupo Alpha",
      casaId: "00000000-0000-0000-0000-000000000001",
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
      nomeGrupo: "Grupo Alpha",
      casaId: "00000000-0000-0000-0000-000000000001",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.erro).toBe("Operador nao encontrado");
  });

  it("retorna 404 quando casa nao existe", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.casa.findUnique.mockResolvedValue(null);

    const request = buildRequest("POST", url, {
      nomeGrupo: "Grupo Alpha",
      casaId: "00000000-0000-0000-0000-000000000001",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.erro).toBe("Casa não encontrada");
  });

  it("retorna 409 quando grupo ja existe na casa", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.casa.findUnique.mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000001",
      nome: "Casa 01",
    });
    mockedPrisma.grupo.findFirst.mockResolvedValue({ id: "grupo-duplicado" });

    const request = buildRequest("POST", url, {
      nomeGrupo: "Grupo Alpha",
      casaId: "00000000-0000-0000-0000-000000000001",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.erro).toContain("Já existe um grupo");
  });

  it("cria grupo com sucesso", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.casa.findUnique.mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000001",
      nome: "Casa 01",
    });
    mockedPrisma.grupo.findFirst.mockResolvedValue(null);
    mockedPrisma.grupo.create.mockResolvedValue({
      id: "grupo-1",
      nomeGrupo: "Grupo Alpha",
      ordemAla: null,
      status: "ATIVO",
      casa: { id: "00000000-0000-0000-0000-000000000001", nome: "Casa 01", numero: 1 },
    });

    const request = buildRequest("POST", url, {
      nomeGrupo: "Grupo Alpha",
      casaId: "00000000-0000-0000-0000-000000000001",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.nomeGrupo).toBe("Grupo Alpha");
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/grupos/[id]", () => {
  it("retorna 404 quando grupo nao existe", async () => {
    mockedPrisma.grupo.findUnique.mockResolvedValue(null);

    const request = buildRequest(
      "GET",
      "http://localhost/api/grupos/grupo-1"
    );
    const response = await GET_GRUPO(request, {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.erro).toBe("Grupo nao encontrado");
  });

  it("retorna grupo com membros quando solicitado", async () => {
    mockedPrisma.grupo.findUnique.mockResolvedValue({
      id: "grupo-1",
      nomeGrupo: "Grupo Alpha",
      ordemAla: null,
      status: "ATIVO",
      criadoEm: "2025-01-01",
      casa: { id: "00000000-0000-0000-0000-000000000001", nome: "Casa 01", numero: 1 },
      membros: [
        {
          id: "membro-1",
          dataEntrada: "2025-01-10",
          dataSaida: null,
          adolescente: {
            id: "ado-1",
            nomeCompleto: "Fulano",
            nomeSocial: null,
            numeroSms: "12345",
            fotoUrl: null,
            statusUnidade: "ATIVO",
            alojamentoAtual: {
              id: "aloj-1",
              numeroAlojamento: "01",
              ala: "A",
            },
          },
        },
      ],
    });

    const request = buildRequest(
      "GET",
      "http://localhost/api/grupos/grupo-1?incluir_membros=true"
    );
    const response = await GET_GRUPO(request, {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.totalMembros).toBe(1);
    expect(json.membros[0].adolescente.nomeCompleto).toBe("Fulano");
  });
});

describe("PATCH /api/grupos/[id]", () => {
  const url = "http://localhost/api/grupos/grupo-1";

  it("retorna 401 sem autenticacao", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = buildRequest("PATCH", url, { nomeGrupo: "Novo Nome" });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("retorna 403 quando operador nao encontrado", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce(null);

    const request = buildRequest("PATCH", url, { nomeGrupo: "Novo Nome" });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.erro).toBe("Operador nao encontrado");
  });

  it("retorna 404 quando grupo nao encontrado", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.grupo.findUnique.mockResolvedValueOnce(null);

    const request = buildRequest("PATCH", url, { nomeGrupo: "Novo Nome" });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.erro).toBe("Grupo nao encontrado");
  });

  it("atualiza grupo com sucesso", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValue({ id: "oper-1" });
    mockedPrisma.grupo.findUnique.mockResolvedValueOnce({
      id: "grupo-1",
      nomeGrupo: "Grupo Antigo",
      ordemAla: null,
      status: "ATIVO",
      casa: { nome: "Casa 01", numero: 1 },
    });
    mockedPrisma.grupo.update.mockResolvedValue({
      id: "grupo-1",
      nomeGrupo: "Grupo Novo",
      ordemAla: null,
      status: "ATIVO",
      casa: { id: "00000000-0000-0000-0000-000000000001", nome: "Casa 01", numero: 1 },
    });

    const request = buildRequest("PATCH", url, { nomeGrupo: "Grupo Novo" });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.mensagem).toBe("Grupo atualizado com sucesso");
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /api/grupos/[id]", () => {
  const url = "http://localhost/api/grupos/grupo-1";

  it("retorna 401 quando nao autenticado", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("retorna 403 quando operador nao encontrado", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce(null);

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.erro).toBe("Operador nao encontrado");
  });

  it("retorna 404 quando grupo nao existe", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce({ id: "oper-1" });
    mockedPrisma.grupo.findUnique.mockResolvedValueOnce(null);

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.erro).toBe("Grupo nao encontrado");
  });

  it("retorna 409 quando ha membros ativos", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce({ id: "oper-1" });
    mockedPrisma.grupo.findUnique.mockResolvedValueOnce({
      id: "grupo-1",
      nomeGrupo: "Grupo Alpha",
      casa: { nome: "Casa 01" },
      membros: [{ id: "membro-1" }],
    });

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.erro).toBe(
      "Nao e possivel remover grupos com membros ativos"
    );
  });

  it("remove grupo com sucesso", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce({ id: "oper-1" });
    mockedPrisma.grupo.findUnique.mockResolvedValueOnce({
      id: "grupo-1",
      nomeGrupo: "Grupo Alpha",
      casa: { nome: "Casa 01" },
      membros: [],
    });

    const request = buildRequest("DELETE", url);
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.sucesso).toBe(true);
    expect(mockedPrisma.grupo.delete).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalledTimes(1);
  });
});
