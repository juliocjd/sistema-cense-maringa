import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { TIPO_CI_MAP } from "@/lib/comunicados/tipos";
import {
  TIPO_PROTOCOLO_ALTA,
  TIPO_PROTOCOLO_ATIVADO,
} from "@/lib/alertas/protocolo-risco-suicidio";

const NIVEL_ORDEM = ["BAIXO", "MEDIO", "ALTO", "CRITICO"] as const;

const ALERTA_TIPO_CONFIG: Record<
  string,
  { minimo?: (typeof NIVEL_ORDEM)[number] | null }
> = {
  DISCIPLINAR: { minimo: "ALTO" },
  CONFLITO: { minimo: null },
  FUGA: { minimo: "BAIXO" },
  AMEACA_SERVIDOR: { minimo: "MEDIO" },
  AGRESSAO: { minimo: "MEDIO" },
};

const normalizarNivel = (valor?: string | null) => {
  if (!valor) return null;
  const ajustado = valor.toUpperCase();
  return NIVEL_ORDEM.includes(ajustado as (typeof NIVEL_ORDEM)[number])
    ? (ajustado as (typeof NIVEL_ORDEM)[number])
    : null;
};

const atendeNivelMinimo = (
  valor?: string | null,
  minimo?: (typeof NIVEL_ORDEM)[number] | null
) => {
  if (!minimo) return true;
  const nivel = normalizarNivel(valor);
  if (!nivel) return false;
  return NIVEL_ORDEM.indexOf(nivel) >= NIVEL_ORDEM.indexOf(minimo);
};

const formatarDataIso = (valor?: Date | null) =>
  valor ? valor.toISOString() : null;

const formatarAlojamento = (
  registro?:
    | {
        numeroAlojamento: string | null;
        ala: string | null;
        casa?: { nome: string | null; numero: number | null } | null;
      }
    | null
) => {
  if (!registro) return null;
  const partes: string[] = [];
  if (registro.casa?.nome) {
    partes.push(registro.casa.nome);
  } else if (typeof registro.casa?.numero === "number") {
    partes.push(`Casa ${registro.casa.numero}`);
  }
  if (registro.numeroAlojamento) {
    partes.push(`Aloj. ${registro.numeroAlojamento}`);
  }
  if (registro.ala) {
    partes.push(`Ala ${registro.ala}`);
  }
  return partes.join(" - ") || null;
};

const inferirLadoCasaOito = (numero?: string | null, ala?: string | null) => {
  if (ala) return `Ala ${ala}`;
  if (!numero) return null;
  const apenasNumero = parseInt(numero.replace(/\D/g, ""), 10);
  if (Number.isNaN(apenasNumero)) return null;
  return apenasNumero >= 5 ? "Lado B (5-8)" : "Lado A (1-4)";
};

const SELETOR_CONFLITO_ADOLESCENTE = {
  id: true,
  nomeCompleto: true,
  statusUnidade: true,
  faccao: {
    select: {
      id: true,
      nomeFaccao: true,
    },
  },
  alojamentoAtual: {
    select: {
      numeroAlojamento: true,
      ala: true,
      casa: {
        select: {
          nome: true,
          numero: true,
        },
      },
    },
  },
} as const;

const SELETOR_CONFLITO = {
  id: true,
  status: true,
  tipoConflito: true,
  descricao: true,
  criadoEm: true,
  resolvidoEm: true,
  adolescenteAId: true,
  adolescenteBId: true,
  adolescenteA: {
    select: SELETOR_CONFLITO_ADOLESCENTE,
  },
  adolescenteB: {
    select: SELETOR_CONFLITO_ADOLESCENTE,
  },
} as const;

type ConflitoSelecionado = Prisma.ConflitoGetPayload<{
  select: typeof SELETOR_CONFLITO;
}>;

const mapConflito = (
  conflito: ConflitoSelecionado,
  adolescenteId: string
) => {
  const lado = conflito.adolescenteAId === adolescenteId ? "LADO_1" : "LADO_2";
  const adversario =
    lado === "LADO_1" ? conflito.adolescenteB : conflito.adolescenteA;
  return {
    id: conflito.id,
    status: conflito.status ?? "DESCONHECIDO",
    tipo: conflito.tipoConflito ?? null,
    descricao: conflito.descricao ?? null,
    criadoEm: formatarDataIso(conflito.criadoEm),
    resolvidoEm: formatarDataIso(conflito.resolvidoEm),
    lado,
    adversario: adversario
      ? {
          id: adversario.id,
          nome: adversario.nomeCompleto,
          status: adversario.statusUnidade ?? null,
          faccao: adversario.faccao?.nomeFaccao ?? null,
          alojamento: formatarAlojamento(adversario.alojamentoAtual),
        }
      : null,
  };
};

