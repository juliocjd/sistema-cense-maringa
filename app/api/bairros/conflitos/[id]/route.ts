import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({
  id: z.string().uuid("Id do conflito invalido"),
});

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const getIp = (request: NextRequest) =>
  request.headers.get("x-forwarded-for") ?? "unknown";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { erro: "Id do conflito invalido" },
        { status: 400 }
      );
    }

    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);
    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operador = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true },
    });
    if (!operador) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    const conflito = await prisma.bairroConflito.findUnique({
      where: { id: parsedParams.data.id },
      include: {
        bairroA: true,
        bairroB: true,
      },
    });
    if (!conflito) {
      return NextResponse.json(
        { erro: "Conflito nao encontrado" },
        { status: 404 }
      );
    }

    if (conflito.status !== "ATIVO") {
      return NextResponse.json(
        { erro: "Conflito ja foi encerrado" },
        { status: 400 }
      );
    }

    await prisma.bairroConflito.update({
      where: { id: conflito.id },
      data: { status: "INATIVO" },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "BAIRRO_CONFLITO_REMOVER",
        tabelaAfetada: "bairros_conflitos",
        registroIdAfetado: conflito.id,
        detalhesAlteracao: {
          bairroAId: conflito.bairroAId,
          bairroBId: conflito.barroBId,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({ sucesso: true, mensagem: "Conflito encerrado" });
  } catch (error) {
    console.error("Erro ao remover conflito de bairro:", error);
    return NextResponse.json(
      { erro: "Erro ao encerrar conflito", detalhes: (error as Error).message },
      { status: 500 }
    );
  }
}
