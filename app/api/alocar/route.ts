import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { emitMapaEvent } from "@/lib/mapa-event-bus";
import { invalidateAdolescentesMapaCache } from "@/lib/estrutura/adolescentes-cache";
import { invalidateEstruturaSnapshot } from "@/lib/estrutura/snapshot";
import { registrarMovimentacao } from "@/lib/historico/movimentacao";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { resolveUserPermissions } from "@/lib/auth/resolve-permissions";

type VerificacaoPayload = {
  requer_justificativa?: boolean;
  nivel_risco?: number | null;
  alertas?: Array<{
    tipo?: string;
    nivel?: number;
    mensagem?: string;
    conflitoId?: string;
    conflitoCriadoEm?: string | null;
    alertaId?: string;
    alertaCriadoEm?: string | null;
  }>;
};

const ensureString = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const normalizeArrayOfStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => ensureString(item))
    .filter((item): item is string => item.length > 0);
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 },
      );
    }

    const operadorValido = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true, funcaoRole: true },
    });

    if (!operadorValido) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 },
      );
    }

    const permissoes = resolveUserPermissions(session, operadorValido);
    if (!hasPermission(permissoes, PERMISSIONS.ESTRUTURA_EDIT)) {
      return NextResponse.json(
        { erro: "Sem permissao para alterar a estrutura" },
        { status: 403 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { erro: "Payload invalido: esperado JSON" },
        { status: 400 },
      );
    }

    const adolescenteId = ensureString(body.adolescenteId);
    const alojamentoId = ensureString(body.alojamentoId);
    const justificativa = ensureString(body.justificativa);
    const medidasAdicionais = normalizeArrayOfStrings(body.medidas_adicionais);
    const motivoTransferencia = ensureString(body.motivoTransferencia);
    const motivoTransferenciaObrigatorio =
      typeof body.motivoTransferenciaObrigatorio === "boolean"
        ? body.motivoTransferenciaObrigatorio
        : false;

    if (!adolescenteId || !alojamentoId) {
      return NextResponse.json(
        { erro: "adolescenteId e alojamentoId sao obrigatorios" },
        { status: 400 },
      );
    }

    const verificarUrl = new URL(
      "/api/verificar-alocacao",
      request.nextUrl.origin,
    );
    verificarUrl.searchParams.set("adolescenteId", adolescenteId);
    verificarUrl.searchParams.set("alojamentoId", alojamentoId);

    const verificacao = await fetch(verificarUrl, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    if (!verificacao.ok) {
      return NextResponse.json(
        { erro: "Nao foi possivel verificar a alocacao" },
        { status: 500 },
      );
    }

    const dadosVerificacao = (await verificacao.json()) as VerificacaoPayload;
    const requerJustificativa = Boolean(dadosVerificacao?.requer_justificativa);
    const nivelRisco = dadosVerificacao?.nivel_risco ?? null;
    const alertas = Array.isArray(dadosVerificacao?.alertas)
      ? dadosVerificacao.alertas
      : [];

    if (requerJustificativa && !justificativa) {
      return NextResponse.json(
        {
          erro: "Esta alocacao exige justificativa",
          nivel_risco: nivelRisco,
          alertas,
          requer_justificativa: true,
        },
        { status: 400 },
      );
    }

    const alojamento = await prisma.alojamento.findUnique({
      where: { id: alojamentoId },
      include: {
        adolescentes: {
          where: { statusUnidade: "ATIVO" },
        },
        casa: true,
      },
    });

    if (!alojamento) {
      return NextResponse.json(
        { erro: "Alojamento nao encontrado" },
        { status: 404 },
      );
    }

    if (alojamento.statusManutencao === "INTERDITADO") {
      return NextResponse.json(
        { erro: "Alojamento esta interditado" },
        { status: 400 },
      );
    }

    if (alojamento.adolescentes.length > 0) {
      return NextResponse.json(
        {
          erro: "Alojamento ja esta ocupado",
          ocupante: alojamento.adolescentes[0].nomeCompleto,
        },
        { status: 400 },
      );
    }

    const adolescente = await prisma.adolescente.findUnique({
      where: { id: adolescenteId },
      include: {
        alojamentoAtual: {
          include: {
            casa: true,
          },
        },
      },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 },
      );
    }

    if (adolescente.statusUnidade !== "ATIVO") {
      return NextResponse.json(
        { erro: "Apenas adolescentes ativos podem ser alocados" },
        { status: 400 },
      );
    }

    const origemAlojamentoAtualId = adolescente.alojamentoAtualId ?? null;
    const ehTransferenciaInterna = Boolean(origemAlojamentoAtualId);
    const motivoTransferenciaExigido =
      ehTransferenciaInterna && motivoTransferenciaObrigatorio;

    if (motivoTransferenciaExigido && motivoTransferencia.length === 0) {
      return NextResponse.json(
        { erro: "Informe o motivo da transferencia de alojamento." },
        { status: 400 },
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const origemAlojamentoId = origemAlojamentoAtualId;
      const origemCasaId = adolescente.alojamentoAtual?.casa?.id ?? null;

      const adolescenteAtualizado = await tx.adolescente.update({
        where: { id: adolescenteId },
        data: {
          alojamentoAtualId: alojamentoId,
          atualizadoEm: new Date(),
        },
        include: {
          alojamentoAtual: {
            include: {
              casa: true,
            },
          },
        },
      });

      let decisao: { id: string } | null = null;
      if (requerJustificativa) {
        decisao = await tx.decisaoOperacional.create({
          data: {
            operadorId,
            tipoOperacao: "ALOCAR_ALOJAMENTO",
            adolescenteId,
            alojamentoId,
            nivelAlerta: nivelRisco === null ? null : String(nivelRisco),
            conflitosDetectados: alertas.filter((alerta) =>
              ensureString(alerta?.tipo).includes("CONFLITO"),
            ),
            justificativaOperador: justificativa,
            medidasAdicionais,
            status: "EXECUTADO",
          },
          select: { id: true },
        });
      }

      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "ALOCACAO",
          tabelaAfetada: "adolescentes",
          registroIdAfetado: adolescenteId,
          detalhesAlteracao: {
            alojamento_anterior: adolescente.alojamentoAtualId,
            alojamento_novo: alojamentoId,
            nivel_risco: nivelRisco,
            alertas_count: alertas.length,
            justificativa: justificativa || null,
            motivo_transferencia: motivoTransferencia || null,
          },
          ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
        },
      });

      const descricaoTransferencia =
        motivoTransferencia ||
        justificativa ||
        `Movimentado para ${alojamento.casa.nome ?? "Casa"} ${
          alojamento.numeroAlojamento
        }`;

      await registrarMovimentacao(tx, {
        adolescenteId,
        tipo: origemAlojamentoId ? "TRANSFERENCIA_INTERNA" : "ALOCACAO",
        descricao: descricaoTransferencia,
        origemCasaId,
        origemAlojamentoId,
        destinoCasaId: alojamento.casaId,
        destinoAlojamentoId: alojamentoId,
        referenciaTipo: decisao ? "DECISAO_OPERACIONAL" : null,
        referenciaId: decisao?.id ?? null,
        operadorId,
      });

      return { adolescenteAtualizado, decisao };
    });

    emitMapaEvent({
      tipo: "alocacao",
      adolescenteId,
      alojamentoId,
    });

    invalidateAdolescentesMapaCache();
    invalidateEstruturaSnapshot();

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: "Adolescente alocado com sucesso",
        documentado: requerJustificativa,
        adolescente: {
          id: resultado.adolescenteAtualizado.id,
          nome: resultado.adolescenteAtualizado.nomeCompleto,
          alojamento: {
            casa: resultado.adolescenteAtualizado.alojamentoAtual?.casa.nome,
            numero:
              resultado.adolescenteAtualizado.alojamentoAtual?.numeroAlojamento,
            ala: resultado.adolescenteAtualizado.alojamentoAtual?.ala,
          },
        },
        decisao_id: resultado.decisao?.id ?? null,
        nivel_risco: nivelRisco,
        alertas_processados: alertas.length,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        erro: "Erro ao alocar adolescente",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const operadorId = ensureString(session?.user?.id);

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 },
      );
    }

    const operadorValido = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true, funcaoRole: true },
    });

    if (!operadorValido) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 },
      );
    }

    const permissoes = resolveUserPermissions(session, operadorValido);
    if (!hasPermission(permissoes, PERMISSIONS.ESTRUTURA_EDIT)) {
      return NextResponse.json(
        { erro: "Sem permissao para alterar a estrutura" },
        { status: 403 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    let body: Record<string, unknown> | null = null;
    if (contentType.includes("application/json")) {
      body = await request.json().catch(() => null);
    }

    const queryId = ensureString(
      request.nextUrl.searchParams.get("adolescenteId"),
    );
    const bodyId = ensureString(body?.adolescenteId);
    const adolescenteId = queryId || bodyId;

    if (!adolescenteId) {
      return NextResponse.json(
        { erro: "adolescenteId e obrigatorio" },
        { status: 400 },
      );
    }

    const motivo = ensureString(body?.motivo);

    const adolescente = await prisma.adolescente.findUnique({
      where: { id: adolescenteId },
      include: {
        alojamentoAtual: {
          include: {
            casa: true,
          },
        },
      },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente nao encontrado" },
        { status: 404 },
      );
    }

    if (!adolescente.alojamentoAtualId) {
      return NextResponse.json(
        { erro: "Adolescente ja esta sem alojamento" },
        { status: 400 },
      );
    }

    const alojamentoAnterior = adolescente.alojamentoAtual;

    await prisma.$transaction(async (tx) => {
      await tx.adolescente.update({
        where: { id: adolescenteId },
        data: {
          alojamentoAtualId: null,
        },
      });

      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "REMOCAO_ALOCACAO",
          tabelaAfetada: "adolescentes",
          registroIdAfetado: adolescenteId,
          detalhesAlteracao: {
            alojamento_removido: alojamentoAnterior?.id ?? null,
            casa: alojamentoAnterior?.casa.nome ?? null,
            numero: alojamentoAnterior?.numeroAlojamento ?? null,
            motivo: motivo || null,
          },
          ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
        },
      });

      if (alojamentoAnterior) {
        await registrarMovimentacao(tx, {
          adolescenteId,
          tipo: "DESALOCACAO",
          descricao: motivo || "Remoção de alojamento",
          origemCasaId: alojamentoAnterior.casa?.id ?? null,
          origemAlojamentoId: alojamentoAnterior.id,
          operadorId,
        });
      }
    });

    emitMapaEvent({
      tipo: "desalocacao",
      adolescenteId,
      alojamentoId: null,
    });

    invalidateAdolescentesMapaCache();
    invalidateEstruturaSnapshot();

    return NextResponse.json({
      sucesso: true,
      mensagem: "Adolescente removido do alojamento",
      alojamento_liberado: {
        casa: alojamentoAnterior?.casa.nome ?? null,
        numero: alojamentoAnterior?.numeroAlojamento ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        erro: "Erro ao remover alocação",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
