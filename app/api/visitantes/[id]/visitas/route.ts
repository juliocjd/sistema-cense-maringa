import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import { mapVisita } from "@/lib/visitantes/mappers";

const registrarEntradaSchema = z.object({
  adolescenteId: z.string().uuid("adolescenteId invalido"),
  dataHoraEntrada: z
    .string()
    .optional()
    .nullable()
    .refine(
      (value) =>
        !value || !Number.isNaN(Date.parse(value)) || value.trim().length === 0,
      { message: "dataHoraEntrada invalida" }
    ),
});

const parseJsonBody = async (request: NextRequest) => {
  try {
    return await request.json();
  } catch {
    throw new NextResponse(
      JSON.stringify({ erro: "Payload invalido: esperado JSON" }),
      { status: 400 }
    );
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await params;

  try {
    const visitante = await prisma.visitante.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!visitante) {
      return NextResponse.json(
        { erro: "Visitante nao encontrado" },
        { status: 404 }
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const statusFiltro = searchParams.get("status") ?? "todas";
    const limite = Math.min(
      Math.max(parseInt(searchParams.get("limite") ?? "20", 10), 1),
      100
    );

    const where: Prisma.VisitaRegistroWhereInput = {
      visitanteId: id,
    };

    if (statusFiltro === "abertas") {
      where.dataHoraSaida = null;
    } else if (statusFiltro === "encerradas") {
      where.dataHoraSaida = { not: null };
    }

    const visitas = await prisma.visitaRegistro.findMany({
      where,
      take: limite,
      orderBy: { dataHoraEntrada: "desc" },
      include: {
        adolescente: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
          },
        },
      },
    });

    return NextResponse.json({
      total: visitas.length,
      visitas: visitas.map(mapVisita),
    });
  } catch (error) {
    console.error("Erro ao listar visitas:", error);
    return NextResponse.json(
      {
        erro: "Erro ao listar visitas",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;
  const { id } = await params;

  try {
    const rawBody = await parseJsonBody(request);
    const body = registrarEntradaSchema.parse(rawBody);

    const visitante = await prisma.visitante.findUnique({
      where: { id },
      select: { id: true, nomeCompleto: true },
    });

    if (!visitante) {
      return NextResponse.json(
        { erro: "Visitante nao encontrado" },
        { status: 404 }
      );
    }

    const adolescenteExiste = await prisma.adolescente.findUnique({
      where: { id: body.adolescenteId },
      select: { id: true, nomeCompleto: true },
    });

    if (!adolescenteExiste) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 }
      );
    }

    const vinculoAutorizado =
      await prisma.adolescenteVisitanteLink.findFirst({
        where: {
          visitanteId: id,
          adolescenteId: body.adolescenteId,
          autorizado: true,
        },
      });

    if (!vinculoAutorizado) {
      return NextResponse.json(
        {
          erro: "Visitante nao possui autorizacao ativa para este adolescente",
        },
        { status: 403 }
      );
    }

    const visitaAberta = await prisma.visitaRegistro.findFirst({
      where: {
        visitanteId: id,
        adolescenteId: body.adolescenteId,
        dataHoraSaida: null,
      },
    });

    if (visitaAberta) {
      return NextResponse.json(
        {
          erro: "Ja existe uma visita em aberto para este visitante e adolescente",
          visitaId: visitaAberta.id,
        },
        { status: 409 }
      );
    }

    const dataHoraEntrada =
      body.dataHoraEntrada && body.dataHoraEntrada.trim().length > 0
        ? new Date(body.dataHoraEntrada)
        : new Date();

    const novaVisita = await prisma.$transaction(async (tx) => {
      const criada = await tx.visitaRegistro.create({
        data: {
          visitanteId: id,
          adolescenteId: body.adolescenteId,
          dataHoraEntrada,
          operadorRegistroId: operadorId,
        },
        include: {
          adolescente: {
            select: {
              id: true,
              nomeCompleto: true,
              nomeSocial: true,
            },
          },
        },
      });

      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "VISITA_REGISTRAR_ENTRADA",
          tabelaAfetada: "visitas_registro",
          registroIdAfetado: criada.id,
          detalhesAlteracao: {
            visitanteId: id,
            adolescenteId: body.adolescenteId,
            dataHoraEntrada: criada.dataHoraEntrada.toISOString(),
          },
          ipOrigem: ip,
        },
      });

      return criada;
    });

    return NextResponse.json(mapVisita(novaVisita), { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.flatten() },
        { status: 400 }
      );
    }

    console.error("Erro ao registrar visita:", error);
    return NextResponse.json(
      {
        erro: "Erro ao registrar visita",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
