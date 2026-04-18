// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { resolveUserPermissions } from "@/lib/auth/resolve-permissions";
import {
  INCLUDE_ADOLESCENTE_DEFAULT,
  SELECT_ADOLESCENTE_LISTA,
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
  ALERTA_NIVEL_RISCO_VARIADIC,
  type AlertaEspecialTipo,
  type AlertaNivelRisco,
} from "@/lib/alertas/especiais";
import { emitMapaEvent } from "@/lib/mapa-event-bus";
import { invalidateAdolescentesMapaCache } from "@/lib/estrutura/adolescentes-cache";
import type {
  Adolescente,
  ListaAdolescentesMeta,
  ListaAdolescentesResponse,
} from "@/types";

const LIST_LIMIT_MAX = 100;

const ALERTA_ESPECIAL_ENUM = z.enum(
  ALERTA_ESPECIAL_TIPOS as [AlertaEspecialTipo, ...AlertaEspecialTipo[]],
);
const ALERTA_NIVEL_ENUM = z.enum(ALERTA_NIVEL_RISCO_VARIADIC);
const FACCAO_ORIGEM_ENUM = z.enum([
  "CONFESSADA",
  "OBSERVACAO",
  "INTELIGENCIA",
  "TERCEIROS",
  "NAO_INFORMADO",
  "OUTRO_INTERNO",
]);

const alertaEspecialSchema = z.object({
  tipo: ALERTA_ESPECIAL_ENUM,
  descricao: z.string().optional().nullable(),
  nivelRisco: ALERTA_NIVEL_ENUM.optional().nullable(),
});

const historicoRegistroSchema = z
  .array(
    z.object({
      id: z.string().uuid().optional().nullable(),
      descricao: z
        .string()
        .min(3, "Descrição do histórico deve ter ao menos 3 caracteres"),
      ano: z.union([z.string(), z.number()]).optional().nullable(),
      processo: z.string().optional().nullable(),
      comarca: z.string().optional().nullable(),
      unidade: z.string().optional().nullable(),
      observacoes: z.string().optional().nullable(),
      catalogoId: z.string().uuid().optional().nullable(),
    }),
  )
  .optional();

const vinculoInfracionalSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  descricao: z
    .string()
    .min(3, "Descrição do vínculo deve ter ao menos 3 caracteres"),
  adolescentesIds: z.array(z.string().uuid()).optional().default([]),
});

const casoTipificacaoSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  ordem: z.number().int().positive().optional().nullable(),
  catalogoId: z.string().uuid().optional().nullable(),
  descricao: z.string().optional().nullable(),
  principal: z.boolean().optional(),
  naturezaExecucao: z.enum(["CONSUMADO", "TENTADO"]).optional().nullable(),
  qualificadora: z.string().optional().nullable(),
  majorante: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

const casoInfracionalSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  status: z.string().optional().nullable(),
  numeroProcesso: z.string().optional().nullable(),
  anoFato: z.union([z.string(), z.number()]).optional().nullable(),
  comarca: z.string().optional().nullable(),
  narrativa: z.string().optional().nullable(),
  tipificacoes: z.array(casoTipificacaoSchema).optional().default([]),
});

