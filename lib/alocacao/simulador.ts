import {
  calcularRiscoAlojamento,
  criarMapaSlots,
  type CasaRisco,
} from "@/lib/riscos/calcular";
import type { RiscoDetalhado, NivelRiscoBasico } from "@/lib/riscos/calcular";
import type { ConflitosExternosMapa } from "@/lib/riscos/calcular";
import { mapearAdolescenteParaRisco } from "./utils";

const mapearCasas = (casasDb: CasaRisco[]): CasaRisco[] =>
  casasDb.map((casa) => ({
    ...casa,
    alojamentos: casa.alojamentos.map((alojamento) => ({
      ...alojamento,
      adolescentes: [...alojamento.adolescentes],
    })),
  }));

const removerAdolescenteDasCasas = (
  casas: CasaRisco[],
  adolescenteId: string
) => {
  casas.forEach((casa) => {
    casa.alojamentos.forEach((aloj) => {
      if (aloj.adolescentes.some((a) => a.id === adolescenteId)) {
        aloj.adolescentes = aloj.adolescentes.filter(
          (a) => a.id !== adolescenteId
        );
      }
    });
  });
};

const construirAlertas = (
  detalhes: RiscoDetalhado[],
  ambiental?: { ativo: boolean; nivel: number; motivos: string[] } | null
) => {
  const alertas = detalhes.map((item) => ({
    tipo: item.tipo,
    nivel: item.nivel,
    mensagem: item.mensagem,
    proximidade: item.proximidade,
  }));

  if (ambiental?.ativo) {
    ambiental.motivos.forEach((mensagem) => {
      alertas.push({
        tipo: "AMBIENTAL",
        nivel: (ambiental.nivel ?? 2) as NivelRiscoBasico,
        mensagem,
        proximidade: undefined,
      });
    });
  }

  return alertas;
};

type SimulacaoParams = {
  adolescente: any;
  alojamentoId: string;
  casasBase: CasaRisco[];
  conflitosExternos: ConflitosExternosMapa;
};

export const simularAlocacao = ({
  adolescente,
  alojamentoId,
  casasBase,
  conflitosExternos,
}: SimulacaoParams) => {
  const casasClonadas = mapearCasas(casasBase);
  removerAdolescenteDasCasas(casasClonadas, adolescente.id);

  const casaAlvo = casasClonadas.find((casa) =>
    casa.alojamentos.some((aloj) => aloj.id === alojamentoId)
  );

  if (!casaAlvo) {
    return { erro: "Alojamento não encontrado", status: 404 };
  }

  const alojamentoAlvo = casaAlvo.alojamentos.find(
    (aloj) => aloj.id === alojamentoId
  );

  if (!alojamentoAlvo) {
    return { erro: "Alojamento não encontrado", status: 404 };
  }

  const adolescenteSimulado = mapearAdolescenteParaRisco(adolescente);

  alojamentoAlvo.adolescentes = [adolescenteSimulado as any];

  const statusOriginal = alojamentoAlvo.statusManutencao;
  if (alojamentoAlvo.statusManutencao === "INTERDITADO") {
    alojamentoAlvo.statusManutencao = "LIVRE";
  }

  const mapaSlots = criarMapaSlots(casasClonadas);

  const resultado = calcularRiscoAlojamento({
    alojamento: alojamentoAlvo,
    casaAtual: casaAlvo,
    casas: casasClonadas,
    slots: mapaSlots,
    conflitosExternos,
  });

  alojamentoAlvo.statusManutencao = statusOriginal;

  const alertas = construirAlertas(resultado.detalhes, resultado.ambiental);
  const requerJustificativa = resultado.nivel >= 3;
  const permiteAlocacao = resultado.nivel < 5;

  return {
    status: 200,
    dados: {
      permite_alocacao: permiteAlocacao,
      requer_justificativa: requerJustificativa,
      nivel_risco: resultado.categoria,
      nivel_numerico: resultado.nivel,
      alertas,
      motivos: resultado.motivos,
      alojamento: {
        id: alojamentoAlvo.id,
        numero: alojamentoAlvo.numeroAlojamento,
        ala: alojamentoAlvo.ala,
        casa: casaAlvo.nome ?? `Casa ${casaAlvo.numero}`,
      },
    },
  };
};
