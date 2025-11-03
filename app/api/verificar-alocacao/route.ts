// app/api/verificar-alocacao/route.ts
// API CRÍTICA: Verifica riscos antes de alocar adolescente em alojamento

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/verificar-alocacao?adolescenteId=xxx&alojamentoId=yyy
 *
 * Analisa todos os riscos possíveis antes de alocar um adolescente:
 * - Conflitos com alojamentos frontais (NÍVEL 5 - CRÍTICO)
 * - Conflitos na mesma ala (NÍVEL 4 - ALTO)
 * - Conflitos na mesma casa, outra ala (NÍVEL 3 - MÉDIO-ALTO)
 * - Conflitos em zonas de risco (janelas) (NÍVEL 2 - MÉDIO)
 * - Alertas especiais (risco suicídio, perfil mapeado)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adolescenteId = searchParams.get("adolescenteId");
    const alojamentoId = searchParams.get("alojamentoId");

    // Validações
    if (!adolescenteId || !alojamentoId) {
      return NextResponse.json(
        {
          erro: "adolescenteId e alojamentoId são obrigatórios",
          permite_alocacao: false,
        },
        { status: 400 }
      );
    }

    // 1. Buscar dados do adolescente com conflitos
    const adolescente = await prisma.adolescente.findUnique({
      where: { id: adolescenteId },
      include: {
        conflitosA: {
          where: { status: "ATIVO" },
          include: {
            adolescenteB: {
              include: {
                alojamentoAtual: {
                  include: {
                    casa: true,
                  },
                },
              },
            },
          },
        },
        conflitosB: {
          where: { status: "ATIVO" },
          include: {
            adolescenteA: {
              include: {
                alojamentoAtual: {
                  include: {
                    casa: true,
                  },
                },
              },
            },
          },
        },
        faccao: true,
        bairroOrigem: true,
      },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado", permite_alocacao: false },
        { status: 404 }
      );
    }

    // 2. Buscar dados do alojamento alvo
    const alojamentoAlvo = await prisma.alojamento.findUnique({
      where: { id: alojamentoId },
      include: {
        casa: true,
        alojamentoFrontal: {
          include: {
            adolescentes: {
              where: { statusUnidade: "ATIVO" },
            },
          },
        },
        zonasRiscoAloj: {
          include: {
            zona: {
              include: {
                zonasVinculoA: {
                  include: {
                    zonaB: {
                      include: {
                        alojamentosLink: {
                          include: {
                            alojamento: {
                              include: {
                                adolescentes: {
                                  where: { statusUnidade: "ATIVO" },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                zonasVinculoB: {
                  include: {
                    zonaA: {
                      include: {
                        alojamentosLink: {
                          include: {
                            alojamento: {
                              include: {
                                adolescentes: {
                                  where: { statusUnidade: "ATIVO" },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!alojamentoAlvo) {
      return NextResponse.json(
        { erro: "Alojamento não encontrado", permite_alocacao: false },
        { status: 404 }
      );
    }

    // Verificar se alojamento está livre ou interditado
    if (alojamentoAlvo.statusManutencao === "INTERDITADO") {
      return NextResponse.json({
        permite_alocacao: false,
        requer_justificativa: false,
        nivel_risco: null,
        alertas: [
          {
            tipo: "ALOJAMENTO_INTERDITADO",
            nivel: 0,
            mensagem: "Este alojamento está interditado e não pode ser usado.",
            bloqueante: true,
          },
        ],
      });
    }

    // 3. Buscar todos os adolescentes na mesma casa
    const adolescentesMesmaCasa = await prisma.adolescente.findMany({
      where: {
        statusUnidade: "ATIVO",
        alojamentoAtual: {
          casaId: alojamentoAlvo.casaId,
        },
        id: { not: adolescenteId },
      },
      include: {
        alojamentoAtual: true,
      },
    });

    // 4. Combinar todos os conflitos do adolescente
    const todosConflitos = [
      ...adolescente.conflitosA.map((c) => ({
        conflito: c,
        adversario: c.adolescenteB,
      })),
      ...adolescente.conflitosB.map((c) => ({
        conflito: c,
        adversario: c.adolescenteA,
      })),
    ];

    // 5. ANÁLISE DE RISCOS
    const alertas: any[] = [];
    let nivelRiscoMaximo = 1;
    let requerJustificativa = false;

    // NÍVEL 5 - CRÍTICO: Conflito Frontal
    if (alojamentoAlvo.alojamentoFrontal) {
      const ocupantesFrontal = alojamentoAlvo.alojamentoFrontal.adolescentes;

      for (const ocupante of ocupantesFrontal) {
        const conflito = todosConflitos.find(
          (c) => c.adversario.id === ocupante.id
        );

        if (conflito) {
          alertas.push({
            tipo: "CONFLITO_FRONTAL",
            nivel: 5,
            mensagem: `⚠️ CONFLITO NÍVEL 5 (FRONTAL CRÍTICO) com ${conflito.adversario.nomeCompleto} no alojamento frontal ${alojamentoAlvo.alojamentoFrontal.numeroAlojamento}.`,
            adolescente_conflitante: {
              id: conflito.adversario.id,
              nome: conflito.adversario.nomeCompleto,
              alojamento: alojamentoAlvo.alojamentoFrontal.numeroAlojamento,
            },
            tipo_conflito: conflito.conflito.tipoConflito,
            origem: conflito.conflito.ciOrigemId ? `CI` : "Registro direto",
          });
          nivelRiscoMaximo = 5;
          requerJustificativa = true;
        }
      }
    }

    // NÍVEL 4 - ALTO: Conflito na mesma ala
    const adolescentesMesmaAla = adolescentesMesmaCasa.filter(
      (a) => a.alojamentoAtual?.ala === alojamentoAlvo.ala
    );

    for (const outroAdolescente of adolescentesMesmaAla) {
      const conflito = todosConflitos.find(
        (c) => c.adversario.id === outroAdolescente.id
      );

      if (conflito && nivelRiscoMaximo < 5) {
        alertas.push({
          tipo: "CONFLITO_MESMA_ALA",
          nivel: 4,
          mensagem: `⚠️ CONFLITO NÍVEL 4 (MESMA ALA) com ${conflito.adversario.nomeCompleto} no alojamento ${outroAdolescente.alojamentoAtual?.numeroAlojamento} (Ala ${alojamentoAlvo.ala}).`,
          adolescente_conflitante: {
            id: conflito.adversario.id,
            nome: conflito.adversario.nomeCompleto,
            alojamento: outroAdolescente.alojamentoAtual?.numeroAlojamento,
          },
          tipo_conflito: conflito.conflito.tipoConflito,
        });
        nivelRiscoMaximo = Math.max(nivelRiscoMaximo, 4);
        requerJustificativa = true;
      }
    }

    // NÍVEL 3 - MÉDIO-ALTO: Mesma casa, outra ala
    const adolescentesOutraAla = adolescentesMesmaCasa.filter(
      (a) => a.alojamentoAtual?.ala !== alojamentoAlvo.ala
    );

    for (const outroAdolescente of adolescentesOutraAla) {
      const conflito = todosConflitos.find(
        (c) => c.adversario.id === outroAdolescente.id
      );

      if (conflito && nivelRiscoMaximo < 4) {
        alertas.push({
          tipo: "CONFLITO_MESMA_CASA",
          nivel: 3,
          mensagem: `⚠️ CONFLITO NÍVEL 3 (MESMA CASA) com ${conflito.adversario.nomeCompleto} no alojamento ${outroAdolescente.alojamentoAtual?.numeroAlojamento} (Ala ${outroAdolescente.alojamentoAtual?.ala}).`,
          adolescente_conflitante: {
            id: conflito.adversario.id,
            nome: conflito.adversario.nomeCompleto,
            alojamento: outroAdolescente.alojamentoAtual?.numeroAlojamento,
          },
          tipo_conflito: conflito.conflito.tipoConflito,
        });
        nivelRiscoMaximo = Math.max(nivelRiscoMaximo, 3);
        requerJustificativa = true;
      }
    }

    // NÍVEL 2 - MÉDIO: Zona de Risco (janelas)
    // TODO: Implementar lógica de zonas de risco quando estiverem cadastradas

    // ALERTAS ESPECIAIS
    if (adolescente.alertaRiscoSuicidio) {
      const ocupanteFrontal = alojamentoAlvo.alojamentoFrontal?.adolescentes[0];

      alertas.push({
        tipo: "RISCO_SUICIDIO",
        nivel: 0,
        mensagem: "⚠️ ADOLESCENTE COM RISCO DE SUICÍDIO",
        detalhes: ocupanteFrontal
          ? "✅ Alojamento frontal está ocupado (recomendado)"
          : "⚠️ Alojamento frontal está VAZIO - recomenda-se ocupar",
        recomendacao: alojamentoAlvo.localizacaoPreferencial
          ? "✅ Localização preferencial (próximo a portas)"
          : "⚠️ Considerar alojar em localização preferencial",
      });
    }

    if (adolescente.alertaPerfilMapeado) {
      alertas.push({
        tipo: "PERFIL_MAPEADO",
        nivel: 0,
        mensagem: "🔒 PERFIL MAPEADO - Adolescente sob proteção especial",
        detalhes: "Considerar alocação estratégica para garantir segurança",
      });
    }

    if (adolescente.alertaSaudeConfidencial) {
      alertas.push({
        tipo: "ALERTA_SAUDE",
        nivel: 0,
        mensagem: "⚕️ ALERTA DE SAÚDE CONFIDENCIAL",
        detalhes: "Verificar detalhes com equipe de saúde antes de alocar",
      });
    }

    // 6. DETERMINAR NÍVEL DE RISCO FINAL
    let nivelRiscoFinal: string;
    if (nivelRiscoMaximo === 5) {
      nivelRiscoFinal = "CRÍTICO";
    } else if (nivelRiscoMaximo === 4) {
      nivelRiscoFinal = "ALTO";
    } else if (nivelRiscoMaximo === 3) {
      nivelRiscoFinal = "MÉDIO-ALTO";
    } else if (nivelRiscoMaximo === 2) {
      nivelRiscoFinal = "MÉDIO";
    } else {
      nivelRiscoFinal = "BAIXO";
    }

    // 7. RESPOSTA FINAL
    return NextResponse.json({
      permite_alocacao: true,
      requer_justificativa: requerJustificativa,
      nivel_risco: nivelRiscoFinal,
      nivel_numerico: nivelRiscoMaximo,
      alertas: alertas,
      alojamento: {
        id: alojamentoAlvo.id,
        casa: alojamentoAlvo.casa.nome,
        numero: alojamentoAlvo.numeroAlojamento,
        ala: alojamentoAlvo.ala,
      },
      adolescente: {
        id: adolescente.id,
        nome: adolescente.nomeCompleto,
        sms: adolescente.numeroSms,
      },
      estatisticas: {
        total_conflitos_ativos: todosConflitos.length,
        conflitos_detectados_nesta_alocacao: alertas.filter((a) =>
          a.tipo.includes("CONFLITO")
        ).length,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar alocação:", error);
    return NextResponse.json(
      {
        erro: "Erro ao verificar alocação",
        detalhes: error instanceof Error ? error.message : String(error),
        permite_alocacao: false,
      },
      { status: 500 }
    );
  }
}
