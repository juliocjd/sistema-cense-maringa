import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import {
  aplicarAlertasEspeciais,
  atualizarFlagsAlertasEspeciais,
  ehAlertaEspecial,
  mapearTipoEspecialPorCodigo,
} from "@/lib/alertas/sincronizar-especiais";
import { normalizarNivelRisco } from "@/lib/alertas/especiais";
import {
  registrarRiscoFugaAutomatico,
  textoIndicaFuga,
} from "@/lib/adolescentes/risco-fuga";
import { invalidateAdolescentesMapaCache } from "@/lib/estrutura/adolescentes-cache";
import { invalidateEstruturaSnapshot } from "@/lib/estrutura/snapshot";

const prisma = new PrismaClient();

const ALERTA_INCLUDE = {
  adolescente: {
    select: {
      id: true,
      nomeCompleto: true,
      nomeSocial: true,
      numeroSms: true,
    },
  },
  ciOrigem: {
    select: {
      id: true,
      numero: true,
      resumoCI: true,
      tipoCI: true,
    },
  },
} as const;

const obterIpOrigem = (request: NextRequest | Request) =>
  request.headers.get("x-forwarded-for") ||
  request.headers.get("cf-connecting-ip") ||
  "unknown";

const mapearOperadoresCriadores = async (ids: string[]) => {
  if (ids.length === 0) {
    return new Map<
      string,
      { id: string; nomeCompleto: string }
    >();
  }

  const logs = await prisma.logAuditoria.findMany({
    where: {
      tabelaAfetada: "alertas_ativos",
      acao: "INSERT",
      registroIdAfetado: { in: ids },
    },
    orderBy: {
      dataHora: "asc",
    },
    select: {
      registroIdAfetado: true,
      operador: {
        select: {
          id: true,
          nomeCompleto: true,
        },
      },
    },
  });

  const mapa = new Map<string, { id: string; nomeCompleto: string }>();
  logs.forEach((log) => {
    const chave = log.registroIdAfetado;
    if (!chave || mapa.has(chave) || !log.operador) {
      return;
    }
    mapa.set(chave, {
      id: log.operador.id,
      nomeCompleto: log.operador.nomeCompleto,
    });
  });
  return mapa;
};

