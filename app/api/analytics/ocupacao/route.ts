import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const casas = await prisma.casa.findMany({
      include: {
        alojamentos: {
          select: {
            id: true,
            statusManutencao: true,
            adolescentes: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: { numero: "asc" },
    });

    let totalCasas = casas.length;
    let totalAlojamentos = 0;
    let totalOcupados = 0;
    let totalLivres = 0;
    let totalInterditados = 0;

    const porCasa = casas.map((casa) => {
      const total = casa.alojamentos.length;
      const ocupados = casa.alojamentos.filter(
        (alojamento) => alojamento.adolescentes.length > 0
      ).length;
      const livres = casa.alojamentos.filter(
        (alojamento) =>
          alojamento.adolescentes.length === 0 &&
          alojamento.statusManutencao === "LIVRE"
      ).length;
      const interditados = casa.alojamentos.filter(
        (alojamento) => alojamento.statusManutencao === "INTERDITADO"
      ).length;

      totalAlojamentos += total;
      totalOcupados += ocupados;
      totalLivres += livres;
      totalInterditados += interditados;

      const taxa =
        total > 0 ? Number(((ocupados / total) * 100).toFixed(1)) : 0;

      return {
        casaId: casa.id,
        nome: casa.nome,
        numero: casa.numero,
        totalAlojamentos: total,
        alojamentosOcupados: ocupados,
        alojamentosLivres: livres,
        alojamentosInterditados: interditados,
        taxaOcupacaoPercentual: taxa,
      };
    });

    const taxaGlobal =
      totalAlojamentos > 0
        ? Number(((totalOcupados / totalAlojamentos) * 100).toFixed(1))
        : 0;

    return NextResponse.json({
      resumo: {
        totalCasas,
        totalAlojamentos,
        alojamentosOcupados: totalOcupados,
        alojamentosLivres: totalLivres,
        alojamentosInterditados: totalInterditados,
        taxaOcupacaoPercentual: taxaGlobal,
      },
      porCasa,
    });
  } catch (error) {
    console.error("Erro ao gerar analytics de ocupacao:", error);
    return NextResponse.json(
      {
        erro: "Erro ao gerar analytics de ocupacao",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
