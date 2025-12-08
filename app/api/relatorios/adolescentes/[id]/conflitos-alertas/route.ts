import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { carregarRelatorioInternoBase } from "@/lib/relatorios/interno";

const paramsSchema = z.object({
  id: z.string().uuid("Identificador do adolescente invalido"),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const parsed = paramsSchema.safeParse(await params);
    if (!parsed.success) {
      return NextResponse.json({ erro: "Id invalido" }, { status: 400 });
    }

    const data = await carregarRelatorioInternoBase(parsed.data.id);
    if (!data) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "Erro ao gerar relatorio de conflitos/alertas:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { erro: "Erro ao gerar relatorio" },
      { status: 500 }
    );
  }
}
