import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/justificativas-algema/analise-risco?adolescenteId=xxx
// Análise inteligente de risco baseada em TODOS os dados do adolescente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adolescenteId = searchParams.get("adolescenteId");

    if (!adolescenteId) {
      return NextResponse.json(
        { erro: "ID do adolescente é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar TODOS os dados relevantes do adolescente
    const adolescente = await prisma.adolescente.findUnique({
      where: { id: adolescenteId },
      include: {
        faccao: true,
        bairroOrigem: true,
        alojamentoAtual: {
          include: {
            casa: true,
          },
        },
        faseInternacaoAtual: true,

        // Conflitos ativos
        conflitosA: {
          where: { status: "ATIVO" },
          include: {
            adolescenteB: {
              select: {
                nomeCompleto: true,
                numeroSms: true,
              },
            },
          },
        },
        conflitosB: {
          where: { status: "ATIVO" },
          include: {
            adolescenteA: {
              select: {
                nomeCompleto: true,
                numeroSms: true,
              },
            },
          },
        },

        // Tatuagens
        tatuagens: {
          include: {
            tatuagemCatalogo: true,
          },
        },

        // Histórico infracional
        historicoInfracional: {
          orderBy: {
            ano: "desc",
          },
        },

        // Comunicados internos recentes
        comunicadosInternos: {
          include: {
            ci: true,
          },
          take: 5,
        },

        // Alertas ativos
        alertasAtivos: {
          where: { desativadoEm: null },
          include: {
            ciOrigem: {
              select: {
                numero: true,
                ano: true,
                tipoCI: true,
                resumoCI: true,
              },
            },
          },
        },

        // Grupos/facções
        gruposMembros: {
          where: {
            dataSaida: null,
          },
          include: {
            grupo: {
              include: {
                casa: true,
              },
            },
          },
        },
      },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado" },
        { status: 404 }
      );
    }

    // ========== ANÁLISE DE RISCO ==========

    let pontuacaoRiscoFuga = 0;
    let pontuacaoRiscoAgressao = 0;
    let pontuacaoRiscoAutolesao = 0;
    const fundamentacoes: string[] = [];
    const fatoresAgravantes: string[] = [];

    // 1. ATO INFRACIONAL - GRAVIDADE
    if (adolescente.atoInfracionalGravidade) {
      pontuacaoRiscoFuga += 30;
      pontuacaoRiscoAgressao += 30;
      fatoresAgravantes.push(
        `Ato infracional com GRAVIDADE reconhecida: ${adolescente.atoInfracionalAtual || "não especificado"}`
      );
      if (adolescente.atoInfracionalGravidadeObs) {
        fatoresAgravantes.push(`Detalhes da gravidade: ${adolescente.atoInfracionalGravidadeObs}`);
      }
      fundamentacoes.push(
        `O adolescente cometeu ato infracional de natureza grave (${adolescente.atoInfracionalAtual}), demonstrando potencial de reincidência e resistência à contenção.`
      );
    } else if (adolescente.atoInfracionalAtual) {
      pontuacaoRiscoFuga += 10;
      fatoresAgravantes.push(`Ato infracional atual: ${adolescente.atoInfracionalAtual}`);
    }

    // 2. HISTÓRICO INFRACIONAL
    if (adolescente.historicoInfracional.length > 0) {
      const atosGraves = adolescente.historicoInfracional.filter(h => h.atoInfracionalGravidade);
      const totalAtos = adolescente.historicoInfracional.length;

      pontuacaoRiscoFuga += Math.min(totalAtos * 5, 20);
      pontuacaoRiscoAgressao += Math.min(atosGraves.length * 10, 30);

      fatoresAgravantes.push(
        `Histórico de ${totalAtos} ato(s) infracional(is) anterior(es), sendo ${atosGraves.length} de natureza grave`
      );
      fundamentacoes.push(
        `Registro de reincidência infracional com ${totalAtos} ato(s) anterior(es), caracterizando prática costumaz em atividade delitiva.`
      );
    }

    // 3. RISCO DE SUICÍDIO / INSTABILIDADE PSICOLÓGICA
    if (adolescente.alertaRiscoSuicidio) {
      pontuacaoRiscoAutolesao += 50;
      pontuacaoRiscoAgressao += 20;
      fatoresAgravantes.push("ALERTA CRÍTICO: Risco de suicídio identificado");
      fundamentacoes.push(
        "O adolescente apresenta instabilidade psicológica com risco de autolesão grave, necessitando monitoramento contínuo durante qualquer movimentação externa."
      );
    }

    // 4. ALERTA DE SAÚDE CONFIDENCIAL
    if (adolescente.alertaSaudeConfidencial) {
      pontuacaoRiscoAutolesao += 15;
      fatoresAgravantes.push("Alerta de saúde confidencial ativo");
      if (adolescente.alertaSaudeDetalhes) {
        fundamentacoes.push(
          `Condição de saúde que requer atenção especial: ${adolescente.alertaSaudeDetalhes}`
        );
      }
    }

    // 5. FACÇÃO / GRUPO CRIMINOSO
    if (adolescente.faccao) {
      pontuacaoRiscoFuga += 25;
      pontuacaoRiscoAgressao += 35;
      fatoresAgravantes.push(`Vinculação à facção/grupo: ${adolescente.faccao.nomeFaccao}`);

      // Verificar se há conflito faccional ativo
      const conflitosFaccionais = await prisma.faccaoConflito.count({
        where: {
          status: "ATIVO",
          OR: [
            { faccaoAId: adolescente.faccaoGrupoId! },
            { faccaoBId: adolescente.faccaoGrupoId! },
          ],
        },
      });

      if (conflitosFaccionais > 0) {
        pontuacaoRiscoAgressao += 20;
        fatoresAgravantes.push(
          `Facção em conflito ativo com ${conflitosFaccionais} grupo(s) rival(is)`
        );
      }

      fundamentacoes.push(
        `Participação identificada em facção/grupo criminoso organizado (${adolescente.faccao.nomeFaccao}), aumentando risco de articulação externa para fuga ou resgate.`
      );
    }

    // 6. TATUAGENS INDICATIVAS
    if (adolescente.tatuagens.length > 0) {
      const tatuagensAltoRisco = adolescente.tatuagens.filter(
        t => t.tatuagemCatalogo.nivelRisco === "ALTO"
      );
      const tatuagensMedioRisco = adolescente.tatuagens.filter(
        t => t.tatuagemCatalogo.nivelRisco === "MEDIO"
      );

      pontuacaoRiscoFuga += tatuagensAltoRisco.length * 10 + tatuagensMedioRisco.length * 5;
      pontuacaoRiscoAgressao += tatuagensAltoRisco.length * 15 + tatuagensMedioRisco.length * 7;

      if (tatuagensAltoRisco.length > 0) {
        fatoresAgravantes.push(
          `${tatuagensAltoRisco.length} tatuagem(ns) de ALTO RISCO identificada(s): ${tatuagensAltoRisco.map(t => t.tatuagemCatalogo.nomeTatuagem).join(", ")}`
        );
        fundamentacoes.push(
          `Presença de tatuagens indicativas de prática costumaz em atividade criminosa e vínculos faccionais profundos (${tatuagensAltoRisco.map(t => t.tatuagemCatalogo.nomeTatuagem).join(", ")}), conforme catalogação do sistema de inteligência.`
        );
      }

      if (tatuagensMedioRisco.length > 0) {
        fatoresAgravantes.push(
          `${tatuagensMedioRisco.length} tatuagem(ns) de risco médio: ${tatuagensMedioRisco.map(t => t.tatuagemCatalogo.nomeTatuagem).join(", ")}`
        );
      }
    }

    // 7. CONFLITOS ATIVOS
    const totalConflitosAtivos = adolescente.conflitosA.length + adolescente.conflitosB.length;
    if (totalConflitosAtivos > 0) {
      pontuacaoRiscoAgressao += Math.min(totalConflitosAtivos * 15, 40);
      fatoresAgravantes.push(
        `${totalConflitosAtivos} conflito(s) ativo(s) com outros adolescentes`
      );

      const nomesConflitantes = [
        ...adolescente.conflitosA.map(c => c.adolescenteB.nomeCompleto),
        ...adolescente.conflitosB.map(c => c.adolescenteA.nomeCompleto),
      ];

      fundamentacoes.push(
        `Conflitos interpessoais ativos com ${totalConflitosAtivos} adolescente(s), caracterizando potencial de confronto físico durante movimentações.`
      );
    }

    // 8. COMUNICADOS INTERNOS RECENTES
    const cisRecentes = adolescente.comunicadosInternos.length;
    if (cisRecentes > 0) {
      pontuacaoRiscoAgressao += Math.min(cisRecentes * 5, 20);
      fatoresAgravantes.push(
        `${cisRecentes} Comunicado(s) Interno(s) registrado(s) nos últimos registros`
      );
    }

    // 9. ALERTAS ATIVOS
    if (adolescente.alertasAtivos.length > 0) {
      const alertasCriticos = adolescente.alertasAtivos.filter(
        a => a.nivelRisco === "CRITICO"
      );
      const alertasAltos = adolescente.alertasAtivos.filter(
        a => a.nivelRisco === "ALTO"
      );

      pontuacaoRiscoFuga += alertasCriticos.length * 20 + alertasAltos.length * 10;
      pontuacaoRiscoAgressao += alertasCriticos.length * 25 + alertasAltos.length * 12;

      fatoresAgravantes.push(
        `${adolescente.alertasAtivos.length} alerta(s) ativo(s) no sistema: ${alertasCriticos.length} crítico(s), ${alertasAltos.length} alto(s)`
      );

      if (alertasCriticos.length > 0) {
        fundamentacoes.push(
          `Alertas críticos ativos no sistema de inteligência, indicando situação de risco elevado.`
        );
      }
    }

    // 10. RISCO DE FUGA CADASTRADO
    if (adolescente.riscoFuga) {
      if (adolescente.riscoFuga === "ALTO") {
        pontuacaoRiscoFuga += 30;
        fatoresAgravantes.push("Avaliação prévia de ALTO risco de fuga");
      } else if (adolescente.riscoFuga === "MEDIO") {
        pontuacaoRiscoFuga += 15;
        fatoresAgravantes.push("Avaliação prévia de risco médio de fuga");
      }
    }

    // 11. BAIRRO DE ORIGEM (território)
    if (adolescente.bairroOrigem) {
      pontuacaoRiscoFuga += 10;
      fatoresAgravantes.push(
        `Origem territorial: ${adolescente.bairroOrigem.nomeBairro}, ${adolescente.bairroOrigem.cidade}`
      );
      fundamentacoes.push(
        `Origem territorial em ${adolescente.bairroOrigem.nomeBairro} (${adolescente.bairroOrigem.cidade}), área com potencial articulação para tentativa de fuga ou resgate.`
      );
    }

    // ========== CLASSIFICAÇÃO FINAL DE RISCO ==========

    const classificarRisco = (pontuacao: number): string => {
      if (pontuacao >= 60) return "ALTO";
      if (pontuacao >= 30) return "MEDIO";
      return "BAIXO";
    };

    const riscoFugaFinal = classificarRisco(pontuacaoRiscoFuga);
    const riscoAgressaoFinal = classificarRisco(pontuacaoRiscoAgressao);
    const riscoAutolesaoFinal = classificarRisco(pontuacaoRiscoAutolesao);

    // ========== FUNDAMENTAÇÃO LEGAL AUTOMÁTICA ==========

    const fundamentacaoLegalBase = `
Considerando a Súmula Vinculante nº 11 do STF, que determina os requisitos para uso de algemas:

I - Resistência à movimentação ou fundado receio de fuga;
II - Perigo à integridade física do próprio adolescente ou de terceiros;
III - Necessidade de justificativa documentada por escrito.

E considerando o disposto na Lei 12.594/2012 (SINASE) e Lei 8.069/90 (ECA), que estabelecem o princípio da excepcionalidade no uso de contenção física,

FUNDAMENTA-SE o uso de algema nos seguintes elementos objetivos:
${fundamentacoes.map((f, i) => `\n${i + 1}. ${f}`).join("")}

A presente análise foi realizada com base em dados consolidados do Sistema de Inteligência do CENSE Maringá, incluindo:
- Perfil infracional e histórico de reincidência
- Vínculos faccionais e territoriais identificados
- Conflitos interpessoais ativos na unidade
- Avaliações psicossociais e alertas de segurança
- Comunicados internos e registros comportamentais
- Análise de tatuagens indicativas de prática delitiva
    `.trim();

    // ========== RECOMENDAÇÕES AUTOMÁTICAS DE MEDIDAS DE SEGURANÇA ==========

    const medidasRecomendadas: string[] = [
      "Uso de algemas apenas durante o transporte externo",
      "Acompanhamento por no mínimo 2 (dois) agentes socioeducativos",
      "Veículo oficial identificado e apropriado",
      "Comunicação prévia ao destino (fórum, hospital, etc.)",
    ];

    if (riscoFugaFinal === "ALTO" || riscoAgressaoFinal === "ALTO") {
      medidasRecomendadas.push(
        "Reforço de escolta com 3 ou mais agentes",
        "Revista de segurança antes e após o transporte",
        "Monitoramento contínuo sem perda de contato visual"
      );
    }

    if (adolescente.alertaRiscoSuicidio || riscoAutolesaoFinal === "ALTO") {
      medidasRecomendadas.push(
        "Acompanhamento de profissional de saúde mental se disponível",
        "Observação contínua durante todo o trajeto",
        "Remoção de objetos potencialmente lesivos"
      );
    }

    if (totalConflitosAtivos > 0) {
      medidasRecomendadas.push(
        "Verificar adolescentes conflitantes para evitar cruzamento de rotas",
        "Horários diferenciados de movimentação"
      );
    }

    medidasRecomendadas.push(
      "Registro fotográfico da contenção (sem exposição vexatória)",
      "Comunicação imediata à direção técnica da unidade"
    );

    // ========== HISTÓRICO COMPORTAMENTAL SUGERIDO ==========

    const historicoSugerido: string[] = [];

    if (cisRecentes > 0) {
      historicoSugerido.push(
        `Envolvimento em ${cisRecentes} Comunicado(s) Interno(s) recente(s)`
      );
    }

    if (totalConflitosAtivos > 0) {
      historicoSugerido.push(
        `Conflitos ativos com ${totalConflitosAtivos} adolescente(s) da unidade`
      );
    }

    if (adolescente.alertasAtivos.length > 0) {
      historicoSugerido.push(
        `${adolescente.alertasAtivos.length} alerta(s) ativo(s) de segurança no sistema`
      );
    }

    historicoSugerido.push(
      `Fase atual de internação: ${adolescente.faseInternacaoAtual?.nomeFase || "Não informada"}`
    );

    // ========== RESPOSTA CONSOLIDADA ==========

    return NextResponse.json({
      adolescente: {
        id: adolescente.id,
        nomeCompleto: adolescente.nomeCompleto,
        numeroSms: adolescente.numeroSms,
        numeroProcesso: adolescente.numeroProcesso,
        atoInfracionalAtual: adolescente.atoInfracionalAtual,
        faccao: adolescente.faccao?.nomeFaccao,
        bairroOrigem: adolescente.bairroOrigem
          ? `${adolescente.bairroOrigem.nomeBairro}, ${adolescente.bairroOrigem.cidade}`
          : null,
      },

      analiseRisco: {
        riscoFuga: riscoFugaFinal,
        riscoAgressao: riscoAgressaoFinal,
        riscoAutolesao: riscoAutolesaoFinal,

        pontuacoes: {
          fuga: pontuacaoRiscoFuga,
          agressao: pontuacaoRiscoAgressao,
          autolesao: pontuacaoRiscoAutolesao,
        },
      },

      fatoresAgravantes,

      fundamentacaoLegal: fundamentacaoLegalBase,

      medidasSegurancaRecomendadas: medidasRecomendadas,

      historicoComportamentalSugerido: historicoSugerido.join("; "),

      dadosComplementares: {
        totalConflitosAtivos,
        totalComunicadosInternos: cisRecentes,
        totalAlertasAtivos: adolescente.alertasAtivos.length,
        totalTatuagens: adolescente.tatuagens.length,
        totalHistoricoInfracional: adolescente.historicoInfracional.length,
        alertaRiscoSuicidio: adolescente.alertaRiscoSuicidio,
        atoInfracionalGravidade: adolescente.atoInfracionalGravidade,
      },

      observacao: "Esta análise foi gerada automaticamente pelo Sistema de Inteligência do CENSE Maringá. O operador deve complementar com informações específicas da movimentação atual.",
    });

  } catch (error) {
    console.error("Erro na análise de risco:", error);
    return NextResponse.json(
      { erro: "Erro ao realizar análise de risco" },
      { status: 500 }
    );
  }
}
