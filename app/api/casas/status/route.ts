import { NextRequest, NextResponse } from "next/server";
import {
  getEstruturaSnapshot,
} from "@/lib/estrutura/snapshot";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skipCache =
      searchParams.get("refresh") === "1" ||
      searchParams.get("cache") === "off";

    const snapshot = await getEstruturaSnapshot({ skipCache });
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Erro ao buscar status das casas:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar status das casas",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
