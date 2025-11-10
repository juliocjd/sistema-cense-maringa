import { prisma } from "@/lib/prisma";

export interface BairroConflitoInfo {
  id: string;
  status: string;
  origem: {
    id: string;
    nome: string;
  };
  destino: {
    id: string;
    nome: string;
  };
}

export interface FaccaoConflitoInfo {
  id: string;
  status: string;
  origem: {
    id: string;
    nome: string;
  };
  destino: {
    id: string;
    nome: string;
  };
}

export async function montarMapaBairrosConflitantes(
  bairroId: string | null | undefined
): Promise<Map<string, BairroConflitoInfo>> {
  const mapa = new Map<string, BairroConflitoInfo>();

  if (!bairroId) {
    return mapa;
  }

  const conflitos = await prisma.bairroConflito.findMany({
    where: {
      status: "ATIVO",
      OR: [{ bairroAId: bairroId }, { barroBId: bairroId }],
    },
    include: {
      bairroA: true,
      bairroB: true,
    },
  });

  for (const conflito of conflitos) {
    const outroId = conflito.bairroAId === bairroId ? conflito.barroBId : conflito.bairroAId;
    const origem = conflito.bairroA
      ? { id: conflito.bairroA.id, nome: conflito.bairroA.nomeBairro }
      : { id: conflito.bairroAId, nome: "Desconhecido" };
    const destino = conflito.bairroB
      ? { id: conflito.bairroB.id, nome: conflito.bairroB.nomeBairro }
      : { id: conflito.barroBId, nome: "Desconhecido" };

    mapa.set(outroId, {
      id: conflito.id,
      status: conflito.status,
      origem,
      destino,
    });
  }

  return mapa;
}

export async function montarMapaFaccoesConflitantes(
  faccaoId: string | null | undefined
): Promise<Map<string, FaccaoConflitoInfo>> {
  const mapa = new Map<string, FaccaoConflitoInfo>();

  if (!faccaoId) {
    return mapa;
  }

  const conflitos = await prisma.faccaoConflito.findMany({
    where: {
      status: "ATIVO",
      OR: [{ faccaoAId: faccaoId }, { faccaoBId: faccaoId }],
    },
    include: {
      faccaoA: true,
      faccaoB: true,
    },
  });

  for (const conflito of conflitos) {
    const outroId = conflito.faccaoAId === faccaoId ? conflito.faccaoBId : conflito.faccaoAId;
    const origem = conflito.faccaoA
      ? { id: conflito.faccaoA.id, nome: conflito.faccaoA.nomeFaccao }
      : { id: conflito.faccaoAId, nome: "Desconhecido" };
    const destino = conflito.faccaoB
      ? { id: conflito.faccaoB.id, nome: conflito.faccaoB.nomeFaccao }
      : { id: conflito.faccaoBId, nome: "Desconhecido" };

    mapa.set(outroId, {
      id: conflito.id,
      status: conflito.status,
      origem,
      destino,
    });
  }

  return mapa;
}
