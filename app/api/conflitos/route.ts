import { NextResponse } from "next/server"
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import {
  dedupePairs,
  resolveExistingConflictPairs,
} from "@/lib/conflitos/pairs";

type PartePayloadRaw = {
  nome?: string;
  participantes?: Array<{
    adolescenteId?: string;
    geraAlertas?: boolean;
  }>;
};

type ParteNormalizada = {
  nome: string;
  participantes: Array<{ adolescenteId: string; geraAlertas: boolean }>;
};

const gerarChavePar = (a: string, b: string) => {
  return [a, b].sort().join("|");
};

const normalizarPartes = (raw: unknown[]): ParteNormalizada[] => {
  const idsUsados = new Set<string>();
  return raw
    .map((parte, index) => {
      const dados = parte as PartePayloadRaw;
      const nomeBase =
        typeof dados?.nome === "string" && dados.nome.trim().length > 0
          ? dados.nome.trim()
          : `Lado ${index + 1}`;

      const participantes: Array<{ adolescenteId: string; geraAlertas: boolean }> = [];
      if (Array.isArray(dados?.participantes)) {
        dados.participantes.forEach((item) => {
          if (typeof item?.adolescenteId !== "string") {
            return;
          }
          const id = item.adolescenteId;
          if (idsUsados.has(id)) {
            throw new Error(
              "Cada adolescente só pode pertencer a um lado do conflito"
            );
          }
          idsUsados.add(id);
          participantes.push({
            adolescenteId: id,
            geraAlertas: item?.geraAlertas !== false,
          });
        });
      }

      return {
        nome: nomeBase,
        participantes,
      };
    })
    .filter((parte) => parte.participantes.length > 0);
};

