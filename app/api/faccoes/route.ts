import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const listQuerySchema = z.object({
  busca: z.string().optional(),
  incluirTotal: z
    .string()
    .transform((value) => value === "true")
    .optional(),
});

const createSchema = z.object({
  nomeFaccao: z.string().min(2, "Nome da faccao deve ter ao menos 2 caracteres"),
  descricao: z.string().max(1000).optional().nullable(),
});

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const getIp = (req: NextRequest) =>
  req.headers.get("x-forwarded-for") ?? "unknown";

export async function GET(request: NextRequest) {
  try {
    const parsedQuery = listQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );

    if (!parsedQuery.success) {
      return NextResponse.json(
        { erro: "Parametros de consulta invalidos" },
        { status: 400 }
      );
    }

    const { busca, incluirTotal } = parsedQuery.data;
    const filtros =
      busca && busca.length > 0
        ? {
            nomeFaccao: {
              contains: busca,
              mode: "insensitive" as const,
            },
          }
        : {};

    const faccoes = await prisma.faccao.findMany({
      where: filtros,
      select: {
        id: true,
        nomeFaccao: true,
        descricao: true,
        _count: {
          select: { adolescentes: true },
        },
      },
      orderBy: { nomeFaccao: "asc" },
    });

    return NextResponse.json({
      total: faccoes.length,
      faccoes: faccoes.map((faccao) => ({
        id: faccao.id,
        nomeFaccao: faccao.nomeFaccao,
        descricao: faccao.descricao,
        totalAdolescentes: incluirTotal ? faccao._count.adolescentes : undefined,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar faccoes:", error);
    return NextResponse.json(
      {
        erro: "Erro ao listar faccoes",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);

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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 }
      );
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: parsed.error.issues },
        { status: 400 }
      );
    }

    const { nomeFaccao, descricao } = parsed.data;

    const existente = await prisma.faccao.findUnique({
      where: { nomeFaccao },
      select: { id: true },
    });

    if (existente) {
      return NextResponse.json(
        { erro: "Faccao ja cadastrada com este nome" },
        { status: 409 }
      );
    }

    const faccao = await prisma.faccao.create({
      data: {
        nomeFaccao,
        descricao: descricao ?? null,
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "FACCAO_CRIAR",
        tabelaAfetada: "faccoes",
        registroIdAfetado: faccao.id,
        detalhesAlteracao: {
          nomeFaccao: faccao.nomeFaccao,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json(
      {
        id: faccao.id,
        nomeFaccao: faccao.nomeFaccao,
        descricao: faccao.descricao,
        mensagem: "Faccao criada com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar faccao:", error);
    return NextResponse.json(
      {
        erro: "Erro ao criar faccao",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

