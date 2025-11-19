import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import { enviarEmail } from "@/lib/email/sender";
import { obterTemplatePreenchido } from "@/lib/email/templates";

const enviarEmailSchema = z.object({
  visitanteId: z.string().uuid("visitanteId inválido"),
  templateNome: z.string().optional(),
  assuntoCustom: z.string().optional(),
  mensagemCustom: z.string().optional(),
  variaveis: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export async function POST(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;

  try {
    const body = enviarEmailSchema.parse(await request.json());
    const { visitanteId, templateNome, assuntoCustom, mensagemCustom, variaveis } = body;

    // Buscar visitante
    const visitante = await prisma.visitante.findUnique({
      where: { id: visitanteId },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
      },
    });

    if (!visitante) {
      return NextResponse.json(
        { erro: "Visitante não encontrado" },
        { status: 404 }
      );
    }

    if (!visitante.email) {
      return NextResponse.json(
        { erro: "Visitante não possui e-mail cadastrado" },
        { status: 400 }
      );
    }

    let assunto: string;
    let mensagem: string;
    let tipoNotificacao: string;

    // Se informou template, usar template
    if (templateNome) {
      const variaveisCompletas = {
        nome: visitante.nomeCompleto,
        ...variaveis,
      };

      const templatePreenchido = await obterTemplatePreenchido(
        templateNome,
        variaveisCompletas
      );

      if (!templatePreenchido) {
        return NextResponse.json(
          { erro: "Template não encontrado ou inativo" },
          { status: 404 }
        );
      }

      assunto = templatePreenchido.assunto;
      mensagem = templatePreenchido.corpo;
      tipoNotificacao = templateNome;
    } else if (assuntoCustom && mensagemCustom) {
      // Usar e-mail customizado
      assunto = assuntoCustom;
      mensagem = mensagemCustom;
      tipoNotificacao = "CUSTOM";
    } else {
      return NextResponse.json(
        {
          erro: "Informe templateNome ou (assuntoCustom e mensagemCustom)",
        },
        { status: 400 }
      );
    }

    // Enviar e-mail
    const resultado = await enviarEmail(
      visitanteId,
      tipoNotificacao,
      assunto,
      mensagem,
      visitante.email
    );

    if (resultado.sucesso) {
      // Log de auditoria
      await prisma.logAuditoria.create({
        data: {
          operadorId,
          acao: "EMAIL_ENVIAR",
          tabelaAfetada: "notificacoes_visitantes",
          registroIdAfetado: resultado.notificacaoId,
          detalhesAlteracao: {
            visitante: visitante.nomeCompleto,
            tipoNotificacao,
            email: visitante.email,
          },
          ipOrigem: ip,
        },
      });

      return NextResponse.json({
        sucesso: true,
        notificacaoId: resultado.notificacaoId,
        mensagem: "E-mail enviado com sucesso",
      });
    } else {
      return NextResponse.json(
        {
          erro: "Falha ao enviar e-mail",
          detalhes: resultado.erro,
          notificacaoId: resultado.notificacaoId,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.flatten() },
        { status: 400 }
      );
    }

    console.error("Erro ao enviar e-mail:", error);
    return NextResponse.json(
      {
        erro: "Erro ao enviar e-mail",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
