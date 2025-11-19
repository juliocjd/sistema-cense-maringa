import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import { mapVisita } from "@/lib/visitantes/mappers";

const encerrarVisitaSchema = z.object({
  dataHoraSaida: z
    .string()
    .optional()
    .nullable()
    .refine(
      (value) =>
        !value || !Number.isNaN(Date.parse(value)) || value.trim().length === 0,
      { message: "dataHoraSaida invalida" }
    ),
});

const parseJsonBody = async (request: NextRequest) => {
  if (request.headers.get("content-length") === "0") {
    return {};
  }
  try {
    return await request.json();
  } catch {
    throw new NextResponse(
      JSON.stringify({ erro: "Payload invalido: esperado JSON" }),
      { status: 400 }
    );
  }
};

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; visitaId: string }> }
) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;
  const { id, visitaId } = await params;

  try {
    const rawBody = await parseJsonBody(request);
    const body = encerrarVisitaSchema.parse(rawBody);

    const visita = await prisma.visitaRegistro.findFirst({
      where: { id: visitaId, visitanteId: id },
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

    if (!visita) {
      return NextResponse.json(
        { erro: "Visita nao encontrada" },
        { status: 404 }
      );
    }

    if (visita.dataHoraSaida) {
      return NextResponse.json(
        { erro: "Visita ja foi encerrada anteriormente" },
        { status: 409 }
      );
    }

    const dataHoraSaida =
      body.dataHoraSaida && body.dataHoraSaida.trim().length > 0
        ? new Date(body.dataHoraSaida)
        : new Date();

    const visitaAtualizada = await prisma.$transaction(async (tx) => {
      const atualizada = await tx.visitaRegistro.update({
        where: { id: visitaId },
        data: {
          dataHoraSaida,
          operadorSaidaId: operadorId,
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
          acao: "VISITA_REGISTRAR_SAIDA",
          tabelaAfetada: "visitas_registro",
          registroIdAfetado: visitaId,
          detalhesAlteracao: {
            visitanteId: id,
            adolescenteId: atualizada.adolescenteId,
            dataHoraSaida: atualizada.dataHoraSaida?.toISOString() ?? null,
          },
          ipOrigem: ip,
        },
      });

      return atualizada;
    });

    return NextResponse.json(mapVisita(visitaAtualizada));
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

    console.error("Erro ao encerrar visita:", error);
    return NextResponse.json(
      {
        erro: "Erro ao encerrar visita",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
