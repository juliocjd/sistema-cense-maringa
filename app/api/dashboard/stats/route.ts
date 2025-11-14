import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/dashboard/stats
 * Retorna estatísticas gerais para o dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Total de adolescentes ativos na unidade
    const totalAdolescentes = await prisma.adolescente.count({
      where: {
        statusUnidade: "ATIVO",
      },
    });

    // Total de vagas (alojamentos não interditados)
    const totalVagas = await prisma.alojamento.count({
      where: {
        statusManutencao: {
          not: "INTERDITADO",
        },
      },
    });

    // Alojamentos ocupados
    const alojamentosOcupados = await prisma.alojamento.count({
      where: {
        statusManutencao: {
          not: "INTERDITADO",
        },
        adolescentes: {
          some: {},
        },
      },
    });

    // Conflitos ativos (não resolvidos)
    const conflitosAtivos = await prisma.conflito.count({
      where: {
        status: {
          not: "RESOLVIDO",
        },
      },
    });

    // Adolescentes com alertas ativos
    const adolescentesComAlertas = await prisma.adolescente.count({
      where: {
        statusUnidade: "ATIVO",
        OR: [
          { alertaRiscoSuicidio: true },
          { alertaPerfilMapeado: true },
          { alertaSaudeConfidencial: true },
        ],
      },
    });

    // Casas com alojamentos ocupados
    const casasComOcupacao = await prisma.casa.count({
      where: {
        alojamentos: {
          some: {
            adolescentes: {
              some: {},
            },
          },
        },
      },
    });

    // Total de casas
    const totalCasas = await prisma.casa.count();

    // Alojamentos interditados
    const alojamentosInterditados = await prisma.alojamento.count({
      where: {
        statusManutencao: "INTERDITADO",
      },
    });

    // Grupos ativos
    const gruposAtivos = await prisma.grupo.count({
      where: {
        status: "ATIVO",
      },
    });

    // Conflitos por tipo
    const conflitosPorTipo = await prisma.conflito.groupBy({
      by: ["tipoConflito"],
      where: {
        status: {
          not: "RESOLVIDO",
        },
      },
      _count: true,
    });

    return NextResponse.json({
      totalAdolescentes,
      totalVagas,
      alojamentosOcupados,
      ocupacaoPercentual: totalVagas > 0
        ? ((alojamentosOcupados / totalVagas) * 100).toFixed(1)
        : "0.0",
      conflitosAtivos,
      adolescentesComAlertas,
      casasComOcupacao,
      totalCasas,
      alojamentosInterditados,
      gruposAtivos,
      conflitosPorTipo: conflitosPorTipo.reduce((acc, item) => {
        acc[item.tipoConflito] = item._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas do dashboard:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  }
}
