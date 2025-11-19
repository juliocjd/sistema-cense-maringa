import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import { reenviarEmail } from "@/lib/email/sender";
import { prisma } from "@/lib/prisma";

const reenviarEmailSchema = z.object({
  notificacaoId: z.string().uuid("notificacaoId inválido"),
});

export async function POST(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;

  try {
    const body = reenviarEmailSchema.parse(await request.json());
    const { notificacaoId } = body;

    // Buscar notificação
    const notificacao = await prisma.notificacaoVisitante.findUnique({
      where: { id: notificacaoId },
      include: {
        visitante: {
          select: {
            nomeCompleto: true,
          },
        },
      },
    });

    if (!notificacao) {
      return NextResponse.json(
        { erro: "Notificação não encontrada" },
        { status: 404 }
      );
    }

    // Reenviar e-mail
    const resultado = await reenviarEmail(notificacaoId);

    if (resultado.sucesso) {
      // Log de auditoria
      await prisma.logAuditoria.create({
        data: {
          operadorId,
          acao: "EMAIL_REENVIAR",
          tabelaAfetada: "notificacoes_visitantes",
          registroIdAfetado: notificacaoId,
          detalhesAlteracao: {
            visitante: notificacao.visitante.nomeCompleto,
            tipoNotificacao: notificacao.tipoNotificacao,
          },
          ipOrigem: ip,
        },
      });

      return NextResponse.json({
        sucesso: true,
        mensagem: "E-mail reenviado com sucesso",
      });
    } else {
      return NextResponse.json(
        {
          erro: "Falha ao reenviar e-mail",
          detalhes: resultado.erro,
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

    console.error("Erro ao reenviar e-mail:", error);
    return NextResponse.json(
      {
        erro: "Erro ao reenviar e-mail",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
