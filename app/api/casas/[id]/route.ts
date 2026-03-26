import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { destinacaoOperacionalUsaPrazo } from "@/lib/casas/configuracao-operacional";
import { invalidateEstruturaSnapshot } from "@/lib/estrutura/snapshot";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

const updateCasaSchema = z.object({
  nome: z.string().min(1).optional(),
  isolada: z.boolean().optional(),
  observacoes: z.string().nullable().optional(),
  destinacaoOperacional: z.enum([
    "PROVISORIA",
    "DEFINITIVA",
    "FASE_EXCLUSIVA",
    "ABRIGAMENTO",
  ]),
  faseExclusivaId: z.string().uuid().nullable().optional(),
  prazoMaximoDias: z.number().int().positive().nullable().optional(),
  riscoMaximoPermitido: z.number().int().min(0).max(5).nullable().optional(),
});

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const getIp = (request: NextRequest) =>
  request.headers.get("x-forwarded-for") ?? "unknown";

const mapCasa = (casa: {
  id: string;
  nome: string;
  numero: number;
  isolada: boolean;
  observacoes: string | null;
  destinacaoOperacional: string;
  faseExclusivaId: string | null;
  prazoMaximoDias: number | null;
  riscoMaximoPermitido: number | null;
  faseExclusiva: { id: string; nomeFase: string } | null;
}) => ({
  id: casa.id,
  nome: casa.nome,
  numero: casa.numero,
  isolada: casa.isolada,
  observacoes: casa.observacoes,
  destinacao_operacional: casa.destinacaoOperacional,
  fase_exclusiva_id: casa.faseExclusivaId,
  fase_exclusiva: casa.faseExclusiva,
  prazo_maximo_dias: casa.prazoMaximoDias,
  risco_maximo_permitido: casa.riscoMaximoPermitido,
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const casaId = ensureString(id);

    if (!casaId) {
      return NextResponse.json({ erro: "Casa nao informada" }, { status: 400 });
    }

    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 },
      );
    }

    const permissoes = session?.user?.permissions ?? [];
    if (!hasPermission(permissoes, PERMISSIONS.ESTRUTURA_EDIT)) {
      return NextResponse.json(
        { erro: "Sem permissao para alterar a estrutura" },
        { status: 403 },
      );
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 },
      );
    }

    const dados = updateCasaSchema.parse(payload);

    const casaAtual = await prisma.casa.findUnique({
      where: { id: casaId },
      include: {
        faseExclusiva: {
          select: { id: true, nomeFase: true },
        },
      },
    });

    if (!casaAtual) {
      return NextResponse.json(
        { erro: "Casa nao encontrada" },
        { status: 404 },
      );
    }

    if (
      dados.destinacaoOperacional === "FASE_EXCLUSIVA" &&
      dados.faseExclusivaId
    ) {
      const faseSelecionada = await prisma.faseInternacao.findUnique({
        where: { id: dados.faseExclusivaId },
        select: { id: true, ativa: true },
      });

      if (!faseSelecionada) {
        return NextResponse.json(
          { erro: "Fase exclusiva nao encontrada" },
          { status: 404 },
        );
      }

      if (!faseSelecionada.ativa && casaAtual.faseExclusivaId !== faseSelecionada.id) {
        return NextResponse.json(
          { erro: "A fase selecionada esta inativa e nao pode ser vinculada a uma nova casa" },
          { status: 409 },
        );
      }
    }

    const data = {
      nome: dados.nome ?? casaAtual.nome,
      isolada: dados.isolada ?? casaAtual.isolada,
      observacoes:
        dados.observacoes === undefined
          ? casaAtual.observacoes
          : dados.observacoes?.trim() || null,
      destinacaoOperacional: dados.destinacaoOperacional,
      faseExclusiva:
        dados.destinacaoOperacional === "FASE_EXCLUSIVA" &&
        dados.faseExclusivaId
          ? { connect: { id: dados.faseExclusivaId } }
          : { disconnect: true },
      prazoMaximoDias:
        destinacaoOperacionalUsaPrazo(dados.destinacaoOperacional)
          ? dados.prazoMaximoDias ?? null
          : null,
      riscoMaximoPermitido:
        dados.destinacaoOperacional === "FASE_EXCLUSIVA"
          ? dados.riscoMaximoPermitido ?? null
          : null,
    } as const;

    const casaAtualizada = await prisma.casa.update({
      where: { id: casaId },
      data,
      include: {
        faseExclusiva: {
          select: { id: true, nomeFase: true },
        },
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "CASA_ATUALIZAR_CONFIG_OPERACIONAL",
        tabelaAfetada: "casas",
        registroIdAfetado: casaAtualizada.id,
        detalhesAlteracao: {
          antes: mapCasa(casaAtual),
          depois: mapCasa(casaAtualizada),
        },
        ipOrigem: getIp(request),
      },
    });

    invalidateEstruturaSnapshot();

    return NextResponse.json({
      casa: mapCasa(casaAtualizada),
      mensagem: "Configuracao operacional atualizada com sucesso",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao atualizar configuracao da casa:", error);
    return NextResponse.json(
      { erro: "Erro ao atualizar configuracao da casa" },
      { status: 500 },
    );
  }
}
