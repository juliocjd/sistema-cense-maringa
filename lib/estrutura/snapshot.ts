import { prisma } from "@/lib/prisma";
import {
  calcularRiscoAlojamento,
  criarMapaSlots,
  type CasaRisco,
  type AlojamentoRisco,
  type AdolescenteRisco,
  type ConflitoRisco,
  type ResultadoRisco,
} from "@/lib/riscos/calcular";
import type { ConflitosExternosMapa } from "@/lib/riscos/calcular";
import type { Adolescente, Alojamento, ConflitoResumo } from "@/types";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";
import { calcularImpactosExternos } from "@/lib/inteligencia/conflitos";
import {
  ALERTAS_ESPECIAIS,
  extrairNivelRiscoSuicidio,
} from "@/lib/alertas/especiais";
import {
  destinacaoOperacionalUsaPrazo,
  normalizarDestinacaoOperacionalCasa,
} from "@/lib/casas/configuracao-operacional";

type OcupanteResumo = {
  id: string;
  nome_completo: string;
  nome_social?: string | null;
  numero_sms?: string | null;
  foto_url?: string | null;
  status_unidade?: string | null;
  alerta_risco_suicidio?: boolean;
  alerta_risco_suicidio_nivel?: string | null;
  alerta_perfil_mapeado?: boolean;
  alerta_saude_confidencial?: boolean;
  bairro_origem_id?: string | null;
  bairro_origem?: {
    id: string;
    nome: string | null;
    cidade?: string | null;
  } | null;
  faccao_grupo_id?: string | null;
  faccao?: {
    id: string;
    nome?: string | null;
  } | null;
  conflitosA: ConflitoResumo[];
  conflitosB: ConflitoResumo[];
  conflitosResolvidos: ConflitoResumo[];
  data_entrada?: string | null;
  prazo_operacional_atual?: PrazoOperacionalResumo | null;
};

type PrazoOperacionalResumo = {
  destinacao: "PROVISORIA" | "ABRIGAMENTO";
  prazo_maximo_dias: number;
  data_inicio: string | null;
  data_limite: string | null;
  dias_permanencia: number | null;
  vencido: boolean;
  dias_atraso: number;
};

type AlojamentoResumo = {
  id: string;
  numero: string;
  ala: string | null;
  status_manutencao: string;
  alojamento_frontal_id: string | null;
  localizacao_preferencial: boolean;
  cor_risco: string;
  nivel_risco: number;
  icones: string[];
  alertas: string[];
  ocupante: OcupanteResumo | null;
  avaliacao_risco: ResultadoRisco;
  interdicao_justificativa?: string | null;
  interdicao_documento_tipo?: string | null;
  interdicao_documento_referencia?: string | null;
  prazo_operacional?: PrazoOperacionalResumo | null;
};

type CasaResumo = {
  id: string;
  nome: string;
  numero: number | null;
  isolada: boolean;
  destinacao_operacional: string;
  fase_exclusiva_id: string | null;
  fase_exclusiva: { id: string; nomeFase: string } | null;
  prazo_maximo_dias: number | null;
  risco_maximo_permitido: number | null;
  score_tensao: number;
  alojamentos: AlojamentoResumo[];
};

export type EstruturaSnapshot = {
  casas: CasaResumo[];
  estatisticas: {
    total_alojamentos: number;
    alojamentos_ocupados: number;
    alojamentos_livres: number;
    alojamentos_com_risco: number;
    taxa_ocupacao: string;
    prazos_operacionais: {
      monitorados: number;
      vencidos: number;
      vencendo_hoje: number;
      proximos_vencer: number;
      alertas_vencidos: Array<{
        adolescente_id: string;
        nome: string;
        casa_id: string;
        casa_nome: string;
        casa_numero: number | null;
        alojamento_id: string;
        alojamento_numero: string;
        destinacao: "PROVISORIA" | "ABRIGAMENTO";
        prazo_maximo_dias: number;
        data_limite: string | null;
        dias_atraso: number;
      }>;
    };
  };
};

