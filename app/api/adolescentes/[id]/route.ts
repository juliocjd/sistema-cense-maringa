// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma, AdolescenteHistoricoInfracional } from "@prisma/client";
import type { StatusUnidade } from "@/types";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { resolveUserPermissions } from "@/lib/auth/resolve-permissions";
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
  atualizarFlagsAlertasEspeciais,
} from "@/lib/alertas/sincronizar-especiais";
import {
  ALERTA_ESPECIAL_TIPOS,
  ALERTA_NIVEL_RISCO_VARIADIC,
  type AlertaEspecialTipo,
  type AlertaNivelRisco,
} from "@/lib/alertas/especiais";
import { emitMapaEvent } from "@/lib/mapa-event-bus";
import { invalidateAdolescentesMapaCache } from "@/lib/estrutura/adolescentes-cache";
import { registrarMovimentacao } from "@/lib/historico/movimentacao";

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
    })
  )
  .optional();

const vinculoInfracionalSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  descricao: z
    .string()
    .min(3, "Descricao do vinculo deve ter ao menos 3 caracteres"),
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

const ALERTA_ESPECIAL_ENUM = z.enum(
  ALERTA_ESPECIAL_TIPOS as [
    AlertaEspecialTipo,
    ...AlertaEspecialTipo[]
  ]
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

const contarAlertasPendentes = async (adolescenteId: string) =>
  prisma.alertaAtivo.count({
    where: {
      adolescenteId,
      desativadoEm: { not: null },
    },
  });

const updateAdolescenteSchema = z.object({
  nomeCompleto: z.string().min(3, "Nome deve ter no minimo 3 caracteres").optional(),
  nomeSocial: z.string().optional().nullable(),
  vulgo: z.string().optional().nullable(),
  fotoUrl: z.string().url().optional().nullable(),
  numeroSms: z.string().optional().nullable(),
  numeroInterno: z
    .union([
      z
        .number({ invalid_type_error: "Número interno deve ser numerico" })
        .int("Número interno deve ser inteiro")
        .min(1, "Número interno deve estar entre 1 e 86")
        .max(86, "Número interno deve estar entre 1 e 86"),
      z.null(),
  ])
    .optional(),
  dataNascimento: z.string().optional().nullable(),
  dataEntrada: z.string().optional().nullable(),
  dataDesinternacao: z.string().optional().nullable(),
  atoInfracionalGravidade: z.boolean().optional(),
  atoInfracionalGravidadeObs: z.string().optional().nullable(),
  statusUnidade: z.enum(["ATIVO", "TRANSFERIDO", "LIBERADO", "EVADIDO"]).optional(),
  faccaoGrupoId: z.string().uuid().optional().nullable(),
  faccaoFuncao: z.string().optional().nullable(),
  faccaoInformacaoOrigem: FACCAO_ORIGEM_ENUM.optional().nullable(),
  faccaoInformacaoDetalhe: z.string().optional().nullable(),
  faccaoInformanteAdolescenteId: z.string().uuid().optional().nullable(),
  bairroOrigemId: z.string().uuid().optional().nullable(),
  riscoFuga: z.enum(["BAIXO", "MEDIO", "ALTO"]).optional().nullable(),
  alertaRiscoSuicidio: z.boolean().optional(),
  alertaPerfilMapeado: z.boolean().optional(),
  alertaSaudeConfidencial: z.boolean().optional(),
  alertaSaudeDetalhes: z.string().optional().nullable(),
  alojamentoAtualId: z.string().uuid().optional().nullable(),
  faseInternacaoAtualId: z.string().uuid().optional().nullable(),
  tatuagens: z.array(z.object({
    catalogoId: z.string().uuid(),
    localCorpo: z.string().optional().nullable(),
    observacoes: z.string().optional().nullable(),
    significadoPessoal: z.string().optional().nullable(),
  })).optional(),
  historicoInfracional: historicoRegistroSchema,
  casoInfracionalAtual: casoInfracionalSchema.optional().nullable(),
  casosInfracionais: z.array(casoInfracionalSchema).optional(),
  atoInfracionalVinculos: z.array(vinculoInfracionalSchema).optional(),
  tecnicosReferenciaIds: z.array(z.string().uuid()).optional(),
  alertasEspeciais: z.array(alertaEspecialSchema).optional(),
});

const ACAO_DESATIVAR_ALERTA_STATUS = "DESATIVAR_ALERTA_STATUS";
const ACAO_SUSPENDER_CONFLITO_STATUS = "SUSPENDER_CONFLITO_STATUS";

const sanitizeNullableString = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizarNumeroProcessoCaso = (value: string | null | undefined) => {
  const sanitized = sanitizeNullableString(value);
  return sanitized ? sanitized.toUpperCase() : null;
};

const nullableStringOrNull = (value: string | null | undefined) => {
  if (value === null) {
    return null;
  }
  const sanitized = sanitizeNullableString(value);
  return sanitized ?? null;
};

const toDateOrNull = (value?: string | null) => {
  if (value === null) {
    return null;
  }
  const sanitized = sanitizeNullableString(value);
  if (!sanitized) {
    return null;
  }
  const parsed = new Date(sanitized);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() < 1900) {
    return null;
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
      id: typeof (item as any).id === "string" ? (item as any).id : null,
      atoInfracionalDescricao: descricao,
      atoInfracionalAno: anoValido,
      atoInfracionalProcesso:
        sanitizeNullableString((item as any).processo ?? undefined) ?? null,
      atoInfracionalGravidade: false,
      atoInfracionalGravidadeObs: null,
      unidadeInternacao:
        sanitizeNullableString(
          (item as any).comarca ?? item.unidade ?? undefined
        ) ?? null,
      ano: anoValido,
      observacoes: sanitizeNullableString(item.observacoes ?? undefined) ?? null,
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
  }>
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
          : []
      )
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

const reconciliarPayloadCasosPorProcesso = ({
  casoAtual,
  casosHistoricos,
  statusDestino,
}: {
  casoAtual: CasoInfracionalEntrada | null;
  casosHistoricos: CasoInfracionalEntrada[] | undefined;
  statusDestino: string;
}) => {
  if (!casoAtual || statusDestino !== "ATUAL") {
    return {
      casoAtual,
      casosHistoricos,
    };
  }

  const processoAtual = normalizarNumeroProcessoCaso(casoAtual.numeroProcesso);
  if (!processoAtual) {
    return {
      casoAtual,
      casosHistoricos,
    };
  }

  const listaHistoricos = casosHistoricos ?? [];
  const historicosMesmoProcesso = listaHistoricos.filter(
    (caso) => normalizarNumeroProcessoCaso(caso.numeroProcesso) === processoAtual,
  );

  const casoAtualReconciliado =
    !casoAtual.id && historicosMesmoProcesso.length === 1
      ? {
          ...casoAtual,
          id: historicosMesmoProcesso[0].id ?? null,
        }
      : casoAtual;

  return {
    casoAtual: casoAtualReconciliado,
    casosHistoricos: listaHistoricos.filter(
      (caso) => normalizarNumeroProcessoCaso(caso.numeroProcesso) !== processoAtual,
    ),
  };
};

