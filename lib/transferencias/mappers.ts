import { Prisma } from "@prisma/client";

export const TRANSFERENCIA_STATUS = [
  "AGUARDANDO",
  "EM_ANALISE",
  "APROVADA",
  "NEGADA",
  "TRANSFERIDA",
] as const;

export type TransferenciaStatus =
  (typeof TRANSFERENCIA_STATUS)[number];

type TransferenciaIncludeConfig = {
  incluirHistorico?: boolean;
};

export type TransferenciaComRelacoes =
  Prisma.SolicitacaoTransferenciaGetPayload<{
    include: {
      adolescente: {
        select: {
          id: true;
          nomeCompleto: true;
          nomeSocial: true;
          statusUnidade: true;
          alojamentoAtual: {
            select: {
              id: true;
              numeroAlojamento: true;
              ala: true;
              casa: { select: { nome: true } };
            };
          };
        };
      };
      operadorSolicitante: {
        select: {
          id: true;
          nomeCompleto: true;
        };
      };
      historicoTransf: {
        orderBy: { dataTransferencia: "desc" };
      };
    };
  }>;

export const buildTransferenciaInclude = (
  options?: TransferenciaIncludeConfig
): Prisma.SolicitacaoTransferenciaInclude => {
  const include: Prisma.SolicitacaoTransferenciaInclude = {
    adolescente: {
      select: {
        id: true,
        nomeCompleto: true,
        nomeSocial: true,
        statusUnidade: true,
        alojamentoAtual: {
          select: {
            id: true,
            numeroAlojamento: true,
            ala: true,
            casa: { select: { nome: true } },
          },
        },
      },
    },
    operadorSolicitante: {
      select: {
        id: true,
        nomeCompleto: true,
      },
    },
  };

  if (options?.incluirHistorico) {
    include.historicoTransf = {
      orderBy: { dataTransferencia: "desc" },
    };
  }

  return include;
};

const mapAlojamento = (
  alojamento:
    | {
        id: string;
        numeroAlojamento: string;
        ala: string | null;
        casa: { nome: string | null } | null;
      }
    | null
    | undefined
) => {
  if (!alojamento) {
    return null;
  }

  const numero = alojamento.numeroAlojamento ?? "";
  const ala =
    alojamento.ala && alojamento.ala.trim().length > 0
      ? alojamento.ala.trim().toUpperCase()
      : null;
  const casa = alojamento.casa?.nome ?? null;

  return {
    id: alojamento.id,
    numero,
    ala,
    casa,
  };
};

const mapHistorico = (
  historico:
    | Prisma.HistoricoTransferenciaGetPayload<{
        select: {
          id: true;
          adolescenteId: true;
          unidadeOrigem: true;
          unidadeDestino: true;
          dataTransferencia: true;
          motivo: true;
          conflitosNaOrigem: true;
          relatorioTransferenciaId: true;
        };
      }>[]
    | null
    | undefined
) => {
  if (!historico) {
    return [];
  }

  return historico.map((item) => ({
    id: item.id,
    adolescenteId: item.adolescenteId,
    unidadeOrigem: item.unidadeOrigem,
    unidadeDestino: item.unidadeDestino,
    dataTransferencia: item.dataTransferencia.toISOString().slice(0, 10),
    motivo: item.motivo ?? null,
    conflitosNaOrigem: item.conflitosNaOrigem ?? null,
    relatorioTransferenciaId: item.relatorioTransferenciaId ?? null,
  }));
};

export const mapTransferencia = (
  transferencia: TransferenciaComRelacoes,
  options?: TransferenciaIncludeConfig
) => {
  const incluirHistorico = Boolean(options?.incluirHistorico);

  return {
    id: transferencia.id,
    status: transferencia.status,
    motivoPrincipal: transferencia.motivoPrincipal,
    unidadesSugeridas: transferencia.unidadesSugeridas ?? [],
    observacoesAdicionais: transferencia.observacoesAdicionais ?? null,
    relatorioGeradoPath: transferencia.relatorioGeradoPath ?? null,
    dataSolicitacao: transferencia.dataSolicitacao.toISOString(),
    dataDecisaoJudicial: transferencia.dataDecisaoJudicial
      ? transferencia.dataDecisaoJudicial.toISOString()
      : null,
    decisaoJudicial: transferencia.decisaoJudicial ?? null,
    unidadeDestinoEfetiva: transferencia.unidadeDestinoEfetiva ?? null,
    dataTransferenciaEfetiva: transferencia.dataTransferenciaEfetiva
      ? transferencia.dataTransferenciaEfetiva.toISOString()
      : null,
    adolescente: transferencia.adolescente
      ? {
          id: transferencia.adolescente.id,
          nome: transferencia.adolescente.nomeCompleto,
          nomeSocial: transferencia.adolescente.nomeSocial ?? null,
          statusUnidade: transferencia.adolescente.statusUnidade ?? null,
          alojamento: mapAlojamento(
            transferencia.adolescente.alojamentoAtual ?? null
          ),
        }
      : null,
    operadorSolicitante: transferencia.operadorSolicitante
      ? {
          id: transferencia.operadorSolicitante.id,
          nome: transferencia.operadorSolicitante.nomeCompleto,
          matricula:
            "matricula" in transferencia.operadorSolicitante
              ? ((transferencia.operadorSolicitante as {
                  matricula?: string | null;
                }).matricula ?? null)
              : null,
        }
      : null,
    historico:
      incluirHistorico && Array.isArray(transferencia.historicoTransf)
        ? mapHistorico(transferencia.historicoTransf)
        : undefined,
  };
};

export const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const sanitized = value
    .map((item) =>
      typeof item === "string" ? item.trim() : ""
    )
    .filter((item) => item.length > 0);

  return Array.from(new Set(sanitized));
};
