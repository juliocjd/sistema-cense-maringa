// app/api/conflitos/[id]/resolver/route.ts
// API: Marca conflito como resolvido

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import type { Prisma } from "@prisma/client";

const montarFiltroGrupo = (
  registroGrupoId: string | null,
  fallbackId: string
): Prisma.ConflitoWhereInput => {
  if (registroGrupoId) {
    return {
      OR: [
        { registroGrupoId },
        { id: registroGrupoId },
      ],
    };
  }
  return { id: fallbackId };
};

/**
 * PUT /api/conflitos/:id/resolver
 *
 * Marca um conflito como resolvido
 *
 * Body (opcional):
 * {
 *   observacao?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conflitoId } = await params;
    const body = await request.json().catch(() => ({}));
    const session = await auth().catch((error) => {
      console.error("Erro ao obter sessao do auth:", error);
      return null;
    });
    const operadorId = session?.user?.id ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }


    // Buscar conflito
    const conflito = await prisma.conflito.findUnique({
      where: { id: conflitoId },
      include: {
        adolescenteA: {
          select: {
            id: true,
            nomeCompleto: true,
            numeroSms: true,
          },
        },
        adolescenteB: {
          select: {
            id: true,
            nomeCompleto: true,
            numeroSms: true,
          },
        },
        tentativasMediacao: {
          orderBy: { dataTentativa: "desc" },
        },
      },
    });

    if (!conflito) {
      return NextResponse.json(
        { erro: "Conflito não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se já está resolvido
    if (conflito.status === "RESOLVIDO") {
      return NextResponse.json(
        {
          aviso: "Este conflito já está marcado como resolvido",
          resolvido_em: conflito.resolvidoEm,
        },
        { status: 400 }
      );
    }

    const escopo = (body?.escopo ?? "GRUPO").toUpperCase();
    const filtroGrupo = montarFiltroGrupo(
      conflito.registroGrupoId ?? null,
      conflitoId
    );

    const conflitosDoGrupo = await prisma.conflito.findMany({
      where: filtroGrupo,
      select: { id: true },
    });

    if (conflitosDoGrupo.length === 0) {
      return NextResponse.json(
        { erro: "Nenhum registro encontrado para resolucao" },
        { status: 404 }
      );
    }

    const idsParaAtualizar =
      escopo === "PAR"
        ? [conflitoId]
        : conflitosDoGrupo.map((registro) => registro.id);
    const resolvidoEm = new Date();

    const resultado = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.conflito.updateMany({
        where: {
          id: {
            in: idsParaAtualizar,
          },
        },
        data: {
          status: "RESOLVIDO",
          resolvidoEm,
        },
      });

      await tx.logAuditoria.create({
        data: {
          operadorId: operadorId,
          acao: "RESOLVER_CONFLITO",
          tabelaAfetada: "conflitos",
          registroIdAfetado: conflito.registroGrupoId ?? conflitoId,
          detalhesAlteracao: {
            registrosAtualizados: updateResult.count,
            adolescente_a: conflito.adolescenteA.nomeCompleto,
            adolescente_b: conflito.adolescenteB.nomeCompleto,
            tipo_conflito: conflito.tipoConflito,
            total_mediacoes: conflito.tentativasMediacao.length,
            observacao: body.observacao || null,
          },
          ipOrigem: request.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return updateResult;
    });

    const tempoResolucaoDias = Math.floor(
      (resolvidoEm.getTime() - conflito.criadoEm.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      sucesso: true,
      mensagem:
        resultado.count > 1
          ? `Conflito marcado como resolvido para ${resultado.count} registros do grupo.`
          : "Conflito marcado como resolvido",
      registrosAfetados: resultado.count,
      conflito: {
        id: conflitoId,
        registroGrupoId: conflito.registroGrupoId ?? conflitoId,
        adolescentes: `${conflito.adolescenteA.nomeCompleto} vs ${conflito.adolescenteB.nomeCompleto}`,
        tipo: conflito.tipoConflito,
        status: "RESOLVIDO",
        resolvido_em: resolvidoEm,
        criado_em: conflito.criadoEm,
        tempo_resolucao: `${tempoResolucaoDias} dias`,
      },
      estatisticas: {
        total_tentativas_mediacao: conflito.tentativasMediacao.length,
        ultima_mediacao: conflito.tentativasMediacao[0]
          ? {
              data: conflito.tentativasMediacao[0].dataTentativa,
              resultado: conflito.tentativasMediacao[0].resultado,
              profissional:
                conflito.tentativasMediacao[0].profissionalResponsavel,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Erro ao resolver conflito:", error);
    return NextResponse.json(
      {
        erro: "Erro ao resolver conflito",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conflitos/:id/resolver
 *
 * Reverte resolução de conflito (marca como ATIVO novamente)
 * Útil se houve erro ao marcar como resolvido
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conflitoId } = await params;
    const body = await request.json().catch(() => ({}));
    const session = await auth().catch((error) => {
      console.error("Erro ao obter sessao do auth:", error);
      return null;
    });
    const operadorId = session?.user?.id ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    const conflito = await prisma.conflito.findUnique({
      where: { id: conflitoId },
    });

    if (!conflito) {
      return NextResponse.json(
        { erro: "Conflito nao encontrado" },
        { status: 404 }
      );
    }

    const escopo = (body?.escopo ?? "GRUPO").toUpperCase();
    if (conflito.status !== "RESOLVIDO" && escopo !== "GRUPO") {
      return NextResponse.json(
        { erro: "Este conflito nao esta marcado como resolvido" },
        { status: 400 }
      );
    }

    const filtroGrupo = montarFiltroGrupo(
      conflito.registroGrupoId ?? null,
      conflitoId
    );

    const conflitosDoGrupo = await prisma.conflito.findMany({
      where: filtroGrupo,
      select: { id: true },
    });

    if (conflitosDoGrupo.length === 0) {
      return NextResponse.json(
        { erro: "Nenhum registro encontrado para reverter" },
        { status: 404 }
      );
    }

    const idsParaAtualizar =
      escopo === "PAR" ? [conflitoId] : conflitosDoGrupo.map((r) => r.id);

    const resultado = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.conflito.updateMany({
        where: {
          id: {
            in: idsParaAtualizar,
          },
        },
        data: {
          status: "ATIVO",
          resolvidoEm: null,
        },
      });

      await tx.logAuditoria.create({
        data: {
          operadorId: operadorId,
          acao: "REVERTER_RESOLUCAO_CONFLITO",
          tabelaAfetada: "conflitos",
          registroIdAfetado: conflito.registroGrupoId ?? conflitoId,
          detalhesAlteracao: {
            motivo: body.motivo || "Nao especificado",
            registrosAtualizados: updateResult.count,
          },
          ipOrigem: request.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return updateResult;
    });

    return NextResponse.json({
      sucesso: true,
      mensagem:
        resultado.count > 1
          ? `Resolucao revertida em ${resultado.count} registros do grupo.`
          : "Resolucao do conflito revertida. Conflito marcado como ATIVO",
      registrosAfetados: resultado.count,
      conflito: {
        id: conflitoId,
        registroGrupoId: conflito.registroGrupoId ?? conflitoId,
        status: "ATIVO",
      },
    });
  } catch (error) {
    console.error("Erro ao reverter resolucao:", error);
    return NextResponse.json(
      {
        erro: "Erro ao reverter resolucao",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

