import type { Prisma, PrismaClient } from "@prisma/client";

import { registrarMovimentacao } from "@/lib/historico/movimentacao";

type Tx = Prisma.TransactionClient | PrismaClient;

type RegistrarRiscoFugaParams = {
  adolescenteId: string;
  descricao: string;
  referenciaTipo?: string | null;
  referenciaId?: string | null;
  operadorId?: string | null;
  registradoEm?: Date | string | null;
};

const TIPO_REGISTRO = "RISCO_FUGA_ALERTA";

const normalizarTexto = (valor?: string | null) =>
  valor?.normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";

export function textoIndicaFuga(texto?: string | null) {
  const base = normalizarTexto(texto).toUpperCase();
  if (!base) return false;
  return base.includes("FUGA") || base.includes("EVASAO");
}

export async function registrarRiscoFugaAutomatico(
  tx: Tx,
  params: RegistrarRiscoFugaParams
) {
  if (!params.adolescenteId) return;

  const adolescente = await tx.adolescente.findUnique({
    where: { id: params.adolescenteId },
    select: { riscoFuga: true },
  });

  if (!adolescente) {
    return;
  }

  if (adolescente.riscoFuga !== "ALTO") {
    await tx.adolescente.update({
      where: { id: params.adolescenteId },
      data: { riscoFuga: "ALTO" },
    });
  }

  await registrarMovimentacao(tx, {
    adolescenteId: params.adolescenteId,
    tipo: TIPO_REGISTRO,
    descricao: params.descricao,
    referenciaTipo: params.referenciaTipo ?? null,
    referenciaId: params.referenciaId ?? null,
    operadorId: params.operadorId ?? null,
    registradoEm: params.registradoEm ?? null,
  });
}

