import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; membroId: string }> }
) {
  try {
    const { id: grupoId, membroId } = await params;
    const session = await auth().catch(() => null);
    const operadorId = session?.user?.id ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    const membro = await prisma.grupoMembro.findUnique({
      where: { id: membroId },
      include: {
        grupo: { select: { id: true, nomeGrupo: true } },
        adolescente: { select: { id: true, nomeCompleto: true } },
      },
    });

    if (!membro) {
      return NextResponse.json(
        { erro: "Membro nao encontrado" },
        { status: 404 }
      );
    }

    if (membro.grupoId !== grupoId) {
      return NextResponse.json(
        { erro: "Membro nao pertence a este grupo" },
        { status: 400 }
      );
    }

    if (membro.dataSaida !== null) {
      return NextResponse.json(
        { erro: "Este membro ja foi removido anteriormente" },
        { status: 400 }
      );
    }

    const membroAtualizado = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.grupoMembro.update({
        where: { id: membroId },
        data: {
          dataSaida: new Date(),
        },
      });

      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "GRUPO_REMOVER_MEMBRO",
          tabelaAfetada: "grupos_membros",
          registroIdAfetado: membroId,
          detalhesAlteracao: {
            grupo: membro.grupo.nomeGrupo,
            adolescente: membro.adolescente.nomeCompleto,
            dataSaida: atualizado.dataSaida,
          },
          ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
        },
      });

      return atualizado;
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
        dataEntrada: membro.dataEntrada,
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
