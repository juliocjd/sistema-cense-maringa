import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const listSchema = z.object({
  busca: z.string().optional(),
});

const createSchema = z.object({
  nome: z.string().min(3, "Nome deve ter ao menos 3 caracteres"),
  atividade: z.string().optional().nullable(),
  email: z.string().email("Email invalido"),
  telefone: z.string().optional().nullable(),
});

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const getIp = (request: NextRequest) =>
  request.headers.get("x-forwarded-for") ?? "unknown";

export async function GET(request: NextRequest) {
  try {
    const parsed = listSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    if (!parsed.success) {
      return NextResponse.json({ erro: "Parametros invalidos" }, { status: 400 });
    }

    const tecnicos = await prisma.tecnicoReferencia.findMany({
      where: parsed.data.busca
        ? {
            nome: { contains: parsed.data.busca, mode: "insensitive" },
          }
        : undefined,
      orderBy: { nome: "asc" },
    });

    return NextResponse.json({
      total: tecnicos.length,
      data: tecnicos,
    });
  } catch (error) {
    console.error("Erro ao listar tecnicos:", error);
    return NextResponse.json(
      { erro: "Erro ao listar tecnicos", detalhes: (error as Error).message },
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

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 }
      );
    }

    const parsed = createSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: parsed.error.issues },
        { status: 400 }
      );
    }

    const existente = await prisma.tecnicoReferencia.findFirst({
      where: { email: { equals: parsed.data.email, mode: "insensitive" } },
    });
    if (existente) {
      return NextResponse.json(
        { erro: "Ja existe um tecnico com este email" },
        { status: 409 }
      );
    }

    const tecnico = await prisma.tecnicoReferencia.create({
      data: {
        nome: parsed.data.nome,
        atividade: parsed.data.atividade,
        email: parsed.data.email,
        telefone: parsed.data.telefone,
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "TECNICO_CRIAR",
        tabelaAfetada: "agentes_profissionais",
        registroIdAfetado: tecnico.id,
        detalhesAlteracao: {
          nome: tecnico.nome,
          email: tecnico.email,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json(
      {
        id: tecnico.id,
        ...parsed.data,
        mensagem: "Tecnico de referencia criado com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar tecnico:", error);
    return NextResponse.json(
      { erro: "Erro ao criar tecnico", detalhes: (error as Error).message },
      { status: 500 }
    );
  }
}
