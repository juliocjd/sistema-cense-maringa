import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/alertas
 * Lista alertas ativos com filtros
 *
 * Query params:
 * - status: 'ATIVO' | 'DESATIVADO' | 'TODOS' (padrão: ATIVO)
 * - tipoAlerta: filtro por tipo
 * - nivelRisco: filtro por nível de risco
 * - casaId: filtro por casa
 * - limit: limite de resultados (padrão: 100)
 * - offset: paginação (padrão: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || "ATIVO";
    const tipoAlerta = searchParams.get("tipoAlerta");
    const nivelRisco = searchParams.get("nivelRisco");
    const casaId = searchParams.get("casaId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Construir filtros
    const where: any = {};

    // Filtro de status
    if (status === "ATIVO") {
      where.desativadoEm = null;
    } else if (status === "DESATIVADO") {
      where.desativadoEm = { not: null };
    }
    // Se status === "TODOS", não adiciona filtro

    // Filtros opcionais
    if (tipoAlerta) {
      where.tipoAlerta = tipoAlerta;
    }

    if (nivelRisco) {
      where.nivelRisco = nivelRisco;
    }

    // Filtro por casa (através do adolescente)
    if (casaId) {
      where.adolescente = {
        alojamentoAtual: {
          casaId: casaId,
        },
      };
    }

    // Buscar alertas
    const [alertas, total] = await Promise.all([
      prisma.alertaAtivo.findMany({
        where,
        include: {
          adolescente: {
            select: {
              id: true,
              nomeCompleto: true,
              nomeSocial: true,
              numeroSms: true,
              fotoUrl: true,
              statusUnidade: true,
              alojamentoAtual: {
                select: {
                  id: true,
                  numeroAlojamento: true,
                  ala: true,
                  casa: {
                    select: {
                      id: true,
                      nome: true,
                      numero: true,
                    },
                  },
                },
              },
            },
          },
          ciOrigem: {
            select: {
              id: true,
              numero: true,
              resumoCI: true,
              tipoCI: true,
            },
          },
        },
        orderBy: [
          { nivelRisco: "desc" },
          { criadoEm: "desc" },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.alertaAtivo.count({ where }),
    ]);

    // Estatísticas
    const stats = await prisma.alertaAtivo.groupBy({
      by: ["nivelRisco"],
      where: { desativadoEm: null },
      _count: true,
    });

    // Estatísticas por tipo
    const statsTipo = await prisma.alertaAtivo.groupBy({
      by: ["tipoAlerta"],
      where: { desativadoEm: null },
      _count: true,
    });

    const estatisticas = {
      totalAtivos: stats.reduce((acc, item) => acc + item._count, 0),
      porNivel: stats.reduce((acc, item) => {
        acc[item.nivelRisco || "SEM_NIVEL"] = item._count;
        return acc;
      }, {} as Record<string, number>),
      porTipo: statsTipo.reduce((acc, item) => {
        acc[item.tipoAlerta || "SEM_TIPO"] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json({
      alertas,
      total,
      estatisticas,
      filtros: {
        status,
        tipoAlerta,
        nivelRisco,
        casaId,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar alertas:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar alertas" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alertas
 * Cria novo alerta ativo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      adolescenteId,
      ciOrigemId,
      tipoAlerta,
      descricaoAlerta,
      nivelRisco,
    } = body;

    // Validações
    if (!adolescenteId) {
      return NextResponse.json(
        { erro: "adolescenteId é obrigatório" },
        { status: 400 }
      );
    }

    if (!descricaoAlerta || descricaoAlerta.trim().length === 0) {
      return NextResponse.json(
        { erro: "descricaoAlerta é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se adolescente existe
    const adolescente = await prisma.adolescente.findUnique({
      where: { id: adolescenteId },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado" },
        { status: 404 }
      );
    }

    // Criar alerta
    const alerta = await prisma.alertaAtivo.create({
      data: {
        adolescenteId,
        ciOrigemId: ciOrigemId || null,
        tipoAlerta: tipoAlerta || null,
        descricaoAlerta: descricaoAlerta.trim(),
        nivelRisco: nivelRisco || null,
      },
      include: {
        adolescente: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
          },
        },
        ciOrigem: {
          select: {
            id: true,
            numero: true,
            resumoCI: true,
          },
        },
      },
    });

    return NextResponse.json(alerta, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar alerta:", error);
    return NextResponse.json(
      { erro: "Erro ao criar alerta" },
      { status: 500 }
    );
  }
}
