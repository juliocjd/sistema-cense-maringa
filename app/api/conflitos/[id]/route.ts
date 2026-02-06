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

type LadoToken = "LADO_1" | "LADO_2";

const LADO_LABELS: Record<LadoToken, string> = {
  LADO_1: "Lado 1",
  LADO_2: "Lado 2",
};

const ladoOposto = (lado: LadoToken): LadoToken =>
  lado === "LADO_1" ? "LADO_2" : "LADO_1";

const coletarParticipantes = (
  conflitos: any[],
  ladosMap?: Map<string, LadoToken>
) => {
    const mapa = new Map<
      string,
      {
        id: string;
        nomeCompleto: string;
        numeroSms: string | null;
        fotoUrl: string | null;
        alojamentoAtual: ReturnType<typeof formatarAlojamento>;
        lado?: string;
        statusUnidade?: string | null;
      }
    >();

  const adicionar = (dados: any) => {
    if (!dados) return;
    if (!mapa.has(dados.id)) {
      const ladoToken = ladosMap?.get(dados.id);
        mapa.set(dados.id, {
          id: dados.id,
          nomeCompleto: dados.nomeCompleto ?? dados.nomeSocial ?? "",
          numeroSms: dados.numeroSms ?? "",
          fotoUrl: dados.fotoUrl ?? null,
          statusUnidade: dados.statusUnidade ?? null,
          alojamentoAtual: formatarAlojamento(dados.alojamentoAtual),
          lado: ladoToken ? LADO_LABELS[ladoToken] : undefined,
        });
    }
  };

  conflitos.forEach((item) => {
    adicionar(item.adolescenteA);
    adicionar(item.adolescenteB);
  });

  return Array.from(mapa.values());
};

const mapearLadosDoGrupo = (conflitos: any[]) => {
  const lados = new Map<string, LadoToken>();

  conflitos.forEach((item) => {
    const adolescenteAId = item.adolescenteA?.id;
    const adolescenteBId = item.adolescenteB?.id;
    if (!adolescenteAId || !adolescenteBId) {
      return;
    }

    const ladoA = lados.get(adolescenteAId);
    const ladoB = lados.get(adolescenteBId);

    if (!ladoA && !ladoB) {
      lados.set(adolescenteAId, "LADO_1");
      lados.set(adolescenteBId, "LADO_2");
      return;
    }

    if (ladoA && !ladoB) {
      lados.set(adolescenteBId, ladoOposto(ladoA));
      return;
    }

    if (!ladoA && ladoB) {
      lados.set(adolescenteAId, ladoOposto(ladoB));
      return;
    }

    if (ladoA && ladoB && ladoA === ladoB) {
      lados.set(adolescenteBId, ladoOposto(ladoA));
    }
  });

  return lados;
};

