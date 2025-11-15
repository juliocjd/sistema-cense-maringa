import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/conflitos/route";
import { DELETE as DELETE_CONFLITO } from "@/app/api/conflitos/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

const prismaSetup = vi.hoisted(() => {
  const refs = {
    operador: { findUnique: vi.fn() },
    conflito: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    logAuditoria: { create: vi.fn() },
  };
  const transaction = vi.fn((arg: any) => {
    if (typeof arg === "function") {
      return arg({
        conflito: refs.conflito,
        tentativaMediacao: {
          deleteMany: vi.fn(),
        },
      });
    }
    return Promise.all(arg as Array<Promise<any>>);
  });

  const factory = () => ({
    prisma: {
      operador: refs.operador,
      conflito: refs.conflito,
      logAuditoria: refs.logAuditoria,
      $transaction: transaction,
    },
  });

  return { refs, factory, transaction };
});

vi.mock("@/lib/prisma", prismaSetup.factory);

const {
  refs: {
    operador: operadorMock,
    conflito: conflitoMock,
    logAuditoria: logAuditoriaMock,
  },
  transaction: transactionMock,
} = prismaSetup;

const mockedAuth = vi.mocked(auth);

const buildRequest = (body: Record<string, unknown>) =>
  new NextRequest(
    new Request("http://localhost/api/conflitos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );

beforeEach(() => {
  mockedAuth.mockReset();
  operadorMock.findUnique.mockReset();
  conflitoMock.findFirst.mockReset();
  conflitoMock.findMany.mockReset();
  conflitoMock.create.mockReset();
  conflitoMock.findUnique.mockReset();
  conflitoMock.deleteMany.mockReset();
  logAuditoriaMock.create.mockReset();
  transactionMock.mockReset();
  transactionMock.mockImplementation((arg: any) => {
    if (typeof arg === "function") {
      return arg({
        conflito: conflitoMock,
        tentativaMediacao: {
          deleteMany: vi.fn(),
        },
      });
    }
    return Promise.all(arg);
  });
});

describe("POST /api/conflitos com lados/partes", () => {
  it("cria conflitos para cada combinacao entre os lados informados", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "operador-10" } });
    operadorMock.findUnique.mockResolvedValue({ id: "operador-10" });
    conflitoMock.findMany.mockResolvedValue([]);
    conflitoMock.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: `${data.adolescenteAId}-${data.adolescenteBId}`,
        adolescenteAId: data.adolescenteAId,
        adolescenteBId: data.adolescenteBId,
      })
    );

    const request = buildRequest({
      tipoConflito: "PESSOAL",
      origem: "OBSERVACAO",
      partes: [
        {
          nome: "Grupo A",
          participantes: [
            { adolescenteId: "adol-1" },
            { adolescenteId: "adol-2" },
          ],
        },
        {
          nome: "Grupo B",
          participantes: [{ adolescenteId: "adol-3" }],
        },
      ],
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(conflitoMock.create).toHaveBeenCalledTimes(2);
    expect(json.conflitosCriados).toHaveLength(2);
    expect(logAuditoriaMock.create).toHaveBeenCalledTimes(1);
  });

  it("retorna mensagem quando todas as combinacoes ja existirem", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "operador-11" } });
    operadorMock.findUnique.mockResolvedValue({ id: "operador-11" });
    conflitoMock.findMany.mockResolvedValue([
      { id: "c1", adolescenteAId: "adol-1", adolescenteBId: "adol-3" },
    ]);

    const request = buildRequest({
      tipoConflito: "FACCAO",
      origem: "OBSERVACAO",
      partes: [
        { participantes: [{ adolescenteId: "adol-1" }] },
        { participantes: [{ adolescenteId: "adol-3" }] },
      ],
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.mensagem).toContain("Nenhum novo conflito");
    expect(conflitoMock.create).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/conflitos/[id]", () => {
  const buildDeleteRequest = () =>
    new NextRequest(
      new Request("http://localhost/api/conflitos/conf-1", {
        method: "DELETE",
      })
    );

  it("remove todos os conflitos associados ao registro", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "operador-12" } });
    operadorMock.findUnique.mockResolvedValue({ id: "operador-12" });
    conflitoMock.findUnique.mockResolvedValue({
      id: "conf-1",
      registroGrupoId: "grp-99",
    });
    conflitoMock.findMany.mockResolvedValue([
      { id: "conf-1" },
      { id: "conf-2" },
      { id: "conf-3" },
    ]);
    conflitoMock.deleteMany.mockResolvedValue({ count: 3 });

    const response = await DELETE_CONFLITO(buildDeleteRequest(), {
      params: Promise.resolve({ id: "conf-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.totalRemovidos).toBe(3);
    expect(json.registroGrupoId).toBe("grp-99");
    expect(conflitoMock.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["conf-1", "conf-2", "conf-3"] },
      },
    });
    expect(logAuditoriaMock.create).toHaveBeenCalledTimes(1);
  });
});
