import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({
  id: z.string().uuid("Id do agente invalido"),
});

const updateSchema = z
  .object({
    nome: z.string().min(3).optional(),
    atividade: z.string().optional().nullable(),
    email: z.string().email().optional(),
    telefone: z.string().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo");

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const getIp = (request: NextRequest) =>
  request.headers.get("x-forwarded-for") ?? "unknown";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { erro: "Id do agente invalido" },
        { status: 400 }
      );
    }

    const agente = await prisma.agenteProfissional.findUnique({
      where: { id: parsedParams.data.id },
      include: {
        _count: { select: { adolescentesReferencia: true } },
      },
    });

    if (!agente) {
      return NextResponse.json(
        { erro: "Agente nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: agente.id,
      nome: agente.nome,
      atividade: agente.atividade,
      email: agente.email,
      telefone: agente.telefone,
      totalAdolescentes: agente._count?.adolescentesReferencia ?? 0,
      criadoEm: agente.criadoEm,
      atualizadoEm: agente.atualizadoEm,
    });
  } catch (error) {
    console.error("Erro ao buscar agente:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar agente", detalhes: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { erro: "Id do agente invalido" },
        { status: 400 }
      );
    }

    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);
    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operador = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true },
    });
    if (!operador) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 }
      );
    }

    const parsed = updateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: parsed.error.issues },
        { status: 400 }
      );
    }

    const agenteAtual = await prisma.agenteProfissional.findUnique({
      where: { id: parsedParams.data.id },
    });
    if (!agenteAtual) {
      return NextResponse.json(
        { erro: "Agente nao encontrado" },
        { status: 404 }
      );
    }

    if (parsed.data.email) {
      const existente = await prisma.agenteProfissional.findFirst({
        where: {
          email: { equals: parsed.data.email, mode: "insensitive" },
          id: { not: agenteAtual.id },
        },
      });
      if (existente) {
        return NextResponse.json(
          { erro: "Outro agente ja utiliza este email" },
          { status: 409 }
        );
      }
    }

    const atualizado = await prisma.agenteProfissional.update({
      where: { id: agenteAtual.id },
      data: parsed.data,
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "AGENTE_ATUALIZAR",
        tabelaAfetada: "agentes_profissionais",
        registroIdAfetado: atualizado.id,
        detalhesAlteracao: parsed.data,
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      id: atualizado.id,
      nome: atualizado.nome,
      atividade: atualizado.atividade,
      email: atualizado.email,
      telefone: atualizado.telefone,
    });
  } catch (error) {
    console.error("Erro ao atualizar agente:", error);
    return NextResponse.json(
      { erro: "Erro ao atualizar agente", detalhes: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { erro: "Id do agente invalido" },
        { status: 400 }
      );
    }

    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);
    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operador = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true },
    });
    if (!operador) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    const agente = await prisma.agenteProfissional.findUnique({
      where: { id: parsedParams.data.id },
      include: {
        _count: { select: { adolescentesReferencia: true } },
      },
    });
    if (!agente) {
      return NextResponse.json(
        { erro: "Agente nao encontrado" },
        { status: 404 }
      );
    }

    if ((agente._count?.adolescentesReferencia ?? 0) > 0) {
      return NextResponse.json(
        {
          erro: "Nao e possivel remover agente com adolescentes vinculados",
          total: agente._count.adolescentesReferencia,
        },
        { status: 409 }
      );
    }

    await prisma.agenteProfissional.delete({ where: { id: agente.id } });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "AGENTE_REMOVER",
        tabelaAfetada: "agentes_profissionais",
        registroIdAfetado: agente.id,
        detalhesAlteracao: {
          nome: agente.nome,
          email: agente.email,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({ sucesso: true, mensagem: "Agente removido" });
  } catch (error) {
    console.error("Erro ao remover agente:", error);
    return NextResponse.json(
      { erro: "Erro ao remover agente", detalhes: (error as Error).message },
      { status: 500 }
    );
  }
}
