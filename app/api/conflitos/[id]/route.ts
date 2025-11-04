// app/api/conflitos/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/conflitos/[id] - Buscar detalhes de um conflito específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conflito = await prisma.conflito.findUnique({
      where: { id },
      include: {
        adolescenteA: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            fotoUrl: true,
            statusUnidade: true,
            alojamentoAtual: {
              include: {
                casa: true,
              },
            },
          },
        },
        adolescenteB: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            fotoUrl: true,
            statusUnidade: true,
            alojamentoAtual: {
              include: {
                casa: true,
              },
            },
          },
        },
        tentativasMediacao: {
          orderBy: {
            dataTentativa: "desc",
          },
        },
        ciOrigem: true,
      },
    });

    if (!conflito) {
      return NextResponse.json(
        { erro: "Conflito não encontrado" },
        { status: 404 }
      );
    }

    // Formatar resposta
    const conflitoFormatado = {
      id: conflito.id,
      tipo: conflito.tipoConflito,
      status: conflito.status,
      descricao: conflito.descricao,
      dataRegistro: conflito.criadoEm,
      dataResolucao: conflito.resolvidoEm,

      // Comunicado Interno de origem
      ciOrigem: conflito.ciOrigem
        ? {
            id: conflito.ciOrigem.id,
            numero: conflito.ciOrigem.numero,
            ano: conflito.ciOrigem.ano,
            tipo: conflito.ciOrigem.tipoCI,
            resumo: conflito.ciOrigem.resumoCI,
          }
        : null,

      // Adolescente A
      adolescenteA: {
        id: conflito.adolescenteA.id,
        nomeCompleto: conflito.adolescenteA.nomeCompleto,
        nomeSocial: conflito.adolescenteA.nomeSocial,
        numeroSms: conflito.adolescenteA.numeroSms,
        fotoUrl: conflito.adolescenteA.fotoUrl,
        statusUnidade: conflito.adolescenteA.statusUnidade,
        alojamentoAtual: conflito.adolescenteA.alojamentoAtual
          ? {
              id: conflito.adolescenteA.alojamentoAtual.id,
              casa: conflito.adolescenteA.alojamentoAtual.casa.nome,
              numero: conflito.adolescenteA.alojamentoAtual.numeroAlojamento,
              ala: conflito.adolescenteA.alojamentoAtual.ala,
            }
          : null,
      },

      // Adolescente B
      adolescenteB: {
        id: conflito.adolescenteB.id,
        nomeCompleto: conflito.adolescenteB.nomeCompleto,
        nomeSocial: conflito.adolescenteB.nomeSocial,
        numeroSms: conflito.adolescenteB.numeroSms,
        fotoUrl: conflito.adolescenteB.fotoUrl,
        statusUnidade: conflito.adolescenteB.statusUnidade,
        alojamentoAtual: conflito.adolescenteB.alojamentoAtual
          ? {
              id: conflito.adolescenteB.alojamentoAtual.id,
              casa: conflito.adolescenteB.alojamentoAtual.casa.nome,
              numero: conflito.adolescenteB.alojamentoAtual.numeroAlojamento,
              ala: conflito.adolescenteB.alojamentoAtual.ala,
            }
          : null,
      },

      // Tentativas de mediação realizadas
      tentativasMediacao: conflito.tentativasMediacao.map((tentativa) => ({
        id: tentativa.id,
        dataTentativa: tentativa.dataTentativa,
        profissionalResponsavel: tentativa.profissionalResponsavel,
        tipoIntervencao: tentativa.tipoIntervencao,
        resultado: tentativa.resultado,
        observacoes: tentativa.observacoes,
        proximaAcaoRecomendada: tentativa.proximaAcaoRecomendada,
        dataProximaAvaliacao: tentativa.dataProximaAvaliacao,
      })),

      // Análise de risco
      analiseRisco: {
        mesmaAla: conflito.adolescenteA.alojamentoAtual?.ala === conflito.adolescenteB.alojamentoAtual?.ala,
        mesmaCasa: conflito.adolescenteA.alojamentoAtual?.casaId === conflito.adolescenteB.alojamentoAtual?.casaId,
        ambosAtivos:
          conflito.adolescenteA.statusUnidade === "ATIVO" &&
          conflito.adolescenteB.statusUnidade === "ATIVO",
        nivelAlerta:
          conflito.status === "ATIVO" &&
          conflito.adolescenteA.alojamentoAtual?.ala === conflito.adolescenteB.alojamentoAtual?.ala
            ? "CRÍTICO"
            : conflito.status === "ATIVO" &&
              conflito.adolescenteA.alojamentoAtual?.casaId === conflito.adolescenteB.alojamentoAtual?.casaId
            ? "ALTO"
            : conflito.status === "ATIVO"
            ? "MÉDIO"
            : "BAIXO",
      },
    };

    return NextResponse.json(conflitoFormatado);
  } catch (error) {
    console.error("Erro ao buscar conflito:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar conflito",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
