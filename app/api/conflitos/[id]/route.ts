// app/api/conflitos/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const formatarAlojamento = (alojamento?: {
  id: string;
  casa: { nome: string } | null;
  numeroAlojamento: string | number;
  ala: string | null;
}) => {
  if (!alojamento) {
    return null;
  }
  const partes = [
    alojamento.casa?.nome ?? null,
    `Aloj ${alojamento.numeroAlojamento}`,
    alojamento.ala ? `Ala ${alojamento.ala}` : null,
  ].filter(Boolean);

  return {
    id: alojamento.id,
    descricao: partes.join(" - "),
    casa: alojamento.casa?.nome ?? null,
    numero: alojamento.numeroAlojamento,
    ala: alojamento.ala,
  };
};

const coletarParticipantes = (conflitos: any[]) => {
  const mapa = new Map<
    string,
    {
      id: string;
      nomeCompleto: string;
      numeroSms: string | null;
      alojamentoAtual: ReturnType<typeof formatarAlojamento>;
    }
  >();

  const adicionar = (dados: any) => {
    if (!dados) return;
    if (!mapa.has(dados.id)) {
      mapa.set(dados.id, {
        id: dados.id,
        nomeCompleto: dados.nomeCompleto ?? dados.nomeSocial ?? "",
        numeroSms: dados.numeroSms ?? "",
        alojamentoAtual: formatarAlojamento(dados.alojamentoAtual),
      });
    }
  };

  conflitos.forEach((item) => {
    adicionar(item.adolescenteA);
    adicionar(item.adolescenteB);
  });

  return Array.from(mapa.values());
};

const mapearConflito = (conflito: any) => {
  const participante = (dados: any) => ({
    id: dados.id,
    nomeCompleto: dados.nomeCompleto,
    nomeSocial: dados.nomeSocial,
    numeroSms: dados.numeroSms,
    fotoUrl: dados.fotoUrl,
    statusUnidade: dados.statusUnidade,
    alojamentoAtual: dados.alojamentoAtual
      ? {
          id: dados.alojamentoAtual.id,
          casa: dados.alojamentoAtual.casa?.nome ?? null,
          numero: dados.alojamentoAtual.numeroAlojamento,
          ala: dados.alojamentoAtual.ala,
        }
      : null,
  });

  return {
    id: conflito.id,
    registroGrupoId: conflito.registroGrupoId ?? conflito.id,
    tipo: conflito.tipoConflito,
    status: conflito.status,
    descricao: conflito.descricao,
    dataRegistro: conflito.criadoEm,
    dataResolucao: conflito.resolvidoEm,
    ciOrigem: conflito.ciOrigem
      ? {
          id: conflito.ciOrigem.id,
          numero: conflito.ciOrigem.numero,
          ano: conflito.ciOrigem.ano,
          tipo: conflito.ciOrigem.tipoCI,
          resumo: conflito.ciOrigem.resumoCI,
        }
      : null,
    adolescenteA: participante(conflito.adolescenteA),
    adolescenteB: participante(conflito.adolescenteB),
    tentativasMediacao: conflito.tentativasMediacao?.map((tentativa: any) => ({
      id: tentativa.id,
      dataTentativa: tentativa.dataTentativa,
      profissionalResponsavel: tentativa.profissionalResponsavel,
      tipoIntervencao: tentativa.tipoIntervencao,
      resultado: tentativa.resultado,
      observacoes: tentativa.observacoes,
      proximaAcaoRecomendada: tentativa.proximaAcaoRecomendada,
      dataProximaAvaliacao: tentativa.dataProximaAvaliacao,
    })),
  };
};

const updateSchema = z.object({
  tipoConflito: z.string().min(3, "Tipo invalido").max(60).optional(),
  status: z.enum(["ATIVO", "RESOLVIDO"]).optional(),
  descricao: z.string().optional().nullable(),
  registroGrupoId: z.string().uuid().optional().nullable(),
  resolvidoEm: z.string().datetime().optional().nullable(),
});

