import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; adolescenteId: string }> }
) {
  try {
    const session = await auth().catch(() => null);
    if (!session?.user?.id) {
      return NextResponse.json({ erro: "Operador não autenticado" }, { status: 401 });
    }

    const { id, adolescenteId } = await params;
    const membro = await prisma.grupoEspecialMembro.findUnique({
      where: { grupoId_adolescenteId: { grupoId: id, adolescenteId } },
    });
    if (!membro) {
      return NextResponse.json(
        { erro: "Membro não encontrado" },
        { status: 404 }
      );
    }

    await prisma.grupoEspecialMembro.update({
      where: { grupoId_adolescenteId: { grupoId: id, adolescenteId } },
      data: { dataSaida: new Date() },
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("Erro ao remover membro especial", error);
    return NextResponse.json(
      { erro: "Erro ao remover membro", detalhes: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
