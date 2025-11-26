import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calcularRiscoAlojamento,
  criarMapaSlots,
  type CasaRisco,
  type AlojamentoRisco,
  type AdolescenteRisco,
  type ConflitosExternosMapa,
} from "@/lib/riscos/calcular";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";
import {
  montarMapaBairrosConflitantes,
  montarMapaFaccoesConflitantes,
  type BairroConflitoInfo,
  type FaccaoConflitoInfo,
} from "@/lib/conflitos";
import { classificarProximidade } from "@/lib/riscos/proximidade";

/**
 * Formata os conflitos externos (bairros e facções) para o formato esperado
 * pelo cálculo de risco
 */
const formatarImpactosExternos = (
  adolescente: any,
  bairros: Map<string, BairroConflitoInfo>,
  faccoes: Map<string, FaccaoConflitoInfo>
): ConflitosExternosMapa => {
  const impactos: ImpactoConflitoExterno[] = [];

  bairros.forEach((info) => {
    impactos.push({
      conflitoId: info.id,
      conflitoTipo: "BAIRRO",
      statusConflito: info.status,
      risco: "MEDIO",
      conflitoOrigem: {
        id: info.origem.id,
        nome: info.origem.nome,
      },
      conflitoDestino: {
        id: info.destino.id,
        nome: info.destino.nome,
      },
      adolescente: {
        id: adolescente.id,
        nome: adolescente.nomeCompleto,
        status: adolescente.statusUnidade,
        numeroSms: adolescente.numeroSms,
        bairro: adolescente.bairroOrigem
          ? {
              id: adolescente.bairroOrigem.id,
              nome:
                adolescente.bairroOrigem.nomeBairro ??
                adolescente.bairroOrigem.nome,
              cidade: adolescente.bairroOrigem.cidade ?? "Desconhecida",
            }
          : null,
        faccao: null,
        alojamento: null,
      },
    });
  });

  faccoes.forEach((info) => {
    impactos.push({
      conflitoId: info.id,
      conflitoTipo: "FACCAO",
      statusConflito: info.status,
      risco: "ALTO",
      conflitoOrigem: {
        id: info.origem.id,
        nome: info.origem.nome,
      },
      conflitoDestino: {
        id: info.destino.id,
        nome: info.destino.nome,
      },
      adolescente: {
        id: adolescente.id,
        nome: adolescente.nomeCompleto,
        status: adolescente.statusUnidade,
        numeroSms: adolescente.numeroSms,
        bairro: null,
        faccao: adolescente.faccao
          ? {
              id: adolescente.faccao.id,
              nome:
                adolescente.faccao.nomeFaccao ??
                adolescente.faccao.nome ??
                undefined,
            }
          : null,
        alojamento: null,
      },
    });
  });

  if (impactos.length === 0) {
    return {};
  }

  return { [adolescente.id]: impactos };
};

