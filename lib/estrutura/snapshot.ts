import { prisma } from "@/lib/prisma";
import {
  calcularRiscoAlojamento,
  criarMapaSlots,
  type CasaRisco,
} from "@/lib/riscos/calcular";
import type { Adolescente, Alojamento } from "@/types";

type ConflitoResumo = {
  id: string;
  tipo: string | null;
  status: string;
  adversario?: {
    id: string;
    nome: string;
    sms?: string | null;
    alojamento?: string | null;
  } | null;
  origem?: string | null;
  criadoEm?: string | Date;
  resolvidoEm?: string | Date | null;
};

type OcupanteResumo = {
  id: string;
  nome_completo: string;
  nome_social?: string | null;
  numero_sms?: string | null;
  foto_url?: string | null;
  status_unidade?: string | null;
  alerta_risco_suicidio?: boolean;
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
};

type AlojamentoResumo = {
  id: string;
  numero: string;
  ala: string | null;
  status_manutencao: string;
  alojamento_frontal_id: string | null;
  cor_risco: string;
  nivel_risco: number;
  icones: string[];
  alertas: string[];
  ocupante: OcupanteResumo | null;
};

type CasaResumo = {
  id: string;
  nome: string;
  numero: number | null;
  isolada: boolean;
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
  };
};

const CACHE_SYMBOL = Symbol.for("cense.estrutura.snapshot");
const DEFAULT_TTL_MS = 30_000;

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
  return {
    id: conflito.id,
    tipo: conflito.tipoConflito,
    status: conflito.status,
    origem: conflito.ciOrigem
      ? `CI ${conflito.ciOrigem.numero}/${conflito.ciOrigem.ano}`
      : conflito.ciOrigemId ?? null,
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

const calcularSnapshot = async (): Promise<{
  publico: EstruturaSnapshot;
  casasRisco: CasaRisco[];
}> => {
  const casasDb = await prisma.casa.findMany({
    include: {
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
            },
          },
        },
        orderBy: [{ ala: "asc" }, { numeroAlojamento: "asc" }],
      },
    },
    orderBy: { numero: "asc" },
  });

  const casasParaCalculo: CasaRisco[] = casasDb.map((casa) => ({
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
        adolescentes: alojamento.adolescentes as unknown as Adolescente[],
      } as Alojamento;
    }),
  }));

  const slots = criarMapaSlots(casasParaCalculo);

  const casasProcessadas: CasaResumo[] = casasDb.map((casa, indice) => {
    const casaParaCalculo = casasParaCalculo[indice];

    const alojamentosProcessados: AlojamentoResumo[] = casa.alojamentos.map(
      (alojamento) => {
        const alojamentoParcial = alojamento as unknown as Partial<Alojamento>;

        const risco = calcularRiscoAlojamento({
          alojamento: {
            ...alojamento,
            adolescentes: alojamento.adolescentes as unknown as Adolescente[],
          } as any,
          casaAtual: casaParaCalculo,
          casas: casasParaCalculo,
          slots,
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
          };
        }

        return {
          id: alojamento.id,
          numero: alojamento.numeroAlojamento,
          ala: alojamento.ala,
          status_manutencao: alojamento.statusManutencao,
          alojamento_frontal_id: alojamento.alojamentoFrontalId,
          cor_risco: corRisco,
          nivel_risco: risco.nivel,
          icones,
          alertas: Array.from(alertasSet),
          ocupante: ocupanteFormatado,
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
