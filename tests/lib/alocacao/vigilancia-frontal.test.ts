import { describe, it, expect } from "vitest";
import {
  construirMapaAlojamentos,
  avaliarVigilanciaFrontal,
} from "@/lib/alocacao/vigilancia-frontal";
import { simularAlocacao } from "@/lib/alocacao/simulador";
import type { CasaRisco } from "@/lib/riscos/calcular";

const criarAdolescenteRisco = (
  id: string,
  opts?: { suicidio?: boolean; nivel?: string | null },
) => ({
  id,
  nomeCompleto: `Adolescente ${id}`,
  bairroOrigemId: null,
  faccaoGrupoId: null,
  alertaRiscoSuicidio: opts?.suicidio ?? false,
  alertaRiscoSuicidioNivel: opts?.nivel ?? null,
  alertaPerfilMapeado: false,
  alertaSaudeConfidencial: false,
  alertaSaudeDetalhes: null,
  conflitosA: [],
  conflitosB: [],
  faccao: null,
});

const criarCasaBasica = ({
  frontalOcupado,
  sentinelaSuicida = false,
  sentinelaNivel = "ALTO",
}: {
  frontalOcupado: boolean;
  sentinelaSuicida?: boolean;
  sentinelaNivel?: string;
}): CasaRisco[] => [
  {
    id: "casa-1",
    nome: "Casa 01",
    numero: 1,
    isolada: false,
    alojamentos: [
      {
        id: "aloj-alvo",
        casaId: "casa-1",
        numeroAlojamento: "07",
        ala: "A",
        statusManutencao: "LIVRE",
        alojamentoFrontalId: "aloj-frontal",
        localizacaoPreferencial: false,
        corRisco: undefined,
        nivelRisco: undefined,
        icones: [],
        alertas: [],
        adolescentes: [],
      },
      {
        id: "aloj-frontal",
        casaId: "casa-1",
        numeroAlojamento: "10",
        ala: "B",
        statusManutencao: "LIVRE",
        alojamentoFrontalId: "aloj-alvo",
        localizacaoPreferencial: false,
        corRisco: undefined,
        nivelRisco: undefined,
        icones: [],
        alertas: [],
        adolescentes: frontalOcupado
          ? [
              criarAdolescenteRisco("sentinela", {
                suicidio: sentinelaSuicida,
                nivel: sentinelaNivel,
              }),
            ]
          : [],
      },
    ],
  },
];

describe("avaliarVigilanciaFrontal", () => {
  it("detecta alojamento frontal vazio", () => {
    const casas = criarCasaBasica({ frontalOcupado: false });
    const mapa = construirMapaAlojamentos(casas);
    const alvo = casas[0].alojamentos[0];

    const resultado = avaliarVigilanciaFrontal(alvo, mapa);
    expect(resultado.valido).toBe(false);
    expect(resultado.motivo).toContain("Sem vigilancia frontal");
  });

  it("considera valido quando frontal ocupado", () => {
    const casas = criarCasaBasica({ frontalOcupado: true });
    const mapa = construirMapaAlojamentos(casas);
    const alvo = casas[0].alojamentos[0];

    const resultado = avaliarVigilanciaFrontal(alvo, mapa);
    expect(resultado.valido).toBe(true);
    expect(resultado.motivo).toBeUndefined();
    expect(resultado.localFrontal).toContain("Casa 01");
    expect(resultado.avisos).toBeUndefined();
  });

  it("emite aviso quando frontal tambem possui alerta de suicidio", () => {
    const casas = criarCasaBasica({
      frontalOcupado: true,
      sentinelaSuicida: true,
    });
    const mapa = construirMapaAlojamentos(casas);
    const alvo = casas[0].alojamentos[0];

    const resultado = avaliarVigilanciaFrontal(alvo, mapa);
    expect(resultado.valido).toBe(true);
    expect(resultado.avisos).toBeTruthy();
    expect(resultado.avisos?.[0]).toContain("alerta de risco de suicídio");
  });
});

describe("simularAlocacao - vigilancia frontal para risco de suicídio", () => {
  const adolescenteBase = {
    id: "ado-1",
    nomeCompleto: "Fulano",
    bairroOrigemId: null,
    faccaoGrupoId: null,
    alertaRiscoSuicidio: true,
    alertaRiscoSuicidioNivel: "ALTO",
    alertaPerfilMapeado: false,
    alertaSaudeConfidencial: false,
    alertaSaudeDetalhes: null,
    conflitosA: [],
    conflitosB: [],
    faccao: null,
  };

  it("bloqueia alocacao quando nao ha vigilancia frontal", () => {
    const casas = criarCasaBasica({ frontalOcupado: false });
    const resultado = simularAlocacao({
      adolescente: adolescenteBase,
      alojamentoId: "aloj-alvo",
      casasBase: casas,
      conflitosExternos: {},
    });

    expect(resultado.status).toBe(200);
    const dados = resultado.dados!;
    expect(dados.permite_alocacao).toBe(false);
    expect(
      dados.alertas.some((alerta: any) =>
        alerta.mensagem.includes("Sem vigilancia frontal"),
      ),
    ).toBe(true);
    expect(
      dados.motivos.some((motivo: string) =>
        motivo.includes("Sem vigilancia frontal"),
      ),
    ).toBe(true);
  });

  it("permite alocacao quando frontal ocupado", () => {
    const casas = criarCasaBasica({ frontalOcupado: true });
    const resultado = simularAlocacao({
      adolescente: adolescenteBase,
      alojamentoId: "aloj-alvo",
      casasBase: casas,
      conflitosExternos: {},
    });

    expect(resultado.status).toBe(200);
    const dados = resultado.dados!;
    expect(dados.permite_alocacao).toBe(true);
    expect(
      dados.alertas.some((alerta: any) =>
        alerta.mensagem.includes("Sem vigilancia frontal"),
      ),
    ).toBe(false);
  });

  it("mantem alerta mas nao bloqueia quando frontal tambem tem suicidio", () => {
    const casas = criarCasaBasica({
      frontalOcupado: true,
      sentinelaSuicida: true,
      sentinelaNivel: "ALTO",
    });
    const resultado = simularAlocacao({
      adolescente: adolescenteBase,
      alojamentoId: "aloj-alvo",
      casasBase: casas,
      conflitosExternos: {},
    });

    const dados = resultado.dados!;
    expect(dados.permite_alocacao).toBe(true);
    expect(
      dados.alertas.some((alerta: any) =>
        alerta.mensagem.includes("tambem possui alerta de risco de suicídio"),
      ),
    ).toBe(true);
  });

  it("nao exige vigilancia frontal quando nivel do alerta for baixo", () => {
    const casas = criarCasaBasica({ frontalOcupado: false });
    const resultado = simularAlocacao({
      adolescente: { ...adolescenteBase, alertaRiscoSuicidioNivel: "BAIXO" },
      alojamentoId: "aloj-alvo",
      casasBase: casas,
      conflitosExternos: {},
    });

    const dados = resultado.dados!;
    expect(dados.permite_alocacao).toBe(true);
    expect(
      dados.alertas.some((alerta: any) =>
        alerta.mensagem.includes("Sem vigilancia frontal"),
      ),
    ).toBe(false);
  });
});
