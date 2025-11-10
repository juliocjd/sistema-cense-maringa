import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { calcularImpactosExternos } from "@/lib/inteligencia/conflitos";

const querySchema = z.object({
  tipo: z.enum(["TERRITORIAL", "FACCAO", "TODOS"]).optional(),
  status: z.enum(["ATIVO", "INATIVO", "TODOS"]).optional(),
  conflitoId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(
      request.nextUrl.searchParams.entries()
    );

    const parsed = querySchema.safeParse({
      tipo: searchParams.tipo
        ? searchParams.tipo.toUpperCase()
        : undefined,
      status: searchParams.status
        ? searchParams.status.toUpperCase()
        : undefined,
      conflitoId: searchParams.conflitoId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { erro: "Parametros invalidos", detalhes: parsed.error.issues },
        { status: 400 }
      );
    }

    const resultado = await calcularImpactosExternos({
      tipo: parsed.data.tipo,
      status: parsed.data.status,
      conflitoId: parsed.data.conflitoId,
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao gerar impacto de conflitos externos:", error);
    return NextResponse.json(
      {
        erro: "Falha ao gerar relatorio de impacto",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
