import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  INCLUDE_ADOLESCENTE_DEFAULT,
  mapPrismaAdolescente,
} from "@/lib/adolescentes/transformers";
import type {
  Adolescente,
  ListaAdolescentesMeta,
  ListaAdolescentesResponse,
} from "@/types";

const LIST_LIMIT_MAX = 100;

const createAdolescenteSchema = z.object({
  nomeCompleto: z.string().min(3, "Nome deve ter no minimo 3 caracteres"),
  nomeSocial: z.string().optional().nullable(),
  fotoUrl: z.string().url().optional().nullable(),
  numeroSms: z.string().optional().nullable(),
  dataNascimento: z.string().optional().nullable(),
  dataEntrada: z.string().optional().nullable(),
  numeroProcesso: z.string().optional().nullable(),
  atoInfracionalAtual: z.string().optional().nullable(),
  statusUnidade: z
    .enum(["ATIVO", "TRANSFERIDO", "LIBERADO", "EVADIDO"])
    .default("ATIVO"),
  faccaoGrupoId: z.string().uuid().optional().nullable(),
  faccaoNumeroMembro: z.string().optional().nullable(),
  bairroOrigemId: z.string().uuid().optional().nullable(),
  riscoFuga: z.enum(["BAIXO", "MEDIO", "ALTO"]).optional().nullable(),
  alertaRiscoSuicidio: z.boolean().default(false),
  alertaPerfilMapeado: z.boolean().default(false),
  alertaSaudeConfidencial: z.boolean().default(false),
  alertaSaudeDetalhes: z.string().optional().nullable(),
  alojamentoAtualId: z.string().uuid().optional().nullable(),
  faseInternacaoAtualId: z.string().uuid().optional().nullable(),
  tatuagens: z.array(z.object({
    catalogoId: z.string().uuid(),
    localCorpo: z.string().min(1),
    observacoes: z.string().optional(),
    significadoPessoal: z.string().optional(),
  })).optional().default([]),
});

const sanitizeNullableString = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toDateOrUndefined = (value?: string | null) => {
  const sanitized = sanitizeNullableString(value ?? undefined);
  if (!sanitized) {
    return undefined;
  }

  const parsed = new Date(sanitized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const buildWhere = (params: URLSearchParams): Prisma.AdolescenteWhereInput => {
  const status = sanitizeNullableString(params.get("status"));
  const busca = sanitizeNullableString(params.get("busca"));
  const casaId = sanitizeNullableString(params.get("casa_id"));
  const grupoId = sanitizeNullableString(params.get("grupo_id"));

  const where: Prisma.AdolescenteWhereInput = {};

  if (
    status &&
    ["ATIVO", "TRANSFERIDO", "LIBERADO", "EVADIDO"].includes(status)
  ) {
    where.statusUnidade = status;
  }

  if (busca) {
    where.OR = [
      { nomeCompleto: { contains: busca, mode: "insensitive" } },
      { numeroSms: { contains: busca } },
      { numeroProcesso: { contains: busca, mode: "insensitive" } },
    ];
  }

  if (casaId) {
    where.alojamentoAtual = { is: { casaId } };
  }

  if (grupoId) {
    where.gruposMembros = {
      some: {
        grupoId,
        dataSaida: null,
      },
    };
  }

  return where;
};

const parsePagination = (params: URLSearchParams) => {
  const pageRaw = Number.parseInt(params.get("page") ?? "1", 10);
  const limitRaw = Number.parseInt(params.get("limit") ?? "50", 10);

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limitCandidate =
    Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50;
  const limit = Math.min(limitCandidate, LIST_LIMIT_MAX);

  return { page, limit };
};

export async function GET(
  request: NextRequest
): Promise<NextResponse<ListaAdolescentesResponse | { erro: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const where = buildWhere(searchParams);
    const { page, limit } = parsePagination(searchParams);

    const [records, total] = await Promise.all([
      prisma.adolescente.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: INCLUDE_ADOLESCENTE_DEFAULT,
        orderBy: { nomeCompleto: "asc" },
      }),
      prisma.adolescente.count({ where }),
    ]);

    const data = records.map<Adolescente>(mapPrismaAdolescente);
    const meta: ListaAdolescentesMeta = {
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };

    return NextResponse.json({ data, meta });
  } catch (error) {
    console.error("Erro ao buscar adolescentes:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar adolescentes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido, esperado JSON" },
        { status: 400 }
      );
    }

    const validated = createAdolescenteSchema.parse(payload);

    const session = await auth().catch(() => null);
    const operadorId = sanitizeNullableString(session?.user?.id);

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
        { erro: "Operador sem permissao" },
        { status: 403 }
      );
    }

    const data: Prisma.AdolescenteCreateInput = {
      nomeCompleto: validated.nomeCompleto,
      nomeSocial: validated.nomeSocial ?? undefined,
      fotoUrl: validated.fotoUrl ?? undefined,
      numeroSms: validated.numeroSms ?? undefined,
      dataNascimento: toDateOrUndefined(validated.dataNascimento),
      dataEntrada: toDateOrUndefined(validated.dataEntrada) ?? new Date(),
      numeroProcesso: validated.numeroProcesso ?? undefined,
      atoInfracionalAtual: validated.atoInfracionalAtual ?? undefined,
      statusUnidade: validated.statusUnidade,
      faccao: validated.faccaoGrupoId
        ? { connect: { id: validated.faccaoGrupoId } }
        : undefined,
      faccaoNumeroMembro: validated.faccaoNumeroMembro ?? undefined,
      bairroOrigem: validated.bairroOrigemId
        ? { connect: { id: validated.bairroOrigemId } }
        : undefined,
      riscoFuga: validated.riscoFuga ?? undefined,
      alertaRiscoSuicidio: validated.alertaRiscoSuicidio,
      alertaPerfilMapeado: validated.alertaPerfilMapeado,
      alertaSaudeConfidencial: validated.alertaSaudeConfidencial,
      alertaSaudeDetalhes: validated.alertaSaudeDetalhes ?? undefined,
      alojamentoAtual: validated.alojamentoAtualId
        ? { connect: { id: validated.alojamentoAtualId } }
        : undefined,
      faseInternacaoAtual: validated.faseInternacaoAtualId
        ? { connect: { id: validated.faseInternacaoAtualId } }
        : undefined,
    };

    const criado = await prisma.adolescente.create({
      data,
      include: INCLUDE_ADOLESCENTE_DEFAULT,
    });

    // Criar vinculações de tatuagens se houver
    if (validated.tatuagens && validated.tatuagens.length > 0) {
      await prisma.adolescenteTatuagem.createMany({
        data: validated.tatuagens.map((tat) => ({
          adolescenteId: criado.id,
          tatuagemCatalogoId: tat.catalogoId,
          localCorpo: tat.localCorpo,
          observacoes: tat.observacoes || null,
          significadoPessoal: tat.significadoPessoal || null,
        })),
      });
    }

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "INSERT",
        tabelaAfetada: "adolescentes",
        registroIdAfetado: criado.id,
        detalhesAlteracao: {
          nomeCompleto: criado.nomeCompleto,
          numeroSms: criado.numeroSms,
          tatuagens: validated.tatuagens?.length || 0,
        },
        ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    return NextResponse.json(
      {
        mensagem: "Adolescente cadastrado com sucesso",
        adolescente: mapPrismaAdolescente(criado),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao cadastrar adolescente:", error);
    return NextResponse.json(
      { erro: "Erro ao cadastrar adolescente" },
      { status: 500 }
    );
  }
}
