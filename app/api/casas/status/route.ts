// app/api/casas/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calcularRiscoAlojamento,
  criarMapaSlots,
  type CasaRisco,
} from "@/lib/riscos/calcular";
import type { Adolescente, Alojamento } from "@/types";

const mapearCorRisco = (categoria: string, nivel: number) => {
  if (categoria === "INTERDITADO") return "interditado";
  if (nivel >= 4) return "perigo";
  if (nivel >= 2) return "atencao";
  if (nivel === 1) return "seguro";
  return "livre";
};

export async function GET(request: NextRequest) {
  try {
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
      alojamentos: casa.alojamentos.map(
        (alojamento) =>
          ({
            id: alojamento.id,
            casaId: casa.id,
            numeroAlojamento: alojamento.numeroAlojamento,
            ala: alojamento.ala,
            statusManutencao: alojamento.statusManutencao,
            alojamentoFrontalId: alojamento.alojamentoFrontalId,
            localizacaoPreferencial: alojamento.localizacaoPreferencial,
            corRisco: alojamento.corRisco ?? undefined,
            nivelRisco: alojamento.nivelRisco ?? undefined,
            icones: alojamento.icones ?? [],
            alertas: alojamento.alertas ?? [],
            adolescentes: alojamento.adolescentes as Adolescente[],
          } as Alojamento)
      ),
    }));

    const slots = criarMapaSlots(casasParaCalculo);

    const casasProcessadas = casasParaCalculo.map((casa) => {
      const alojamentosProcessados = casa.alojamentos.map((alojamento) => {
        const risco = calcularRiscoAlojamento({
          alojamento,
          casaAtual: casa,
          casas: casasParaCalculo,
          slots,
        });

        const ocupante = alojamento.adolescentes[0] ?? null;
        const alertasSet = new Set<string>(risco.motivos ?? []);
        const icones: string[] = [];

        if (risco.ambiental?.ativo) {
          risco.ambiental.motivos.forEach((motivo) => alertasSet.add(motivo));
        }

        if (ocupante?.alertaRiscoSuicidio) {
          icones.push("risco_suicidio");
          alertasSet.add("Risco de suicidio");
        }
        if (ocupante?.alertaPerfilMapeado) {
          icones.push("perfil_mapeado");
          alertasSet.add("Perfil mapeado");
        }
        if (ocupante?.alertaSaudeConfidencial) {
          icones.push("saude_confidencial");
          alertasSet.add("Alerta de saude confidencial");
        }

        const corRisco = mapearCorRisco(risco.categoria, risco.nivel);

        const formatarLocalAdversario = (
          dados?:
            | {
                numeroAlojamento?: string | number | null;
                ala?: string | null;
                casa?: { nome?: string | null } | null;
              }
            | null
        ) => {
          if (!dados) return null;
          const partes: string[] = [];
          if (dados.casa?.nome) partes.push(dados.casa.nome);
          if (dados.numeroAlojamento) partes.push(`Aloj. ${dados.numeroAlojamento}`);
          if (dados.ala) partes.push(`Ala ${dados.ala}`);
          return partes.length > 0 ? partes.join(" - ") : null;
        };

        const normalizarData = (valor?: Date | string | null) => {
          if (!valor) return undefined;
          if (valor instanceof Date) {
            return valor.toISOString();
          }
          return valor;
        };

        const construirConflitoResumo = (
          conflito: any,
          adversario: any
        ) => ({
          id: conflito.id,
          adolescenteAId: conflito.adolescenteAId,
          adolescenteBId: conflito.adolescenteBId,
          tipoConflito: conflito.tipoConflito,
          status: conflito.status,
          descricao: conflito.descricao,
          criadoEm: normalizarData(conflito.criadoEm),
          resolvidoEm: normalizarData(conflito.resolvidoEm),
          adversario: adversario
            ? {
                id: adversario.id,
                nomeCompleto: adversario.nomeCompleto,
                numeroSms: adversario.numeroSms ?? null,
              }
            : null,
          adversarioLocal: adversario?.alojamentoAtual
            ? formatarLocalAdversario(adversario.alojamentoAtual)
            : null,
        });

        let ocupanteFormatado: any = null;

        if (ocupante) {
          const conflitosAtivosA: any[] = [];
          const conflitosAtivosB: any[] = [];
          const conflitosResolvidos: any[] = [];

          (ocupante.conflitosA ?? []).forEach((conflito: any) => {
            const resumo = construirConflitoResumo(
              conflito,
              conflito.adolescenteB
            );
            if (conflito.status === "RESOLVIDO") {
              conflitosResolvidos.push(resumo);
            } else {
              conflitosAtivosA.push(resumo);
            }
          });

          (ocupante.conflitosB ?? []).forEach((conflito: any) => {
            const resumo = construirConflitoResumo(
              conflito,
              conflito.adolescenteA
            );
            if (conflito.status === "RESOLVIDO") {
              conflitosResolvidos.push(resumo);
            } else {
              conflitosAtivosB.push(resumo);
            }
          });

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
            bairro_origem: ocupante.bairroOrigem
              ? {
                  id: ocupante.bairroOrigem.id,
                  nome:
                    ocupante.bairroOrigem.nomeBairro ??
                    ocupante.bairroOrigem.nome,
                  cidade: ocupante.bairroOrigem.cidade,
                }
              : null,
            faccao_grupo_id: ocupante.faccaoGrupoId,
            faccao: ocupante.faccao
              ? {
                  id: ocupante.faccao.id,
                  nome: ocupante.faccao.nomeFaccao ?? ocupante.faccao.nome,
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
      });

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

    return NextResponse.json({
      casas: casasProcessadas,
      estatisticas: {
        total_alojamentos: totalAlojamentos,
        alojamentos_ocupados: alojamentosOcupados,
        alojamentos_livres: alojamentosLivres,
        alojamentos_com_risco: alojamentosComRisco,
        taxa_ocupacao: taxaOcupacao,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar status das casas:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar status das casas",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
