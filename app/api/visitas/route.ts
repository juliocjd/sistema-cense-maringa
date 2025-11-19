import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

export async function GET(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // "ativas", "finalizadas", "todas"
    const visitanteId = searchParams.get("visitanteId");
    const adolescenteId = searchParams.get("adolescenteId");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};

    // Filtro por status
    if (status === "ativas") {
      where.dataHoraSaida = null;
    } else if (status === "finalizadas") {
      where.dataHoraSaida = { not: null };
    }

    // Filtros adicionais
    if (visitanteId) {
      where.visitanteId = visitanteId;
    }

    if (adolescenteId) {
      where.adolescenteId = adolescenteId;
    }

    if (dataInicio || dataFim) {
      where.dataHoraEntrada = {};
      if (dataInicio) {
        where.dataHoraEntrada.gte = new Date(dataInicio);
      }
      if (dataFim) {
        where.dataHoraEntrada.lte = new Date(dataFim);
      }
    }

    const [visitas, total] = await Promise.all([
      prisma.visitaRegistro.findMany({
        where,
        include: {
          visitante: {
            select: {
              id: true,
              nomeCompleto: true,
              fotoUrl: true,
              cpf: true,
            },
          },
          adolescente: {
            select: {
              id: true,
              nomeCompleto: true,
              nomeSocial: true,
              alojamentoAtual: {
                select: {
                  casa: {
                    select: {
                      id: true,
                      numero: true,
                      nome: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { dataHoraEntrada: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.visitaRegistro.count({ where }),
    ]);

    return NextResponse.json({
      visitas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Erro ao buscar visitas:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar visitas",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
