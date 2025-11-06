import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/analytics/ocupacao/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => {
  const casa = { findMany: vi.fn() };
  return { prisma: { casa } };
});

const mockedPrisma = prisma as unknown as {
  casa: { findMany: ReturnType<typeof vi.fn> };
};

const buildRequest = () =>
  new NextRequest(new Request("http://localhost/api/analytics/ocupacao"));

beforeEach(() => {
  mockedPrisma.casa.findMany.mockReset();
});

describe("GET /api/analytics/ocupacao", () => {
  it("retorna resumo e dados por casa", async () => {
    mockedPrisma.casa.findMany.mockResolvedValue([
      {
        id: "casa-1",
        nome: "Casa 01",
        numero: 1,
        alojamentos: [
          {
            id: "aloj-1",
            statusManutencao: "LIVRE",
            adolescentes: [{ id: "ado-1" }],
          },
          {
            id: "aloj-2",
            statusManutencao: "LIVRE",
            adolescentes: [],
          },
        ],
      },
      {
        id: "casa-2",
        nome: "Casa 02",
        numero: 2,
        alojamentos: [
          {
            id: "aloj-3",
            statusManutencao: "INTERDITADO",
            adolescentes: [],
          },
        ],
      },
    ]);

    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.resumo.totalCasas).toBe(2);
    expect(json.resumo.totalAlojamentos).toBe(3);
    expect(json.resumo.alojamentosOcupados).toBe(1);
    expect(json.resumo.alojamentosInterditados).toBe(1);
    expect(json.porCasa).toHaveLength(2);
    expect(json.porCasa[0]).toMatchObject({
      casaId: "casa-1",
      alojamentosOcupados: 1,
      alojamentosLivres: 1,
      alojamentosInterditados: 0,
      taxaOcupacaoPercentual: 50,
    });
  });

  it("retorna 500 quando ocorre erro", async () => {
    mockedPrisma.casa.findMany.mockRejectedValue(new Error("DB error"));

    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.erro).toBe("Erro ao gerar analytics de ocupacao");
  });
});
