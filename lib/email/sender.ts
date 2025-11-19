import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

type EmailConfig = {
  destinatario: string;
  assunto: string;
  corpo: string;
};

/**
 * Cria transporter do nodemailer com configurações do ambiente
 */
function buildTransporter() {
  if (!process.env.EMAIL_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: process.env.EMAIL_SECURE === "true",
    auth:
      process.env.EMAIL_USER && process.env.EMAIL_PASSWORD
        ? {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          }
        : undefined,
  });
}

/**
 * Formata o corpo do e-mail em HTML
 */
function formatarCorpoHTML(corpo: string): string {
  // Converte quebras de linha em <br>
  const corpoHTML = corpo
    .split("\n")
    .map((linha) => linha.trim())
    .join("<br>");

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color:#111827; line-height:1.6; max-width:600px; margin:0 auto;">
      <div style="background-color:#f9fafb; padding:20px; border-radius:8px; border:1px solid #e5e7eb;">
        ${corpoHTML}
      </div>
      <div style="margin-top:20px; padding-top:20px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:12px;">
        <p>Este é um e-mail automático do Sistema CENSE Maringá.</p>
        <p>Em caso de dúvidas, entre em contato com a unidade.</p>
      </div>
    </div>
  `;
}

/**
 * Envia e-mail real usando nodemailer
 */
async function enviarEmailReal(config: EmailConfig): Promise<boolean> {
  const transporter = buildTransporter();

  if (!transporter) {
    console.warn("⚠️ SMTP não configurado. E-mail não será enviado:");
    console.log("Para:", config.destinatario);
    console.log("Assunto:", config.assunto);
    console.log("Corpo:", config.corpo.substring(0, 100) + "...");
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "noreply@cense.pr.gov.br",
      to: config.destinatario,
      subject: config.assunto,
      text: config.corpo,
      html: formatarCorpoHTML(config.corpo),
    });

    console.log("✅ E-mail enviado com sucesso para:", config.destinatario);
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar e-mail:", error);
    throw error;
  }
}

/**
 * Envia e-mail e registra notificação no banco
 */
export async function enviarEmail(
  visitanteId: string,
  tipoNotificacao: string,
  assunto: string,
  mensagem: string,
  emailDestinatario: string
): Promise<{ sucesso: boolean; notificacaoId: string | null; erro?: string }> {
  try {
    // Criar registro de notificação
    const notificacao = await prisma.notificacaoVisitante.create({
      data: {
        visitanteId,
        tipoNotificacao,
        assunto,
        mensagem,
        emailDestinatario,
        statusEnvio: "PENDENTE",
      },
    });

    // Tentar enviar e-mail
    try {
      const sucesso = await enviarEmailReal({
        destinatario: emailDestinatario,
        assunto,
        corpo: mensagem,
      });

      if (sucesso) {
        // Atualizar status para ENVIADO
        await prisma.notificacaoVisitante.update({
          where: { id: notificacao.id },
          data: {
            statusEnvio: "ENVIADO",
            dataEnvio: new Date(),
          },
        });

        return {
          sucesso: true,
          notificacaoId: notificacao.id,
        };
      } else {
        // Atualizar status para FALHA
        await prisma.notificacaoVisitante.update({
          where: { id: notificacao.id },
          data: {
            statusEnvio: "FALHA",
            erroEnvio: "Falha no envio do e-mail",
          },
        });

        return {
          sucesso: false,
          notificacaoId: notificacao.id,
          erro: "Falha no envio do e-mail",
        };
      }
    } catch (erroEnvio) {
      // Atualizar status para ERRO
      const mensagemErro =
        erroEnvio instanceof Error ? erroEnvio.message : "Erro desconhecido";

      await prisma.notificacaoVisitante.update({
        where: { id: notificacao.id },
        data: {
          statusEnvio: "ERRO",
          erroEnvio: mensagemErro,
        },
      });

      return {
        sucesso: false,
        notificacaoId: notificacao.id,
        erro: mensagemErro,
      };
    }
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    return {
      sucesso: false,
      notificacaoId: null,
      erro: error instanceof Error ? error.message : "Erro ao criar notificação",
    };
  }
}

/**
 * Reenvia e-mail que falhou
 */
export async function reenviarEmail(
  notificacaoId: string
): Promise<{ sucesso: boolean; erro?: string }> {
  const notificacao = await prisma.notificacaoVisitante.findUnique({
    where: { id: notificacaoId },
  });

  if (!notificacao) {
    return { sucesso: false, erro: "Notificação não encontrada" };
  }

  if (notificacao.statusEnvio === "ENVIADO") {
    return { sucesso: false, erro: "E-mail já foi enviado com sucesso" };
  }

  try {
    const sucesso = await enviarEmailReal({
      destinatario: notificacao.emailDestinatario,
      assunto: notificacao.assunto,
      corpo: notificacao.mensagem,
    });

    if (sucesso) {
      await prisma.notificacaoVisitante.update({
        where: { id: notificacaoId },
        data: {
          statusEnvio: "ENVIADO",
          dataEnvio: new Date(),
          erroEnvio: null,
        },
      });

      return { sucesso: true };
    } else {
      await prisma.notificacaoVisitante.update({
        where: { id: notificacaoId },
        data: {
          statusEnvio: "FALHA",
          erroEnvio: "Falha no reenvio",
        },
      });

      return { sucesso: false, erro: "Falha no reenvio" };
    }
  } catch (error) {
    const mensagemErro =
      error instanceof Error ? error.message : "Erro desconhecido";

    await prisma.notificacaoVisitante.update({
      where: { id: notificacaoId },
      data: {
        statusEnvio: "ERRO",
        erroEnvio: mensagemErro,
      },
    });

    return { sucesso: false, erro: mensagemErro };
  }
}
