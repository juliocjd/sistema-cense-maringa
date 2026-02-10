import type { Prisma, PrismaClient } from "@prisma/client";

import { registrarMovimentacao } from "@/lib/historico/movimentacao";

type Tx = Prisma.TransactionClient | PrismaClient;

type RegistrarEventoParams = {
  adolescenteId: string;
  alertaId?: string | null;
  descricao?: string | null;
  operadorId?: string | null;
  registradoEm?: Date | string | null;
};

export const TIPO_PROTOCOLO_ATIVADO = "RISCO_SUICIDIO_PROTOCOLO";
export const TIPO_PROTOCOLO_ALTA = "RISCO_SUICIDIO_ALTA";

export async function registrarEntradaProtocoloSuicidio(
  tx: Tx,
  params: RegistrarEventoParams,
) {
  if (!params.adolescenteId) return;
  await registrarMovimentacao(tx, {
    adolescenteId: params.adolescenteId,
    tipo: TIPO_PROTOCOLO_ATIVADO,
    descricao:
      params.descricao ??
      "Ingresso no protocolo de risco de suicídio (alerta especial).",
    referenciaTipo: params.alertaId ? "ALERTA" : null,
    referenciaId: params.alertaId ?? null,
    operadorId: params.operadorId ?? null,
    registradoEm: params.registradoEm ?? null,
  });
}

export async function registrarAltaProtocoloSuicidio(
  tx: Tx,
  params: RegistrarEventoParams,
) {
  if (!params.adolescenteId) return;
  await registrarMovimentacao(tx, {
    adolescenteId: params.adolescenteId,
    tipo: TIPO_PROTOCOLO_ALTA,
    descricao:
      params.descricao ??
      "Alta medica registrada para o protocolo de risco de suicídio.",
    referenciaTipo: params.alertaId ? "ALERTA" : null,
    referenciaId: params.alertaId ?? null,
    operadorId: params.operadorId ?? null,
    registradoEm: params.registradoEm ?? null,
  });
}
