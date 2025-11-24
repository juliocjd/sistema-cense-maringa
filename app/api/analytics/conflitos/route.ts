import { NextRequest, NextResponse } from "next/server";
import {
  getEstruturaSnapshot,
  type EstruturaSnapshot,
} from "@/lib/estrutura/snapshot";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ConflitoAggregado = {
  id: string;
  tipo: string | null;
  status: string;
  criadoEm?: Date | null;
  resolvidoEm?: Date | null;
  descricao?: string | null;
  participantes: { id: string; nome: string }[];
};

const normalizarTexto = (valor: string | null | undefined): string => {
  if (!valor) {
    return "";
  }
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
};

const registrarConflito = (
  mapa: Map<string, ConflitoAggregado>,
  conflito: NonNullable<
    EstruturaSnapshot["casas"][number]["alojamentos"][number]["ocupante"]
  >["conflitosA"][number],
  participanteAtual: { id: string; nome: string }
) => {
  if (!conflito?.id) {
    return;
  }

  const existente =
    mapa.get(conflito.id) ??
    ({
      id: conflito.id,
      tipo: conflito.tipo ?? null,
      status: conflito.status ?? "ATIVO",
      criadoEm: conflito.criadoEm ? new Date(conflito.criadoEm) : null,
      resolvidoEm: conflito.resolvidoEm ? new Date(conflito.resolvidoEm) : null,
      descricao: null,
      participantes: [],
    } as ConflitoAggregado);

  if (!mapa.has(conflito.id)) {
    mapa.set(conflito.id, existente);
  } else {
    if (!existente.criadoEm && conflito.criadoEm) {
      existente.criadoEm = new Date(conflito.criadoEm);
    }
    if (!existente.resolvidoEm && conflito.resolvidoEm) {
      existente.resolvidoEm = new Date(conflito.resolvidoEm);
    }
    if (!existente.tipo && conflito.tipo) {
      existente.tipo = conflito.tipo;
    }
    if (conflito.status) {
      existente.status = conflito.status;
    }
  }

  if (!existente.participantes.find((p) => p.id === participanteAtual.id)) {
    existente.participantes.push(participanteAtual);
  }

  if (conflito.adversario?.id) {
    const adversario = {
      id: conflito.adversario.id,
      nome: conflito.adversario.nome ?? "Sem nome",
    };
    if (!existente.participantes.find((p) => p.id === adversario.id)) {
      existente.participantes.push(adversario);
    }
  }
};

