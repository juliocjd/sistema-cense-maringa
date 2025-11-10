import type { Prisma } from "@prisma/client";
import type { Adolescente, StatusUnidade, Ala } from "@/types";

// Prisma include used across adolescentes endpoints to ensure we always fetch
// the same related entities before mapping them to the API contract.
export const INCLUDE_ADOLESCENTE_DEFAULT = {
  alojamentoAtual: {
    include: { casa: true },
  },
  faccao: true,
  bairroOrigem: true,
  agenteReferencia: true,
  gruposMembros: {
    where: { dataSaida: null },
    include: {
      grupo: {
        include: { casa: true },
      },
    },
  },
  tatuagens: {
    include: { tatuagemCatalogo: true },
  },
  conflitosA: {
    include: {
      adolescenteB: {
        select: {
          id: true,
          nomeCompleto: true,
          numeroSms: true,
        },
      },
    },
  },
  conflitosB: {
    include: {
      adolescenteA: {
        select: {
          id: true,
          nomeCompleto: true,
          numeroSms: true,
        },
      },
    },
  },
} satisfies Prisma.AdolescenteInclude;

type PrismaAdolescente = Prisma.AdolescenteGetPayload<{
  include: typeof INCLUDE_ADOLESCENTE_DEFAULT;
}>;

const formatDate = (valor: Date | string | null | undefined) => {
  if (!valor) {
    return undefined;
  }

  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return undefined;
  }

  return data.toISOString();
};

