// app/api/grupos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const createGrupoSchema = z.object({
  nomeGrupo: z.string().min(2, "Nome do grupo deve ter no mínimo 2 caracteres"),
  casaId: z.string().uuid("Casa ID inválido"),
  ordemAla: z.string().optional().nullable(),
  status: z.enum(["ATIVO", "INATIVO"]).default("ATIVO"),
});

const montarMembros = (grupo: any, mapaConflitos?: Map<string, number>) => {
  if (!Array.isArray(grupo.membros)) {
    return [];
  }

  return grupo.membros.map((membro: any) => ({
    id: membro.id,
    dataEntrada: membro.dataEntrada,
    dataSaida: membro.dataSaida,
    ativo: membro.dataSaida === null,
    adolescente: {
      id: membro.adolescente.id,
      nomeCompleto: membro.adolescente.nomeCompleto,
      nomeSocial: membro.adolescente.nomeSocial,
      numeroSms: membro.adolescente.numeroSms,
      fotoUrl: membro.adolescente.fotoUrl,
      statusUnidade: membro.adolescente.statusUnidade,
      alojamento: membro.adolescente.alojamentoAtual
        ? {
            id: membro.adolescente.alojamentoAtual.id,
            numero: membro.adolescente.alojamentoAtual.numeroAlojamento,
            ala: membro.adolescente.alojamentoAtual.ala,
            casaId: membro.adolescente.alojamentoAtual.casaId ?? null,
          }
        : null,
      conflitosAtivos: mapaConflitos?.get(membro.adolescente.id) ?? 0,
    },
  }));
};

type ParInfo = {
  a: { id: string; nome: string };
  b: { id: string; nome: string };
  detalhe: string;
};

const gerarPares = (
  membros: Array<{ id: string; nome: string }>,
  detalhe: string,
  destino: ParInfo[]
) => {
  for (let i = 0; i < membros.length; i += 1) {
    for (let j = i + 1; j < membros.length; j += 1) {
      destino.push({
        a: { id: membros[i].id, nome: membros[i].nome },
        b: { id: membros[j].id, nome: membros[j].nome },
        detalhe,
      });
    }
  }
};

type MembroAtivo = {
  id: string;
  nome: string;
  faccaoId: string | null;
  faccaoNome: string | null;
  bairroId: string | null;
  bairroNome: string | null;
  bairroCidade: string | null;
  vinculos: Array<{ id: string; descricao: string | null }>;
};

const calcularAgrupamentos = (grupo: any) => {
  const membrosAtivos: MembroAtivo[] = (grupo.membros ?? [])
    .filter((membro: any) => membro.dataSaida === null)
    .map((membro: any) => ({
      id: membro.adolescente.id,
      nome: membro.adolescente.nomeCompleto,
      faccaoId:
        membro.adolescente.faccao?.id ??
        membro.adolescente.faccaoGrupoId ??
        null,
      faccaoNome: membro.adolescente.faccao?.nomeFaccao ?? null,
      bairroId:
        membro.adolescente.bairroOrigem?.id ??
        membro.adolescente.bairroOrigemId ??
        null,
      bairroNome: membro.adolescente.bairroOrigem?.nomeBairro ?? null,
      bairroCidade: membro.adolescente.bairroOrigem?.cidade ?? null,
      vinculos: (membro.adolescente.atoInfracionalVinculos ?? [])
        .map((item: any) => item?.vinculo ?? item)
        .filter((item: any) => item?.id)
        .map((item: any) => ({
          id: item.id,
          descricao: item.descricao ?? null,
        })),
    }));

  const faccaoPares: ParInfo[] = [];
  const bairroPares: ParInfo[] = [];
  const atoPares: ParInfo[] = [];

  const membrosPorFaccao = new Map<string, typeof membrosAtivos>();
  membrosAtivos.forEach((membro) => {
    if (!membro.faccaoId) return;
    const lista = membrosPorFaccao.get(membro.faccaoId) ?? [];
    lista.push(membro);
    membrosPorFaccao.set(membro.faccaoId, lista);
  });
  membrosPorFaccao.forEach((lista) => {
    if (lista.length < 2) return;
    const nome = lista[0].faccaoNome ?? "Faccao";
    gerarPares(
      lista.map((m) => ({ id: m.id, nome: m.nome })),
      `Faccao ${nome}`,
      faccaoPares
    );
  });

  const membrosPorBairro = new Map<string, typeof membrosAtivos>();
  membrosAtivos.forEach((membro) => {
    if (!membro.bairroId) return;
    const lista = membrosPorBairro.get(membro.bairroId) ?? [];
    lista.push(membro);
    membrosPorBairro.set(membro.bairroId, lista);
  });
  membrosPorBairro.forEach((lista) => {
    if (lista.length < 2) return;
    const bairro = lista[0].bairroNome ?? "Bairro";
    const cidade = lista[0].bairroCidade ? ` - ${lista[0].bairroCidade}` : "";
    gerarPares(
      lista.map((m) => ({ id: m.id, nome: m.nome })),
      `Bairro ${bairro}${cidade}`,
      bairroPares
    );
  });

  const membrosPorVinculo = new Map<
    string,
    { descricao: string | null; membros: typeof membrosAtivos }
  >();
  membrosAtivos.forEach((membro) => {
    (membro.vinculos ?? []).forEach((vinculo) => {
      const atual =
        membrosPorVinculo.get(vinculo.id) ?? {
          descricao: vinculo.descricao ?? null,
          membros: [],
        };
      atual.membros.push(membro);
      membrosPorVinculo.set(vinculo.id, atual);
    });
  });
  membrosPorVinculo.forEach((info) => {
    if (info.membros.length < 2) return;
    const descricao = info.descricao?.trim() ?? "";
    const detalhe =
      descricao.length > 0
        ? `Ato infracional: ${descricao}`
        : "Ato infracional conjunto";
    gerarPares(
      info.membros.map((m) => ({ id: m.id, nome: m.nome })),
      detalhe,
      atoPares
    );
  });

  return {
    agrupamentosResumo: {
      faccao: faccaoPares.length,
      bairro: bairroPares.length,
      atoInfracional: atoPares.length,
    },
    agrupamentosDetalhes: {
      faccao: faccaoPares,
      bairro: bairroPares,
      atoInfracional: atoPares,
    },
  };
};

