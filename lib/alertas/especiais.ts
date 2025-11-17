export const ALERTAS_ESPECIAIS = {
  RISCO_SUICIDIO: {
    tipoAlerta: "RISCO_SUICIDIO",
    label: "Risco de suicidio",
    descricaoPadrao:
      "Alerta de risco de suicidio registrado no cadastro do adolescente.",
    nivelPadrao: "ALTO",
  },
  PERFIL_MAPEADO: {
    tipoAlerta: "PERFIL_MAPEADO",
    label: "Perfil mapeado (protecao)",
    descricaoPadrao:
      "Perfil mapeado pela inteligencia. Requer sigilo e protecao especial.",
    nivelPadrao: "ALTO",
  },
  SAUDE_CONFIDENCIAL: {
    tipoAlerta: "SAUDE_CONFIDENCIAL",
    label: "Alerta de saude confidencial",
    descricaoPadrao:
      "Condicao de saude confidencial que exige acompanhamento especializado.",
    nivelPadrao: "MEDIO",
  },
} as const;

export type AlertaEspecialTipo = keyof typeof ALERTAS_ESPECIAIS;

export const ALERTA_ESPECIAL_TIPOS = Object.keys(
  ALERTAS_ESPECIAIS
) as AlertaEspecialTipo[];

export const ALERTA_ESPECIAL_CODIGOS = ALERTA_ESPECIAL_TIPOS.map(
  (tipo) => ALERTAS_ESPECIAIS[tipo].tipoAlerta
);

export function mapearTipoEspecialPorCodigo(
  codigo?: string | null
): AlertaEspecialTipo | null {
  if (!codigo) return null;
  return (
    ALERTA_ESPECIAL_TIPOS.find(
      (tipo) => ALERTAS_ESPECIAIS[tipo].tipoAlerta === codigo
    ) ?? null
  );
}

export function obterMetaAlertaEspecial(tipo: AlertaEspecialTipo) {
  return ALERTAS_ESPECIAIS[tipo];
}

export function obterMetaAlertaEspecialPorCodigo(codigo?: string | null) {
  const tipo = mapearTipoEspecialPorCodigo(codigo);
  if (!tipo) return null;
  return ALERTAS_ESPECIAIS[tipo];
}

export function obterDescricaoPadrao(
  tipo: AlertaEspecialTipo,
  descricao?: string | null
) {
  const texto = descricao?.trim();
  if (texto && texto.length > 0) {
    return texto;
  }
  return ALERTAS_ESPECIAIS[tipo].descricaoPadrao;
}

export function ehTipoAlertaEspecial(tipo?: string | null): boolean {
  if (!tipo) return false;
  return ALERTA_ESPECIAL_TIPOS.some(
    (chave) => ALERTAS_ESPECIAIS[chave].tipoAlerta === tipo
  );
}
