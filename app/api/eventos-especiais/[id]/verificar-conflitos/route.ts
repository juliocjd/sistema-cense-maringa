import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  coletarContextoEvento,
  calcularRiscoEvento,
} from "@/lib/eventos/calc-risco-evento";

const requestSchema = z
  .object({
    gruposParticipantes: z.array(z.string().uuid()).optional(),
    adolescentesParticipantes: z.array(z.string().uuid()).optional(),
  })
  .optional();

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const getIp = (req: NextRequest) =>
  req.headers.get("x-forwarded-for") ?? "unknown";

const normalizeBody = (body: unknown) => {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const data = body as Record<string, unknown>;
  const grupos =
    data.gruposParticipantes ??
    data.grupos_participantes ??
    data.grupos ??
    undefined;
  const adolescentes =
    data.adolescentesParticipantes ??
    data.adolescentes_participantes ??
    data.participantes ??
    undefined;

  return {
    gruposParticipantes:
      Array.isArray(grupos) && grupos.every((item) => typeof item === "string")
        ? (grupos as string[])
        : undefined,
    adolescentesParticipantes:
      Array.isArray(adolescentes) &&
      adolescentes.every((item) => typeof item === "string")
        ? (adolescentes as string[])
        : undefined,
  };
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventoId = ensureString(id);

    const parsedId = z
      .string()
      .uuid("Id de evento invalido")
      .safeParse(eventoId);
    if (!parsedId.success) {
      return NextResponse.json(
        { erro: "Id de evento invalido" },
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

    const evento = await prisma.eventoEspecial.findUnique({
      where: { id: parsedId.data },
      include: {
        grupos: {
          select: {
            grupoId: true,
          },
        },
        participantes: {
          select: {
            adolescenteId: true,
          },
        },
      },
    });

    if (!evento) {
      return NextResponse.json(
        { erro: "Evento nao encontrado" },
        { status: 404 }
      );
    }

    let body: unknown = undefined;
    const rawBody = await request.text();
    if (rawBody.trim().length > 0) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { erro: "JSON invalido" },
          { status: 400 }
        );
      }
    }

    const normalized = normalizeBody(body);
    const parsedBody = requestSchema.safeParse(normalized);

    if (!parsedBody.success) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const override = parsedBody.data ?? {};
    const gruposRequest = override.gruposParticipantes ?? [];
    const participantesRequest = override.adolescentesParticipantes ?? [];

    const gruposEvento = evento.grupos.map((item) => item.grupoId);
    const participantesEvento = evento.participantes.map(
      (item) => item.adolescenteId
    );

    const gruposParaVerificar =
      gruposRequest.length > 0 ? gruposRequest : gruposEvento;
    const adolescentesParaVerificar =
      participantesRequest.length > 0
        ? participantesRequest
        : participantesEvento;

    const {
      contexto,
      gruposNaoEncontrados,
      adolescentesNaoEncontrados,
    } = await coletarContextoEvento(
      gruposParaVerificar,
      adolescentesParaVerificar
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

    const analise =
      contexto.participantes.size > 0
        ? calcularRiscoEvento(contexto.participantes)
        : {
            score_risco_combinado: 0,
            nivel: "BAIXO" as const,
            conflitos_criticos: 0,
            conflitos_detalhados: [],
            recomendacoes: [
              "Nenhum conflito encontrado. Manter vigilancia padrao.",
            ],
            participantes_avaliados: 0,
          };

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "EVENTO_VERIFICAR_RISCO",
        tabelaAfetada: "eventos_especiais",
        registroIdAfetado: evento.id,
        detalhesAlteracao: {
          gruposAnalizados: gruposParaVerificar.length,
          participantesInformados: adolescentesParaVerificar.length,
          score: analise.score_risco_combinado,
          nivel: analise.nivel,
        },
        ipOrigem: getIp(request),
      },
    });

    return NextResponse.json({
      eventoId: evento.id,
      participantes_avaliados: analise.participantes_avaliados,
      analise,
    });
  } catch (error) {
    console.error("Erro ao verificar conflitos de evento:", error);
    return NextResponse.json(
      {
        erro: "Erro ao verificar conflitos do evento",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
