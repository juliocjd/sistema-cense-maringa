import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const faseSchema = z.object({
  nomeFase: z.string().min(1, "Nome da fase e obrigatorio"),
  ordem: z.number().int().min(1).nullable().optional(),
  descricaoFase: z.string().nullable().optional(),
});

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const getOperadorId = async () => {
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

export async function GET(_request: NextRequest) {
  try {
    const includeInactive =
      _request.nextUrl.searchParams.get("includeInactive") === "1";
    const fases = await prisma.faseInternacao.findMany({
      where: includeInactive ? undefined : { ativa: true },
      orderBy: [{ ordem: "asc" }, { nomeFase: "asc" }],
      select: {
        id: true,
        nomeFase: true,
        ordem: true,
        descricaoFase: true,
        ativa: true,
      },
    });

    return NextResponse.json(fases);
  } catch (error) {
    console.error("Erro ao buscar fases de internacao:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar fases de internacao" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getOperadorId();
    if ("erro" in authResult) {
      return NextResponse.json(
        { erro: authResult.erro },
        { status: authResult.status },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 },
      );
    }

    const dados = faseSchema.parse(body);
    const nomeFase = dados.nomeFase.trim();

    const existente = await prisma.faseInternacao.findFirst({
      where: {
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

    const fase = await prisma.faseInternacao.create({
      data: {
        nomeFase,
        ordem: dados.ordem ?? null,
        descricaoFase: ensureString(dados.descricaoFase) || null,
        ativa: true,
      },
      select: {
        id: true,
        nomeFase: true,
        ordem: true,
        descricaoFase: true,
        ativa: true,
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId: authResult.operadorId,
        acao: "FASE_INTERNACAO_CRIAR",
        tabelaAfetada: "fases_internacao",
        registroIdAfetado: fase.id,
        detalhesAlteracao: fase,
        ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    return NextResponse.json({ fase }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao criar fase de internacao:", error);
    return NextResponse.json(
      { erro: "Erro ao criar fase de internacao" },
      { status: 500 },
    );
  }
}
