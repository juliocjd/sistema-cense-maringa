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
    const visitanteId = searchParams.get("visitanteId");
    const status = searchParams.get("status"); // "PENDENTE", "ENVIADO", "FALHA", "ERRO"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};

    if (visitanteId) {
      where.visitanteId = visitanteId;
    }

    if (status) {
      where.statusEnvio = status;
    }

    const [notificacoes, total] = await Promise.all([
      prisma.notificacaoVisitante.findMany({
        where,
        include: {
          visitante: {
            select: {
              id: true,
              nomeCompleto: true,
              email: true,
            },
          },
        },
        orderBy: { criadoEm: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notificacaoVisitante.count({ where }),
    ]);

    return NextResponse.json({
      notificacoes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar notificações",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
