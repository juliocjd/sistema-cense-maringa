// app/api/log-auditoria/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";

// GET /api/log-auditoria - Listar logs de auditoria
export async function GET(request: NextRequest) {
  try {
    const session = await auth().catch((error) => {
      console.error("Erro ao obter sessao do auth:", error);
      return null;
    });
    const operadorId = session?.user?.id ?? null;
    const roleSessao = session?.user?.cargo ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operador = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { funcaoRole: true },
    });

    const roleEfetiva = operador?.funcaoRole ?? roleSessao;
    if (roleEfetiva !== "ADMIN") {
      return NextResponse.json(
        { erro: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Filtros disponíveis
    const operadorIdFiltro = searchParams.get("operador_id");
    const acao = searchParams.get("acao"); // INSERT, UPDATE, DELETE
    const tabela = searchParams.get("tabela");
    const registroId = searchParams.get("registro_id");
    const dataInicio = searchParams.get("data_inicio");
    const dataFim = searchParams.get("data_fim");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Construir query dinâmica
    const where: any = {};

    if (operadorIdFiltro) {
      where.operadorId = operadorIdFiltro
    }

    if (acao) {
      where.acao = acao;
    }

    if (tabela) {
      where.tabelaAfetada = tabela;
    }

    if (registroId) {
      where.registroIdAfetado = registroId;
    }

    // Filtro por data
    if (dataInicio || dataFim) {
      where.dataHora = {};
      if (dataInicio) {
        where.dataHora.gte = new Date(dataInicio);
      }
      if (dataFim) {
        where.dataHora.lte = new Date(dataFim);
      }
    }

    // Buscar logs com paginação
    const [logs, total] = await Promise.all([
      prisma.logAuditoria.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          operador: {
            select: {
              id: true,
              nomeCompleto: true,
              email: true,
              funcaoRole: true,
            },
          },
        },
        orderBy: {
          dataHora: "desc",
        },
      }),
      prisma.logAuditoria.count({ where }),
    ]);

    // Formatar resposta
    const logsFormatados = logs.map((log) => ({
      id: log.id,
      dataHora: log.dataHora,
      acao: log.acao,
      tabelaAfetada: log.tabelaAfetada,
      registroIdAfetado: log.registroIdAfetado,
      detalhesAlteracao: log.detalhesAlteracao,
      ipOrigem: log.ipOrigem,
      operador: log.operador
        ? {
            id: log.operador.id,
            nome: log.operador.nomeCompleto,
            email: log.operador.email,
            funcao: log.operador.funcaoRole,
          }
        : null,
    }));

    return NextResponse.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs: logsFormatados,
    });
  } catch (error) {
    console.error("Erro ao buscar logs de auditoria:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar logs de auditoria",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}




