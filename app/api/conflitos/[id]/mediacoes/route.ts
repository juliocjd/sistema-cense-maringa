// app/api/conflitos/[id]/mediacoes/route.ts
// API: Gestão de tentativas de mediação de conflitos

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/conflitos/:id/mediacoes
 *
 * Retorna histórico de tentativas de mediação de um conflito
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conflitoId = params.id;

    // Verificar se conflito existe
    const conflito = await prisma.conflito.findUnique({
      where: { id: conflitoId },
    });

    if (!conflito) {
      return NextResponse.json(
        { erro: "Conflito não encontrado" },
        { status: 404 }
      );
    }

    // Buscar mediações
    const mediacoes = await prisma.tentativaMediacao.findMany({
      where: { conflitoId: conflitoId },
      orderBy: { dataTentativa: "desc" },
    });

    // Formatar resposta
    const mediacoesFormatadas = mediacoes.map((m) => ({
      id: m.id,
      data_tentativa: m.dataTentativa,
      profissional_responsavel: m.profissionalResponsavel,
      tipo_intervencao: m.tipoIntervencao,
      resultado: m.resultado,
      observacoes: m.observacoes,
      proxima_acao_recomendada: m.proximaAcaoRecomendada,
      data_proxima_avaliacao: m.dataProximaAvaliacao,
      criado_em: m.criadoEm,
    }));

    return NextResponse.json({
      conflito_id: conflitoId,
      total_tentativas: mediacoes.length,
      mediacoes: mediacoesFormatadas,
      ultima_tentativa: mediacoes[0]
        ? {
            data: mediacoes[0].dataTentativa,
            resultado: mediacoes[0].resultado,
          }
        : null,
      estatisticas: {
        resolvidas: mediacoes.filter((m) => m.resultado === "RESOLVIDO").length,
        em_andamento: mediacoes.filter((m) => m.resultado === "EM_ANDAMENTO")
          .length,
        sem_sucesso: mediacoes.filter((m) => m.resultado === "SEM_SUCESSO")
          .length,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar mediações:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar mediações" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conflitos/:id/mediacoes
 *
 * Registra nova tentativa de mediação
 *
 * Body:
 * {
 *   dataTentativa: string (YYYY-MM-DD),
 *   profissionalResponsavel: string,
 *   tipoIntervencao: "MEDIACAO" | "ATENDIMENTO_INDIVIDUAL" | "GRUPO_TERAPEUTICO" | string,
 *   resultado: "RESOLVIDO" | "EM_ANDAMENTO" | "SEM_SUCESSO",
 *   observacoes?: string,
 *   proximaAcaoRecomendada?: string,
 *   dataProximaAvaliacao?: string (YYYY-MM-DD)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conflitoId = params.id;
    const body = await request.json();

    // Validações
    if (!body.dataTentativa) {
      return NextResponse.json(
        { erro: "Data da tentativa é obrigatória" },
        { status: 400 }
      );
    }

    if (!body.profissionalResponsavel) {
      return NextResponse.json(
        { erro: "Profissional responsável é obrigatório" },
        { status: 400 }
      );
    }

    if (!body.tipoIntervencao) {
      return NextResponse.json(
        { erro: "Tipo de intervenção é obrigatório" },
        { status: 400 }
      );
    }

    if (!body.resultado) {
      return NextResponse.json(
        { erro: "Resultado é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se conflito existe
    const conflito = await prisma.conflito.findUnique({
      where: { id: conflitoId },
      include: {
        adolescenteA: true,
        adolescenteB: true,
      },
    });

    if (!conflito) {
      return NextResponse.json(
        { erro: "Conflito não encontrado" },
        { status: 404 }
      );
    }

    // Se conflito já foi resolvido, avisar
    if (conflito.status === "RESOLVIDO") {
      return NextResponse.json(
        {
          aviso: "Este conflito já foi marcado como resolvido",
          conflito_status: "RESOLVIDO",
          resolvido_em: conflito.resolvidoEm,
        },
        { status: 400 }
      );
    }

    // Validar formato de datas
    const dataTentativa = new Date(body.dataTentativa);
    if (isNaN(dataTentativa.getTime())) {
      return NextResponse.json(
        { erro: "Data da tentativa inválida" },
        { status: 400 }
      );
    }

    let dataProximaAvaliacao = null;
    if (body.dataProximaAvaliacao) {
      dataProximaAvaliacao = new Date(body.dataProximaAvaliacao);
      if (isNaN(dataProximaAvaliacao.getTime())) {
        return NextResponse.json(
          { erro: "Data da próxima avaliação inválida" },
          { status: 400 }
        );
      }
    }

    // Criar mediação
    const mediacao = await prisma.tentativaMediacao.create({
      data: {
        conflitoId: conflitoId,
        dataTentativa: dataTentativa,
        profissionalResponsavel: body.profissionalResponsavel,
        tipoIntervencao: body.tipoIntervencao,
        resultado: body.resultado,
        observacoes: body.observacoes,
        proximaAcaoRecomendada: body.proximaAcaoRecomendada,
        dataProximaAvaliacao: dataProximaAvaliacao,
      },
    });

    // Se resultado foi RESOLVIDO, marcar conflito como resolvido automaticamente
    if (body.resultado === "RESOLVIDO") {
      await prisma.conflito.update({
        where: { id: conflitoId },
        data: {
          status: "RESOLVIDO",
          resolvidoEm: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: "Tentativa de mediação registrada com sucesso",
        mediacao: {
          id: mediacao.id,
          data_tentativa: mediacao.dataTentativa,
          profissional: mediacao.profissionalResponsavel,
          tipo: mediacao.tipoIntervencao,
          resultado: mediacao.resultado,
        },
        conflito: {
          id: conflito.id,
          adolescentes: `${conflito.adolescenteA.nomeCompleto} vs ${conflito.adolescenteB.nomeCompleto}`,
          status: body.resultado === "RESOLVIDO" ? "RESOLVIDO" : conflito.status,
        },
        acao_automatica:
          body.resultado === "RESOLVIDO"
            ? "Conflito marcado como resolvido automaticamente"
            : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao registrar mediação:", error);
    return NextResponse.json(
      {
        erro: "Erro ao registrar mediação",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
