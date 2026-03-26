export type TipoInternacaoOperacional = "PROVISORIA" | "DEFINITIVA";

export type DestinacaoOperacionalCasa =
  | "PROVISORIA"
  | "DEFINITIVA"
  | "FASE_EXCLUSIVA"
  | "ABRIGAMENTO";

export type CasaConfiguracaoOperacional = {
  id?: string | null;
  nome?: string | null;
  numero?: number | null;
  isolada?: boolean | null;
  destinacaoOperacional?: string | null;
  faseExclusivaId?: string | null;
  faseExclusiva?: {
    id: string;
    nomeFase: string;
  } | null;
  prazoMaximoDias?: number | null;
  riscoMaximoPermitido?: number | null;
};

export const DESTINACAO_OPERACIONAL_LABEL: Record<
  DestinacaoOperacionalCasa,
  string
> = {
  PROVISORIA: "Internação provisória",
  DEFINITIVA: "Internação definitiva",
  FASE_EXCLUSIVA: "Casa de fase",
  ABRIGAMENTO: "Abrigamento",
};

const DESTINACOES_VALIDAS = new Set<DestinacaoOperacionalCasa>([
  "PROVISORIA",
  "DEFINITIVA",
  "FASE_EXCLUSIVA",
  "ABRIGAMENTO",
]);

export const destinacaoOperacionalUsaPrazo = (valor?: string | null) => {
  const destinacao = normalizarDestinacaoOperacionalCasa(valor);
  return destinacao === "PROVISORIA" || destinacao === "ABRIGAMENTO";
};

export const normalizarDestinacaoOperacionalCasa = (
  valor?: string | null,
): DestinacaoOperacionalCasa => {
  if (!valor) return "DEFINITIVA";
  const ajustado = valor.toUpperCase();
  return DESTINACOES_VALIDAS.has(ajustado as DestinacaoOperacionalCasa)
    ? (ajustado as DestinacaoOperacionalCasa)
    : "DEFINITIVA";
};

export const obterEtiquetaCasaOperacional = (
  casa: CasaConfiguracaoOperacional,
) => {
  const destinacao = normalizarDestinacaoOperacionalCasa(
    casa.destinacaoOperacional,
  );
  if (destinacao === "FASE_EXCLUSIVA") {
    return casa.faseExclusiva?.nomeFase ?? "Fase exclusiva";
  }
  if (destinacaoOperacionalUsaPrazo(destinacao)) {
    const prefixo =
      destinacao === "PROVISORIA" ? "Internação provisória" : "Abrigamento";
    return casa.prazoMaximoDias
      ? `${prefixo} (${casa.prazoMaximoDias} dias)`
      : prefixo;
  }
  return DESTINACAO_OPERACIONAL_LABEL[destinacao];
};

export const obterDescricaoCasaOperacional = (
  casa: CasaConfiguracaoOperacional,
) => {
  const destinacao = normalizarDestinacaoOperacionalCasa(
    casa.destinacaoOperacional,
  );
  if (destinacao === "PROVISORIA") {
    return casa.prazoMaximoDias
      ? `Uso para internação provisória com permanência máxima de ${casa.prazoMaximoDias} dia(s).`
      : "Uso preferencial para internação provisória.";
  }
  if (destinacao === "ABRIGAMENTO") {
    return casa.prazoMaximoDias
      ? `Uso para abrigamento com permanência máxima de ${casa.prazoMaximoDias} dia(s).`
      : "Uso para abrigamento.";
  }
  if (destinacao === "FASE_EXCLUSIVA") {
    const partes = [
      casa.faseExclusiva?.nomeFase
        ? `Reservada para ${casa.faseExclusiva.nomeFase}.`
        : "Reservada para fase exclusiva.",
    ];
    if (typeof casa.riscoMaximoPermitido === "number") {
      partes.push(`Aceita risco ate nivel ${casa.riscoMaximoPermitido}.`);
    }
    return partes.join(" ");
  }
  return "Uso geral para internacao definitiva.";
};

export const casaCompativelComInternacao = ({
  casa,
  tipoInternacao,
  faseInternacaoAtualId,
  nivelRisco,
}: {
  casa: CasaConfiguracaoOperacional;
  tipoInternacao: TipoInternacaoOperacional | null;
  faseInternacaoAtualId?: string | null;
  nivelRisco?: number | null;
}) => {
  if (!tipoInternacao) {
    return true;
  }

  const destinacao = normalizarDestinacaoOperacionalCasa(
    casa.destinacaoOperacional,
  );

  if (tipoInternacao === "PROVISORIA") {
    return destinacao === "PROVISORIA";
  }

  if (destinacao === "DEFINITIVA") {
    return true;
  }

  if (destinacao !== "FASE_EXCLUSIVA") {
    return false;
  }

  if (!casa.faseExclusivaId || !faseInternacaoAtualId) {
    return false;
  }

  if (casa.faseExclusivaId !== faseInternacaoAtualId) {
    return false;
  }

  if (
    typeof casa.riscoMaximoPermitido === "number" &&
    typeof nivelRisco === "number" &&
    nivelRisco > casa.riscoMaximoPermitido
  ) {
    return false;
  }

  return true;
};

export const filtrarCasasCompativeis = <T extends CasaConfiguracaoOperacional>({
  casas,
  tipoInternacao,
  faseInternacaoAtualId,
}: {
  casas: T[];
  tipoInternacao: TipoInternacaoOperacional | null;
  faseInternacaoAtualId?: string | null;
}) =>
  casas.filter((casa) =>
    casaCompativelComInternacao({
      casa,
      tipoInternacao,
      faseInternacaoAtualId,
    }),
  );

export const filtrarSugestoesCompativeis = <
  T extends {
    casaId?: string | null;
    casaNumero?: number | null;
    nivel?: number | null;
  },
>({
  sugestoes,
  casas,
  tipoInternacao,
  faseInternacaoAtualId,
}: {
  sugestoes: T[];
  casas: CasaConfiguracaoOperacional[];
  tipoInternacao: TipoInternacaoOperacional | null;
  faseInternacaoAtualId?: string | null;
}) => {
  if (!tipoInternacao) {
    return sugestoes;
  }

  return sugestoes.filter((sugestao) => {
    const casa =
      casas.find((item) => item.id && item.id === sugestao.casaId) ??
      casas.find(
        (item) =>
          typeof item.numero === "number" &&
          item.numero === sugestao.casaNumero,
      );

    if (!casa) {
      return false;
    }

    return casaCompativelComInternacao({
      casa,
      tipoInternacao,
      faseInternacaoAtualId,
      nivelRisco: sugestao.nivel ?? null,
    });
  });
};

export const obterCasaFaseExclusiva = <T extends CasaConfiguracaoOperacional>(
  casas: T[],
  faseInternacaoAtualId?: string | null,
) => {
  const casasExclusivas = casas.filter(
    (casa) =>
      normalizarDestinacaoOperacionalCasa(casa.destinacaoOperacional) ===
      "FASE_EXCLUSIVA",
  );

  if (!faseInternacaoAtualId) {
    return casasExclusivas[0] ?? null;
  }

  return (
    casasExclusivas.find(
      (casa) => casa.faseExclusivaId === faseInternacaoAtualId,
    ) ??
    casasExclusivas[0] ??
    null
  );
};
