// @ts-nocheck
import type { Adolescente, StatusUnidade, Ala } from "@/types";
import {
  ALERTA_ESPECIAL_TIPOS,
  ALERTAS_ESPECIAIS,
  extrairNivelRiscoSuicidio,
  mapearTipoEspecialPorCodigo,
} from "@/lib/alertas/especiais";

// Prisma include used across adolescentes endpoints to ensure we always fetch
// the same related entities before mapping them to the API contract.
export const INCLUDE_ADOLESCENTE_DEFAULT: any = {
  alojamentoAtual: {
    include: { casa: true },
  },
  faccao: true,
  faccaoVinculoAtual: {
    include: {
      faccao: true,
      criadoPor: { select: { id: true, nomeCompleto: true } },
      informanteAdolescente: {
        select: { id: true, nomeCompleto: true, numeroSms: true },
      },
    },
  },
  faccaoHistorico: {
    include: {
      faccao: true,
      criadoPor: { select: { id: true, nomeCompleto: true } },
      informanteAdolescente: {
        select: { id: true, nomeCompleto: true, numeroSms: true },
      },
    },
    orderBy: { criadoEm: "desc" },
  },
  bairroOrigem: {
    include: { cidadeCatalogo: { select: { estado: true } } },
  },
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
    include: {
      tatuagemCatalogo: {
        include: {
          faccoesAssociadas: {
            include: {
              faccao: true,
            },
          },
        },
      },
    },
  },
  atoInfracionalAtualCatalogo: {
    select: {
      id: true,
      nome: true,
      gravidade: true,
      violenciaOuGraveAmeaca: true,
    },
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
      ciOrigem: {
        select: {
          id: true,
          numero: true,
          ano: true,
          tipoCI: true,
          resumoCI: true,
          dataFato: true,
          desativadoEm: true,
          suspensoPorStatus: true,
        },
      },
      ocorrencias: {
        include: {
          ci: {
            select: {
              id: true,
              numero: true,
              ano: true,
              tipoCI: true,
              resumoCI: true,
              dataFato: true,
            },
          },
        },
        orderBy: { criadoEm: "desc" },
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
      ciOrigem: {
        select: {
          id: true,
          numero: true,
          ano: true,
          tipoCI: true,
          resumoCI: true,
          dataFato: true,
          desativadoEm: true,
        },
      },
      ocorrencias: {
        include: {
          ci: {
            select: {
              id: true,
              numero: true,
              ano: true,
              tipoCI: true,
              resumoCI: true,
              dataFato: true,
            },
          },
        },
        orderBy: { criadoEm: "desc" },
      },
    },
  },
  historicoInfracional: {
    orderBy: {
      ano: "desc",
    },
  },
  atoInfracionalVinculos: {
    include: {
      vinculo: {
        select: {
          id: true,
          descricao: true,
          criadoEm: true,
          atualizadoEm: true,
          adolescentes: {
            include: {
              adolescente: {
                select: {
                  id: true,
                  nomeCompleto: true,
                  numeroSms: true,
                  fotoUrl: true,
                  statusUnidade: true,
                },
              },
            },
          },
        },
      },
    },
  },
  alertasAtivos: {
    where: { desativadoEm: null },
    select: {
      id: true,
      tipoAlerta: true,
      descricaoAlerta: true,
      nivelRisco: true,
      criadoEm: true,
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

// Lighter include for map/estrutura views (avoid heavy relations).
export const INCLUDE_ADOLESCENTE_MAPA = {
  alojamentoAtual: {
    include: { casa: true },
  },
  faccao: true,
  bairroOrigem: {
    include: { cidadeCatalogo: { select: { estado: true } } },
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
  atoInfracionalVinculos: {
    include: {
      vinculo: {
        select: {
          id: true,
          descricao: true,
        },
      },
    },
  },
  conflitosA: {
    include: {
      adolescenteB: {
        select: {
          id: true,
          nomeCompleto: true,
          numeroSms: true,
          statusUnidade: true,
          alojamentoAtual: {
            select: {
              numeroAlojamento: true,
              ala: true,
              casa: { select: { nome: true } },
            },
          },
        },
      },
      ciOrigem: {
        select: {
          id: true,
          numero: true,
          ano: true,
          tipoCI: true,
          resumoCI: true,
          dataFato: true,
          desativadoEm: true,
          suspensoPorStatus: true,
        },
      },
      ocorrencias: {
        include: {
          ci: {
            select: {
              id: true,
              numero: true,
              ano: true,
              tipoCI: true,
              resumoCI: true,
              dataFato: true,
              desativadoEm: true,
              suspensoPorStatus: true,
            },
          },
        },
        orderBy: { criadoEm: "desc" },
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
          alojamentoAtual: {
            select: {
              numeroAlojamento: true,
              ala: true,
              casa: { select: { nome: true } },
            },
          },
        },
      },
      ciOrigem: {
        select: {
          id: true,
          numero: true,
          ano: true,
          tipoCI: true,
          resumoCI: true,
          dataFato: true,
          desativadoEm: true,
          suspensoPorStatus: true,
        },
      },
      ocorrencias: {
        include: {
          ci: {
            select: {
              id: true,
              numero: true,
              ano: true,
              tipoCI: true,
              resumoCI: true,
              dataFato: true,
              desativadoEm: true,
              suspensoPorStatus: true,
            },
          },
        },
        orderBy: { criadoEm: "desc" },
      },
    },
  },
} satisfies Prisma.AdolescenteInclude;

type PrismaAdolescente = Prisma.AdolescenteGetPayload<{
  include: typeof INCLUDE_ADOLESCENTE_DEFAULT;
}>;

type PrismaAdolescenteMapa = Prisma.AdolescenteGetPayload<{
  include: typeof INCLUDE_ADOLESCENTE_MAPA;
}>;

const formatDate = (valor: Date | string | null | undefined) => {
  if (!valor) {
    return undefined;
  }

  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime()) || data.getUTCFullYear() < 1900) {
    return undefined;
  }

  return data.toISOString();
};

