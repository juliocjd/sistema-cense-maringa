import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import { aplicarAlertasEspeciais } from "@/lib/alertas/sincronizar-especiais";
import {
  ALERTAS_ESPECIAIS,
  normalizarNivelRisco,
} from "@/lib/alertas/especiais";

const prisma = new PrismaClient();
const CI_ALERTA_ESPECIAL_MAP: Record<string, keyof typeof ALERTAS_ESPECIAIS> =
  {
    RISCO_SUICIDIO: "RISCO_SUICIDIO",
    PERFIL_MAPEADO: "PERFIL_MAPEADO",
    SAUDE_CONFIDENCIAL: "SAUDE_CONFIDENCIAL",
  };
const tiposQueGeramAlerta = [
  "SAUDE",
  "DISCIPLINAR",
  "RISCO_SUICIDIO",
  "PERFIL_MAPEADO",
  "SAUDE_CONFIDENCIAL",
  "FUGA",
  "AGRESSAO",
  "AUTORIZACAO_ESPECIAL",
];

type ComunicadosPayload = {
  numero?: string | number | null;
  ano?: string | number | null;
  dataFato?: string | null;
  tipoCI?: string | null;
  resumoCI?: string | null;
  caminhoPdf?: string | null;
  operadorId?: string | null;
  adolescentesIds?: string[] | string | null;
  ladoAIds?: string[] | string | null;
  ladoBIds?: string[] | string | null;
  gerarConflito?: boolean | string | null;
  gerarAlerta?: boolean | string | null;
  nivelRiscoAlerta?: string | null;
};

const parseAdolescentesIds = (valor: unknown): string[] => {
  if (Array.isArray(valor)) {
    return valor.map((item) => String(item));
  }
  if (typeof valor === "string") {
    const trimmed = valor.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [trimmed];
    } catch {
      return [trimmed];
    }
  }
  return [];
};

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return false;
};

