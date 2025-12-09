import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEstruturaSnapshot } from "@/lib/estrutura/snapshot";

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

    // Alertas ativos (API /alertas) e gravidades de risco (mapa)
    const alertasAtivos = await prisma.alertaAtivo.count({
      where: { desativadoEm: null },
    });
    const snapshot = await getEstruturaSnapshot();
    const gravidadeAlertas = {
      critico: 0,
      alto: 0,
      medio: 0,
      baixo: 0,
      leve: 0,
    };
    let adolescentesComAlertas = 0;

    snapshot.casas.forEach((casa) => {
      casa.alojamentos.forEach((alojamento) => {
        if (!alojamento.ocupante) {
          return;
        }
        const nivel = alojamento.avaliacao_risco?.nivel ?? 0;
        if (nivel <= 0) {
          return;
        }
        adolescentesComAlertas += 1;
        if (nivel >= 5) {
          gravidadeAlertas.critico += 1;
        } else if (nivel === 4) {
          gravidadeAlertas.alto += 1;
        } else if (nivel === 3) {
          gravidadeAlertas.medio += 1;
        } else if (nivel === 2) {
          gravidadeAlertas.baixo += 1;
        } else if (nivel === 1) {
          gravidadeAlertas.leve += 1;
        }
      });
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

    // Grupos ativos + membros
    const gruposAtivosRegistros = await prisma.grupo.findMany({
      where: {
        status: "ATIVO",
      },
      select: {
        id: true,
        membros: {
          where: { dataSaida: null },
          select: { adolescenteId: true },
        },
      },
    });
    const gruposAtivos = gruposAtivosRegistros.length;

    const grupoIds = gruposAtivosRegistros.map((grupo) => grupo.id);
    const mapaMembrosGrupo = new Map<string, Set<string>>();
    const membrosIdsSet = new Set<string>();

    gruposAtivosRegistros.forEach((grupo) => {
      const membros = new Set(
        (grupo.membros ?? []).map((membro) => membro.adolescenteId)
      );
      mapaMembrosGrupo.set(grupo.id, membros);
      membros.forEach((id) => membrosIdsSet.add(id));
    });

    const conflitosEmGrupos =
      grupoIds.length === 0 || membrosIdsSet.size === 0
        ? []
        : await prisma.conflito.findMany({
            where: {
              status: "ATIVO",
              OR: [
                { registroGrupoId: { in: grupoIds } },
                { adolescenteAId: { in: Array.from(membrosIdsSet) } },
                { adolescenteBId: { in: Array.from(membrosIdsSet) } },
              ],
            },
            select: {
              id: true,
              registroGrupoId: true,
              adolescenteAId: true,
              adolescenteBId: true,
              tentativasMediacao: {
                select: { id: true },
              },
            },
          });

    const gruposComConflito = new Set<string>();
    const gruposConflitoSemMediacao = new Set<string>();

    for (const conflito of conflitosEmGrupos) {
      let grupoId = conflito.registroGrupoId;

      if (!grupoId || !mapaMembrosGrupo.has(grupoId)) {
        grupoId =
          [...mapaMembrosGrupo.entries()].find(
            ([, membros]) =>
              membros.has(conflito.adolescenteAId) &&
              membros.has(conflito.adolescenteBId)
          )?.[0] ?? null;
      }

      if (!grupoId) {
        continue;
      }

      const membrosGrupo = mapaMembrosGrupo.get(grupoId);
      if (
        !membrosGrupo ||
        !membrosGrupo.has(conflito.adolescenteAId) ||
        !membrosGrupo.has(conflito.adolescenteBId)
      ) {
        continue;
      }

      gruposComConflito.add(grupoId);
      if ((conflito.tentativasMediacao?.length ?? 0) === 0) {
        gruposConflitoSemMediacao.add(grupoId);
      }
    }

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
      alertasAtivos,
      casasComOcupacao,
      totalCasas,
      alojamentosInterditados,
      gruposAtivos,
      gruposComConflito: gruposComConflito.size,
      gruposConflitoSemMediacao: gruposConflitoSemMediacao.size,
      conflitosEmGrupos: conflitosEmGrupos.length,
      gravidadeAlertas: {
        ...gravidadeAlertas,
        total:
          gravidadeAlertas.critico +
          gravidadeAlertas.alto +
          gravidadeAlertas.medio +
          gravidadeAlertas.baixo +
          gravidadeAlertas.leve,
      },
      conflitosPorTipo: conflitosPorTipo.reduce((acc, item) => {
        const chave = item.tipoConflito ?? "NAO_CLASSIFICADO";
        acc[chave] = item._count;
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
