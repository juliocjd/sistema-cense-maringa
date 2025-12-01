import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const parseStatusList = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  return value
    .split(",")
    .map((status) => status.trim().toUpperCase())
    .filter((status) => status.length > 0);
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const participanteStatusParam = searchParams.get("participanteStatus");
    const participanteStatus = parseStatusList(participanteStatusParam);

    const where: any = {
      OR: [
        { adolescenteAId: id },
        { adolescenteBId: id },
      ],
    };

    if (statusParam && statusParam !== "TODOS") {
      where.status = statusParam.toUpperCase();
    }

    if (participanteStatus && participanteStatus.length > 0) {
      const participanteCondition = {
        OR: [
          {
            adolescenteA: {
              statusUnidade: {
                in: participanteStatus,
              },
            },
          },
          {
            adolescenteB: {
              statusUnidade: {
                in: participanteStatus,
              },
            },
          },
        ],
      };
      where.AND = [...(where.AND ?? []), participanteCondition];
    }

    const conflitos = await prisma.conflito.findMany({
      where,
      include: {
        adolescenteA: {
          select: {
            id: true,
            nomeCompleto: true,
            statusUnidade: true,
          },
        },
        adolescenteB: {
          select: {
            id: true,
            nomeCompleto: true,
            statusUnidade: true,
          },
        },
        ciOrigem: {
          select: {
            id: true,
            numero: true,
            ano: true,
          },
        },
      },
      orderBy: {
        criadoEm: "desc",
      },
    });

    const formato = conflitos.map((conflito) => ({
      id: conflito.id,
      registroGrupoId: conflito.registroGrupoId,
      tipoConflito: conflito.tipoConflito,
      status: conflito.status,
      descricao: conflito.descricao,
      criadoEm: conflito.criadoEm,
      resolvidoEm: conflito.resolvidoEm,
      origem: conflito.ciOrigem
        ? `CI ${conflito.ciOrigem.numero}/${conflito.ciOrigem.ano}`
        : "Registro direto",
      adolescenteA: {
        id: conflito.adolescenteA.id,
        nome: conflito.adolescenteA.nomeCompleto,
        statusUnidade: conflito.adolescenteA.statusUnidade,
      },
      adolescenteB: {
        id: conflito.adolescenteB.id,
        nome: conflito.adolescenteB.nomeCompleto,
        statusUnidade: conflito.adolescenteB.statusUnidade,
      },
    }));

    return NextResponse.json({
      adolescenteId: id,
      conflitos: formato,
    });
  } catch (error) {
    console.error("Erro ao buscar conflitos do adolescente:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar conflitos do adolescente",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