export function mapPrismaAdolescente(
  adolescente: PrismaAdolescente
): Adolescente {
  const STATUS_VALIDOS: ReadonlyArray<StatusUnidade> = [
    "ATIVO",
    "TRANSFERIDO",
    "LIBERADO",
    "EVADIDO",
  ];

  const statusUnidade = STATUS_VALIDOS.includes(
    adolescente.statusUnidade as StatusUnidade
  )
    ? (adolescente.statusUnidade as StatusUnidade)
    : "ATIVO";

  const alojamentoAtual = adolescente.alojamentoAtual
    ? {
        id: adolescente.alojamentoAtual.id,
        numero: adolescente.alojamentoAtual.numeroAlojamento,
        ala: (adolescente.alojamentoAtual.ala ?? null) as Ala,
        localizacaoPreferencial:
          adolescente.alojamentoAtual.localizacaoPreferencial ?? false,
        casa: adolescente.alojamentoAtual.casa
          ? {
              id: adolescente.alojamentoAtual.casa.id,
              nome: adolescente.alojamentoAtual.casa.nome,
              numero: adolescente.alojamentoAtual.casa.numero,
            }
          : null,
      }
    : null;

  const grupos =
    adolescente.gruposMembros?.map((gm) => ({
      id: gm.grupo.id,
      nome: gm.grupo.nomeGrupo,
      casa: gm.grupo.casa
        ? {
            id: gm.grupo.casa.id,
            nome: gm.grupo.casa.nome,
            numero: gm.grupo.casa.numero,
          }
        : null,
    })) ?? [];

  const tatuagens =
    adolescente.tatuagens?.map((tatuagem) => ({
      id: tatuagem.id,
      catalogoId: tatuagem.tatuagemCatalogoId,
      simbolo: tatuagem.tatuagemCatalogo?.nomeSimbolo ?? "",
      significado: tatuagem.tatuagemCatalogo?.significadoAssociado ?? null,
      nivelRisco: tatuagem.tatuagemCatalogo?.nivelRisco ?? null,
      localCorpo: tatuagem.localCorpo ?? null,
      observacoes: tatuagem.observacoes ?? null,
    })) ?? [];

  return {
    id: adolescente.id,
    nomeCompleto: adolescente.nomeCompleto,
    nomeSocial: adolescente.nomeSocial ?? null,
    numeroSms: adolescente.numeroSms ?? null,
    numeroProcesso: adolescente.numeroProcesso ?? null,
    fotoUrl: adolescente.fotoUrl ?? null,
    dataNascimento: formatDate(adolescente.dataNascimento),
    dataEntrada: formatDate(adolescente.dataEntrada),
    atoInfracionalAtual: adolescente.atoInfracionalAtual ?? null,
    atoInfracionalAno: adolescente.atoInfracionalAno ?? null,
    atoInfracionalProcesso: adolescente.atoInfracionalProcesso ?? null,
    atoInfracionalGravidade: adolescente.atoInfracionalGravidade ?? false,
    atoInfracionalGravidadeObs: adolescente.atoInfracionalGravidadeObs ?? null,
    statusUnidade,
    alojamentoAtualId: adolescente.alojamentoAtualId ?? null,
    faseInternacaoAtualId: adolescente.faseInternacaoAtualId ?? null,
    dataDesinternacao: formatDate(adolescente.dataDesinternacao),
    agenteReferenciaId: adolescente.agenteReferenciaId ?? null,
    agenteReferencia: adolescente.agenteReferencia
      ? {
          id: adolescente.agenteReferencia.id,
          nome: adolescente.agenteReferencia.nome,
          atividade: adolescente.agenteReferencia.atividade ?? null,
          email: adolescente.agenteReferencia.email,
          telefone: adolescente.agenteReferencia.telefone ?? null,
        }
      : null,
    alojamentoAtual,
    faccaoGrupoId: adolescente.faccaoGrupoId ?? null,
    faccaoNumeroMembro: adolescente.faccaoNumeroMembro ?? null,
    faccao: adolescente.faccao
      ? {
          id: adolescente.faccao.id,
          nome: adolescente.faccao.nomeFaccao,
          numeroMembro: adolescente.faccaoNumeroMembro ?? null,
        }
      : null,
    bairroOrigemId: adolescente.bairroOrigemId ?? null,
    bairroOrigem: adolescente.bairroOrigem
      ? {
          id: adolescente.bairroOrigem.id,
          nome: adolescente.bairroOrigem.nomeBairro,
          cidade: adolescente.bairroOrigem.cidade,
        }
      : null,
    riscoFuga: adolescente.riscoFuga ?? null,
    grupos,
    tatuagens,
    alertaRiscoSuicidio: adolescente.alertaRiscoSuicidio ?? false,
    alertaPerfilMapeado: adolescente.alertaPerfilMapeado ?? false,
    alertaSaudeConfidencial: adolescente.alertaSaudeConfidencial ?? false,
    alertaSaudeDetalhes: adolescente.alertaSaudeDetalhes ?? null,
    conflitosA:
      adolescente.conflitosA?.map((conflito) => ({
        id: conflito.id,
        adolescenteAId: conflito.adolescenteAId,
        adolescenteBId: conflito.adolescenteBId,
        tipoConflito: conflito.tipoConflito,
        status: conflito.status,
        descricao: conflito.descricao,
        criadoEm: formatDate(conflito.criadoEm),
        adversario: conflito.adolescenteB
          ? {
              id: conflito.adolescenteB.id,
              nomeCompleto: conflito.adolescenteB.nomeCompleto,
              numeroSms: conflito.adolescenteB.numeroSms ?? null,
            }
          : null,
      })) ?? [],
    conflitosB:
      adolescente.conflitosB?.map((conflito) => ({
        id: conflito.id,
        adolescenteAId: conflito.adolescenteAId,
        adolescenteBId: conflito.adolescenteBId,
        tipoConflito: conflito.tipoConflito,
        status: conflito.status,
        descricao: conflito.descricao,
        criadoEm: formatDate(conflito.criadoEm),
        adversario: conflito.adolescenteA
          ? {
              id: conflito.adolescenteA.id,
              nomeCompleto: conflito.adolescenteA.nomeCompleto,
              numeroSms: conflito.adolescenteA.numeroSms ?? null,
            }
          : null,
      })) ?? [],
    criadoEm: formatDate(adolescente.criadoEm),
    atualizadoEm: formatDate(adolescente.atualizadoEm),
  };
}
