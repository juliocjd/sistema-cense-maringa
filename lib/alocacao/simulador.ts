import {
  calcularRiscoAlojamento,
  criarMapaSlots,
  type CasaRisco,
} from "@/lib/riscos/calcular";
import type { RiscoDetalhado, NivelRiscoBasico } from "@/lib/riscos/calcular";
import type { ConflitosExternosMapa } from "@/lib/riscos/calcular";
import { mapearAdolescenteParaRisco } from "./utils";
import {
  construirMapaAlojamentos,
  avaliarVigilanciaFrontal,
} from "@/lib/alocacao/vigilancia-frontal";
import { alertaSuicidioExigeMonitoramento } from "@/lib/alertas/especiais";

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
  ambiental: { ativo: boolean; nivel: number; motivos: string[] } | null,
  conflitoInfo: Map<string, { criadoEm?: string | null }>,
  alertaSuicidio?: { id?: string; criadoEm?: string | null }
) => {
  const alertas = detalhes.map((item) => ({
    tipo: item.tipo,
    nivel: item.nivel,
    mensagem: item.mensagem,
    proximidade: item.proximidade,
    conflitoId: item.referenciaConflitoId ?? undefined,
    conflitoCriadoEm: item.referenciaConflitoId
      ? conflitoInfo.get(item.referenciaConflitoId)?.criadoEm ?? null
      : null,
    alertaId: undefined as string | undefined,
    alertaCriadoEm: undefined as string | undefined,
  }));

  if (ambiental?.ativo) {
    ambiental.motivos.forEach((mensagem) => {
      alertas.push({
        tipo: "AMBIENTAL",
        nivel: (ambiental.nivel ?? 2) as NivelRiscoBasico,
        mensagem,
        proximidade: undefined,
        conflitoId: undefined,
        conflitoCriadoEm: null,
        alertaId:
          alertaSuicidio && /suicid/i.test(mensagem)
            ? alertaSuicidio.id
            : undefined,
        alertaCriadoEm:
          alertaSuicidio && /suicid/i.test(mensagem)
            ? alertaSuicidio.criadoEm ?? undefined
            : undefined,
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
  const mapaAlojamentos = construirMapaAlojamentos(casasClonadas);
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

  const exigeVigilancia = alertaSuicidioExigeMonitoramento(
    adolescenteSimulado.alertaRiscoSuicidio ?? false,
    adolescenteSimulado.alertaRiscoSuicidioNivel
  );
  const vigilanciaFrontal = exigeVigilancia
    ? avaliarVigilanciaFrontal(alojamentoAlvo, mapaAlojamentos)
    : { valido: true, avisos: [] };

  const conflitoInfo = new Map<string, { criadoEm?: string | null }>();
  (adolescente.conflitosA ?? []).forEach((c: any) =>
    conflitoInfo.set(c.id, { criadoEm: c.criadoEm ?? null })
  );
  (adolescente.conflitosB ?? []).forEach((c: any) =>
    conflitoInfo.set(c.id, { criadoEm: c.criadoEm ?? null })
  );
  const alertaSuicidio =
    (adolescente.alertasAtivos ?? []).find((a: any) =>
      typeof a.tipoAlerta === "string"
        ? a.tipoAlerta.toUpperCase().includes("SUICID")
        : false
    ) ?? null;

  const alertas = construirAlertas(
    resultado.detalhes,
    resultado.ambiental ?? null,
    conflitoInfo,
    alertaSuicidio
  );
  if (!vigilanciaFrontal.valido && vigilanciaFrontal.motivo) {
    const jaExiste = alertas.some(
      (alerta) => alerta.mensagem === vigilanciaFrontal.motivo
    );
    if (!jaExiste) {
      alertas.push({
        tipo: "AMBIENTAL",
        nivel: 2 as NivelRiscoBasico,
        mensagem: vigilanciaFrontal.motivo,
        proximidade: undefined,
        conflitoId: undefined,
        conflitoCriadoEm: null,
        alertaId: undefined,
        alertaCriadoEm: undefined,
      });
    }
  }
  vigilanciaFrontal.avisos?.forEach((aviso) => {
    const existe = alertas.some((alerta) => alerta.mensagem === aviso);
    if (!existe) {
      alertas.push({
        tipo: "AMBIENTAL",
        nivel: 2 as NivelRiscoBasico,
        mensagem: aviso,
        proximidade: undefined,
        conflitoId: undefined,
        conflitoCriadoEm: null,
        alertaId: undefined,
        alertaCriadoEm: undefined,
      });
    }
  });

  const motivosAtualizados = [...resultado.motivos];
  if (!vigilanciaFrontal.valido && vigilanciaFrontal.motivo) {
    if (!motivosAtualizados.includes(vigilanciaFrontal.motivo)) {
      motivosAtualizados.unshift(vigilanciaFrontal.motivo);
    }
  }
  vigilanciaFrontal.avisos?.forEach((aviso) => {
    if (!motivosAtualizados.includes(aviso)) {
      motivosAtualizados.push(aviso);
    }
  });

  const requerJustificativa = resultado.nivel >= 3;
  const permiteAlocacao = vigilanciaFrontal.valido && resultado.nivel < 5;

  return {
    status: 200,
    dados: {
      permite_alocacao: permiteAlocacao,
      requer_justificativa: requerJustificativa,
      nivel_risco: resultado.categoria,
      nivel_numerico: resultado.nivel,
      alertas,
      motivos: motivosAtualizados,
      alojamento: {
        id: alojamentoAlvo.id,
        numero: alojamentoAlvo.numeroAlojamento,
        ala: alojamentoAlvo.ala,
        casa: casaAlvo.nome ?? `Casa ${casaAlvo.numero}`,
      },
    },
  };
};
