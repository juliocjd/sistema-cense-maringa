import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/analytics/conflitos/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => {
  const conflito = {
    findMany: vi.fn(),
  };
  return {
    prisma: {
      conflito,
    },
  };
});

const mockedPrisma = prisma as unknown as {
  conflito: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const buildRequest = () =>
  new NextRequest(new Request("http://localhost/api/analytics/conflitos"));

beforeEach(() => {
  mockedPrisma.conflito.findMany.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-11-06T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/analytics/conflitos", () => {
  it("retorna analytics consolidadas de conflitos", async () => {
    mockedPrisma.conflito.findMany.mockResolvedValue([
      {
        id: "conf-1",
        tipoConflito: "Facção",
        status: "ATIVO",
        criadoEm: new Date("2025-11-05T08:00:00Z"),
        resolvidoEm: null,
        descricao: "Rivalidade direta",
        adolescenteA: { id: "ado-1", nomeCompleto: "João" },
        adolescenteB: { id: "ado-2", nomeCompleto: "Enzo" },
      },
      {
        id: "conf-2",
        tipoConflito: "Disciplina",
        status: "RESOLVIDO",
        criadoEm: new Date("2025-10-01T08:00:00Z"),
        resolvidoEm: new Date("2025-10-04T08:00:00Z"),
        descricao: null,
        adolescenteA: { id: "ado-1", nomeCompleto: "João" },
        adolescenteB: { id: "ado-3", nomeCompleto: "Lucas" },
      },
      {
        id: "conf-3",
        tipoConflito: null,
        status: "RESOLVIDO",
        criadoEm: new Date("2025-11-01T08:00:00Z"),
        resolvidoEm: new Date("2025-11-03T08:00:00Z"),
        descricao: "Briga leve",
        adolescenteA: { id: "ado-4", nomeCompleto: "Pedro" },
        adolescenteB: null,
      },
    ]);

    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.resumo.totalRegistros).toBe(3);
    expect(json.resumo.ativos).toBe(1);
    expect(json.resumo.resolvidosUltimos30Dias).toBe(1);
    expect(json.resumo.tempoMedioResolucaoDias).toBeCloseTo(2.5, 1);
    expect(json.porTipo).toHaveLength(3);
    expect(json.porTipo[0]).toMatchObject({
      tipo: "Facção",
      ativos: 1,
      totalHistorico: 1,
      percentualAtivos: 100,
    });
    expect(json.participantesRecorrentes[0]).toMatchObject({
      adolescente: { id: "ado-1", nome: "João" },
      totalConflitos: 2,
      conflitosAtivos: 1,
    });
    expect(json.conflitosRecentes[0]).toMatchObject({
      id: "conf-1",
      tipo: "Facção",
      status: "ATIVO",
      diasAtivo: 1,
    });
  });

  it("retorna 500 quando ocorre erro", async () => {
    mockedPrisma.conflito.findMany.mockRejectedValueOnce(
      new Error("DB error")
    );

    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.erro).toBe("Erro ao gerar analytics de conflitos");
  });
});
