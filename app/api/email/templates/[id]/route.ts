import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

const updateTemplateSchema = z.object({
  nome: z.string().min(3).max(100).optional(),
  assunto: z.string().min(3).max(200).optional(),
  corpo: z.string().min(10).optional(),
  ativo: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await params;

  try {
    const template = await prisma.templateEmail.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { erro: "Template não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Erro ao buscar template:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar template",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;
  const { id } = await params;

  try {
    const body = updateTemplateSchema.parse(await request.json());

    // Verificar se template existe
    const existente = await prisma.templateEmail.findUnique({
      where: { id },
    });

    if (!existente) {
      return NextResponse.json(
        { erro: "Template não encontrado" },
        { status: 404 }
      );
    }

    // Se alterando nome, verificar se não existe outro com mesmo nome
    if (body.nome && body.nome !== existente.nome) {
      const duplicado = await prisma.templateEmail.findFirst({
        where: { nome: body.nome, id: { not: id } },
      });

      if (duplicado) {
        return NextResponse.json(
          { erro: "Já existe outro template com este nome" },
          { status: 409 }
        );
      }
    }

    const template = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.templateEmail.update({
        where: { id },
        data: body,
      });

      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "TEMPLATE_EMAIL_ATUALIZAR",
          tabelaAfetada: "templates_email",
          registroIdAfetado: id,
          detalhesAlteracao: { nome: existente.nome },
          ipOrigem: ip,
        },
      });

      return atualizado;
    });

    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.flatten() },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar template:", error);
    return NextResponse.json(
      {
        erro: "Erro ao atualizar template",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;
  const { id } = await params;

  try {
    const template = await prisma.templateEmail.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { erro: "Template não encontrado" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.templateEmail.delete({
        where: { id },
      });

      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "TEMPLATE_EMAIL_REMOVER",
          tabelaAfetada: "templates_email",
          registroIdAfetado: id,
          detalhesAlteracao: { nome: template.nome },
          ipOrigem: ip,
        },
      });
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: "Template removido com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover template:", error);
    return NextResponse.json(
      {
        erro: "Erro ao remover template",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
