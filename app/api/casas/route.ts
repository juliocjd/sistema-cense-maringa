// app/api/casas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validação
const createCasaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  numero: z.number().int().min(1).max(8),
  isolada: z.boolean().default(false),
  observacoes: z.string().optional(),
});

// GET /api/casas - Listar todas as casas
export async function GET(request: NextRequest) {
  try {
    const casas = await prisma.casa.findMany({
      include: {
        alojamentos: true,
      },
      orderBy: {
        numero: "asc",
      },
    });

    // Calcular ocupação de cada casa
    const casasComOcupacao = await Promise.all(
      casas.map(async (casa) => {
        const totalAlojamentos = casa.alojamentos.length;

        // Contar alojamentos ocupados
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
          total_alojamentos: totalAlojamentos,
          alojamentos_ocupados: alojamentosOcupados,
          alojamentos_livres: totalAlojamentos - alojamentosOcupados,
          taxa_ocupacao:
            totalAlojamentos > 0
              ? ((alojamentosOcupados / totalAlojamentos) * 100).toFixed(1) +
                "%"
              : "0%",
        };
      })
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

// POST /api/casas - Criar nova casa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar dados
    const validatedData = createCasaSchema.parse(body);

    // Verificar se número da casa já existe
    const casaExistente = await prisma.casa.findFirst({
      where: { numero: validatedData.numero },
    });

    if (casaExistente) {
      return NextResponse.json(
        { erro: `Casa ${validatedData.numero} já existe` },
        { status: 409 }
      );
    }

    // Criar casa
    const casa = await prisma.casa.create({
      data: validatedData,
    });

    // Log de auditoria
    await prisma.logAuditoria.create({
      data: {
        // operadorId: request.user?.id,
        acao: "INSERT",
        tabelaAfetada: "Casas",
        registroIdAfetado: casa.id,
        detalhesAlteracao: {
          nome: casa.nome,
          numero: casa.numero,
        },
      },
    });

    return NextResponse.json(
      {
        id: casa.id,
        nome: casa.nome,
        numero: casa.numero,
        isolada: casa.isolada,
        mensagem: "Casa criada com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao criar casa:", error);
    return NextResponse.json({ erro: "Erro ao criar casa" }, { status: 500 });
  }
}
