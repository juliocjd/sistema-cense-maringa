// @ts-nocheck

import { prisma } from "@/lib/prisma";
import { INCLUDE_ADOLESCENTE_DEFAULT } from "@/lib/adolescentes/transformers";
import {
  getAdolescenteMapaCache,
  type PrismaAdolescenteMapa,
} from "@/lib/estrutura/adolescentes-cache";
import { getEstruturaCasasParaCalculo } from "@/lib/estrutura/snapshot";
import {
  montarMapaBairrosConflitantes,
  montarMapaFaccoesConflitantes,
} from "@/lib/conflitos";
import { formatarImpactosExternos } from "@/lib/alocacao/utils";
import { simularAlocacao } from "@/lib/alocacao/simulador";
import type {
  CasaRisco,
  ConflitosExternosMapa,
} from "@/lib/riscos/calcular";

export type ContextoVerificacao = {
  adolescente: PrismaAdolescenteMapa;
  casasBase: CasaRisco[];
  conflitosExternos: ConflitosExternosMapa;
};

const filtrarConflitosAtivos = (
  adolescente: PrismaAdolescenteMapa
): PrismaAdolescenteMapa => {
  return {
    ...adolescente,
    conflitosA:
      adolescente.conflitosA?.filter(
        (conflito: any) => conflito.status === "ATIVO"
      ) ?? [],
    conflitosB:
      adolescente.conflitosB?.filter(
        (conflito: any) => conflito.status === "ATIVO"
      ) ?? [],
  };
};

const carregarAdolescente = async (
  adolescenteId: string,
  skipCache?: boolean
): Promise<PrismaAdolescenteMapa | null> => {
  let adolescente: PrismaAdolescenteMapa | null = null;

  if (!skipCache) {
    adolescente = getAdolescenteMapaCache(adolescenteId);
    if (adolescente) return adolescente;
  }

  adolescente = await prisma.adolescente.findUnique({
    where: { id: adolescenteId },
    include: INCLUDE_ADOLESCENTE_DEFAULT,
  });

  return adolescente ?? null;
};

export async function prepararContexto({
  adolescenteId,
  skipCache,
}: {
  adolescenteId: string;
  skipCache?: boolean;
}): Promise<ContextoVerificacao | null> {
  const adolescente = await carregarAdolescente(adolescenteId, skipCache);
  if (!adolescente) {
    return null;
  }

  const adolescenteFiltrado = filtrarConflitosAtivos(adolescente);

  const casasBase = await getEstruturaCasasParaCalculo({ skipCache });

  const [mapaBairros, mapaFaccoes] = await Promise.all([
    montarMapaBairrosConflitantes(adolescenteFiltrado.bairroOrigemId),
    montarMapaFaccoesConflitantes(
      adolescenteFiltrado.faccaoGrupoId ??
        adolescenteFiltrado.faccao?.id ??
        null
    ),
  ]);

  const conflitosExternos = formatarImpactosExternos(
    adolescenteFiltrado,
    mapaBairros,
    mapaFaccoes
  );

  return {
    adolescente: adolescenteFiltrado,
    casasBase,
    conflitosExternos,
  };
}

export const avaliarAlojamento = (
  contexto: ContextoVerificacao,
  alojamentoId: string
) =>
  simularAlocacao({
    adolescente: contexto.adolescente,
    alojamentoId,
    casasBase: contexto.casasBase,
    conflitosExternos: contexto.conflitosExternos,
  });