// GET /api/conflitos/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conflito = await prisma.conflito.findUnique({
      where: { id },
      include: {
        adolescenteA: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            fotoUrl: true,
            statusUnidade: true,
            alojamentoAtual: {
              include: {
                casa: true,
              },
            },
          },
        },
        adolescenteB: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            fotoUrl: true,
            statusUnidade: true,
            alojamentoAtual: {
              include: {
                casa: true,
              },
            },
          },
        },
        tentativasMediacao: {
          orderBy: {
            dataTentativa: "desc",
          },
        },
        ciOrigem: true,
      },
    });

    if (!conflito) {
      return NextResponse.json(
        { erro: "Conflito nao encontrado" },
        { status: 404 }
      );
    }

    const grupoId = conflito.registroGrupoId ?? conflito.id;
    const conflitosAgrupados = await prisma.conflito.findMany({
      where: grupoId
        ? {
            OR: [
              { registroGrupoId: grupoId },
              { id: grupoId },
            ],
          }
        : { id: conflito.id },
      include: {
        adolescenteA: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            alojamentoAtual: {
              include: {
                casa: true,
              },
            },
          },
        },
        adolescenteB: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            alojamentoAtual: {
              include: {
                casa: true,
              },
            },
          },
        },
      },
    });

    const participantes = coletarParticipantes(conflitosAgrupados);
    const conflitoFormatado = mapearConflito(conflito);

    return NextResponse.json({
      ...conflitoFormatado,
      participantes,
    });
  } catch (error) {
    console.error("Erro ao buscar conflito:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar conflito",
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
    const { id } = await params;
    const session = await auth().catch(() => null);
    const operadorId = session?.user?.id;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido, esperado JSON" },
        { status: 400 }
      );
    }

    const validated = updateSchema.parse(payload);
    const data: Prisma.ConflitoUpdateInput = {};
    let possuiAlteracoes = false;

    if (validated.tipoConflito !== undefined) {
      const tipo = validated.tipoConflito.trim();
      if (!tipo) {
        return NextResponse.json(
          { erro: "Tipo de conflito nao pode ser vazio" },
          { status: 400 }
        );
      }
      data.tipoConflito = tipo.toUpperCase();
      possuiAlteracoes = true;
    }

    if (validated.descricao !== undefined) {
      data.descricao = validated.descricao ?? null;
      possuiAlteracoes = true;
    }

    if (validated.registroGrupoId !== undefined) {
      data.registroGrupoId = validated.registroGrupoId || null;
      possuiAlteracoes = true;
    }

    if (validated.status !== undefined) {
      data.status = validated.status;
      if (validated.status === "RESOLVIDO") {
        const resolvidoEm = validated.resolvidoEm
          ? new Date(validated.resolvidoEm)
          : new Date();
        if (Number.isNaN(resolvidoEm.getTime())) {
          return NextResponse.json(
            { erro: "Data de resolucao invalida" },
            { status: 400 }
          );
        }
        data.resolvidoEm = resolvidoEm;
      } else {
        data.resolvidoEm = null;
      }
      possuiAlteracoes = true;
    }

    if (!possuiAlteracoes) {
      return NextResponse.json(
        { erro: "Nenhuma alteracao fornecida" },
        { status: 400 }
      );
    }

    const atualizado = await prisma.conflito.update({
      where: { id },
      data,
      include: {
        adolescenteA: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            fotoUrl: true,
            statusUnidade: true,
            alojamentoAtual: {
              include: {
                casa: true,
              },
            },
          },
        },
        adolescenteB: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            fotoUrl: true,
            statusUnidade: true,
            alojamentoAtual: {
              include: {
                casa: true,
              },
            },
          },
        },
        tentativasMediacao: {
          orderBy: {
            dataTentativa: "desc",
          },
        },
        ciOrigem: true,
      },
    });

    return NextResponse.json({
      mensagem: "Conflito atualizado com sucesso",
      conflito: mapearConflito(atualizado),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar conflito:", error);
    return NextResponse.json(
      {
        erro: "Erro ao atualizar conflito",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
