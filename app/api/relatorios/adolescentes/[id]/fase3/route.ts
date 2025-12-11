import { NextResponse } from "next/server";

import { carregarRelatorioFase3 } from "@/lib/relatorios/fase3";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { erro: "Adolescente nao informado" },
        { status: 400 }
      );
    }

    const relatorio = await carregarRelatorioFase3(id);
    if (!relatorio) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(relatorio);
  } catch (error) {
    console.error("Erro ao gerar analise da Casa 08:", error);
    return NextResponse.json(
      { erro: "Falha ao gerar relatorio da Casa 08" },
      { status: 500 }
    );
  }
}

