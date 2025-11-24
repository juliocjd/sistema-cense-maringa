export type EmbeddingEntry = {
  id: string;
  nome?: string;
  embedding: number[];
};

export function euclideanDistance(vec1: number[], vec2: number[]): number {
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function distanceToConfidence(distance: number, threshold = 0.6): number {
  const normalized = 1 - distance / threshold;
  return Math.round(Math.max(0, Math.min(1, normalized)) * 100);
}

export function findBestEmbeddingMatch(
  targetEmbedding: number[],
  entries: EmbeddingEntry[],
  threshold = 0.6
): { id: string; nome?: string; distance: number; confidence: number } | null {
  let best:
    | {
        id: string;
        nome?: string;
        distance: number;
      }
    | null = null;

  for (const entry of entries) {
    const distance = euclideanDistance(targetEmbedding, entry.embedding);
    if (distance >= threshold) {
      continue;
    }
    if (!best || distance < best.distance) {
      best = {
        id: entry.id,
        nome: entry.nome,
        distance,
      };
    }
  }

  if (!best) return null;

  return {
    ...best,
    confidence: distanceToConfidence(best.distance, threshold),
  };
}
