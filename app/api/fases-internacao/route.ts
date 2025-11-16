import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/fases-internacao - Listar todas as fases de internação
export async function GET(request: NextRequest) {
  try {
    const fases = await prisma.faseInternacao.findMany({
      orderBy: {
        ordem: "asc",
      },
      select: {
        id: true,
        nomeFase: true,
        ordem: true,
        descricaoFase: true,
      },
    });

    return NextResponse.json(fases);
  } catch (error) {
    console.error("Erro ao buscar fases de internação:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar fases de internação" },
      { status: 500 }
    );
  }
}
