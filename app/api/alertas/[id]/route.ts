import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  atualizarFlagsAlertasEspeciais,
  ehAlertaEspecial,
} from "@/lib/alertas/sincronizar-especiais";

const prisma = new PrismaClient();

/**
 * GET /api/alertas/[id]
 * Detalhes de um alerta específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const alerta = await prisma.alertaAtivo.findUnique({
      where: { id },
      include: {
        adolescente: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            fotoUrl: true,
            statusUnidade: true,
            dataNascimento: true,
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
            bairroOrigem: {
              select: {
                id: true,
                nomeBairro: true,
                cidade: true,
              },
            },
            faccao: {
              select: {
                id: true,
                nomeFaccao: true,
              },
            },
          },
        },
        ciOrigem: {
          select: {
            id: true,
            numero: true,
            resumoCI: true,
            tipoCI: true,
            dataFato: true,
          },
        },
      },
    });

    if (!alerta) {
      return NextResponse.json(
        { erro: "Alerta não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(alerta);
  } catch (error) {
    console.error("Erro ao buscar alerta:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar alerta" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/alertas/[id]
 * Atualiza um alerta (ex: desativar)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verificar se alerta existe
    const alertaExistente = await prisma.alertaAtivo.findUnique({
      where: { id },
    });

    if (!alertaExistente) {
      return NextResponse.json(
        { erro: "Alerta não encontrado" },
        { status: 404 }
      );
    }

    // Atualizar alerta
    const alerta = await prisma.alertaAtivo.update({
      where: { id },
      data: {
        ...(body.tipoAlerta !== undefined && { tipoAlerta: body.tipoAlerta }),
        ...(body.descricaoAlerta !== undefined && {
          descricaoAlerta: body.descricaoAlerta,
        }),
        ...(body.nivelRisco !== undefined && { nivelRisco: body.nivelRisco }),
        ...(body.desativar === true && { desativadoEm: new Date() }),
        ...(body.reativar === true && { desativadoEm: null }),
      },
      include: {
        adolescente: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
          },
        },
      },
    });

    if (
      ehAlertaEspecial(alertaExistente.tipoAlerta) ||
      ehAlertaEspecial(alerta.tipoAlerta)
    ) {
      await atualizarFlagsAlertasEspeciais(prisma, alerta.adolescenteId);
    }

    return NextResponse.json(alerta);
  } catch (error) {
    console.error("Erro ao atualizar alerta:", error);
    return NextResponse.json(
      { erro: "Erro ao atualizar alerta" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alertas/[id]
 * Remove um alerta permanentemente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar se alerta existe
    const alertaExistente = await prisma.alertaAtivo.findUnique({
      where: { id },
    });

    if (!alertaExistente) {
      return NextResponse.json(
        { erro: "Alerta não encontrado" },
        { status: 404 }
      );
    }

    // Deletar alerta
    const alertaRemovido = await prisma.alertaAtivo.delete({
      where: { id },
    });

    if (ehAlertaEspecial(alertaExistente.tipoAlerta)) {
      await atualizarFlagsAlertasEspeciais(
        prisma,
        alertaExistente.adolescenteId
      );
    }

    return NextResponse.json({ mensagem: "Alerta removido com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar alerta:", error);
    return NextResponse.json(
      { erro: "Erro ao deletar alerta" },
      { status: 500 }
    );
  }
}