const createAdolescenteSchema = z.object({
  nomeCompleto: z.string().min(3, "Nome deve ter no minimo 3 caracteres"),
  nomeSocial: z.string().optional().nullable(),
  vulgo: z.string().optional().nullable(),
  fotoUrl: z.string().url().optional().nullable(),
  numeroSms: z.string().optional().nullable(),
  numeroInterno: z
    .number({ invalid_type_error: "Número interno deve ser numerico" })
    .int("Número interno deve ser inteiro")
    .min(1, "Número interno deve estar entre 1 e 86")
    .max(86, "Número interno deve estar entre 1 e 86")
    .optional()
    .nullable(),
  dataNascimento: z.string().optional().nullable(),
  dataEntrada: z.string().optional().nullable(),
  dataDesinternacao: z.string().optional().nullable(),
  statusUnidade: z
    .enum(["ATIVO", "TRANSFERIDO", "LIBERADO", "EVADIDO"])
    .default("ATIVO"),
  faccaoGrupoId: z.string().uuid().optional().nullable(),
  faccaoFuncao: z.string().optional().nullable(),
  faccaoInformacaoOrigem: FACCAO_ORIGEM_ENUM.optional().nullable(),
  faccaoInformacaoDetalhe: z.string().optional().nullable(),
  faccaoInformanteAdolescenteId: z.string().uuid().optional().nullable(),
  bairroOrigemId: z.string().uuid().optional().nullable(),
  riscoFuga: z.enum(["BAIXO", "MEDIO", "ALTO"]).optional().nullable(),
  alertaRiscoSuicidio: z.boolean().default(false),
  alertaPerfilMapeado: z.boolean().default(false),
  alertaSaudeConfidencial: z.boolean().default(false),
  alertaSaudeDetalhes: z.string().optional().nullable(),
  alojamentoAtualId: z.string().uuid().optional().nullable(),
  faseInternacaoAtualId: z.string().uuid().optional().nullable(),
  tatuagens: z
    .array(
      z.object({
        catalogoId: z.string().uuid(),
        localCorpo: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
        significadoPessoal: z.string().optional().nullable(),
      }),
    )
    .optional()
    .default([]),
  historicoInfracional: historicoRegistroSchema,
  casoInfracionalAtual: casoInfracionalSchema.optional().nullable(),
  casosInfracionais: z.array(casoInfracionalSchema).optional().default([]),
  tecnicosReferenciaIds: z.array(z.string().uuid()).optional().default([]),
  alertasEspeciais: z.array(alertaEspecialSchema).optional().default([]),
  atoInfracionalVinculos: z
    .array(vinculoInfracionalSchema)
    .optional()
    .default([]),
});

const sanitizeNullableString = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizarTextoBusca = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

const toDateOrUndefined = (value?: string | null) => {
  const sanitized = sanitizeNullableString(value ?? undefined);
  if (!sanitized) {
    return undefined;
  }

  const parsed = new Date(sanitized);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() < 1900) {
    return undefined;
  }
  return parsed;
};

type HistoricoEntrada = {
  id?: string | null;
  atoInfracionalDescricao: string;
  atoInfracionalAno: number | null;
  atoInfracionalProcesso: string | null;
  atoInfracionalGravidade: boolean;
  atoInfracionalGravidadeObs: string | null;
  unidadeInternacao: string | null;
  ano: number | null;
  observacoes: string | null;
  catalogoId: string | null;
};

type VinculoEntrada = {
  id?: string | null;
  descricao: string;
  adolescentesIds: string[];
};

type CasoTipificacaoEntrada = {
  id?: string | null;
  ordem: number;
  catalogoId: string | null;
  descricaoManual: string | null;
  principal: boolean;
  naturezaExecucao: "CONSUMADO" | "TENTADO" | null;
  qualificadora: string | null;
  majorante: string | null;
  observacoes: string | null;
};

type CasoInfracionalEntrada = {
  id?: string | null;
  status: string | null;
  numeroProcesso: string | null;
  anoFato: number | null;
  comarca: string | null;
  narrativa: string | null;
  tipificacoes: CasoTipificacaoEntrada[];
};

const parseCasoTipificacoes = (
  tipificacoes?: Array<{
    id?: string | null;
    ordem?: number | null;
    catalogoId?: string | null;
    descricao?: string | null;
    principal?: boolean;
    naturezaExecucao?: "CONSUMADO" | "TENTADO" | null;
    qualificadora?: string | null;
    majorante?: string | null;
    observacoes?: string | null;
  }>,
): CasoTipificacaoEntrada[] =>
  (tipificacoes ?? [])
    .map((tipificacao, indiceTipificacao) => {
      const descricaoManual =
        sanitizeNullableString(tipificacao.descricao ?? undefined) ?? null;
      const catalogoId =
        typeof tipificacao.catalogoId === "string" &&
        tipificacao.catalogoId.length > 0
          ? tipificacao.catalogoId
          : null;
      if (!catalogoId && !descricaoManual) {
        return null;
      }

      return {
        id: typeof tipificacao.id === "string" ? tipificacao.id : null,
        ordem: tipificacao.ordem ?? indiceTipificacao + 1,
        catalogoId,
        descricaoManual,
        principal: tipificacao.principal ?? indiceTipificacao === 0,
        naturezaExecucao:
          tipificacao.naturezaExecucao === "CONSUMADO" ||
          tipificacao.naturezaExecucao === "TENTADO"
            ? tipificacao.naturezaExecucao
            : null,
        qualificadora:
          sanitizeNullableString(tipificacao.qualificadora ?? undefined) ?? null,
        majorante:
          sanitizeNullableString(tipificacao.majorante ?? undefined) ?? null,
        observacoes:
          sanitizeNullableString(tipificacao.observacoes ?? undefined) ?? null,
      };
    })
    .filter((item): item is CasoTipificacaoEntrada => item !== null);

