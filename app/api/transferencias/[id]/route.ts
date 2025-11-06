import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import {
  TRANSFERENCIA_STATUS,
  type TransferenciaStatus,
  type TransferenciaComRelacoes,
  buildTransferenciaInclude,
  mapTransferencia,
  sanitizeStringArray,
} from "@/lib/transferencias/mappers";

const STATUS_SET = new Set<string>(TRANSFERENCIA_STATUS);

const updateTransferenciaSchema = z.object({
    motivoPrincipal: z
      .string()
      .min(5, "motivoPrincipal deve ter no minimo 5 caracteres")
      .optional(),
    unidadesSugeridas: z
      .array(z.string().min(2).max(255))
      .optional(),
    observacoesAdicionais: z.string().max(2000).optional().nullable(),
    relatorioGeradoPath: z.string().max(2048).optional().nullable(),
    status: z.string().optional(),
    decisaoJudicial: z.string().max(2000).optional().nullable(),
    dataDecisaoJudicial: z.string().optional().nullable(),
    unidadeDestinoEfetiva: z.string().max(255).optional().nullable(),
    dataTransferenciaEfetiva: z.string().optional().nullable(),
    historicoTransferencia: z
      .object({
        unidadeOrigem: z
          .string()
          .min(2, "unidadeOrigem deve ter ao menos 2 caracteres")
          .max(255),
        unidadeDestino: z
          .string()
          .min(2, "unidadeDestino deve ter ao menos 2 caracteres")
          .max(255),
        dataTransferencia: z.string(),
        motivo: z.string().max(2000).optional().nullable(),
        conflitosNaOrigem: z
          .number()
          .int()
          .min(0)
          .optional()
          .nullable(),
      })
      .optional(),
  });

const parseJsonBody = async (request: NextRequest) => {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength !== null && contentLength.trim() === "0") {
      return {};
    }
    return await request.json();
  } catch {
    throw new NextResponse(
      JSON.stringify({ erro: "Payload invalido: esperado JSON" }),
      { status: 400 }
    );
  }
};

const parseOptionalDateTime = (
  value: string | null | undefined,
  field: string
): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new NextResponse(
      JSON.stringify({ erro: `${field} invalido` }),
      { status: 400 }
    );
  }
  return parsed;
};

