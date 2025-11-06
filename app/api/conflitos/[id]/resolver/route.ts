// app/api/conflitos/[id]/resolver/route.ts
// API: Marca conflito como resolvido

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";

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

    // Atualizar conflito
    const conflitoAtualizado = await prisma.$transaction(async (tx) => {
      const updated = await tx.conflito.update({
        where: { id: conflitoId },
        data: {
          status: "RESOLVIDO",
          resolvidoEm: new Date(),
        },
      });

      // Registrar log de auditoria
      await tx.logAuditoria.create({
        data: {
          operadorId: operadorId,
          acao: "RESOLVER_CONFLITO",
          tabelaAfetada: "conflitos",
          registroIdAfetado: conflitoId,
          detalhesAlteracao: {
            adolescente_a: conflito.adolescenteA.nomeCompleto,
            adolescente_b: conflito.adolescenteB.nomeCompleto,
            tipo_conflito: conflito.tipoConflito,
            total_mediacoes: conflito.tentativasMediacao.length,
            observacao: body.observacao || null,
          },
          ipOrigem: request.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return updated;
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: "Conflito marcado como resolvido",
      conflito: {
        id: conflitoAtualizado.id,
        adolescentes: `${conflito.adolescenteA.nomeCompleto} vs ${conflito.adolescenteB.nomeCompleto}`,
        tipo: conflito.tipoConflito,
        status: "RESOLVIDO",
        resolvido_em: conflitoAtualizado.resolvidoEm,
        criado_em: conflito.criadoEm,
        tempo_resolucao: `${Math.floor(
          (conflitoAtualizado.resolvidoEm!.getTime() -
            conflito.criadoEm.getTime()) /
            (1000 * 60 * 60 * 24)
        )} dias`,
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


    // Buscar conflito
    const conflito = await prisma.conflito.findUnique({
      where: { id: conflitoId },
    });

    if (!conflito) {
      return NextResponse.json(
        { erro: "Conflito não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se está resolvido
    if (conflito.status !== "RESOLVIDO") {
      return NextResponse.json(
        { erro: "Este conflito não está marcado como resolvido" },
        { status: 400 }
      );
    }

    // Reverter resolução
    const conflitoAtualizado = await prisma.$transaction(async (tx) => {
      const updated = await tx.conflito.update({
        where: { id: conflitoId },
        data: {
          status: "ATIVO",
          resolvidoEm: null,
        },
      });

      // Registrar log de auditoria
      await tx.logAuditoria.create({
        data: {
          operadorId: operadorId,
          acao: "REVERTER_RESOLUCAO_CONFLITO",
          tabelaAfetada: "conflitos",
          registroIdAfetado: conflitoId,
          detalhesAlteracao: {
            motivo: body.motivo || "Nao especificado",
          },
          ipOrigem: request.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return updated;
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: "Resolução do conflito revertida. Conflito marcado como ATIVO",
      conflito: {
        id: conflitoAtualizado.id,
        status: "ATIVO",
      },
    });
  } catch (error) {
    console.error("Erro ao reverter resolução:", error);
    return NextResponse.json(
      {
        erro: "Erro ao reverter resolução",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}







