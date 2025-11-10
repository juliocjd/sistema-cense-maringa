// app/api/conflitos/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const conflitoFormatado = {
      id: conflito.id,
      registroGrupoId: grupoId,
      tipo: conflito.tipoConflito,
      status: conflito.status,
      descricao: conflito.descricao,
      dataRegistro: conflito.criadoEm,
      dataResolucao: conflito.resolvidoEm,
      participantes,
      ciOrigem: conflito.ciOrigem
        ? {
            id: conflito.ciOrigem.id,
            numero: conflito.ciOrigem.numero,
            ano: conflito.ciOrigem.ano,
            tipo: conflito.ciOrigem.tipoCI,
            resumo: conflito.ciOrigem.resumoCI,
          }
        : null,
      adolescenteA: {
        id: conflito.adolescenteA.id,
        nomeCompleto: conflito.adolescenteA.nomeCompleto,
        nomeSocial: conflito.adolescenteA.nomeSocial,
        numeroSms: conflito.adolescenteA.numeroSms,
        fotoUrl: conflito.adolescenteA.fotoUrl,
        statusUnidade: conflito.adolescenteA.statusUnidade,
        alojamentoAtual: conflito.adolescenteA.alojamentoAtual
          ? {
              id: conflito.adolescenteA.alojamentoAtual.id,
              casa: conflito.adolescenteA.alojamentoAtual.casa.nome,
              numero: conflito.adolescenteA.alojamentoAtual.numeroAlojamento,
              ala: conflito.adolescenteA.alojamentoAtual.ala,
            }
          : null,
      },
      adolescenteB: {
        id: conflito.adolescenteB.id,
        nomeCompleto: conflito.adolescenteB.nomeCompleto,
        nomeSocial: conflito.adolescenteB.nomeSocial,
        numeroSms: conflito.adolescenteB.numeroSms,
        fotoUrl: conflito.adolescenteB.fotoUrl,
        statusUnidade: conflito.adolescenteB.statusUnidade,
        alojamentoAtual: conflito.adolescenteB.alojamentoAtual
          ? {
              id: conflito.adolescenteB.alojamentoAtual.id,
              casa: conflito.adolescenteB.alojamentoAtual.casa.nome,
              numero: conflito.adolescenteB.alojamentoAtual.numeroAlojamento,
              ala: conflito.adolescenteB.alojamentoAtual.ala,
            }
          : null,
      },
      tentativasMediacao: conflito.tentativasMediacao.map((tentativa) => ({
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

    return NextResponse.json(conflitoFormatado);
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
