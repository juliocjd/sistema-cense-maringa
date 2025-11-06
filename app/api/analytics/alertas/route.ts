import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type NivelRisco =
  | "CRITICO"
  | "ALTO"
  | "MEDIO"
  | "BAIXO"
  | "NAO_CLASSIFICADO";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const normalizarTexto = (valor: string | null | undefined): string => {
  if (!valor) {
    return "";
  }
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
};

const normalizarNivel = (valor: string | null | undefined): NivelRisco => {
  const texto = normalizarTexto(valor);
  if (texto === "CRITICO") {
    return "CRITICO";
  }
  if (texto === "ALTO") {
    return "ALTO";
  }
  if (texto === "MEDIO") {
    return "MEDIO";
  }
  if (texto === "BAIXO") {
    return "BAIXO";
  }
  return "NAO_CLASSIFICADO";
};

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const agora = new Date();
    const seteDiasAtras = new Date(agora.getTime() - 7 * MS_PER_DAY);
    const trintaDiasAtras = new Date(agora.getTime() - 30 * MS_PER_DAY);

    const [
      ativosPorNivelRaw,
      ativosPorTipoRaw,
      alertasRecentesRaw,
      novosUltimosSeteDias,
      encerradosUltimosTrintaDias,
    ] = await Promise.all([
      prisma.alertaAtivo.groupBy({
        by: ["nivelRisco"],
        where: { desativadoEm: null },
        _count: { _all: true },
      }),
      prisma.alertaAtivo.groupBy({
        by: ["tipoAlerta"],
        where: { desativadoEm: null },
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.alertaAtivo.findMany({
        where: { desativadoEm: null },
        select: {
          id: true,
          tipoAlerta: true,
          nivelRisco: true,
          descricaoAlerta: true,
          criadoEm: true,
        adolescente: {
          select: {
            id: true,
            nomeCompleto: true,
            alojamentoAtual: {
              select: {
                id: true,
                numeroAlojamento: true,
                ala: true,
                casa: { select: { nome: true } },
              },
            },
          },
          },
        },
        orderBy: { criadoEm: "desc" },
        take: 10,
      }),
      prisma.alertaAtivo.count({
        where: {
          criadoEm: { gte: seteDiasAtras },
        },
      }),
      prisma.alertaAtivo.count({
        where: {
          desativadoEm: { not: null, gte: trintaDiasAtras },
        },
      }),
    ]);

    const resumoPorNivel: Record<NivelRisco, number> = {
      CRITICO: 0,
      ALTO: 0,
      MEDIO: 0,
      BAIXO: 0,
      NAO_CLASSIFICADO: 0,
    };

    let totalAtivos = 0;
    for (const entrada of ativosPorNivelRaw) {
      const nivel = normalizarNivel(entrada.nivelRisco as string | null);
      const quantidade = entrada._count._all;
      resumoPorNivel[nivel] += quantidade;
      totalAtivos += quantidade;
    }

    const porTipo = ativosPorTipoRaw.map((entrada) => {
      const tipo = entrada.tipoAlerta ?? "Sem classificação";
      const ativos = entrada._count._all;
      const percentual =
        totalAtivos > 0
          ? Number(((ativos / totalAtivos) * 100).toFixed(1))
          : 0;
      return {
        tipo,
        ativos,
        percentual,
      };
    });

    const alertasRecentes = alertasRecentesRaw.map((alerta) => {
      const nivel = normalizarNivel(alerta.nivelRisco);
      const adolescente = alerta.adolescente;
      let alojamento: { id: string; rotulo: string } | null = null;
      if (adolescente?.alojamentoAtual) {
        const { alojamentoAtual } = adolescente;
        const casa = alojamentoAtual.casa?.nome ?? "Casa desconhecida";
        const numero = alojamentoAtual.numeroAlojamento ?? "";
        const ala = alojamentoAtual.ala
          ? ` - ${alojamentoAtual.ala.toUpperCase()}`
          : "";
        alojamento = {
          id: alojamentoAtual.id,
          rotulo: `${casa} - ${numero}${ala}`,
        };
      }

      const diasAtivo = Math.floor(
        (agora.getTime() - alerta.criadoEm.getTime()) / MS_PER_DAY
      );

      return {
        id: alerta.id,
        tipo: alerta.tipoAlerta ?? "Sem classificação",
        nivel,
        descricao: alerta.descricaoAlerta,
        criadoEm: alerta.criadoEm.toISOString(),
        diasAtivo,
        adolescente: adolescente
          ? {
              id: adolescente.id,
              nome: adolescente.nomeCompleto,
              alojamento,
            }
          : null,
      };
    });

    return NextResponse.json({
      resumo: {
        totalAtivos,
        ativosCriticos: resumoPorNivel.CRITICO,
        ativosPorNivel: resumoPorNivel,
        novosUltimos7Dias: novosUltimosSeteDias,
        encerradosUltimos30Dias: encerradosUltimosTrintaDias,
      },
      porTipo,
      alertasRecentes,
    });
  } catch (error) {
    console.error("Erro ao gerar analytics de alertas:", error);
    return NextResponse.json(
      {
        erro: "Erro ao gerar analytics de alertas",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
