import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

const MAX_PDF_SIZE = 10 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { erro: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { erro: "Tipo de arquivo nao permitido. Use PDF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { erro: "Arquivo muito grande. Tamanho maximo: 10MB" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 12);
    const fileName = `visitantes/antecedentes/${id}/${timestamp}-${randomStr}.pdf`;

    const blob = await put(fileName, file, {
      access: "public",
    });

    const atualizado = await prisma.visitante.update({
      where: { id },
      data: {
        antecedentesPdfUrl: blob.url,
        antecedentesPdfAtualizadoEm: new Date(),
      },
      select: {
        antecedentesPdfUrl: true,
        antecedentesPdfAtualizadoEm: true,
      },
    });

    return NextResponse.json({
      antecedentesPdfUrl: atualizado.antecedentesPdfUrl,
      antecedentesPdfAtualizadoEm: atualizado.antecedentesPdfAtualizadoEm
        ? atualizado.antecedentesPdfAtualizadoEm.toISOString()
        : null,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { erro: "Visitante nao encontrado" },
        { status: 404 }
      );
    }

    console.error("Erro ao salvar antecedentes:", error);
    return NextResponse.json(
      { erro: "Erro ao salvar antecedentes" },
      { status: 500 }
    );
  }
}