const CACHE_SYMBOL = Symbol.for("cense.estrutura.snapshot");
const DEFAULT_TTL_MS = 30_000;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

type CacheEntry = {
  publico: EstruturaSnapshot;
  casasRisco: CasaRisco[];
  expiresAt: number;
};

const mapearCorRisco = (categoria: string, nivel: number) => {
  if (categoria === "INTERDITADO") return "interditado";
  if (nivel >= 4) return "perigo";
  if (nivel >= 2) return "atencao";
  if (nivel === 1) return "seguro";
  return "livre";
};

type ConflitoBruto = {
  id?: string;
  status?: string | null;
  tipoConflito?: string | null;
  adolescenteAId?: string | null;
  adolescenteBId?: string | null;
  adolescenteA?: { id?: string | null } | null;
  adolescenteB?: { id?: string | null } | null;
};

type AdolescenteParaRisco = {
  id: string;
  nomeCompleto: string;
  bairroOrigemId?: string | null;
  faccaoGrupoId?: string | null;
  alertaRiscoSuicidio?: boolean | null;
  alertaPerfilMapeado?: boolean | null;
  alertaSaudeConfidencial?: boolean | null;
  alertaSaudeDetalhes?: string | null;
  alertaRiscoSuicidioNivel?: string | null;
  faccao?:
    | {
        id?: string | null;
        nome?: string | null;
        nomeFaccao?: string | null;
      }
    | null;
  conflitosA?: ConflitoBruto[];
  conflitosB?: ConflitoBruto[];
  atoInfracionalVinculos?: Array<{
    vinculoId?: string | null;
    vinculo?: { id?: string | null; descricao?: string | null } | null;
  }>;
};

const mapearConflitoRisco = (conflito: ConflitoBruto): ConflitoRisco => ({
  id: String(conflito.id ?? ""),
  status: conflito.status ?? null,
  tipoConflito: conflito.tipoConflito ?? null,
  adolescenteAId:
    conflito.adolescenteAId ?? conflito.adolescenteA?.id ?? null,
  adolescenteBId:
    conflito.adolescenteBId ?? conflito.adolescenteB?.id ?? null,
});

const mapearAdolescenteRisco = (
  adolescente: AdolescenteParaRisco
): AdolescenteRisco => ({
  id: adolescente.id,
  nomeCompleto: adolescente.nomeCompleto,
  bairroOrigemId: adolescente.bairroOrigemId ?? null,
  faccaoGrupoId: adolescente.faccaoGrupoId ?? null,
  alertaRiscoSuicidio: Boolean(adolescente.alertaRiscoSuicidio),
  alertaPerfilMapeado: Boolean(adolescente.alertaPerfilMapeado),
  alertaSaudeConfidencial: Boolean(adolescente.alertaSaudeConfidencial),
  alertaSaudeDetalhes: adolescente.alertaSaudeDetalhes ?? null,
  alertaRiscoSuicidioNivel: adolescente.alertaRiscoSuicidioNivel ?? null,
  faccao: adolescente.faccao
    ? {
        id: adolescente.faccao.id ?? null,
        nome:
          adolescente.faccao.nome ??
          adolescente.faccao.nomeFaccao ??
          null,
      }
    : null,
  atoInfracionalVinculos:
    (adolescente.atoInfracionalVinculos ?? [])
      .flatMap((item: any) => {
        const vinculo = item?.vinculo ?? item;
        const id = vinculo?.id ?? item?.vinculoId ?? item?.id;
        if (!id) return [];
        const descricao =
          typeof vinculo?.descricao === "string" ? vinculo.descricao : null;
        return [
          {
            id: String(id),
            descricao,
          },
        ];
      }) ?? [],
  conflitosA: (adolescente.conflitosA ?? []).map(mapearConflitoRisco),
  conflitosB: (adolescente.conflitosB ?? []).map(mapearConflitoRisco),
});