const mapearConflito = (
  conflito: any,
  ladosMap?: Map<string, LadoToken>
) => {
  const participante = (dados: any) => {
    const ladoToken = dados?.id ? ladosMap?.get(dados.id) : undefined;
    return {
      id: dados.id,
      nomeCompleto: dados.nomeCompleto,
      nomeSocial: dados.nomeSocial,
      numeroSms: dados.numeroSms,
      fotoUrl: dados.fotoUrl,
      statusUnidade: dados.statusUnidade,
      lado: ladoToken ? LADO_LABELS[ladoToken] : undefined,
      alojamentoAtual: dados.alojamentoAtual
        ? {
            id: dados.alojamentoAtual.id,
            casa: dados.alojamentoAtual.casa?.nome ?? null,
            numero: dados.alojamentoAtual.numeroAlojamento,
            ala: dados.alojamentoAtual.ala,
          }
        : null,
    };
  };

  return {
    id: conflito.id,
    registroGrupoId: conflito.registroGrupoId ?? conflito.id,
    tipo: conflito.tipoConflito,
    status: conflito.status,
    descricao: conflito.descricao,
    totalOcorrencias: conflito.totalOcorrencias ?? 0,
    ultimaOcorrenciaEm: conflito.ultimaOcorrenciaEm,
    ocorrencias: conflito.ocorrencias?.map((oc: any) => ({
      id: oc.id,
      descricao: oc.descricao,
      criadoEm: oc.criadoEm,
      ci: oc.ci
        ? {
            id: oc.ci.id,
            numero: oc.ci.numero,
            ano: oc.ci.ano,
            tipo: oc.ci.tipoCI,
            resumo: oc.ci.resumoCI,
            dataFato: oc.ci.dataFato,
          }
        : null,
    })),
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

const montarFiltroPorGrupo = (
  registroGrupoId: string | null,
  fallbackId: string
): Prisma.ConflitoWhereInput => {
  if (registroGrupoId) {
    return {
      OR: [
        { registroGrupoId },
        { id: registroGrupoId },
      ],
    };
  }
  return { id: fallbackId };
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
        ocorrencias: {
          include: {
            ci: {
              select: {
                id: true,
                numero: true,
                ano: true,
                tipoCI: true,
                resumoCI: true,
                dataFato: true,
                suspensoPorStatus: true,
                desativadoEm: true,
              },
            },
          },
          orderBy: { criadoEm: "desc" },
        },
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
    const filtroGrupo = grupoId
      ? {
          OR: [{ registroGrupoId: grupoId }, { id: grupoId }],
        }
      : { id: conflito.id };

    // Conflitos do grupo para mapear lados/participantes
    const conflitosAgrupados = await prisma.conflito.findMany({
      where: filtroGrupo,
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
                include: { casa: true },
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
                include: { casa: true },
              },
            },
          },
        },
    });

    const totalAtivos = conflitosAgrupados.filter(
      (c) => (c.status ?? "").toUpperCase() === "ATIVO"
    ).length;
    const totalResolvidos = conflitosAgrupados.filter(
      (c) => (c.status ?? "").toUpperCase() === "RESOLVIDO"
    ).length;

    const statusGrupo =
      totalAtivos > 0 && totalResolvidos > 0
        ? "PARCIAL"
        : totalAtivos > 0
        ? "ATIVO"
        : "RESOLVIDO";

    // Conflitos com ocorrencias para exibir histórico consolidado
    // Ocorrencias do grupo com CI ativo
    const idsGrupo = conflitosAgrupados.map((c) => c.id);

    const ocorrenciasSelecionadas = await prisma.conflitoOcorrencia.findMany({
      where: {
        conflitoId: { in: idsGrupo },
        OR: [
          { ciId: null },
          {
            ci: {
              desativadoEm: null,
              suspensoPorStatus: false,
            },
          },
        ],
      },
      include: {
        ci: {
          select: {
            id: true,
            numero: true,
            ano: true,
            tipoCI: true,
            resumoCI: true,
            dataFato: true,
            suspensoPorStatus: true,
            desativadoEm: true,
          },
        },
      },
      orderBy: { criadoEm: "desc" },
    });

    let ocorrenciasLista = ocorrenciasSelecionadas.filter((oc) => oc.ci);

    // Garantir que a CI de origem apareça como ocorrência base se estiver ativa e ainda não listada
    const origemAtiva =
      conflito.ciOrigem &&
      conflito.ciOrigem.desativadoEm === null &&
      conflito.ciOrigem.suspensoPorStatus === false;

    const origemJaListada =
      origemAtiva &&
      ocorrenciasLista.some((oc) => oc.ci?.id === conflito.ciOrigem?.id);

    if (origemAtiva && conflito.ciOrigem && !origemJaListada) {
      ocorrenciasLista = [
        {
          id: `ci-${conflito.ciOrigem!.id}`,
          conflitoId: conflito.id,
          ciId: conflito.ciOrigem!.id,
          descricao: conflito.descricao ?? null,
          criadoEm: conflito.ciOrigem!.dataFato ?? conflito.criadoEm,
          ci: {
            id: conflito.ciOrigem!.id,
            numero: conflito.ciOrigem!.numero,
            ano: conflito.ciOrigem!.ano,
            tipoCI: conflito.ciOrigem!.tipoCI,
            resumoCI: conflito.ciOrigem!.resumoCI,
            dataFato: conflito.ciOrigem!.dataFato,
            suspensoPorStatus: conflito.ciOrigem!.suspensoPorStatus,
            desativadoEm: conflito.ciOrigem!.desativadoEm,
          },
        },
        ...ocorrenciasLista,
      ].sort(
        (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
      );
    }

    // Se não houver ocorrências gravadas, mas existir CI de origem ainda ativa, cria entrada sintética
    const ciOrigem = conflito.ciOrigem;
    if (
      ocorrenciasLista.length === 0 &&
      ciOrigem &&
      ciOrigem.desativadoEm === null &&
      ciOrigem.suspensoPorStatus !== true
    ) {
      ocorrenciasLista = [
        {
          id: `ci-${ciOrigem.id}`,
          conflitoId: conflito.id,
          ciId: ciOrigem.id,
          descricao: conflito.descricao ?? null,
          criadoEm: ciOrigem.dataFato ?? conflito.criadoEm,
          ci: {
            id: ciOrigem.id,
            numero: ciOrigem.numero,
            ano: ciOrigem.ano,
            tipoCI: ciOrigem.tipoCI,
            resumoCI: ciOrigem.resumoCI,
            dataFato: ciOrigem.dataFato,
            desativadoEm: ciOrigem.desativadoEm,
            suspensoPorStatus: ciOrigem.suspensoPorStatus,
          },
        },
      ];
    }

    // Remover duplicidade de CI quando o conflito tem múltiplos pares no grupo
    if (ocorrenciasLista.length > 1) {
      const mapa = new Map<string, (typeof ocorrenciasLista)[number]>();
      ocorrenciasLista.forEach((oc) => {
        const chave = oc.ci?.id ? `ci:${oc.ci.id}` : `oc:${oc.id}`;
        const existente = mapa.get(chave);
        if (
          !existente ||
          new Date(oc.criadoEm).getTime() > new Date(existente.criadoEm).getTime()
        ) {
          mapa.set(chave, oc);
        }
      });
      ocorrenciasLista = Array.from(mapa.values()).sort(
        (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
      );
    }

    const totalOcorrenciasVisiveis = ocorrenciasLista.length;

    const ultimaOcorrenciaEm =
      ocorrenciasLista.length > 0 ? ocorrenciasLista[0].criadoEm : null;

    const ladosMap = mapearLadosDoGrupo(conflitosAgrupados);
    const participantes = coletarParticipantes(conflitosAgrupados, ladosMap);
    const conflitoFormatado = mapearConflito(conflito, ladosMap);
    const paresDoGrupo = conflitosAgrupados.map((c) => ({
      id: c.id,
      status: c.status,
      registroGrupoId: c.registroGrupoId ?? c.id,
      adolescenteAId: c.adolescenteAId,
      adolescenteBId: c.adolescenteBId,
      adolescenteANome: c.adolescenteA?.nomeCompleto ?? c.adolescenteA?.nomeSocial ?? null,
      adolescenteBNome: c.adolescenteB?.nomeCompleto ?? c.adolescenteB?.nomeSocial ?? null,
      ciOrigemNumero: (c as any).ciOrigem?.numero ?? (c as any).ciOrigemNumero ?? null,
      ciOrigemAno: (c as any).ciOrigem?.ano ?? (c as any).ciOrigemAno ?? null,
    }));

    return NextResponse.json({
      ...conflitoFormatado,
      ocorrencias: ocorrenciasLista,
      totalOcorrencias: totalOcorrenciasVisiveis,
      ultimaOcorrenciaEm,
      participantes,
      statusGrupo,
      paresDoGrupo,
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
    const data: Prisma.ConflitoUpdateManyMutationInput = {};
    const camposAtualizados: string[] = [];
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
      camposAtualizados.push("tipoConflito");
      possuiAlteracoes = true;
    }

    if (validated.descricao !== undefined) {
      data.descricao = validated.descricao ?? null;
      camposAtualizados.push("descricao");
      possuiAlteracoes = true;
    }

    if (validated.registroGrupoId !== undefined) {
      data.registroGrupoId = validated.registroGrupoId || null;
      camposAtualizados.push("registroGrupoId");
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
      camposAtualizados.push("status");
      possuiAlteracoes = true;
    }

    if (!possuiAlteracoes) {
      return NextResponse.json(
        { erro: "Nenhuma alteracao fornecida" },
        { status: 400 }
      );
    }

    const conflitoBase = await prisma.conflito.findUnique({
      where: { id },
      select: {
        id: true,
        registroGrupoId: true,
      },
    });

    if (!conflitoBase) {
      return NextResponse.json(
        { erro: "Conflito nao encontrado" },
        { status: 404 }
      );
    }

    const filtroGrupo = montarFiltroPorGrupo(
      conflitoBase.registroGrupoId,
      conflitoBase.id
    );

    const conflitosDoGrupo = await prisma.conflito.findMany({
      where: filtroGrupo,
      select: { id: true },
    });

    if (conflitosDoGrupo.length === 0) {
      return NextResponse.json(
        { erro: "Nenhum conflito encontrado para atualizacao" },
        { status: 404 }
      );
    }

    const idsParaAtualizar = conflitosDoGrupo.map((registro) => registro.id);

    const resultado = await prisma.conflito.updateMany({
      where: {
        id: {
          in: idsParaAtualizar,
        },
      },
      data,
    });

    const atualizado = await prisma.conflito.findUnique({
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

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "UPDATE",
        tabelaAfetada: "conflitos",
        registroIdAfetado: conflitoBase.registroGrupoId ?? id,
        detalhesAlteracao: {
          camposAtualizados,
          registrosAfetados: resultado.count,
        },
        ipOrigem: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      mensagem:
        resultado.count > 1
          ? `Conflito atualizado em ${resultado.count} registros relacionados.`
          : "Conflito atualizado com sucesso",
      registrosAfetados: resultado.count,
      conflito: atualizado ? mapearConflito(atualizado) : null,
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

export async function DELETE(
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

    const conflitoExistente = await prisma.conflito.findUnique({
      where: { id },
      select: {
        id: true,
        registroGrupoId: true,
      },
    });

    if (!conflitoExistente) {
      return NextResponse.json(
        { erro: "Conflito nao encontrado" },
        { status: 404 }
      );
    }

    const grupoId = conflitoExistente.registroGrupoId;
    const where: Prisma.ConflitoWhereInput = grupoId
      ? {
          OR: [
            { registroGrupoId: grupoId },
            { id: grupoId },
          ],
        }
      : { id };

    const conflitosAlvo = await prisma.conflito.findMany({
      where,
      select: { id: true },
    });

    const idsParaExcluir = conflitosAlvo.map((registro) => registro.id);
    if (idsParaExcluir.length === 0) {
      return NextResponse.json(
        {
          mensagem: "Nenhum conflito encontrado para exclusao",
          registroGrupoId: grupoId ?? id,
          totalRemovidos: 0,
        },
        { status: 200 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      await tx.tentativaMediacao.deleteMany({
        where: {
          conflitoId: {
            in: idsParaExcluir,
          },
        },
      });

      const deleteConflitos = await tx.conflito.deleteMany({
        where: { id: { in: idsParaExcluir } },
      });

      return deleteConflitos;
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "DELETE",
        tabelaAfetada: "conflitos",
        registroIdAfetado: grupoId ?? id,
        detalhesAlteracao: {
          conflitosRemovidos: resultado.count,
        },
        ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    return NextResponse.json({
      mensagem: "Conflitos removidos com sucesso",
      registroGrupoId: grupoId ?? id,
      totalRemovidos: resultado.count,
    });
  } catch (error) {
    console.error("Erro ao excluir conflito:", error);
    return NextResponse.json(
      {
        erro: "Erro ao excluir conflito",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}


