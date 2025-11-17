import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  INCLUDE_ADOLESCENTE_DEFAULT,
  mapPrismaAdolescente,
} from "@/lib/adolescentes/transformers";
import {
  garantirNumeroInternoDisponivel,
  NumeroInternoIndisponivelError,
} from "@/lib/adolescentes/numeracao";
import {
  aplicarAlertasEspeciais,
  mapearAlertasEspeciaisDoPayload,
} from "@/lib/alertas/sincronizar-especiais";
import {
  ALERTA_ESPECIAL_TIPOS,
  type AlertaEspecialTipo,
} from "@/lib/alertas/especiais";
import { emitMapaEvent } from "@/lib/mapa-event-bus";
import type {
  Adolescente,
  ListaAdolescentesMeta,
  ListaAdolescentesResponse,
} from "@/types";

const LIST_LIMIT_MAX = 100;

const ALERTA_ESPECIAL_ENUM = z.enum(
  ALERTA_ESPECIAL_TIPOS as [
    AlertaEspecialTipo,
    ...AlertaEspecialTipo[]
  ]
);

const alertaEspecialSchema = z.object({
  tipo: ALERTA_ESPECIAL_ENUM,
  descricao: z.string().optional().nullable(),
});

const historicoRegistroSchema = z
  .array(
    z.object({
      descricao: z
        .string()
        .min(3, "Descrição do histórico deve ter ao menos 3 caracteres"),
      ano: z.union([z.string(), z.number()]).optional().nullable(),
      unidade: z.string().optional().nullable(),
      observacoes: z.string().optional().nullable(),
    })
  )
  .optional();

