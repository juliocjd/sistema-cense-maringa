import nodemailer from "nodemailer";

interface TecnicoContato {
  nome: string;
  email: string;
}

interface PessoaNotificada {
  id: string;
  nomeCompleto: string;
  tecnico?: TecnicoContato | null;
  alojamento?: string | null;
}

interface DetalhesConflito {
  tipo?: string | null;
  dataRegistro?: string | Date | null;
  origem?: string | null;
  descricao?: string | null;
  assuntoPersonalizado?: string | null;
}

interface NotificacaoConflitoPayload {
  contexto: "ALOCACAO" | "GRUPO" | "CONFLITO_INTERNO";
  adolescente: PessoaNotificada;
  adversario: PessoaNotificada;
  mensagem: string;
  nivelConflito?: string;
  link?: string;
  detalhes?: DetalhesConflito;
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

const formatarData = (valor?: string | Date | null) => {
  if (!valor) return "Nao informado";
  const data = typeof valor === "string" ? new Date(valor) : valor;
  if (Number.isNaN(data.getTime())) return "Nao informado";
  return data.toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  });
};

const montarCorpo = (payload: NotificacaoConflitoPayload) => {
  const detalhes = payload.detalhes ?? {};
  const linkTexto = payload.link
    ? `<a href="${payload.link}" style="color:#2563eb" target="_blank" rel="noopener noreferrer">${payload.link}</a>`
    : "Link nao disponivel";

  const tabelaParticipantes = `
    <tr>
      <td colspan="2" style="padding:8px 0;font-weight:600;color:#111827">Adolescente</td>
      <td colspan="2" style="padding:8px 0;font-weight:600;color:#111827">Adversario</td>
    </tr>
    <tr>
      <td style="padding:4px 0;color:#374151;">Nome:</td>
      <td style="padding:4px 12px;color:#111827;">${payload.adolescente.nomeCompleto}</td>
      <td style="padding:4px 0;color:#374151;">Nome:</td>
      <td style="padding:4px 12px;color:#111827;">${payload.adversario.nomeCompleto}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;color:#374151;">Casa/Alojamento:</td>
      <td style="padding:4px 12px;color:#111827;">${payload.adolescente.alojamento ?? "Nao informado"}</td>
      <td style="padding:4px 0;color:#374151;">Casa/Alojamento:</td>
      <td style="padding:4px 12px;color:#111827;">${payload.adversario.alojamento ?? "Nao informado"}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;color:#374151;">Tecnico referencia:</td>
      <td style="padding:4px 12px;color:#111827;">${
        payload.adolescente.tecnico
          ? `${payload.adolescente.tecnico.nome} (${payload.adolescente.tecnico.email})`
          : "Nao informado"
      }</td>
      <td style="padding:4px 0;color:#374151;">Tecnico referencia:</td>
      <td style="padding:4px 12px;color:#111827;">${
        payload.adversario.tecnico
          ? `${payload.adversario.tecnico.nome} (${payload.adversario.tecnico.email})`
          : "Nao informado"
      }</td>
    </tr>`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color:#111827; line-height:1.5;">
      <p style="font-weight:600;margin-bottom:8px;">${payload.mensagem}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${tabelaParticipantes}
      </table>
      <div style="margin:12px 0;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
        <p style="margin:4px 0;"><strong>Tipo de conflito:</strong> ${detalhes.tipo ?? "Nao informado"}</p>
        <p style="margin:4px 0;"><strong>Data do registro:</strong> ${formatarData(detalhes.dataRegistro)}</p>
        <p style="margin:4px 0;"><strong>CI de origem:</strong> ${detalhes.origem ?? "Nao informada"}</p>
        <p style="margin:4px 0;"><strong>Status:</strong> ${payload.nivelConflito ?? "ATIVO"}</p>
        <p style="margin:4px 0;"><strong>Observacoes:</strong> ${
          detalhes.descricao?.trim() || "Nao informado"
        }</p>
      </div>
      <p style="margin:12px 0;">Monitoramento: ${linkTexto}</p>
    </div>
  `;

  const texto = [
    payload.mensagem,
    "",
    "Adolescente:",
    `  - Nome: ${payload.adolescente.nomeCompleto}`,
    `  - Casa/Alojamento: ${payload.adolescente.alojamento ?? "Nao informado"}`,
    `  - Tecnico referencia: ${
      payload.adolescente.tecnico
        ? `${payload.adolescente.tecnico.nome} (${payload.adolescente.tecnico.email})`
        : "Nao informado"
    }`,
    "Adversario:",
    `  - Nome: ${payload.adversario.nomeCompleto}`,
    `  - Casa/Alojamento: ${payload.adversario.alojamento ?? "Nao informado"}`,
    `  - Tecnico referencia: ${
      payload.adversario.tecnico
        ? `${payload.adversario.tecnico.nome} (${payload.adversario.tecnico.email})`
        : "Nao informado"
    }`,
    "",
    `Tipo de conflito: ${detalhes.tipo ?? "Nao informado"}`,
    `Data do registro: ${formatarData(detalhes.dataRegistro)}`,
    `CI de origem: ${detalhes.origem ?? "Nao informada"}`,
    `Status: ${payload.nivelConflito ?? "ATIVO"}`,
    `Observacoes: ${detalhes.descricao?.trim() || "Nao informado"}`,
    payload.link ? `Monitoramento: ${payload.link}` : "Link nao disponivel",
  ].join("\n");

  return { texto, html };
};

export async function notificarTecnicosSobreConflito(
  payload: NotificacaoConflitoPayload
) {
  const destinatarios = [
    payload.adolescente.tecnico?.email,
    payload.adversario.tecnico?.email,
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index) as string[];

  if (!destinatarios.length) {
    return;
  }

  const assuntoPadrao = `Conflito entre ${payload.adolescente.nomeCompleto} e ${payload.adversario.nomeCompleto}`;
  const subject =
    payload.detalhes?.assuntoPersonalizado ??
    `[CENSE] ${assuntoPadrao}`;
  const corpo = montarCorpo(payload);

  const transporter = buildTransporter();
  if (!transporter) {
    console.log(
      "[notificacao] Conflito detectado",
      { destinatarios, subject, corpo },
      "Sem SMTP configurado"
    );
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "noreply@cense.pr.gov.br",
    to: destinatarios.join(","),
    subject,
    text: corpo.texto,
    html: corpo.html,
  });
}
