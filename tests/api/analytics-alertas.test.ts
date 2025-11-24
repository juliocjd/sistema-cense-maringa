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
  new NextRequest(new Request("http://localhost/api/analytics/alertas"));

const createSnapshot = () => {
  const agora = new Date("2025-11-06T12:00:00Z");
  const ativoRecente = new Date("2025-11-05T10:00:00Z");
  const resolvidoRecente = new Date("2025-11-01T12:00:00Z");

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
        score_tensao: 5,
        alojamentos: [
          {
            id: "aloj-critico",
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
              rotulo: "Nivel 5 - Critico",
              descricao: "Risco frontal",
              motivos: ["Conflito frontal"],
              detalhes: [
                {
                  tipo: "CONFLITO_EXTERNO",
                  mensagem: "Rival frente",
                  nivel: 5,
                },
              ],
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
                  id: "conf-critico",
                  tipo: "CONFLITO_EXTERNO",
                  status: "ATIVO",
                  origem: null,
                  criadoEm: ativoRecente,
                  resolvidoEm: null,
                  adversario: {
                    id: "ado-2",
                    nomeCompleto: "Enzo",
                    numeroSms: null,
                    alojamento: null,
                  },
                },
              ],
              conflitosB: [],
              conflitosResolvidos: [
                {
                  id: "conf-resolvido",
                  tipo: "CONFLITO_INTERNO",
                  status: "RESOLVIDO",
                  origem: null,
                  criadoEm: new Date("2025-10-25T12:00:00Z"),
                  resolvidoEm: resolvidoRecente,
                  adversario: null,
                },
              ],
            },
          },
          {
            id: "aloj-medio",
            numero: "05",
            ala: "B",
            status_manutencao: "OPERACIONAL",
            alojamento_frontal_id: null,
            localizacao_preferencial: false,
            cor_risco: "atencao",
            nivel_risco: 3,
            icones: [],
            alertas: [],
            avaliacao_risco: {
              nivel: 3,
              categoria: "ATENCAO",
              rotulo: "Nivel 3 - Atencao",
              descricao: "Aliado proximo",
              motivos: ["Aliado de rival"],
              detalhes: [
                {
                  tipo: "ALIADO",
                  mensagem: "Aliado proximo",
                  nivel: 3,
                },
              ],
            },
            ocupante: {
              id: "ado-3",
              nome_completo: "Lucas",
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
          {
            id: "aloj-seguro",
            numero: "03",
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
              rotulo: "Nivel 1 - Seguro",
              descricao: "Sem riscos",
              motivos: [],
              detalhes: [],
            },
            ocupante: null,
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

describe("GET /api/analytics/alertas", () => {
  it("agrega dados de risco a partir do snapshot", async () => {
    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.resumo.totalAtivos).toBe(2);
    expect(json.resumo.ativosCriticos).toBe(1);
    expect(json.resumo.ativosPorNivel).toMatchObject({
      CRITICO: 1,
      MEDIO: 1,
    });
    expect(json.resumo.novosUltimos7Dias).toBe(1);
    expect(json.resumo.encerradosUltimos30Dias).toBe(1);

    expect(json.porTipo).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: "Conflito externo", ativos: 1 }),
        expect.objectContaining({ tipo: "Alerta aliado", ativos: 1 }),
      ])
    );

    expect(json.alertasRecentes).toHaveLength(2);
    expect(json.alertasRecentes[0]).toMatchObject({
      tipo: "Conflito externo",
      nivel: "CRITICO",
      adolescente: {
        id: "ado-1",
        nome: "Joao",
      },
    });
  });

  it("retorna 500 quando ocorre erro", async () => {
    mockedSnapshot.mockRejectedValueOnce(new Error("DB error"));

    const response = await GET(buildRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.erro).toBe("Erro ao gerar analytics de alertas");
  });
});