type AnalisarAlertasResultado = {
  relevantesAtivos: Array<{
    id: string;
    tipo: string | null;
    tipoLabel: string;
    descricao: string;
    nivel: (typeof NIVEL_ORDEM)[number] | null;
    criadoEm: string;
    encerradoEm: string | null;
  }>;
  relevantesHistorico: Array<{
    id: string;
    tipo: string | null;
    tipoLabel: string;
    descricao: string;
    nivel: (typeof NIVEL_ORDEM)[number] | null;
    criadoEm: string;
    encerradoEm: string | null;
  }>;
  fuga: Array<{
    id: string;
    ativo: boolean;
    criadoEm: string;
    encerradoEm: string | null;
    descricao: string;
    nivel: (typeof NIVEL_ORDEM)[number] | null;
  }>;
};

const analisarAlertas = (
  alertas: Prisma.AlertaAtivoGetPayload<{
    select: {
      id: true;
      tipoAlerta: true;
      descricaoAlerta: true;
      nivelRisco: true;
      criadoEm: true;
      desativadoEm: true;
    };
  }>[]
): AnalisarAlertasResultado => {
  const ativos: AnalisarAlertasResultado["relevantesAtivos"] = [];
  const historico: AnalisarAlertasResultado["relevantesHistorico"] = [];
  const fuga: AnalisarAlertasResultado["fuga"] = [];

  alertas.forEach((alerta) => {
    const tipo = alerta.tipoAlerta ?? null;
    const nivel = normalizarNivel(alerta.nivelRisco);
    const base = {
      id: alerta.id,
      tipo,
      tipoLabel: tipo ? TIPO_CI_MAP.get(tipo) ?? tipo : "Nao informado",
      descricao: alerta.descricaoAlerta,
      nivel,
      criadoEm: formatarDataIso(alerta.criadoEm) ?? "",
      encerradoEm: formatarDataIso(alerta.desativadoEm),
    };
    const ehFuga = tipo === "FUGA";
    const ativo = !alerta.desativadoEm;

    if (ehFuga) {
      fuga.push({
        id: alerta.id,
        ativo,
        criadoEm: base.criadoEm,
        encerradoEm: base.encerradoEm,
        descricao: alerta.descricaoAlerta,
        nivel,
      });
    }

    if (!tipo) {
      return;
    }

    const config = ALERTA_TIPO_CONFIG[tipo];
    if (!config) {
      return;
    }

    if (!atendeNivelMinimo(alerta.nivelRisco, config.minimo)) {
      return;
    }

    if (ativo) {
      ativos.push(base);
    } else {
      historico.push(base);
    }
  });

  return { relevantesAtivos: ativos, relevantesHistorico: historico, fuga };
};

export type RelatorioFase3 = Awaited<
  ReturnType<typeof carregarRelatorioFase3>
>;

