import type { Prisma } from "@prisma/client";

export class NumeroInternoIndisponivelError extends Error {
  constructor(
    public readonly numero: number,
    public readonly titular: string
  ) {
    super(`Numero ${numero} ja esta em uso por ${titular}`);
    this.name = "NumeroInternoIndisponivelError";
  }
}

export async function garantirNumeroInternoDisponivel(
  tx: Prisma.TransactionClient,
  numero: number,
  ignoreId?: string
) {
  const existente = await tx.adolescente.findFirst({
    where: {
      numeroInterno: numero,
      statusUnidade: "ATIVO",
      ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
    },
    select: { id: true, nomeCompleto: true },
  });

  if (existente) {
    throw new NumeroInternoIndisponivelError(numero, existente.nomeCompleto);
  }
}
