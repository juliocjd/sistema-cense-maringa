import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { visitanteId, faceEmbeddings, fotoUrl, consentimento } = body;

    // Validações
    if (!visitanteId) {
      return NextResponse.json(
        { error: "ID do visitante é obrigatório" },
        { status: 400 }
      );
    }

    if (!faceEmbeddings || !Array.isArray(faceEmbeddings)) {
      return NextResponse.json(
        { error: "Face embeddings inválidos" },
        { status: 400 }
      );
    }

    // Validar que embeddings tem 128 dimensões (padrão face-api.js)
    if (faceEmbeddings.length !== 128) {
      return NextResponse.json(
        { error: `Face embeddings deve ter 128 dimensões (recebido: ${faceEmbeddings.length})` },
        { status: 400 }
      );
    }

    // Verificar se visitante existe
    const visitante = await prisma.visitante.findUnique({
      where: { id: visitanteId },
    });

    if (!visitante) {
      return NextResponse.json(
        { error: "Visitante não encontrado" },
        { status: 404 }
      );
    }

    // Verificar consentimento (LGPD)
    if (consentimento === false) {
      return NextResponse.json(
        { error: "É necessário o consentimento do visitante para cadastrar biometria facial" },
        { status: 400 }
      );
    }

    // Atualizar visitante com embeddings faciais
    const visitanteAtualizado = await prisma.visitante.update({
      where: { id: visitanteId },
      data: {
        faceEmbeddings: faceEmbeddings,
        consentimentoBiometria: consentimento !== false,
        dataConsentimento: consentimento ? new Date() : null,
        ...(fotoUrl && { fotoUrl }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Face cadastrada com sucesso",
      visitante: {
        id: visitanteAtualizado.id,
        nomeCompleto: visitanteAtualizado.nomeCompleto,
        fotoUrl: visitanteAtualizado.fotoUrl,
        consentimentoBiometria: visitanteAtualizado.consentimentoBiometria,
        dataConsentimento: visitanteAtualizado.dataConsentimento,
      },
    });
  } catch (error) {
    console.error("Erro ao cadastrar face:", error);
    return NextResponse.json(
      { error: "Erro ao cadastrar face do visitante" },
      { status: 500 }
    );
  }
}

/**
 * GET - Verifica se visitante já tem face cadastrada
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const visitanteId = searchParams.get("visitanteId");

    if (!visitanteId) {
      return NextResponse.json(
        { error: "ID do visitante é obrigatório" },
        { status: 400 }
      );
    }

    const visitante = await prisma.visitante.findUnique({
      where: { id: visitanteId },
      select: {
        id: true,
        nomeCompleto: true,
        fotoUrl: true,
        faceEmbeddings: true,
        consentimentoBiometria: true,
        dataConsentimento: true,
      },
    });

    if (!visitante) {
      return NextResponse.json(
        { error: "Visitante não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      visitante: {
        id: visitante.id,
        nomeCompleto: visitante.nomeCompleto,
        fotoUrl: visitante.fotoUrl,
        temFaceCadastrada: !!visitante.faceEmbeddings,
        consentimentoBiometria: visitante.consentimentoBiometria,
        dataConsentimento: visitante.dataConsentimento,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar cadastro facial:", error);
    return NextResponse.json(
      { error: "Erro ao verificar cadastro facial" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove face cadastrada (revogação de consentimento)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const visitanteId = searchParams.get("visitanteId");

    if (!visitanteId) {
      return NextResponse.json(
        { error: "ID do visitante é obrigatório" },
        { status: 400 }
      );
    }

    const visitante = await prisma.visitante.findUnique({
      where: { id: visitanteId },
    });

    if (!visitante) {
      return NextResponse.json(
        { error: "Visitante não encontrado" },
        { status: 404 }
      );
    }

    // Remover embeddings e revogar consentimento
    await prisma.visitante.update({
      where: { id: visitanteId },
      data: {
        faceEmbeddings: Prisma.JsonNull,
        consentimentoBiometria: false,
        dataConsentimento: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Face removida e consentimento revogado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover face:", error);
    return NextResponse.json(
      { error: "Erro ao remover face do visitante" },
      { status: 500 }
    );
  }
}
