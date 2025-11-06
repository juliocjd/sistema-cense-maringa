import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const paramsSchema = z.object({
  id: z.string().uuid("Id da faccao invalido"),
});

const updateSchema = z
  .object({
    nomeFaccao: z.string().min(2).optional(),
    descricao: z.string().max(1000).optional().nullable(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "Informe ao menos um campo para atualizar"
  );

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const getIp = (req: NextRequest) =>
  req.headers.get("x-forwarded-for") ?? "unknown";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { erro: "Id da faccao invalido" },
        { status: 400 }
      );
    }

    const incluirAdolescentes =
      request.nextUrl.searchParams.get("incluir_adolescentes") === "true";

    const faccao = await prisma.faccao.findUnique({
      where: { id: parsedParams.data.id },
      include: {
        adolescentes: incluirAdolescentes
          ? {
              select: {
                id: true,
                nomeCompleto: true,
                statusUnidade: true,
                alojamentoAtual: {
                  select: {
                    id: true,
                    numeroAlojamento: true,
                    ala: true,
                    casa: {
                      select: {
                        id: true,
                        nome: true,
                        numero: true,
                      },
                    },
                  },
                },
              },
            }
          : false,
        _count: true,
      },
    });

    if (!faccao) {
      return NextResponse.json(
        { erro: "Faccao nao encontrada" },
        { status: 404 }
      );
    }

    const adolescentes =
      incluirAdolescentes && Array.isArray((faccao as any).adolescentes)
        ? ((faccao as any).adolescentes as Array<{
            id: string;
            nomeCompleto: string;
            statusUnidade: string;
            alojamentoAtual: {
              id: string;
              numeroAlojamento: string | null;
              ala: string | null;
              casa: {
                id: string;
                nome: string;
                numero: number | null;
              } | null;
            } | null;
          }>)
        : [];

    return NextResponse.json({
      id: faccao.id,
      nomeFaccao: faccao.nomeFaccao,
      descricao: faccao.descricao,
      totalAdolescentes: faccao._count?.adolescentes ?? adolescentes.length,
      adolescentes:
        incluirAdolescentes
          ? adolescentes.map((adolescente) => ({
              id: adolescente.id,
              nomeCompleto: adolescente.nomeCompleto,
              statusUnidade: adolescente.statusUnidade,
              alojamento: adolescente.alojamentoAtual
                ? {
                    id: adolescente.alojamentoAtual.id,
                    numero: adolescente.alojamentoAtual.numeroAlojamento,
                    ala: adolescente.alojamentoAtual.ala,
                    casa: adolescente.alojamentoAtual.casa
                      ? {
                          id: adolescente.alojamentoAtual.casa.id,
                          nome: adolescente.alojamentoAtual.casa.nome,
                          numero: adolescente.alojamentoAtual.casa.numero,
                        }
                      : null,
                  }
                : null,
            }))
          : undefined,
    });
  } catch (error) {
    console.error("Erro ao buscar faccao:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar faccao",
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
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { erro: "Id da faccao invalido" },
        { status: 400 }
      );
    }
    const faccaoId = parsedParams.data.id;

    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 }
      );
    }

    const parsedBody = updateSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const faccaoExistente = await prisma.faccao.findUnique({
      where: { id: faccaoId },
      select: { id: true, nomeFaccao: true },
    });

    if (!faccaoExistente) {
      return NextResponse.json(
        { erro: "Faccao nao encontrada" },
        { status: 404 }
      );
    }

    if (
      parsedBody.data.nomeFaccao &&
      parsedBody.data.nomeFaccao !== faccaoExistente.nomeFaccao
    ) {
      const conflitoNome = await prisma.faccao.findUnique({
        where: { nomeFaccao: parsedBody.data.nomeFaccao },
        select: { id: true },
      });
      if (conflitoNome) {
        return NextResponse.json(
          { erro: "Ja existe faccao com este nome" },
          { status: 409 }
        );
      }
    }

    const faccaoAtualizada = await prisma.faccao.update({
      where: { id: faccaoId },
      data: {
        ...(parsedBody.data.nomeFaccao
          ? { nomeFaccao: parsedBody.data.nomeFaccao }
          : {}),
        ...(parsedBody.data.descricao !== undefined
          ? { descricao: parsedBody.data.descricao ?? null }
          : {}),
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "FACCAO_ATUALIZAR",
        tabelaAfetada: "faccoes",
        registroIdAfetado: faccaoAtualizada.id,
        detalhesAlteracao: parsedBody.data,
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      id: faccaoAtualizada.id,
      nomeFaccao: faccaoAtualizada.nomeFaccao,
      descricao: faccaoAtualizada.descricao,
      mensagem: "Faccao atualizada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao atualizar faccao:", error);
    return NextResponse.json(
      {
        erro: "Erro ao atualizar faccao",
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
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { erro: "Id da faccao invalido" },
        { status: 400 }
      );
    }
    const faccaoId = parsedParams.data.id;

    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    const faccao = await prisma.faccao.findUnique({
      where: { id: faccaoId },
      select: {
        id: true,
        nomeFaccao: true,
        _count: {
          select: { adolescentes: true },
        },
      },
    });

    if (!faccao) {
      return NextResponse.json(
        { erro: "Faccao nao encontrada" },
        { status: 404 }
      );
    }

    if (faccao._count.adolescentes > 0) {
      return NextResponse.json(
        {
          erro: "Nao e possivel remover faccao com adolescentes vinculados",
          totalAdolescentes: faccao._count.adolescentes,
        },
        { status: 409 }
      );
    }

    await prisma.faccao.delete({ where: { id: faccaoId } });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "FACCAO_REMOVER",
        tabelaAfetada: "faccoes",
        registroIdAfetado: faccaoId,
        detalhesAlteracao: {
          nomeFaccao: faccao.nomeFaccao,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: "Faccao removida com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover faccao:", error);
    return NextResponse.json(
      {
        erro: "Erro ao remover faccao",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
