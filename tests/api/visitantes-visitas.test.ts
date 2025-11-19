import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GET as GET_VISITAS,
  POST as POST_VISITAS,
} from "@/app/api/visitantes/[id]/visitas/route";
import { PATCH as PATCH_VISITA } from "@/app/api/visitantes/[id]/visitas/[visitaId]/route";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import { prisma } from "@/lib/prisma";
import { validarRegistroVisita } from "@/lib/visitantes/validacoes";

vi.mock("@/lib/auth/ensure-operador", () => ({
  ensureOperador: vi.fn(),
}));

vi.mock("@/lib/visitantes/validacoes", () => ({
  validarRegistroVisita: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const mockFn = vi.fn;

  const visitante = {
    findUnique: mockFn(),
  };
  const adolescente = {
    findUnique: mockFn(),
  };
  const adolescenteVisitanteLink = {
    findFirst: mockFn(),
  };
  const visitaRegistro = {
    findMany: mockFn(),
    findFirst: mockFn(),
    create: mockFn(),
    update: mockFn(),
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
const mockedValidarRegistroVisita = vi.mocked(validarRegistroVisita);
const mockedPrisma = prisma as unknown as {
  visitante: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  adolescente: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  adolescenteVisitanteLink: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  visitaRegistro: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
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
  mockedEnsureOperador.mockResolvedValue({
    ok: true,
    operadorId: "oper-1",
    ip: "127.0.0.1",
  });

  mockedValidarRegistroVisita.mockReset();
  mockedValidarRegistroVisita.mockResolvedValue({
    valido: true,
    erros: [],
    alertas: [],
    metadata: {
      periodoAutorizado: "MANHA",
      periodoRealizado: "MANHA",
      alertaHorario: false,
      alertaFaccaoRival: false,
      alertaLimiteVisitas: false,
      numeroCasa: 1,
      visitasRealizadasMes: 0,
      limiteVisitasMensal: 2,
    },
  });

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

describe("API Visitantes - visitas", () => {
  it("lista visitas do visitante", async () => {
    mockedPrisma.visitante.findUnique.mockResolvedValue({ id: "vis-1" });
    mockedPrisma.visitaRegistro.findMany.mockResolvedValue([
      {
        id: "visita-1",
        visitanteId: "vis-1",
        adolescenteId: "ado-10",
        dataHoraEntrada: new Date("2025-11-06T12:00:00Z"),
        dataHoraSaida: null,
        adolescente: {
          id: "ado-10",
          nomeCompleto: "Lucas",
          nomeSocial: null,
        },
      },
    ]);

    const response = await GET_VISITAS(
      buildRequest("http://localhost/api/visitantes/vis-1/visitas"),
      { params: Promise.resolve({ id: "vis-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.visitas).toHaveLength(1);
    expect(json.visitas[0]).toMatchObject({
      id: "visita-1",
      emAberto: true,
    });
  });

  it("registra entrada de visita para visitante autorizado", async () => {
    mockedPrisma.visitante.findUnique.mockResolvedValue({
      id: "vis-1",
      nomeCompleto: "Maria",
    });
    mockedPrisma.adolescente.findUnique.mockResolvedValue({
      id: "22222222-2222-2222-2222-222222222222",
      nomeCompleto: "Joao",
    });
    mockedPrisma.adolescenteVisitanteLink.findFirst.mockResolvedValue({
      id: "link-1",
    });
    mockedPrisma.visitaRegistro.findFirst.mockResolvedValue(null);

    const visitaCriada = {
      id: "visita-1",
      visitanteId: "vis-1",
      adolescenteId: "22222222-2222-2222-2222-222222222222",
      dataHoraEntrada: new Date("2025-11-06T13:00:00Z"),
      dataHoraSaida: null,
      adolescente: {
        id: "ado-5",
        nomeCompleto: "Joao",
        nomeSocial: null,
      },
    };

    const tx = {
      visitaRegistro: {
        create: vi.fn().mockResolvedValue(visitaCriada),
      },
      logAuditoria: {
        create: vi.fn(),
      },
    };

    mockedPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        visitaRegistro: tx.visitaRegistro,
        logAuditoria: tx.logAuditoria,
      })
    );

    const response = await POST_VISITAS(
      buildRequest("http://localhost/api/visitantes/vis-1/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adolescenteId: "22222222-2222-2222-2222-222222222222",
        }),
      }),
      { params: Promise.resolve({ id: "vis-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.emAberto).toBe(true);
    expect(tx.visitaRegistro.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visitanteId: "vis-1",
          adolescenteId: "22222222-2222-2222-2222-222222222222",
        }),
      })
    );
    expect(tx.logAuditoria.create).toHaveBeenCalled();
  });

  it("encerra visita registrando data de saida", async () => {
    mockedPrisma.visitante.findUnique.mockResolvedValue({ id: "vis-1" });
    mockedPrisma.adolescente.findUnique.mockResolvedValue({
      id: "22222222-2222-2222-2222-222222222222",
    });

    const visitaAberta = {
      id: "visita-encerrar",
      visitanteId: "vis-1",
      adolescenteId: "22222222-2222-2222-2222-222222222222",
      dataHoraEntrada: new Date("2025-11-06T13:00:00Z"),
      dataHoraSaida: null,
      adolescente: {
        id: "22222222-2222-2222-2222-222222222222",
        nomeCompleto: "Joao",
        nomeSocial: null,
      },
    };

    mockedPrisma.visitaRegistro.findFirst.mockResolvedValue(visitaAberta);
    const visitaAtualizada = {
      ...visitaAberta,
      dataHoraSaida: new Date("2025-11-06T15:00:00Z"),
    };

    const tx = {
      visitaRegistro: {
        update: vi.fn().mockResolvedValue(visitaAtualizada),
      },
      logAuditoria: {
        create: vi.fn(),
      },
    };

    mockedPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        visitaRegistro: {
          update: tx.visitaRegistro.update,
        },
        logAuditoria: tx.logAuditoria,
      })
    );

    const response = await PATCH_VISITA(
      buildRequest(
        "http://localhost/api/visitantes/vis-1/visitas/visita-encerrar",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      ),
      { params: Promise.resolve({ id: "vis-1", visitaId: "visita-encerrar" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.emAberto).toBe(false);
    expect(json.dataHoraSaida).not.toBeNull();
    expect(tx.visitaRegistro.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "visita-encerrar" },
      })
    );
  });
});
