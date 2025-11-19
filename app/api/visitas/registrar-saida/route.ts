import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

const registrarSaidaSchema = z.object({
  visitaId: z.string().uuid("visitaId inválido"),
  observacoes: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;

  try {
    const body = registrarSaidaSchema.parse(await request.json());
    const { visitaId, observacoes } = body;

    // Buscar visita
    const visita = await prisma.visitaRegistro.findUnique({
      where: { id: visitaId },
      include: {
        visitante: {
          select: {
            id: true,
            nomeCompleto: true,
          },
        },
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
        { erro: "Visita não encontrada" },
        { status: 404 }
      );
    }

    if (visita.dataHoraSaida) {
      return NextResponse.json(
        {
          erro: "Saída já foi registrada para esta visita",
          dataHoraSaida: visita.dataHoraSaida,
        },
        { status: 400 }
      );
    }

    // Registrar saída
    const visitaAtualizada = await prisma.$transaction(async (tx) => {
      const atualizada = await tx.visitaRegistro.update({
        where: { id: visitaId },
        data: {
          dataHoraSaida: new Date(),
          operadorSaidaId: operadorId,
          observacoes: observacoes
            ? `${visita.observacoes || ""}\n[SAÍDA] ${observacoes}`.trim()
            : visita.observacoes,
        },
        include: {
          visitante: {
            select: {
              id: true,
              nomeCompleto: true,
              fotoUrl: true,
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
                    }
                  }
                }
              },
            },
          },
        },
      });

      // Log de auditoria
      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "VISITA_REGISTRAR_SAIDA",
          tabelaAfetada: "visitas_registro",
          registroIdAfetado: visitaId,
          detalhesAlteracao: {
            visitante: visita.visitante.nomeCompleto,
            adolescente: visita.adolescente.nomeCompleto,
            duracaoMinutos: Math.round(
              (new Date().getTime() - visita.dataHoraEntrada.getTime()) / 60000
            ),
          },
          ipOrigem: ip,
        },
      });

      return atualizada;
    });

    return NextResponse.json({
      sucesso: true,
      visita: visitaAtualizada,
      mensagem: "Saída registrada com sucesso",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.flatten() },
        { status: 400 }
      );
    }

    console.error("Erro ao registrar saída:", error);
    return NextResponse.json(
      {
        erro: "Erro ao registrar saída da visita",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
