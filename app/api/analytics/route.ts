import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Buscar dados agregados em paralelo
    const [
      totalAdolescentes,
      totalConflitos,
      totalCasas,
      totalAlojamentos,
      adolescentesPorFase,
      adolescentesPorFaccao,
      adolescentesPorBairro,
      conflitosPorTipo,
      tatuagensMaisComuns,
      alertasAtivos,
      gruposAtivos,
      adolescentesComTatuagens,
      ocupacaoAlojamentos,
    ] = await Promise.all([
      // Total de adolescentes ativos
      prisma.adolescente.count({
        where: { statusUnidade: "ATIVO" },
      }),

      // Total de conflitos ativos
      prisma.conflito.count({
        where: { status: "ATIVO" },
      }),

      // Total de casas
      prisma.casa.count(),

      // Total de alojamentos
      prisma.alojamento.count(),

      // Adolescentes por fase de internação
      prisma.adolescente.groupBy({
        by: ["faseInternacaoAtualId"],
        where: { statusUnidade: "ATIVO" },
        _count: true,
      }),

      // Adolescentes por facção
      prisma.adolescente.groupBy({
        by: ["faccaoGrupoId"],
        where: {
          statusUnidade: "ATIVO",
          faccaoGrupoId: { not: null }
        },
        _count: true,
      }),

      // Adolescentes por bairro
      prisma.adolescente.groupBy({
        by: ["bairroOrigemId"],
        where: {
          statusUnidade: "ATIVO",
          bairroOrigemId: { not: null }
        },
        _count: true,
      }),

      // Conflitos por tipo
      prisma.conflito.groupBy({
        by: ["tipoConflito"],
        where: { status: "ATIVO" },
        _count: true,
      }),

      // Tatuagens mais comuns
      prisma.adolescenteTatuagem.groupBy({
        by: ["tatuagemCatalogoId"],
        _count: true,
        orderBy: {
          _count: {
            tatuagemCatalogoId: "desc",
          },
        },
        take: 10,
      }),

      // Alertas ativos
      prisma.alertaAtivo.count({
        where: { desativadoEm: null },
      }),

      // Grupos ativos
      prisma.grupo.count({
        where: { status: "ATIVO" },
      }),

      // Adolescentes com tatuagens
      prisma.adolescente.count({
        where: {
          statusUnidade: "ATIVO",
          tatuagens: {
            some: {},
          },
        },
      }),

      // Ocupação dos alojamentos
      prisma.alojamento.findMany({
        where: {
          statusManutencao: "LIVRE",
        },
        include: {
          adolescentes: {
            where: { statusUnidade: "ATIVO" },
            select: { id: true },
          },
          casa: {
            select: { nome: true, numero: true },
          },
        },
      }),
    ]);

    // Buscar informações detalhadas de fases
    const fasesIds = adolescentesPorFase
      .filter((f) => f.faseInternacaoAtualId)
      .map((f) => f.faseInternacaoAtualId as string);

    const fases = await prisma.faseInternacao.findMany({
      where: { id: { in: fasesIds } },
      select: { id: true, nomeFase: true },
    });

    // Buscar informações detalhadas de facções
    const faccoesIds = adolescentesPorFaccao
      .filter((f) => f.faccaoGrupoId)
      .map((f) => f.faccaoGrupoId as string);

    const faccoes = await prisma.faccao.findMany({
      where: { id: { in: faccoesIds } },
      select: { id: true, nomeFaccao: true },
    });

    // Buscar informações detalhadas de bairros (top 10)
    const bairrosIds = adolescentesPorBairro
      .filter((b) => b.bairroOrigemId)
      .map((b) => b.bairroOrigemId as string)
      .slice(0, 10);

    const bairros = await prisma.bairro.findMany({
      where: { id: { in: bairrosIds } },
      select: { id: true, nomeBairro: true, cidade: true },
    });

    // Buscar informações detalhadas de tatuagens
    const tatuagensIds = tatuagensMaisComuns.map((t) => t.tatuagemCatalogoId);
    const tatuagens = await prisma.tatuagemCatalogo.findMany({
      where: { id: { in: tatuagensIds } },
      select: { id: true, nomeSimbolo: true, nivelRisco: true },
    });

    // Processar dados de ocupação
    const totalAlojamentosLivres = ocupacaoAlojamentos.length;
    const alojamentosOcupados = ocupacaoAlojamentos.filter(
      (a) => a.adolescentes.length > 0
    ).length;
    const taxaOcupacao = totalAlojamentosLivres > 0
      ? ((alojamentosOcupados / totalAlojamentosLivres) * 100).toFixed(1)
      : "0";

    // Calcular distribuição de ocupação por casa
    const ocupacaoPorCasa = ocupacaoAlojamentos.reduce((acc, aloj) => {
      const casaNome = aloj.casa.nome || `Casa ${String(aloj.casa.numero).padStart(2, "0")}`;
      if (!acc[casaNome]) {
        acc[casaNome] = { total: 0, ocupados: 0 };
      }
      acc[casaNome].total += 1;
      if (aloj.adolescentes.length > 0) {
        acc[casaNome].ocupados += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; ocupados: number }>);

    // Montar resposta
    const response = {
      resumo: {
        totalAdolescentes,
        totalConflitos,
        totalCasas,
        totalAlojamentos,
        alertasAtivos,
        gruposAtivos,
        adolescentesComTatuagens,
        taxaOcupacao,
        alojamentosOcupados,
        alojamentosLivres: totalAlojamentosLivres - alojamentosOcupados,
      },
      distribuicoes: {
        porFase: adolescentesPorFase.map((item) => {
          const fase = fases.find((f) => f.id === item.faseInternacaoAtualId);
          return {
            fase: fase?.nomeFase || "Sem fase",
            total: item._count,
          };
        }),
        porFaccao: adolescentesPorFaccao.map((item) => {
          const faccao = faccoes.find((f) => f.id === item.faccaoGrupoId);
          return {
            faccao: faccao?.nomeFaccao || "Sem facção",
            total: item._count,
          };
        }),
        porBairro: adolescentesPorBairro
          .filter((item) => bairrosIds.includes(item.bairroOrigemId as string))
          .map((item) => {
            const bairro = bairros.find((b) => b.id === item.bairroOrigemId);
            return {
              bairro: bairro ? `${bairro.nomeBairro} - ${bairro.cidade}` : "Desconhecido",
              total: item._count,
            };
          })
          .sort((a, b) => b.total - a.total)
          .slice(0, 10),
        porTipoConflito: conflitosPorTipo.map((item) => ({
          tipo: item.tipoConflito || "Não especificado",
          total: item._count,
        })),
      },
      tatuagens: {
        top10: tatuagensMaisComuns.map((item) => {
          const tatuagem = tatuagens.find((t) => t.id === item.tatuagemCatalogoId);
          return {
            nome: tatuagem?.nomeSimbolo || "Desconhecida",
            nivelRisco: tatuagem?.nivelRisco || null,
            total: item._count,
          };
        }),
        porcentagemComTatuagem: totalAdolescentes > 0
          ? ((adolescentesComTatuagens / totalAdolescentes) * 100).toFixed(1)
          : "0",
      },
      ocupacao: {
        porCasa: Object.entries(ocupacaoPorCasa)
          .map(([casa, data]) => ({
            casa,
            total: data.total,
            ocupados: data.ocupados,
            livres: data.total - data.ocupados,
            taxaOcupacao: data.total > 0
              ? ((data.ocupados / data.total) * 100).toFixed(1)
              : "0",
          }))
          .sort((a, b) => parseFloat(b.taxaOcupacao) - parseFloat(a.taxaOcupacao)),
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro ao buscar analytics:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar dados analíticos" },
      { status: 500 }
    );
  }
}