/**
 * GET /api/alertas
 * Lista alertas ativos com filtros
 *
 * Query params:
 * - status: 'ATIVO' | 'DESATIVADO' | 'TODOS' (padr?o: ATIVO)
 * - tipoAlerta: filtro por tipo
 * - nivelRisco: filtro por n?vel de risco
 * - casaId: filtro por casa
 * - adolescenteId: filtro direto por adolescente
 * - numeroAdolescente: filtra pelo n?mero do adolescente (SMS)
 * - limit: limite de resultados (padr?o: 100)
 * - offset: pagina??o (padr?o: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || "ATIVO";
    const tipoAlerta = searchParams.get("tipoAlerta");
    const nivelRisco = searchParams.get("nivelRisco");
    const casaId = searchParams.get("casaId");
    const adolescenteId = searchParams.get("adolescenteId");
    const numeroAdolescente = searchParams.get("numeroAdolescente");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Construir filtros
    const where: any = {};

    // Filtro de status
    if (status === "ATIVO") {
      where.desativadoEm = null;
    } else if (status === "DESATIVADO") {
      where.desativadoEm = { not: null };
    }
    // Se status === "TODOS", não adiciona filtro

    // Filtros opcionais
    if (tipoAlerta) {
      where.tipoAlerta = tipoAlerta;
    }

    if (nivelRisco) {
      where.nivelRisco = nivelRisco;
    }

    if (adolescenteId) {
      where.adolescenteId = adolescenteId;
    }

    if (numeroAdolescente) {
      where.adolescente = {
        ...(where.adolescente ?? {}),
        numeroSms: numeroAdolescente,
      };
    }

    // Filtro por casa (através do adolescente)
    if (casaId) {
      where.adolescente = {
        ...(where.adolescente ?? {}),
        alojamentoAtual: {
          ...(where.adolescente?.alojamentoAtual ?? {}),
          casaId: casaId,
        },
      };
    }

    // Buscar alertas
    const [alertas, total] = await Promise.all([
      prisma.alertaAtivo.findMany({
        where,
        include: {
          ...ALERTA_INCLUDE,
          adolescente: {
            select: {
              ...ALERTA_INCLUDE.adolescente.select,
              fotoUrl: true,
              statusUnidade: true,
              alojamentoAtual: {
                select: {
                  id: true,
                  numeroAlojamento: true,
                  ala: true,
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
          },
        },
        orderBy: [
          { nivelRisco: "desc" },
          { criadoEm: "desc" },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.alertaAtivo.count({ where }),
    ]);

    const operadoresMap = await mapearOperadoresCriadores(
      alertas.map((alerta) => alerta.id)
    );
    const alertasFormatados = alertas.map((alerta) => ({
      ...alerta,
      operadorResponsavel: operadoresMap.get(alerta.id) ?? null,
    }));

    // Estatísticas
    const stats = await prisma.alertaAtivo.groupBy({
      by: ["nivelRisco"],
      where: { desativadoEm: null },
      _count: true,
    });

    // Estatísticas por tipo
    const statsTipo = await prisma.alertaAtivo.groupBy({
      by: ["tipoAlerta"],
      where: { desativadoEm: null },
      _count: true,
    });

    const estatisticas = {
      totalAtivos: stats.reduce((acc, item) => acc + item._count, 0),
      porNivel: stats.reduce((acc, item) => {
        acc[item.nivelRisco || "SEM_NIVEL"] = item._count;
        return acc;
      }, {} as Record<string, number>),
      porTipo: statsTipo.reduce((acc, item) => {
        acc[item.tipoAlerta || "SEM_TIPO"] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json({
      alertas: alertasFormatados,
      total,
      estatisticas,
      filtros: {
        status,
        tipoAlerta,
        nivelRisco,
        casaId,
        adolescenteId,
        numeroAdolescente,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar alertas:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar alertas" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alertas
 * Cria novo alerta ativo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      adolescenteId,
      ciOrigemId,
      tipoAlerta,
      descricaoAlerta,
      nivelRisco,
    } = body;
    const nivelRiscoNormalizado = normalizarNivelRisco(nivelRisco);
    const session = await auth().catch(() => null);
    const operadorId = session?.user?.id ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador não autenticado" },
        { status: 401 }
      );
    }

    const operador = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: {
        id: true,
        nomeCompleto: true,
      },
    });

    if (!operador) {
      return NextResponse.json(
        { erro: "Operador não autorizado" },
        { status: 403 }
      );
    }

    const ipOrigem = obterIpOrigem(request);

    // Validações
    if (!adolescenteId) {
      return NextResponse.json(
        { erro: "adolescenteId é obrigatório" },
        { status: 400 }
      );
    }

    if (!descricaoAlerta || descricaoAlerta.trim().length === 0) {
      return NextResponse.json(
        { erro: "descricaoAlerta é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se adolescente existe
    const adolescente = await prisma.adolescente.findUnique({
      where: { id: adolescenteId },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado" },
        { status: 404 }
      );
    }

    const tipoEspecial = mapearTipoEspecialPorCodigo(tipoAlerta);

    if (tipoEspecial) {
      await aplicarAlertasEspeciais(prisma, adolescenteId, [
        {
          tipo: tipoEspecial,
          descricao: descricaoAlerta,
          nivelRisco: nivelRiscoNormalizado ?? undefined,
        },
      ], {
        operadorId: operador.id,
        ipOrigem,
      });

      const alertaEspecial = await prisma.alertaAtivo.findFirst({
        where: {
          adolescenteId,
          tipoAlerta,
          desativadoEm: null,
        },
        orderBy: { criadoEm: "desc" },
        include: ALERTA_INCLUDE,
      });

      if (!alertaEspecial) {
        throw new Error("Falha ao sincronizar alerta especial");
      }

      invalidateAdolescentesMapaCache();
      invalidateEstruturaSnapshot();

      return NextResponse.json(
        {
          ...alertaEspecial,
          operadorResponsavel: {
            id: operador.id,
            nomeCompleto: operador.nomeCompleto,
          },
        },
        { status: 201 }
      );
    }

    const alerta = await prisma.alertaAtivo.create({
      data: {
        adolescenteId,
        ciOrigemId: ciOrigemId || null,
        tipoAlerta: tipoAlerta || null,
        descricaoAlerta: descricaoAlerta.trim(),
        nivelRisco: nivelRiscoNormalizado ?? null,
      },
      include: ALERTA_INCLUDE,
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId: operador.id,
        acao: "INSERT",
        tabelaAfetada: "alertas_ativos",
        registroIdAfetado: alerta.id,
        detalhesAlteracao: {
          tipoAlerta: alerta.tipoAlerta,
          nivelRisco: alerta.nivelRisco,
        },
        ipOrigem,
      },
    });

    if (ehAlertaEspecial(alerta.tipoAlerta)) {
      await atualizarFlagsAlertasEspeciais(prisma, alerta.adolescenteId);
    }

    invalidateAdolescentesMapaCache();
    invalidateEstruturaSnapshot();

    const alertaIndicaFuga =
      textoIndicaFuga(tipoAlerta) || textoIndicaFuga(descricaoAlerta);

    if (alertaIndicaFuga) {
      await registrarRiscoFugaAutomatico(prisma, {
        adolescenteId,
        descricao: `Risco elevado apos alerta: ${descricaoAlerta.trim()}`,
        referenciaTipo: "ALERTA",
        referenciaId: alerta.id,
        operadorId: operador.id,
        registradoEm: alerta.criadoEm ?? null,
      });
    }

    return NextResponse.json(
      {
        ...alerta,
        operadorResponsavel: {
          id: operador.id,
          nomeCompleto: operador.nomeCompleto,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar alerta:", error);
    return NextResponse.json(
      { erro: "Erro ao criar alerta" },
      { status: 500 }
    );
  }
}
