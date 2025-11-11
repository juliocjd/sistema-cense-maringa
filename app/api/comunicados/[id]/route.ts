import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/comunicados/[id]
 * Detalhes completos de um comunicado interno
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ci = await prisma.comunicadoInterno.findUnique({
      where: { id },
      include: {
        adolescentes: {
          include: {
            adolescente: {
              select: {
                id: true,
                nomeCompleto: true,
                nomeSocial: true,
                numeroSms: true,
                fotoUrl: true,
                statusUnidade: true,
                alojamentoAtual: {
                  select: {
                    id: true,
                    numeroAlojamento: true,
                    ala: true,
                    casa: {
                      select: {
                        id: true,
                        nome: true,
                        numero: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        conflitos: {
          include: {
            adolescenteA: {
              select: {
                id: true,
                nomeCompleto: true,
                numeroSms: true,
              },
            },
            adolescenteB: {
              select: {
                id: true,
                nomeCompleto: true,
                numeroSms: true,
              },
            },
          },
        },
        alertasAtivos: {
          include: {
            adolescente: {
              select: {
                id: true,
                nomeCompleto: true,
                numeroSms: true,
              },
            },
          },
        },
      },
    });

    if (!ci) {
      return NextResponse.json(
        { erro: "Comunicado não encontrado" },
        { status: 404 }
      );
    }

    // Formatar resposta
    const ciFormatado = {
      id: ci.id,
      numero: ci.numero,
      ano: ci.ano,
      dataFato: ci.dataFato.toISOString().split("T")[0],
      tipoCi: ci.tipoCI,
      resumoCi: ci.resumoCI,
      caminhoPdf: ci.caminhoPdf,
      operadorId: ci.operadorId,
      criadoEm: ci.criadoEm.toISOString(),
      adolescentes: ci.adolescentes.map((link) => link.adolescente),
      conflitos: ci.conflitos.map((conflito) => ({
        id: conflito.id,
        adolescenteA: conflito.adolescenteA,
        adolescenteB: conflito.adolescenteB,
        tipoConflito: conflito.tipoConflito,
        status: conflito.status,
        descricao: conflito.descricao,
        criadoEm: conflito.criadoEm.toISOString(),
        resolvidoEm: conflito.resolvidoEm?.toISOString() || null,
      })),
      alertas: ci.alertasAtivos.map((alerta) => ({
        id: alerta.id,
        adolescente: alerta.adolescente,
        tipoAlerta: alerta.tipoAlerta,
        descricaoAlerta: alerta.descricaoAlerta,
        nivelRisco: alerta.nivelRisco,
        criadoEm: alerta.criadoEm.toISOString(),
        desativadoEm: alerta.desativadoEm?.toISOString() || null,
      })),
    };

    return NextResponse.json(ciFormatado);
  } catch (error) {
    console.error("Erro ao buscar comunicado:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar comunicado" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/comunicados/[id]
 * Atualiza um comunicado interno
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verificar se CI existe
    const ciExistente = await prisma.comunicadoInterno.findUnique({
      where: { id },
    });

    if (!ciExistente) {
      return NextResponse.json(
        { erro: "Comunicado não encontrado" },
        { status: 404 }
      );
    }

    // Atualizar CI
    const ci = await prisma.comunicadoInterno.update({
      where: { id },
      data: {
        ...(body.dataFato !== undefined && {
          dataFato: new Date(body.dataFato),
        }),
        ...(body.tipoCI !== undefined && { tipoCI: body.tipoCI }),
        ...(body.resumoCI !== undefined && { resumoCI: body.resumoCI }),
        ...(body.caminhoPdf !== undefined && { caminhoPdf: body.caminhoPdf }),
      },
      include: {
        adolescentes: {
          include: {
            adolescente: {
              select: {
                id: true,
                nomeCompleto: true,
                numeroSms: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(ci);
  } catch (error) {
    console.error("Erro ao atualizar comunicado:", error);
    return NextResponse.json(
      { erro: "Erro ao atualizar comunicado" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comunicados/[id]
 * Remove um comunicado interno
 * NOTA: Remove também os conflitos e alertas vinculados (cascade)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar se CI existe
    const ciExistente = await prisma.comunicadoInterno.findUnique({
      where: { id },
      include: {
        conflitos: true,
        alertasAtivos: true,
      },
    });

    if (!ciExistente) {
      return NextResponse.json(
        { erro: "Comunicado não encontrado" },
        { status: 404 }
      );
    }

    // Deletar em transação
    await prisma.$transaction(async (tx) => {
      // 1. Deletar conflitos vinculados
      await tx.conflito.deleteMany({
        where: { ciOrigemId: id },
      });

      // 2. Deletar alertas vinculados
      await tx.alertaAtivo.deleteMany({
        where: { ciOrigemId: id },
      });

      // 3. Deletar vínculos com adolescentes
      await tx.comunicadoInternoAdolescente.deleteMany({
        where: { ciId: id },
      });

      // 4. Deletar CI
      await tx.comunicadoInterno.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      mensagem: "Comunicado removido com sucesso",
      conflitosRemovidos: ciExistente.conflitos.length,
      alertasRemovidos: ciExistente.alertasAtivos.length,
    });
  } catch (error) {
    console.error("Erro ao deletar comunicado:", error);
    return NextResponse.json(
      { erro: "Erro ao deletar comunicado" },
      { status: 500 }
    );
  }
}
