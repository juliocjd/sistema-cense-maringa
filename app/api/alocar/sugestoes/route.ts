import { NextRequest, NextResponse } from "next/server";

import {
  gerarDiagnosticoCasaParaAlocacao,
  gerarSugestoesParaAlocacao,
} from "@/lib/alocacao/sugestoes";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const adolescenteId = searchParams.get("adolescenteId");
  const limite = Number(searchParams.get("limite") ?? 3);
  const casaId = searchParams.get("casaId") ?? undefined;
  const diagnostico = searchParams.get("diagnostico") === "1";
  const tipoInternacao =
    searchParams.get("tipoInternacao") === "PROVISORIA" ||
    searchParams.get("tipoInternacao") === "DEFINITIVA"
      ? (searchParams.get("tipoInternacao") as "PROVISORIA" | "DEFINITIVA")
      : null;
  const faseInternacaoAtualId =
    searchParams.get("faseInternacaoAtualId") ?? undefined;

  if (!adolescenteId) {
    return NextResponse.json(
      { erro: "adolescenteId é obrigatório" },
      { status: 400 },
    );
  }

  try {
    const resultado = await gerarSugestoesParaAlocacao({
      adolescenteId,
      limite: Number.isFinite(limite) && limite > 0 ? limite : 3,
      tipoInternacao,
      faseInternacaoAtualId,
    });

    const diagnosticoCasa =
      diagnostico && casaId
        ? await gerarDiagnosticoCasaParaAlocacao({
            adolescenteId,
            casaId,
            tipoInternacao,
            faseInternacaoAtualId,
          })
        : null;

    return NextResponse.json({
      ...resultado,
      diagnostico: diagnosticoCasa,
    });
  } catch (error) {
    console.error("Erro ao gerar sugestoes de alocação:", error);
    return NextResponse.json(
      {
        erro: "Falha ao gerar sugestoes",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || (!body.adolescenteId && !body.bairroId && !body.faccaoId)) {
      return NextResponse.json(
        {
          erro: "Informe adolescenteId ou pelo menos bairroId/faccaoId para gerar sugestões.",
        },
        { status: 400 },
      );
    }

    const resultado = await gerarSugestoesParaAlocacao({
      adolescenteId: body.adolescenteId ?? undefined,
      bairroId: body.bairroId ?? null,
      faccaoId: body.faccaoId ?? null,
      limite:
        typeof body.limite === "number" && body.limite > 0 ? body.limite : 3,
      tipoInternacao:
        body.tipoInternacao === "PROVISORIA" ||
        body.tipoInternacao === "DEFINITIVA"
          ? body.tipoInternacao
          : null,
      faseInternacaoAtualId:
        typeof body.faseInternacaoAtualId === "string"
          ? body.faseInternacaoAtualId
          : null,
    });

    const diagnosticoCasa =
      body?.diagnostico && body?.casaId
        ? await gerarDiagnosticoCasaParaAlocacao({
            adolescenteId: body.adolescenteId ?? undefined,
            bairroId: body.bairroId ?? null,
            faccaoId: body.faccaoId ?? null,
            casaId: body.casaId,
            tipoInternacao:
              body.tipoInternacao === "PROVISORIA" ||
              body.tipoInternacao === "DEFINITIVA"
                ? body.tipoInternacao
                : null,
            faseInternacaoAtualId:
              typeof body.faseInternacaoAtualId === "string"
                ? body.faseInternacaoAtualId
                : null,
          })
        : null;

    return NextResponse.json({
      ...resultado,
      diagnostico: diagnosticoCasa,
    });
  } catch (error) {
    console.error("Erro ao gerar sugestoes de alocação:", error);
    return NextResponse.json(
      {
        erro: "Falha ao gerar sugestoes",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
