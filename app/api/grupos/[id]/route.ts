import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z
  .object({
    nomeGrupo: z.string().min(2).optional(),
    ordemAla: z.string().min(1).optional().nullable(),
    status: z.enum(["ATIVO", "INATIVO"]).optional(),
  })
  .refine(
    (val) => Object.keys(val).length > 0,
    "Pelo menos um campo deve ser informado para atualizacao"
  );

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const getIp = (req: NextRequest) =>
  req.headers.get("x-forwarded-for") ?? "unknown";

const formatGrupo = (
  grupo: Awaited<ReturnType<typeof prisma.grupo.findUnique>>,
  incluirMembros: boolean
) => {
  if (!grupo) return null;

  const casa = (grupo as typeof grupo & { casa?: any }).casa ?? null;
  const membros = Array.isArray((grupo as any).membros)
    ? ((grupo as any).membros as Array<
        {
          dataSaida: Date | null;
          id: string;
          dataEntrada: Date;
          adolescente: any;
        }
      >)
    : [];

  return {
    id: grupo.id,
    nomeGrupo: grupo.nomeGrupo,
    ordemAla: grupo.ordemAla,
    status: grupo.status,
    criadoEm: grupo.criadoEm,
    casa: casa
      ? {
          id: casa.id,
          nome: casa.nome,
          numero: casa.numero,
        }
      : null,
    totalMembros:
      incluirMembros && membros.length > 0
        ? membros.filter((m) => m.dataSaida === null).length
        : undefined,
    membros:
      incluirMembros && membros.length > 0
        ? membros
            .filter((m) => m.dataSaida === null)
            .map((membro) => ({
              id: membro.id,
              dataEntrada: membro.dataEntrada,
              adolescente: {
                id: membro.adolescente.id,
                nomeCompleto: membro.adolescente.nomeCompleto,
                nomeSocial: membro.adolescente.nomeSocial,
                numeroSms: membro.adolescente.numeroSms,
                fotoUrl: membro.adolescente.fotoUrl,
                statusUnidade: membro.adolescente.statusUnidade,
                alojamento: membro.adolescente.alojamentoAtual
                  ? {
                      id: membro.adolescente.alojamentoAtual.id,
                      numero: membro.adolescente.alojamentoAtual.numeroAlojamento,
                      ala: membro.adolescente.alojamentoAtual.ala,
                    }
                  : null,
              },
            }))
        : undefined,
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const incluirMembros = searchParams.get("incluir_membros") === "true";

    const grupo = await prisma.grupo.findUnique({
      where: { id },
      include: {
        casa: true,
        membros: incluirMembros
          ? {
              include: {
                adolescente: {
                  include: {
                    alojamentoAtual: {
                      select: {
                        id: true,
                        numeroAlojamento: true,
                        ala: true,
                      },
                    },
                  },
                },
              },
            }
          : false,
      },
    });

    if (!grupo) {
      return NextResponse.json(
        { erro: "Grupo nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(formatGrupo(grupo, incluirMembros));
  } catch (error) {
    console.error("Erro ao buscar grupo:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar grupo",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 }
      );
    }

    let dados;
    try {
      dados = updateSchema.parse(payload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { erro: "Dados invalidos", detalhes: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

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

    const grupoAtual = await prisma.grupo.findUnique({
      where: { id },
      include: { casa: true },
    });

    if (!grupoAtual) {
      return NextResponse.json(
        { erro: "Grupo nao encontrado" },
        { status: 404 }
      );
    }

    const grupoAtualizado = await prisma.grupo.update({
      where: { id },
      data: dados,
      include: {
        casa: true,
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "GRUPO_ATUALIZAR",
        tabelaAfetada: "grupos",
        registroIdAfetado: grupoAtualizado.id,
        detalhesAlteracao: dados,
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      id: grupoAtualizado.id,
      nomeGrupo: grupoAtualizado.nomeGrupo,
      ordemAla: grupoAtualizado.ordemAla,
      status: grupoAtualizado.status,
      casa: {
        id: grupoAtualizado.casa.id,
        nome: grupoAtualizado.casa.nome,
        numero: grupoAtualizado.casa.numero,
      },
      mensagem: "Grupo atualizado com sucesso",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar grupo:", error);
    return NextResponse.json(
      {
        erro: "Erro ao atualizar grupo",
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
    const { id } = await params;

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

    const grupo = await prisma.grupo.findUnique({
      where: { id },
      include: {
        casa: true,
        membros: {
          where: { dataSaida: null },
          select: { id: true },
        },
      },
    });

    if (!grupo) {
      return NextResponse.json(
        { erro: "Grupo nao encontrado" },
        { status: 404 }
      );
    }

    if (grupo.membros.length > 0) {
      return NextResponse.json(
        { erro: "Nao e possivel remover grupos com membros ativos" },
        { status: 409 }
      );
    }

    await prisma.grupo.delete({
      where: { id },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "GRUPO_REMOVER",
        tabelaAfetada: "grupos",
        registroIdAfetado: id,
        detalhesAlteracao: {
          nomeGrupo: grupo.nomeGrupo,
          casa: grupo.casa?.nome ?? null,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: "Grupo removido com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover grupo:", error);
    return NextResponse.json(
      {
        erro: "Erro ao remover grupo",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
