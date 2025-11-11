import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/comunicados
 * Lista comunicados internos com filtros
 *
 * Query params:
 * - tipo: filtro por tipo de CI
 * - ano: filtro por ano
 * - limit: limite de resultados (padrão: 50)
 * - offset: paginação (padrão: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const tipo = searchParams.get("tipo");
    const ano = searchParams.get("ano");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Construir filtros
    const where: any = {};

    if (tipo) {
      where.tipoCI = tipo;
    }

    if (ano) {
      where.ano = parseInt(ano);
    }

    // Buscar comunicados
    const [comunicados, total] = await Promise.all([
      prisma.comunicadoInterno.findMany({
        where,
        include: {
          operador: {
            select: {
              id: true,
              nome: true,
            },
          },
          adolescentes: {
            include: {
              adolescente: {
                select: {
                  id: true,
                  nomeCompleto: true,
                  numeroSms: true,
                },
              },
            },
          },
          conflitos: {
            select: {
              id: true,
              status: true,
            },
          },
          alertasAtivos: {
            select: {
              id: true,
              desativadoEm: true,
            },
          },
        },
        orderBy: [{ ano: "desc" }, { numero: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.comunicadoInterno.count({ where }),
    ]);

    // Formatar resposta
    const comunicadosFormatados = comunicados.map((ci) => ({
      id: ci.id,
      numero: ci.numero,
      ano: ci.ano,
      dataFato: ci.dataFato.toISOString().split("T")[0],
      tipoCi: ci.tipoCI,
      resumoCi: ci.resumoCI,
      caminhoPdf: ci.caminhoPdf,
      operador: ci.operador
        ? {
            id: ci.operador.id,
            nome: ci.operador.nome,
          }
        : null,
      adolescentes: ci.adolescentes.map((link) => ({
        id: link.adolescente.id,
        nome: link.adolescente.nomeCompleto,
        numeroSms: link.adolescente.numeroSms,
      })),
      criadoEm: ci.criadoEm.toISOString(),
      temConflito: ci.conflitos.length > 0,
      temAlerta:
        ci.alertasAtivos.filter((a) => a.desativadoEm === null).length > 0,
    }));

    return NextResponse.json({
      comunicados: comunicadosFormatados,
      total,
      filtros: {
        tipo,
        ano,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar comunicados:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar comunicados" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/comunicados
 * Cria novo comunicado interno
 *
 * GERA AUTOMATICAMENTE:
 * - Conflitos (se tipo = CONFLITO e houver 2+ adolescentes)
 * - Alertas (se tipo = SAUDE, DISCIPLINAR grave, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      numero,
      ano,
      dataFato,
      tipoCI,
      resumoCI,
      caminhoPdf,
      operadorId,
      adolescentesIds,
      gerarConflito,
      gerarAlerta,
      nivelRiscoAlerta,
    } = body;

    // Validações
    if (!numero || !ano) {
      return NextResponse.json(
        { erro: "Número e ano são obrigatórios" },
        { status: 400 }
      );
    }

    if (!dataFato) {
      return NextResponse.json(
        { erro: "Data do fato é obrigatória" },
        { status: 400 }
      );
    }

    if (!tipoCI) {
      return NextResponse.json(
        { erro: "Tipo de CI é obrigatório" },
        { status: 400 }
      );
    }

    if (!resumoCI || resumoCI.trim().length === 0) {
      return NextResponse.json(
        { erro: "Resumo do CI é obrigatório" },
        { status: 400 }
      );
    }

    if (!adolescentesIds || adolescentesIds.length === 0) {
      return NextResponse.json(
        { erro: "Pelo menos um adolescente deve ser vinculado" },
        { status: 400 }
      );
    }

    // Verificar se já existe CI com mesmo número/ano
    const ciExistente = await prisma.comunicadoInterno.findUnique({
      where: {
        numero_ano: {
          numero: parseInt(numero),
          ano: parseInt(ano),
        },
      },
    });

    if (ciExistente) {
      return NextResponse.json(
        { erro: `CI ${numero}/${ano} já existe` },
        { status: 400 }
      );
    }

    // Criar CI em transação
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Criar comunicado interno
      const ci = await tx.comunicadoInterno.create({
        data: {
          numero: parseInt(numero),
          ano: parseInt(ano),
          dataFato: new Date(dataFato),
          tipoCI,
          resumoCI: resumoCI.trim(),
          caminhoPdf: caminhoPdf || null,
          operadorId: operadorId || null,
        },
      });

      // 2. Vincular adolescentes
      await tx.comunicadoInternoAdolescente.createMany({
        data: adolescentesIds.map((adolescenteId: string) => ({
          ciId: ci.id,
          adolescenteId,
        })),
      });

      // 3. Gerar conflitos automaticamente
      const conflitosGerados: string[] = [];

      if (
        (gerarConflito === true || tipoCI === "CONFLITO") &&
        adolescentesIds.length >= 2
      ) {
        // Criar conflito entre o primeiro adolescente e todos os outros
        for (let i = 1; i < adolescentesIds.length; i++) {
          const conflito = await tx.conflito.create({
            data: {
              adolescenteAId: adolescentesIds[0],
              adolescenteBId: adolescentesIds[i],
              tipoConflito: "CI_" + tipoCI,
              status: "ATIVO",
              ciOrigemId: ci.id,
              descricao: `Conflito registrado via CI ${numero}/${ano}: ${resumoCI.substring(0, 100)}`,
            },
          });
          conflitosGerados.push(conflito.id);
        }
      }

      // 4. Gerar alertas automaticamente
      const alertasGerados: string[] = [];
      const tiposQueGeramAlerta = [
        "SAUDE",
        "DISCIPLINAR",
        "RISCO_SUICIDIO",
        "FUGA",
        "AGRESSAO",
      ];

      if (
        gerarAlerta === true ||
        tiposQueGeramAlerta.includes(tipoCI)
      ) {
        // Criar alerta para cada adolescente envolvido
        for (const adolescenteId of adolescentesIds) {
          const nivelRisco =
            nivelRiscoAlerta ||
            (tipoCI === "RISCO_SUICIDIO" ? "CRITICO" : tipoCI === "FUGA" ? "ALTO" : tipoCI === "SAUDE" ? "ALTO" : "MEDIO");

          const tipoAlerta =
            tipoCI === "SAUDE"
              ? "SAUDE"
              : tipoCI === "DISCIPLINAR"
              ? "COMPORTAMENTAL"
              : tipoCI === "RISCO_SUICIDIO"
              ? "RISCO_SUICIDIO"
              : "GERAL";

          const alerta = await tx.alertaAtivo.create({
            data: {
              adolescenteId,
              ciOrigemId: ci.id,
              tipoAlerta,
              descricaoAlerta: `Alerta gerado por CI ${numero}/${ano} (${tipoCI}): ${resumoCI}`,
              nivelRisco,
            },
          });
          alertasGerados.push(alerta.id);
        }
      }

      return {
        ci,
        conflitosGerados,
        alertasGerados,
      };
    });

    return NextResponse.json(
      {
        comunicado: resultado.ci,
        conflitosGerados: resultado.conflitosGerados.length,
        alertasGerados: resultado.alertasGerados.length,
        mensagem: `CI criado com sucesso! ${resultado.conflitosGerados.length} conflito(s) e ${resultado.alertasGerados.length} alerta(s) gerado(s) automaticamente.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar comunicado:", error);
    return NextResponse.json(
      { erro: "Erro ao criar comunicado" },
      { status: 500 }
    );
  }
}
