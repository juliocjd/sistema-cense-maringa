import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/search/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => {
  const adolescente = {
    findMany: vi.fn(),
  };
  const comunicadoInterno = {
    findMany: vi.fn(),
  };

  return {
    prisma: {
      adolescente,
      comunicadoInterno,
    },
  };
});

const mockedPrisma = prisma as unknown as {
  adolescente: {
    findMany: ReturnType<typeof vi.fn>;
  };
  comunicadoInterno: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  mockedPrisma.adolescente.findMany.mockReset();
  mockedPrisma.comunicadoInterno.findMany.mockReset();
});

describe("GET /api/search", () => {
  it("encontra adolescente sem considerar acentos e retorna foto", async () => {
    mockedPrisma.adolescente.findMany.mockResolvedValue([
      {
        id: "ado-1",
        nomeCompleto: "Kauã Silva",
        nomeSocial: null,
        fotoUrl: "https://exemplo.test/kaua.jpg",
        numeroSms: "123",
        numeroInterno: 12,
        statusUnidade: "ATIVO",
        casosInfracionais: [{ numeroProcesso: "PROC-1" }],
        alojamentoAtual: {
          numeroAlojamento: "02",
          ala: "A",
          casa: { nome: "Casa 1" },
        },
      },
      {
        id: "ado-2",
        nomeCompleto: "Joao",
        nomeSocial: null,
        fotoUrl: null,
        numeroSms: "456",
        numeroInterno: 13,
        statusUnidade: "ATIVO",
        casosInfracionais: [],
        alojamentoAtual: null,
      },
    ]);
    mockedPrisma.comunicadoInterno.findMany.mockResolvedValue([]);

    const request = new NextRequest(
      new Request("http://localhost/api/search?q=Kaua", {
        method: "GET",
      }),
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.resultados.adolescentes).toEqual([
      expect.objectContaining({
        id: "ado-1",
        nome: "Kauã Silva",
        fotoUrl: "https://exemplo.test/kaua.jpg",
      }),
    ]);
  });
});
