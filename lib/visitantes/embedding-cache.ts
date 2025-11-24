import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type VisitanteEmbeddingEntry = {
  id: string;
  nomeCompleto: string;
  embedding: number[];
};

type VisitanteEmbeddingCacheState = {
  entries: VisitanteEmbeddingEntry[];
  lastLoaded: number;
  dirty: boolean;
  loadingPromise?: Promise<void>;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

type GlobalWithCache = typeof globalThis & {
  __visitanteEmbeddingCache?: VisitanteEmbeddingCacheState;
};

const globalForCache = globalThis as GlobalWithCache;

function getCacheState(): VisitanteEmbeddingCacheState {
  if (!globalForCache.__visitanteEmbeddingCache) {
    globalForCache.__visitanteEmbeddingCache = {
      entries: [],
      lastLoaded: 0,
      dirty: true,
    };
  }
  return globalForCache.__visitanteEmbeddingCache;
}

function normalizeEmbeddings(
  value: Prisma.JsonValue | null
): number[] | null {
  if (!value) return null;
  let raw: unknown;
  if (Array.isArray(value)) {
    raw = value;
  } else {
    try {
      raw = JSON.parse(JSON.stringify(value));
    } catch {
      return null;
    }
  }

  if (!Array.isArray(raw)) {
    return null;
  }

  if (raw.length !== 128) {
    return null;
  }

  const numbers = raw.map((num) => {
    if (typeof num === "number") {
      return num;
    }
    const parsed = Number(num);
    return Number.isFinite(parsed) ? parsed : NaN;
  });

  if (numbers.some((n) => Number.isNaN(n))) {
    return null;
  }

  return numbers;
}

async function loadCache(state: VisitanteEmbeddingCacheState) {
  const visitantes = await prisma.visitante.findMany({
    where: {
      faceEmbeddings: { not: Prisma.JsonNull },
      consentimentoBiometria: true,
      ativo: true,
    },
    select: {
      id: true,
      nomeCompleto: true,
      faceEmbeddings: true,
    },
  });

  const entries: VisitanteEmbeddingEntry[] = [];
  for (const visitante of visitantes) {
    const embedding = normalizeEmbeddings(visitante.faceEmbeddings);
    if (!embedding) continue;
    entries.push({
      id: visitante.id,
      nomeCompleto: visitante.nomeCompleto,
      embedding,
    });
  }

  state.entries = entries;
  state.lastLoaded = Date.now();
  state.dirty = false;
}

export async function getVisitanteEmbeddingCache(options?: {
  forceRefresh?: boolean;
}): Promise<{ entries: VisitanteEmbeddingEntry[]; loadedAt: number }> {
  const state = getCacheState();
  if (options?.forceRefresh) {
    state.dirty = true;
  }

  const expired = Date.now() - state.lastLoaded > CACHE_TTL_MS;
  if (state.dirty || expired || state.entries.length === 0) {
    if (!state.loadingPromise) {
      state.loadingPromise = loadCache(state).finally(() => {
        state.loadingPromise = undefined;
      });
    }
    await state.loadingPromise;
  } else if (state.loadingPromise) {
    await state.loadingPromise;
  }

  return { entries: state.entries, loadedAt: state.lastLoaded };
}

export function markVisitanteEmbeddingCacheDirty() {
  const state = getCacheState();
  state.dirty = true;
}