const mapearOperadoresConflitos = async (chaves: string[]) => {
  if (chaves.length === 0) {
    return new Map<string, { id: string; nomeCompleto: string }>();
  }

  const logs = await prisma.logAuditoria.findMany({
    where: {
      tabelaAfetada: "conflitos",
      acao: "INSERT",
      registroIdAfetado: { in: chaves },
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

const montarCombosEntrePartes = (partes: ParteNormalizada[]) => {
  const pares: Array<{ aId: string; bId: string }> = [];
  const vistos = new Set<string>();

  for (let i = 0; i < partes.length; i += 1) {
    for (let j = i + 1; j < partes.length; j += 1) {
      const parteA = partes[i];
      const parteB = partes[j];

      parteA.participantes.forEach((a) => {
        parteB.participantes.forEach((b) => {
          if (!a.geraAlertas || !b.geraAlertas) {
            return;
          }
          if (a.adolescenteId === b.adolescenteId) {
            return;
          }
          const chave = gerarChavePar(a.adolescenteId, b.adolescenteId);
          if (!vistos.has(chave)) {
            vistos.add(chave);
            pares.push({ aId: a.adolescenteId, bId: b.adolescenteId });
          }
        });
      });
    }
  }

  return pares;
};

const criarConflitosPorPartes = async ({
  partesRaw,
  tipoConflito,
  descricao,
  ciOrigemId,
  registroGrupoId,
  operadorId,
  request,
}: {
  partesRaw: unknown[];
  tipoConflito: string;
  descricao?: string;
  ciOrigemId?: string;
  registroGrupoId: string;
  operadorId: string;
  request: Request;
}) => {
  const partes = normalizarPartes(partesRaw);
  if (partes.length < 2) {
    throw new Error("Informe ao menos dois lados com participantes.");
  }

  const combos = montarCombosEntrePartes(partes);
  if (combos.length === 0) {
    throw new Error(
      "Nenhuma combinacao valida encontrada entre os lados informados."
    );
  }

  const paresValidos = dedupePairs(combos);
  if (!paresValidos.length) {
    throw new Error(
      "Nao foi possivel montar pares validos com os lados informados."
    );
  }

  const tipoNormalizado = tipoConflito.trim().toUpperCase();

  const resultado = await prisma.$transaction(async (tx) => {
    const reativados = await resolveExistingConflictPairs(tx, paresValidos);
    const criados = await Promise.all(
      paresValidos.map(({ aId, bId }) =>
        tx.conflito.create({
          data: {
            adolescenteAId: aId,
            adolescenteBId: bId,
            tipoConflito: tipoNormalizado,
            ciOrigemId: ciOrigemId ?? undefined,
            descricao: descricao ?? undefined,
            registroGrupoId,
            status: "ATIVO",
          },
          select: {
            id: true,
            adolescenteAId: true,
            adolescenteBId: true,
          },
        })
      )
    );

    await tx.logAuditoria.create({
      data: {
        operadorId,
        acao: "INSERT",
        tabelaAfetada: "conflitos",
        registroIdAfetado: registroGrupoId,
        detalhesAlteracao: {
          tipoConflito: tipoNormalizado,
          totalPares: paresValidos.length,
          criados: criados.length,
          reativados,
        },
        ipOrigem: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return { criados, reativados };
  });

  return {
    status: 201,
    payload: {
      mensagem:
        resultado.reativados > 0
          ? "Conflitos reabertos a partir dos lados informados."
          : "Conflitos registrados a partir dos lados informados.",
      conflitosCriados: resultado.criados,
      conflitosIgnorados: 0,
      conflitosReativados: resultado.reativados,
    },
  };
};

const parseStatusList = (value: string | null) => {
  if (!value) {
    return null;
  }
  return value
    .split(",")
    .map((status) => status.trim().toUpperCase())
    .filter((status) => status.length > 0);
};

// GET /api/conflitos
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status = statusParam || "ATIVO";
    const busca = searchParams.get("busca");
    const participanteStatusParam = searchParams.get("participanteStatus");
    const participanteStatus = parseStatusList(participanteStatusParam);

    const where: any = {};

    // Filtro por status
    if (status && status !== "TODOS") {
      where.status = status;
    }

    // Busca por nome de adolescente
    if (busca) {
      where.OR = [
        {
          adolescenteA: {
            nomeCompleto: { contains: busca, mode: "insensitive" },
          },
        },
        {
          adolescenteB: {
            nomeCompleto: { contains: busca, mode: "insensitive" },
          },
        },
        {
          adolescenteA: {
            numeroSms: { contains: busca },
          },
        },
        {
          adolescenteB: {
            numeroSms: { contains: busca },
          },
        },
      ];
    }

    if (participanteStatus && participanteStatus.length > 0) {
      const participanteCondition = {
        OR: [
          {
            adolescenteA: {
              statusUnidade: {
                in: participanteStatus,
              },
            },
          },
          {
            adolescenteB: {
              statusUnidade: {
                in: participanteStatus,
              },
            },
          },
        ],
      };
      where.AND = [...(where.AND ?? []), participanteCondition];
    }

    const conflitos = await prisma.conflito.findMany({
      where,
        include: {
          adolescenteA: {
            select: {
              id: true,
              nomeCompleto: true,
              statusUnidade: true,
              numeroSms: true,
              fotoUrl: true,
              alojamentoAtual: {
                include: {
                  casa: true,
                },
              },
            },
          },
          adolescenteB: {
            select: {
              id: true,
              nomeCompleto: true,
              statusUnidade: true,
              numeroSms: true,
              fotoUrl: true,
              alojamentoAtual: {
                include: {
                  casa: true,
                },
              },
            },
          },
        ciOrigem: {
          select: {
            id: true,
            numero: true,
            ano: true,
            dataFato: true,
            desativadoEm: true,
            suspensoPorStatus: true,
          },
        },
        tentativasMediacao: {
          orderBy: {
            dataTentativa: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        criadoEm: "desc",
      },
    });

    // Buscar ocorrências ativas (CI não desativado/suspenso) dos conflitos retornados
    const conflitoIds = conflitos.map((c) => c.id);
    const ocorrenciasAtivas = await prisma.conflitoOcorrencia.findMany({
      where: {
        conflitoId: { in: conflitoIds },
        OR: [
          { ciId: null },
          {
            ci: {
              desativadoEm: null,
              suspensoPorStatus: false,
            },
          },
        ],
      },
      select: {
        conflitoId: true,
        criadoEm: true,
        ciId: true,
      },
      orderBy: { criadoEm: "desc" },
    });

    const ocorrenciasVisiveis = ocorrenciasAtivas.filter(
      (oc) => oc.ciId !== null
    );
    const ocorrenciaSet = new Set<string>();
    ocorrenciasVisiveis.forEach((oc) => {
      if (oc.ciId) {
        ocorrenciaSet.add(`${oc.conflitoId}|${oc.ciId}`);
      }
    });

    const mapaOcorrencias = new Map<
      string,
      { total: number; ultima?: Date }
    >();
    ocorrenciasVisiveis.forEach((oc) => {
      const entry =
        mapaOcorrencias.get(oc.conflitoId) ?? { total: 0, ultima: undefined };
      entry.total += 1;
      if (!entry.ultima || entry.ultima < oc.criadoEm) {
        entry.ultima = oc.criadoEm;
      }
      mapaOcorrencias.set(oc.conflitoId, entry);
    });

    const chavesOperadores = Array.from(
      new Set(
        conflitos
          .map((conflito) => conflito.registroGrupoId ?? conflito.id)
          .filter((valor): valor is string => Boolean(valor))
      )
    );
    const operadoresMap = await mapearOperadoresConflitos(chavesOperadores);

    // Formatar resposta
    const confilitosFormatados = conflitos.map((c) => {
      const chaveOperador = c.registroGrupoId ?? c.id;
      const occ = mapaOcorrencias.get(c.id);
      let totalOcorrencias = occ?.total ?? 0;
      let ultimaOcorrenciaEm = occ?.ultima ?? c.ultimaOcorrenciaEm ?? null;

      // Fallback: se CI de origem ativa ainda não contada como ocorrência, soma +1 e atualiza data
      const ciAtiva =
        c.ciOrigem &&
        c.ciOrigem.desativadoEm === null &&
        c.ciOrigem.suspensoPorStatus === false;
      const origemJaContada =
        ciAtiva &&
        c.ciOrigem?.id &&
        ocorrenciaSet.has(`${c.id}|${c.ciOrigem.id}`);
      if (ciAtiva && !origemJaContada) {
        totalOcorrencias += 1;
        const dataCi = (c as any).ciOrigem?.dataFato ?? c.criadoEm ?? null;
        if (dataCi) {
          const data = new Date(dataCi as any);
          if (!ultimaOcorrenciaEm || new Date(ultimaOcorrenciaEm) < data) {
            ultimaOcorrenciaEm = data as any;
          }
        }
      }

      return {
      id: c.id,
      registroGrupoId: c.registroGrupoId,
        adolescenteA: {
          id: c.adolescenteA.id,
          nome: c.adolescenteA.nomeCompleto,
          statusUnidade: c.adolescenteA.statusUnidade,
          numeroSms: c.adolescenteA.numeroSms,
          fotoUrl: c.adolescenteA.fotoUrl ?? null,
          alojamento: c.adolescenteA.alojamentoAtual
            ? `${c.adolescenteA.alojamentoAtual.casa.nome} - Aloj ${c.adolescenteA.alojamentoAtual.numeroAlojamento}`
            : undefined,
        },
        adolescenteB: {
          id: c.adolescenteB.id,
          nome: c.adolescenteB.nomeCompleto,
          statusUnidade: c.adolescenteB.statusUnidade,
          numeroSms: c.adolescenteB.numeroSms,
          fotoUrl: c.adolescenteB.fotoUrl ?? null,
          alojamento: c.adolescenteB.alojamentoAtual
            ? `${c.adolescenteB.alojamentoAtual.casa.nome} - Aloj ${c.adolescenteB.alojamentoAtual.numeroAlojamento}`
            : undefined,
        },
      tipoConflito: c.tipoConflito,
      status: c.status,
      origem: c.ciOrigem
        ? `CI ${c.ciOrigem.numero}/${c.ciOrigem.ano}`
        : "Registro direto",
      descricao: c.descricao,
      criadoEm: c.criadoEm,
      resolvidoEm: c.resolvidoEm,
      tentativasMediacao: c.tentativasMediacao.length,
      ultimaMediacao: c.tentativasMediacao[0]?.dataTentativa,
      totalOcorrencias,
      ultimaOcorrenciaEm,
      operadorResponsavel: operadoresMap.get(chaveOperador) ?? null,
    };
    });

    return NextResponse.json(confilitosFormatados);
  } catch (error) {
    console.error("Erro ao buscar conflitos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar conflitos" },
      { status: 500 }
    );
  }
}

// POST /api/conflitos
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await auth().catch((error) => {
      console.error("Erro ao obter sessao do auth:", error);
      return null;
    });
    const operadorId = session?.user?.id ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { error: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { error: "Operador nao encontrado" },
        { status: 403 }
      );
    }


    const origemPayload =
      typeof body?.origem === "string" ? body.origem.toUpperCase() : null;

    // Se origem declarada como CI, exigir ciOrigemId e CI ativa
    if (origemPayload === "CI") {
      if (!body.ciOrigemId) {
        return NextResponse.json(
          { error: "Origem CI exige vincular uma CI existente." },
          { status: 400 }
        );
      }
      const ciExiste = await prisma.comunicadoInterno.findUnique({
        where: { id: body.ciOrigemId },
        select: { id: true, desativadoEm: true },
      });
      if (!ciExiste) {
        return NextResponse.json(
          { error: "CI de origem não encontrada." },
          { status: 400 }
        );
      }
      if (ciExiste.desativadoEm) {
        return NextResponse.json(
          { error: "CI de origem está desativada/cancelada." },
          { status: 400 }
        );
      }
    }

    const possuiPartes =
      Array.isArray(body.partes) && body.partes.length > 0;

    if (!body.tipoConflito) {
      return NextResponse.json(
        { error: "Tipo de conflito é obrigatório" },
        { status: 400 }
      );
    }
    const registroGrupoId =
      typeof body.registroGrupoId === "string" && body.registroGrupoId.length > 0
        ? body.registroGrupoId
        : randomUUID();

    if (possuiPartes) {
      try {
        const resultado = await criarConflitosPorPartes({
          partesRaw: body.partes,
          tipoConflito: body.tipoConflito,
          descricao: body.descricao,
          ciOrigemId: body.ciOrigemId,
          registroGrupoId,
          operadorId,
          request,
        });

        return NextResponse.json(resultado.payload, { status: resultado.status });
      } catch (error) {
        const mensagem =
          error instanceof Error ? error.message : "Falha ao registrar partes do conflito";
        return NextResponse.json({ error: mensagem }, { status: 400 });
      }
    }

    // Validações legadas (par x par)
    if (!body.adolescenteAId || !body.adolescenteBId) {
      return NextResponse.json(
        { error: "Ambos os adolescentes são obrigatórios" },
        { status: 400 }
      );
    }

    if (body.adolescenteAId === body.adolescenteBId) {
      return NextResponse.json(
        { error: "Não é possível criar conflito do adolescente consigo mesmo" },
        { status: 400 }
      );
    }


    // Verificar se conflito já existe
    const conflitoExistente = await prisma.conflito.findFirst({
      where: {
        OR: [
          {
            AND: [
              { adolescenteAId: body.adolescenteAId },
              { adolescenteBId: body.adolescenteBId },
            ],
          },
          {
            AND: [
              { adolescenteAId: body.adolescenteBId },
              { adolescenteBId: body.adolescenteAId },
            ],
          },
        ],
        status: "ATIVO",
      },
    });

    if (conflitoExistente) {
      return NextResponse.json(
        { error: "Já existe um conflito ativo entre estes adolescentes" },
        { status: 400 }
      );
    }

    const conflito = await prisma.conflito.create({
      data: {
        adolescenteAId: body.adolescenteAId,
        adolescenteBId: body.adolescenteBId,
        tipoConflito: body.tipoConflito,
        ciOrigemId: body.ciOrigemId,
        descricao: body.descricao,
        registroGrupoId: registroGrupoId,
        status: "ATIVO",
      },
      include: {
        adolescenteA: {
          select: {
            id: true,
            nomeCompleto: true,
            numeroSms: true,
          },
        },
        adolescenteB: {
          select: {
            id: true,
            nomeCompleto: true,
            numeroSms: true,
          },
        },
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId: operadorId,
        acao: "INSERT",
        tabelaAfetada: "conflitos",
        registroIdAfetado: conflito.id,
        detalhesAlteracao: {
          tipoConflito: conflito.tipoConflito,
          adolescenteA: conflito.adolescenteA.nomeCompleto,
          adolescenteB: conflito.adolescenteB.nomeCompleto,
          ciOrigemId: body.ciOrigemId ?? null,
        },
        ipOrigem: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json(conflito, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar conflito:", error);
    return NextResponse.json(
      { error: "Erro ao criar conflito" },
      { status: 500 }
    );
  }
}