const toCasoEntradaFromDb = (caso: any): CasoInfracionalEntrada | null =>
  parseCasoInfracionalPayload(
    caso
      ? {
          id: caso.id,
          status: caso.status ?? null,
          numeroProcesso: caso.numeroProcesso ?? null,
          anoFato: caso.anoFato ?? null,
          comarca: caso.comarca ?? null,
          narrativa: caso.narrativa ?? null,
          tipificacoes:
            caso.tipificacoes?.map((tipificacao: any) => ({
              id: tipificacao.id,
              ordem: tipificacao.ordem ?? null,
              catalogoId: tipificacao.atoInfracionalCatalogoId ?? null,
              descricao:
                tipificacao.atoInfracionalCatalogo?.nome ??
                tipificacao.descricaoManual ??
                null,
              principal: tipificacao.principal ?? false,
              naturezaExecucao: tipificacao.naturezaExecucao ?? null,
              qualificadora: tipificacao.qualificadora ?? null,
              majorante: tipificacao.majorante ?? null,
              observacoes: tipificacao.observacoes ?? null,
            })) ?? [],
        }
      : null
  );

const sincronizarVinculosInfracionais = async ({
  tx,
  adolescenteId,
  vinculosPayload,
  vinculosExistentes,
}: {
  tx: any;
  adolescenteId: string;
  vinculosPayload: VinculoEntrada[];
  vinculosExistentes?: any[];
}) => {
  const existentes = Array.isArray(vinculosExistentes) ? vinculosExistentes : [];
  const existentesIds = new Set(
    existentes
      .map((item) => item?.vinculoId ?? item?.vinculo?.id)
      .filter(Boolean)
  );

  const idsPayload = new Set(
    vinculosPayload.map((item) => item.id).filter(Boolean) as string[]
  );

  for (const entrada of vinculosPayload) {
    const participantes = Array.from(
      new Set([adolescenteId, ...entrada.adolescentesIds])
    );
    if (participantes.length < 2) {
      continue;
    }

    if (entrada.id && existentesIds.has(entrada.id)) {
      await tx.atoInfracionalVinculo.update({
        where: { id: entrada.id },
        data: { descricao: entrada.descricao },
      });

      const atuais = await tx.atoInfracionalVinculoAdolescente.findMany({
        where: { vinculoId: entrada.id },
        select: { adolescenteId: true },
      });
      const atuaisSet = new Set(atuais.map((item) => item.adolescenteId));
      const paraAdicionar = participantes.filter((id) => !atuaisSet.has(id));
      const paraRemover = Array.from(atuaisSet).filter(
        (id) => !participantes.includes(id)
      );

      if (paraAdicionar.length > 0) {
        await tx.atoInfracionalVinculoAdolescente.createMany({
          data: paraAdicionar.map((id) => ({
            vinculoId: entrada.id,
            adolescenteId: id,
          })),
        });
      }

      if (paraRemover.length > 0) {
        await tx.atoInfracionalVinculoAdolescente.deleteMany({
          where: {
            vinculoId: entrada.id,
            adolescenteId: { in: paraRemover },
          },
        });
      }

      const total = await tx.atoInfracionalVinculoAdolescente.count({
        where: { vinculoId: entrada.id },
      });
      if (total < 2) {
        await tx.atoInfracionalVinculo.delete({ where: { id: entrada.id } });
      }
    } else {
      await tx.atoInfracionalVinculo.create({
        data: {
          descricao: entrada.descricao,
          adolescentes: {
            create: participantes.map((id) => ({
              adolescente: { connect: { id } },
            })),
          },
        },
      });
    }
  }

  const vinculosParaRemover = Array.from(existentesIds).filter(
    (id) => !idsPayload.has(id)
  );
  if (vinculosParaRemover.length === 0) {
    return;
  }

  await tx.atoInfracionalVinculoAdolescente.deleteMany({
    where: {
      vinculoId: { in: vinculosParaRemover },
      adolescenteId,
    },
  });

  const contagens = await tx.atoInfracionalVinculoAdolescente.groupBy({
    by: ["vinculoId"],
    where: { vinculoId: { in: vinculosParaRemover } },
    _count: { _all: true },
  });
  const contagemMap = new Map(
    contagens.map((item: any) => [item.vinculoId, item._count._all])
  );
  const paraExcluir = vinculosParaRemover.filter(
    (id) => (contagemMap.get(id) ?? 0) < 2
  );
  if (paraExcluir.length > 0) {
    await tx.atoInfracionalVinculo.deleteMany({
      where: { id: { in: paraExcluir } },
    });
  }
};

