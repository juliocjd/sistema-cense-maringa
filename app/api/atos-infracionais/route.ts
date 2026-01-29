import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { resolveUserPermissions } from "@/lib/auth/resolve-permissions";

const listSchema = z.object({
  busca: z.string().optional(),
  incluirInativos: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

const createSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  gravidade: z
    .enum(["LEVE", "MEDIO", "GRAVE", "HEDIONDO"])
    .optional()
    .nullable(),
  violenciaOuGraveAmeaca: z.boolean().optional().default(false),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(3).optional(),
  gravidade: z.enum(["LEVE", "MEDIO", "GRAVE", "HEDIONDO"]).optional().nullable(),
  violenciaOuGraveAmeaca: z.boolean().optional(),
  ativo: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const parsed = listSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );

  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Parametros invalidos" },
      { status: 400 }
    );
  }

  const { busca, incluirInativos } = parsed.data;
  const where: {
    ativo?: boolean;
    nome?: { contains: string; mode: "insensitive" };
  } = {};

  if (!incluirInativos) {
    where.ativo = true;
  }
  if (busca && busca.trim().length > 0) {
    where.nome = { contains: busca.trim(), mode: "insensitive" };
  }

  const atos = await prisma.atoInfracionalCatalogo.findMany({
    where,
    orderBy: [{ ativo: "desc" }, { gravidade: "desc" }, { nome: "asc" }],
  });

  return NextResponse.json({
    total: atos.length,
    atos: atos.map((ato) => ({
      id: ato.id,
      nome: ato.nome,
      gravidade: ato.gravidade,
      ativo: ato.ativo,
      violenciaOuGraveAmeaca: ato.violenciaOuGraveAmeaca ?? false,
    })),
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { erro: "Payload invalido; esperado JSON" },
      { status: 400 }
    );
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados invalidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const nomeBruto = parsed.data.nome.trim();
  const session = await auth().catch(() => null);
  const operadorId = session?.user?.id ?? null;

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
  const podeCriar = hasPermission(permissoes, PERMISSIONS.ADOLESCENTES_CREATE);

  if (!podeCriar) {
    return NextResponse.json(
      { erro: "Sem permissao para criar ato infracional" },
      { status: 403 }
    );
  }

  const nomeNormalizado = nomeBruto.replace(/\s+/g, " ").trim();

  const existente = await prisma.atoInfracionalCatalogo.findFirst({
    where: { nome: { equals: nomeNormalizado, mode: "insensitive" } },
    select: { id: true, ativo: true, nome: true },
  });

  if (existente) {
    return NextResponse.json(
      {
        erro: "Ato infracional ja cadastrado",
        ato: existente,
      },
      { status: 409 }
    );
  }

  const criado = await prisma.atoInfracionalCatalogo.create({
    data: {
      nome: nomeNormalizado,
      gravidade: parsed.data.gravidade ?? null,
      violenciaOuGraveAmeaca: parsed.data.violenciaOuGraveAmeaca ?? false,
      criadoPorId: operadorId,
    },
  });

  await prisma.logAuditoria.create({
    data: {
      operadorId,
      acao: "ATO_INFRACIONAL_CRIAR",
      tabelaAfetada: "atos_infracionais_catalogo",
      registroIdAfetado: criado.id,
      detalhesAlteracao: { nome: criado.nome },
      ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
    },
  });

  return NextResponse.json(
    {
      id: criado.id,
      nome: criado.nome,
      ativo: criado.ativo,
      gravidade: criado.gravidade,
      violenciaOuGraveAmeaca: criado.violenciaOuGraveAmeaca ?? false,
    },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { erro: "Payload invalido; esperado JSON" },
      { status: 400 }
    );
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados invalidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, nome, gravidade, violenciaOuGraveAmeaca, ativo } = parsed.data;

  const session = await auth().catch(() => null);
  const operadorId = session?.user?.id ?? null;
  if (!operadorId) {
    return NextResponse.json({ erro: "Operador nao autenticado" }, { status: 401 });
  }

  const operador = await prisma.operador.findUnique({
    where: { id: operadorId },
    select: { id: true, funcaoRole: true },
  });
  if (!operador) {
    return NextResponse.json({ erro: "Operador nao encontrado" }, { status: 403 });
  }

  const permissoes = resolveUserPermissions(session, operador);
  const podeEditar = hasPermission(permissoes, PERMISSIONS.ADOLESCENTES_CREATE);
  if (!podeEditar) {
    return NextResponse.json({ erro: "Sem permissao para editar ato infracional" }, { status: 403 });
  }

  const dataToUpdate: Record<string, any> = {};
  if (nome !== undefined) {
    const nomeNormalizado = nome.replace(/\s+/g, " ").trim();
    if (nomeNormalizado.length < 3) {
      return NextResponse.json({ erro: "Nome deve ter pelo menos 3 caracteres" }, { status: 400 });
    }

    const duplicado = await prisma.atoInfracionalCatalogo.findFirst({
      where: {
        id: { not: id },
        nome: { equals: nomeNormalizado, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicado) {
      return NextResponse.json(
        { erro: "Ja existe outro ato com esse nome" },
        { status: 409 }
      );
    }
    dataToUpdate.nome = nomeNormalizado;
  }
  if (gravidade !== undefined) dataToUpdate.gravidade = gravidade;
  if (violenciaOuGraveAmeaca !== undefined)
    dataToUpdate.violenciaOuGraveAmeaca = violenciaOuGraveAmeaca;
  if (ativo !== undefined) dataToUpdate.ativo = ativo;

  if (Object.keys(dataToUpdate).length === 0) {
    return NextResponse.json({ erro: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const atualizado = await prisma.atoInfracionalCatalogo.update({
    where: { id },
    data: dataToUpdate,
  });

  await prisma.logAuditoria.create({
    data: {
      operadorId,
      acao: "ATO_INFRACIONAL_EDITAR",
      tabelaAfetada: "atos_infracionais_catalogo",
      registroIdAfetado: atualizado.id,
      detalhesAlteracao: dataToUpdate,
      ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
    },
  });

  return NextResponse.json({
    id: atualizado.id,
    nome: atualizado.nome,
    gravidade: atualizado.gravidade,
    violenciaOuGraveAmeaca: atualizado.violenciaOuGraveAmeaca ?? false,
    ativo: atualizado.ativo,
  });
}
