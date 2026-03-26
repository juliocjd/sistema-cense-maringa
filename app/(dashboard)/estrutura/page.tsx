export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { EstruturaTabsComponent } from "./estrutura-tabs";
import { getEstruturaSnapshot } from "@/lib/estrutura/snapshot";
import {
  INCLUDE_ADOLESCENTE_MAPA,
  mapPrismaAdolescenteMapa,
} from "@/lib/adolescentes/transformers";
import { construirPayloadMapa } from "@/lib/estrutura/mapa-adapter";
import {
  getAdolescentesMapaCacheMapeados,
  setAdolescentesMapaCache,
} from "@/lib/estrutura/adolescentes-cache";

export default async function EstruturaPage() {
  const adolescentesCache = getAdolescentesMapaCacheMapeados();
  const [snapshot, adolescentesDb] = await Promise.all([
    getEstruturaSnapshot(),
    adolescentesCache
      ? Promise.resolve(null)
      : prisma.adolescente.findMany({
          include: INCLUDE_ADOLESCENTE_MAPA,
          orderBy: { nomeCompleto: "asc" },
        }),
  ]);

  const adolescentes =
    adolescentesCache ?? (adolescentesDb ?? []).map(mapPrismaAdolescenteMapa);
  if (!adolescentesCache && adolescentesDb) {
    setAdolescentesMapaCache(adolescentesDb, undefined, adolescentes);
  }
  const { casas } = construirPayloadMapa({
    snapshot,
    adolescentesDetalhados: adolescentes,
  });

  return (
    <EstruturaTabsComponent
      casas={casas}
      totalAlojamentos={snapshot.estatisticas.total_alojamentos}
    />
  );
}
