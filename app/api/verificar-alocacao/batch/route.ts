import { NextRequest, NextResponse } from "next/server";
import {
  prepararContexto,
  avaliarAlojamento,
} from "@/app/api/verificar-alocacao/helpers";

type BatchPayload = {
  adolescenteId?: string;
  alojamentos?: string[];
};

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const skipCache =
      searchParams.get("refresh") === "1" ||
      searchParams.get("cache") === "off";
    const payload = (await request.json()) as BatchPayload;
    const adolescenteId = payload.adolescenteId;
    const alojamentos = Array.isArray(payload.alojamentos)
      ? payload.alojamentos
      : [];

    if (!adolescenteId || alojamentos.length === 0) {
      return NextResponse.json(
        {
          erro: "adolescenteId e lista de alojamentos sao obrigatorios",
        },
        { status: 400 }
      );
    }

    const contexto = await prepararContexto({ adolescenteId, skipCache });
    if (!contexto) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 }
      );
    }

    const resultados = alojamentos.map((alojamentoId) => {
      const avaliacao = avaliarAlojamento(contexto, alojamentoId);
      if (avaliacao.status !== 200) {
        return {
          alojamentoId,
          sucesso: false,
          erro: avaliacao.erro ?? "Falha ao avaliar alojamento",
          status: avaliacao.status ?? 500,
        };
      }

      return {
        alojamentoId,
        sucesso: true,
        ...avaliacao.dados,
      };
    });

    return NextResponse.json({
      adolescente: {
        id: contexto.adolescente.id,
        nome: contexto.adolescente.nomeCompleto,
        sms: contexto.adolescente.numeroSms,
      },
      resultados,
    });
  } catch (error) {
    console.error("Erro ao verificar alocacao em lote:", error);
    return NextResponse.json(
      {
        erro: "Erro ao verificar alocacao em lote",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