const construirConflitoResumo = (
  conflito: any,
  adversario?: {
    id: string;
    nomeCompleto: string;
    numeroSms?: string | null;
    alojamentoAtual?: {
      numeroAlojamento?: string | number | null;
      ala?: string | null;
      casa?: { nome?: string | null } | null;
    } | null;
  } | null
): ConflitoResumo => {
  const ciOcorrencia = conflito.ocorrencias?.find(
    (o: any) => o?.ci
  )?.ci as { numero?: number | string; ano?: number | string } | undefined;

  const ciNumero =
    conflito.ciOrigem?.numero ??
    ciOcorrencia?.numero ??
    (conflito as any).ciNumero ??
    null;
  const ciAno =
    conflito.ciOrigem?.ano ??
    ciOcorrencia?.ano ??
    (conflito as any).ciAno ??
    null;

  const origemLabel =
    ciNumero !== undefined && ciNumero !== null
      ? `CI ${ciNumero}/${ciAno ?? ""}`
      : conflito.ciOrigem
      ? `CI ${conflito.ciOrigem.numero}/${conflito.ciOrigem.ano}`
      : ciOcorrencia?.numero
      ? `CI ${ciOcorrencia.numero}/${ciOcorrencia.ano ?? ""}`
      : conflito.ciOrigemId ?? null;

  return {
    id: conflito.id,
    tipo: conflito.tipoConflito,
    status: conflito.status,
    origem: origemLabel,
    // exponha numero/ano para o front usar como fallback na label
    ciNumero,
    ciAno,
    criadoEm: conflito.criadoEm,
    resolvidoEm: conflito.resolvidoEm,
    adversario: adversario
      ? {
          id: adversario.id,
          nome: adversario.nomeCompleto,
          sms: adversario.numeroSms ?? null,
          alojamento: adversario.alojamentoAtual
            ? `${adversario.alojamentoAtual.casa?.nome ?? "Casa"} ${
                adversario.alojamentoAtual.numeroAlojamento ?? ""
              }`
            : null,
        }
      : null,
  };
};

const cloneCasasRisco = (casas: CasaRisco[]): CasaRisco[] =>
  casas.map((casa) => ({
    ...casa,
    alojamentos: casa.alojamentos.map((aloj) => ({
      ...aloj,
      adolescentes: [...aloj.adolescentes],
    })),
  }));

const normalizarData = (valor?: Date | string | null) => {
  if (!valor) return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
};

const paraIso = (valor?: Date | string | null) => {
  const data = normalizarData(valor);
  return data ? data.toISOString() : null;
};

const calcularPrazoOperacional = ({
  destinacaoOperacional,
  prazoMaximoDias,
  dataInicio,
}: {
  destinacaoOperacional?: string | null;
  prazoMaximoDias?: number | null;
  dataInicio?: Date | string | null;
}): PrazoOperacionalResumo | null => {
  if (!destinacaoOperacionalUsaPrazo(destinacaoOperacional)) {
    return null;
  }

  if (typeof prazoMaximoDias !== "number" || prazoMaximoDias <= 0) {
    return null;
  }

  const destinacao = normalizarDestinacaoOperacionalCasa(destinacaoOperacional);
  if (destinacao !== "PROVISORIA" && destinacao !== "ABRIGAMENTO") {
    return null;
  }

  const inicio = normalizarData(dataInicio);
  if (!inicio) {
    return {
      destinacao,
      prazo_maximo_dias: prazoMaximoDias,
      data_inicio: null,
      data_limite: null,
      dias_permanencia: null,
      vencido: false,
      dias_atraso: 0,
    };
  }

  const agora = Date.now();
  const limite = new Date(inicio.getTime() + prazoMaximoDias * MS_POR_DIA);
  const diasPermanencia = Math.max(
    0,
    Math.floor((agora - inicio.getTime()) / MS_POR_DIA),
  );
  const atrasoMs = agora - limite.getTime();
  const vencido = atrasoMs > 0;
  const diasAtraso = vencido ? Math.ceil(atrasoMs / MS_POR_DIA) : 0;

  return {
    destinacao,
    prazo_maximo_dias: prazoMaximoDias,
    data_inicio: inicio.toISOString(),
    data_limite: limite.toISOString(),
    dias_permanencia: diasPermanencia,
    vencido,
    dias_atraso: diasAtraso,
  };
};

