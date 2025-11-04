// app/api/grupos/[id]/membros/[membroId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/grupos/[id]/membros/[membroId] - Remover membro do grupo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; membroId: string } }
) {
  try {
    const { id: grupoId, membroId } = params;

    // Verificar se membro existe
    const membro = await prisma.grupoMembro.findUnique({
      where: { id: membroId },
      include: {
        grupo: {
          select: {
            id: true,
            nomeGrupo: true,
          },
        },
        adolescente: {
          select: {
            id: true,
            nomeCompleto: true,
          },
        },
      },
    });

    if (!membro) {
      return NextResponse.json(
        { erro: "Membro não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se o membro pertence ao grupo correto
    if (membro.grupoId !== grupoId) {
      return NextResponse.json(
        { erro: "Membro não pertence a este grupo" },
        { status: 400 }
      );
    }

    // Verificar se já foi removido
    if (membro.dataSaida !== null) {
      return NextResponse.json(
        { erro: "Este membro já foi removido do grupo anteriormente" },
        { status: 400 }
      );
    }

    // Atualizar membro (soft delete - marca data de saída)
    const membroAtualizado = await prisma.grupoMembro.update({
      where: { id: membroId },
      data: {
        dataSaida: new Date(),
      },
    });

    // Log de auditoria
    await prisma.logAuditoria.create({
      data: {
        // operadorId: request.user?.id, // TODO: Adicionar após implementar auth
        acao: "UPDATE",
        tabelaAfetada: "GruposMembros",
        registroIdAfetado: membroId,
        detalhesAlteracao: {
          acao: "Remoção de membro",
          grupo: membro.grupo.nomeGrupo,
          adolescente: membro.adolescente.nomeCompleto,
          dataSaida: membroAtualizado.dataSaida,
        },
        // ipOrigem: request.ip,
      },
    });

    return NextResponse.json({
      mensagem: "Membro removido do grupo com sucesso",
      membro: {
        id: membroAtualizado.id,
        adolescente: {
          id: membro.adolescente.id,
          nome: membro.adolescente.nomeCompleto,
        },
        grupo: {
          id: membro.grupo.id,
          nome: membro.grupo.nomeGrupo,
        },
        dataEntrada: membroAtualizado.dataEntrada,
        dataSaida: membroAtualizado.dataSaida,
      },
    });
  } catch (error) {
    console.error("Erro ao remover membro do grupo:", error);
    return NextResponse.json(
      {
        erro: "Erro ao remover membro do grupo",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
