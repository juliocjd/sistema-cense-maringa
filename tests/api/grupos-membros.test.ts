import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as POST_ADICIONAR } from "@/app/api/grupos/[id]/adicionar-membro/route";
import { DELETE as DELETE_MEMBRO } from "@/app/api/grupos/[id]/membros/[membroId]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const mockFn = vi.fn;

  const grupo = { findUnique: mockFn() };
  const adolescente = { findUnique: mockFn() };
  const operador = { findUnique: mockFn() };
  const grupoMembro = {
    findUnique: mockFn(),
    findFirst: mockFn(),
    findMany: mockFn(),
    create: mockFn(),
    update: mockFn(),
    delete: mockFn(),
  };
  const logAuditoria = { create: mockFn() };
  const decisaoOperacional = { create: mockFn() };

  return {
    prisma: {
      grupo,
      adolescente,
      operador,
      grupoMembro,
      logAuditoria,
      decisaoOperacional,
      $transaction: mockFn().mockImplementation(async (fn: any) => {
        return await fn({
          grupoMembro,
          logAuditoria,
          decisaoOperacional,
        });
      }),
    },
  };
});

const mockedAuth = vi.mocked(auth);
const mockedPrisma = prisma as unknown as {
  grupo: { findUnique: ReturnType<typeof vi.fn> };
  adolescente: { findUnique: ReturnType<typeof vi.fn> };
  operador: { findUnique: ReturnType<typeof vi.fn> };
  grupoMembro: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  logAuditoria: { create: ReturnType<typeof vi.fn> };
  decisaoOperacional: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const makeRequest = (
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
    if (typeof value === "function" && "mockReset" in value) {
      (value as any).mockReset();
    } else if (typeof value === "object" && value !== null) {
      Object.values(value).forEach((fn) => {
        if (typeof fn === "function" && "mockReset" in fn) {
          (fn as any).mockReset();
        }
      });
    }
  });
});

