import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId } = authResult;
  const { id } = await params;

  try {
    const atualizado = await prisma.visitante.update({
      where: { id },
      data: {
        bnmpUltimaConsultaEm: new Date(),
        bnmpUltimaConsultaOperadorId: operadorId,
      },
      select: { bnmpUltimaConsultaEm: true },
    });

    return NextResponse.json({
      bnmpUltimaConsultaEm: atualizado.bnmpUltimaConsultaEm
        ? atualizado.bnmpUltimaConsultaEm.toISOString()
        : null,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { erro: "Visitante nao encontrado" },
        { status: 404 }
      );
    }
    console.error("Erro ao registrar consulta BNMP:", error);
    return NextResponse.json(
      { erro: "Erro ao registrar consulta BNMP" },
      { status: 500 }
    );
  }
}
