import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const removerPdfArquivo = async (arquivoPdfPath?: string | null) => {
  const caminho = arquivoPdfPath?.trim();
  if (!caminho) {
    return { removido: false, motivo: "sem_arquivo" };
  }

  if (caminho.startsWith("http://") || caminho.startsWith("https://")) {
    try {
      await del(caminho);
      return { removido: true, origem: "blob" };
    } catch (error) {
      return {
        removido: false,
        origem: "blob",
        erro: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const baseDir = process.cwd();
  const relativo = caminho.replace(/^\/+/, "");
  const resolved = path.isAbsolute(caminho)
    ? path.resolve(caminho)
    : path.resolve(baseDir, relativo);

  if (!resolved.startsWith(baseDir)) {
    return { removido: false, motivo: "fora_da_base" };
  }

  try {
    await fs.unlink(resolved);
    return { removido: true, origem: "local" };
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return { removido: false, origem: "local", motivo: "nao_encontrado" };
    }
    return {
      removido: false,
      origem: "local",
      erro: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * DELETE /api/justificativas-algema/[id]
 * Remove justificativa e exclui o PDF associado (se existir).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth().catch(() => null);
    const permissoes = session?.user?.permissions ?? [];
    if (!hasPermission(permissoes, PERMISSIONS.JUSTIFICATIVAS_ALGEMA_VIEW)) {
      return NextResponse.json(
        { erro: "Sem permissao para excluir justificativas de algema" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const justificativa = await prisma.justificativaAlgema.findUnique({
      where: { id },
      select: {
        id: true,
        numeroDocumento: true,
        arquivoPdfPath: true,
      },
    });

    if (!justificativa) {
      return NextResponse.json(
        { erro: "Justificativa não encontrada" },
        { status: 404 }
      );
    }

    const resultadoPdf = await removerPdfArquivo(justificativa.arquivoPdfPath);

    await prisma.$transaction(async (tx) => {
      await tx.justificativaAlgema.delete({ where: { id } });
      await tx.logAuditoria.create({
        data: {
          acao: "DELETE",
          tabelaAfetada: "JustificativaAlgema",
          registroIdAfetado: justificativa.id,
          detalhesAlteracao: {
            numeroDocumento: justificativa.numeroDocumento,
            arquivoPdfPath: justificativa.arquivoPdfPath,
            pdfRemovido: resultadoPdf.removido,
            pdfDetalhes: resultadoPdf,
          },
        },
      });
    });

    return NextResponse.json({
      mensagem: "Justificativa removida com sucesso",
      pdfRemovido: resultadoPdf.removido,
      pdfDetalhes: resultadoPdf,
    });
  } catch (error) {
    console.error("Erro ao excluir justificativa:", error);
    return NextResponse.json(
      { erro: "Erro ao excluir justificativa de algema" },
      { status: 500 }
    );
  }
}
