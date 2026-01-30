import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { resolveUserPermissions } from "@/lib/auth/resolve-permissions";
import { ESTADOS_UF } from "@/lib/geo/estados";

const listQuerySchema = z.object({
  busca: z.string().optional(),
  estado: z.string().optional(),
});

const createSchema = z.object({
  nome: z.string().min(2, "Nome da cidade deve ter ao menos 2 caracteres"),
  estado: z.string().min(2, "Estado deve ter 2 caracteres"),
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

    const busca = ensureString(parsed.data.busca);
    const estado = ensureString(parsed.data.estado).toUpperCase();

    const where: {
      nome?: { contains: string; mode: "insensitive" };
      estado?: string;
    } = {};

    if (busca) {
      where.nome = { contains: busca, mode: "insensitive" };
    }
    if (estado) {
      where.estado = estado;
    }

    const cidades = await prisma.cidade.findMany({
      where,
      select: {
        id: true,
        nome: true,
        estado: true,
      },
      orderBy: [{ estado: "asc" }, { nome: "asc" }],
    });

    return NextResponse.json({
      total: cidades.length,
      cidades,
    });
  } catch (error) {
    console.error("Erro ao listar cidades:", error);
    return NextResponse.json(
      {
        erro: "Erro ao listar cidades",
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
        { erro: "Sem permissao para gerenciar cidades" },
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

    const nome = ensureString(parsedBody.data.nome);
    const estado = ensureString(parsedBody.data.estado).toUpperCase();

    if (!ESTADOS_UF.includes(estado)) {
      return NextResponse.json(
        { erro: "Estado invalido" },
        { status: 400 }
      );
    }

    const existente = await prisma.cidade.findFirst({
      where: {
        nome: { equals: nome, mode: "insensitive" },
        estado,
      },
      select: { id: true },
    });

    if (existente) {
      return NextResponse.json(
        { erro: "Cidade ja cadastrada neste estado" },
        { status: 409 }
      );
    }

    const cidade = await prisma.cidade.create({
      data: {
        nome,
        estado,
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "CIDADE_CRIAR",
        tabelaAfetada: "cidades",
        registroIdAfetado: cidade.id,
        detalhesAlteracao: {
          nome: cidade.nome,
          estado: cidade.estado,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json(
      {
        id: cidade.id,
        nome: cidade.nome,
        estado: cidade.estado,
        mensagem: "Cidade criada com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar cidade:", error);
    return NextResponse.json(
      {
        erro: "Erro ao criar cidade",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
