import { NextRequest, NextResponse } from "next/server";
import {
  prepararContexto,
  avaliarAlojamento,
} from "@/app/api/verificar-alocacao/helpers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adolescenteId = searchParams.get("adolescenteId");
    const alojamentoId = searchParams.get("alojamentoId");
    // Força recarregar dados do adolescente (sem cache) para garantir alertas/ids atualizados
    const skipCache = true;

    if (!adolescenteId || !alojamentoId) {
      return NextResponse.json(
        {
          erro: "adolescenteId e alojamentoId sao obrigatorios",
          permite_alocacao: false,
        },
        { status: 400 }
      );
    }

    const contexto = await prepararContexto({ adolescenteId, skipCache });

    if (!contexto) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado", permite_alocacao: false },
        { status: 404 }
      );
    }

    const resultado = avaliarAlojamento(contexto, alojamentoId);

    if (resultado.status !== 200) {
      return NextResponse.json(
        {
          erro: resultado.erro ?? "Falha ao avaliar alojamento",
          permite_alocacao: false,
        },
        { status: resultado.status ?? 500 }
      );
    }

    return NextResponse.json({
      ...resultado.dados,
      adolescente: {
        id: contexto.adolescente.id,
        nome: contexto.adolescente.nomeCompleto,
        sms: contexto.adolescente.numeroSms,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar alocacao:", error);
    return NextResponse.json(
      {
        erro: "Erro ao verificar alocacao",
        detalhes: error instanceof Error ? error.message : String(error),
        permite_alocacao: false,
      },
      { status: 500 }
    );
  }
}
