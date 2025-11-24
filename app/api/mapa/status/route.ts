import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  INCLUDE_ADOLESCENTE_DEFAULT,
  mapPrismaAdolescente,
} from "@/lib/adolescentes/transformers";
import { getEstruturaSnapshot } from "@/lib/estrutura/snapshot";
import {
  construirPayloadMapa,
  type SnapshotMapaPayload,
} from "@/lib/estrutura/mapa-adapter";
import { setAdolescentesMapaCache } from "@/lib/estrutura/adolescentes-cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skipCache =
      searchParams.get("refresh") === "1" ||
      searchParams.get("cache") === "off";

    const [snapshot, adolescentesDb] = await Promise.all([
      getEstruturaSnapshot({ skipCache }),
      prisma.adolescente.findMany({
        include: INCLUDE_ADOLESCENTE_DEFAULT,
        orderBy: { nomeCompleto: "asc" },
      }),
    ]);

    setAdolescentesMapaCache(adolescentesDb);
    const adolescentes = adolescentesDb.map(mapPrismaAdolescente);

    const { casas, avaliacoes }: SnapshotMapaPayload = construirPayloadMapa({
      snapshot,
      adolescentesDetalhados: adolescentes,
    });

    return NextResponse.json({
      casas,
      adolescentes,
      avaliacoes,
      estatisticas: snapshot.estatisticas,
    });
  } catch (error) {
    console.error("Erro ao carregar dados do mapa:", error);
    return NextResponse.json(
      {
        erro: "Erro ao carregar dados do mapa",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