describe("POST /api/grupos/[id]/adicionar-membro", () => {
  const url = "http://localhost/api/grupos/grupo-1/adicionar-membro";

  it("retorna 401 quando nao autenticado", async () => {
    mockedAuth.mockResolvedValueOnce(null);

    const response = await POST_ADICIONAR(makeRequest("POST", url), {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("retorna 403 quando operador nao existe", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce(null);

    const response = await POST_ADICIONAR(makeRequest("POST", url), {
      params: Promise.resolve({ id: "grupo-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.erro).toBe("Operador nao encontrado");
  });

  it("retorna 400 quando body nao contem adolescenteId", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce({ id: "oper-1" });

    const response = await POST_ADICIONAR(
      makeRequest("POST", url, { justificativa: "teste" }),
      { params: Promise.resolve({ id: "grupo-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.erro).toBe("adolescenteId e obrigatorio");
  });

  it("retorna 404 quando grupo nao encontrado", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce({ id: "oper-1" });
    mockedPrisma.grupo.findUnique.mockResolvedValueOnce(null);

    const response = await POST_ADICIONAR(
      makeRequest("POST", url, { adolescenteId: "ado-1" }),
      { params: Promise.resolve({ id: "grupo-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.erro).toBe("Grupo nao encontrado");
  });

  it("adiciona membro com sucesso quando nao ha conflitos", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce({ id: "oper-1" });
    mockedPrisma.grupo.findUnique.mockResolvedValueOnce({
      id: "grupo-1",
      nomeGrupo: "Grupo A",
      casaId: "casa-1",
      casa: { id: "casa-1", nome: "Casa 1" },
      membros: [],
    });
    mockedPrisma.adolescente.findUnique.mockResolvedValueOnce({
      id: "ado-1",
      nomeCompleto: "Joao Silva",
      conflitosA: [],
      conflitosB: [],
      gruposMembros: [],
    });
    mockedPrisma.grupoMembro.findFirst.mockResolvedValueOnce(null);
    mockedPrisma.grupoMembro.findMany.mockResolvedValueOnce([]);

    const dataEntrada = new Date("2025-01-01T10:00:00Z");

    mockedPrisma.$transaction.mockImplementationOnce(async (fn) => {
      return await fn({
        grupoMembro: mockedPrisma.grupoMembro,
        logAuditoria: mockedPrisma.logAuditoria,
        decisaoOperacional: mockedPrisma.decisaoOperacional,
      });
    });

    mockedPrisma.grupoMembro.create.mockResolvedValueOnce({
      id: "membro-1",
      dataEntrada,
      adolescente: { id: "ado-1", nomeCompleto: "Joao Silva" },
      grupo: {
        id: "grupo-1",
        nomeGrupo: "Grupo A",
        casa: { nome: "Casa 1" },
      },
    });
    mockedPrisma.logAuditoria.create.mockResolvedValueOnce({ id: "log-1" });

    const response = await POST_ADICIONAR(
      makeRequest("POST", url, { adolescenteId: "ado-1" }),
      { params: Promise.resolve({ id: "grupo-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.sucesso).toBe(true);
    expect(json.membro.id).toBe("membro-1");
    expect(json.documentado).toBe(false);
    expect(mockedPrisma.grupoMembro.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          grupoId: "grupo-1",
          adolescenteId: "ado-1",
          dataEntrada: expect.any(Date),
        }),
        include: expect.objectContaining({
          adolescente: true,
          grupo: expect.any(Object),
        }),
      })
    );
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operadorId: "oper-1",
          acao: "GRUPO_ADICIONAR_MEMBRO",
          tabelaAfetada: "grupos_membros",
        }),
      })
    );
  });
});

describe("DELETE /api/grupos/[id]/membros/[membroId]", () => {
  const url = "http://localhost/api/grupos/grupo-1/membros/membro-1";

  it("retorna 401 quando nao autenticado", async () => {
    mockedAuth.mockResolvedValueOnce(null);

    const response = await DELETE_MEMBRO(makeRequest("DELETE", url), {
      params: Promise.resolve({ id: "grupo-1", membroId: "membro-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.erro).toBe("Operador nao autenticado");
  });

  it("retorna 403 quando operador nao encontrado", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce(null);

    const response = await DELETE_MEMBRO(makeRequest("DELETE", url), {
      params: Promise.resolve({ id: "grupo-1", membroId: "membro-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.erro).toBe("Operador nao encontrado");
  });

  it("retorna 404 quando membro nao existe", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce({ id: "oper-1" });
    mockedPrisma.grupoMembro.findUnique.mockResolvedValueOnce(null);

    const response = await DELETE_MEMBRO(makeRequest("DELETE", url), {
      params: Promise.resolve({ id: "grupo-1", membroId: "membro-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.erro).toBe("Membro nao encontrado");
  });

  it("remove membro com sucesso", async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: "oper-1" } } as any);
    mockedPrisma.operador.findUnique.mockResolvedValueOnce({ id: "oper-1" });

    const membro = {
      id: "membro-1",
      grupoId: "grupo-1",
      dataEntrada: new Date("2025-01-01T10:00:00Z"),
      dataSaida: null,
      grupo: { id: "grupo-1", nomeGrupo: "Grupo A" },
      adolescente: { id: "ado-1", nomeCompleto: "Joao Silva" },
    };

    mockedPrisma.grupoMembro.findUnique.mockResolvedValueOnce(membro);

    const membroAtualizado = {
      ...membro,
      dataSaida: new Date("2025-01-02T12:00:00Z"),
    };

    mockedPrisma.$transaction.mockImplementationOnce(async (fn) => {
      return await fn({
        grupoMembro: mockedPrisma.grupoMembro,
        logAuditoria: mockedPrisma.logAuditoria,
        decisaoOperacional: mockedPrisma.decisaoOperacional,
      });
    });

    mockedPrisma.grupoMembro.update.mockResolvedValueOnce(membroAtualizado);
    mockedPrisma.logAuditoria.create.mockResolvedValueOnce({ id: "log-2" });

    const response = await DELETE_MEMBRO(makeRequest("DELETE", url), {
      params: Promise.resolve({ id: "grupo-1", membroId: "membro-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.membro.id).toBe("membro-1");
    expect(json.membro.dataSaida).toBeDefined();
    expect(mockedPrisma.grupoMembro.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "membro-1" },
        data: { dataSaida: expect.any(Date) },
      })
    );
    expect(mockedPrisma.logAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operadorId: "oper-1",
          acao: "GRUPO_REMOVER_MEMBRO",
        }),
      })
    );
  });
});
