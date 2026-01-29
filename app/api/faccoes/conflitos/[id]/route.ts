import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { resolveUserPermissions } from "@/lib/auth/resolve-permissions";

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
      select: { id: true, funcaoRole: true },
    });
    if (!operador) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    const permissoes = resolveUserPermissions(session, operador);
    if (!hasPermission(permissoes, PERMISSIONS.CONFLITOS_EXTERNOS_MANAGE)) {
      return NextResponse.json(
        { erro: "Sem permissao para gerenciar conflitos externos" },
        { status: 403 }
      );
    }

    const conflito = await prisma.faccaoConflito.findUnique({
      where: { id: parsedParams.data.id },
      include: {
        faccaoA: true,
        faccaoB: true,
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

    await prisma.faccaoConflito.update({
      where: { id: conflito.id },
      data: { status: "INATIVO" },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "FACCAO_CONFLITO_REMOVER",
        tabelaAfetada: "faccoes_conflitos",
        registroIdAfetado: conflito.id,
        detalhesAlteracao: {
          faccaoAId: conflito.faccaoAId,
          faccaoBId: conflito.faccaoBId,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: "Conflito de faccao encerrado",
    });
  } catch (error) {
    console.error("Erro ao remover conflito de faccao:", error);
    return NextResponse.json(
      { erro: "Erro ao encerrar conflito", detalhes: (error as Error).message },
      { status: 500 }
    );
  }
}
