import type { Prisma } from "@prisma/client";
import { INCLUDE_ADOLESCENTE_DEFAULT } from "@/lib/adolescentes/transformers";

export type PrismaAdolescenteMapa = Prisma.AdolescenteGetPayload<{
  include: typeof INCLUDE_ADOLESCENTE_DEFAULT;
}>;

const CACHE_SYMBOL = Symbol.for("cense.mapa.adolescentes.prisma");
const DEFAULT_TTL_MS = 30_000;

type CacheEntry = {
  mapa: Map<string, PrismaAdolescenteMapa>;
  expiresAt: number;
};

const getStore = () =>
  (globalThis as unknown as Record<string | symbol, CacheEntry | undefined>);

export function setAdolescentesMapaCache(
  lista: PrismaAdolescenteMapa[],
  ttlMs: number = DEFAULT_TTL_MS
) {
  const store = getStore();
  store[CACHE_SYMBOL] = {
    mapa: new Map(lista.map((item) => [item.id, item])),
    expiresAt: Date.now() + ttlMs,
  };
}

export function getAdolescenteMapaCache(
  id: string
): PrismaAdolescenteMapa | null {
  const store = getStore();
  const entry = store[CACHE_SYMBOL];
  if (!entry || entry.expiresAt < Date.now()) {
    delete store[CACHE_SYMBOL];
    return null;
  }
  return entry.mapa.get(id) ?? null;
}

export function invalidateAdolescentesMapaCache() {
  const store = getStore();
  delete store[CACHE_SYMBOL];
}
