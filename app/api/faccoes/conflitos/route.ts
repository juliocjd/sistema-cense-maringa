import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { resolveUserPermissions } from "@/lib/auth/resolve-permissions";

const listSchema = z.object({
  faccaoId: z.string().uuid().optional(),
});

const createSchema = z.object({
  faccaoAId: z.string().uuid(),
  faccaoBId: z.string().uuid(),
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

    const where = parsed.data.faccaoId
      ? {
          OR: [
            { faccaoAId: parsed.data.faccaoId },
            { faccaoBId: parsed.data.faccaoId },
          ],
          status: "ATIVO",
        }
      : undefined;

    const conflitos = await prisma.faccaoConflito.findMany({
      where,
      include: {
        faccaoA: true,
        faccaoB: true,
      },
      orderBy: { criadoEm: "desc" },
    });

    return NextResponse.json({
      total: conflitos.length,
      data: conflitos.map((conflito) => ({
        id: conflito.id,
        status: conflito.status,
        faccaoA: {
          id: conflito.faccaoA.id,
          nome: conflito.faccaoA.nomeFaccao,
        },
        faccaoB: {
          id: conflito.faccaoB.id,
          nome: conflito.faccaoB.nomeFaccao,
        },
        fonteInformacao: conflito.fonteInformacao ?? null,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar conflitos de faccao:", error);
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

    if (parsed.data.faccaoAId === parsed.data.faccaoBId) {
      return NextResponse.json(
        { erro: "Faccoes nao podem ser iguais" },
        { status: 400 }
      );
    }

    const existente = await prisma.faccaoConflito.findFirst({
      where: {
        OR: [
          {
            faccaoAId: parsed.data.faccaoAId,
            faccaoBId: parsed.data.faccaoBId,
          },
          {
            faccaoAId: parsed.data.faccaoBId,
            faccaoBId: parsed.data.faccaoAId,
          },
        ],
        status: "ATIVO",
      },
    });
    if (existente) {
      return NextResponse.json(
        { erro: "Conflito ja registrado entre estas faccoes" },
        { status: 409 }
      );
    }

    const conflito = await prisma.faccaoConflito.create({
      data: {
        faccaoAId: parsed.data.faccaoAId,
        faccaoBId: parsed.data.faccaoBId,
        status: "ATIVO",
        fonteInformacao: parsed.data.fonteInformacao.trim(),
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "FACCAO_CONFLITO_CRIAR",
        tabelaAfetada: "faccoes_conflitos",
        registroIdAfetado: conflito.id,
        detalhesAlteracao: {
          faccaoAId: parsed.data.faccaoAId,
          faccaoBId: parsed.data.faccaoBId,
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
    console.error("Erro ao criar conflito de faccao:", error);
    return NextResponse.json(
      { erro: "Erro ao criar conflito", detalhes: (error as Error).message },
      { status: 500 }
    );
  }
}
