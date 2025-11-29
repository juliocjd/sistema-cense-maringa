import { describe, it, expect } from "vitest";
import {
  construirMapaAlojamentos,
  avaliarVigilanciaFrontal,
} from "@/lib/alocacao/vigilancia-frontal";
import { simularAlocacao } from "@/lib/alocacao/simulador";
import type { CasaRisco } from "@/lib/riscos/calcular";

const criarAdolescenteRisco = (id: string) => ({
  id,
  nomeCompleto: `Adolescente ${id}`,
  bairroOrigemId: null,
  faccaoGrupoId: null,
  alertaRiscoSuicidio: false,
  alertaPerfilMapeado: false,
  alertaSaudeConfidencial: false,
  alertaSaudeDetalhes: null,
  conflitosA: [],
  conflitosB: [],
  faccao: null,
});

const criarCasaBasica = ({
  frontalOcupado,
}: {
  frontalOcupado: boolean;
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
        alojamentoFrontal: null,
        localizacaoPreferencial: false,
        corRisco: null,
        nivelRisco: null,
        icones: [],
        alertas: [],
        adolescentes: [],
      },
      {
        id: "aloj-frontal",
        casaId: "casa-1",
        numeroAlojamento: "10",
        ala: "B",
        statusManutencao: frontalOcupado ? "OCUPADO" : "LIVRE",
        alojamentoFrontalId: "aloj-alvo",
        alojamentoFrontal: null,
        localizacaoPreferencial: false,
        corRisco: null,
        nivelRisco: null,
        icones: [],
        alertas: [],
        adolescentes: frontalOcupado ? [criarAdolescenteRisco("sentinela")] : [],
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
  });
});

describe("simularAlocacao - vigilancia frontal para risco de suicidio", () => {
  const adolescenteBase = {
    id: "ado-1",
    nomeCompleto: "Fulano",
    bairroOrigemId: null,
    faccaoGrupoId: null,
    alertaRiscoSuicidio: true,
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
    expect(resultado.dados.permite_alocacao).toBe(false);
    expect(
      resultado.dados.alertas.some((alerta: any) =>
        alerta.mensagem.includes("Sem vigilancia frontal")
      )
    ).toBe(true);
    expect(
      resultado.dados.motivos.some((motivo: string) =>
        motivo.includes("Sem vigilancia frontal")
      )
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
    expect(resultado.dados.permite_alocacao).toBe(true);
    expect(
      resultado.dados.alertas.some((alerta: any) =>
        alerta.mensagem.includes("Sem vigilancia frontal")
      )
    ).toBe(false);
  });
});