export function mapPrismaAdolescente(adolescente: any): Adolescente {
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
      faccoesAssociadas:
        tatuagem.tatuagemCatalogo?.faccoesAssociadas
          ?.map((rel) => rel.faccao)
          .filter(Boolean)
          .map((faccao) => ({
            id: faccao.id,
            nomeFaccao: faccao.nomeFaccao,
          })) ?? [],
    })) ?? [];

  const historicoInfracional =
    adolescente.historicoInfracional?.map((registro) => ({
      id: registro.id,
      descricao: registro.atoInfracionalDescricao,
      ano: registro.atoInfracionalAno ?? registro.ano ?? null,
      processo: registro.atoInfracionalProcesso ?? null,
      gravidade: registro.atoInfracionalGravidade ?? false,
      gravidadeObs: registro.atoInfracionalGravidadeObs ?? null,
      catalogoId: registro.atoInfracionalCatalogoId ?? null,
      unidadeInternacao: registro.unidadeInternacao ?? null,
      comarca: registro.unidadeInternacao ?? null,
      observacoes: registro.observacoes ?? null,
    })) ?? [];

  const atoInfracionalVinculos =
    adolescente.atoInfracionalVinculos
      ?.map((item: any) => {
        const vinculo = item?.vinculo;
        if (!vinculo?.id) {
          return null;
        }
        const adolescentes =
          vinculo.adolescentes
            ?.map((rel: any) => rel?.adolescente)
            .filter(Boolean)
            .map((ad: any) => ({
              id: ad.id,
              nomeCompleto: ad.nomeCompleto,
              numeroSms: ad.numeroSms ?? null,
              fotoUrl: ad.fotoUrl ?? null,
              statusUnidade: ad.statusUnidade ?? undefined,
            })) ?? [];

        return {
          id: vinculo.id,
          descricao: vinculo.descricao ?? "",
          adolescentes,
          criadoEm: formatDate(vinculo.criadoEm) ?? null,
          atualizadoEm: formatDate(vinculo.atualizadoEm) ?? null,
        };
      })
      .filter((v: any) => Boolean(v)) ?? [];

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
  const alertasAtivos =
    adolescente.alertasAtivos?.map((alerta) => ({
      id: alerta.id,
      tipo: alerta.tipoAlerta ?? null,
      descricao: alerta.descricaoAlerta ?? null,
      nivelRisco: alerta.nivelRisco ?? null,
      criadoEm: formatDate(alerta.criadoEm) ?? null,
    })) ?? [];
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
  atoInfracionalAtualId: adolescente.atoInfracionalAtualId ?? null,
  atoInfracionalAtual: (adolescente as any).atoInfracionalAtualCatalogo?.nome ?? null,
  atoInfracionalCatalogoGravidade:
    (adolescente as any).atoInfracionalAtualCatalogo?.gravidade ?? null,
  atoInfracionalCatalogoViolencia:
    (adolescente as any).atoInfracionalAtualCatalogo?.violenciaOuGraveAmeaca ?? null,
    atoInfracionalAno: adolescente.atoInfracionalAno ?? null,
    atoInfracionalProcesso: adolescente.atoInfracionalProcesso ?? null,
    atoInfracionalObservacoes:
      (adolescente as any).atoInfracionalObservacoes ?? null,
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
  faccaoVinculoAtualId: adolescente.faccaoVinculoAtualId ?? null,
  faccaoHistorico:
    ((adolescente as any).faccaoHistorico as any[] | undefined)?.map((item) => ({
      id: item.id,
      faccaoId: item.faccaoId ?? null,
      faccaoNome: item.faccao?.nomeFaccao ?? null,
      funcao: item.funcao ?? null,
      origemInformacao: item.origemInformacao,
      nivelConfianca: item.nivelConfianca ?? null,
      statusRegistro: item.statusRegistro,
      observacao: item.observacao ?? null,
      fonte: item.fonte ?? null,
      informante: item.informanteAdolescente
        ? {
            id: item.informanteAdolescente.id,
            nome: item.informanteAdolescente.nomeCompleto,
            numeroSms: item.informanteAdolescente.numeroSms ?? null,
          }
        : null,
      criadoEm: formatDate(item.criadoEm),
      criadoPor: item.criadoPor
        ? { id: item.criadoPor.id, nome: item.criadoPor.nomeCompleto }
        : null,
    })) ?? [],
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
          estado: adolescente.bairroOrigem.cidadeCatalogo?.estado ?? null,
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
        .map((conflito) => {
        let ocorrencias = (conflito.ocorrencias ?? []).filter((oc) => {
          const ci = oc.ci as any;
          if (!ci) return false;
          if (ci.desativadoEm !== null) return false;
          return ci.suspensoPorStatus === false;
        });
        if (
          ocorrencias.length === 0 &&
          conflito.ciOrigem &&
          (conflito.ciOrigem as any).desativadoEm === null &&
          (conflito.ciOrigem as any).suspensoPorStatus !== true
        ) {
          ocorrencias = [
            {
              id: `ci-${conflito.ciOrigem.id}`,
              descricao: conflito.descricao ?? null,
              criadoEm: conflito.criadoEm,
              ci: conflito.ciOrigem,
            } as any,
          ];
        }
        ocorrencias.sort((a, b) =>
          new Date(b.criadoEm as any).getTime() -
          new Date(a.criadoEm as any).getTime()
        );

        return {
        id: conflito.id,
        adolescenteAId: conflito.adolescenteAId,
        adolescenteBId: conflito.adolescenteBId,
        tipoConflito: conflito.tipoConflito,
        status: conflito.status,
        descricao: conflito.descricao,
        criadoEm: formatDate(conflito.criadoEm),
        totalOcorrencias: ocorrencias.length,
        ultimaOcorrenciaEm:
          formatDate(conflito.ultimaOcorrenciaEm) ??
          (ocorrencias[0]?.criadoEm ? formatDate(ocorrencias[0].criadoEm) : undefined),
        ocorrencias: ocorrencias.map((oc) => ({
          id: oc.id,
          descricao: oc.descricao ?? null,
          criadoEm: formatDate(oc.criadoEm) ?? null,
          ci: oc.ci
            ? {
                id: oc.ci.id,
                numero: oc.ci.numero,
                ano: oc.ci.ano,
                tipo: (oc.ci as any).tipo ?? oc.ci.tipoCI ?? null,
                resumo: (oc.ci as any).resumo ?? oc.ci.resumoCI ?? null,
                dataFato: formatDate(oc.ci.dataFato) ?? null,
              }
            : null,
        })),
        adversario: conflito.adolescenteB
          ? {
              id: conflito.adolescenteB.id,
              nomeCompleto: conflito.adolescenteB.nomeCompleto,
              numeroSms: conflito.adolescenteB.numeroSms ?? null,
            }
          : null,
        };
        }) ?? [],
    conflitosB:
      adolescente.conflitosB
        ?.filter(
          (conflito) => conflito.adolescenteA?.statusUnidade === "ATIVO"
        )
        .map((conflito) => {
        const ocorrencias = (conflito.ocorrencias ?? []).filter((oc) => {
          const ci = oc.ci as any;
          if (!ci) return false;
          if (ci.desativadoEm !== null) return false;
          return ci.suspensoPorStatus === false;
        });
        ocorrencias.sort((a, b) =>
          new Date(b.criadoEm as any).getTime() -
          new Date(a.criadoEm as any).getTime()
        );

        return {
        id: conflito.id,
        adolescenteAId: conflito.adolescenteAId,
        adolescenteBId: conflito.adolescenteBId,
        tipoConflito: conflito.tipoConflito,
        status: conflito.status,
        descricao: conflito.descricao,
        criadoEm: formatDate(conflito.criadoEm),
        totalOcorrencias: ocorrencias.length,
        ultimaOcorrenciaEm:
          formatDate(conflito.ultimaOcorrenciaEm) ??
          (ocorrencias[0]?.criadoEm ? formatDate(ocorrencias[0].criadoEm) : undefined),
        ocorrencias: ocorrencias.map((oc) => ({
          id: oc.id,
          descricao: oc.descricao ?? null,
          criadoEm: formatDate(oc.criadoEm) ?? null,
          ci: oc.ci
            ? {
                id: oc.ci.id,
                numero: oc.ci.numero,
                ano: oc.ci.ano,
                tipo: (oc.ci as any).tipo ?? oc.ci.tipoCI ?? null,
                resumo: (oc.ci as any).resumo ?? oc.ci.resumoCI ?? null,
                dataFato: formatDate(oc.ci.dataFato) ?? null,
              }
            : null,
        })),
        adversario: conflito.adolescenteA
          ? {
              id: conflito.adolescenteA.id,
              nomeCompleto: conflito.adolescenteA.nomeCompleto,
              numeroSms: conflito.adolescenteA.numeroSms ?? null,
            }
          : null,
        };
        }) ?? [],
    historicoInfracional,
    atoInfracionalVinculos,
    alertasEspeciais,
    alertasAtivos,
    alertasPendentes: 0,
    criadoEm: formatDate(adolescente.criadoEm),
    atualizadoEm: formatDate(adolescente.atualizadoEm),
  };
}

