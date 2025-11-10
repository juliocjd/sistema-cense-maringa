import { NextRequest, NextResponse } from "next/server";

import { gerarSugestoesParaAlocacao } from "@/lib/alocacao/sugestoes";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const adolescenteId = searchParams.get("adolescenteId");
  const limite = Number(searchParams.get("limite") ?? 3);

  if (!adolescenteId) {
    return NextResponse.json(
      { erro: "adolescenteId é obrigatório" },
      { status: 400 }
    );
  }

  try {
    const resultado = await gerarSugestoesParaAlocacao({
      adolescenteId,
      limite: Number.isFinite(limite) && limite > 0 ? limite : 3,
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao gerar sugestoes de alocacao:", error);
    return NextResponse.json(
      {
        erro: "Falha ao gerar sugestoes",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || (!body.adolescenteId && !body.bairroId && !body.faccaoId)) {
      return NextResponse.json(
        {
          erro:
            "Informe adolescenteId ou pelo menos bairroId/faccaoId para gerar sugestões.",
        },
        { status: 400 }
      );
    }

    const resultado = await gerarSugestoesParaAlocacao({
      adolescenteId: body.adolescenteId ?? undefined,
      bairroId: body.bairroId ?? null,
      faccaoId: body.faccaoId ?? null,
      limite:
        typeof body.limite === "number" && body.limite > 0
          ? body.limite
          : 3,
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao gerar sugestoes de alocacao:", error);
    return NextResponse.json(
      {
        erro: "Falha ao gerar sugestoes",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
