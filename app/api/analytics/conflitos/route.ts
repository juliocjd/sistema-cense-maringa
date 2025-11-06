import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

type TipoConflitoEstatistica = {
  chave: string;
  etiqueta: string;
  total: number;
  ativos: number;
  resolvidosUltimos30: number;
};

type ParticipanteEstatistica = {
  id: string;
  nome: string;
  total: number;
  ativos: number;
  ultimoRegistro?: Date;
};

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const agora = new Date();
    const trintaDiasAtras = new Date(agora.getTime() - 30 * MS_PER_DAY);

    const conflitos = await prisma.conflito.findMany({
      select: {
        id: true,
        tipoConflito: true,
        status: true,
        criadoEm: true,
        resolvidoEm: true,
        descricao: true,
        adolescenteA: { select: { id: true, nomeCompleto: true } },
        adolescenteB: { select: { id: true, nomeCompleto: true } },
      },
      orderBy: { criadoEm: "desc" },
    });

    const totalRegistros = conflitos.length;
    let totalAtivos = 0;
    let resolvidosUltimos30Dias = 0;
    let somaDuracaoResolvidos = 0;
    let totalResolvidos = 0;

    const estatisticasPorTipo = new Map<string, TipoConflitoEstatistica>();
    const estatisticasParticipantes = new Map<
      string,
      ParticipanteEstatistica
    >();

    const adicionarParticipante = (
      participante:
        | { id: string; nomeCompleto: string | null | undefined }
        | null
        | undefined,
      statusNormalizado: string,
      dataConflito: Date
    ) => {
      if (!participante?.id) {
        return;
      }
      const chave = participante.id;
      const atual =
        estatisticasParticipantes.get(chave) ?? {
          id: participante.id,
          nome: participante.nomeCompleto ?? "Nome não informado",
          total: 0,
          ativos: 0,
        };
      atual.nome = participante.nomeCompleto ?? atual.nome;
      atual.total += 1;
      if (statusNormalizado === "ATIVO") {
        atual.ativos += 1;
      }
      if (!atual.ultimoRegistro || dataConflito > atual.ultimoRegistro) {
        atual.ultimoRegistro = dataConflito;
      }
      estatisticasParticipantes.set(chave, atual);
    };

    for (const conflito of conflitos) {
      const statusNormalizado = normalizarTexto(conflito.status);
      if (statusNormalizado === "ATIVO") {
        totalAtivos += 1;
      }

      const tipoNormalizado = normalizarTexto(conflito.tipoConflito) || "OUTROS";
      const etiqueta = conflito.tipoConflito ?? "Sem classificação";

      const estatisticaTipo =
        estatisticasPorTipo.get(tipoNormalizado) ?? {
          chave: tipoNormalizado,
          etiqueta,
          total: 0,
          ativos: 0,
          resolvidosUltimos30: 0,
        };

      estatisticaTipo.etiqueta = etiqueta;
      estatisticaTipo.total += 1;
      if (statusNormalizado === "ATIVO") {
        estatisticaTipo.ativos += 1;
      }
      if (
        conflito.resolvidoEm &&
        conflito.resolvidoEm >= trintaDiasAtras
      ) {
        estatisticaTipo.resolvidosUltimos30 += 1;
        resolvidosUltimos30Dias += 1;
      }

      if (conflito.resolvidoEm) {
        const duracaoMs =
          conflito.resolvidoEm.getTime() - conflito.criadoEm.getTime();
        if (duracaoMs > 0) {
          somaDuracaoResolvidos += duracaoMs;
          totalResolvidos += 1;
        }
      }

      estatisticasPorTipo.set(tipoNormalizado, estatisticaTipo);

      adicionarParticipante(
        conflito.adolescenteA,
        statusNormalizado,
        conflito.criadoEm
      );
      adicionarParticipante(
        conflito.adolescenteB,
        statusNormalizado,
        conflito.criadoEm
      );
    }

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
        adolescente: {
          id: item.id,
          nome: item.nome,
        },
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

    const conflitosRecentes = conflitos.slice(0, 5).map((conflito) => {
      const dataResultado = conflito.resolvidoEm ?? agora;
      const diasAtivo = Math.max(
        0,
        Math.floor(
          (dataResultado.getTime() - conflito.criadoEm.getTime()) / MS_PER_DAY
        )
      );
      return {
        id: conflito.id,
        tipo: conflito.tipoConflito ?? "Sem classificação",
        status: conflito.status,
        descricao: conflito.descricao ?? null,
        criadoEm: conflito.criadoEm.toISOString(),
        resolvidoEm: conflito.resolvidoEm
          ? conflito.resolvidoEm.toISOString()
          : null,
        diasAtivo,
        participantes: [
          conflito.adolescenteA
            ? {
                id: conflito.adolescenteA.id,
                nome: conflito.adolescenteA.nomeCompleto,
              }
            : null,
          conflito.adolescenteB
            ? {
                id: conflito.adolescenteB.id,
                nome: conflito.adolescenteB.nomeCompleto,
              }
            : null,
        ].filter((participante): participante is { id: string; nome: string } =>
          Boolean(participante)
        ),
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
