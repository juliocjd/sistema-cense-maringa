import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const faseSchema = z
  .object({
    nomeFase: z.string().min(1, "Nome da fase e obrigatorio").optional(),
    ordem: z.number().int().min(1).nullable().optional(),
    descricaoFase: z.string().nullable().optional(),
    ativa: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.nomeFase !== undefined ||
      value.ordem !== undefined ||
      value.descricaoFase !== undefined ||
      value.ativa !== undefined,
    { message: "Nenhum campo informado para atualizacao" },
  );

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const getOperadorContext = async () => {
  const session = await auth().catch(() => null);
  const operadorId = ensureString(session?.user?.id);
  const permissoes = session?.user?.permissions ?? [];

  if (!operadorId) {
    return { erro: "Operador nao autenticado", status: 401 as const };
  }

  if (!hasPermission(permissoes, PERMISSIONS.ESTRUTURA_EDIT)) {
    return { erro: "Sem permissao para gerenciar fases", status: 403 as const };
  }

  return { operadorId };
};

const selecionarFase = {
  id: true,
  nomeFase: true,
  ordem: true,
  descricaoFase: true,
  ativa: true,
} as const;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await getOperadorContext();
    if ("erro" in authResult) {
      return NextResponse.json(
        { erro: authResult.erro },
        { status: authResult.status },
      );
    }

    const { id } = await context.params;
    const faseId = ensureString(id);
    if (!faseId) {
      return NextResponse.json({ erro: "Fase nao informada" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 },
      );
    }

    const dados = faseSchema.parse(body);

    const faseAtual = await prisma.faseInternacao.findUnique({
      where: { id: faseId },
      select: selecionarFase,
    });

    if (!faseAtual) {
      return NextResponse.json(
        { erro: "Fase nao encontrada" },
        { status: 404 },
      );
    }

    const nomeFase =
      dados.nomeFase !== undefined ? ensureString(dados.nomeFase) : undefined;

    if (nomeFase !== undefined && !nomeFase) {
      return NextResponse.json(
        { erro: "Nome da fase e obrigatorio" },
        { status: 400 },
      );
    }

    if (nomeFase) {
      const existente = await prisma.faseInternacao.findFirst({
        where: {
          id: { not: faseId },
          nomeFase: {
            equals: nomeFase,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (existente) {
        return NextResponse.json(
          { erro: "Ja existe uma fase com esse nome" },
          { status: 409 },
        );
      }
    }

    const fase = await prisma.faseInternacao.update({
      where: { id: faseId },
      data: {
        ...(nomeFase !== undefined ? { nomeFase } : {}),
        ...(dados.ordem !== undefined ? { ordem: dados.ordem ?? null } : {}),
        ...(dados.descricaoFase !== undefined
          ? {
              descricaoFase: ensureString(dados.descricaoFase) || null,
            }
          : {}),
        ...(dados.ativa !== undefined ? { ativa: dados.ativa } : {}),
      },
      select: selecionarFase,
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId: authResult.operadorId,
        acao: "FASE_INTERNACAO_ATUALIZAR",
        tabelaAfetada: "fases_internacao",
        registroIdAfetado: fase.id,
        detalhesAlteracao: {
          antes: faseAtual,
          depois: fase,
        },
        ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    return NextResponse.json({ fase });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao atualizar fase de internacao:", error);
    return NextResponse.json(
      { erro: "Erro ao atualizar fase de internacao" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await getOperadorContext();
    if ("erro" in authResult) {
      return NextResponse.json(
        { erro: authResult.erro },
        { status: authResult.status },
      );
    }

    const { id } = await context.params;
    const faseId = ensureString(id);
    if (!faseId) {
      return NextResponse.json({ erro: "Fase nao informada" }, { status: 400 });
    }

    const faseAtual = await prisma.faseInternacao.findUnique({
      where: { id: faseId },
      select: selecionarFase,
    });

    if (!faseAtual) {
      return NextResponse.json(
        { erro: "Fase nao encontrada" },
        { status: 404 },
      );
    }

    const [casasVinculadas, adolescentesVinculados] = await Promise.all([
      prisma.casa.count({
        where: { faseExclusivaId: faseId },
      }),
      prisma.adolescente.count({
        where: { faseInternacaoAtualId: faseId },
      }),
    ]);

    if (casasVinculadas > 0 || adolescentesVinculados > 0) {
      return NextResponse.json(
        {
          erro:
            "Nao e possivel excluir uma fase com vinculacoes ativas. Inative a fase se quiser retira-la do uso.",
          vinculacoes: {
            casas: casasVinculadas,
            adolescentes: adolescentesVinculados,
          },
        },
        { status: 409 },
      );
    }

    await prisma.faseInternacao.delete({
      where: { id: faseId },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId: authResult.operadorId,
        acao: "FASE_INTERNACAO_EXCLUIR",
        tabelaAfetada: "fases_internacao",
        registroIdAfetado: faseAtual.id,
        detalhesAlteracao: faseAtual,
        ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    return NextResponse.json({ mensagem: "Fase excluida com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir fase de internacao:", error);
    return NextResponse.json(
      { erro: "Erro ao excluir fase de internacao" },
      { status: 500 },
    );
  }
}
