import { prisma } from "@/lib/prisma";

type TemplateVariables = Record<string, string | number | boolean>;

/**
 * Substitui variáveis no template usando a sintaxe {{variavel}}
 */
export function substituirVariaveis(
  texto: string,
  variaveis: TemplateVariables
): string {
  let resultado = texto;

  for (const [chave, valor] of Object.entries(variaveis)) {
    const regex = new RegExp(`{{\\s*${chave}\\s*}}`, "g");
    resultado = resultado.replace(regex, String(valor));
  }

  return resultado;
}

/**
 * Busca template por nome e preenche com variáveis
 */
export async function obterTemplatePreenchido(
  nomeTemplate: string,
  variaveis: TemplateVariables
): Promise<{ assunto: string; corpo: string } | null> {
  const template = await prisma.templateEmail.findFirst({
    where: {
      nome: nomeTemplate,
      ativo: true,
    },
  });

  if (!template) {
    return null;
  }

  return {
    assunto: substituirVariaveis(template.assunto, variaveis),
    corpo: substituirVariaveis(template.corpo, variaveis),
  };
}

/**
 * Templates padrão disponíveis
 */
export const TEMPLATES = {
  ORIENTACOES_VISITA: "ORIENTACOES_VISITA",
  VISITANTE_CADASTRADO: "VISITANTE_CADASTRADO",
  VISITA_CONFIRMADA: "VISITA_CONFIRMADA",
  ALERTA_BLOQUEIO: "ALERTA_BLOQUEIO",
} as const;
