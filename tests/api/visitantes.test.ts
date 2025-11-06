import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/visitantes/route";
import { DELETE } from "@/app/api/visitantes/[id]/route";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/ensure-operador", () => ({
  ensureOperador: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const mockFn = vi.fn;

  const visitante = {
    findMany: mockFn(),
    findUnique: mockFn(),
    create: mockFn(),
    update: mockFn(),
    delete: mockFn(),
  };
  const adolescente = {
    findMany: mockFn(),
    findUnique: mockFn(),
  };
  const adolescenteVisitanteLink = {
    findMany: mockFn(),
    findFirst: mockFn(),
    delete: mockFn(),
    deleteMany: mockFn(),
    create: mockFn(),
    update: mockFn(),
  };
  const visitaRegistro = {
    count: mockFn(),
    findMany: mockFn(),
    findFirst: mockFn(),
    create: mockFn(),
    update: mockFn(),
    deleteMany: mockFn(),
  };
  const logAuditoria = {
    create: mockFn(),
  };

  return {
    prisma: {
      visitante,
      adolescente,
      adolescenteVisitanteLink,
      visitaRegistro,
      logAuditoria,
      $transaction: mockFn(),
    },
  };
});

const mockedEnsureOperador = vi.mocked(ensureOperador);
const mockedPrisma = prisma as unknown as {
  visitante: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  adolescente: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  adolescenteVisitanteLink: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  visitaRegistro: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  logAuditoria: {
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const buildRequest = (url: string, init?: RequestInit) =>
  new NextRequest(new Request(url, init));

beforeEach(() => {
  mockedEnsureOperador.mockReset();
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

  mockedEnsureOperador.mockResolvedValue({
    ok: true,
    operadorId: "oper-1",
    ip: "127.0.0.1",
  });
});

describe("API Visitantes - /api/visitantes", () => {
  it("lista visitantes com dados basicos", async () => {
    mockedPrisma.visitante.findMany.mockResolvedValue([
      {
        id: "vis-1",
        nomeCompleto: "Maria Souza",
        cpf: "12345678901",
        dataNascimento: new Date("1990-01-01T00:00:00Z"),
        enderecoCompleto: "Rua A",
        telefones: ["4499990000"],
        fotoUrl: null,
        criadoEm: new Date("2025-01-01T10:00:00Z"),
        atualizadoEm: new Date("2025-01-01T10:00:00Z"),
        _count: {
          adolescentesLink: 2,
          visitasRegistro: 5,
        },
      },
    ]);

    const response = await GET(buildRequest("http://localhost/api/visitantes"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.visitantes[0]).toMatchObject({
      id: "vis-1",
      nomeCompleto: "Maria Souza",
      totalVinculos: 2,
      totalVisitas: 5,
    });
    expect(mockedEnsureOperador).toHaveBeenCalled();
  });

  it("cria visitante com vinculos e registra auditoria", async () => {
    mockedPrisma.adolescente.findMany.mockResolvedValue([
      { id: "11111111-1111-1111-1111-111111111111" },
    ]);

    const visitanteCriado = {
      id: "vis-2",
      nomeCompleto: "Joao Pereira",
      cpf: "99888777666",
      dataNascimento: new Date("1985-05-10T00:00:00Z"),
      enderecoCompleto: "Rua B",
      telefones: ["4491112222"],
      fotoUrl: null,
      criadoEm: new Date("2025-11-06T10:00:00Z"),
      atualizadoEm: new Date("2025-11-06T10:00:00Z"),
      _count: {
        adolescentesLink: 1,
        visitasRegistro: 0,
      },
      adolescentesLink: [
        {
          id: "link-1",
          adolescenteId: "11111111-1111-1111-1111-111111111111",
          autorizado: true,
          parentesco: "MAE",
          observacoes: null,
          adolescente: {
            id: "11111111-1111-1111-1111-111111111111",
            nomeCompleto: "Ana",
            nomeSocial: null,
            statusUnidade: "ATIVA",
          },
        },
      ],
      visitasRegistro: [],
    };

    const visitanteTx = {
      create: vi.fn().mockResolvedValue(visitanteCriado),
    };
    const logAuditoriaTx = {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
    };

    mockedPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        visitante: visitanteTx,
        logAuditoria: logAuditoriaTx,
      })
    );

    const response = await POST(
      buildRequest("http://localhost/api/visitantes", {
        method: "POST",
        body: JSON.stringify({
          nomeCompleto: "Joao Pereira",
          cpf: "998.887.776-66",
          telefones: [" (44) 9111-2222 "],
          vinculos: [
            {
              adolescenteId: "11111111-1111-1111-1111-111111111111",
              parentesco: "Mae",
            },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.nomeCompleto).toBe("Joao Pereira");
    expect(json.vinculos).toHaveLength(1);
    expect(visitanteTx.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nomeCompleto: "Joao Pereira",
          cpf: "99888777666",
        }),
      })
    );
    expect(logAuditoriaTx.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operadorId: "oper-1",
          acao: "VISITANTE_CRIAR",
        }),
      })
    );
  });

  it("remove visitante quando nao possui visitas em aberto", async () => {
    mockedPrisma.visitante.findUnique.mockResolvedValue({
      id: "vis-3",
      nomeCompleto: "Carlos Gomes",
    });
    mockedPrisma.visitaRegistro.count.mockResolvedValue(0);

    const tx = {
      adolescenteVisitanteLink: {
        deleteMany: vi.fn(),
      },
      visitaRegistro: {
        deleteMany: vi.fn(),
      },
      visitante: {
        delete: vi.fn(),
      },
      logAuditoria: {
        create: vi.fn(),
      },
    };

    mockedPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        adolescenteVisitanteLink: tx.adolescenteVisitanteLink,
        visitaRegistro: tx.visitaRegistro,
        visitante: tx.visitante,
        logAuditoria: tx.logAuditoria,
      })
    );

    const response = await DELETE(
      buildRequest("http://localhost/api/visitantes/vis-3"),
      { params: Promise.resolve({ id: "vis-3" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.sucesso).toBe(true);
    expect(tx.visitante.delete).toHaveBeenCalledWith({
      where: { id: "vis-3" },
    });
    expect(tx.logAuditoria.create).toHaveBeenCalled();
  });

  it("bloqueia remocao quando existem visitas em aberto", async () => {
    mockedPrisma.visitante.findUnique.mockResolvedValue({
      id: "vis-4",
      nomeCompleto: "Pedro Lima",
    });
    mockedPrisma.visitaRegistro.count.mockResolvedValue(2);

    const response = await DELETE(
      buildRequest("http://localhost/api/visitantes/vis-4"),
      { params: Promise.resolve({ id: "vis-4" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.erro).toBe(
      "Existem visitas em aberto para este visitante"
    );
  });
});