const parseHistoricoPayload = (
  registros?: Array<{
    id?: string | null;
    descricao: string;
    ano?: string | number | null;
    processo?: string | null;
    comarca?: string | null;
    unidade?: string | null;
    observacoes?: string | null;
  }>,
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
      id: typeof (item as any).id === "string" ? (item as any).id : null,
      atoInfracionalDescricao: descricao,
      atoInfracionalAno: anoValido,
      atoInfracionalProcesso:
        sanitizeNullableString((item as any).processo ?? undefined) ?? null,
      atoInfracionalGravidade: false,
      atoInfracionalGravidadeObs: null,
      unidadeInternacao:
        sanitizeNullableString(
          (item as any).comarca ?? item.unidade ?? undefined,
        ) ?? null,
      ano: anoValido,
      observacoes:
        sanitizeNullableString(item.observacoes ?? undefined) ?? null,
      catalogoId:
        typeof (item as any).catalogoId === "string" &&
        (item as any).catalogoId.length > 0
          ? (item as any).catalogoId
          : null,
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

const parseVinculosPayload = (
  vinculos?: Array<{
    id?: string | null;
    descricao?: string | null;
    adolescentesIds?: string[] | null;
  }>,
): VinculoEntrada[] => {
  if (!vinculos || vinculos.length === 0) {
    return [];
  }

  const entradas: VinculoEntrada[] = [];
  const chaves = new Set<string>();

  vinculos.forEach((item) => {
    const descricao = sanitizeNullableString(item.descricao ?? undefined);
    if (!descricao || descricao.length < 3) {
      return;
    }
    const ids = Array.from(
      new Set(
        Array.isArray(item.adolescentesIds)
          ? item.adolescentesIds.filter(Boolean)
          : [],
      ),
    );
    if (ids.length === 0) {
      return;
    }
    const chave = `${descricao.toLowerCase()}|${ids.slice().sort().join(",")}`;
    if (chaves.has(chave)) {
      return;
    }
    chaves.add(chave);
    entradas.push({
      id: typeof item.id === "string" ? item.id : null,
      descricao,
      adolescentesIds: ids,
    });
  });

  return entradas;
};

const parseCasoInfracionalPayload = (
  caso?: {
    id?: string | null;
    status?: string | null;
    numeroProcesso?: string | null;
    anoFato?: string | number | null;
    comarca?: string | null;
    narrativa?: string | null;
    tipificacoes?: Array<{
      id?: string | null;
      ordem?: number | null;
      catalogoId?: string | null;
      descricao?: string | null;
      principal?: boolean;
      naturezaExecucao?: "CONSUMADO" | "TENTADO" | null;
      qualificadora?: string | null;
      majorante?: string | null;
      observacoes?: string | null;
    }>;
  } | null,
): CasoInfracionalEntrada | null => {
  if (!caso) {
    return null;
  }

  const anoInformado =
    caso.anoFato === null || caso.anoFato === undefined || caso.anoFato === ""
      ? null
      : Number.parseInt(String(caso.anoFato), 10);
  const anoFato =
    anoInformado !== null && !Number.isNaN(anoInformado) ? anoInformado : null;

  const numeroProcesso =
    sanitizeNullableString(caso.numeroProcesso ?? undefined) ?? null;
  const comarca = sanitizeNullableString(caso.comarca ?? undefined) ?? null;
  const narrativa = sanitizeNullableString(caso.narrativa ?? undefined) ?? null;
  const tipificacoes = parseCasoTipificacoes(caso.tipificacoes);

  if (
    !numeroProcesso &&
    anoFato === null &&
    !comarca &&
    !narrativa &&
    tipificacoes.length === 0
  ) {
    return null;
  }

  return {
    id: typeof caso.id === "string" ? caso.id : null,
    status: sanitizeNullableString(caso.status ?? undefined) ?? null,
    numeroProcesso,
    anoFato,
    comarca,
    narrativa,
    tipificacoes,
  };
};

const parseCasosInfracionaisPayload = (
  casos?: Array<{
    id?: string | null;
    status?: string | null;
    numeroProcesso?: string | null;
    anoFato?: string | number | null;
    comarca?: string | null;
    narrativa?: string | null;
    tipificacoes?: Array<{
      id?: string | null;
      ordem?: number | null;
      catalogoId?: string | null;
      descricao?: string | null;
      principal?: boolean;
      naturezaExecucao?: "CONSUMADO" | "TENTADO" | null;
      qualificadora?: string | null;
      majorante?: string | null;
      observacoes?: string | null;
    }>;
  }> | null,
): CasoInfracionalEntrada[] =>
  (casos ?? [])
    .map((caso) => parseCasoInfracionalPayload(caso))
    .filter((caso): caso is CasoInfracionalEntrada => Boolean(caso))
    .map((caso) => ({
      ...caso,
      status: caso.status ?? "HISTORICO",
    }));

const converterHistoricoLegadoParaCasos = (
  historico: HistoricoEntrada[],
): CasoInfracionalEntrada[] =>
  historico.map((entrada) => ({
    id: entrada.id ?? null,
    status: "HISTORICO",
    numeroProcesso: entrada.atoInfracionalProcesso ?? null,
    anoFato: entrada.atoInfracionalAno ?? entrada.ano ?? null,
    comarca: entrada.unidadeInternacao ?? null,
    narrativa: null,
    tipificacoes: [
      {
        ordem: 1,
        catalogoId: entrada.catalogoId ?? null,
        descricaoManual: entrada.atoInfracionalDescricao,
        principal: true,
        naturezaExecucao: null,
        qualificadora: null,
        majorante: null,
        observacoes: entrada.observacoes ?? null,
      },
    ],
  }));

const buildHistoricoKey = (entrada: HistoricoEntrada) =>
  [
    entrada.atoInfracionalDescricao.trim().toLowerCase(),
    entrada.atoInfracionalAno ?? "",
    entrada.atoInfracionalProcesso ?? "",
    entrada.unidadeInternacao ?? "",
    entrada.observacoes ?? "",
  ].join("|");

const compensarCadastroAdolescente = async (
  adolescenteId: string,
  vinculoIdsCriados: string[],
) => {
  try {
    await prisma.adolescente.update({
      where: { id: adolescenteId },
      data: { faccaoVinculoAtualId: null },
    });
  } catch {}

  await prisma.adolescenteTatuagem.deleteMany({
    where: { adolescenteId },
  });
  await prisma.adolescenteHistoricoInfracional.deleteMany({
    where: { adolescenteId },
  });
  await (prisma as any).adolescenteFaccaoHistorico.deleteMany({
    where: { adolescenteId },
  });
  await prisma.adolescenteTecnicoReferencia.deleteMany({
    where: { adolescenteId },
  });
  await prisma.alertaAtivo.deleteMany({
    where: { adolescenteId },
  });
  await prisma.atoInfracionalVinculoAdolescente.deleteMany({
    where: { adolescenteId },
  });

  if (vinculoIdsCriados.length > 0) {
    await prisma.atoInfracionalVinculo.deleteMany({
      where: { id: { in: vinculoIdsCriados } },
    });
  }

  await prisma.adolescente.delete({
    where: { id: adolescenteId },
  });
};

const buildWhere = (
  params: URLSearchParams,
  options?: { aplicarBuscaTexto?: boolean },
): Prisma.AdolescenteWhereInput => {
  const status = sanitizeNullableString(params.get("status"));
  const busca = sanitizeNullableString(params.get("busca"));
  const casaId = sanitizeNullableString(params.get("casa_id"));
  const grupoId = sanitizeNullableString(params.get("grupo_id"));
  const numeroInternoParam = sanitizeNullableString(
    params.get("numero_interno"),
  );
  const aplicarBuscaTexto = options?.aplicarBuscaTexto ?? true;

  const where: Prisma.AdolescenteWhereInput = {};

  if (
    status &&
    ["ATIVO", "TRANSFERIDO", "LIBERADO", "EVADIDO"].includes(status)
  ) {
    where.statusUnidade = status;
  }

  const excluirGrupos = params.get("excluir_grupos") === "true";

  if (excluirGrupos) {
    where.gruposMembros = {
      none: {
        dataSaida: null,
      },
    };
  }

  if (busca) {
    const or: Prisma.AdolescenteWhereInput[] = [];
    if (aplicarBuscaTexto) {
      or.push(
        { nomeCompleto: { contains: busca, mode: "insensitive" } },
        { numeroSms: { contains: busca } },
        {
          casosInfracionais: {
            some: {
              numeroProcesso: { contains: busca, mode: "insensitive" },
            },
          },
        },
      );
    }
    const numeroBusca = Number.parseInt(busca, 10);
    if (Number.isFinite(numeroBusca)) {
      or.push({ numeroInterno: numeroBusca });
    }
    if (or.length > 0) {
      where.OR = or;
    }
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
  request: NextRequest,
): Promise<NextResponse<ListaAdolescentesResponse | { erro: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const busca = sanitizeNullableString(searchParams.get("busca"));
    const ignorarAcentos = searchParams.get("ignorar_acentos") === "true";
    const usarBuscaSemAcento = Boolean(busca && ignorarAcentos);
    const where = buildWhere(searchParams, {
      aplicarBuscaTexto: !usarBuscaSemAcento,
    });
    const { page, limit } = parsePagination(searchParams);
    const modo = searchParams.get("modo");
    const modoLista = modo === "lista" || modo === "resumo";

    if (usarBuscaSemAcento && busca) {
      const termoNormalizado = normalizarTextoBusca(busca);
      const candidatos = await prisma.adolescente.findMany({
        where,
        orderBy: { nomeCompleto: "asc" },
        select: {
          id: true,
          nomeCompleto: true,
          numeroSms: true,
          numeroInterno: true,
          casosInfracionais: {
            where: { status: "ATUAL" },
            take: 1,
            select: {
              numeroProcesso: true,
            },
          },
        },
      });

      const idsFiltrados = candidatos
        .filter((item) => {
          const nome = normalizarTextoBusca(item.nomeCompleto);
          const sms = normalizarTextoBusca(item.numeroSms);
          const processo = normalizarTextoBusca(
            item.casosInfracionais?.[0]?.numeroProcesso ?? null
          );
          const numeroInterno = item.numeroInterno
            ? String(item.numeroInterno)
            : "";

          return (
            nome.includes(termoNormalizado) ||
            sms.includes(termoNormalizado) ||
            processo.includes(termoNormalizado) ||
            numeroInterno.includes(termoNormalizado)
          );
        })
        .map((item) => item.id);

      const total = idsFiltrados.length;
      const inicio = (page - 1) * limit;
      const idsPaginados = idsFiltrados.slice(inicio, inicio + limit);

      if (idsPaginados.length === 0) {
        const meta: ListaAdolescentesMeta = {
          total,
          page,
          limit,
          hasMore: false,
        };
        return NextResponse.json({ data: [], meta });
      }

      const records = await prisma.adolescente.findMany({
        where: { id: { in: idsPaginados } },
        ...(modoLista
          ? { select: SELECT_ADOLESCENTE_LISTA }
          : { include: INCLUDE_ADOLESCENTE_DEFAULT }),
      });

      const ordemIds = new Map(idsPaginados.map((id, index) => [id, index]));
      records.sort(
        (a, b) =>
          (ordemIds.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (ordemIds.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      );

      const alertasPendentesMap = new Map<string, number>();
      if (!modoLista && records.length > 0) {
        const pendentes = await prisma.alertaAtivo.groupBy({
          by: ["adolescenteId"],
          where: {
            adolescenteId: { in: records.map((record) => record.id) },
            desativadoEm: { not: null },
          },
          _count: { _all: true },
        });

        pendentes.forEach((item) => {
          alertasPendentesMap.set(item.adolescenteId, item._count._all);
        });
      }

      const data = records.map<Adolescente>((record) => {
        const mapped = mapPrismaAdolescente(record);
        mapped.alertasPendentes = alertasPendentesMap.get(record.id) ?? 0;
        return mapped;
      });

      const meta: ListaAdolescentesMeta = {
        total,
        page,
        limit,
        hasMore: page * limit < total,
      };

      return NextResponse.json({ data, meta });
    }

    const [records, total] = await Promise.all([
      prisma.adolescente.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        ...(modoLista
          ? { select: SELECT_ADOLESCENTE_LISTA }
          : { include: INCLUDE_ADOLESCENTE_DEFAULT }),
        orderBy: { nomeCompleto: "asc" },
      }),
      prisma.adolescente.count({ where }),
    ]);

    const alertasPendentesMap = new Map<string, number>();
    if (!modoLista && records.length > 0) {
      const pendentes = await prisma.alertaAtivo.groupBy({
        by: ["adolescenteId"],
        where: {
          adolescenteId: { in: records.map((record) => record.id) },
          desativadoEm: { not: null },
        },
        _count: { _all: true },
      });

      pendentes.forEach((item) => {
        alertasPendentesMap.set(item.adolescenteId, item._count._all);
      });
    }

    const data = records.map<Adolescente>((record) => {
      const mapped = mapPrismaAdolescente(record);
      mapped.alertasPendentes = alertasPendentesMap.get(record.id) ?? 0;
      return mapped;
    });
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
      { status: 500 },
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
        { status: 400 },
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
      },
    );
    const historicoNovos = parseHistoricoPayload(
      validated.historicoInfracional,
    );
    const casoInfracionalAtual = parseCasoInfracionalPayload(
      validated.casoInfracionalAtual,
    );
    const casosInfracionaisHistoricos =
      validated.casosInfracionais && validated.casosInfracionais.length > 0
        ? parseCasosInfracionaisPayload(validated.casosInfracionais)
        : converterHistoricoLegadoParaCasos(historicoNovos);
    const vinculosNovos = parseVinculosPayload(
      validated.atoInfracionalVinculos,
    );

    const session = await auth().catch(() => null);
    const operadorId = sanitizeNullableString(session?.user?.id);

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 },
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true, funcaoRole: true },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 },
      );
    }

    const permissoes = resolveUserPermissions(session, operadorExiste);
    const podeCadastrar = hasPermission(
      permissoes,
      PERMISSIONS.ADOLESCENTES_CREATE,
    );
    if (!podeCadastrar) {
      return NextResponse.json(
        { erro: "Sem permissao para cadastrar adolescente" },
        { status: 403 },
      );
    }
    const podeAlterarAlojamento = hasPermission(
      permissoes,
      PERMISSIONS.ADOLESCENTES_EDIT_ALOJAMENTO,
    );
    if (validated.alojamentoAtualId !== undefined && !podeAlterarAlojamento) {
      return NextResponse.json(
        { erro: "Sem permissao para alterar alojamento do adolescente" },
        { status: 403 },
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
      if (
        numeroInternoInformado === undefined ||
        numeroInternoInformado === null
      ) {
        return NextResponse.json(
          {
            erro: "Informe o número interno (1 a 86) para adolescentes ativos",
          },
          { status: 400 },
        );
      }
    } else if (
      numeroInternoInformado !== undefined &&
      numeroInternoInformado !== null
    ) {
      return NextResponse.json(
        { erro: "Somente adolescentes ativos podem ter número interno" },
        { status: 400 },
      );
    }

    const vulgoSanitizado = sanitizeNullableString(
      validated.vulgo ?? undefined,
    );
    const faccaoFuncaoSanitizada = sanitizeNullableString(
      validated.faccaoFuncao ?? undefined,
    );
    const faccaoOrigemInfo = validated.faccaoInformacaoOrigem ?? undefined;
    const faccaoOrigemDetalheSanitizado =
      faccaoOrigemInfo === "OBSERVACAO" || faccaoOrigemInfo === "OUTRO_INTERNO"
        ? sanitizeNullableString(validated.faccaoInformacaoDetalhe ?? undefined)
        : undefined;
    const origemFaccaoNormalizada =
      faccaoOrigemInfo ??
      (validated.faccaoGrupoId ? "NAO_INFORMADO" : undefined);
    const tecnicosIds = Array.from(
      new Set(validated.tecnicosReferenciaIds ?? []),
    );
    const numeroSmsSanitizado = sanitizeNullableString(
      validated.numeroSms ?? undefined,
    );

    if (faccaoOrigemInfo === "OBSERVACAO" && !faccaoOrigemDetalheSanitizado) {
      return NextResponse.json(
        {
          erro: "Descreva como a informacao de faccao foi obtida quando a origem for observacao.",
        },
        { status: 400 },
      );
    }
    if (
      faccaoOrigemInfo === "OUTRO_INTERNO" &&
      !validated.faccaoInformanteAdolescenteId
    ) {
      return NextResponse.json(
        {
          erro: "Selecione o adolescente informante quando a origem for Outro interno.",
        },
        { status: 400 },
      );
    }

    if (numeroSmsSanitizado) {
      const existenteSms = await prisma.adolescente.findFirst({
        where: { numeroSms: numeroSmsSanitizado },
        select: {
          id: true,
          nomeCompleto: true,
          numeroSms: true,
        },
      });

      if (existenteSms) {
        return NextResponse.json(
          {
            erro: `Número SMS ja cadastrado para ${existenteSms.nomeCompleto}.`,
            adolescenteExistente: existenteSms,
          },
          { status: 409 },
        );
      }
    }

    const data: Prisma.AdolescenteCreateInput = {
      nomeCompleto: validated.nomeCompleto,
      nomeSocial: validated.nomeSocial ?? undefined,
      fotoUrl: validated.fotoUrl ?? undefined,
      numeroSms: numeroSmsSanitizado ?? undefined,
      vulgo: vulgoSanitizado,
      dataNascimento: toDateOrUndefined(validated.dataNascimento),
      dataEntrada: toDateOrUndefined(validated.dataEntrada) ?? new Date(),
      statusUnidade: statusCriado,
      faccao: validated.faccaoGrupoId
        ? { connect: { id: validated.faccaoGrupoId } }
        : undefined,
      faccaoFuncao: faccaoFuncaoSanitizada,
      faccaoInformacaoOrigem: faccaoOrigemInfo,
      faccaoInformacaoDetalhe: faccaoOrigemDetalheSanitizado,
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
      tecnicosReferencia:
        tecnicosIds.length > 0
          ? {
              create: tecnicosIds.map((id) => ({
                tecnicoReferencia: { connect: { id } },
              })),
            }
          : undefined,
      numeroInterno:
        statusCriado === "ATIVO" && numeroInternoInformado !== undefined
          ? (numeroInternoInformado ?? undefined)
          : undefined,
    };
    const dataDesinternacaoTransformada = toDateOrUndefined(
      validated.dataDesinternacao,
    );
    if (validated.statusUnidade !== "ATIVO") {
      if (!dataDesinternacaoTransformada) {
        return NextResponse.json(
          { erro: "Data de desinternacao obrigatoria para status inativo" },
          { status: 400 },
        );
      }
      data.dataDesinternacao = dataDesinternacaoTransformada;
    } else if (dataDesinternacaoTransformada) {
      data.dataDesinternacao = dataDesinternacaoTransformada;
    }

    const numeroParaValidar =
      statusCriado === "ATIVO" ? (numeroInternoInformado ?? null) : null;

    const vinculosCriados: string[] = [];
    let baseId: string | null = null;
    let criado: any | null = null;

    try {
      if (numeroParaValidar) {
        await garantirNumeroInternoDisponivel(prisma as any, numeroParaValidar);
      }

      const base = await prisma.adolescente.create({ data });
      baseId = base.id;

      // Histórico de facção (primeira declaração)
      if (
        validated.faccaoGrupoId ||
        faccaoFuncaoSanitizada ||
        origemFaccaoNormalizada
      ) {
        const hist = await (prisma as any).adolescenteFaccaoHistorico.create({
          data: {
            adolescenteId: base.id,
            faccaoId: validated.faccaoGrupoId ?? null,
            funcao: faccaoFuncaoSanitizada ?? null,
            origemInformacao: origemFaccaoNormalizada ?? "NAO_INFORMADO",
            nivelConfianca: null,
            statusRegistro: "ATIVA",
            observacao: faccaoOrigemDetalheSanitizado ?? null,
            informanteAdolescenteId:
              faccaoOrigemInfo === "OUTRO_INTERNO"
                ? (validated.faccaoInformanteAdolescenteId ?? null)
                : null,
            criadoPorId: operadorId ?? null,
          },
        });
        await prisma.adolescente.update({
          where: { id: base.id },
          data: { faccaoVinculoAtualId: hist.id } as any,
        });
      }

      if (validated.tatuagens && validated.tatuagens.length > 0) {
        await prisma.adolescenteTatuagem.createMany({
          data: validated.tatuagens.map((tat) => ({
            adolescenteId: base.id,
            tatuagemCatalogoId: tat.catalogoId,
            localCorpo:
              sanitizeNullableString(tat.localCorpo ?? undefined) ?? null,
            observacoes:
              sanitizeNullableString(tat.observacoes ?? undefined) ?? null,
            significadoPessoal:
              sanitizeNullableString(tat.significadoPessoal ?? undefined) ??
              null,
          })),
        });
      }

      if (casoInfracionalAtual) {
        await prisma.adolescenteCasoInfracional.create({
          data: {
            adolescenteId: base.id,
            status: casoInfracionalAtual.status ?? "ATUAL",
            numeroProcesso: casoInfracionalAtual.numeroProcesso,
            anoFato: casoInfracionalAtual.anoFato,
            comarca: casoInfracionalAtual.comarca,
            narrativa: casoInfracionalAtual.narrativa,
            tipificacoes:
              casoInfracionalAtual.tipificacoes.length > 0
                ? {
                    create: casoInfracionalAtual.tipificacoes.map(
                      (tipificacao) => ({
                        ordem: tipificacao.ordem,
                        atoInfracionalCatalogoId:
                          tipificacao.catalogoId ?? undefined,
                        descricaoManual: tipificacao.descricaoManual,
                        principal: tipificacao.principal,
                        naturezaExecucao: tipificacao.naturezaExecucao,
                        qualificadora: tipificacao.qualificadora,
                        majorante: tipificacao.majorante,
                        observacoes: tipificacao.observacoes,
                      }),
                    ),
                  }
                : undefined,
          },
        });
      }

      for (const casoHistorico of casosInfracionaisHistoricos) {
        await prisma.adolescenteCasoInfracional.create({
          data: {
            adolescenteId: base.id,
            status: casoHistorico.status ?? "HISTORICO",
            numeroProcesso: casoHistorico.numeroProcesso,
            anoFato: casoHistorico.anoFato,
            comarca: casoHistorico.comarca,
            narrativa: casoHistorico.narrativa,
            tipificacoes:
              casoHistorico.tipificacoes.length > 0
                ? {
                    create: casoHistorico.tipificacoes.map((tipificacao) => ({
                      ordem: tipificacao.ordem,
                      atoInfracionalCatalogoId:
                        tipificacao.catalogoId ?? undefined,
                      descricaoManual: tipificacao.descricaoManual,
                      principal: tipificacao.principal,
                      naturezaExecucao: tipificacao.naturezaExecucao,
                      qualificadora: tipificacao.qualificadora,
                      majorante: tipificacao.majorante,
                      observacoes: tipificacao.observacoes,
                    })),
                  }
                : undefined,
          },
        });
      }

      if (vinculosNovos.length > 0) {
        for (const entrada of vinculosNovos) {
          const participantes = Array.from(
            new Set([base.id, ...entrada.adolescentesIds]),
          );
          if (participantes.length < 2) {
            continue;
          }
          const vinculoCriado = await prisma.atoInfracionalVinculo.create({
            data: {
              descricao: entrada.descricao,
              adolescentes: {
                create: participantes.map((adolescenteId) => ({
                  adolescente: { connect: { id: adolescenteId } },
                })),
              },
            },
            select: { id: true },
          });
          vinculosCriados.push(vinculoCriado.id);
        }
      }

      await aplicarAlertasEspeciais(
        prisma,
        base.id,
        alertasEspeciaisSelecionados,
        {
          operadorId,
          ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
        },
      );

      criado = await prisma.adolescente.findUnique({
        where: { id: base.id },
        include: INCLUDE_ADOLESCENTE_DEFAULT as any,
      });

      if (!criado) {
        throw new Error("Falha ao carregar adolescente apos cadastro");
      }
    } catch (error) {
      if (baseId) {
        try {
          await compensarCadastroAdolescente(baseId, vinculosCriados);
        } catch (cleanupError) {
          console.error(
            "Erro ao compensar cadastro de adolescente:",
            cleanupError,
          );
        }
      }
      throw error;
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

    invalidateAdolescentesMapaCache();

    const adolescenteResposta = mapPrismaAdolescente(criado);
    adolescenteResposta.alertasPendentes = 0;

    return NextResponse.json(
      {
        mensagem: "Adolescente cadastrado com sucesso",
        adolescente: adolescenteResposta,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.errors },
        { status: 400 },
      );
    }
    if (error instanceof NumeroInternoIndisponivelError) {
      return NextResponse.json(
        {
          erro: `Número interno ${error.numero} indisponivel. Atualmente atribuido a ${error.titular}.`,
        },
        { status: 409 },
      );
    }

    console.error("Erro ao cadastrar adolescente:", error);
    return NextResponse.json(
      { erro: "Erro ao cadastrar adolescente" },
      { status: 500 },
    );
  }
}