/**
 * POST /api/conflitos/[id]/analisar-impacto
 * Analisa o impacto de um conflito nas alocações atuais
 * e sugere realocações se necessário
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Buscar conflito com adolescentes e suas alocações
    const conflito = await prisma.conflito.findUnique({
      where: { id },
      include: {
        adolescenteA: {
          include: {
            alojamentoAtual: {
              include: {
                casa: {
                  select: {
                    id: true,
                    nome: true,
                    numero: true,
                    isolada: true,
                  },
                },
              },
            },
            bairroOrigem: true,
            faccao: true,
          },
        },
        adolescenteB: {
          include: {
            alojamentoAtual: {
              include: {
                casa: {
                  select: {
                    id: true,
                    nome: true,
                    numero: true,
                    isolada: true,
                  },
                },
              },
            },
            bairroOrigem: true,
            faccao: true,
          },
        },
      },
    });

    if (!conflito) {
      return NextResponse.json(
        { erro: "Conflito não encontrado" },
        { status: 404 }
      );
    }

    const { adolescenteA, adolescenteB } = conflito;

    // 2. Verificar se ambos estão alocados
    const aAlocado = adolescenteA.alojamentoAtual !== null;
    const bAlocado = adolescenteB.alojamentoAtual !== null;

    if (!aAlocado && !bAlocado) {
      return NextResponse.json({
        conflito: {
          id: conflito.id,
          tipo: conflito.tipoConflito,
          status: conflito.status,
        },
        adolescenteA: {
          id: adolescenteA.id,
          nome: adolescenteA.nomeCompleto,
          sms: adolescenteA.numeroSms,
          alocado: false,
        },
        adolescenteB: {
          id: adolescenteB.id,
          nome: adolescenteB.nomeCompleto,
          sms: adolescenteB.numeroSms,
          alocado: false,
        },
        risco: "SEM_RISCO",
        mensagem: "Nenhum dos adolescentes está alocado atualmente",
        requerAcao: false,
      });
    }

    // 3. Analisar proximidade se ambos estão alocados
    let analiseProximidade = null;
    let nivelRisco = "DESCONHECIDO";
    let requerAcao = false;

    if (aAlocado && bAlocado) {
      const alojA = adolescenteA.alojamentoAtual!;
      const alojB = adolescenteB.alojamentoAtual!;

      // Verificar se estão na mesma casa
      const mesmaCasa = alojA.casaId === alojB.casaId;

      // Verificar se estão na mesma ala
      const mesmaAla = mesmaCasa && alojA.ala === alojB.ala;

      // Verificar se são frontais
      const saoFrontais =
        alojA.alojamentoFrontalId === alojB.id ||
        alojB.alojamentoFrontalId === alojA.id;

      // Classificar proximidade
      const proximidade = classificarProximidade(
        {
          alojamento: {
            id: alojA.id,
            casaId: alojA.casaId,
            numeroAlojamento: alojA.numeroAlojamento,
            ala: alojA.ala as any,
            alojamentoFrontalId: alojA.alojamentoFrontalId,
          },
          casa: alojA.casa,
        },
        {
          alojamento: {
            id: alojB.id,
            casaId: alojB.casaId,
            numeroAlojamento: alojB.numeroAlojamento,
            ala: alojB.ala as any,
            alojamentoFrontalId: alojB.alojamentoFrontalId,
          },
          casa: alojB.casa,
        }
      );

      // Determinar nível de risco
      if (saoFrontais) {
        nivelRisco = "CRITICO";
        requerAcao = true;
      } else if (mesmaAla) {
        nivelRisco = "ALTO";
        requerAcao = true;
      } else if (mesmaCasa) {
        nivelRisco = "MEDIO";
        requerAcao = true;
      } else {
        nivelRisco = "BAIXO";
        requerAcao = false;
      }

      analiseProximidade = {
        mesmaCasa,
        mesmaAla,
        saoFrontais,
        proximidade,
        casaA: {
          id: alojA.casa.id,
          nome: alojA.casa.nome,
          numero: alojA.casa.numero,
        },
        casaB: {
          id: alojB.casa.id,
          nome: alojB.casa.nome,
          numero: alojB.casa.numero,
        },
        alojamentoA: {
          id: alojA.id,
          numero: alojA.numeroAlojamento,
          ala: alojA.ala,
        },
        alojamentoB: {
          id: alojB.id,
          numero: alojB.numeroAlojamento,
          ala: alojB.ala,
        },
      };
    } else if (aAlocado || bAlocado) {
      nivelRisco = "BAIXO";
      requerAcao = false;
    }

    // 4. Gerar sugestões de realocação se necessário
    let sugestoes: any[] = [];

    if (requerAcao && (aAlocado || bAlocado)) {
      // Buscar todas as casas e alojamentos para análise
      const casasDb = await prisma.casa.findMany({
        orderBy: { numero: "asc" },
        include: {
          alojamentos: {
            where: {
              statusManutencao: { not: "INTERDITADO" },
            },
            orderBy: [{ ala: "asc" }, { numeroAlojamento: "asc" }],
            include: {
              adolescentes: {
                where: { statusUnidade: "ATIVO" },
                select: {
                  id: true,
                  nomeCompleto: true,
                  bairroOrigemId: true,
                  faccaoGrupoId: true,
                  alertaRiscoSuicidio: true,
                  alertaPerfilMapeado: true,
                  alertaSaudeConfidencial: true,
                  alertaSaudeDetalhes: true,
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
        },
      }) as any;

      const casasParaCalculo: CasaRisco[] = casasDb.map((casa: any) => ({
        id: casa.id,
        nome: casa.nome,
        numero: casa.numero ?? 0,
        isolada: casa.isolada,
        alojamentos: casa.alojamentos.map((alojamento: any): AlojamentoRisco => ({
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
          adolescentes: alojamento.adolescentes.map((morador: any): AdolescenteRisco => ({
            id: morador.id,
            nomeCompleto: morador.nomeCompleto,
            bairroOrigemId: morador.bairroOrigemId,
            faccaoGrupoId: morador.faccaoGrupoId,
            alertaRiscoSuicidio: morador.alertaRiscoSuicidio,
            alertaPerfilMapeado: morador.alertaPerfilMapeado,
            alertaSaudeConfidencial: morador.alertaSaudeConfidencial,
            alertaSaudeDetalhes: morador.alertaSaudeDetalhes,
            faccao: morador.faccao
              ? {
                  id: morador.faccao.id,
                  nome: morador.faccao.nomeFaccao ?? undefined,
                }
              : null,
          })),
        })),
      }));

      const mapaSlots = criarMapaSlots(casasParaCalculo);

      // Buscar conflitos externos
      const [mapaBairros, mapaFaccoes] = await Promise.all([
        montarMapaBairrosConflitantes(adolescenteA.bairroOrigemId),
        montarMapaFaccoesConflitantes(
          adolescenteA.faccaoGrupoId ?? adolescenteA.faccao?.id ?? null
        ),
      ]);

      // Formatar conflitos externos para o formato esperado
      const conflitosExternos = formatarImpactosExternos(
        adolescenteA,
        mapaBairros,
        mapaFaccoes
      );

      // Encontrar alojamentos vagos com baixo risco para realocação
      const alojamentosVagos = casasParaCalculo.flatMap((casa) =>
        casa.alojamentos
          .filter((aloj) => aloj.adolescentes.length === 0)
          .map((aloj) => ({
            ...aloj,
            casa: {
              id: casa.id,
              nome: casa.nome,
              numero: casa.numero,
              isolada: casa.isolada,
            },
          }))
      );

      // Avaliar cada alojamento vago
      const avaliacoes = alojamentosVagos.map((alojVago) => {
        // Simular alocação do adolescente que precisa ser movido
        const adolescenteParaMover = bAlocado ? adolescenteB : adolescenteA;

        const adolescenteSimulado: AdolescenteRisco = {
          id: adolescenteParaMover.id,
          nomeCompleto: adolescenteParaMover.nomeCompleto,
          bairroOrigemId: adolescenteParaMover.bairroOrigemId,
          faccaoGrupoId: adolescenteParaMover.faccaoGrupoId,
          alertaRiscoSuicidio: adolescenteParaMover.alertaRiscoSuicidio,
          alertaPerfilMapeado: adolescenteParaMover.alertaPerfilMapeado,
          alertaSaudeConfidencial: adolescenteParaMover.alertaSaudeConfidencial,
          alertaSaudeDetalhes: adolescenteParaMover.alertaSaudeDetalhes,
          faccao: adolescenteParaMover.faccao
            ? {
                id: adolescenteParaMover.faccao.id,
                nome: adolescenteParaMover.faccao.nomeFaccao ?? undefined,
              }
            : null,
        };

        const alojSimulado = {
          ...alojVago,
          adolescentes: [adolescenteSimulado],
        };

        const casaSimulada = casasParaCalculo.find(
          (c) => c.id === alojVago.casa.id
        );

        if (!casaSimulada) return null;

        const resultado = calcularRiscoAlojamento({
          alojamento: alojSimulado,
          casaAtual: casaSimulada,
          casas: casasParaCalculo,
          slots: mapaSlots,
          conflitosExternos,
        });

        return {
          alojamento: {
            id: alojVago.id,
            numero: alojVago.numeroAlojamento,
            ala: alojVago.ala,
            casa: alojVago.casa.nome,
            casaNumero: alojVago.casa.numero,
          },
          nivelRisco: resultado.nivel,
          categoria: resultado.categoria,
          motivos: resultado.motivos,
        };
      });

      // Filtrar e ordenar sugestões (menor risco primeiro)
      sugestoes = avaliacoes
        .filter((a): a is NonNullable<typeof a> => a !== null && a.nivelRisco <= 2)
        .sort((a, b) => a.nivelRisco - b.nivelRisco)
        .slice(0, 5); // Top 5 sugestões
    }

    return NextResponse.json({
      conflito: {
        id: conflito.id,
        tipo: conflito.tipoConflito,
        status: conflito.status,
        descricao: conflito.descricao,
      },
      adolescenteA: {
        id: adolescenteA.id,
        nome: adolescenteA.nomeCompleto,
        sms: adolescenteA.numeroSms,
        alocado: aAlocado,
        alojamento: aAlocado
          ? {
              id: adolescenteA.alojamentoAtual!.id,
              numero: adolescenteA.alojamentoAtual!.numeroAlojamento,
              ala: adolescenteA.alojamentoAtual!.ala,
              casa: adolescenteA.alojamentoAtual!.casa.nome,
              casaNumero: adolescenteA.alojamentoAtual!.casa.numero,
            }
          : null,
      },
      adolescenteB: {
        id: adolescenteB.id,
        nome: adolescenteB.nomeCompleto,
        sms: adolescenteB.numeroSms,
        alocado: bAlocado,
        alojamento: bAlocado
          ? {
              id: adolescenteB.alojamentoAtual!.id,
              numero: adolescenteB.alojamentoAtual!.numeroAlojamento,
              ala: adolescenteB.alojamentoAtual!.ala,
              casa: adolescenteB.alojamentoAtual!.casa.nome,
              casaNumero: adolescenteB.alojamentoAtual!.casa.numero,
            }
          : null,
      },
      risco: nivelRisco,
      requerAcao,
      analiseProximidade,
      sugestoes,
      mensagem: requerAcao
        ? `AÇÃO NECESSÁRIA: Adolescentes conflitantes estão em proximidade ${nivelRisco.toLowerCase()}`
        : "Situação sob controle - adolescentes não estão em proximidade de risco",
    });
  } catch (error) {
    console.error("Erro ao analisar impacto do conflito:", error);
    return NextResponse.json(
      {
        erro: "Erro ao analisar impacto do conflito",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