const parseRequiredDate = (
  value: string | null | undefined,
  field: string
): Date => {
  if (!value || value.trim().length === 0) {
    throw new NextResponse(
      JSON.stringify({ erro: `${field} obrigatorio` }),
      { status: 400 }
    );
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new NextResponse(
      JSON.stringify({ erro: `${field} invalido` }),
      { status: 400 }
    );
  }
  return parsed;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await params;

  try {
    const transferencia = await prisma.solicitacaoTransferencia.findUnique({
      where: { id },
      include: buildTransferenciaInclude({ incluirHistorico: true }),
    });

    if (!transferencia) {
      return NextResponse.json(
        { erro: "Transferencia nao encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      mapTransferencia(
        transferencia as unknown as TransferenciaComRelacoes,
        {
          incluirHistorico: true,
        }
      )
    );
  } catch (error) {
    console.error("Erro ao buscar transferencia:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar transferencia",
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
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;
  const { id } = await params;

  try {
    const existente = await prisma.solicitacaoTransferencia.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        adolescenteId: true,
        decisaoJudicial: true,
        dataDecisaoJudicial: true,
        unidadeDestinoEfetiva: true,
        dataTransferenciaEfetiva: true,
      },
    });

    if (!existente) {
      return NextResponse.json(
        { erro: "Transferencia nao encontrada" },
        { status: 404 }
      );
    }

    const rawBody = await parseJsonBody(request);
    const body = updateTransferenciaSchema.parse(rawBody);

    const updateData: Prisma.SolicitacaoTransferenciaUpdateInput = {};
    const detalhesLog: Record<string, unknown> = {};

    if (body.motivoPrincipal !== undefined) {
      updateData.motivoPrincipal = body.motivoPrincipal.trim();
      detalhesLog.motivoPrincipal = body.motivoPrincipal.trim();
    }

    if (body.unidadesSugeridas !== undefined) {
      const unidades = sanitizeStringArray(body.unidadesSugeridas);
      updateData.unidadesSugeridas = unidades;
      detalhesLog.unidadesSugeridas = unidades;
    }

    if (body.observacoesAdicionais !== undefined) {
      const obsTrim = body.observacoesAdicionais?.trim();
      const observacao =
        obsTrim && obsTrim.length > 0 ? obsTrim : null;
      updateData.observacoesAdicionais = observacao;
      detalhesLog.observacoesAdicionais = observacao;
    }

    if (body.relatorioGeradoPath !== undefined) {
      const pathTrim = body.relatorioGeradoPath?.trim();
      const path =
        pathTrim && pathTrim.length > 0 ? pathTrim : null;
      updateData.relatorioGeradoPath = path;
      detalhesLog.relatorioGeradoPath = path;
    }

    let novoStatus: TransferenciaStatus | undefined;
    if (body.status !== undefined) {
      const statusUpper = body.status.toUpperCase();
      if (!STATUS_SET.has(statusUpper)) {
        throw new NextResponse(
          JSON.stringify({ erro: "status invalido" }),
          { status: 400 }
        );
      }
      novoStatus = statusUpper as TransferenciaStatus;
      updateData.status = novoStatus;
      detalhesLog.status = novoStatus;
    }

    let dataDecisaoParaValidar: Date | null =
      existente.dataDecisaoJudicial ?? null;
    if (body.dataDecisaoJudicial !== undefined) {
      const dataDecisao = parseOptionalDateTime(
        body.dataDecisaoJudicial,
        "dataDecisaoJudicial"
      );
      dataDecisaoParaValidar = dataDecisao ?? null;
      updateData.dataDecisaoJudicial = dataDecisao;
      detalhesLog.dataDecisaoJudicial = dataDecisao
        ? dataDecisao.toISOString()
        : null;
    }

    let decisaoParaValidar = existente.decisaoJudicial ?? null;
    if (body.decisaoJudicial !== undefined) {
      const decisaoTrim = body.decisaoJudicial?.trim();
      const decisao =
        decisaoTrim && decisaoTrim.length > 0 ? decisaoTrim : null;
      decisaoParaValidar = decisao;
      updateData.decisaoJudicial = decisao;
      detalhesLog.decisaoJudicial = decisao;
    }

    let dataTransferenciaEfetivaParaValidar: Date | null =
      existente.dataTransferenciaEfetiva ?? null;
    if (body.dataTransferenciaEfetiva !== undefined) {
      const dataTransferenciaEfetiva = parseOptionalDateTime(
        body.dataTransferenciaEfetiva,
        "dataTransferenciaEfetiva"
      );
      dataTransferenciaEfetivaParaValidar =
        dataTransferenciaEfetiva ?? null;
      updateData.dataTransferenciaEfetiva =
        dataTransferenciaEfetiva;
      detalhesLog.dataTransferenciaEfetiva =
        dataTransferenciaEfetiva
          ? dataTransferenciaEfetiva.toISOString()
          : null;
    }

    let unidadeDestinoEfetivaParaValidar =
      existente.unidadeDestinoEfetiva?.trim() ?? null;
    if (body.unidadeDestinoEfetiva !== undefined) {
      const destinoTrim = body.unidadeDestinoEfetiva?.trim();
      const destino =
        destinoTrim && destinoTrim.length > 0 ? destinoTrim : null;
      unidadeDestinoEfetivaParaValidar = destino;
      updateData.unidadeDestinoEfetiva = destino;
      detalhesLog.unidadeDestinoEfetiva = destino;
    }

    if (
      (novoStatus === "APROVADA" || novoStatus === "NEGADA") &&
      (!dataDecisaoParaValidar || !decisaoParaValidar)
    ) {
      throw new NextResponse(
        JSON.stringify({
          erro:
            "decisaoJudicial e dataDecisaoJudicial sao obrigatorios para este status",
        }),
        { status: 400 }
      );
    }

    let historicoPayload:
      | {
          unidadeOrigem: string;
          unidadeDestino: string;
          dataTransferencia: Date;
          motivo: string | null;
          conflitosNaOrigem: number | null;
        }
      | undefined;

    if (novoStatus === "TRANSFERIDA") {
      if (
        existente.status !== "TRANSFERIDA" &&
        !body.historicoTransferencia
      ) {
        throw new NextResponse(
          JSON.stringify({
            erro:
              "historicoTransferencia obrigatorio ao marcar como TRANSFERIDA",
          }),
          { status: 400 }
        );
      }

      if (!dataTransferenciaEfetivaParaValidar) {
        throw new NextResponse(
          JSON.stringify({
            erro:
              "dataTransferenciaEfetiva obrigatoria ao marcar como TRANSFERIDA",
          }),
          { status: 400 }
        );
      }

      if (
        !unidadeDestinoEfetivaParaValidar ||
        unidadeDestinoEfetivaParaValidar.length === 0
      ) {
        throw new NextResponse(
          JSON.stringify({
            erro:
              "unidadeDestinoEfetiva obrigatoria ao marcar como TRANSFERIDA",
          }),
          { status: 400 }
        );
      }

      if (body.historicoTransferencia) {
        const historico = body.historicoTransferencia;
        const historicoData = parseRequiredDate(
          historico.dataTransferencia,
          "historicoTransferencia.dataTransferencia"
        );

        const motivoTrim = historico.motivo?.trim();
        historicoPayload = {
          unidadeOrigem: historico.unidadeOrigem.trim(),
          unidadeDestino: historico.unidadeDestino.trim(),
          dataTransferencia: historicoData,
          motivo:
            motivoTrim && motivoTrim.length > 0 ? motivoTrim : null,
          conflitosNaOrigem:
            historico.conflitosNaOrigem ?? null,
        };
      }
    }

    const hasUpdates =
      Object.keys(updateData).length > 0 ||
      historicoPayload !== undefined;

    if (!hasUpdates) {
      return NextResponse.json(
        { erro: "Nenhum campo informado para atualizar" },
        { status: 400 }
      );
    }

    const transferenciaAtualizada = await prisma.$transaction(
      async (tx) => {
        const atualizada = await tx.solicitacaoTransferencia.update({
          where: { id },
          data: updateData,
          include: buildTransferenciaInclude({
            incluirHistorico: true,
          }),
        });

        if (
          historicoPayload &&
          existente.status !== "TRANSFERIDA"
        ) {
          await tx.historicoTransferencia.create({
            data: {
              adolescenteId: existente.adolescenteId,
              unidadeOrigem: historicoPayload.unidadeOrigem,
              unidadeDestino: historicoPayload.unidadeDestino,
              dataTransferencia: historicoPayload.dataTransferencia,
              motivo: historicoPayload.motivo,
              conflitosNaOrigem: historicoPayload.conflitosNaOrigem,
              relatorioTransferenciaId: atualizada.id,
            },
          });
        }

        await tx.logAuditoria.create({
          data: {
            operadorId,
            acao: "TRANSFERENCIA_ATUALIZAR",
            tabelaAfetada: "solicitacoes_transferencia",
            registroIdAfetado: id,
            detalhesAlteracao: detalhesLog as Prisma.InputJsonValue,
            ipOrigem: ip,
          },
        });

        return atualizada;
      }
    );

    return NextResponse.json(
      mapTransferencia(
        transferenciaAtualizada as unknown as TransferenciaComRelacoes,
        {
          incluirHistorico: true,
        }
      )
    );
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados invalidos", detalhes: error.flatten() },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar transferencia:", error);
    return NextResponse.json(
      {
        erro: "Erro ao atualizar transferencia",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
