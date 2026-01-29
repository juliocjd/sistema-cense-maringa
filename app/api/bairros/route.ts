import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { resolveUserPermissions } from "@/lib/auth/resolve-permissions";

const listQuerySchema = z.object({
  busca: z.string().optional(),
  cidade: z.string().optional(),
  incluirTotal: z
    .string()
    .transform((value) => value === "true")
    .optional(),
});

const createSchema = z.object({
  nomeBairro: z.string().min(2, "Nome do bairro deve ter ao menos 2 caracteres"),
  cidade: z.string().min(2, "Cidade deve ter ao menos 2 caracteres"),
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

    const { busca, cidade, incluirTotal } = parsed.data;

    const where: {
      nomeBairro?: { contains: string; mode: "insensitive" };
      cidade?: { equals: string; mode: "insensitive" };
    } = {};
    if (busca && busca.length > 0) {
      where.nomeBairro = {
        contains: busca,
        mode: "insensitive",
      };
    }
    if (cidade && cidade.length > 0) {
      where.cidade = {
        equals: cidade,
        mode: "insensitive",
      };
    }

    const bairros = await prisma.bairro.findMany({
      where,
      select: {
        id: true,
        nomeBairro: true,
        cidade: true,
        _count: incluirTotal
          ? {
              select: { adolescentes: true },
            }
          : undefined,
      },
      orderBy: [{ cidade: "asc" }, { nomeBairro: "asc" }],
    });

    return NextResponse.json({
      total: bairros.length,
      bairros: bairros.map((bairro) => ({
        id: bairro.id,
        nomeBairro: bairro.nomeBairro,
        cidade: bairro.cidade,
        totalAdolescentes: incluirTotal
          ? bairro._count?.adolescentes ?? 0
          : undefined,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar bairros:", error);
    return NextResponse.json(
      {
        erro: "Erro ao listar bairros",
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
      select: { id: true, funcaoRole: true },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    const permissoes = resolveUserPermissions(session, operadorExiste);
    if (!hasPermission(permissoes, PERMISSIONS.CONFLITOS_EXTERNOS_MANAGE)) {
      return NextResponse.json(
        { erro: "Sem permissao para gerenciar conflitos externos" },
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

    const { nomeBairro, cidade } = parsedBody.data;

    const existente = await prisma.bairro.findFirst({
      where: {
        nomeBairro: {
          equals: nomeBairro,
          mode: "insensitive",
        },
        cidade: {
          equals: cidade,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existente) {
      return NextResponse.json(
        { erro: "Bairro ja cadastrado nesta cidade" },
        { status: 409 }
      );
    }

    const bairro = await prisma.bairro.create({
      data: {
        nomeBairro,
        cidade,
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "BAIRRO_CRIAR",
        tabelaAfetada: "bairros",
        registroIdAfetado: bairro.id,
        detalhesAlteracao: {
          nomeBairro: bairro.nomeBairro,
          cidade: bairro.cidade,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json(
      {
        id: bairro.id,
        nomeBairro: bairro.nomeBairro,
        cidade: bairro.cidade,
        mensagem: "Bairro criado com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar bairro:", error);
    return NextResponse.json(
      {
        erro: "Erro ao criar bairro",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