const agruparImpactosPorAdolescente = (
  impactos: ImpactoConflitoExterno[]
): ConflitosExternosMapa => {
  return impactos.reduce((acc, impacto) => {
    const adolescenteId = impacto.adolescente?.id;
    if (!adolescenteId) {
      return acc;
    }
    if (!acc[adolescenteId]) {
      acc[adolescenteId] = [];
    }
    acc[adolescenteId].push(impacto);
    return acc;
  }, {} as ConflitosExternosMapa);
};

const carregarImpactosExternosAtivos = async (): Promise<ConflitosExternosMapa> => {
  try {
    const resultado = await calcularImpactosExternos({
      status: "ATIVO",
      tipo: "TODOS",
    });
    const impactos = Array.isArray(resultado.impactos)
      ? resultado.impactos
      : [];
    return agruparImpactosPorAdolescente(impactos);
  } catch (error) {
    console.error("Falha ao carregar impactos externos para snapshot:", error);
    return {};
  }
};

const calcularSnapshot = async (): Promise<{
  publico: EstruturaSnapshot;
  casasRisco: CasaRisco[];
}> => {
  const [casasDb, impactosExternosMapa] = await Promise.all([
    prisma.casa.findMany({
      include: {
        faseExclusiva: {
          select: {
            id: true,
            nomeFase: true,
          },
        },
        alojamentos: {
          include: {
            adolescentes: {
              include: {
                conflitosA: {
                  select: {
                    id: true,
                    status: true,
                    tipoConflito: true,
                    descricao: true,
                    criadoEm: true,
                    resolvidoEm: true,
                    adolescenteAId: true,
                    adolescenteBId: true,
                    ciOrigemId: true,
                    ciOrigem: {
                      select: {
                        numero: true,
                        ano: true,
                      },
                    },
                    ocorrencias: {
                      select: {
                        ci: { select: { numero: true, ano: true } },
                      },
                    },
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
                        alojamentoAtual: {
                          select: {
                            numeroAlojamento: true,
                            ala: true,
                            casa: { select: { nome: true } },
                          },
                        },
                      },
                    },
                  },
                },
                conflitosB: {
                  select: {
                    id: true,
                    status: true,
                    tipoConflito: true,
                    descricao: true,
                    criadoEm: true,
                    resolvidoEm: true,
                    adolescenteAId: true,
                    adolescenteBId: true,
                    ciOrigemId: true,
                    ciOrigem: {
                      select: {
                        numero: true,
                        ano: true,
                      },
                    },
                    ocorrencias: {
                      select: {
                        ci: { select: { numero: true, ano: true } },
                      },
                    },
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
                        alojamentoAtual: {
                          select: {
                            numeroAlojamento: true,
                            ala: true,
                            casa: { select: { nome: true } },
                          },
                        },
                      },
                    },
                  },
                },
                bairroOrigem: true,
                faccao: true,
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
                alertasAtivos: {
                  where: {
                    desativadoEm: null,
                    tipoAlerta: ALERTAS_ESPECIAIS.RISCO_SUICIDIO.tipoAlerta,
                  },
                  select: {
                    tipoAlerta: true,
                    nivelRisco: true,
                  },
                },
              },
            },
          },
          orderBy: [{ ala: "asc" }, { numeroAlojamento: "asc" }],
        },
      },
      orderBy: { numero: "asc" },
    }),
    carregarImpactosExternosAtivos(),
  ]);

  const ocupacoesAtuais = casasDb.flatMap((casa) =>
    casa.alojamentos.flatMap((alojamento) =>
      (alojamento.adolescentes ?? []).map((adolescente) => ({
        adolescenteId: adolescente.id,
        casaId: casa.id,
        alojamentoId: alojamento.id,
        dataEntrada: adolescente.dataEntrada ?? null,
      })),
    ),
  );

  const adolescenteIdsOcupados = ocupacoesAtuais.map(
    (ocupacao) => ocupacao.adolescenteId,
  );
  const entradasUnidade = adolescenteIdsOcupados.length
    ? await prisma.adolescente.findMany({
        where: { id: { in: adolescenteIdsOcupados } },
        select: {
          id: true,
          dataEntrada: true,
        },
      })
    : [];
  const dataEntradaPorAdolescente = new Map(
    entradasUnidade.map((item) => [item.id, item.dataEntrada ?? null]),
  );
  const movimentacoesEntrada = adolescenteIdsOcupados.length
    ? await prisma.historicoMovimentacao.findMany({
        where: {
          adolescenteId: { in: adolescenteIdsOcupados },
          OR: [
            { destinoAlojamentoId: { not: null } },
            { destinoCasaId: { not: null } },
          ],
        },
        select: {
          adolescenteId: true,
          destinoCasaId: true,
          destinoAlojamentoId: true,
          registradoEm: true,
          criadoEm: true,
        },
        orderBy: [{ registradoEm: "desc" }, { criadoEm: "desc" }],
      })
    : [];

  const movimentosPorAdolescente = new Map<
    string,
    Array<{
      destinoCasaId: string | null;
      destinoAlojamentoId: string | null;
      registradoEm: Date | null;
      criadoEm: Date;
    }>
  >();

  movimentacoesEntrada.forEach((movimento) => {
    const lista = movimentosPorAdolescente.get(movimento.adolescenteId) ?? [];
    lista.push(movimento);
    movimentosPorAdolescente.set(movimento.adolescenteId, lista);
  });

  const dataInicioOcupacaoAtual = new Map<string, Date | null>();

  ocupacoesAtuais.forEach((ocupacao) => {
    const movimentos = movimentosPorAdolescente.get(ocupacao.adolescenteId) ?? [];
    const correspondente =
      movimentos.find(
        (movimento) =>
          movimento.destinoAlojamentoId === ocupacao.alojamentoId,
      ) ??
      movimentos.find((movimento) => movimento.destinoCasaId === ocupacao.casaId);

    dataInicioOcupacaoAtual.set(
      ocupacao.adolescenteId,
      normalizarData(
        correspondente?.registradoEm ??
          correspondente?.criadoEm ??
          dataEntradaPorAdolescente.get(ocupacao.adolescenteId) ??
          ocupacao.dataEntrada,
      ),
    );
  });

  const casasNormalizadas = casasDb.map((casa) => {
    casa.alojamentos.forEach((alojamento: any) => {
      alojamento.adolescentes =
        alojamento.adolescentes?.map((adolescente: any) => ({
          ...adolescente,
          alertaRiscoSuicidioNivel: extrairNivelRiscoSuicidio(
            adolescente.alertasAtivos
          ),
        })) ?? [];
    });
    return casa;
  });

  const casasParaCalculo: CasaRisco[] = casasNormalizadas.map((casa) => ({
    id: casa.id,
    nome: casa.nome,
    numero: casa.numero ?? 0,
    isolada: casa.isolada,
    alojamentos: casa.alojamentos.map((alojamento) => {
      const alojamentoNormalizado =
        alojamento as unknown as Partial<Alojamento>;
      return {
        id: alojamento.id,
        casaId: casa.id,
        numeroAlojamento: alojamento.numeroAlojamento,
        ala: alojamento.ala,
        statusManutencao: alojamento.statusManutencao,
        alojamentoFrontalId: alojamento.alojamentoFrontalId,
        localizacaoPreferencial: alojamento.localizacaoPreferencial,
        corRisco: alojamentoNormalizado.corRisco ?? undefined,
        nivelRisco: alojamentoNormalizado.nivelRisco ?? undefined,
        icones: alojamentoNormalizado.icones ?? [],
        alertas: alojamentoNormalizado.alertas ?? [],
        adolescentes: (alojamento.adolescentes ?? []).map(mapearAdolescenteRisco),
      } as AlojamentoRisco;
    }),
  }));

  const slots = criarMapaSlots(casasParaCalculo);

  const casasProcessadas: CasaResumo[] = casasDb.map((casa, indice) => {
    const casaParaCalculo = casasParaCalculo[indice];

    const alojamentosProcessados: AlojamentoResumo[] = casa.alojamentos.map(
      (alojamento) => {
        const alojamentoParcial = alojamento as unknown as Partial<Alojamento>;

        const alojamentoParaCalculo =
          casaParaCalculo?.alojamentos.find(
            (item) => item.id === alojamento.id
          ) ??
          ({
            id: alojamento.id,
            casaId: casa.id,
            numeroAlojamento: alojamento.numeroAlojamento,
            ala: alojamento.ala,
            statusManutencao: alojamento.statusManutencao,
            alojamentoFrontalId: alojamento.alojamentoFrontalId,
            localizacaoPreferencial: alojamento.localizacaoPreferencial,
            corRisco: alojamentoParcial.corRisco ?? undefined,
            nivelRisco: alojamentoParcial.nivelRisco ?? undefined,
            icones: alojamentoParcial.icones ?? [],
            alertas: alojamentoParcial.alertas ?? [],
            adolescentes: (alojamento.adolescentes ?? []).map(mapearAdolescenteRisco),
          } as AlojamentoRisco);

        const risco = calcularRiscoAlojamento({
          alojamento: alojamentoParaCalculo,
          casaAtual: casaParaCalculo,
          casas: casasParaCalculo,
          slots,
          conflitosExternos: impactosExternosMapa,
        });

        const corRisco = mapearCorRisco(risco.categoria, risco.nivel);
        const icones = (alojamentoParcial.icones ?? []) as string[];
        const alertasBase = (alojamentoParcial.alertas ?? []) as string[];
        const alertasSet = new Set<string>(alertasBase);
        if (risco.motivos?.length) {
          risco.motivos.forEach((motivo) => alertasSet.add(motivo));
        }

        let ocupanteFormatado: OcupanteResumo | null = null;

        const ocupante = alojamento.adolescentes?.[0];
        const prazoOperacional = ocupante
          ? calcularPrazoOperacional({
              destinacaoOperacional: casa.destinacaoOperacional,
              prazoMaximoDias: casa.prazoMaximoDias,
              dataInicio: dataInicioOcupacaoAtual.get(ocupante.id) ?? null,
            })
          : null;
        if (ocupante) {
          const conflitosAtivosA: ConflitoResumo[] = [];
          const conflitosAtivosB: ConflitoResumo[] = [];
          const conflitosResolvidos: ConflitoResumo[] = [];

          (ocupante.conflitosA ?? []).forEach((conflito: any) => {
            const adversario = conflito.adolescenteB;
            if (adversario?.statusUnidade !== "ATIVO") {
              return;
            }
            const resumo = construirConflitoResumo(conflito, adversario);
            if (conflito.status === "RESOLVIDO") {
              conflitosResolvidos.push(resumo);
            } else {
              conflitosAtivosA.push(resumo);
            }
          });

          (ocupante.conflitosB ?? []).forEach((conflito: any) => {
            const adversario = conflito.adolescenteA;
            if (adversario?.statusUnidade !== "ATIVO") {
              return;
            }
            const resumo = construirConflitoResumo(conflito, adversario);
            if (conflito.status === "RESOLVIDO") {
              conflitosResolvidos.push(resumo);
            } else {
              conflitosAtivosB.push(resumo);
            }
          });

          const bairroOrigem = ocupante.bairroOrigem;
          const faccao = ocupante.faccao;

          ocupanteFormatado = {
            id: ocupante.id,
            nome_completo: ocupante.nomeCompleto,
            nome_social: ocupante.nomeSocial,
            numero_sms: ocupante.numeroSms,
            foto_url: ocupante.fotoUrl,
            status_unidade: ocupante.statusUnidade,
            alerta_risco_suicidio: ocupante.alertaRiscoSuicidio,
            alerta_risco_suicidio_nivel:
              (ocupante as any).alertaRiscoSuicidioNivel ?? null,
            alerta_perfil_mapeado: ocupante.alertaPerfilMapeado,
            alerta_saude_confidencial: ocupante.alertaSaudeConfidencial,
            bairro_origem_id: ocupante.bairroOrigemId,
            bairro_origem: bairroOrigem
              ? {
                  id: bairroOrigem.id,
                  nome:
                    bairroOrigem.nomeBairro ??
                    (bairroOrigem as any)?.nome ??
                    null,
                  cidade: bairroOrigem.cidade ?? null,
                }
              : null,
            faccao_grupo_id: ocupante.faccaoGrupoId,
            faccao: faccao
              ? {
                  id: faccao.id,
                  nome: faccao.nomeFaccao ?? (faccao as any)?.nome ?? null,
                }
              : null,
            conflitosA: conflitosAtivosA,
            conflitosB: conflitosAtivosB,
            conflitosResolvidos,
            data_entrada: paraIso(ocupante.dataEntrada),
            prazo_operacional_atual: prazoOperacional,
          };
        }

        const avaliacaoRisco: ResultadoRisco = {
          ...risco,
          motivos: risco.motivos ?? [],
        };

        return {
          id: alojamento.id,
          numero: alojamento.numeroAlojamento,
          ala: alojamento.ala,
          status_manutencao: alojamento.statusManutencao,
          alojamento_frontal_id: alojamento.alojamentoFrontalId,
          localizacao_preferencial: alojamento.localizacaoPreferencial ?? false,
          cor_risco: corRisco,
          nivel_risco: risco.nivel,
          icones,
          alertas: Array.from(alertasSet),
          ocupante: ocupanteFormatado,
          avaliacao_risco: avaliacaoRisco,
          interdicao_justificativa:
            alojamentoParcial.interdicaoJustificativa ?? null,
          interdicao_documento_tipo:
            alojamentoParcial.interdicaoDocumentoTipo ?? null,
          interdicao_documento_referencia:
            alojamentoParcial.interdicaoDocumentoReferencia ?? null,
          prazo_operacional: prazoOperacional,
        };
      }
    );

    const scoreTensao = alojamentosProcessados.reduce(
      (acc, aloj) => acc + Math.max(0, (aloj.nivel_risco ?? 0) - 1),
      0
    );

    return {
      id: casa.id,
      nome: casa.nome,
      numero: casa.numero,
      isolada: casa.isolada,
      destinacao_operacional: casa.destinacaoOperacional,
      fase_exclusiva_id: casa.faseExclusivaId ?? null,
      fase_exclusiva: casa.faseExclusiva
        ? {
            id: casa.faseExclusiva.id,
            nomeFase: casa.faseExclusiva.nomeFase,
          }
        : null,
      prazo_maximo_dias: casa.prazoMaximoDias ?? null,
      risco_maximo_permitido: casa.riscoMaximoPermitido ?? null,
      score_tensao: scoreTensao,
      alojamentos: alojamentosProcessados,
    };
  });

  const totalAlojamentos = casasProcessadas.reduce(
    (acc, casa) => acc + casa.alojamentos.length,
    0
  );
  const alojamentosOcupados = casasProcessadas.reduce(
    (acc, casa) =>
      acc + casa.alojamentos.filter((a) => a.ocupante !== null).length,
    0
  );
  const alojamentosLivres = casasProcessadas.reduce(
    (acc, casa) =>
      acc +
      casa.alojamentos.filter(
        (a) => a.ocupante === null && a.status_manutencao === "LIVRE"
      ).length,
    0
  );
  const alojamentosComRisco = casasProcessadas.reduce(
    (acc, casa) =>
      acc +
      casa.alojamentos.filter((a) => (a.nivel_risco ?? 0) >= 3).length,
    0
  );
  const prazosMonitorados = casasProcessadas.flatMap((casa) =>
    casa.alojamentos.flatMap((alojamento) => {
      if (!alojamento.ocupante || !alojamento.prazo_operacional) {
        return [];
      }
      return [
        {
          adolescente_id: alojamento.ocupante.id,
          nome: alojamento.ocupante.nome_completo,
          casa_id: casa.id,
          casa_nome: casa.nome,
          casa_numero: casa.numero,
          alojamento_id: alojamento.id,
          alojamento_numero: alojamento.numero,
          ...alojamento.prazo_operacional,
        },
      ];
    }),
  );
  const alertasVencidos = prazosMonitorados
    .filter((item) => item.vencido)
    .sort((a, b) => b.dias_atraso - a.dias_atraso);
  const vencendoHoje = prazosMonitorados.filter((item) => {
    if (!item.data_limite || item.vencido) {
      return false;
    }
    const limite = new Date(item.data_limite).getTime();
    const diferenca = limite - Date.now();
    return diferenca >= 0 && diferenca <= MS_POR_DIA;
  }).length;
  const proximosVencer = prazosMonitorados.filter((item) => {
    if (!item.data_limite || item.vencido) {
      return false;
    }
    const limite = new Date(item.data_limite).getTime();
    const diferenca = limite - Date.now();
    return diferenca > MS_POR_DIA && diferenca <= 2 * MS_POR_DIA;
  }).length;

  const taxaOcupacao =
    totalAlojamentos > 0
      ? `${Math.round((alojamentosOcupados / totalAlojamentos) * 100)}%`
      : "0%";

  return {
    publico: {
      casas: casasProcessadas,
      estatisticas: {
        total_alojamentos: totalAlojamentos,
        alojamentos_ocupados: alojamentosOcupados,
        alojamentos_livres: alojamentosLivres,
        alojamentos_com_risco: alojamentosComRisco,
        taxa_ocupacao: taxaOcupacao,
        prazos_operacionais: {
          monitorados: prazosMonitorados.length,
          vencidos: alertasVencidos.length,
          vencendo_hoje: vencendoHoje,
          proximos_vencer: proximosVencer,
          alertas_vencidos: alertasVencidos.map((item) => ({
            adolescente_id: item.adolescente_id,
            nome: item.nome,
            casa_id: item.casa_id,
            casa_nome: item.casa_nome,
            casa_numero: item.casa_numero,
            alojamento_id: item.alojamento_id,
            alojamento_numero: item.alojamento_numero,
            destinacao: item.destinacao,
            prazo_maximo_dias: item.prazo_maximo_dias,
            data_limite: item.data_limite,
            dias_atraso: item.dias_atraso,
          })),
        },
      },
    },
    casasRisco: casasParaCalculo,
  };
};

