import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { erro: "ID da justificativa nao informado" },
        { status: 400 }
      );
    }

    const authResult = await ensureOperador(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const justificativa = await prisma.justificativaAlgema.findUnique({
      where: { id },
      select: {
        id: true,
        numeroDocumento: true,
        status: true,
        adolescenteId: true,
      },
    });

    if (!justificativa) {
      return NextResponse.json(
        { erro: "Justificativa nao encontrada" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.justificativaAlgema.delete({ where: { id } }),
      prisma.logAuditoria.create({
        data: {
          operadorId: authResult.operadorId,
          acao: "DELETE",
          tabelaAfetada: "JustificativaAlgema",
          registroIdAfetado: id,
          detalhesAlteracao: {
            numeroDocumento: justificativa.numeroDocumento,
            statusAnterior: justificativa.status,
            adolescenteId: justificativa.adolescenteId,
          },
          ipOrigem: authResult.ip,
        },
      }),
    ]);

    return NextResponse.json({
      mensagem: "Justificativa removida com sucesso",
      id,
    });
  } catch (error) {
    console.error("Erro ao remover justificativa:", error);
    return NextResponse.json(
      { erro: "Erro ao remover justificativa de algema" },
      { status: 500 }
    );
  }
}
