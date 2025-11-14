import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "30"; // dias
    const casaId = searchParams.get("casaId");
    const faseId = searchParams.get("faseId");

    const diasAtras = parseInt(periodo);
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - diasAtras);

    // Filtros condicionais
    const whereAdolescente: any = {
      statusUnidade: "ATIVO",
      criadoEm: { gte: dataInicio },
    };

    if (casaId) {
      whereAdolescente.alojamentoAtual = {
        casaId,
      };
    }

    if (faseId) {
      whereAdolescente.faseInternacaoAtualId = faseId;
    }

    // Buscar dados históricos em paralelo
    const [
      cadastrosRecentes,
      conflitosRecentes,
      alertasRecentes,
      tatuagensRecentes,
    ] = await Promise.all([
      // Adolescentes cadastrados por dia
      prisma.adolescente.findMany({
        where: whereAdolescente,
        select: {
          criadoEm: true,
        },
        orderBy: {
          criadoEm: "asc",
        },
      }),

      // Conflitos registrados por dia
      prisma.conflito.findMany({
        where: {
          criadoEm: { gte: dataInicio },
        },
        select: {
          criadoEm: true,
          status: true,
        },
        orderBy: {
          criadoEm: "asc",
        },
      }),

      // Alertas criados por dia
      prisma.alertaAtivo.findMany({
        where: {
          criadoEm: { gte: dataInicio },
        },
        select: {
          criadoEm: true,
          nivelRisco: true,
        },
        orderBy: {
          criadoEm: "asc",
        },
      }),

      // Tatuagens registradas por dia
      prisma.adolescenteTatuagem.findMany({
        where: {
          adolescente: whereAdolescente,
        },
        include: {
          tatuagemCatalogo: {
            select: {
              nivelRisco: true,
            },
          },
        },
      }),
    ]);

    // Processar dados por dia
    const processarPorDia = (dados: any[], campo: string = "criadoEm") => {
      const porDia: Record<string, number> = {};

      dados.forEach((item) => {
        const data = new Date(item[campo]);
        const dia = data.toISOString().split("T")[0];
        porDia[dia] = (porDia[dia] || 0) + 1;
      });

      return Object.entries(porDia)
        .map(([dia, total]) => ({ dia, total }))
        .sort((a, b) => a.dia.localeCompare(b.dia));
    };

    // Agrupar por semana
    const processarPorSemana = (dados: any[], campo: string = "criadoEm") => {
      const porSemana: Record<string, number> = {};

      dados.forEach((item) => {
        const data = new Date(item[campo]);
        const semana = getWeekNumber(data);
        const ano = data.getFullYear();
        const chave = `${ano}-S${semana}`;
        porSemana[chave] = (porSemana[chave] || 0) + 1;
      });

      return Object.entries(porSemana)
        .map(([semana, total]) => ({ semana, total }))
        .sort((a, b) => a.semana.localeCompare(b.semana));
    };

    // Calcular número da semana
    function getWeekNumber(date: Date): number {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    // Análise de tendências
    const calcularTendencia = (dados: number[]) => {
      if (dados.length < 2) return 0;

      const n = dados.length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;

      dados.forEach((y, x) => {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      return slope;
    };

    const cadastrosPorDia = processarPorDia(cadastrosRecentes);
    const conflitosPorDia = processarPorDia(conflitosRecentes);
    const alertasPorDia = processarPorDia(alertasRecentes);

    // Tendências
    const tendenciaCadastros = calcularTendencia(cadastrosPorDia.map((d) => d.total));
    const tendenciaConflitos = calcularTendencia(conflitosPorDia.map((d) => d.total));
    const tendenciaAlertas = calcularTendencia(alertasPorDia.map((d) => d.total));

    // Análise de tatuagens de risco ao longo do tempo
    const tatuagensRiscoAlto = tatuagensRecentes.filter(
      (t) => t.tatuagemCatalogo?.nivelRisco === "ALTO"
    );
    const tatuagensRiscoMedio = tatuagensRecentes.filter(
      (t) => t.tatuagemCatalogo?.nivelRisco === "MEDIO"
    );

    // Comparação com período anterior
    const dataInicioAnterior = new Date(dataInicio);
    dataInicioAnterior.setDate(dataInicioAnterior.getDate() - diasAtras);

    const [
      cadastrosAnteriores,
      conflitosAnteriores,
      alertasAnteriores,
    ] = await Promise.all([
      prisma.adolescente.count({
        where: {
          ...whereAdolescente,
          criadoEm: {
            gte: dataInicioAnterior,
            lt: dataInicio,
          },
        },
      }),
      prisma.conflito.count({
        where: {
          criadoEm: {
            gte: dataInicioAnterior,
            lt: dataInicio,
          },
        },
      }),
      prisma.alertaAtivo.count({
        where: {
          criadoEm: {
            gte: dataInicioAnterior,
            lt: dataInicio,
          },
        },
      }),
    ]);

    const totalCadastrosAtual = cadastrosRecentes.length;
    const totalConflitosAtual = conflitosRecentes.length;
    const totalAlertasAtual = alertasRecentes.length;

    const calcularVariacao = (atual: number, anterior: number) => {
      if (anterior === 0) return atual > 0 ? 100 : 0;
      return ((atual - anterior) / anterior) * 100;
    };

    const response = {
      periodo: {
        dias: diasAtras,
        dataInicio: dataInicio.toISOString(),
        dataFim: new Date().toISOString(),
      },
      evolucao: {
        cadastrosPorDia,
        conflitosPorDia,
        alertasPorDia,
        cadastrosPorSemana: processarPorSemana(cadastrosRecentes),
        conflitosPorSemana: processarPorSemana(conflitosRecentes),
      },
      tendencias: {
        cadastros: {
          inclinacao: tendenciaCadastros,
          direcao: tendenciaCadastros > 0 ? "CRESCENTE" : tendenciaCadastros < 0 ? "DECRESCENTE" : "ESTAVEL",
        },
        conflitos: {
          inclinacao: tendenciaConflitos,
          direcao: tendenciaConflitos > 0 ? "CRESCENTE" : tendenciaConflitos < 0 ? "DECRESCENTE" : "ESTAVEL",
        },
        alertas: {
          inclinacao: tendenciaAlertas,
          direcao: tendenciaAlertas > 0 ? "CRESCENTE" : tendenciaAlertas < 0 ? "DECRESCENTE" : "ESTAVEL",
        },
      },
      comparacao: {
        cadastros: {
          atual: totalCadastrosAtual,
          anterior: cadastrosAnteriores,
          variacao: calcularVariacao(totalCadastrosAtual, cadastrosAnteriores),
        },
        conflitos: {
          atual: totalConflitosAtual,
          anterior: conflitosAnteriores,
          variacao: calcularVariacao(totalConflitosAtual, conflitosAnteriores),
        },
        alertas: {
          atual: totalAlertasAtual,
          anterior: alertasAnteriores,
          variacao: calcularVariacao(totalAlertasAtual, alertasAnteriores),
        },
      },
      tatuagens: {
        riscoAlto: tatuagensRiscoAlto.length,
        riscoMedio: tatuagensRiscoMedio.length,
        percentualAltoRisco:
          tatuagensRecentes.length > 0
            ? ((tatuagensRiscoAlto.length / tatuagensRecentes.length) * 100).toFixed(1)
            : "0",
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro ao buscar dados temporais:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar dados temporais" },
      { status: 500 }
    );
  }
}
