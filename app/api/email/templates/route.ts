import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

const createTemplateSchema = z.object({
  nome: z.string().min(3).max(100),
  assunto: z.string().min(3).max(200),
  corpo: z.string().min(10),
  ativo: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const ativo = searchParams.get("ativo");

    const where: any = {};
    if (ativo === "true") {
      where.ativo = true;
    } else if (ativo === "false") {
      where.ativo = false;
    }

    const templates = await prisma.templateEmail.findMany({
      where,
      orderBy: { nome: "asc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Erro ao buscar templates:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar templates",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;

  try {
    const body = createTemplateSchema.parse(await request.json());

    // Verificar se já existe template com mesmo nome
    const existente = await prisma.templateEmail.findFirst({
      where: { nome: body.nome },
    });

    if (existente) {
      return NextResponse.json(
        { erro: "Já existe um template com este nome" },
        { status: 409 }
      );
    }

    const template = await prisma.$transaction(async (tx) => {
      const novoTemplate = await tx.templateEmail.create({
        data: body,
      });

      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "TEMPLATE_EMAIL_CRIAR",
          tabelaAfetada: "templates_email",
          registroIdAfetado: novoTemplate.id,
          detalhesAlteracao: { nome: body.nome },
          ipOrigem: ip,
        },
      });

      return novoTemplate;
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.flatten() },
        { status: 400 }
      );
    }

    console.error("Erro ao criar template:", error);
    return NextResponse.json(
      {
        erro: "Erro ao criar template",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
