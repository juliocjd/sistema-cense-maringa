import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { destinacaoOperacionalUsaPrazo } from "@/lib/casas/configuracao-operacional";
import { prisma } from "@/lib/prisma";

const destinacaoOperacionalSchema = z.enum([
  "PROVISORIA",
  "DEFINITIVA",
  "FASE_EXCLUSIVA",
  "ABRIGAMENTO",
]);

const createCasaSchema = z.object({
  nome: z.string().min(1, "Nome e obrigatorio"),
  numero: z.number().int().min(1).max(8),
  isolada: z.boolean().default(false),
  observacoes: z.string().optional(),
  destinacaoOperacional: destinacaoOperacionalSchema
    .optional()
    .default("DEFINITIVA"),
  faseExclusivaId: z.string().uuid().optional().nullable(),
  prazoMaximoDias: z.number().int().positive().optional().nullable(),
  riscoMaximoPermitido: z.number().int().min(0).max(5).optional().nullable(),
});

export async function GET(_request: NextRequest) {
  try {
    const casas = await prisma.casa.findMany({
      include: {
        alojamentos: true,
        faseExclusiva: {
          select: {
            id: true,
            nomeFase: true,
          },
        },
      },
      orderBy: {
        numero: "asc",
      },
    });

    const casasComOcupacao = await Promise.all(
      casas.map(async (casa) => {
        const totalAlojamentos = casa.alojamentos.length;
        const alojamentosOcupados = await prisma.adolescente.count({
          where: {
            alojamentoAtualId: {
              in: casa.alojamentos.map((a) => a.id),
            },
          },
        });

        return {
          id: casa.id,
          nome: casa.nome,
          numero: casa.numero,
          isolada: casa.isolada,
          observacoes: casa.observacoes,
          destinacao_operacional: casa.destinacaoOperacional,
          fase_exclusiva_id: casa.faseExclusivaId,
          fase_exclusiva: casa.faseExclusiva,
          prazo_maximo_dias: casa.prazoMaximoDias,
          risco_maximo_permitido: casa.riscoMaximoPermitido,
          total_alojamentos: totalAlojamentos,
          alojamentos_ocupados: alojamentosOcupados,
          alojamentos_livres: totalAlojamentos - alojamentosOcupados,
          taxa_ocupacao:
            totalAlojamentos > 0
              ? ((alojamentosOcupados / totalAlojamentos) * 100).toFixed(1) +
                "%"
              : "0%",
        };
      }),
    );

    return NextResponse.json({
      total: casasComOcupacao.length,
      casas: casasComOcupacao,
    });
  } catch (error) {
    console.error("Erro ao buscar casas:", error);
    return NextResponse.json({ erro: "Erro ao buscar casas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createCasaSchema.parse(body);

    const casaExistente = await prisma.casa.findFirst({
      where: { numero: validatedData.numero },
    });

    if (casaExistente) {
      return NextResponse.json(
        { erro: `Casa ${validatedData.numero} ja existe` },
        { status: 409 },
      );
    }

    const casa = await prisma.casa.create({
      data: {
        nome: validatedData.nome,
        numero: validatedData.numero,
        isolada: validatedData.isolada,
        observacoes: validatedData.observacoes,
        destinacaoOperacional: validatedData.destinacaoOperacional,
        faseExclusiva: validatedData.destinacaoOperacional === "FASE_EXCLUSIVA" &&
          validatedData.faseExclusivaId
          ? { connect: { id: validatedData.faseExclusivaId } }
          : undefined,
        prazoMaximoDias: destinacaoOperacionalUsaPrazo(
          validatedData.destinacaoOperacional,
        )
          ? validatedData.prazoMaximoDias ?? null
          : null,
        riscoMaximoPermitido: validatedData.riscoMaximoPermitido ?? null,
      },
    });

    await prisma.logAuditoria.create({
      data: {
        acao: "INSERT",
        tabelaAfetada: "Casas",
        registroIdAfetado: casa.id,
        detalhesAlteracao: {
          nome: casa.nome,
          numero: casa.numero,
          destinacaoOperacional: casa.destinacaoOperacional,
        },
      },
    });

    return NextResponse.json(
      {
        id: casa.id,
        nome: casa.nome,
        numero: casa.numero,
        isolada: casa.isolada,
        destinacao_operacional: casa.destinacaoOperacional,
        mensagem: "Casa criada com sucesso",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao criar casa:", error);
    return NextResponse.json({ erro: "Erro ao criar casa" }, { status: 500 });
  }
}