export async function getEstruturaSnapshot(options?: {
  skipCache?: boolean;
  ttlMs?: number;
}): Promise<EstruturaSnapshot> {
  const store = globalThis as unknown as Record<
    string | symbol,
    CacheEntry | undefined
  >;
  const entry = store[CACHE_SYMBOL];
  const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;

  if (
    !options?.skipCache &&
    entry &&
    entry.expiresAt > Date.now() &&
    entry.publico
  ) {
    return entry.publico;
  }

  const data = await calcularSnapshot();
  store[CACHE_SYMBOL] = {
    publico: data.publico,
    casasRisco: data.casasRisco,
    expiresAt: Date.now() + ttl,
  };
  return data.publico;
}

export function invalidateEstruturaSnapshot() {
  const store = globalThis as unknown as Record<
    string | symbol,
    CacheEntry | undefined
  >;
  delete store[CACHE_SYMBOL];
}

export async function getEstruturaCasasParaCalculo(options?: {
  skipCache?: boolean;
  ttlMs?: number;
}): Promise<CasaRisco[]> {
  const store = globalThis as unknown as Record<
    string | symbol,
    CacheEntry | undefined
  >;
  let entry = store[CACHE_SYMBOL];
  const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;

  if (
    !options?.skipCache &&
    entry &&
    entry.expiresAt > Date.now() &&
    entry.casasRisco
  ) {
    return cloneCasasRisco(entry.casasRisco);
  }

  const data = await calcularSnapshot();
  entry = {
    publico: data.publico,
    casasRisco: data.casasRisco,
    expiresAt: Date.now() + ttl,
  };
  store[CACHE_SYMBOL] = entry;
  return cloneCasasRisco(data.casasRisco);
}
