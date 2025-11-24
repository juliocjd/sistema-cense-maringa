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
  new NextRequest(new Request("http://localhost/api/analytics/conflitos"));

const createSnapshot = () => {
  const agora = new Date("2025-11-06T12:00:00Z");
  return {
    estatisticas: {
      total_alojamentos: 0,
      alojamentos_ocupados: 0,
      alojamentos_livres: 0,
      alojamentos_com_risco: 0,
      taxa_ocupacao: "0%",
    },
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
            numero: "07",
            ala: "A",
            status_manutencao: "OPERACIONAL",
            alojamento_frontal_id: null,
            localizacao_preferencial: false,
            cor_risco: "perigo",
            nivel_risco: 5,
            icones: [],
            alertas: [],
            avaliacao_risco: {
              nivel: 5,
              categoria: "CRITICO",
              rotulo: "",
              descricao: "",
              motivos: [],
              detalhes: [],
            },
            ocupante: {
              id: "ado-1",
              nome_completo: "Joao",
              nome_social: null,
              numero_sms: null,
              foto_url: null,
              status_unidade: "ATIVO",
              alerta_risco_suicidio: false,
              alerta_perfil_mapeado: false,
              alerta_saude_confidencial: false,
              bairro_origem_id: null,
              bairro_origem: null,
              faccao_grupo_id: null,
              faccao: null,
              conflitosA: [
                {
                  id: "conf-1",
                  tipo: "FACCAO",
                  status: "ATIVO",
                  origem: null,
                  criadoEm: new Date("2025-11-05T08:00:00Z"),
                  resolvidoEm: null,
                  adversario: { id: "ado-2", nome: "Enzo" },
                },
              ],
              conflitosB: [
                {
                  id: "conf-2",
                  tipo: "DISCIPLINA",
                  status: "RESOLVIDO",
                  origem: null,
                  criadoEm: new Date("2025-10-01T08:00:00Z"),
                  resolvidoEm: new Date("2025-10-04T08:00:00Z"),
                  adversario: { id: "ado-3", nome: "Lucas" },
                },
              ],
              conflitosResolvidos: [
                {
                  id: "conf-3",
                  tipo: null,
                  status: "RESOLVIDO",
                  origem: null,
                  criadoEm: new Date("2025-11-01T08:00:00Z"),
                  resolvidoEm: new Date("2025-11-03T08:00:00Z"),
                  adversario: null,
                },
              ],
            },
          },
          {
            id: "aloj-2",
            numero: "08",
            ala: "A",
            status_manutencao: "OPERACIONAL",
            alojamento_frontal_id: null,
            localizacao_preferencial: false,
            cor_risco: "seguro",
            nivel_risco: 1,
            icones: [],
            alertas: [],
            avaliacao_risco: {
              nivel: 1,
              categoria: "SEGURO",
              rotulo: "",
              descricao: "",
              motivos: [],
              detalhes: [],
            },
            ocupante: {
              id: "ado-4",
              nome_completo: "Pedro",
              nome_social: null,
              numero_sms: null,
              foto_url: null,
              status_unidade: "ATIVO",
              alerta_risco_suicidio: false,
              alerta_perfil_mapeado: false,
              alerta_saude_confidencial: false,
              bairro_origem_id: null,
              bairro_origem: null,
              faccao_grupo_id: null,
              faccao: null,
              conflitosA: [],
              conflitosB: [],
              conflitosResolvidos: [],
            },
          },
        ],
      },
    ],
  };
};

beforeEach(() => {
  mockedSnapshot.mockReset();
  mockedSnapshot.mockResolvedValue(createSnapshot());
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-11-06T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/analytics/conflitos", () => {
  it("agrega estatisticas a partir do snapshot", async () => {
    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.resumo.totalRegistros).toBe(3);
    expect(json.resumo.ativos).toBe(1);
    expect(json.resumo.resolvidosUltimos30Dias).toBe(1);
    expect(json.resumo.tempoMedioResolucaoDias).toBeGreaterThan(0);

    expect(json.porTipo).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: "FACCAO", ativos: 1 }),
        expect.objectContaining({ tipo: "DISCIPLINA", totalHistorico: 1 }),
      ])
    );

    expect(json.participantesRecorrentes[0]).toMatchObject({
      adolescente: { id: "ado-1", nome: "Joao" },
      totalConflitos: 3,
    });

    expect(json.conflitosRecentes[0]).toMatchObject({
      id: "conf-1",
      status: "ATIVO",
    });
  });

  it("retorna 500 quando ocorre erro", async () => {
    mockedSnapshot.mockRejectedValueOnce(new Error("DB error"));

    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.erro).toBe("Erro ao gerar analytics de conflitos");
  });
});
