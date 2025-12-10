import type { Prisma } from "@prisma/client";
import type { Adolescente, StatusUnidade, Ala } from "@/types";
import {
  ALERTA_ESPECIAL_TIPOS,
  ALERTAS_ESPECIAIS,
  extrairNivelRiscoSuicidio,
  mapearTipoEspecialPorCodigo,
} from "@/lib/alertas/especiais";

// Prisma include used across adolescentes endpoints to ensure we always fetch
// the same related entities before mapping them to the API contract.
export const INCLUDE_ADOLESCENTE_DEFAULT = {
  alojamentoAtual: {
    include: { casa: true },
  },
  faccao: true,
  bairroOrigem: true,
  tecnicosReferencia: {
    include: {
      tecnicoReferencia: true,
    },
    orderBy: {
      criadoEm: "asc",
    },
  },
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
          statusUnidade: true,
          bairroOrigemId: true,
          faccaoGrupoId: true,
          faccao: {
            select: {
              id: true,
              nomeFaccao: true,
            },
          },
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
          statusUnidade: true,
          bairroOrigemId: true,
          faccaoGrupoId: true,
          faccao: {
            select: {
              id: true,
              nomeFaccao: true,
            },
          },
        },
      },
    },
  },
  historicoInfracional: {
    orderBy: {
      ano: "desc",
    },
  },
  alertasAtivos: {
    where: { desativadoEm: null },
    select: {
      id: true,
      tipoAlerta: true,
      descricaoAlerta: true,
      nivelRisco: true,
    },
  },
  historicoMovimentacao: {
    where: {
      tipo: "RISCO_FUGA_ALERTA",
    },
    orderBy: {
      registradoEm: "desc",
    },
    take: 1,
    select: {
      id: true,
      descricao: true,
      registradoEm: true,
      criadoEm: true,
      referenciaTipo: true,
      referenciaId: true,
      operador: {
        select: {
          id: true,
          nomeCompleto: true,
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
      significadoPessoal: tatuagem.significadoPessoal ?? null,
      nivelRisco: tatuagem.tatuagemCatalogo?.nivelRisco ?? null,
      localCorpo: tatuagem.localCorpo ?? null,
      observacoes: tatuagem.observacoes ?? null,
    })) ?? [];

  const historicoInfracional =
    adolescente.historicoInfracional?.map((registro) => ({
      id: registro.id,
      descricao: registro.atoInfracionalDescricao,
      ano: registro.atoInfracionalAno ?? registro.ano ?? null,
      processo: registro.atoInfracionalProcesso ?? null,
      gravidade: registro.atoInfracionalGravidade ?? false,
      gravidadeObs: registro.atoInfracionalGravidadeObs ?? null,
      unidadeInternacao: registro.unidadeInternacao ?? null,
      observacoes: registro.observacoes ?? null,
    })) ?? [];

  const alertasEspeciais =
    adolescente.alertasAtivos
      ?.map((alerta) => {
        const tipo = mapearTipoEspecialPorCodigo(alerta.tipoAlerta);
        if (!tipo) return null;
        return {
          id: alerta.id,
          tipo,
          descricao: alerta.descricaoAlerta ?? null,
          nivelRisco: alerta.nivelRisco ?? null,
        };
      })
      .filter(
        (
          alerta
        ): alerta is NonNullable<typeof alerta> => Boolean(alerta)
      ) ?? [];
  const alertaSuicidioNivel = extrairNivelRiscoSuicidio(alertasEspeciais);
  const riscoFugaOrigemRegistro = adolescente.historicoMovimentacao?.[0];

  return {
    id: adolescente.id,
    nomeCompleto: adolescente.nomeCompleto,
    nomeSocial: adolescente.nomeSocial ?? null,
    numeroSms: adolescente.numeroSms ?? null,
    numeroInterno: adolescente.numeroInterno ?? null,
    vulgo: adolescente.vulgo ?? null,
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
  tecnicosReferencia:
    adolescente.tecnicosReferencia?.map((vinculo) => ({
      id: vinculo.tecnicoReferencia.id,
      nome: vinculo.tecnicoReferencia.nome,
      atividade: vinculo.tecnicoReferencia.atividade ?? null,
      email: vinculo.tecnicoReferencia.email,
      telefone: vinculo.tecnicoReferencia.telefone ?? null,
    })) ?? [],
    alojamentoAtual,
    faccaoGrupoId: adolescente.faccaoGrupoId ?? null,
    faccaoFuncao: adolescente.faccaoFuncao ?? null,
    faccaoInformacaoOrigem: adolescente.faccaoInformacaoOrigem ?? null,
    faccaoInformacaoDetalhe: adolescente.faccaoInformacaoDetalhe ?? null,
    faccao: adolescente.faccao
      ? {
          id: adolescente.faccao.id,
          nome: adolescente.faccao.nomeFaccao,
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
    riscoFugaOrigem: riscoFugaOrigemRegistro
      ? {
          descricao: riscoFugaOrigemRegistro.descricao ?? null,
          registradoEm: formatDate(
            riscoFugaOrigemRegistro.registradoEm ??
              riscoFugaOrigemRegistro?.criadoEm
          ),
          referenciaTipo: riscoFugaOrigemRegistro.referenciaTipo ?? null,
          referenciaId: riscoFugaOrigemRegistro.referenciaId ?? null,
          operador: riscoFugaOrigemRegistro.operador
            ? {
                id: riscoFugaOrigemRegistro.operador.id,
                nomeCompleto: riscoFugaOrigemRegistro.operador.nomeCompleto,
              }
            : null,
        }
      : null,
    grupos,
    tatuagens,
    alertaRiscoSuicidio: adolescente.alertaRiscoSuicidio ?? false,
    alertaPerfilMapeado: adolescente.alertaPerfilMapeado ?? false,
    alertaSaudeConfidencial: adolescente.alertaSaudeConfidencial ?? false,
    alertaSaudeDetalhes: adolescente.alertaSaudeDetalhes ?? null,
    alertaRiscoSuicidioNivel: alertaSuicidioNivel,
    conflitosA:
      adolescente.conflitosA
        ?.filter(
          (conflito) => conflito.adolescenteB?.statusUnidade === "ATIVO"
        )
        .map((conflito) => ({
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
      adolescente.conflitosB
        ?.filter(
          (conflito) => conflito.adolescenteA?.statusUnidade === "ATIVO"
        )
        .map((conflito) => ({
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
    historicoInfracional,
    alertasEspeciais,
    alertasPendentes: 0,
    criadoEm: formatDate(adolescente.criadoEm),
    atualizadoEm: formatDate(adolescente.atualizadoEm),
  };
}
