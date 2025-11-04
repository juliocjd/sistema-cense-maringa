// app/api/decisoes-operacionais/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/decisoes-operacionais - Listar decisões operacionais
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filtros disponíveis
    const operadorId = searchParams.get("operador_id");
    const tipoOperacao = searchParams.get("tipo_operacao");
    const adolescenteId = searchParams.get("adolescente_id");
    const grupoId = searchParams.get("grupo_id");
    const alojamentoId = searchParams.get("alojamento_id");
    const nivelAlerta = searchParams.get("nivel_alerta");
    const status = searchParams.get("status");
    const dataInicio = searchParams.get("data_inicio");
    const dataFim = searchParams.get("data_fim");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Construir query dinâmica
    const where: any = {};

    if (operadorId) {
      where.operadorId = operadorId;
    }

    if (tipoOperacao) {
      where.tipoOperacao = tipoOperacao;
    }

    if (adolescenteId) {
      where.adolescenteId = adolescenteId;
    }

    if (grupoId) {
      where.grupoId = grupoId;
    }

    if (alojamentoId) {
      where.alojamentoId = alojamentoId;
    }

    if (nivelAlerta) {
      where.nivelAlerta = nivelAlerta;
    }

    if (status) {
      where.status = status;
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

    // Buscar decisões com paginação
    const [decisoes, total] = await Promise.all([
      prisma.decisaoOperacional.findMany({
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
          adolescente: {
            select: {
              id: true,
              nomeCompleto: true,
              nomeSocial: true,
              numeroSms: true,
              statusUnidade: true,
            },
          },
          grupo: {
            select: {
              id: true,
              nomeGrupo: true,
              casa: {
                select: {
                  id: true,
                  nome: true,
                  numero: true,
                },
              },
            },
          },
        },
        orderBy: {
          dataHora: "desc",
        },
      }),
      prisma.decisaoOperacional.count({ where }),
    ]);

    // Formatar resposta
    const decisoesFormatadas = decisoes.map((decisao) => ({
      id: decisao.id,
      dataHora: decisao.dataHora,
      tipoOperacao: decisao.tipoOperacao,
      nivelAlerta: decisao.nivelAlerta,
      conflitosDetectados: decisao.conflitosDetectados,
      justificativaOperador: decisao.justificativaOperador,
      medidasAdicionais: decisao.medidasAdicionais,
      status: decisao.status,

      // Operador
      operador: decisao.operador
        ? {
            id: decisao.operador.id,
            nome: decisao.operador.nomeCompleto,
            email: decisao.operador.email,
            funcao: decisao.operador.funcaoRole,
          }
        : null,

      // Adolescente envolvido
      adolescente: decisao.adolescente
        ? {
            id: decisao.adolescente.id,
            nomeCompleto: decisao.adolescente.nomeCompleto,
            nomeSocial: decisao.adolescente.nomeSocial,
            numeroSms: decisao.adolescente.numeroSms,
            statusUnidade: decisao.adolescente.statusUnidade,
          }
        : null,

      // Grupo envolvido
      grupo: decisao.grupo
        ? {
            id: decisao.grupo.id,
            nomeGrupo: decisao.grupo.nomeGrupo,
            casa: {
              id: decisao.grupo.casa.id,
              nome: decisao.grupo.casa.nome,
              numero: decisao.grupo.casa.numero,
            },
          }
        : null,

      // Alojamento ID (não há relação direta no schema)
      alojamentoId: decisao.alojamentoId,
    }));

    return NextResponse.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      decisoes: decisoesFormatadas,
    });
  } catch (error) {
    console.error("Erro ao buscar decisões operacionais:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar decisões operacionais",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
