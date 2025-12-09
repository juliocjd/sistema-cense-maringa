import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const normalizeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adolescenteId } = await params;

    const session = await auth().catch(() => null);
    const operadorId =
      typeof session?.user?.id === "string" && session.user.id.trim().length > 0
        ? session.user.id
        : null;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao autorizado" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({} as Record<string, any>));
    const alertasIds = normalizeIds(body.alertasIds);
    const conflitosIds = normalizeIds(body.conflitosIds);
    const comunicadosIds = normalizeIds(body.comunicadosIds);

    const adolescente = await prisma.adolescente.findUnique({
      where: { id: adolescenteId },
      select: { statusUnidade: true },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 }
      );
    }

    if (adolescente.statusUnidade !== "ATIVO") {
      return NextResponse.json(
        { erro: "Apenas adolescentes com status ATIVO podem reativar registros" },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      let alertasReativados = 0;
      let conflitosReativados = 0;
      let comunicadosReativados = 0;

      if (alertasIds.length > 0) {
        const res = await tx.alertaAtivo.updateMany({
          where: {
            id: { in: alertasIds },
            adolescenteId,
            desativadoEm: { not: null },
          },
          data: { desativadoEm: null },
        });
        alertasReativados = res.count;
      }

      if (conflitosIds.length > 0) {
        const conflitos = await tx.conflito.findMany({
          where: {
            id: { in: conflitosIds },
            status: "SUSPENSO_STATUS",
            OR: [
              { adolescenteAId: adolescenteId },
              { adolescenteBId: adolescenteId },
            ],
          },
          include: {
            adolescenteA: { select: { statusUnidade: true } },
            adolescenteB: { select: { statusUnidade: true } },
          },
        });

        const idsValidos = conflitos
          .filter((c) => {
            const ativoA = c.adolescenteA?.statusUnidade === "ATIVO";
            const ativoB = c.adolescenteB?.statusUnidade === "ATIVO";
            return ativoA && ativoB;
          })
          .map((c) => c.id);

        if (idsValidos.length > 0) {
          const res = await tx.conflito.updateMany({
            where: { id: { in: idsValidos } },
            data: { status: "ATIVO", resolvidoEm: null },
          });
          conflitosReativados = res.count;
        }
      }

      if (comunicadosIds.length > 0) {
        const comunicados = await tx.comunicadoInterno.findMany({
          where: {
            id: { in: comunicadosIds },
            suspensoPorStatus: true,
            adolescentes: {
              some: {
                adolescenteId: adolescenteId,
              },
            },
          },
          include: {
            adolescentes: {
              include: {
                adolescente: { select: { statusUnidade: true } },
              },
            },
          },
        });

        const comunicadosValidos = comunicados
          .filter((ci) => {
            const ativos =
              ci.adolescentes?.filter(
                (p) => p.adolescente?.statusUnidade === "ATIVO"
              ) ?? [];
            return ativos.length > 0;
          })
          .map((ci) => ci.id);

        if (comunicadosValidos.length > 0) {
          const res = await tx.comunicadoInterno.updateMany({
            where: { id: { in: comunicadosValidos } },
            data: { suspensoPorStatus: false, desativadoEm: null },
          });
          comunicadosReativados = res.count;
        }
      }

      return { alertasReativados, conflitosReativados, comunicadosReativados };
    });

    return NextResponse.json({
      mensagem: "Reativacao concluida",
      ...resultado,
    });
  } catch (error) {
    console.error("Erro ao reativar registros:", error);
    return NextResponse.json(
      {
        erro: "Erro ao reativar registros",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
