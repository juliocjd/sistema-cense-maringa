import nodemailer from "nodemailer";

interface AgenteContato {
  nome: string;
  email: string;
}

interface NotificacaoConflitoPayload {
  contexto: "ALOCACAO" | "GRUPO" | "CONFLITO_INTERNO";
  adolescente: {
    id: string;
    nomeCompleto: string;
    agente?: AgenteContato | null;
  };
  adversario: {
    id: string;
    nomeCompleto: string;
    agente?: AgenteContato | null;
  };
  mensagem: string;
  nivelConflito?: string;
  link?: string;
}

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

const montarCorpo = (payload: NotificacaoConflitoPayload) => {
  return [
    `Contexto: ${payload.contexto}`,
    "Adolescente:",
    `  - ${payload.adolescente.nomeCompleto} (id: ${payload.adolescente.id})`,
    payload.adolescente.agente
      ? `  - Atendente: ${payload.adolescente.agente.nome} <${payload.adolescente.agente.email}>`
      : "  - Atendente: nao cadastrado",
    "Adversario:",
    `  - ${payload.adversario.nomeCompleto} (id: ${payload.adversario.id})`,
    payload.adversario.agente
      ? `  - Atendente: ${payload.adversario.agente.nome} <${payload.adversario.agente.email}>`
      : "  - Atendente: nao cadastrado",
    "",
    `Nivel de risco: ${payload.nivelConflito ?? "ATIVO"}`,
    payload.link
      ? `Link para monitoramento: ${payload.link}`
      : "Link para monitoramento nao disponivel",
    payload.mensagem,
  ].join("\n");
};

export async function notificarAgentesSobreConflito(
  payload: NotificacaoConflitoPayload
) {
  const destinatarios = [
    payload.adolescente.agente?.email,
    payload.adversario.agente?.email,
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index) as string[];

  if (!destinatarios.length) {
    return;
  }

  const subject = `[CENSE] Conflito ${payload.nivelConflito ?? "ATIVO"} (${payload.contexto})`;
  const body = montarCorpo(payload);

  const transporter = buildTransporter();
  if (!transporter) {
    console.log(
      "[notificacao] Conflito detectado",
      { destinatarios, subject, body },
      "Sem SMTP configurado"
    );
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "noreply@cense.pr.gov.br",
    to: destinatarios.join(","),
    subject,
    text: body,
  });
}
