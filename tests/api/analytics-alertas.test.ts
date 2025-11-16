import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/analytics/alertas/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => {
  const alertaAtivo = {
    groupBy: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  };
  return {
    prisma: {
      alertaAtivo,
    },
  };
});

const mockedPrisma = prisma as unknown as {
  alertaAtivo: {
    groupBy: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const buildRequest = () =>
  new NextRequest(new Request("http://localhost/api/analytics/alertas"));

beforeEach(() => {
  mockedPrisma.alertaAtivo.groupBy.mockReset();
  mockedPrisma.alertaAtivo.findMany.mockReset();
  mockedPrisma.alertaAtivo.count.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-11-06T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/analytics/alertas", () => {
  it("retorna resumo e detalhamento dos alertas", async () => {
    mockedPrisma.alertaAtivo.groupBy
      .mockResolvedValueOnce([
        { nivelRisco: "CRITICO", _count: { _all: 2 } },
        { nivelRisco: "ALTO", _count: { _all: 3 } },
        { nivelRisco: null, _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        { tipoAlerta: "Risco Suicídio", _count: { _all: 3 } },
        { tipoAlerta: "Alerta Saúde", _count: { _all: 2 } },
      ]);

    mockedPrisma.alertaAtivo.findMany.mockResolvedValue([
      {
        id: "alerta-1",
        tipoAlerta: "Risco Suicídio",
        nivelRisco: "CRITICO",
        descricaoAlerta: "Monitoramento constante",
        criadoEm: new Date("2025-11-05T10:00:00Z"),
        adolescente: {
          id: "ado-1",
          nomeCompleto: "Joao da Silva",
          alojamentoAtual: {
            id: "aloj-1",
            numero: "05",
            ala: "B",
            casa: { nome: "Casa 01" },
          },
        },
      },
      {
        id: "alerta-2",
        tipoAlerta: null,
        nivelRisco: null,
        descricaoAlerta: "Observacao adicional",
        criadoEm: new Date("2025-11-04T10:00:00Z"),
        adolescente: null,
      },
    ]);

    mockedPrisma.alertaAtivo.count
      .mockResolvedValueOnce(4) // novosUltimos7Dias
      .mockResolvedValueOnce(2); // encerradosUltimos30Dias

    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.resumo.totalAtivos).toBe(6);
    expect(json.resumo.ativosCriticos).toBe(2);
    expect(json.resumo.ativosPorNivel).toMatchObject({
      CRITICO: 2,
      ALTO: 3,
      NAO_CLASSIFICADO: 1,
    });
    expect(json.resumo.novosUltimos7Dias).toBe(4);
    expect(json.resumo.encerradosUltimos30Dias).toBe(2);
    expect(json.porTipo).toHaveLength(2);
    expect(json.porTipo[0]).toMatchObject({
      tipo: "Risco Suicídio",
      ativos: 3,
      percentual: 50,
    });
    expect(json.alertasRecentes[0]).toMatchObject({
      id: "alerta-1",
      tipo: "Risco Suicídio",
      nivel: "CRITICO",
      diasAtivo: 1,
      adolescente: {
        id: "ado-1",
        nome: "Joao da Silva",
        alojamento: {
          id: "aloj-1",
          rotulo: "Casa 01 - 05 - B",
        },
      },
    });
    expect(json.alertasRecentes[1].adolescente).toBeNull();
  });


  it("retorna 500 quando ocorre erro", async () => {
    mockedPrisma.alertaAtivo.groupBy.mockRejectedValueOnce(
      new Error("DB error")
    );

    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.erro).toBe("Erro ao gerar analytics de alertas");
  });
});
