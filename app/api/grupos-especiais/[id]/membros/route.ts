import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcularAlertasParaColecao } from "@/lib/grupos-especiais/calculo";
import { z } from "zod";

const payloadSchema = z.object({
  adolescenteId: z.string().uuid(),
  justificativa: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth().catch(() => null);
    if (!session?.user?.id) {
      return NextResponse.json({ erro: "Operador nao autenticado" }, { status: 401 });
    }

    const payload = await request.json();
    const data = payloadSchema.parse(payload);

    const { id } = await params;

    const grupo = await prisma.grupoEspecial.findUnique({
      where: { id },
      include: {
        membros: { where: { dataSaida: null }, include: { adolescente: true } },
      },
    });
    if (!grupo) {
      return NextResponse.json({ erro: "Grupo especial nao encontrado" }, { status: 404 });
    }

    const membroExistente = await prisma.grupoEspecialMembro.findUnique({
      where: { grupoId_adolescenteId: { grupoId: id, adolescenteId: data.adolescenteId } },
    });
    if (membroExistente && !membroExistente.dataSaida) {
      return NextResponse.json({ erro: "Adolescente ja ativo neste grupo" }, { status: 400 });
    }

    const adolescentesParaRisco = [
      ...grupo.membros.filter((m) => !m.dataSaida).map((m) => ({
        ...m.adolescente,
        conflitosAtivos: [],
      })),
    ];

    const confrontos = await calcularAlertasParaColecao(
      [
        ...adolescentesParaRisco,
        {
          id: data.adolescenteId,
          nomeCompleto: "",
          bairroOrigemId: null,
          faccaoGrupoId: null,
          alertaRiscoSuicidio: false,
        },
      ],
      `Grupo Especial ${grupo.nome}`
    );

    const requerJustificativa = confrontos.alertas.some((alerta) => alerta.tipo === "CONFLITO_INTERNO");

    if (requerJustificativa && !data.justificativa) {
      return NextResponse.json(
        { status: "REQUER_JUSTIFICATIVA", alertas: confrontos.alertas },
        { status: 400 }
      );
    }

    await prisma.grupoEspecialMembro.upsert({
      where: { grupoId_adolescenteId: { grupoId: id, adolescenteId: data.adolescenteId } },
      update: { dataSaida: null, justificativa: data.justificativa ?? undefined },
      create: {
        grupoId: id,
        adolescenteId: data.adolescenteId,
        justificativa: data.justificativa,
      },
    });

    return NextResponse.json({ sucesso: true, nivel: confrontos.nivel });
  } catch (error) {
    console.error("Erro ao adicionar membro especial", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: "Payload invalido", detalhes: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { erro: "Erro interno", detalhes: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
