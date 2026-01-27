import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  INCLUDE_ADOLESCENTE_MAPA,
  mapPrismaAdolescenteMapa,
} from "@/lib/adolescentes/transformers";
import { getEstruturaSnapshot } from "@/lib/estrutura/snapshot";
import {
  construirPayloadMapa,
  type SnapshotMapaPayload,
} from "@/lib/estrutura/mapa-adapter";
import {
  getAdolescentesMapaCacheMapeados,
  setAdolescentesMapaCache,
} from "@/lib/estrutura/adolescentes-cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skipCache =
      searchParams.get("refresh") === "1" ||
      searchParams.get("cache") === "off";

    const adolescentesCache = !skipCache
      ? getAdolescentesMapaCacheMapeados()
      : null;

    const [snapshot, adolescentesDb] = await Promise.all([
      getEstruturaSnapshot({ skipCache }),
      adolescentesCache
        ? Promise.resolve(null)
        : prisma.adolescente.findMany({
            include: INCLUDE_ADOLESCENTE_MAPA,
            orderBy: { nomeCompleto: "asc" },
          }),
    ]);

    const adolescentes = adolescentesCache ?? (adolescentesDb ?? []).map(mapPrismaAdolescenteMapa);
    if (!adolescentesCache && adolescentesDb) {
      setAdolescentesMapaCache(adolescentesDb, undefined, adolescentes);
    }

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