const sincronizarCasoInfracionalAtual = async ({
  tx,
  adolescenteId,
  casoPayload,
  statusCaso = "ATUAL",
}: {
  tx: any;
  adolescenteId: string;
  casoPayload: CasoInfracionalEntrada | null;
  statusCaso?: string;
}) => {
  let casoExistente = await tx.adolescenteCasoInfracional.findFirst({
    where: {
      adolescenteId,
      status: "ATUAL",
    },
    select: { id: true },
  });

  if (!casoPayload) {
    if (casoExistente) {
      await tx.adolescenteCasoInfracional.delete({
        where: { id: casoExistente.id },
      });
    }
    return null;
  }

  if (!casoExistente && casoPayload.id) {
    casoExistente = await tx.adolescenteCasoInfracional.findFirst({
      where: {
        id: casoPayload.id,
        adolescenteId,
      },
      select: { id: true },
    });
  }

  const processoCaso = normalizarNumeroProcessoCaso(casoPayload.numeroProcesso);

  if (!casoExistente && processoCaso && casoPayload.numeroProcesso) {
    const casosMesmoProcesso = await tx.adolescenteCasoInfracional.findMany({
      where: {
        adolescenteId,
        numeroProcesso: {
          equals: casoPayload.numeroProcesso,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        status: true,
      },
      orderBy: {
        atualizadoEm: "desc",
      },
    });

    casoExistente =
      casosMesmoProcesso.find((caso: any) => caso.status === "ATUAL") ??
      casosMesmoProcesso[0] ??
      null;
  }

  if (casoExistente) {
    await tx.adolescenteCasoInfracionalTipificacao.deleteMany({
      where: { casoId: casoExistente.id },
    });
    await tx.adolescenteCasoInfracional.update({
      where: { id: casoExistente.id },
      data: {
        status: statusCaso,
        numeroProcesso: casoPayload.numeroProcesso,
        anoFato: casoPayload.anoFato,
        comarca: casoPayload.comarca,
        narrativa: casoPayload.narrativa,
      },
    });
  } else {
    const criado = await tx.adolescenteCasoInfracional.create({
      data: {
        adolescenteId,
        status: statusCaso,
        numeroProcesso: casoPayload.numeroProcesso,
        anoFato: casoPayload.anoFato,
        comarca: casoPayload.comarca,
        narrativa: casoPayload.narrativa,
      },
      select: { id: true },
    });
    casoExistente = criado;
  }

  if (casoPayload.tipificacoes.length > 0) {
    await tx.adolescenteCasoInfracionalTipificacao.createMany({
      data: casoPayload.tipificacoes.map((tipificacao) => ({
        casoId: casoExistente.id,
        ordem: tipificacao.ordem,
        atoInfracionalCatalogoId: tipificacao.catalogoId ?? undefined,
        descricaoManual: tipificacao.descricaoManual,
        principal: tipificacao.principal,
        naturezaExecucao: tipificacao.naturezaExecucao,
        qualificadora: tipificacao.qualificadora,
        majorante: tipificacao.majorante,
        observacoes: tipificacao.observacoes,
      })),
    });
  }

  if (processoCaso && casoPayload.numeroProcesso) {
    await tx.adolescenteCasoInfracional.deleteMany({
      where: {
        adolescenteId,
        id: { not: casoExistente.id },
        numeroProcesso: {
          equals: casoPayload.numeroProcesso,
          mode: "insensitive",
        },
      },
    });
  }

  return casoExistente.id;
};

const sincronizarCasosInfracionaisHistoricos = async ({
  tx,
  adolescenteId,
  casosPayload,
}: {
  tx: any;
  adolescenteId: string;
  casosPayload: CasoInfracionalEntrada[];
}) => {
  const casosExistentes = await tx.adolescenteCasoInfracional.findMany({
    where: {
      adolescenteId,
      status: "HISTORICO",
    },
    select: { id: true },
  });

  const idsExistentes = new Set(casosExistentes.map((caso: any) => caso.id));
  const idsPayload = new Set(
    casosPayload.map((caso) => caso.id).filter(Boolean) as string[],
  );

  for (const caso of casosPayload) {
    if (caso.id && idsExistentes.has(caso.id)) {
      await tx.adolescenteCasoInfracionalTipificacao.deleteMany({
        where: { casoId: caso.id },
      });
      await tx.adolescenteCasoInfracional.update({
        where: { id: caso.id },
        data: {
          status: "HISTORICO",
          numeroProcesso: caso.numeroProcesso,
          anoFato: caso.anoFato,
          comarca: caso.comarca,
          narrativa: caso.narrativa,
        },
      });
      if (caso.tipificacoes.length > 0) {
        await tx.adolescenteCasoInfracionalTipificacao.createMany({
          data: caso.tipificacoes.map((tipificacao) => ({
            casoId: caso.id as string,
            ordem: tipificacao.ordem,
            atoInfracionalCatalogoId: tipificacao.catalogoId ?? undefined,
            descricaoManual: tipificacao.descricaoManual,
            principal: tipificacao.principal,
            naturezaExecucao: tipificacao.naturezaExecucao,
            qualificadora: tipificacao.qualificadora,
            majorante: tipificacao.majorante,
            observacoes: tipificacao.observacoes,
          })),
        });
      }
      continue;
    }

    const criado = await tx.adolescenteCasoInfracional.create({
      data: {
        adolescenteId,
        status: "HISTORICO",
        numeroProcesso: caso.numeroProcesso,
        anoFato: caso.anoFato,
        comarca: caso.comarca,
        narrativa: caso.narrativa,
      },
      select: { id: true },
    });

    if (caso.tipificacoes.length > 0) {
      await tx.adolescenteCasoInfracionalTipificacao.createMany({
        data: caso.tipificacoes.map((tipificacao) => ({
          casoId: criado.id,
          ordem: tipificacao.ordem,
          atoInfracionalCatalogoId: tipificacao.catalogoId ?? undefined,
          descricaoManual: tipificacao.descricaoManual,
          principal: tipificacao.principal,
          naturezaExecucao: tipificacao.naturezaExecucao,
          qualificadora: tipificacao.qualificadora,
          majorante: tipificacao.majorante,
          observacoes: tipificacao.observacoes,
        })),
      });
    }
  }

  const idsParaRemover = Array.from(idsExistentes).filter(
    (id) => !idsPayload.has(id),
  );

  if (idsParaRemover.length > 0) {
    await tx.adolescenteCasoInfracional.deleteMany({
      where: {
        id: { in: idsParaRemover },
        adolescenteId,
        status: "HISTORICO",
      },
    });
  }
};

const buildHistoricoKey = (entrada: HistoricoEntrada) =>
  [
    entrada.atoInfracionalDescricao.trim().toLowerCase(),
    entrada.atoInfracionalAno ?? "",
    entrada.atoInfracionalProcesso ?? "",
    entrada.unidadeInternacao ?? "",
    entrada.observacoes ?? "",
  ].join("|");

const toHistoricoEntradaFromDb = (
  registro: Pick<
    AdolescenteHistoricoInfracional,
    | "atoInfracionalDescricao"
    | "atoInfracionalAno"
    | "atoInfracionalProcesso"
    | "atoInfracionalGravidade"
    | "atoInfracionalGravidadeObs"
    | "atoInfracionalCatalogoId"
    | "unidadeInternacao"
    | "ano"
    | "observacoes"
  >
): HistoricoEntrada => ({
  atoInfracionalDescricao: registro.atoInfracionalDescricao,
  atoInfracionalAno: registro.atoInfracionalAno ?? null,
  atoInfracionalProcesso: registro.atoInfracionalProcesso ?? null,
  atoInfracionalGravidade: registro.atoInfracionalGravidade ?? false,
  atoInfracionalGravidadeObs: registro.atoInfracionalGravidadeObs ?? null,
  catalogoId: (registro as any).atoInfracionalCatalogoId ?? null,
  unidadeInternacao: registro.unidadeInternacao ?? null,
  ano: registro.ano ?? registro.atoInfracionalAno ?? null,
  observacoes: registro.observacoes ?? null,
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adolescente = await prisma.adolescente.findUnique({
      where: { id },
      include: INCLUDE_ADOLESCENTE_DEFAULT,
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 }
      );
    }

    let adolescenteComAlojamento = adolescente;
    if (!adolescente.alojamentoAtual && adolescente.alojamentoAtualId) {
      const alojamento = await prisma.alojamento.findUnique({
        where: { id: adolescente.alojamentoAtualId },
        include: { casa: true },
      });
      if (alojamento) {
        adolescenteComAlojamento = {
          ...(adolescente as any),
          alojamentoAtual: alojamento,
        } as typeof adolescente;
      }
    }

    const resposta = mapPrismaAdolescente(adolescenteComAlojamento);
    resposta.alertasPendentes = await contarAlertasPendentes(id);

    return NextResponse.json(resposta);
  } catch (error) {
    console.error("Erro ao buscar adolescente:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar adolescente",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth().catch((err) => {
      console.error("Erro ao obter sessao:", err);
      return null;
    });
    const operadorId = sanitizeNullableString(session?.user?.id);

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

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido, esperado JSON" },
        { status: 400 }
      );
    }

    const validated = updateAdolescenteSchema.parse(payload);
    const historicoNovos = parseHistoricoPayload(
      validated.historicoInfracional
    );
    const casoInfracionalAtual = parseCasoInfracionalPayload(
      validated.casoInfracionalAtual
    );
    const casosInfracionaisHistoricos =
      validated.casosInfracionais !== undefined
        ? parseCasosInfracionaisPayload(validated.casosInfracionais)
        : validated.historicoInfracional !== undefined
        ? converterHistoricoLegadoParaCasos(historicoNovos)
        : undefined;
    const vinculosNovos = parseVinculosPayload(
      validated.atoInfracionalVinculos
    );
    const vinculosInformados = validated.atoInfracionalVinculos !== undefined;
    const casoInfracionalInformado =
      validated.casoInfracionalAtual !== undefined;
    const casosHistoricosInformados =
      validated.casosInfracionais !== undefined ||
      validated.historicoInfracional !== undefined;

    const permissoes = resolveUserPermissions(session, operador);
    const podeAlterarAlojamento = hasPermission(
      permissoes,
      PERMISSIONS.ADOLESCENTES_EDIT_ALOJAMENTO
    );
    if (validated.alojamentoAtualId !== undefined && !podeAlterarAlojamento) {
      return NextResponse.json(
        { erro: "Sem permissao para alterar alojamento do adolescente" },
        { status: 403 }
      );
    }

    const existente = (await prisma.adolescente.findUnique({
      where: { id },
      include: INCLUDE_ADOLESCENTE_DEFAULT as any,
    })) as any;

    if (!existente) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 }
      );
    }

    const numeroSmsSanitizado =
      validated.numeroSms !== undefined && validated.numeroSms !== null
        ? sanitizeNullableString(validated.numeroSms) ?? undefined
        : undefined;

    const numeroSmsAtual = sanitizeNullableString(
      (existente as any).numeroSms ?? undefined
    );

    if (numeroSmsSanitizado && numeroSmsSanitizado !== numeroSmsAtual) {
      const existenteSms = await prisma.adolescente.findFirst({
        where: {
          numeroSms: numeroSmsSanitizado,
          NOT: { id },
        },
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
          { status: 409 }
        );
      }
    }

    const alojamentoAnterior = existente.alojamentoAtualId ?? null;

    const data: any = {};
    const statusAtual = (existente.statusUnidade as StatusUnidade) ?? "ATIVO";
    const novoStatus = (validated.statusUnidade ?? statusAtual) as StatusUnidade;
    const statusMudou =
      validated.statusUnidade !== undefined &&
      validated.statusUnidade !== statusAtual;
    const saiuDeAtivo = statusAtual === "ATIVO" && novoStatus !== "ATIVO";
    const retornandoParaAtivo = novoStatus === "ATIVO" && statusAtual !== "ATIVO";
    const numeroAtual = existente.numeroInterno ?? null;
    const numeroInternoInput = validated.numeroInterno;
    const numeroInternoDesejado =
      numeroInternoInput === undefined
        ? undefined
        : numeroInternoInput === null
        ? null
        : numeroInternoInput;
    const tecnicosIds = validated.tecnicosReferenciaIds
      ? Array.from(new Set(validated.tecnicosReferenciaIds))
      : undefined;
    let casoInfracionalAtualPersistencia = casoInfracionalAtual;
    let casosInfracionaisHistoricosPersistencia = casosInfracionaisHistoricos;

    if (casoInfracionalInformado || casosHistoricosInformados) {
      const reconciliado = reconciliarPayloadCasosPorProcesso({
        casoAtual: casoInfracionalAtualPersistencia,
        casosHistoricos: casosInfracionaisHistoricosPersistencia,
        statusDestino: novoStatus === "ATIVO" ? "ATUAL" : "HISTORICO",
      });
      casoInfracionalAtualPersistencia = reconciliado.casoAtual;
      casosInfracionaisHistoricosPersistencia = reconciliado.casosHistoricos;
    }

    const casoAtualExistente = toCasoEntradaFromDb(
      existente.casosInfracionais?.find((caso: any) => caso.status === "ATUAL") ??
        existente.casosInfracionais?.[0] ??
        null
    );
    const casoAtualEfetivo =
      casoInfracionalAtualPersistencia ?? casoAtualExistente;
    const tipificacaoAtual =
      casoAtualEfetivo?.tipificacoes.find((tipificacao) => tipificacao.principal) ??
      casoAtualEfetivo?.tipificacoes[0] ??
      null;
    const atoAtualCatalogoId = tipificacaoAtual?.catalogoId ?? null;
    const atoAtualNome = tipificacaoAtual?.descricaoManual?.trim() ?? null;

    const origemInformacaoAtual =
      (existente.faccaoInformacaoOrigem as
        | "CONFESSADA"
        | "OBSERVACAO"
        | "INTELIGENCIA"
        | "TERCEIROS"
        | "NAO_INFORMADO"
        | "OUTRO_INTERNO"
        | null) ?? null;
    const informanteAtual =
      existente.faccaoVinculoAtual?.informanteAdolescenteId ??
      existente.faccaoVinculoAtual?.informanteAdolescente?.id ??
      null;
    const detalheInformacaoAtual = existente.faccaoInformacaoDetalhe ?? null;
    const origemInformacaoDestino =
      validated.faccaoInformacaoOrigem !== undefined
        ? validated.faccaoInformacaoOrigem
        : origemInformacaoAtual;
    const detalheInformacaoValidada =
      validated.faccaoInformacaoDetalhe !== undefined
        ? sanitizeNullableString(validated.faccaoInformacaoDetalhe) ?? null
        : undefined;
    const detalheInformacaoDestino =
      detalheInformacaoValidada !== undefined
        ? detalheInformacaoValidada
        : detalheInformacaoAtual ?? null;
    const informanteDestino =
      validated.faccaoInformanteAdolescenteId !== undefined
        ? validated.faccaoInformanteAdolescenteId
        : informanteAtual;
    const faccaoDestinoId =
      validated.faccaoGrupoId !== undefined
        ? validated.faccaoGrupoId
        : existente.faccaoGrupoId ?? null;
    const faccaoFuncaoDestino =
      validated.faccaoFuncao !== undefined
        ? nullableStringOrNull(validated.faccaoFuncao)
        : existente.faccaoFuncao ?? null;
    const faccaoOrigemDestinoNormalizada =
      origemInformacaoDestino ?? (faccaoDestinoId ? "NAO_INFORMADO" : null);
    const mudouFaccao =
      validated.faccaoGrupoId !== undefined ||
      validated.faccaoFuncao !== undefined ||
      validated.faccaoInformacaoOrigem !== undefined ||
      validated.faccaoInformacaoDetalhe !== undefined;

    if (
      origemInformacaoDestino === "OBSERVACAO" &&
      !detalheInformacaoDestino
    ) {
      return NextResponse.json(
        {
          erro:
            "Descreva como a informacao de faccao foi obtida quando a origem for observacao.",
        },
        { status: 400 }
      );
    }

    if (origemInformacaoDestino === "OUTRO_INTERNO" && !informanteDestino) {
      return NextResponse.json(
        {
          erro:
            "Selecione o adolescente informante quando a origem for Outro interno.",
        },
        { status: 400 }
      );
    }
    if (origemInformacaoDestino === "OUTRO_INTERNO" && informanteDestino === id) {
      return NextResponse.json(
        {
          erro:
            "O informante nao pode ser o mesmo adolescente do registro.",
        },
        { status: 400 }
      );
    }

    const fallbackAlertasEspeciais: Parameters<
      typeof mapearAlertasEspeciaisDoPayload
    >[1] = {};

    if (validated.alertaRiscoSuicidio !== undefined) {
      fallbackAlertasEspeciais.riscoSuicidio = {
        ativo: validated.alertaRiscoSuicidio,
        descricao: undefined,
      };
    }

    if (validated.alertaPerfilMapeado !== undefined) {
      fallbackAlertasEspeciais.perfilMapeado = {
        ativo: validated.alertaPerfilMapeado,
        descricao: undefined,
      };
    }

    if (
      validated.alertaSaudeConfidencial !== undefined ||
      validated.alertaSaudeDetalhes !== undefined
    ) {
      const ativo =
        validated.alertaSaudeConfidencial !== undefined
          ? validated.alertaSaudeConfidencial
          : existente.alertaSaudeConfidencial ?? false;

      fallbackAlertasEspeciais.saudeConfidencial = {
        ativo,
        descricao:
          validated.alertaSaudeDetalhes !== undefined
            ? validated.alertaSaudeDetalhes
            : existente.alertaSaudeDetalhes ?? undefined,
      };
    }

    const alertasEspeciaisAtualizados = mapearAlertasEspeciaisDoPayload(
      validated.alertasEspeciais,
      fallbackAlertasEspeciais
    );

    const deveAplicarAlertasEspeciais =
      validated.alertasEspeciais !== undefined ||
      fallbackAlertasEspeciais.riscoSuicidio !== undefined ||
      fallbackAlertasEspeciais.perfilMapeado !== undefined ||
      fallbackAlertasEspeciais.saudeConfidencial !== undefined;

    if (
      numeroInternoDesejado === null &&
      (novoStatus === "ATIVO" || statusAtual === "ATIVO")
    ) {
      return NextResponse.json(
        {
          erro:
            "Nao e permitido remover o número interno enquanto o adolescente estiver ATIVO. Informe um novo numero ou altere o status.",
        },
        { status: 400 }
      );
    }

    if (
      numeroInternoDesejado !== undefined &&
      numeroInternoDesejado !== null &&
      novoStatus !== "ATIVO"
    ) {
      return NextResponse.json(
        { erro: "Somente adolescentes ativos podem ter número interno" },
        { status: 400 }
      );
    }
    if (
      statusMudou &&
      statusAtual === "ATIVO" &&
      novoStatus !== "ATIVO" &&
      validated.dataDesinternacao === undefined
    ) {
      return NextResponse.json(
        {
          erro:
            "Data de desinternacao obrigatoria ao alterar status para inativo",
        },
        { status: 400 }
      );
    }

    const deveGerarHistorico =
      saiuDeAtivo && Boolean(atoAtualCatalogoId || atoAtualNome);

    const comarcaHistoricoPadrao =
      process.env.COMARCA_PADRAO?.trim() || "Maringa";

    const observacoesHistorico = [
      casoAtualEfetivo?.narrativa ?? null,
      `Status alterado de ${statusAtual} para ${novoStatus}`,
    ]
      .filter((valor) => Boolean(valor && String(valor).trim().length > 0))
      .join(" | ");

    const historicoParaCriar: Prisma.AdolescenteHistoricoInfracionalUncheckedCreateInput | null =
      deveGerarHistorico
        ? {
            adolescenteId: id,
            atoInfracionalDescricao: atoAtualNome?.trim() || "Nao informado",
            atoInfracionalCatalogoId: atoAtualCatalogoId ?? undefined,
            atoInfracionalAno: casoAtualEfetivo?.anoFato ?? null,
            atoInfracionalProcesso: casoAtualEfetivo?.numeroProcesso ?? null,
            atoInfracionalGravidade: existente.atoInfracionalGravidade ?? false,
            atoInfracionalGravidadeObs:
              existente.atoInfracionalGravidadeObs ?? null,
            unidadeInternacao:
              casoAtualEfetivo?.comarca ?? comarcaHistoricoPadrao,
            ano: casoAtualEfetivo?.anoFato ?? new Date().getFullYear(),
            observacoes: observacoesHistorico || null,
          }
        : null;
    const camposAlterados: string[] = [];
    let numeroInternoParaSalvar: number | null | undefined = undefined;
    let deveValidarNumeroInterno = false;

    if (novoStatus === "ATIVO") {
      let alvo =
        numeroInternoDesejado !== undefined
          ? numeroInternoDesejado
          : numeroAtual;
      if (alvo === null || alvo === undefined) {
        return NextResponse.json(
          {
            erro:
              "Informe o número interno (1 a 86) para adolescentes com status ATIVO.",
          },
          { status: 400 }
        );
      }
      numeroInternoParaSalvar = alvo;
      if (alvo !== numeroAtual) {
        deveValidarNumeroInterno = true;
        camposAlterados.push("numeroInterno");
      }
    } else {
      if (numeroAtual !== null || numeroInternoDesejado !== undefined) {
        numeroInternoParaSalvar = null;
        camposAlterados.push("numeroInterno");
      }
    }

    if (validated.nomeCompleto !== undefined) {
      data.nomeCompleto = validated.nomeCompleto.trim();
      camposAlterados.push("nomeCompleto");
    }

    if (validated.nomeSocial !== undefined) {
      data.nomeSocial = nullableStringOrNull(validated.nomeSocial);
      camposAlterados.push("nomeSocial");
    }

    if (validated.vulgo !== undefined) {
      data.vulgo = nullableStringOrNull(validated.vulgo);
      camposAlterados.push("vulgo");
    }

    if (validated.fotoUrl !== undefined) {
      data.fotoUrl = nullableStringOrNull(validated.fotoUrl);
      camposAlterados.push("fotoUrl");
    }

    if (validated.numeroSms !== undefined) {
      data.numeroSms = nullableStringOrNull(validated.numeroSms);
      camposAlterados.push("numeroSms");
    }

    if (validated.atoInfracionalGravidade !== undefined) {
      data.atoInfracionalGravidade = validated.atoInfracionalGravidade;
      camposAlterados.push("atoInfracionalGravidade");
    }

    if (validated.atoInfracionalGravidadeObs !== undefined) {
      data.atoInfracionalGravidadeObs = nullableStringOrNull(
        validated.atoInfracionalGravidadeObs
      );
      camposAlterados.push("atoInfracionalGravidadeObs");
    }

    if (validated.statusUnidade !== undefined) {
      data.statusUnidade = validated.statusUnidade;
      camposAlterados.push("statusUnidade");
    }

    if (novoStatus !== "ATIVO" && existente.alojamentoAtualId) {
      data.alojamentoAtual = { disconnect: true };
      camposAlterados.push("alojamentoAtualId");
    }

    if (validated.dataDesinternacao !== undefined) {
      const dataStatus = toDateOrNull(validated.dataDesinternacao);
      data.dataDesinternacao =
        novoStatus === "ATIVO"
          ? null
          : dataStatus ?? existente.dataDesinternacao ?? new Date();
      camposAlterados.push("dataDesinternacao");
    } else if (statusMudou) {
      if (novoStatus === "ATIVO") {
        data.dataDesinternacao = null;
        camposAlterados.push("dataDesinternacao");
      } else if (statusAtual === "ATIVO" && !existente.dataDesinternacao) {
        data.dataDesinternacao = new Date();
        camposAlterados.push("dataDesinternacao");
      }
    }

    if (historicoParaCriar) {
      data.atoInfracionalGravidade = false;
      data.atoInfracionalGravidadeObs = null;
      camposAlterados.push("atoInfracionalGravidade", "atoInfracionalGravidadeObs");
    }

    if (validated.faccaoGrupoId !== undefined) {
      data.faccao = validated.faccaoGrupoId
        ? { connect: { id: validated.faccaoGrupoId } }
        : { disconnect: true };
      camposAlterados.push("faccaoGrupoId");
    }

    if (validated.faccaoFuncao !== undefined) {
      data.faccaoFuncao = nullableStringOrNull(validated.faccaoFuncao);
      camposAlterados.push("faccaoFuncao");
    }

    if (validated.faccaoInformacaoOrigem !== undefined) {
      data.faccaoInformacaoOrigem = validated.faccaoInformacaoOrigem ?? null;
      camposAlterados.push("faccaoInformacaoOrigem");
      if (
        validated.faccaoInformacaoOrigem !== "OBSERVACAO" &&
        validated.faccaoInformacaoOrigem !== "OUTRO_INTERNO"
      ) {
        data.faccaoInformacaoDetalhe = null;
        camposAlterados.push("faccaoInformacaoDetalhe");
      }
    }

    if (validated.faccaoInformacaoDetalhe !== undefined) {
      data.faccaoInformacaoDetalhe =
        origemInformacaoDestino === "OBSERVACAO" ||
        origemInformacaoDestino === "OUTRO_INTERNO"
          ? detalheInformacaoDestino
          : null;
      camposAlterados.push("faccaoInformacaoDetalhe");
    }

    if (validated.bairroOrigemId !== undefined) {
      data.bairroOrigem = validated.bairroOrigemId
        ? { connect: { id: validated.bairroOrigemId } }
        : { disconnect: true };
      camposAlterados.push("bairroOrigemId");
    }

    if (validated.riscoFuga !== undefined) {
      data.riscoFuga = validated.riscoFuga ?? null;
      camposAlterados.push("riscoFuga");
    }

    if (validated.alertaRiscoSuicidio !== undefined) {
      data.alertaRiscoSuicidio = validated.alertaRiscoSuicidio;
      camposAlterados.push("alertaRiscoSuicidio");
    }

    if (validated.alertaPerfilMapeado !== undefined) {
      data.alertaPerfilMapeado = validated.alertaPerfilMapeado;
      camposAlterados.push("alertaPerfilMapeado");
    }

    if (validated.alertaSaudeConfidencial !== undefined) {
      data.alertaSaudeConfidencial = validated.alertaSaudeConfidencial;
      camposAlterados.push("alertaSaudeConfidencial");
    }

    if (validated.alertaSaudeDetalhes !== undefined) {
      data.alertaSaudeDetalhes = nullableStringOrNull(
        validated.alertaSaudeDetalhes
      );
      camposAlterados.push("alertaSaudeDetalhes");
    }

    if (validated.alojamentoAtualId !== undefined) {
      data.alojamentoAtual = validated.alojamentoAtualId
        ? { connect: { id: validated.alojamentoAtualId } }
        : { disconnect: true };
      camposAlterados.push("alojamentoAtualId");
    }

    if (validated.faseInternacaoAtualId !== undefined) {
      data.faseInternacaoAtual = validated.faseInternacaoAtualId
        ? { connect: { id: validated.faseInternacaoAtualId } }
        : { disconnect: true };
      camposAlterados.push("faseInternacaoAtualId");
    }

    if (tecnicosIds !== undefined) {
      data.tecnicosReferencia = {
        deleteMany: {},
        create: tecnicosIds.map((id) => ({
          tecnicoReferencia: { connect: { id } },
        })),
      };
      camposAlterados.push("tecnicosReferencia");
    }

    if (validated.dataNascimento !== undefined) {
      data.dataNascimento = toDateOrNull(validated.dataNascimento);
      camposAlterados.push("dataNascimento");
    }

    if (validated.dataEntrada !== undefined) {
      data.dataEntrada = toDateOrNull(validated.dataEntrada);
      camposAlterados.push("dataEntrada");
    }

    if (numeroInternoParaSalvar !== undefined) {
      data.numeroInterno = numeroInternoParaSalvar;
    }

    if (casosHistoricosInformados) {
      camposAlterados.push("casosInfracionais");
    }

    if (validated.tatuagens !== undefined) {
      camposAlterados.push("tatuagens");
    }

    if (vinculosInformados) {
      camposAlterados.push("atoInfracionalVinculos");
    }

    if (casoInfracionalInformado) {
      camposAlterados.push("casoInfracionalAtual");
    }

    if (camposAlterados.length === 0) {
      return NextResponse.json(
        { mensagem: "Nenhuma alteracao aplicada" },
        { status: 200 }
      );
    }

    await prisma.$transaction(
      async (tx) => {
        if (
          novoStatus === "ATIVO" &&
          numeroInternoParaSalvar !== undefined &&
          numeroInternoParaSalvar !== null &&
          (deveValidarNumeroInterno || numeroAtual === null)
      ) {
        await garantirNumeroInternoDisponivel(
          tx,
          numeroInternoParaSalvar,
          id
        );
      }

      await tx.adolescente.update({
        where: { id },
        data,
      });

      if (validated.tatuagens !== undefined) {
        await tx.adolescenteTatuagem.deleteMany({
          where: { adolescenteId: id },
        });
        if (validated.tatuagens.length > 0) {
          await tx.adolescenteTatuagem.createMany({
            data: validated.tatuagens.map((tat) => ({
              adolescenteId: id,
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
      }

      if (mudouFaccao) {
        // Inativar vínculo atual
        if (existente.faccaoVinculoAtualId) {
          await (tx as any).adolescenteFaccaoHistorico.updateMany({
            where: { id: existente.faccaoVinculoAtualId },
            data: { statusRegistro: "REVOGADA" },
          });
        }
        const hist = await (tx as any).adolescenteFaccaoHistorico.create({
          data: {
            adolescenteId: id,
            faccaoId: faccaoDestinoId ?? null,
            funcao: faccaoFuncaoDestino ?? null,
            origemInformacao:
              faccaoOrigemDestinoNormalizada ?? "NAO_INFORMADO",
            nivelConfianca: null,
            statusRegistro: "ATIVA",
            observacao: detalheInformacaoDestino ?? null,
            informanteAdolescenteId:
              origemInformacaoDestino === "OUTRO_INTERNO"
                ? informanteDestino ?? null
                : null,
            criadoPorId: operadorId ?? null,
          },
        });
        await tx.adolescente.update({
          where: { id },
          data: { faccaoVinculoAtualId: hist.id },
        });
      }

      if (vinculosInformados) {
        await sincronizarVinculosInfracionais({
          tx,
          adolescenteId: id,
          vinculosPayload: vinculosNovos,
          vinculosExistentes: (existente as any).atoInfracionalVinculos,
        });
      }

      if (casoInfracionalInformado) {
        await sincronizarCasoInfracionalAtual({
          tx,
          adolescenteId: id,
          casoPayload: casoInfracionalAtualPersistencia,
          statusCaso: novoStatus === "ATIVO" ? "ATUAL" : "HISTORICO",
        });
      } else if (saiuDeAtivo) {
        await tx.adolescenteCasoInfracional.updateMany({
          where: {
            adolescenteId: id,
            status: "ATUAL",
          },
          data: {
            status: "HISTORICO",
          },
        });
      }

      if (casosHistoricosInformados) {
        await sincronizarCasosInfracionaisHistoricos({
          tx,
          adolescenteId: id,
          casosPayload: casosInfracionaisHistoricosPersistencia ?? [],
        });
        await tx.adolescenteHistoricoInfracional.deleteMany({
          where: { adolescenteId: id },
        });
      }

      const contextoLogAlertas = {
        operadorId,
        ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
      };

      if (deveAplicarAlertasEspeciais) {
        await aplicarAlertasEspeciais(
          tx,
          id,
          alertasEspeciaisAtualizados,
          contextoLogAlertas
        );
      }

      if (saiuDeAtivo) {
        const alertasAtivos = await tx.alertaAtivo.findMany({
          where: {
            adolescenteId: id,
            desativadoEm: null,
          },
          select: { id: true, tipoAlerta: true },
        });

        if (alertasAtivos.length > 0) {
          const ids = alertasAtivos.map((a) => a.id);
          await tx.alertaAtivo.updateMany({
            where: { id: { in: ids } },
            data: { desativadoEm: new Date() },
          });

          await tx.logAuditoria.createMany({
            data: alertasAtivos.map((alerta) => ({
              operadorId,
              acao: ACAO_DESATIVAR_ALERTA_STATUS,
              tabelaAfetada: "alertas_ativos",
              registroIdAfetado: alerta.id,
              detalhesAlteracao: {
                tipoAlerta: alerta.tipoAlerta ?? null,
                motivo: "Desativacao automatica por saida do status ATIVO",
              },
              ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
            })),
          });
        }

        await atualizarFlagsAlertasEspeciais(tx, id);

        const conflitosEnvolvidos = [
          ...(existente.conflitosA ?? []),
          ...(existente.conflitosB ?? []),
        ];
        const conflitoIds = conflitosEnvolvidos.map((c) => c.id);

        if (conflitoIds.length > 0) {
          const conflitosParaSuspender = await tx.conflito.findMany({
            where: {
              id: { in: conflitoIds },
              status: { not: "RESOLVIDO" },
            },
            include: {
              adolescenteA: { select: { statusUnidade: true } },
              adolescenteB: { select: { statusUnidade: true } },
            },
          });

          const idsSuspender = conflitosParaSuspender
            .filter((conflito) => {
              const ativoA =
                conflito.adolescenteA?.statusUnidade === "ATIVO";
              const ativoB =
                conflito.adolescenteB?.statusUnidade === "ATIVO";
              return !(ativoA && ativoB);
            })
            .map((c) => c.id);

          if (idsSuspender.length > 0) {
            await tx.conflito.updateMany({
              where: { id: { in: idsSuspender } },
              data: {
                status: "SUSPENSO_STATUS",
                resolvidoEm: new Date(),
              },
            });

            await tx.logAuditoria.createMany({
              data: idsSuspender.map((cid) => ({
                operadorId,
                acao: ACAO_SUSPENDER_CONFLITO_STATUS,
                tabelaAfetada: "conflitos",
                registroIdAfetado: cid,
                detalhesAlteracao: {
                  motivo:
                    "Suspensao automatica por saida do status ATIVO de participante",
                },
                ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
              })),
            });
          }
        }

        const comunicadosVinculados = await tx.comunicadoInterno.findMany({
          where: {
            suspensoPorStatus: false,
            desativadoEm: null,
            adolescentes: {
              some: {
                adolescenteId: id,
              },
            },
          },
          include: {
            adolescentes: {
              include: {
                adolescente: {
                  select: {
                    statusUnidade: true,
                  },
                },
              },
            },
          },
        });

        const comunicadosParaSuspender = comunicadosVinculados
          .filter((ci) => {
            const participantes = ci.adolescentes ?? [];
            const ativos = participantes.filter(
              (p) => p.adolescente?.statusUnidade === "ATIVO"
            );
            return ativos.length === 0;
          })
          .map((ci) => ci.id);

        if (comunicadosParaSuspender.length > 0) {
          await tx.comunicadoInterno.updateMany({
            where: { id: { in: comunicadosParaSuspender } },
            data: {
              suspensoPorStatus: true,
              desativadoEm: new Date(),
            },
          });

          await tx.logAuditoria.createMany({
            data: comunicadosParaSuspender.map((ciId) => ({
              operadorId,
              acao: "SUSPENDER_CI_STATUS",
              tabelaAfetada: "comunicados_internos",
              registroIdAfetado: ciId,
              detalhesAlteracao: {
                motivo: "Suspensao automatica por falta de participantes ativos",
              },
              ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
            })),
          });
        }
      }

      if (novoStatus !== "ATIVO") {
        const grupoRepo = (tx as typeof prisma).grupoMembro;
        if (grupoRepo?.updateMany) {
          await grupoRepo.updateMany({
            where: {
              adolescenteId: id,
              dataSaida: null,
            },
            data: {
              dataSaida: new Date(),
            },
          });
        }
      }

    },
      { maxWait: 10000, timeout: 60000 }
    );

    const atualizado = await prisma.adolescente.findUnique({
      where: { id },
      include: INCLUDE_ADOLESCENTE_DEFAULT as any,
    });

    if (!atualizado) {
      throw new Error("Falha ao carregar adolescente apos atualizacao");
    }

    const alojamentoAtualizadoId = atualizado.alojamentoAtualId ?? null;
    if (alojamentoAnterior !== alojamentoAtualizadoId) {
      emitMapaEvent({
        tipo: alojamentoAtualizadoId ? "alocacao" : "desalocacao",
        adolescenteId: atualizado.id,
        alojamentoId: alojamentoAtualizadoId,
      });
    }

    invalidateAdolescentesMapaCache();

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "UPDATE",
        tabelaAfetada: "adolescentes",
        registroIdAfetado: atualizado.id,
        detalhesAlteracao: {
          camposAlterados,
        },
        ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    const adolescenteResposta = mapPrismaAdolescente(atualizado);

    if (statusMudou && statusAtual === "ATIVO" && novoStatus !== "ATIVO") {
      const dataDesinternacaoRegistro =
        data.dataDesinternacao instanceof Date
          ? data.dataDesinternacao
          : undefined;

      await registrarMovimentacao(prisma, {
        adolescenteId: atualizado.id,
        tipo: novoStatus === "LIBERADO" ? "DESINTERNACAO" : "SAIDA_UNIDADE",
        descricao:
          adolescenteResposta.atoInfracionalAtual ??
          `Alteracao de status: ${statusAtual} -> ${novoStatus}`,
        origemCasaId: existente.alojamentoAtual?.casa?.id ?? null,
        origemAlojamentoId: alojamentoAnterior,
        operadorId,
        registradoEm: dataDesinternacaoRegistro ?? new Date(),
      });
    }

    if (statusMudou && statusAtual !== "ATIVO" && novoStatus === "ATIVO") {
      await registrarMovimentacao(prisma, {
        adolescenteId: atualizado.id,
        tipo: "RETORNO_UNIDADE",
        descricao: `Retorno com status ATIVO${
          atualizado.numeroInterno ? ` - interno ${atualizado.numeroInterno}` : ""
        }`,
        destinoCasaId: atualizado.alojamentoAtual?.casa?.id ?? null,
        destinoAlojamentoId: atualizado.alojamentoAtualId ?? null,
        operadorId,
        registradoEm: new Date(),
      });
    }

    const alertasPendentes = await contarAlertasPendentes(atualizado.id);
    adolescenteResposta.alertasPendentes = alertasPendentes;

    let reativacaoPendentes: {
      alertas?: Array<{
        id: string;
        tipoAlerta: string | null;
        descricaoAlerta: string | null;
        desativadoEm: string | null;
      }>;
      conflitos?: Array<{
        id: string;
        adversarioId: string | null;
        adversarioNome: string | null;
        status: string | null;
      }>;
      comunicados?: Array<{
        id: string;
        numero: number | null;
        ano: number | null;
        tipoCI: string | null;
        resumoCI: string | null;
      }>;
    } | null = null;

    if (retornandoParaAtivo) {
      const alertasSuspensos = await prisma.alertaAtivo.findMany({
        where: {
          adolescenteId: atualizado.id,
          desativadoEm: { not: null },
        },
        select: {
          id: true,
          tipoAlerta: true,
          descricaoAlerta: true,
          desativadoEm: true,
        },
      });

      const conflitosSuspensos = await prisma.conflito.findMany({
        where: {
          status: "SUSPENSO_STATUS",
          OR: [
            { adolescenteAId: atualizado.id },
            { adolescenteBId: atualizado.id },
          ],
        },
        include: {
          adolescenteA: { select: { id: true, nomeCompleto: true, statusUnidade: true } },
          adolescenteB: { select: { id: true, nomeCompleto: true, statusUnidade: true } },
        },
      });

      const conflitosReativaveis = conflitosSuspensos
        .filter((conf) => {
          const ativoA = conf.adolescenteA?.statusUnidade === "ATIVO";
          const ativoB = conf.adolescenteB?.statusUnidade === "ATIVO";
          return ativoA && ativoB;
        })
        .map((conf) => {
          const adversario =
            conf.adolescenteA?.id === atualizado.id
              ? conf.adolescenteB
              : conf.adolescenteA;
          return {
            id: conf.id,
            adversarioId: adversario?.id ?? null,
            adversarioNome: adversario?.nomeCompleto ?? null,
            status: conf.status ?? null,
          };
        });

      const comunicadosSuspensos = await prisma.comunicadoInterno.findMany({
        where: {
          suspensoPorStatus: true,
          adolescentes: {
            some: {
              adolescenteId: atualizado.id,
            },
          },
        },
        include: {
          adolescentes: {
            include: {
              adolescente: {
                select: { statusUnidade: true },
              },
            },
          },
        },
      });

      const comunicadosReativaveis = comunicadosSuspensos
        .filter((ci) => {
          const ativos =
            ci.adolescentes?.filter(
              (p) => p.adolescente?.statusUnidade === "ATIVO"
            ) ?? [];
          return ativos.length > 0;
        })
        .map((ci) => ({
          id: ci.id,
          numero: ci.numero ?? null,
          ano: ci.ano ?? null,
          tipoCI: ci.tipoCI ?? null,
          resumoCI: ci.resumoCI ?? null,
        }));

      reativacaoPendentes = {
        alertas:
          alertasSuspensos.length > 0
            ? alertasSuspensos.map((a) => ({
                id: a.id,
                tipoAlerta: a.tipoAlerta ?? null,
                descricaoAlerta: a.descricaoAlerta ?? null,
                desativadoEm: a.desativadoEm?.toISOString() ?? null,
              }))
            : [],
        conflitos: conflitosReativaveis,
        comunicados: comunicadosReativaveis,
      };
    }

    return NextResponse.json({
      mensagem: "Adolescente atualizado com sucesso",
      adolescente: adolescenteResposta,
      reativacaoPendentes,
    });
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
          erro: `Número interno ${error.numero} indisponivel. Atualmente atribuido a ${error.titular}.`,
        },
        { status: 409 }
      );
    }

    console.error("Erro ao atualizar adolescente:", error);
    return NextResponse.json(
      {
        erro: "Erro ao atualizar adolescente",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}



