import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import {
  atualizarFlagsAlertasEspeciais,
  ehAlertaEspecial,
} from "@/lib/alertas/sincronizar-especiais";
import { normalizarNivelRisco } from "@/lib/alertas/especiais";
import {
  registrarAltaProtocoloSuicidio,
  TIPO_PROTOCOLO_ALTA,
  TIPO_PROTOCOLO_ATIVADO,
} from "@/lib/alertas/protocolo-risco-suicidio";

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

    const movimentosProtocolo = await prisma.historicoMovimentacao.findMany({
        where: {
          adolescenteId: alerta.adolescenteId,
          tipo: {
            in: [TIPO_PROTOCOLO_ATIVADO, TIPO_PROTOCOLO_ALTA],
          },
        },
        orderBy: [
          { registradoEm: "desc" },
          { criadoEm: "desc" },
        ],
        take: 10,
      });

      const eventoEntrada = movimentosProtocolo.find(
        (movimento) => movimento.tipo === TIPO_PROTOCOLO_ATIVADO
      );
      const eventoAlta = movimentosProtocolo.find(
        (movimento) => movimento.tipo === TIPO_PROTOCOLO_ALTA
      );

      const protocoloRiscoSuicidio =
        eventoEntrada || eventoAlta
          ? {
              ultimaEntrada: eventoEntrada
                ? {
                    data: (
                      eventoEntrada.registradoEm ?? eventoEntrada.criadoEm
                    ).toISOString(),
                    descricao: eventoEntrada.descricao ?? null,
                  }
                : null,
              ultimaAlta: eventoAlta
                ? {
                    data: (eventoAlta.registradoEm ?? eventoAlta.criadoEm).toISOString(),
                    descricao: eventoAlta.descricao ?? null,
                  }
                : null,
            }
          : null;

      return NextResponse.json({
        ...alerta,
        protocoloRiscoSuicidio,
      });
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
    const session = await auth().catch(() => null);
    const operadorId = session?.user?.id ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador não autenticado" },
        { status: 401 }
      );
    }

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

    const tipoDestino =
      body.tipoAlerta ?? alertaExistente.tipoAlerta ?? undefined;
    const aplicarAltaMedica =
      body.altaMedica === true && tipoDestino === "RISCO_SUICIDIO";
    const nivelRecebido = aplicarAltaMedica
      ? "BAIXO"
      : body.nivelRisco ?? undefined;
    const nivelFinal =
      nivelRecebido !== undefined
        ? normalizarNivelRisco(nivelRecebido) ?? nivelRecebido
        : undefined;

    // Atualizar alerta
    const alerta = await prisma.alertaAtivo.update({
      where: { id },
      data: {
        ...(body.tipoAlerta !== undefined && { tipoAlerta: body.tipoAlerta }),
        ...(body.descricaoAlerta !== undefined && {
          descricaoAlerta: body.descricaoAlerta,
        }),
        ...(nivelFinal !== undefined && { nivelRisco: nivelFinal }),
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

    if (aplicarAltaMedica) {
      const descricaoAlta =
        typeof body.altaMedicaDescricao === "string"
          ? body.altaMedicaDescricao.trim()
          : null;
      await registrarAltaProtocoloSuicidio(prisma, {
        adolescenteId: alerta.adolescenteId,
        alertaId: alerta.id,
        descricao: descricaoAlta,
        operadorId,
      });
    }

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
