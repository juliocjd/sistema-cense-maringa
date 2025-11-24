import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/analytics/ocupacao/route";
import { getEstruturaSnapshot } from "@/lib/estrutura/snapshot";

vi.mock("@/lib/estrutura/snapshot", () => {
  return {
    getEstruturaSnapshot: vi.fn(),
  };
});

const mockedSnapshot = getEstruturaSnapshot as unknown as ReturnType<
  typeof vi.fn
>;

const buildRequest = () =>
  new NextRequest(new Request("http://localhost/api/analytics/ocupacao"));

beforeEach(() => {
  mockedSnapshot.mockReset();
});

describe("GET /api/analytics/ocupacao", () => {
  it("retorna resumo e dados por casa", async () => {
    mockedSnapshot.mockResolvedValue({
      casas: [
        {
          id: "casa-1",
          nome: "Casa 01",
          numero: 1,
          isolada: false,
          score_tensao: 0,
          alojamentos: [
            {
              id: "aloj-1",
              numero: "01",
              ala: "A",
              status_manutencao: "LIVRE",
              alojamento_frontal_id: null,
              localizacao_preferencial: false,
              cor_risco: "perigo",
              nivel_risco: 5,
              icones: [],
              alertas: [],
              ocupante: { id: "ado-1" },
            },
            {
              id: "aloj-2",
              numero: "02",
              ala: "A",
              status_manutencao: "LIVRE",
              alojamento_frontal_id: null,
              localizacao_preferencial: false,
              cor_risco: "livre",
              nivel_risco: 0,
              icones: [],
              alertas: [],
              ocupante: null,
            },
          ],
        },
        {
          id: "casa-2",
          nome: "Casa 02",
          numero: 2,
          isolada: false,
          score_tensao: 0,
          alojamentos: [
            {
              id: "aloj-3",
              numero: "03",
              ala: "B",
              status_manutencao: "INTERDITADO",
              alojamento_frontal_id: null,
              localizacao_preferencial: false,
              cor_risco: "interditado",
              nivel_risco: 0,
              icones: [],
              alertas: [],
              ocupante: null,
            },
          ],
        },
      ],
      estatisticas: {
        total_alojamentos: 0,
        alojamentos_ocupados: 0,
        alojamentos_livres: 0,
        alojamentos_com_risco: 0,
        taxa_ocupacao: "0%",
      },
    });

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
    mockedSnapshot.mockRejectedValue(new Error("DB error"));

    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.erro).toBe("Erro ao gerar analytics de ocupacao");
  });
});
