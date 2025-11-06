import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const listQuerySchema = z.object({
  busca: z.string().optional(),
  nivelRisco: z
    .string()
    .transform((value) => value.toUpperCase())
    .optional(),
  incluirTotal: z
    .string()
    .transform((value) => value === "true")
    .optional(),
});

const allowedNiveis = ["ALTO", "MEDIO", "BAIXO"] as const;

const createSchema = z.object({
  nomeSimbolo: z.string().min(2, "Nome do simbolo deve ter ao menos 2 caracteres"),
  significadoAssociado: z.string().max(1000).optional().nullable(),
  nivelRisco: z
    .enum(allowedNiveis)
    .optional()
    .nullable(),
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
    const parsed = listQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );

    if (!parsed.success) {
      return NextResponse.json(
        { erro: "Parametros de consulta invalidos" },
        { status: 400 }
      );
    }

    const { busca, nivelRisco, incluirTotal } = parsed.data;

    const where: {
      nomeSimbolo?: { contains: string; mode: "insensitive" };
      nivelRisco?: string | null;
    } = {};

    if (busca && busca.length > 0) {
      where.nomeSimbolo = {
        contains: busca,
        mode: "insensitive",
      };
    }

    if (nivelRisco && allowedNiveis.includes(nivelRisco as any)) {
      where.nivelRisco = nivelRisco;
    }

    const tatuagens = await prisma.tatuagemCatalogo.findMany({
      where,
      select: {
        id: true,
        nomeSimbolo: true,
        significadoAssociado: true,
        nivelRisco: true,
        _count: incluirTotal
          ? {
              select: { adolescentesTatuagens: true },
            }
          : undefined,
      },
      orderBy: [{ nivelRisco: "desc" }, { nomeSimbolo: "asc" }],
    });

    return NextResponse.json({
      total: tatuagens.length,
      tatuagens: tatuagens.map((tatuagem) => ({
        id: tatuagem.id,
        nomeSimbolo: tatuagem.nomeSimbolo,
        significadoAssociado: tatuagem.significadoAssociado,
        nivelRisco: tatuagem.nivelRisco,
        totalUso: incluirTotal
          ? tatuagem._count?.adolescentesTatuagens ?? 0
          : undefined,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar tatuagens:", error);
    return NextResponse.json(
      {
        erro: "Erro ao listar tatuagens",
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

    const parsedBody = createSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const { nomeSimbolo, significadoAssociado, nivelRisco } = parsedBody.data;

    const existente = await prisma.tatuagemCatalogo.findUnique({
      where: { nomeSimbolo },
      select: { id: true },
    });

    if (existente) {
      return NextResponse.json(
        { erro: "Tatuagem ja cadastrada com este simbolo" },
        { status: 409 }
      );
    }

    const tatuagem = await prisma.tatuagemCatalogo.create({
      data: {
        nomeSimbolo,
        significadoAssociado: significadoAssociado ?? null,
        nivelRisco: nivelRisco ?? null,
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "TATUAGEM_CRIAR",
        tabelaAfetada: "tatuagens_catalogo",
        registroIdAfetado: tatuagem.id,
        detalhesAlteracao: {
          nomeSimbolo: tatuagem.nomeSimbolo,
          nivelRisco: tatuagem.nivelRisco,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json(
      {
        id: tatuagem.id,
        nomeSimbolo: tatuagem.nomeSimbolo,
        significadoAssociado: tatuagem.significadoAssociado,
        nivelRisco: tatuagem.nivelRisco,
        mensagem: "Tatuagem cadastrada com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar tatuagem:", error);
    return NextResponse.json(
      {
        erro: "Erro ao criar tatuagem",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

