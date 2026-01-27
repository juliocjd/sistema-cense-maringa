import type { Prisma } from "@prisma/client";
import { INCLUDE_ADOLESCENTE_MAPA } from "@/lib/adolescentes/transformers";
import type { Adolescente } from "@/types";

export type PrismaAdolescenteMapa = Prisma.AdolescenteGetPayload<{
  include: typeof INCLUDE_ADOLESCENTE_MAPA;
}>;

const CACHE_SYMBOL = Symbol.for("cense.mapa.adolescentes.prisma");
const DEFAULT_TTL_MS = 30_000;

type CacheEntry = {
  mapa: Map<string, PrismaAdolescenteMapa>;
  listaMapeada?: Adolescente[];
  expiresAt: number;
};

const getStore = () =>
  (globalThis as unknown as Record<string | symbol, CacheEntry | undefined>);

export function setAdolescentesMapaCache(
  lista: PrismaAdolescenteMapa[],
  ttlMs: number = DEFAULT_TTL_MS,
  listaMapeada?: Adolescente[]
) {
  const store = getStore();
  store[CACHE_SYMBOL] = {
    mapa: new Map(lista.map((item) => [item.id, item])),
    listaMapeada,
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

export function getAdolescentesMapaCacheLista(): PrismaAdolescenteMapa[] | null {
  const store = getStore();
  const entry = store[CACHE_SYMBOL];
  if (!entry || entry.expiresAt < Date.now()) {
    delete store[CACHE_SYMBOL];
    return null;
  }
  return Array.from(entry.mapa.values());
}

export function getAdolescentesMapaCacheMapeados(): Adolescente[] | null {
  const store = getStore();
  const entry = store[CACHE_SYMBOL];
  if (!entry || entry.expiresAt < Date.now()) {
    delete store[CACHE_SYMBOL];
    return null;
  }
  return entry.listaMapeada ?? null;
}

export function invalidateAdolescentesMapaCache() {
  const store = getStore();
  delete store[CACHE_SYMBOL];
}