const coletarConflitos = (snapshot: EstruturaSnapshot) => {
  const mapa = new Map<string, ConflitoAggregado>();

  snapshot.casas.forEach((casa) => {
    casa.alojamentos.forEach((alojamento) => {
      const ocupante = alojamento.ocupante;
      if (!ocupante) {
        return;
      }
      const participanteAtual = {
        id: ocupante.id,
        nome: ocupante.nome_completo,
      };

      (ocupante.conflitosA ?? []).forEach((conflito) =>
        registrarConflito(mapa, conflito, participanteAtual)
      );
      (ocupante.conflitosB ?? []).forEach((conflito) =>
        registrarConflito(mapa, conflito, participanteAtual)
      );
      (ocupante.conflitosResolvidos ?? []).forEach((conflito) =>
        registrarConflito(mapa, conflito, participanteAtual)
      );
    });
  });

  return Array.from(mapa.values());
};

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const agora = new Date();
    const trintaDiasAtras = new Date(agora.getTime() - 30 * MS_PER_DAY);
    const snapshot = await getEstruturaSnapshot();
    const conflitos = coletarConflitos(snapshot);

    const totalRegistros = conflitos.length;
    let totalAtivos = 0;
    let resolvidosUltimos30Dias = 0;
    let somaDuracaoResolvidos = 0;
    let totalResolvidos = 0;

    const estatisticasPorTipo = new Map<
      string,
      {
        chave: string;
        etiqueta: string;
        total: number;
        ativos: number;
        resolvidosUltimos30: number;
      }
    >();

    const estatisticasParticipantes = new Map<
      string,
      {
        id: string;
        nome: string;
        total: number;
        ativos: number;
        ultimoRegistro?: Date;
      }
    >();

    const adicionarParticipante = (
      participante: { id: string; nome: string } | undefined,
      status: string,
      dataConflito?: Date | null
    ) => {
      if (!participante) {
        return;
      }
      const atual =
        estatisticasParticipantes.get(participante.id) ?? {
          id: participante.id,
          nome: participante.nome,
          total: 0,
          ativos: 0,
          ultimoRegistro: undefined as Date | undefined,
        };
      atual.nome = participante.nome;
      atual.total += 1;
      if (status === "ATIVO") {
        atual.ativos += 1;
      }
      if (
        dataConflito &&
        (!atual.ultimoRegistro || dataConflito > atual.ultimoRegistro)
      ) {
        atual.ultimoRegistro = dataConflito;
      }
      estatisticasParticipantes.set(participante.id, atual);
    };

    conflitos.forEach((conflito) => {
      const statusNormalizado = normalizarTexto(conflito.status);
      if (statusNormalizado === "ATIVO") {
        totalAtivos += 1;
      }

      if (
        conflito.resolvidoEm &&
        conflito.criadoEm &&
        conflito.resolvidoEm > conflito.criadoEm
      ) {
        totalResolvidos += 1;
        somaDuracaoResolvidos +=
          conflito.resolvidoEm.getTime() - conflito.criadoEm.getTime();
      }

      if (
        conflito.resolvidoEm &&
        conflito.resolvidoEm >= trintaDiasAtras
      ) {
        resolvidosUltimos30Dias += 1;
      }

      const tipoNormalizado =
        normalizarTexto(conflito.tipo) || "OUTROS";
      const etiqueta = conflito.tipo ?? "Sem classificacao";
      const estatistica =
        estatisticasPorTipo.get(tipoNormalizado) ?? {
          chave: tipoNormalizado,
          etiqueta,
          total: 0,
          ativos: 0,
          resolvidosUltimos30: 0,
        };

      estatistica.etiqueta = etiqueta;
      estatistica.total += 1;
      if (statusNormalizado === "ATIVO") {
        estatistica.ativos += 1;
      }
      if (
        conflito.resolvidoEm &&
        conflito.resolvidoEm >= trintaDiasAtras
      ) {
        estatistica.resolvidosUltimos30 += 1;
      }
      estatisticasPorTipo.set(tipoNormalizado, estatistica);

      conflito.participantes.forEach((participante) =>
        adicionarParticipante(participante, statusNormalizado, conflito.criadoEm ?? undefined)
      );
    });

    const tempoMedioResolucaoDias =
      totalResolvidos > 0
        ? Number(
            (
              somaDuracaoResolvidos /
              totalResolvidos /
              MS_PER_DAY
            ).toFixed(1)
          )
        : 0;

    const porTipo = Array.from(estatisticasPorTipo.values())
      .map((item) => ({
        tipo: item.etiqueta,
        ativos: item.ativos,
        totalHistorico: item.total,
        resolvidosUltimos30Dias: item.resolvidosUltimos30,
        percentualAtivos:
          totalAtivos > 0
            ? Number(((item.ativos / totalAtivos) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => {
        if (b.ativos !== a.ativos) {
          return b.ativos - a.ativos;
        }
        return b.totalHistorico - a.totalHistorico;
      });

    const participantesRecorrentes = Array.from(
      estatisticasParticipantes.values()
    )
      .map((item) => ({
        adolescente: { id: item.id, nome: item.nome },
        conflitosAtivos: item.ativos,
        totalConflitos: item.total,
        ultimoRegistroEm: item.ultimoRegistro
          ? item.ultimoRegistro.toISOString()
          : null,
      }))
      .sort((a, b) => {
        if (b.totalConflitos !== a.totalConflitos) {
          return b.totalConflitos - a.totalConflitos;
        }
        if (b.conflitosAtivos !== a.conflitosAtivos) {
          return b.conflitosAtivos - a.conflitosAtivos;
        }
        return (b.ultimoRegistroEm ?? "").localeCompare(
          a.ultimoRegistroEm ?? ""
        );
      })
      .slice(0, 5);

    const conflitosRecentes = conflitos
      .slice()
      .sort((a, b) => {
        const dataA = a.criadoEm?.getTime() ?? 0;
        const dataB = b.criadoEm?.getTime() ?? 0;
        return dataB - dataA;
      })
      .slice(0, 5)
      .map((conflito) => {
        const dataResultado = conflito.resolvidoEm ?? agora;
        const base = conflito.criadoEm ?? agora;
        const diasAtivo = Math.max(
          0,
          Math.floor((dataResultado.getTime() - base.getTime()) / MS_PER_DAY)
        );
        return {
          id: conflito.id,
          tipo: conflito.tipo ?? "Sem classificacao",
          status: conflito.status,
          descricao: conflito.descricao ?? null,
          criadoEm: base.toISOString(),
          resolvidoEm: conflito.resolvidoEm
            ? conflito.resolvidoEm.toISOString()
            : null,
          diasAtivo,
          participantes: conflito.participantes,
        };
      });

    return NextResponse.json({
      resumo: {
        totalRegistros,
        ativos: totalAtivos,
        resolvidosUltimos30Dias,
        tempoMedioResolucaoDias,
      },
      porTipo,
      participantesRecorrentes,
      conflitosRecentes,
    });
  } catch (error) {
    console.error("Erro ao gerar analytics de conflitos:", error);
    return NextResponse.json(
      {
        erro: "Erro ao gerar analytics de conflitos",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
