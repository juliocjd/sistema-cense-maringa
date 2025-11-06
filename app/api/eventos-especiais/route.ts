import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  coletarContextoEvento,
  calcularRiscoEvento,
} from "@/lib/eventos/calc-risco-evento";

const createEventoSchema = z.object({
  nomeEvento: z.string().min(3),
  dataHoraInicio: z
    .string()
    .refine(
      (value) => !Number.isNaN(Date.parse(value)),
      "dataHoraInicio invalido"
    ),
  dataHoraFim: z
    .string()
    .optional()
    .nullable()
    .refine(
      (value) => !value || !Number.isNaN(Date.parse(value)),
      "dataHoraFim invalido"
    ),
  tipo: z.string().optional().nullable(),
  status: z.enum(["PLANEJADO", "EM_ANDAMENTO", "CONCLUIDO"]).optional(),
  observacoes: z.string().optional().nullable(),
  gruposParticipantes: z.array(z.string().uuid()).optional(),
  adolescentesParticipantes: z.array(z.string().uuid()).optional(),
});

const listQuerySchema = z.object({
  status: z.enum(["PLANEJADO", "EM_ANDAMENTO", "CONCLUIDO"]).optional(),
  incluirGrupos: z
    .string()
    .transform((value) => value === "true")
    .optional(),
  incluirParticipantes: z
    .string()
    .transform((value) => value === "true")
    .optional(),
});

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const getIp = (req: NextRequest) =>
  req.headers.get("x-forwarded-for") ?? "unknown";

export async function GET(request: NextRequest) {
  try {
    const parsedQuery = listQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );

    if (!parsedQuery.success) {
      return NextResponse.json(
        { erro: "Parametros de consulta invalidos" },
        { status: 400 }
      );
    }

    const { status, incluirGrupos, incluirParticipantes } = parsedQuery.data;

    const eventos = await prisma.eventoEspecial.findMany({
      where: {
        ...(status ? { status } : {}),
      },
      include: {
        grupos: incluirGrupos
          ? {
              include: {
                grupo: {
                  include: {
                    casa: true,
                  },
                },
              },
            }
          : false,
        participantes: incluirParticipantes
          ? {
              include: {
                adolescente: true,
              },
            }
          : false,
      },
      orderBy: [
        { dataHoraInicio: "desc" },
        { nomeEvento: "asc" },
      ],
    });

    const resposta = eventos.map((evento) => ({
      id: evento.id,
      nomeEvento: evento.nomeEvento,
      dataHoraInicio: evento.dataHoraInicio,
      dataHoraFim: evento.dataHoraFim,
      tipo: evento.tipo,
      status: evento.status,
      observacoes: evento.observacoes,
      grupos:
        incluirGrupos && "grupos" in evento
          ? evento.grupos.map((item) => {
              const grupo = (item as typeof item & { grupo?: any }).grupo ?? null;
              return {
                id: grupo?.id ?? item.grupoId,
                nomeGrupo: grupo?.nomeGrupo ?? null,
                casa: grupo?.casa
                  ? {
                      id: grupo.casa.id,
                      nome: grupo.casa.nome,
                      numero: grupo.casa.numero,
                    }
                  : null,
              };
            })
          : undefined,
      participantes:
        incluirParticipantes && "participantes" in evento
          ? evento.participantes.map((item) => {
              const adolescente =
                (item as typeof item & { adolescente?: any }).adolescente ??
                null;
              return {
                id: adolescente?.id ?? item.adolescenteId,
                nomeCompleto: adolescente?.nomeCompleto ?? null,
                statusUnidade: adolescente?.statusUnidade ?? null,
              };
            })
          : undefined,
    }));

    return NextResponse.json({
      total: resposta.length,
      eventos: resposta,
    });
  } catch (error) {
    console.error("Erro ao listar eventos especiais:", error);
    return NextResponse.json(
      {
        erro: "Erro ao listar eventos especiais",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 }
      );
    }

    const parsed = createEventoSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      nomeEvento,
      dataHoraInicio,
      dataHoraFim,
      tipo,
      status,
      observacoes,
      gruposParticipantes = [],
      adolescentesParticipantes = [],
    } = parsed.data;

    const inicio = new Date(dataHoraInicio);
    const fim =
      dataHoraFim && dataHoraFim.length > 0 ? new Date(dataHoraFim) : null;

    if (fim && fim < inicio) {
      return NextResponse.json(
        { erro: "dataHoraFim deve ser posterior a dataHoraInicio" },
        { status: 400 }
      );
    }

    const {
      contexto,
      gruposNaoEncontrados,
      adolescentesNaoEncontrados,
    } = await coletarContextoEvento(
      gruposParticipantes,
      adolescentesParticipantes
    );

    if (gruposNaoEncontrados.length > 0) {
      return NextResponse.json(
        {
          erro: "Alguns grupos nao foram encontrados",
          grupos_nao_encontrados: gruposNaoEncontrados,
        },
        { status: 404 }
      );
    }

    if (adolescentesNaoEncontrados.length > 0) {
      return NextResponse.json(
        {
          erro: "Alguns adolescentes nao foram encontrados",
          adolescentes_nao_encontrados: adolescentesNaoEncontrados,
        },
        { status: 404 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const evento = await tx.eventoEspecial.create({
        data: {
          nomeEvento,
          dataHoraInicio: inicio,
          dataHoraFim: fim,
          tipo: tipo ?? null,
          status: status ?? "PLANEJADO",
          observacoes: observacoes ?? null,
          criadoPor: operadorId,
        },
      });

      if (gruposParticipantes.length > 0) {
        await tx.eventoEspecialGrupo.createMany({
          data: gruposParticipantes.map((grupoId) => ({
            eventoId: evento.id,
            grupoId,
          })),
        });
      }

      if (adolescentesParticipantes.length > 0) {
        await tx.eventoEspecialParticipante.createMany({
          data: adolescentesParticipantes.map((adolescenteId) => ({
            eventoId: evento.id,
            adolescenteId,
          })),
        });
      }

      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "EVENTO_CRIAR",
          tabelaAfetada: "eventos_especiais",
          registroIdAfetado: evento.id,
          detalhesAlteracao: {
            nomeEvento: evento.nomeEvento,
            gruposAssociados: gruposParticipantes.length,
            participantesDiretos: adolescentesParticipantes.length,
          },
          ipOrigem: getIp(request),
        },
      });

      return evento;
    });

    const analise =
      contexto.participantes.size > 0
        ? calcularRiscoEvento(contexto.participantes)
        : null;

    return NextResponse.json(
      {
        id: resultado.id,
        nomeEvento: resultado.nomeEvento,
        dataHoraInicio: resultado.dataHoraInicio,
        dataHoraFim: resultado.dataHoraFim,
        tipo: resultado.tipo,
        status: resultado.status,
        observacoes: resultado.observacoes,
        gruposAdicionados: gruposParticipantes.length,
        participantesAdicionados: adolescentesParticipantes.length,
        analise_risco: analise,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar evento especial:", error);
    return NextResponse.json(
      {
        erro: "Erro ao criar evento especial",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