export function mapPrismaAdolescenteMapa(
  adolescente: any
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
  const atoCatalogo = (adolescente as any).atoInfracionalAtualCatalogo ?? null;

  return {
    id: adolescente.id,
    nomeCompleto: adolescente.nomeCompleto,
    nomeSocial: adolescente.nomeSocial ?? null,
    vulgo: adolescente.vulgo ?? null,
    numeroSms: adolescente.numeroSms ?? null,
    numeroInterno: adolescente.numeroInterno ?? null,
    fotoUrl: adolescente.fotoUrl ?? null,
    dataNascimento: formatDate(adolescente.dataNascimento),
    dataEntrada: formatDate(adolescente.dataEntrada),
    numeroProcesso: adolescente.numeroProcesso ?? null,
    atoInfracionalAtualId: adolescente.atoInfracionalAtualId ?? null,
    atoInfracionalAtual: atoCatalogo?.nome ?? null,
    atoInfracionalAno: adolescente.atoInfracionalAno ?? null,
    atoInfracionalProcesso: adolescente.atoInfracionalProcesso ?? null,
    atoInfracionalGravidade: adolescente.atoInfracionalGravidade ?? false,
    atoInfracionalGravidadeObs: adolescente.atoInfracionalGravidadeObs ?? null,
    statusUnidade,
    alojamentoAtualId: adolescente.alojamentoAtualId ?? null,
    faseInternacaoAtualId: adolescente.faseInternacaoAtualId ?? null,
    dataDesinternacao: formatDate(adolescente.dataDesinternacao),
    tecnicosReferencia: [],
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
          estado: adolescente.bairroOrigem.cidadeCatalogo?.estado ?? null,
        }
      : null,
    riscoFuga: adolescente.riscoFuga ?? null,
    riscoFugaOrigem: null,
    grupos: [],
    tatuagens: [],
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
        .map((conflito) => {
          let ocorrencias = (conflito.ocorrencias ?? []).filter((oc) => {
            const ci = oc.ci as any;
            if (!ci) return false;
            if (ci.desativadoEm !== null) return false;
            return ci.suspensoPorStatus === false;
          });
          if (
            ocorrencias.length === 0 &&
            conflito.ciOrigem &&
            (conflito.ciOrigem as any).desativadoEm === null &&
            (conflito.ciOrigem as any).suspensoPorStatus !== true
          ) {
            ocorrencias = [
              {
                id: `ci-${conflito.ciOrigem.id}`,
                descricao: conflito.descricao ?? null,
                criadoEm: conflito.criadoEm,
                ci: conflito.ciOrigem,
              } as any,
            ];
          }
          ocorrencias.sort((a, b) =>
            new Date(b.criadoEm as any).getTime() -
            new Date(a.criadoEm as any).getTime()
          );

          return {
            id: conflito.id,
            adolescenteAId: conflito.adolescenteAId,
            adolescenteBId: conflito.adolescenteBId,
            tipoConflito: conflito.tipoConflito,
            status: conflito.status,
            descricao: conflito.descricao,
            criadoEm: formatDate(conflito.criadoEm),
            totalOcorrencias: ocorrencias.length,
            ultimaOcorrenciaEm:
              formatDate(conflito.ultimaOcorrenciaEm) ??
              (ocorrencias[0]?.criadoEm
                ? formatDate(ocorrencias[0].criadoEm)
                : undefined),
            ocorrencias: ocorrencias.map((oc) => ({
              id: oc.id,
              descricao: oc.descricao ?? null,
              criadoEm: formatDate(oc.criadoEm) ?? null,
              ci: oc.ci
                ? {
                    id: oc.ci.id,
                    numero: oc.ci.numero,
                    ano: oc.ci.ano,
                    tipo: (oc.ci as any).tipo ?? oc.ci.tipoCI ?? null,
                    resumo: (oc.ci as any).resumo ?? oc.ci.resumoCI ?? null,
                    dataFato: formatDate(oc.ci.dataFato) ?? null,
                  }
                : null,
            })),
            adversario: conflito.adolescenteB
              ? {
                  id: conflito.adolescenteB.id,
                  nomeCompleto: conflito.adolescenteB.nomeCompleto,
                  numeroSms: conflito.adolescenteB.numeroSms ?? null,
                }
              : null,
          };
        }) ?? [],
    conflitosB:
      adolescente.conflitosB
        ?.filter(
          (conflito) => conflito.adolescenteA?.statusUnidade === "ATIVO"
        )
        .map((conflito) => {
          const ocorrencias = (conflito.ocorrencias ?? []).filter((oc) => {
            const ci = oc.ci as any;
            if (!ci) return false;
            if (ci.desativadoEm !== null) return false;
            return ci.suspensoPorStatus === false;
          });
          ocorrencias.sort((a, b) =>
            new Date(b.criadoEm as any).getTime() -
            new Date(a.criadoEm as any).getTime()
          );

          return {
            id: conflito.id,
            adolescenteAId: conflito.adolescenteAId,
            adolescenteBId: conflito.adolescenteBId,
            tipoConflito: conflito.tipoConflito,
            status: conflito.status,
            descricao: conflito.descricao,
            criadoEm: formatDate(conflito.criadoEm),
            totalOcorrencias: ocorrencias.length,
            ultimaOcorrenciaEm:
              formatDate(conflito.ultimaOcorrenciaEm) ??
              (ocorrencias[0]?.criadoEm
                ? formatDate(ocorrencias[0].criadoEm)
                : undefined),
            ocorrencias: ocorrencias.map((oc) => ({
              id: oc.id,
              descricao: oc.descricao ?? null,
              criadoEm: formatDate(oc.criadoEm) ?? null,
              ci: oc.ci
                ? {
                    id: oc.ci.id,
                    numero: oc.ci.numero,
                    ano: oc.ci.ano,
                    tipo: (oc.ci as any).tipo ?? oc.ci.tipoCI ?? null,
                    resumo: (oc.ci as any).resumo ?? oc.ci.resumoCI ?? null,
                    dataFato: formatDate(oc.ci.dataFato) ?? null,
                  }
                : null,
            })),
            adversario: conflito.adolescenteA
              ? {
                  id: conflito.adolescenteA.id,
                  nomeCompleto: conflito.adolescenteA.nomeCompleto,
                  numeroSms: conflito.adolescenteA.numeroSms ?? null,
                }
              : null,
          };
        }) ?? [],
    historicoInfracional: [],
    alertasEspeciais,
    alertasPendentes: 0,
    criadoEm: formatDate(adolescente.criadoEm),
    atualizadoEm: formatDate(adolescente.atualizadoEm),
  };
}
// @ts-nocheck
import type { Prisma } from "@prisma/client";
// @ts-ignore above line moved
