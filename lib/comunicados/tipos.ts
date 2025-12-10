export type TipoCIOption = {
  value: string;
  label: string;
};

export const TIPO_CI_OPTIONS: TipoCIOption[] = [
  { value: "DISCIPLINAR", label: "Disciplinar" },
  { value: "CONFLITO", label: "Conflito" },
  { value: "AUTORIZACAO_ESPECIAL", label: "Autorizacao de item excepcional" },
  { value: "SAUDE_CONFIDENCIAL", label: "Saude Confidencial" },
  { value: "RISCO_SUICIDIO", label: "Risco de Suicidio" },
  { value: "PERFIL_MAPEADO", label: "Protecao por ato infracional" },
  { value: "FUGA", label: "Fuga / Plano de Fuga / Evas\u00e3o" },
  { value: "AMEACA_SERVIDOR", label: "Ameaca contra servidor" },
  { value: "AGRESSAO", label: "Agressao" },
  { value: "OUTROS", label: "Outros" },
];

export const TIPOS_CONFLITO_AUTOMATICO = new Set(["CONFLITO"]);

export const TIPOS_ALERTA_AUTOMATICO = new Set([
  "SAUDE_CONFIDENCIAL",
  "DISCIPLINAR",
  "RISCO_SUICIDIO",
  "PERFIL_MAPEADO",
  "SAUDE_CONFIDENCIAL",
  "FUGA",
  "AGRESSAO",
  "AMEACA_SERVIDOR",
  "AUTORIZACAO_ESPECIAL",
]);

export const TIPO_CI_MAP = new Map(
  TIPO_CI_OPTIONS.map((option) => [option.value, option.label])
);
