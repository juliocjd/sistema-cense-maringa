export type TipoCIOption = {
  value: string;
  label: string;
};

export const TIPO_CI_OPTIONS: TipoCIOption[] = [
  { value: "DISCIPLINAR", label: "Disciplinar" },
  { value: "CONFLITO", label: "Conflito" },
  { value: "AUTORIZACAO_ESPECIAL", label: "Autorizacao Especial" },
  { value: "SAUDE", label: "Saude" },
  { value: "RISCO_SUICIDIO", label: "Risco de Suicidio" },
  { value: "PERFIL_MAPEADO", label: "Perfil Mapeado" },
  { value: "SAUDE_CONFIDENCIAL", label: "Saude Confidencial" },
  { value: "FUGA", label: "Fuga / Plano de fuga" },
  { value: "AGRESSAO", label: "Agressao" },
  { value: "OUTROS", label: "Outros" },
];

export const TIPOS_CONFLITO_AUTOMATICO = new Set(["CONFLITO"]);

export const TIPOS_ALERTA_AUTOMATICO = new Set([
  "SAUDE",
  "DISCIPLINAR",
  "RISCO_SUICIDIO",
  "PERFIL_MAPEADO",
  "SAUDE_CONFIDENCIAL",
  "FUGA",
  "AGRESSAO",
  "AUTORIZACAO_ESPECIAL",
]);

export const TIPO_CI_MAP = new Map(
  TIPO_CI_OPTIONS.map((option) => [option.value, option.label])
);
