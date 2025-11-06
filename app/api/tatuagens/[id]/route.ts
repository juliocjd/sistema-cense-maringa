import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const paramsSchema = z.object({
  id: z.string().uuid("Id da tatuagem invalido"),
});

const allowedNiveis = ["ALTO", "MEDIO", "BAIXO"] as const;

const updateSchema = z
  .object({
    nomeSimbolo: z.string().min(2).optional(),
    significadoAssociado: z.string().max(1000).optional().nullable(),
    nivelRisco: z.enum(allowedNiveis).optional().nullable(),
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
        { erro: "Id da tatuagem invalido" },
        { status: 400 }
      );
    }

    const incluirAdolescentes =
      request.nextUrl.searchParams.get("incluir_adolescentes") === "true";

    const tatuagem = await prisma.tatuagemCatalogo.findUnique({
      where: { id: parsedParams.data.id },
      include: {
        adolescentesTatuagens: incluirAdolescentes
          ? {
              include: {
                adolescente: {
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
                },
              },
            }
          : false,
        _count: {
          select: { adolescentesTatuagens: true },
        },
      },
    });

    if (!tatuagem) {
      return NextResponse.json(
        { erro: "Tatuagem nao encontrada" },
        { status: 404 }
      );
    }

    const usos =
      incluirAdolescentes && Array.isArray((tatuagem as any).adolescentesTatuagens)
        ? ((tatuagem as any).adolescentesTatuagens as Array<{
            id: string;
            localCorpo: string | null;
            fotoUrl: string | null;
            observacoes: string | null;
            adolescente: {
              id: string;
              nomeCompleto: string;
              statusUnidade: string;
              alojamentoAtual: {
                id: string;
                numeroAlojamento: string | null;
                ala: string | null;
                casa: { id: string; nome: string; numero: number | null } | null;
              } | null;
            } | null;
          }>)
        : [];

    return NextResponse.json({
      id: tatuagem.id,
      nomeSimbolo: tatuagem.nomeSimbolo,
      significadoAssociado: tatuagem.significadoAssociado,
      nivelRisco: tatuagem.nivelRisco,
      totalUso: tatuagem._count?.adolescentesTatuagens ?? usos.length,
      adolescentes:
        incluirAdolescentes
          ? usos.map((uso) => ({
              id: uso.adolescente?.id ?? null,
              nomeCompleto: uso.adolescente?.nomeCompleto ?? null,
              statusUnidade: uso.adolescente?.statusUnidade ?? null,
              localCorpo: uso.localCorpo,
              alojamento: uso.adolescente?.alojamentoAtual
                ? {
                    id: uso.adolescente.alojamentoAtual.id,
                    numero: uso.adolescente.alojamentoAtual.numeroAlojamento,
                    ala: uso.adolescente.alojamentoAtual.ala,
                    casa: uso.adolescente.alojamentoAtual.casa
                      ? {
                          id: uso.adolescente.alojamentoAtual.casa.id,
                          nome: uso.adolescente.alojamentoAtual.casa.nome,
                          numero: uso.adolescente.alojamentoAtual.casa.numero,
                        }
                      : null,
                  }
                : null,
            }))
          : undefined,
    });
  } catch (error) {
    console.error("Erro ao buscar tatuagem:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar tatuagem",
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
        { erro: "Id da tatuagem invalido" },
        { status: 400 }
      );
    }
    const tatuagemId = parsedParams.data.id;

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

    const tatuagemAtual = await prisma.tatuagemCatalogo.findUnique({
      where: { id: tatuagemId },
      select: { id: true, nomeSimbolo: true },
    });

    if (!tatuagemAtual) {
      return NextResponse.json(
        { erro: "Tatuagem nao encontrada" },
        { status: 404 }
      );
    }

    if (
      parsedBody.data.nomeSimbolo &&
      parsedBody.data.nomeSimbolo !== tatuagemAtual.nomeSimbolo
    ) {
      const conflito = await prisma.tatuagemCatalogo.findUnique({
        where: { nomeSimbolo: parsedBody.data.nomeSimbolo },
        select: { id: true },
      });
      if (conflito) {
        return NextResponse.json(
          { erro: "Ja existe tatuagem com este simbolo" },
          { status: 409 }
        );
      }
    }

    const tatuagemAtualizada = await prisma.tatuagemCatalogo.update({
      where: { id: tatuagemId },
      data: {
        ...(parsedBody.data.nomeSimbolo
          ? { nomeSimbolo: parsedBody.data.nomeSimbolo }
          : {}),
        ...(parsedBody.data.significadoAssociado !== undefined
          ? {
              significadoAssociado:
                parsedBody.data.significadoAssociado ?? null,
            }
          : {}),
        ...(parsedBody.data.nivelRisco !== undefined
          ? { nivelRisco: parsedBody.data.nivelRisco ?? null }
          : {}),
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "TATUAGEM_ATUALIZAR",
        tabelaAfetada: "tatuagens_catalogo",
        registroIdAfetado: tatuagemAtualizada.id,
        detalhesAlteracao: parsedBody.data,
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      id: tatuagemAtualizada.id,
      nomeSimbolo: tatuagemAtualizada.nomeSimbolo,
      significadoAssociado: tatuagemAtualizada.significadoAssociado,
      nivelRisco: tatuagemAtualizada.nivelRisco,
      mensagem: "Tatuagem atualizada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao atualizar tatuagem:", error);
    return NextResponse.json(
      {
        erro: "Erro ao atualizar tatuagem",
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
        { erro: "Id da tatuagem invalido" },
        { status: 400 }
      );
    }
    const tatuagemId = parsedParams.data.id;

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

    const tatuagem = await prisma.tatuagemCatalogo.findUnique({
      where: { id: tatuagemId },
      include: {
        _count: {
          select: { adolescentesTatuagens: true },
        },
      },
    });

    if (!tatuagem) {
      return NextResponse.json(
        { erro: "Tatuagem nao encontrada" },
        { status: 404 }
      );
    }

    if ((tatuagem._count?.adolescentesTatuagens ?? 0) > 0) {
      return NextResponse.json(
        {
          erro: "Nao e possivel remover tatuagem com vinculos ativos",
          totalUso: tatuagem._count?.adolescentesTatuagens ?? 0,
        },
        { status: 409 }
      );
    }

    await prisma.tatuagemCatalogo.delete({ where: { id: tatuagemId } });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "TATUAGEM_REMOVER",
        tabelaAfetada: "tatuagens_catalogo",
        registroIdAfetado: tatuagemId,
        detalhesAlteracao: {
          nomeSimbolo: tatuagem.nomeSimbolo,
          nivelRisco: tatuagem.nivelRisco,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: "Tatuagem removida com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover tatuagem:", error);
    return NextResponse.json(
      {
        erro: "Erro ao remover tatuagem",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

