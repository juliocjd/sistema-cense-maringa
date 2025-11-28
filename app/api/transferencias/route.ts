import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";
import { registrarMovimentacao } from "@/lib/historico/movimentacao";
import {
  MOVIMENTACAO_ADOLESCENTE_SELECT,
  type MovimentacaoAdolescenteContext,
  extrairOrigemMovimentacao,
} from "@/lib/historico/contexto-adolescente";
import {
  TRANSFERENCIA_STATUS,
  type TransferenciaStatus,
  type TransferenciaComRelacoes,
  buildTransferenciaInclude,
  mapTransferencia,
  sanitizeStringArray,
} from "@/lib/transferencias/mappers";

const STATUS_SET = new Set<string>(TRANSFERENCIA_STATUS);

const createTransferenciaSchema = z.object({
  adolescenteId: z
    .string()
    .uuid("adolescenteId invalido"),
  motivoPrincipal: z
    .string()
    .min(5, "motivoPrincipal deve ter no minimo 5 caracteres"),
  unidadesSugeridas: z
    .array(z.string().min(2).max(255))
    .min(1, "Informe ao menos uma unidade sugerida"),
  observacoesAdicionais: z.string().max(2000).optional().nullable(),
  relatorioGeradoPath: z.string().max(2048).optional().nullable(),
});

const parseJsonBody = async (request: NextRequest) => {
  try {
    return await request.json();
  } catch {
    throw new NextResponse(
      JSON.stringify({ erro: "Payload invalido: esperado JSON" }),
      { status: 400 }
    );
  }
};

const ensureAdolescenteExiste = async (
  adolescenteId: string
): Promise<MovimentacaoAdolescenteContext> => {
  const adolescente = await prisma.adolescente.findUnique({
    where: { id: adolescenteId },
    select: MOVIMENTACAO_ADOLESCENTE_SELECT,
  });

  if (!adolescente) {
    throw new NextResponse(
      JSON.stringify({ erro: "Adolescente nao encontrado" }),
      { status: 404 }
    );
  }

  return adolescente;
};

export async function GET(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get("busca")?.trim() ?? "";
    const adolescenteId = searchParams.get("adolescente_id")?.trim() ?? "";
    const statusParam = searchParams.get("status")?.trim() ?? "";
    const incluirHistorico = searchParams.get("incluir_historico") === "true";
    const limite = Math.min(
      Math.max(parseInt(searchParams.get("limite") ?? "50", 10), 1),
      200
    );

    let statusList: TransferenciaStatus[] = [];
    if (statusParam.length > 0) {
      statusList = statusParam
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter((item): item is TransferenciaStatus =>
          STATUS_SET.has(item)
        );
    }

    const where: Prisma.SolicitacaoTransferenciaWhereInput = {};

    if (statusList.length > 0) {
      where.status = { in: statusList };
    }

    if (adolescenteId.length > 0) {
      where.adolescenteId = adolescenteId;
    }

    if (busca.length > 0) {
      where.OR = [
        {
          adolescente: {
            nomeCompleto: {
              contains: busca,
              mode: "insensitive",
            },
          },
        },
        {
          operadorSolicitante: {
            nomeCompleto: {
              contains: busca,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const transferencias =
      await prisma.solicitacaoTransferencia.findMany({
        where,
        take: limite,
        orderBy: { dataSolicitacao: "desc" },
        include: buildTransferenciaInclude({
          incluirHistorico,
        }),
      });

    return NextResponse.json({
      total: transferencias.length,
      transferencias: transferencias.map((item) =>
        mapTransferencia(
          item as unknown as TransferenciaComRelacoes,
          { incluirHistorico }
        )
      ),
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }

    console.error("Erro ao listar transferencias:", error);
    return NextResponse.json(
      {
        erro: "Erro ao listar transferencias",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;

  try {
    const rawBody = await parseJsonBody(request);
    const body = createTransferenciaSchema.parse(rawBody);

    const adolescenteContext = await ensureAdolescenteExiste(
      body.adolescenteId
    );

    const unidadesSugeridas = sanitizeStringArray(
      body.unidadesSugeridas
    );

    const transferencia = await prisma.$transaction(async (tx) => {
      const nova = await tx.solicitacaoTransferencia.create({
        data: {
          adolescenteId: body.adolescenteId,
          motivoPrincipal: body.motivoPrincipal.trim(),
          unidadesSugeridas,
          observacoesAdicionais:
            body.observacoesAdicionais?.trim() ?? null,
          relatorioGeradoPath:
            body.relatorioGeradoPath?.trim() ?? null,
          operadorSolicitanteId: operadorId,
        },
        include: buildTransferenciaInclude(),
      });

      const descricaoHistorico = [
        `Solicitada transferencia: ${body.motivoPrincipal.trim()}`,
      ];
      if (unidadesSugeridas.length > 0) {
        descricaoHistorico.push(
          `Sugeridas: ${unidadesSugeridas.join(", ")}`
        );
      }

      await registrarMovimentacao(tx, {
        adolescenteId: adolescenteContext.id,
        tipo: "SOLICITACAO_TRANSFERENCIA",
        descricao: descricaoHistorico.join(" | "),
        ...extrairOrigemMovimentacao(adolescenteContext),
        referenciaTipo: "SOLICITACAO_TRANSFERENCIA",
        referenciaId: nova.id,
        operadorId,
        registradoEm: nova.dataSolicitacao,
      });

      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "TRANSFERENCIA_CRIAR",
          tabelaAfetada: "solicitacoes_transferencia",
          registroIdAfetado: nova.id,
          detalhesAlteracao: {
            adolescenteId: body.adolescenteId,
            motivoPrincipal: body.motivoPrincipal,
            unidadesSugeridas,
          },
          ipOrigem: ip,
        },
      });

      return nova;
    });

    return NextResponse.json(
      mapTransferencia(
        transferencia as unknown as TransferenciaComRelacoes
      ),
      { status: 201 }
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

    console.error("Erro ao criar transferencia:", error);
    return NextResponse.json(
      {
        erro: "Erro ao criar transferencia",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
