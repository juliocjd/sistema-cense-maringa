import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const listSchema = z.object({
  bairroId: z.string().uuid().optional(),
});

const createSchema = z.object({
  bairroAId: z.string().uuid(),
  bairroBId: z.string().uuid(),
  fonteInformacao: z
    .string()
    .trim()
    .min(5, "Descreva como a informacao foi obtida"),
});

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") return "";
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
      return NextResponse.json(
        { erro: "Parametros invalidos" },
        { status: 400 }
      );
    }

    const where = parsed.data.bairroId
      ? {
          OR: [
            { bairroAId: parsed.data.bairroId },
            { barroBId: parsed.data.bairroId },
          ],
          status: "ATIVO",
        }
      : undefined;

    const conflitos = await prisma.bairroConflito.findMany({
      where,
      include: {
        bairroA: true,
        bairroB: true,
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({
      total: conflitos.length,
      data: conflitos.map((conflito) => ({
        id: conflito.id,
        status: conflito.status,
        bairroA: {
          id: conflito.bairroA.id,
          nome: conflito.bairroA.nomeBairro,
          cidade: conflito.bairroA.cidade,
        },
        bairroB: {
          id: conflito.bairroB.id,
          nome: conflito.bairroB.nomeBairro,
          cidade: conflito.bairroB.cidade,
        },
        fonteInformacao: conflito.fonteInformacao ?? null,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar conflitos de bairro:", error);
    return NextResponse.json(
      { erro: "Erro ao listar conflitos", detalhes: (error as Error).message },
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

    if (parsed.data.bairroAId === parsed.data.bairroBId) {
      return NextResponse.json(
        { erro: "Bairros nao podem ser iguais" },
        { status: 400 }
      );
    }

    const existente = await prisma.bairroConflito.findFirst({
      where: {
        OR: [
          {
            bairroAId: parsed.data.bairroAId,
            barroBId: parsed.data.bairroBId,
          },
          {
            bairroAId: parsed.data.bairroBId,
            barroBId: parsed.data.bairroAId,
          },
        ],
        status: "ATIVO",
      },
    });
    if (existente) {
      return NextResponse.json(
        { erro: "Conflito ja existe entre estes bairros" },
        { status: 409 }
      );
    }

    const conflito = await prisma.bairroConflito.create({
      data: {
        bairroAId: parsed.data.bairroAId,
        barroBId: parsed.data.bairroBId,
        status: "ATIVO",
        fonteInformacao: parsed.data.fonteInformacao.trim(),
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "BAIRRO_CONFLITO_CRIAR",
        tabelaAfetada: "bairros_conflitos",
        registroIdAfetado: conflito.id,
        detalhesAlteracao: {
          bairroAId: parsed.data.bairroAId,
          bairroBId: parsed.data.bairroBId,
          fonte: parsed.data.fonteInformacao.trim(),
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json(
      { id: conflito.id, mensagem: "Conflito registrado" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar conflito de bairro:", error);
    return NextResponse.json(
      { erro: "Erro ao criar conflito", detalhes: (error as Error).message },
      { status: 500 }
    );
  }
}
