import { prisma } from "@/lib/prisma";
import { EstruturaTabsComponent } from "./estrutura-tabs";
import { getEstruturaSnapshot } from "@/lib/estrutura/snapshot";
import {
  INCLUDE_ADOLESCENTE_DEFAULT,
  mapPrismaAdolescente,
} from "@/lib/adolescentes/transformers";
import { construirPayloadMapa } from "@/lib/estrutura/mapa-adapter";
import { setAdolescentesMapaCache } from "@/lib/estrutura/adolescentes-cache";

export default async function EstruturaPage() {
  const [snapshot, adolescentesDb] = await Promise.all([
    getEstruturaSnapshot(),
    prisma.adolescente.findMany({
      include: INCLUDE_ADOLESCENTE_DEFAULT,
      orderBy: { nomeCompleto: "asc" },
    }),
  ]);

  setAdolescentesMapaCache(adolescentesDb);
  const adolescentes = adolescentesDb.map(mapPrismaAdolescente);
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
