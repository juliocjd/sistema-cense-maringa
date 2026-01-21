import type { Prisma } from "@prisma/client";

export type ConflitoPair = { aId: string; bId: string };

export const buildPairKey = (aId: string, bId: string): string =>
  [aId, bId].sort().join("|");

export const dedupePairs = (pairs: ConflitoPair[]): ConflitoPair[] => {
  const mapa = new Map<string, ConflitoPair>();
  for (const pair of pairs) {
    const { aId, bId } = pair;
    if (!aId || !bId || aId === bId) {
      continue;
    }
    const key = buildPairKey(aId, bId);
    if (!mapa.has(key)) {
      mapa.set(key, { aId, bId });
    }
  }
  return Array.from(mapa.values());
};

export const resolveExistingConflictPairs = async (
  tx: Prisma.TransactionClient,
  pairs: ConflitoPair[]
): Promise<number> => {
  if (!pairs.length) {
    return 0;
  }

  const conditions = pairs.map(({ aId, bId }) => ({
    OR: [
      {
        AND: [
          { adolescenteAId: aId },
          { adolescenteBId: bId },
        ],
      },
      {
        AND: [
          { adolescenteAId: bId },
          { adolescenteBId: aId },
        ],
      },
    ],
  }));

  const existentes = await tx.conflito.findMany({
    where: {
      status: "ATIVO",
      OR: conditions,
    },
    select: {
      id: true,
    },
  });

  if (!existentes.length) {
    return 0;
  }

  const agora = new Date();
  await tx.conflito.updateMany({
    where: { id: { in: existentes.map((item) => item.id) } },
    data: {
      status: "RESOLVIDO",
      resolvidoEm: agora,
    },
  });

  return existentes.length;
};