const parsePayload = async (request: NextRequest): Promise<ComunicadosPayload> => {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const getString = (campo: string) => {
      const valor = formData.get(campo);
      if (typeof valor === "string") return valor;
      return valor ? String(valor) : null;
    };

    return {
      numero: getString("numero"),
      ano: getString("ano"),
      dataFato: getString("dataFato"),
      tipoCI: getString("tipoCI") ?? getString("tipoCi"),
      resumoCI: getString("resumoCI") ?? getString("resumoCi"),
      caminhoPdf: getString("caminhoPdf"),
      operadorId: getString("operadorId"),
      adolescentesIds: parseAdolescentesIds(getString("adolescentesIds")),
      ladoAIds: parseAdolescentesIds(getString("ladoAIds")),
      ladoBIds: parseAdolescentesIds(getString("ladoBIds")),
      gerarConflito: parseBoolean(getString("gerarConflito")),
      gerarAlerta: parseBoolean(getString("gerarAlerta")),
      nivelRiscoAlerta: getString("nivelRiscoAlerta"),
    };
  }

  const json = (await request.json()) as ComunicadosPayload;
  return {
    ...json,
    tipoCI: json.tipoCI ?? (json as any)?.tipoCi ?? null,
    resumoCI: json.resumoCI ?? (json as any)?.resumoCi ?? null,
    ladoAIds: json.ladoAIds ?? (json as any)?.lado1Ids ?? null,
    ladoBIds: json.ladoBIds ?? (json as any)?.lado2Ids ?? null,
  };
};

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
            include: {
              adolescenteA: {
                select: {
                  id: true,
                  nomeCompleto: true,
                  nomeSocial: true,
                  numeroSms: true,
                },
              },
              adolescenteB: {
                select: {
                  id: true,
                  nomeCompleto: true,
                  nomeSocial: true,
                  numeroSms: true,
                },
              },
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

    const operadorIds = [
      ...new Set(
        comunicados
          .map((ci) => ci.operadorId)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const operadoresMap =
      operadorIds.length > 0
        ? new Map(
            (
              await prisma.operador.findMany({
                where: { id: { in: operadorIds } },
                select: { id: true, nomeCompleto: true },
              })
            ).map((operador) => [
              operador.id,
              { id: operador.id, nome: operador.nomeCompleto },
            ])
          )
        : new Map<string, { id: string; nome: string }>();

    // Formatar resposta
    const comunicadosFormatados = comunicados.map((ci) => ({
      id: ci.id,
      numero: ci.numero,
      ano: ci.ano,
      dataFato: ci.dataFato.toISOString().split("T")[0],
      tipoCi: ci.tipoCI,
      resumoCi: ci.resumoCI,
      caminhoPdf: ci.caminhoPdf,
      operador: ci.operadorId
        ? operadoresMap.get(ci.operadorId) ?? {
            id: ci.operadorId,
            nome: "Operador nao identificado",
          }
        : null,
      adolescentes: ci.adolescentes.map((link) => ({
        id: link.adolescente.id,
        nome: link.adolescente.nomeCompleto,
        numeroSms: link.adolescente.numeroSms,
        ladoConflito: link.ladoConflito as "LADO_1" | "LADO_2" | null,
      })),
      conflitos: ci.conflitos.map((conflito) => ({
        id: conflito.id,
        status: conflito.status,
        adolescenteA: conflito.adolescenteA
          ? {
              id: conflito.adolescenteA.id,
              nome:
                conflito.adolescenteA.nomeCompleto ??
                conflito.adolescenteA.nomeSocial ??
                "Participante A",
              numeroSms: conflito.adolescenteA.numeroSms ?? "Nao informado",
            }
          : null,
        adolescenteB: conflito.adolescenteB
          ? {
              id: conflito.adolescenteB.id,
              nome:
                conflito.adolescenteB.nomeCompleto ??
                conflito.adolescenteB.nomeSocial ??
                "Participante B",
              numeroSms: conflito.adolescenteB.numeroSms ?? "Nao informado",
            }
          : null,
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
    const payload = await parsePayload(request);
    const ipOrigem =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("cf-connecting-ip") ||
      "unknown";
    const session = await auth().catch(() => null);
    const {
      numero,
      ano,
      dataFato,
      tipoCI: tipoCIEntrada,
      resumoCI,
      caminhoPdf,
      operadorId,
      adolescentesIds,
      ladoAIds,
      ladoBIds,
      gerarConflito,
      gerarAlerta,
      nivelRiscoAlerta,
    } = payload;
    const tipoCI = tipoCIEntrada ?? undefined;
    const nivelRiscoNormalizado = normalizarNivelRisco(nivelRiscoAlerta);
    const numeroInt =
      typeof numero === "number"
        ? numero
        : parseInt(String(numero ?? "").trim(), 10);
    const anoInt =
      typeof ano === "number" ? ano : parseInt(String(ano ?? "").trim(), 10);
    const adolescentesIdsArray = parseAdolescentesIds(adolescentesIds);
    const lado1Ids = parseAdolescentesIds(ladoAIds);
    const lado2Ids = parseAdolescentesIds(ladoBIds);
    const gerarConflitoBool = parseBoolean(gerarConflito);
    const deveGerarConflito =
      gerarConflito === undefined
        ? tipoCI === "CONFLITO"
        : gerarConflitoBool;
    const gerarAlertaEntrada =
      gerarAlerta === undefined ? undefined : parseBoolean(gerarAlerta);
    const deveGerarAlerta =
      gerarAlertaEntrada === undefined
        ? (tipoCI ? tiposQueGeramAlerta.includes(tipoCI) : false)
        : gerarAlertaEntrada;
    const caminhoPdfNormalizado =
      typeof caminhoPdf === "string" && caminhoPdf.trim().length > 0
        ? caminhoPdf.trim()
        : null;
    const ladoConflitoMap = new Map<string, "LADO_1" | "LADO_2">();
    lado1Ids.forEach((id) => ladoConflitoMap.set(id, "LADO_1"));
    lado2Ids.forEach((id) => ladoConflitoMap.set(id, "LADO_2"));
    if (tipoCI !== "CONFLITO") {
      ladoConflitoMap.clear();
    }

    // Validações
    if (!numeroInt || !anoInt) {
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

    if (!adolescentesIdsArray || adolescentesIdsArray.length === 0) {
      return NextResponse.json(
        { erro: "Pelo menos um adolescente deve ser vinculado" },
        { status: 400 }
      );
    }

    // Verificar se já existe CI com mesmo número/ano
    const ciExistente = await prisma.comunicadoInterno.findUnique({
      where: {
        numero_ano: {
          numero: numeroInt,
          ano: anoInt,
        },
      },
    });

    if (ciExistente) {
      return NextResponse.json(
        { erro: `CI ${numeroInt}/${anoInt} já existe` },
        { status: 400 }
      );
    }

    // Definir operador responsável:
    const operadorSessaoId =
      typeof session?.user?.id === "string" ? session.user.id : null;
    const operadorInformado =
      typeof operadorId === "string" && operadorId.trim().length > 0
        ? operadorId.trim()
        : null;
    const operadorResponsavelId = operadorInformado ?? operadorSessaoId ?? null;

    // Criar CI em transação
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Criar comunicado interno
      const ci = await tx.comunicadoInterno.create({
        data: {
          numero: numeroInt,
          ano: anoInt,
          dataFato: new Date(dataFato),
          tipoCI,
          resumoCI: resumoCI.trim(),
          caminhoPdf: caminhoPdfNormalizado,
          operadorId: operadorResponsavelId,
        },
      });

      // 2. Vincular adolescentes
      await tx.comunicadoInternoAdolescente.createMany({
        data: adolescentesIdsArray.map((adolescenteId: string) => ({
          ciId: ci.id,
          adolescenteId,
          ladoConflito:
            tipoCI === "CONFLITO"
              ? ladoConflitoMap.get(adolescenteId) ?? null
              : null,
        })),
      });

      // 3. Gerar conflitos automaticamente
      const conflitosGerados: string[] = [];

      if (deveGerarConflito && adolescentesIdsArray.length >= 2) {
        const lado1 =
          lado1Ids.length > 0
            ? lado1Ids
            : adolescentesIdsArray.length > 0
            ? [adolescentesIdsArray[0]]
            : [];
        const lado2 =
          lado2Ids.length > 0
            ? lado2Ids
            : adolescentesIdsArray.slice(1);

        const pares: Array<{ aId: string; bId: string }> = [];
        lado1.forEach((aId) => {
          lado2.forEach((bId) => {
            if (!aId || !bId || aId === bId) return;
            pares.push({ aId, bId });
          });
        });

        const condicoesExistentes =
          pares.length > 0
            ? pares.map(({ aId, bId }) => ({
                OR: [
                  { AND: [{ adolescenteAId: aId }, { adolescenteBId: bId }] },
                  { AND: [{ adolescenteAId: bId }, { adolescenteBId: aId }] },
                ],
              }))
            : [];

        const existentesSet =
          condicoesExistentes.length > 0
            ? new Set(
                (
                  await tx.conflito.findMany({
                    where: {
                      status: "ATIVO",
                      OR: condicoesExistentes,
                    },
                    select: {
                      adolescenteAId: true,
                      adolescenteBId: true,
                    },
                  })
                ).map((item) =>
                  [item.adolescenteAId, item.adolescenteBId].sort().join("|")
                )
              )
            : new Set<string>();

        const paresNovos =
          pares.length > 0
            ? pares.filter(
                ({ aId, bId }) =>
                  !existentesSet.has([aId, bId].sort().join("|"))
              )
            : [];

        const gerarDescricao = (texto: string) =>
          `Conflito registrado via CI ${numeroInt}/${anoInt}: ${texto.substring(
            0,
            100
          )}`;

        if (paresNovos.length === 0 && pares.length === 0) {
          for (let i = 1; i < adolescentesIdsArray.length; i++) {
            const conflito = await tx.conflito.create({
              data: {
                adolescenteAId: adolescentesIdsArray[0],
                adolescenteBId: adolescentesIdsArray[i],
                tipoConflito: "CI_" + tipoCI,
                status: "ATIVO",
                ciOrigemId: ci.id,
                descricao: gerarDescricao(resumoCI),
              },
            });
            conflitosGerados.push(conflito.id);
            if (operadorResponsavelId) {
              await tx.logAuditoria.create({
                data: {
                  operadorId: operadorResponsavelId,
                  acao: "INSERT",
                  tabelaAfetada: "conflitos",
                  registroIdAfetado: conflito.registroGrupoId ?? conflito.id,
                  detalhesAlteracao: {
                    tipoConflito: conflito.tipoConflito,
                    origem: `CI ${numeroInt}/${anoInt}`,
                  },
                  ipOrigem,
                },
              });
            }
          }
        } else {
          for (const { aId, bId } of paresNovos) {
            const conflito = await tx.conflito.create({
              data: {
                adolescenteAId: aId,
                adolescenteBId: bId,
                tipoConflito: "CI_" + tipoCI,
                status: "ATIVO",
                ciOrigemId: ci.id,
                descricao: gerarDescricao(resumoCI),
              },
            });
            conflitosGerados.push(conflito.id);
            if (operadorResponsavelId) {
              await tx.logAuditoria.create({
                data: {
                  operadorId: operadorResponsavelId,
                  acao: "INSERT",
                  tabelaAfetada: "conflitos",
                  registroIdAfetado: conflito.registroGrupoId ?? conflito.id,
                  detalhesAlteracao: {
                    tipoConflito: conflito.tipoConflito,
                    origem: `CI ${numeroInt}/${anoInt}`,
                  },
                  ipOrigem,
                },
              });
            }
          }
        }
      }

      // 4. Gerar alertas automaticamente
      const alertasGerados: string[] = [];
      if (deveGerarAlerta) {
        const tipoEspecialCI =
          tipoCI &&
          CI_ALERTA_ESPECIAL_MAP[tipoCI as keyof typeof CI_ALERTA_ESPECIAL_MAP];

        for (const adolescenteId of adolescentesIdsArray) {
          if (tipoEspecialCI) {
            await aplicarAlertasEspeciais(
              tx,
              adolescenteId,
              [
                {
                  tipo: tipoEspecialCI,
                  descricao: `CI ${numeroInt}/${anoInt} (${tipoCI}): ${resumoCI}`,
                  nivelRisco: nivelRiscoNormalizado ?? undefined,
                },
              ],
              {
                operadorId: operadorResponsavelId,
                ipOrigem,
              }
            );
            alertasGerados.push(`${tipoEspecialCI}-${adolescenteId}`);
            continue;
          }

          const nivelRisco =
            nivelRiscoNormalizado ||
            (tipoCI === "RISCO_SUICIDIO"
              ? "CRITICO"
              : tipoCI === "FUGA"
              ? "ALTO"
              : tipoCI === "SAUDE"
              ? "ALTO"
              : "MEDIO");

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
              descricaoAlerta: `Alerta gerado por CI ${numeroInt}/${anoInt} (${tipoCI}): ${resumoCI}`,
              nivelRisco,
            },
          });
          alertasGerados.push(alerta.id);
          if (operadorResponsavelId) {
            await tx.logAuditoria.create({
              data: {
                operadorId: operadorResponsavelId,
                acao: "INSERT",
                tabelaAfetada: "alertas_ativos",
                registroIdAfetado: alerta.id,
                detalhesAlteracao: {
                  tipoAlerta,
                  nivelRisco,
                },
                ipOrigem,
              },
            });
          }
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
