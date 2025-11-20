import { NextRequest, NextResponse } from "next/server";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import {
  buscarFotosParaExclusao,
  executarAutoExclusaoFotos,
  notificarAntesExclusao,
} from "@/lib/lgpd/auto-exclusao-fotos";

/**
 * GET /api/lgpd/auto-exclusao
 * Lista fotos que serão excluídas (preview)
 */
export async function GET(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const fotosParaExcluir = await buscarFotosParaExclusao();

    return NextResponse.json({
      success: true,
      total: fotosParaExcluir.length,
      fotos: fotosParaExcluir.map((f) => ({
        visitanteId: f.id,
        nome: f.nomeCompleto,
        cpf: f.cpf,
        dataUltimaAtualizacao: f.dataUltimaAtualizacao,
        diasSemVisita: Math.floor(
          (Date.now() - new Date(f.dataUltimaAtualizacao).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      })),
    });
  } catch (error) {
    console.error("Erro ao buscar fotos para exclusão:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar fotos para exclusão",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lgpd/auto-exclusao
 * Executa o processo de auto-exclusão
 */
export async function POST(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const acao = body.acao; // "executar" ou "notificar"

    if (acao === "notificar") {
      const resultado = await notificarAntesExclusao();
      return NextResponse.json({
        success: true,
        mensagem: `${resultado.total} visitantes serão notificados`,
        ...resultado,
      });
    }

    if (acao === "executar") {
      const confirmacao = body.confirmacao === true;

      if (!confirmacao) {
        return NextResponse.json(
          {
            error: "Confirmação necessária",
            mensagem: "Envie confirmacao: true para executar a exclusão",
          },
          { status: 400 }
        );
      }

      const resultado = await executarAutoExclusaoFotos();

      return NextResponse.json({
        success: true,
        mensagem: `Processo concluído. ${resultado.sucesso} fotos excluídas, ${resultado.falhas} falhas`,
        ...resultado,
      });
    }

    return NextResponse.json(
      {
        error: "Ação inválida",
        mensagem: 'Use acao: "executar" ou "notificar"',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro ao executar auto-exclusão:", error);
    return NextResponse.json(
      {
        error: "Erro ao executar auto-exclusão",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
