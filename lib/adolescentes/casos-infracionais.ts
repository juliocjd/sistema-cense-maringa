type TipificacaoLike = {
  id?: string | null;
  ordem?: number | null;
  descricao?: string | null;
  naturezaExecucao?: "CONSUMADO" | "TENTADO" | string | null;
  qualificadora?: string | null;
  majorante?: string | null;
  principal?: boolean | null;
  observacoes?: string | null;
};

type CasoLike = {
  id?: string | null;
  status?: string | null;
  numeroProcesso?: string | null;
  anoFato?: number | null;
  comarca?: string | null;
  narrativa?: string | null;
  tipificacoes?: TipificacaoLike[] | null;
};

export type CasoInfracionalNormalizado<
  TTipificacao extends TipificacaoLike = TipificacaoLike,
> = Omit<CasoLike, "tipificacoes"> & {
  tipificacoes: TTipificacao[];
};

const trimOrNull = (value?: string | null) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizarNaturezaExecucao = (
  value?: string | null,
): "CONSUMADO" | "TENTADO" | null => {
  if (value === "CONSUMADO" || value === "TENTADO") {
    return value;
  }
  return null;
};

const removerMarcadorTentativa = (descricao?: string | null) =>
  (descricao ?? "").replace(/\s+tentad[oa]\s*$/i, "").trim();

const formatarDescricaoTipificacao = (
  descricao?: string | null,
  naturezaExecucao?: string | null,
) => {
  const descricaoNormalizada = trimOrNull(removerMarcadorTentativa(descricao));
  if (!descricaoNormalizada) {
    return null;
  }

  return normalizarNaturezaExecucao(naturezaExecucao) === "TENTADO"
    ? `${descricaoNormalizada} Tentado`
    : descricaoNormalizada;
};

const normalizarTipificacoes = <T extends TipificacaoLike>(
  tipificacoes?: T[] | null,
): T[] =>
  (tipificacoes ?? [])
    .map((tipificacao, indice) => ({
      ...tipificacao,
      ordem: tipificacao.ordem ?? indice + 1,
      principal: tipificacao.principal ?? indice === 0,
      naturezaExecucao: normalizarNaturezaExecucao(
        tipificacao.naturezaExecucao,
      ),
    }))
    .filter((tipificacao) =>
      Boolean(
        formatarDescricaoTipificacao(
          tipificacao.descricao,
          tipificacao.naturezaExecucao,
        ) ||
          trimOrNull(tipificacao.qualificadora) ||
          trimOrNull(tipificacao.majorante) ||
          trimOrNull(tipificacao.observacoes),
      ),
    ) as T[];

export const normalizarCasoInfracional = <
  TCaso extends CasoLike,
  TTipificacao extends TipificacaoLike = TipificacaoLike,
>(
  caso?: TCaso | null,
): (TCaso & CasoInfracionalNormalizado<TTipificacao>) | null => {
  if (!caso) return null;

  return {
    ...caso,
    numeroProcesso: trimOrNull(caso.numeroProcesso),
    comarca: trimOrNull(caso.comarca),
    narrativa: trimOrNull(caso.narrativa),
    tipificacoes: normalizarTipificacoes(
      (caso.tipificacoes ?? null) as TTipificacao[] | null,
    ),
  };
};

export const obterCasoAtual = <T extends CasoLike>(casos?: T[] | null): T | null => {
  const lista = casos ?? [];
  const atual = lista.find((caso) => caso.status === "ATUAL");
  if (atual) {
    return atual as T;
  }

  // Compatibilidade com registros legados que possuem um único caso sem status.
  if (lista.length === 1 && !trimOrNull(lista[0]?.status)) {
    return lista[0] as T;
  }

  return null;
};

export const obterCasosHistoricos = <T extends CasoLike>(
  casos?: T[] | null,
  casoAtualId?: string | null,
): T[] =>
  (casos ?? []).filter(
    (caso) => caso.id !== casoAtualId && caso.status !== "ATUAL",
  ) as T[];

export const obterTipificacaoPrincipal = <T extends TipificacaoLike>(
  tipificacoes?: T[] | null,
): T | null =>
  (tipificacoes?.find((tipificacao) => tipificacao.principal) ??
    tipificacoes?.[0] ??
    null) as T | null;

export const formatarResumoTipificacao = (
  tipificacao?: TipificacaoLike | null,
): string | null => {
  if (!tipificacao) return null;

  const partes = [
    formatarDescricaoTipificacao(
      tipificacao.descricao,
      tipificacao.naturezaExecucao,
    ),
  ];
  if (trimOrNull(tipificacao.qualificadora)) {
    partes.push(`Qualificadora: ${tipificacao.qualificadora!.trim()}`);
  }
  if (trimOrNull(tipificacao.majorante)) {
    partes.push(`Majorante: ${tipificacao.majorante!.trim()}`);
  }

  const resumo = partes.filter(Boolean).join(" | ");
  return resumo.length > 0 ? resumo : null;
};

export const listarResumoTipificacoes = (
  casoOuTipificacoes?: CasoLike | TipificacaoLike[] | null,
): string[] => {
  const tipificacoes = Array.isArray(casoOuTipificacoes)
    ? casoOuTipificacoes
    : normalizarCasoInfracional(casoOuTipificacoes)?.tipificacoes ?? [];

  return tipificacoes
    .map((tipificacao) => formatarResumoTipificacao(tipificacao))
    .filter((item): item is string => Boolean(item));
};

export const obterTituloCaso = (caso?: CasoLike | null): string | null =>
  formatarResumoTipificacao(
    obterTipificacaoPrincipal(normalizarCasoInfracional(caso)?.tipificacoes),
  );

export const obterResumoAtoAtual = (input: {
  atoInfracionalAtual?: string | null;
  numeroProcesso?: string | null;
  atoInfracionalProcesso?: string | null;
  atoInfracionalAno?: number | null;
  casosInfracionais?: CasoLike[] | null;
  casoInfracionalAtual?: CasoLike | null;
}) => {
  const casoAtual =
    normalizarCasoInfracional(
      input.casoInfracionalAtual ?? obterCasoAtual(input.casosInfracionais),
    ) ?? null;
  const descricaoCaso = obterTituloCaso(casoAtual);

  return {
    casoAtual,
    descricao: descricaoCaso ?? trimOrNull(input.atoInfracionalAtual) ?? null,
    numeroProcesso:
      trimOrNull(casoAtual?.numeroProcesso) ??
      trimOrNull(input.atoInfracionalProcesso) ??
      trimOrNull(input.numeroProcesso) ??
      null,
    anoFato: casoAtual?.anoFato ?? input.atoInfracionalAno ?? null,
    comarca: trimOrNull(casoAtual?.comarca) ?? null,
    narrativa: trimOrNull(casoAtual?.narrativa) ?? null,
    tipificacoes: casoAtual?.tipificacoes ?? [],
  };
};

export const resumirCasosHistoricos = (casos?: CasoLike[] | null) =>
  (casos ?? []).map((caso) => {
    const normalizado = normalizarCasoInfracional(caso);
    return {
      id: normalizado?.id ?? null,
      titulo: obterTituloCaso(normalizado),
      numeroProcesso: trimOrNull(normalizado?.numeroProcesso),
      anoFato: normalizado?.anoFato ?? null,
      comarca: trimOrNull(normalizado?.comarca),
      narrativa: trimOrNull(normalizado?.narrativa),
      tipificacoes: normalizado?.tipificacoes ?? [],
    };
  });
