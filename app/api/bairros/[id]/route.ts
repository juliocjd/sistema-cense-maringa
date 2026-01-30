import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { resolveUserPermissions } from "@/lib/auth/resolve-permissions";

const paramsSchema = z.object({
  id: z.string().uuid("Id do bairro invalido"),
});

const updateSchema = z
  .object({
    nomeBairro: z.string().min(2).optional(),
    cidadeId: z.string().uuid().optional(),
    cidade: z.string().min(2).optional(),
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
        { erro: "Id do bairro invalido" },
        { status: 400 }
      );
    }

    const incluirAdolescentes =
      request.nextUrl.searchParams.get("incluir_adolescentes") === "true";

    const bairro = await prisma.bairro.findUnique({
      where: { id: parsedParams.data.id },
      include: {
        cidadeCatalogo: { select: { estado: true } },
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
        _count: {
          select: {
            adolescentes: true,
            bairrosConflitosA: true,
            bairrosConflitosB: true,
          },
        },
      },
    });

    if (!bairro) {
      return NextResponse.json(
        { erro: "Bairro nao encontrado" },
        { status: 404 }
      );
    }

    const adolescentes =
      incluirAdolescentes && Array.isArray((bairro as any).adolescentes)
        ? ((bairro as any).adolescentes as Array<{
            id: string;
            nomeCompleto: string;
            statusUnidade: string;
            alojamentoAtual: {
              id: string;
              numeroAlojamento: string | null;
              ala: string | null;
              casa: { id: string; nome: string; numero: number | null } | null;
            } | null;
          }>)
        : [];

    return NextResponse.json({
      id: bairro.id,
      nomeBairro: bairro.nomeBairro,
      cidade: bairro.cidade,
      cidadeId: (bairro as any).cidadeId ?? null,
      estado: (bairro as any).cidadeCatalogo?.estado ?? null,
      totalAdolescentes: bairro._count?.adolescentes ?? adolescentes.length,
      conflitosRegistrados:
        (bairro._count?.bairrosConflitosA ?? 0) +
        (bairro._count?.bairrosConflitosB ?? 0),
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
    console.error("Erro ao buscar bairro:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar bairro",
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
        { erro: "Id do bairro invalido" },
        { status: 400 }
      );
    }
    const bairroId = parsedParams.data.id;

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
      select: { id: true, funcaoRole: true },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    const permissoes = resolveUserPermissions(session, operadorExiste);
    if (!hasPermission(permissoes, PERMISSIONS.CONFLITOS_EXTERNOS_MANAGE)) {
      return NextResponse.json(
        { erro: "Sem permissao para gerenciar conflitos externos" },
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

    const bairroAtual = await prisma.bairro.findUnique({
      where: { id: bairroId },
      select: {
        id: true,
        nomeBairro: true,
        cidade: true,
        cidadeId: true,
      },
    });

    if (!bairroAtual) {
      return NextResponse.json(
        { erro: "Bairro nao encontrado" },
        { status: 404 }
      );
    }

    const novoNome = parsedBody.data.nomeBairro ?? bairroAtual.nomeBairro;
    let cidadeIdDestino = bairroAtual.cidadeId;
    let cidadeNomeDestino = bairroAtual.cidade;
    let estadoDestino: string | null = null;

    if (parsedBody.data.cidadeId) {
      const cidadeDb = await prisma.cidade.findUnique({
        where: { id: parsedBody.data.cidadeId },
        select: { id: true, nome: true, estado: true },
      });
      if (!cidadeDb) {
        return NextResponse.json(
          { erro: "Cidade nao encontrada" },
          { status: 400 }
        );
      }
      cidadeIdDestino = cidadeDb.id;
      cidadeNomeDestino = cidadeDb.nome;
      estadoDestino = cidadeDb.estado;
    } else if (parsedBody.data.cidade) {
      const nomeCidade = parsedBody.data.cidade.trim();
      const cidadesEncontradas = await prisma.cidade.findMany({
        where: { nome: { equals: nomeCidade, mode: "insensitive" } },
        select: { id: true, nome: true, estado: true },
        orderBy: { estado: "asc" },
      });
      if (cidadesEncontradas.length === 0) {
        return NextResponse.json(
          { erro: "Cidade nao encontrada. Cadastre a cidade antes." },
          { status: 400 }
        );
      }
      if (cidadesEncontradas.length > 1) {
        return NextResponse.json(
          { erro: "Cidade encontrada em mais de um estado. Selecione no catalogo." },
          { status: 400 }
        );
      }
      cidadeIdDestino = cidadesEncontradas[0].id;
      cidadeNomeDestino = cidadesEncontradas[0].nome;
      estadoDestino = cidadesEncontradas[0].estado;
    }

    if (
      novoNome.toLowerCase() !== bairroAtual.nomeBairro.toLowerCase() ||
      cidadeIdDestino !== bairroAtual.cidadeId
    ) {
      const conflito = await prisma.bairro.findFirst({
        where: {
          id: { not: bairroId },
          nomeBairro: {
            equals: novoNome,
            mode: "insensitive",
          },
          cidadeId: cidadeIdDestino,
        },
        select: { id: true },
      });

      if (conflito) {
        return NextResponse.json(
          { erro: "Ja existe bairro com este nome nesta cidade" },
          { status: 409 }
        );
      }
    }

    const bairroAtualizado = await prisma.bairro.update({
      where: { id: bairroId },
      data: {
        ...(parsedBody.data.nomeBairro
          ? { nomeBairro: parsedBody.data.nomeBairro }
          : {}),
        ...(cidadeIdDestino !== bairroAtual.cidadeId
          ? {
              cidade: cidadeNomeDestino,
              cidadeCatalogo: { connect: { id: cidadeIdDestino } },
            }
          : {}),
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "BAIRRO_ATUALIZAR",
        tabelaAfetada: "bairros",
        registroIdAfetado: bairroAtualizado.id,
        detalhesAlteracao: parsedBody.data,
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      id: bairroAtualizado.id,
      nomeBairro: bairroAtualizado.nomeBairro,
      cidade: bairroAtualizado.cidade,
      cidadeId: (bairroAtualizado as any).cidadeId ?? null,
      estado: estadoDestino,
      mensagem: "Bairro atualizado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao atualizar bairro:", error);
    return NextResponse.json(
      {
        erro: "Erro ao atualizar bairro",
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
        { erro: "Id do bairro invalido" },
        { status: 400 }
      );
    }
    const bairroId = parsedParams.data.id;

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
      select: { id: true, funcaoRole: true },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    const permissoes = resolveUserPermissions(session, operadorExiste);
    if (!hasPermission(permissoes, PERMISSIONS.CONFLITOS_EXTERNOS_MANAGE)) {
      return NextResponse.json(
        { erro: "Sem permissao para gerenciar conflitos externos" },
        { status: 403 }
      );
    }

    const bairro = await prisma.bairro.findUnique({
      where: { id: bairroId },
      include: {
        _count: {
          select: {
            adolescentes: true,
            bairrosConflitosA: true,
            bairrosConflitosB: true,
          },
        },
      },
    });

    if (!bairro) {
      return NextResponse.json(
        { erro: "Bairro nao encontrado" },
        { status: 404 }
      );
    }

    const conflitos =
      (bairro._count?.bairrosConflitosA ?? 0) +
      (bairro._count?.bairrosConflitosB ?? 0);

    if ((bairro._count?.adolescentes ?? 0) > 0 || conflitos > 0) {
      return NextResponse.json(
        {
          erro: "Nao e possivel remover bairro com vinculacoes ativas",
          totalAdolescentes: bairro._count?.adolescentes ?? 0,
          conflitos,
        },
        { status: 409 }
      );
    }

    await prisma.bairro.delete({ where: { id: bairroId } });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "BAIRRO_REMOVER",
        tabelaAfetada: "bairros",
        registroIdAfetado: bairroId,
        detalhesAlteracao: {
          nomeBairro: bairro.nomeBairro,
          cidade: bairro.cidade,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: "Bairro removido com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover bairro:", error);
    return NextResponse.json(
      {
        erro: "Erro ao remover bairro",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
