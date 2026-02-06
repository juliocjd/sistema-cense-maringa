import nodemailer from "nodemailer";

type TecnicoContato = {
  nome: string;
  email: string;
};

type AdolescenteResumo = {
  id: string;
  nome: string;
  numeroSms?: string | null;
  tecnicoNome?: string | null;
};

type NotificacaoComunicadoPayload = {
  tecnico: TecnicoContato;
  adolescentes: AdolescenteResumo[];
  comunicado: {
    id: string;
    numero: number;
    ano: number;
    tipo: string;
    dataFato: string;
    resumo: string;
  };
  geracao: {
    conflitoSolicitado: boolean;
    alertaSolicitado: boolean;
    conflitosGerados: number;
    ocorrenciasGeradas: number;
    alertasGerados: number;
  };
  resumoConflito?: string | null;
  link?: string | null;
};

const buildTransporter = () => {
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
};

const formatarCorpoHTML = (corpo: string): string => {
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
        <p>Este e um email automatico do Sistema CENSE Maringa.</p>
        <p>Em caso de duvidas, entre em contato com a unidade.</p>
      </div>
    </div>
  `;
};

const montarCorpo = (payload: NotificacaoComunicadoPayload) => {
  const { comunicado, geracao, adolescentes, link } = payload;
  const listaAdolescentes = adolescentes.length
    ? adolescentes
        .map(
          (item) =>
            `- ${item.nome} (SMS: ${item.numeroSms ?? "Nao informado"}) - Tecnico de referencia: ${item.tecnicoNome ?? "Nao informado"}`
        )
        .join("\n")
    : "- Nenhum adolescente informado";
  const resumoConflito = payload.resumoConflito
    ? `- ${payload.resumoConflito}`
    : "- Resumo do conflito nao disponivel";

  const conflitosTexto = geracao.conflitoSolicitado
    ? `${geracao.conflitosGerados} novo(s)`
    : "nao solicitado";
  const ocorrenciasTexto = geracao.conflitoSolicitado
    ? `${geracao.ocorrenciasGeradas} ocorrencia(s)`
    : "nao aplicavel";
  const alertasTexto = geracao.alertaSolicitado
    ? `${geracao.alertasGerados} alerta(s)`
    : "nao solicitado";

  const texto = [
    "Comunicado interno registrado.",
    "",
    `CI: ${comunicado.numero}/${comunicado.ano}`,
    `Tipo: ${comunicado.tipo}`,
    `Data do fato: ${comunicado.dataFato}`,
    "",
    "Adolescentes envolvidos:",
    listaAdolescentes,
    "",
    "Resumo:",
    resumoConflito,
    "",
    "Resumo do CI:",
    comunicado.resumo.trim(),
    "",
    "Geracao automatica:",
    `- Conflitos: ${conflitosTexto}`,
    `- Ocorrencias registradas: ${ocorrenciasTexto}`,
    `- Alertas: ${alertasTexto}`,
    "",
    link ? `Link para o CI: ${link}` : "Link para o CI: nao disponivel",
  ].join("\n");

  return { texto, html: formatarCorpoHTML(texto) };
};

export async function notificarTecnicoSobreComunicado(
  payload: NotificacaoComunicadoPayload
): Promise<{ sucesso: boolean; erro?: string }> {
  const transporter = buildTransporter();

  if (!transporter) {
    return { sucesso: false, erro: "SMTP nao configurado" };
  }

  const assunto = `[CENSE] CI ${payload.comunicado.numero}/${payload.comunicado.ano} - ${payload.comunicado.tipo}`;
  const corpo = montarCorpo(payload);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "noreply@cense.pr.gov.br",
      to: payload.tecnico.email,
      subject: assunto,
      text: corpo.texto,
      html: corpo.html,
    });
    return { sucesso: true };
  } catch (error) {
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : "Erro ao enviar email",
    };
  }
}
