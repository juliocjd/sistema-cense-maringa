import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import QRCode from "qrcode";
import { randomBytes } from "crypto";

/**
 * POST /api/visitantes/[id]/qrcode
 * Gera um QR Code único para o visitante
 */
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
    // Verificar se visitante existe
    const visitante = await prisma.visitante.findUnique({
      where: { id },
      select: { id: true, nomeCompleto: true },
    });

    if (!visitante) {
      return NextResponse.json(
        { erro: "Visitante não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se já existe um QR Code ativo
    const qrExistente = await prisma.qRCodeVisitante.findFirst({
      where: {
        visitanteId: id,
        ativo: true,
      },
      orderBy: { criadoEm: "desc" },
    });

    // Se já existe e ainda está dentro da validade (30 dias), retornar o existente
    if (qrExistente) {
      const diasDesdeGeracao = Math.floor(
        (Date.now() - qrExistente.criadoEm.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diasDesdeGeracao < 30) {
        // Gerar imagem do QR Code existente
        const qrCodeDataUrl = await QRCode.toDataURL(qrExistente.codigoQR, {
          width: 400,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });

        return NextResponse.json({
          id: qrExistente.id,
          codigoQr: qrExistente.codigoQR,
          qrCodeImage: qrCodeDataUrl,
          dataGeracao: qrExistente.criadoEm.toISOString(),
          dataExpiracao: qrExistente.validoAte?.toISOString() || null,
          ativo: qrExistente.ativo,
          visitante: {
            id: visitante.id,
            nomeCompleto: visitante.nomeCompleto,
          },
          mensagem: "QR Code já existente retornado",
        });
      }
    }

    // Gerar novo código único
    const codigoUnico = `VIS-${randomBytes(16).toString("hex").toUpperCase()}`;

    // Calcular data de expiração (1 ano)
    const dataExpiracao = new Date();
    dataExpiracao.setFullYear(dataExpiracao.getFullYear() + 1);

    const novoQrCode = await prisma.$transaction(async (tx) => {
      // Desativar QR Codes anteriores
      await tx.qRCodeVisitante.updateMany({
        where: {
          visitanteId: id,
          ativo: true,
        },
        data: { ativo: false },
      });

      // Criar novo QR Code
      const criado = await tx.qRCodeVisitante.create({
        data: {
          visitanteId: id,
          codigoQR: codigoUnico,
          validoAte: dataExpiracao,
          ativo: true,
        },
      });

      // Registrar auditoria
      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "QRCODE_GERAR",
          tabelaAfetada: "qrcodes_visitantes",
          registroIdAfetado: criado.id,
          detalhesAlteracao: {
            visitanteId: id,
            visitanteNome: visitante.nomeCompleto,
            codigoQr: codigoUnico,
            dataExpiracao: dataExpiracao.toISOString(),
          },
          ipOrigem: ip,
        },
      });

      return criado;
    });

    // Gerar imagem do QR Code
        const qrCodeDataUrl = await QRCode.toDataURL(codigoUnico, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return NextResponse.json(
      {
        id: novoQrCode.id,
        codigoQr: novoQrCode.codigoQR,
        qrCodeImage: qrCodeDataUrl,
        dataGeracao: novoQrCode.criadoEm.toISOString(),
        dataExpiracao: novoQrCode.validoAte?.toISOString() || null,
        ativo: novoQrCode.ativo,
        visitante: {
          id: visitante.id,
          nomeCompleto: visitante.nomeCompleto,
        },
        mensagem: "QR Code gerado com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao gerar QR Code:", error);
    return NextResponse.json(
      {
        erro: "Erro ao gerar QR Code",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/visitantes/[id]/qrcode
 * Retorna o QR Code ativo do visitante
 */
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
    const qrCode = await prisma.qRCodeVisitante.findFirst({
      where: {
        visitanteId: id,
        ativo: true,
      },
      orderBy: { criadoEm: "desc" },
      include: {
        visitante: {
          select: {
            id: true,
            nomeCompleto: true,
          },
        },
      },
    });

    if (!qrCode) {
      return NextResponse.json(
        { erro: "Nenhum QR Code ativo encontrado para este visitante" },
        { status: 404 }
      );
    }

    // Gerar imagem do QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(qrCode.codigoQR, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return NextResponse.json({
      id: qrCode.id,
      codigoQr: qrCode.codigoQR,
      qrCodeImage: qrCodeDataUrl,
      dataGeracao: qrCode.criadoEm.toISOString(),
      dataExpiracao: qrCode.validoAte?.toISOString() || null,
      ativo: qrCode.ativo,
      visitante: {
        id: qrCode.visitante.id,
        nomeCompleto: qrCode.visitante.nomeCompleto,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar QR Code:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar QR Code",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