const criarMapaContagens = (
  registros: Array<{ registroGrupoId: string | null; _count: { _all: number } }>
) => {
  const mapa = new Map<string, number>();
  registros.forEach((item) => {
    if (item.registroGrupoId) {
      mapa.set(item.registroGrupoId, item._count._all);
    }
  });
  return mapa;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const casaId = searchParams.get("casa_id");
    const status = searchParams.get("status");
    const buscaAdolescente = searchParams.get("adolescente")?.trim();
    const incluirMembros = searchParams.get("incluir_membros") === "true";

    const where: any = {};
    if (casaId) where.casaId = casaId;
    if (status) where.status = status;
    let adolescentesParaFiltrar: string[] | undefined;

    if (buscaAdolescente) {
      const potencials = await prisma.adolescente.findMany({
        where: {
          OR: [
            { nomeCompleto: { contains: buscaAdolescente, mode: "insensitive" } },
            { id: buscaAdolescente },
            { numeroSms: buscaAdolescente },
          ],
        },
        select: { id: true },
      });

      if (potencials.length > 0) {
        adolescentesParaFiltrar = potencials.map((item) => item.id);
        where.membros = {
          some: {
            adolescenteId: { in: adolescentesParaFiltrar },
            dataSaida: null,
          },
        };
      } else {
        // If no matching adolescents, no groups should return
        return NextResponse.json({ total: 0, grupos: [] });
      }
    }

    const grupos = await prisma.grupo.findMany({
      where,
      include: {
        casa: {
          select: {
            id: true,
            nome: true,
            numero: true,
          },
        },
        ...(incluirMembros && {
          membros: {
            where: { dataSaida: null },
            include: {
              adolescente: {
                include: {
                  faccao: {
                    select: {
                      id: true,
                      nomeFaccao: true,
                    },
                  },
                  bairroOrigem: {
                    select: {
                      id: true,
                      nomeBairro: true,
                      cidade: true,
                    },
                  },
                  atoInfracionalVinculos: {
                    include: {
                      vinculo: {
                        select: {
                          id: true,
                          descricao: true,
                        },
                      },
                    },
                  },
                  alojamentoAtual: {
                    select: {
                      id: true,
                      numeroAlojamento: true,
                      ala: true,
                      casaId: true,
                    },
                  },
                  conflitosA: {
                    where: { status: "ATIVO" },
                    select: { id: true },
                  },
                  conflitosB: {
                    where: { status: "ATIVO" },
                    select: { id: true },
                  },
                },
              },
            },
          },
        }),
      },
      orderBy: [{ casa: { numero: "asc" } }, { nomeGrupo: "asc" }],
    });

    const grupoIds = grupos.map((grupo) => grupo.id);

    const membrosAtivos = grupos.flatMap((grupo) =>
      (grupo.membros ?? [])
        .filter((membro: any) => membro.dataSaida === null)
        .map((membro: any) => ({
          grupoId: grupo.id,
          adolescenteId: membro.adolescente.id,
        }))
    );

    const grupoAtivosMap = new Map<string, Set<string>>();
    for (const membro of membrosAtivos) {
      if (!grupoAtivosMap.has(membro.grupoId)) {
        grupoAtivosMap.set(membro.grupoId, new Set());
      }
      grupoAtivosMap.get(membro.grupoId)?.add(membro.adolescenteId);
    }

    const conflitos =
      grupoIds.length === 0 || !prisma.conflito?.findMany
        ? []
        : await prisma.conflito.findMany({
            where: {
              status: "ATIVO",
              registroGrupoId: { in: grupoIds },
            },
            select: {
              id: true,
              registroGrupoId: true,
              adolescenteAId: true,
              adolescenteBId: true,
              tentativasMediacao: {
                select: {
                  id: true,
                },
              },
            },
          });

    const mapaAtivos = new Map<string, number>();
    const mapaSemMediacao = new Map<string, number>();
    const mapaConflitosPorGrupo = new Map<string, Map<string, number>>();

    for (const conflito of conflitos) {
      let grupoId = conflito.registroGrupoId;
      if (!grupoId) {
        grupoId = [...grupoAtivosMap.entries()]
          .find(
            ([, membrosSet]) =>
              membrosSet.has(conflito.adolescenteAId) &&
              membrosSet.has(conflito.adolescenteBId)
          )?.[0] ?? null;
      }

      if (!grupoId) {
        continue;
      }
      const membrosAtivosSet = grupoAtivosMap.get(grupoId);
      if (
        !membrosAtivosSet ||
        !membrosAtivosSet.has(conflito.adolescenteAId) ||
        !membrosAtivosSet.has(conflito.adolescenteBId)
      ) {
        continue;
      }

      mapaAtivos.set(grupoId, (mapaAtivos.get(grupoId) ?? 0) + 1);

      if ((conflito.tentativasMediacao?.length ?? 0) === 0) {
        mapaSemMediacao.set(grupoId, (mapaSemMediacao.get(grupoId) ?? 0) + 1);
      }

      const grupoConflitos =
        mapaConflitosPorGrupo.get(grupoId) ?? new Map<string, number>();

      const atualizarContagem = (adolescenteId: string) => {
        grupoConflitos.set(
          adolescenteId,
          (grupoConflitos.get(adolescenteId) ?? 0) + 1
        );
      };

      atualizarContagem(conflito.adolescenteAId);
      atualizarContagem(conflito.adolescenteBId);

      mapaConflitosPorGrupo.set(grupoId, grupoConflitos);
    }

    const gruposFormatados = grupos.map((grupo) => ({
      id: grupo.id,
      nomeGrupo: grupo.nomeGrupo,
      ordemAla: grupo.ordemAla,
      status: grupo.status,
      criadoEm: grupo.criadoEm,
      casa: {
        id: grupo.casa.id,
        nome: grupo.casa.nome,
        numero: grupo.casa.numero,
      },
      totalMembros:
        incluirMembros && "membros" in grupo ? grupo.membros.length : undefined,
      membros: incluirMembros
        ? montarMembros(grupo, mapaConflitosPorGrupo.get(grupo.id))
        : undefined,
      conflitosAtivos: mapaAtivos.get(grupo.id) ?? 0,
      conflitosSemMediacao: mapaSemMediacao.get(grupo.id) ?? 0,
      ...(incluirMembros ? calcularAgrupamentos(grupo) : null),
    }));

    return NextResponse.json({
      total: gruposFormatados.length,
      grupos: gruposFormatados,
    });
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar grupos",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const operadorId = session?.user?.id ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true },
    });
    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createGrupoSchema.parse(body);

    const casa = await prisma.casa.findUnique({
      where: { id: validated.casaId },
    });
    if (!casa) {
      return NextResponse.json({ erro: "Casa não encontrada" }, { status: 404 });
    }

    const grupoExistente = await prisma.grupo.findFirst({
      where: {
        nomeGrupo: validated.nomeGrupo,
        casaId: validated.casaId,
      },
    });
    if (grupoExistente) {
      return NextResponse.json(
        {
          erro: `Já existe um grupo com o nome "${validated.nomeGrupo}" na ${casa.nome}`,
        },
        { status: 409 }
      );
    }

    const grupo = await prisma.grupo.create({
      data: {
        nomeGrupo: validated.nomeGrupo,
        casaId: validated.casaId,
        ordemAla: validated.ordemAla || undefined,
        status: validated.status,
      },
      include: {
        casa: {
          select: {
            id: true,
            nome: true,
            numero: true,
          },
        },
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId,
        acao: "INSERT",
        tabelaAfetada: "grupos",
        registroIdAfetado: grupo.id,
        detalhesAlteracao: {
          nomeGrupo: grupo.nomeGrupo,
          casa: casa.nome,
        },
        ipOrigem: request.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    return NextResponse.json(
      {
        id: grupo.id,
        nomeGrupo: grupo.nomeGrupo,
        casa: {
          id: grupo.casa.id,
          nome: grupo.casa.nome,
          numero: grupo.casa.numero,
        },
        status: grupo.status,
        mensagem: "Grupo criado com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao criar grupo:", error);
    return NextResponse.json(
      {
        erro: "Erro ao criar grupo",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
