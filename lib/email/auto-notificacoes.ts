import { enviarEmail } from "./sender";
import { obterTemplatePreenchido, TEMPLATES } from "./templates";

/**
 * Envia e-mail de orientações automaticamente quando visitante é cadastrado
 */
export async function enviarOrientacoesVisitante(
  visitanteId: string,
  nomeVisitante: string,
  emailVisitante: string
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const templatePreenchido = await obterTemplatePreenchido(
      TEMPLATES.ORIENTACOES_VISITA,
      {
        nome: nomeVisitante,
      }
    );

    if (!templatePreenchido) {
      return {
        sucesso: false,
        erro: "Template de orientações não encontrado",
      };
    }

    const resultado = await enviarEmail(
      visitanteId,
      TEMPLATES.ORIENTACOES_VISITA,
      templatePreenchido.assunto,
      templatePreenchido.corpo,
      emailVisitante
    );

    return {
      sucesso: resultado.sucesso,
      erro: resultado.erro,
    };
  } catch (error) {
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : "Erro ao enviar e-mail",
    };
  }
}

/**
 * Envia e-mail customizado para visitante
 */
export async function enviarEmailCustomVisitante(
  visitanteId: string,
  emailVisitante: string,
  assunto: string,
  mensagem: string
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const resultado = await enviarEmail(
      visitanteId,
      "CUSTOM",
      assunto,
      mensagem,
      emailVisitante
    );

    return {
      sucesso: resultado.sucesso,
      erro: resultado.erro,
    };
  } catch (error) {
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : "Erro ao enviar e-mail",
    };
  }
}
