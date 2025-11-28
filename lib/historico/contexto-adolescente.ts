import { Prisma } from "@prisma/client";

export const MOVIMENTACAO_ADOLESCENTE_SELECT = {
  id: true,
  nomeCompleto: true,
  alojamentoAtualId: true,
  alojamentoAtual: {
    select: {
      id: true,
      numeroAlojamento: true,
      ala: true,
      casaId: true,
      casa: {
        select: {
          id: true,
          nome: true,
          numero: true,
        },
      },
    },
  },
} satisfies Prisma.AdolescenteSelect;

export type MovimentacaoAdolescenteContext = Prisma.AdolescenteGetPayload<{
  select: typeof MOVIMENTACAO_ADOLESCENTE_SELECT;
}>;

export const extrairOrigemMovimentacao = (
  contexto?: MovimentacaoAdolescenteContext | null
) => ({
  origemCasaId: contexto?.alojamentoAtual?.casaId ?? null,
  origemAlojamentoId: contexto?.alojamentoAtualId ?? null,
});
