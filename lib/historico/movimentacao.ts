import type { Prisma, PrismaClient } from "@prisma/client";

type TxClient = Prisma.TransactionClient | PrismaClient;

type RegistrarMovimentacaoInput = {
  adolescenteId: string;
  tipo: string;
  descricao?: string | null;
  origemCasaId?: string | null;
  origemAlojamentoId?: string | null;
  destinoCasaId?: string | null;
  destinoAlojamentoId?: string | null;
  referenciaTipo?: string | null;
  referenciaId?: string | null;
  operadorId?: string | null;
  registradoEm?: Date | string | null;
};

export async function registrarMovimentacao(
  tx: TxClient,
  data: RegistrarMovimentacaoInput
) {
  if (!data.adolescenteId || !data.tipo) {
    throw new Error("registrarMovimentacao requer adolescenteId e tipo");
  }

  return tx.historicoMovimentacao.create({
    data: {
      adolescenteId: data.adolescenteId,
      tipo: data.tipo,
      descricao: data.descricao ?? null,
      origemCasaId: data.origemCasaId ?? null,
      origemAlojamentoId: data.origemAlojamentoId ?? null,
      destinoCasaId: data.destinoCasaId ?? null,
      destinoAlojamentoId: data.destinoAlojamentoId ?? null,
      referenciaTipo: data.referenciaTipo ?? null,
      referenciaId: data.referenciaId ?? null,
      operadorId: data.operadorId ?? null,
      registradoEm: data.registradoEm
        ? data.registradoEm instanceof Date
          ? data.registradoEm
          : new Date(data.registradoEm)
        : new Date(),
    },
  });
}