const createAdolescenteSchema = z.object({
  nomeCompleto: z.string().min(3, "Nome deve ter no minimo 3 caracteres"),
  nomeSocial: z.string().optional().nullable(),
  fotoUrl: z.string().url().optional().nullable(),
  numeroSms: z.string().optional().nullable(),
  numeroInterno: z
    .number({ invalid_type_error: "Numero interno deve ser numerico" })
    .int("Numero interno deve ser inteiro")
    .min(1, "Numero interno deve estar entre 1 e 86")
    .max(86, "Numero interno deve estar entre 1 e 86")
    .optional()
    .nullable(),
  dataNascimento: z.string().optional().nullable(),
  dataEntrada: z.string().optional().nullable(),
  dataDesinternacao: z.string().optional().nullable(),
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
  historicoInfracional: historicoRegistroSchema,
  tecnicoReferenciaId: z.string().uuid().optional().nullable(),
  alertasEspeciais: z.array(alertaEspecialSchema).optional().default([]),
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

type HistoricoEntrada = {
  atoInfracionalDescricao: string;
  atoInfracionalAno: number | null;
  atoInfracionalProcesso: string | null;
  atoInfracionalGravidade: boolean;
  atoInfracionalGravidadeObs: string | null;
  unidadeInternacao: string | null;
  ano: number | null;
  observacoes: string | null;
};

const parseHistoricoPayload = (
  registros?: Array<{
    descricao: string;
    ano?: string | number | null;
    unidade?: string | null;
    observacoes?: string | null;
  }>
): HistoricoEntrada[] => {
  if (!registros || registros.length === 0) {
    return [];
  }

  const entradas: HistoricoEntrada[] = [];
  const chaves = new Set<string>();

  registros.forEach((item) => {
    const descricao = sanitizeNullableString(item.descricao) ?? "";
    if (!descricao) {
      return;
    }

    const anoInformado =
      item.ano === null || item.ano === undefined || item.ano === ""
        ? null
        : Number.parseInt(String(item.ano), 10);
    const anoValido =
      anoInformado !== null && !Number.isNaN(anoInformado)
        ? anoInformado
        : null;

    const entrada: HistoricoEntrada = {
      atoInfracionalDescricao: descricao,
      atoInfracionalAno: anoValido,
      atoInfracionalProcesso: null,
      atoInfracionalGravidade: false,
      atoInfracionalGravidadeObs: null,
      unidadeInternacao: sanitizeNullableString(item.unidade ?? undefined) ?? null,
      ano: anoValido,
      observacoes: sanitizeNullableString(item.observacoes ?? undefined) ?? null,
    };

    const chave = buildHistoricoKey(entrada);
    if (chaves.has(chave)) {
      return;
    }

    chaves.add(chave);
    entradas.push(entrada);
  });

  return entradas;
};

const buildHistoricoKey = (entrada: HistoricoEntrada) =>
  [
    entrada.atoInfracionalDescricao.trim().toLowerCase(),
    entrada.atoInfracionalAno ?? "",
    entrada.atoInfracionalProcesso ?? "",
    entrada.unidadeInternacao ?? "",
    entrada.observacoes ?? "",
  ].join("|");

const buildWhere = (params: URLSearchParams): Prisma.AdolescenteWhereInput => {
  const status = sanitizeNullableString(params.get("status"));
  const busca = sanitizeNullableString(params.get("busca"));
  const casaId = sanitizeNullableString(params.get("casa_id"));
  const grupoId = sanitizeNullableString(params.get("grupo_id"));
  const numeroInternoParam = sanitizeNullableString(
    params.get("numero_interno")
  );

  const where: Prisma.AdolescenteWhereInput = {};

  if (
    status &&
    ["ATIVO", "TRANSFERIDO", "LIBERADO", "EVADIDO"].includes(status)
  ) {
    where.statusUnidade = status;
  }

  if (busca) {
    const or: Prisma.AdolescenteWhereInput[] = [
      { nomeCompleto: { contains: busca, mode: "insensitive" } },
      { numeroSms: { contains: busca } },
      { numeroProcesso: { contains: busca, mode: "insensitive" } },
    ];
    const numeroBusca = Number.parseInt(busca, 10);
    if (Number.isFinite(numeroBusca)) {
      or.push({ numeroInterno: numeroBusca });
    }
    where.OR = or;
  }

  if (numeroInternoParam) {
    const numero = Number.parseInt(numeroInternoParam, 10);
    if (Number.isFinite(numero)) {
      where.numeroInterno = numero;
    }
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
    const alertasEspeciaisSelecionados = mapearAlertasEspeciaisDoPayload(
      validated.alertasEspeciais,
      {
        riscoSuicidio: {
          ativo: validated.alertaRiscoSuicidio,
          descricao: undefined,
        },
        perfilMapeado: {
          ativo: validated.alertaPerfilMapeado,
          descricao: undefined,
        },
        saudeConfidencial: {
          ativo: validated.alertaSaudeConfidencial,
          descricao: validated.alertaSaudeDetalhes ?? undefined,
        },
      }
    );
    const historicoNovos = parseHistoricoPayload(
      validated.historicoInfracional
    );

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

    const statusCriado = validated.statusUnidade ?? "ATIVO";
    const numeroInternoInformado =
      validated.numeroInterno === undefined
        ? undefined
        : validated.numeroInterno === null
        ? null
        : validated.numeroInterno;

    if (statusCriado === "ATIVO") {
      if (numeroInternoInformado === undefined || numeroInternoInformado === null) {
        return NextResponse.json(
          { erro: "Informe o numero interno (1 a 86) para adolescentes ativos" },
          { status: 400 }
        );
      }
    } else if (
      numeroInternoInformado !== undefined &&
      numeroInternoInformado !== null
    ) {
      return NextResponse.json(
        { erro: "Somente adolescentes ativos podem ter numero interno" },
        { status: 400 }
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
      statusUnidade: statusCriado,
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
      tecnicoReferencia: validated.tecnicoReferenciaId
        ? { connect: { id: validated.tecnicoReferenciaId } }
        : undefined,
      numeroInterno:
        statusCriado === "ATIVO" && numeroInternoInformado !== undefined
          ? numeroInternoInformado ?? undefined
          : undefined,
    };
    const dataDesinternacaoTransformada = toDateOrUndefined(
      validated.dataDesinternacao
    );
    if (validated.statusUnidade !== "ATIVO") {
      if (!dataDesinternacaoTransformada) {
        return NextResponse.json(
          { erro: "Data de desinternacao obrigatoria para status inativo" },
          { status: 400 }
        );
      }
      data.dataDesinternacao = dataDesinternacaoTransformada;
    } else if (dataDesinternacaoTransformada) {
      data.dataDesinternacao = dataDesinternacaoTransformada;
    }

    const numeroParaValidar =
      statusCriado === "ATIVO" ? numeroInternoInformado ?? null : null;

    const criado = await prisma.$transaction(async (tx) => {
      if (numeroParaValidar) {
        await garantirNumeroInternoDisponivel(tx, numeroParaValidar);
      }

      const base = await tx.adolescente.create({ data });

      if (validated.tatuagens && validated.tatuagens.length > 0) {
        await tx.adolescenteTatuagem.createMany({
          data: validated.tatuagens.map((tat) => ({
            adolescenteId: base.id,
            tatuagemCatalogoId: tat.catalogoId,
            localCorpo: tat.localCorpo,
            observacoes: tat.observacoes || null,
            significadoPessoal: tat.significadoPessoal || null,
          })),
        });
      }

      if (historicoNovos.length > 0) {
        await tx.adolescenteHistoricoInfracional.createMany({
          data: historicoNovos.map((entrada) => ({
            adolescenteId: base.id,
            atoInfracionalDescricao: entrada.atoInfracionalDescricao,
            atoInfracionalAno: entrada.atoInfracionalAno,
            atoInfracionalProcesso: entrada.atoInfracionalProcesso,
            atoInfracionalGravidade: entrada.atoInfracionalGravidade,
            atoInfracionalGravidadeObs: entrada.atoInfracionalGravidadeObs,
            unidadeInternacao: entrada.unidadeInternacao,
            ano: entrada.ano,
            observacoes: entrada.observacoes,
          })),
        });
      }

      await aplicarAlertasEspeciais(
        tx,
        base.id,
        alertasEspeciaisSelecionados
      );

      return tx.adolescente.findUnique({
        where: { id: base.id },
        include: INCLUDE_ADOLESCENTE_DEFAULT,
      });
    });

    if (!criado) {
      throw new Error("Falha ao carregar adolescente apos cadastro");
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

    if (criado.alojamentoAtualId) {
      emitMapaEvent({
        tipo: "alocacao",
        adolescenteId: criado.id,
        alojamentoId: criado.alojamentoAtualId,
      });
    }

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
    if (error instanceof NumeroInternoIndisponivelError) {
      return NextResponse.json(
        {
          erro: `Numero interno ${error.numero} indisponivel. Atualmente atribuido a ${error.titular}.`,
        },
        { status: 409 }
      );
    }

    console.error("Erro ao cadastrar adolescente:", error);
    return NextResponse.json(
      { erro: "Erro ao cadastrar adolescente" },
      { status: 500 }
    );
  }
}