export async function carregarRelatorioFase3(adolescenteId: string) {
  const adolescente = await prisma.adolescente.findUnique({
    where: { id: adolescenteId },
    select: {
      id: true,
      nomeCompleto: true,
      numeroSms: true,
      statusUnidade: true,
      riscoFuga: true,
      faseInternacaoAtual: {
        select: {
          nomeFase: true,
        },
      },
      faccao: {
        select: {
          nomeFaccao: true,
        },
      },
      alojamentoAtual: {
        select: {
          numeroAlojamento: true,
          ala: true,
          casa: {
            select: {
              nome: true,
              numero: true,
            },
          },
        },
      },
    },
  });

  if (!adolescente) {
    return null;
  }

  const [conflitos, alertas, casaOito, riscoFugaRegistro, suicidioEventos] =
    await Promise.all([
      prisma.conflito.findMany({
        where: {
          OR: [
            { adolescenteAId: adolescenteId },
            { adolescenteBId: adolescenteId },
        ],
      },
      orderBy: { criadoEm: "desc" },
      select: SELETOR_CONFLITO,
    }),
    prisma.alertaAtivo.findMany({
      where: { adolescenteId },
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        tipoAlerta: true,
        descricaoAlerta: true,
        nivelRisco: true,
        criadoEm: true,
        desativadoEm: true,
      },
    }),
    prisma.casa.findFirst({
      where: { numero: 8 },
      select: {
        id: true,
        nome: true,
        alojamentos: {
          orderBy: { numeroAlojamento: "asc" },
          select: {
            id: true,
            numeroAlojamento: true,
            ala: true,
            adolescentes: {
              where: { statusUnidade: "ATIVO" },
              select: {
                id: true,
                nomeCompleto: true,
                statusUnidade: true,
                faccao: { select: { id: true, nomeFaccao: true } },
              },
            },
          },
        },
      },
    }),
    prisma.historicoMovimentacao.findFirst({
      where: { adolescenteId, tipo: "RISCO_FUGA_ALERTA" },
      orderBy: [
        { registradoEm: "desc" },
        { criadoEm: "desc" },
      ],
      select: {
        descricao: true,
        registradoEm: true,
        criadoEm: true,
        referenciaTipo: true,
        referenciaId: true,
      },
    }),
    prisma.historicoMovimentacao.findMany({
      where: {
        adolescenteId,
        tipo: { in: [TIPO_PROTOCOLO_ATIVADO, TIPO_PROTOCOLO_ALTA] },
      },
      orderBy: [
        { registradoEm: "desc" },
        { criadoEm: "desc" },
      ],
      take: 10,
    }),
  ]);

  const conflitosDetalhados = conflitos.map((conflito) =>
    mapConflito(conflito, adolescenteId)
  );

  const casaOitoOcupantes = (casaOito?.alojamentos ?? []).flatMap((aloj) => {
    if (!aloj.adolescentes.length) {
      return [];
    }
    const lado = inferirLadoCasaOito(aloj.numeroAlojamento, aloj.ala);
    return aloj.adolescentes.map((ocupante) => ({
      alojamentoId: aloj.id,
      numero: aloj.numeroAlojamento,
      lado,
      adolescente: {
        id: ocupante.id,
        nome: ocupante.nomeCompleto,
        status: ocupante.statusUnidade,
        faccao: ocupante.faccao?.nomeFaccao ?? null,
      },
    }));
  });

  const idsCasaOito = new Set(casaOitoOcupantes.map((item) => item.adolescente.id));

  const conflitosCasaOito = conflitosDetalhados.filter(
    (conflito) =>
      conflito.adversario && idsCasaOito.has(conflito.adversario.id)
  );

  const conflitosAtivosOutros = conflitosDetalhados.filter(
    (conflito) =>
      (conflito.status ?? "").toUpperCase() === "ATIVO" &&
      (!conflito.adversario || !idsCasaOito.has(conflito.adversario.id))
  );

  const alertasResumo = analisarAlertas(alertas);

  const impeditivos: string[] = [];
  const observacoes: string[] = [];

  conflitosCasaOito
    .filter((conflito) => conflito.status?.toUpperCase() === "ATIVO")
    .forEach((conflito) => {
      if (conflito.adversario) {
        impeditivos.push(
          `Conflito ativo contra ${conflito.adversario.nome} (${conflito.adversario.faccao ?? "sem faccao"}) atualmente na Casa 08.`
        );
      }
    });

  if (
    conflitosCasaOito.length > 0 &&
    !conflitosCasaOito.some(
      (conflito) => conflito.status?.toUpperCase() === "ATIVO"
    )
  ) {
    observacoes.push(
      "Historico de conflitos com adolescentes que hoje ocupam a Casa 08."
    );
  }

  if (conflitosAtivosOutros.length > 0) {
    const nomes = conflitosAtivosOutros
      .map((conflito) => conflito.adversario?.nome ?? "Nao identificado")
      .slice(0, 5)
      .join(", ");
    impeditivos.push(
      `Conflitos internos ativos contra outros adolescentes (${nomes}${
        conflitosAtivosOutros.length > 5 ? ", ..." : ""
      }).`
    );
    const qualificacao =
      conflitosAtivosOutros.length >= 5
        ? "diversos"
        : conflitosAtivosOutros.length >= 3
        ? "varios"
        : "um";
    observacoes.push(
      `Possui ${qualificacao} conflito(s) ativo(s) fora da Casa 08 (total: ${conflitosAtivosOutros.length}), indicando baixa maturidade ou dificuldade de convivencia em ambientes com vigilancia reduzida, o que pode produzir riscos graves de agressao.`
    );
  }

  if (alertasResumo.relevantesAtivos.length > 0) {
    impeditivos.push(
      "Alertas graves Ativos detectados (disciplinar, agressao, fuga ou ameaca)."
    );
  }

  if (alertasResumo.relevantesHistorico.length > 0) {
    observacoes.push(
      "Historico de alertas graves foi encontrado. Avaliar reincidencia antes da promocao."
    );
  }

  if (alertasResumo.fuga.some((alerta) => alerta.ativo)) {
    impeditivos.push("Alerta de fuga/evasao ativo vinculado ao adolescente.");
  } else if (alertasResumo.fuga.length > 0) {
    observacoes.push(
      "Ja houve registro de fuga/evasao para este adolescente. Planejar monitoramento reforcado."
    );
  }

  const riscoFugaAtual = adolescente.riscoFuga
    ? adolescente.riscoFuga.toUpperCase()
    : null;

  if (riscoFugaAtual === "ALTO") {
    impeditivos.push("Risco de fuga classificado como ALTO.");
  }

  const riscoFugaOrigem = riscoFugaRegistro
    ? {
        descricao:
          riscoFugaRegistro.descricao ??
          "Risco de fuga elevado automaticamente por alerta/CI.",
        registradoEm:
          formatarDataIso(
            riscoFugaRegistro.registradoEm ?? riscoFugaRegistro.criadoEm
          ) ?? null,
        referenciaTipo: riscoFugaRegistro.referenciaTipo ?? null,
        referenciaId: riscoFugaRegistro.referenciaId ?? null,
      }
    : null;

  const casaOitoDetalhada = casaOitoOcupantes.map((ocupante) => ({
    ...ocupante,
    conflitos: conflitosCasaOito.filter(
      (conflito) => conflito.adversario?.id === ocupante.adolescente.id
    ),
  }));

  const alertaSuicidioAtivo =
    alertas.find(
      (alerta) =>
        alerta.tipoAlerta === "RISCO_SUICIDIO" && alerta.desativadoEm === null
    ) ?? null;
  const eventoEntrada = suicidioEventos.find(
    (item) => item.tipo === TIPO_PROTOCOLO_ATIVADO
  );
  const eventoAlta = suicidioEventos.find(
    (item) => item.tipo === TIPO_PROTOCOLO_ALTA
  );
  const possuiRegistroProtocolo =
    Boolean(alertaSuicidioAtivo) || Boolean(eventoEntrada) || Boolean(eventoAlta);
  const protocoloRiscoSuicidio = !possuiRegistroProtocolo
    ? null
    : {
        ativo: Boolean(alertaSuicidioAtivo),
        nivelAtual: alertaSuicidioAtivo?.nivelRisco ?? null,
        ultimaEntrada: eventoEntrada
          ? {
              data: (
                eventoEntrada.registradoEm ?? eventoEntrada.criadoEm
              ).toISOString(),
              descricao: eventoEntrada.descricao ?? null,
            }
          : null,
        ultimaAlta: eventoAlta
          ? {
              data: (
                eventoAlta.registradoEm ?? eventoAlta.criadoEm
              ).toISOString(),
              descricao: eventoAlta.descricao ?? null,
            }
          : null,
      };

  const avaliacao = {
    apto: impeditivos.length === 0,
    impeditivos,
    observacoes,
  };

  return {
    adolescente: {
      id: adolescente.id,
      nome: adolescente.nomeCompleto,
      numeroSms: adolescente.numeroSms ?? null,
      status: adolescente.statusUnidade,
      faccao: adolescente.faccao?.nomeFaccao ?? null,
      fase:
        adolescente.faseInternacaoAtual?.nomeFase ??
        "Nao informado",
      alojamentoAtual: formatarAlojamento(adolescente.alojamentoAtual),
      riscoFuga: riscoFugaAtual,
    },
    casa08: {
      nome: casaOito?.nome ?? "Casa 08",
      ocupantes: casaOitoDetalhada,
    },
    conflitosCasa08: conflitosCasaOito,
    protocoloRiscoSuicidio,
    conflitosOutros: conflitosAtivosOutros,
    conflitos: conflitosDetalhados,
    alertas: {
      ativos: alertasResumo.relevantesAtivos,
      historico: alertasResumo.relevantesHistorico,
      fuga: alertasResumo.fuga,
    },
    riscoFugaOrigem,
    avaliacao,
  };
}
