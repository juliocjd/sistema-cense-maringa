import { prisma } from "@/lib/prisma";
import {
  ConflitoExternoResumo,
  ImpactoConflitoExterno,
  ImpactoConflitoPayload,
} from "@/types/inteligencia";

type FiltroTipo = "TERRITORIAL" | "FACCAO" | "TODOS";
type FiltroStatus = "ATIVO" | "INATIVO" | "TODOS";

const normalizarComplemento = (valor?: string | null) =>
  valor && valor.trim().length > 0 ? valor.trim() : null;

const formatarAlojamento = (params?: {
  numeroAlojamento: string | null;
  ala: string | null;
  casa: { nome: string; numero: number | null } | null;
}): ImpactoConflitoExterno["adolescente"]["alojamento"] => {
  if (!params) {
    return null;
  }

  return {
    numero: params.numeroAlojamento,
    ala: params.ala,
    casa: params.casa
      ? { nome: params.casa.nome, numero: params.casa.numero }
      : null,
  };
};

export async function listarConflitosExternos(
  status: FiltroStatus = "ATIVO"
): Promise<ConflitoExternoResumo[]> {
  const statusFilter = status === "TODOS" ? {} : { status };

  const [territoriais, faccionais] = await Promise.all([
    prisma.bairroConflito.findMany({
      where: statusFilter,
      include: {
        bairroA: true,
        bairroB: true,
      },
      orderBy: { id: "desc" },
    }),
    prisma.faccaoConflito.findMany({
      where: statusFilter,
      include: {
        faccaoA: true,
        faccaoB: true,
      },
      orderBy: { criadoEm: "desc" },
    }),
  ]);

  const territoriaisFormatados: ConflitoExternoResumo[] = territoriais.map(
    (conflito) => {
      const criado =
        conflito.criadoEm instanceof Date
          ? conflito.criadoEm.toISOString()
          : null;

      return {
        id: conflito.id,
        tipo: "BAIRRO",
        status: conflito.status,
        origem: {
          id: conflito.bairroAId,
          nome: conflito.bairroA?.nomeBairro ?? "Bairro removido",
          complemento: normalizarComplemento(conflito.bairroA?.cidade),
        },
        destino: {
          id: conflito.barroBId,
          nome: conflito.bairroB?.nomeBairro ?? "Bairro removido",
          complemento: normalizarComplemento(conflito.bairroB?.cidade),
        },
        criadoEm: criado,
      };
    }
  );

  const faccionaisFormatados: ConflitoExternoResumo[] = faccionais.map(
    (conflito) => {
      const criado =
        conflito.criadoEm instanceof Date
          ? conflito.criadoEm.toISOString()
          : null;

      return {
        id: conflito.id,
        tipo: "FACCAO",
        status: conflito.status,
        origem: {
          id: conflito.faccaoAId,
          nome: conflito.faccaoA?.nomeFaccao ?? "Faccao removida",
        },
        destino: {
          id: conflito.faccaoBId,
          nome: conflito.faccaoB?.nomeFaccao ?? "Faccao removida",
        },
        criadoEm: criado,
      };
    }
  );

  return [...territoriaisFormatados, ...faccionaisFormatados];
}

export async function calcularImpactosExternos(
  filtros?: {
    tipo?: FiltroTipo;
    status?: FiltroStatus;
    conflitoId?: string;
  }
): Promise<ImpactoConflitoPayload> {
  const filtroTipo = filtros?.tipo ?? "TODOS";
  const filtroStatus = filtros?.status ?? "ATIVO";
  const filtroConflito = filtros?.conflitoId ?? null;

  const whereStatus =
    filtroStatus === "TODOS" ? {} : { status: filtroStatus };

  const carregarTerritoriais = filtroTipo !== "FACCAO";
  const carregarFaccionais = filtroTipo !== "TERRITORIAL";

  const [territoriais, faccionais] = await Promise.all([
    carregarTerritoriais
      ? prisma.bairroConflito.findMany({
          where: {
            ...whereStatus,
            ...(filtroConflito ? { id: filtroConflito } : {}),
          },
          include: {
            bairroA: true,
            bairroB: true,
          },
        })
      : Promise.resolve([]),
    carregarFaccionais
      ? prisma.faccaoConflito.findMany({
          where: {
            ...whereStatus,
            ...(filtroConflito ? { id: filtroConflito } : {}),
          },
          include: {
            faccaoA: true,
            faccaoB: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const bairrosSet = new Set<string>();
  territoriais.forEach((conflito) => {
    bairrosSet.add(conflito.bairroAId);
    bairrosSet.add(conflito.barroBId);
  });

  const faccoesSet = new Set<string>();
  faccionais.forEach((conflito) => {
    faccoesSet.add(conflito.faccaoAId);
    faccoesSet.add(conflito.faccaoBId);
  });

  const [adolescentesBairros, adolescentesFaccoes] = await Promise.all([
    bairrosSet.size > 0
      ? prisma.adolescente.findMany({
          where: {
            bairroOrigemId: { in: Array.from(bairrosSet) },
          },
          select: {
            id: true,
            nomeCompleto: true,
            statusUnidade: true,
            numeroSms: true,
            bairroOrigemId: true,
            bairroOrigem: {
              select: { id: true, nomeBairro: true, cidade: true },
            },
            alojamentoAtual: {
              select: {
                numeroAlojamento: true,
                ala: true,
                casa: {
                  select: { nome: true, numero: true },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    faccoesSet.size > 0
      ? prisma.adolescente.findMany({
          where: {
            faccaoGrupoId: { in: Array.from(faccoesSet) },
          },
          select: {
            id: true,
            nomeCompleto: true,
            statusUnidade: true,
            numeroSms: true,
            faccaoGrupoId: true,
            faccao: {
              select: { id: true, nomeFaccao: true },
            },
            alojamentoAtual: {
              select: {
                numeroAlojamento: true,
                ala: true,
                casa: {
                  select: { nome: true, numero: true },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const mapaTerritorial = new Map<
    string,
    Array<(typeof territoriais)[number]>
  >();
  territoriais.forEach((conflito) => {
    const atualA = mapaTerritorial.get(conflito.bairroAId) ?? [];
    atualA.push(conflito);
    mapaTerritorial.set(conflito.bairroAId, atualA);

    const atualB = mapaTerritorial.get(conflito.barroBId) ?? [];
    atualB.push(conflito);
    mapaTerritorial.set(conflito.barroBId, atualB);
  });

  const mapaFaccional = new Map<
    string,
    Array<(typeof faccionais)[number]>
  >();
  faccionais.forEach((conflito) => {
    const atualA = mapaFaccional.get(conflito.faccaoAId) ?? [];
    atualA.push(conflito);
    mapaFaccional.set(conflito.faccaoAId, atualA);

    const atualB = mapaFaccional.get(conflito.faccaoBId) ?? [];
    atualB.push(conflito);
    mapaFaccional.set(conflito.faccaoBId, atualB);
  });

  const impactos: ImpactoConflitoExterno[] = [];

  adolescentesBairros.forEach((adolescente) => {
    const conflitos = adolescente.bairroOrigemId
      ? mapaTerritorial.get(adolescente.bairroOrigemId) ?? []
      : [];

    conflitos.forEach((conflito) => {
      const destino =
        conflito.bairroAId === adolescente.bairroOrigemId
          ? conflito.bairroB
          : conflito.bairroA;

      impactos.push({
        conflitoId: conflito.id,
        conflitoTipo: "BAIRRO",
        statusConflito: conflito.status,
        risco: "MEDIO",
        conflitoOrigem: {
          id: adolescente.bairroOrigem?.id ?? conflito.bairroAId,
          nome:
            adolescente.bairroOrigem?.nomeBairro ??
            conflito.bairroA?.nomeBairro ??
            "Bairro de origem",
          complemento:
            adolescente.bairroOrigem?.cidade ??
            conflito.bairroA?.cidade ??
            null,
        },
        conflitoDestino: {
          id: destino?.id ?? conflito.barroBId,
          nome: destino?.nomeBairro ?? "Bairro conflitado",
          complemento: destino?.cidade ?? null,
        },
        adolescente: {
          id: adolescente.id,
          nome: adolescente.nomeCompleto,
          status: adolescente.statusUnidade,
          numeroSms: adolescente.numeroSms,
          bairro: adolescente.bairroOrigem
            ? {
                id: adolescente.bairroOrigem.id,
                nome: adolescente.bairroOrigem.nomeBairro,
                cidade: adolescente.bairroOrigem.cidade,
              }
            : null,
          faccao: null,
          alojamento: formatarAlojamento(adolescente.alojamentoAtual ?? undefined),
        },
      });
    });
  });

  adolescentesFaccoes.forEach((adolescente) => {
    const conflitos = adolescente.faccaoGrupoId
      ? mapaFaccional.get(adolescente.faccaoGrupoId) ?? []
      : [];

    conflitos.forEach((conflito) => {
      const destino =
        conflito.faccaoAId === adolescente.faccaoGrupoId
          ? conflito.faccaoB
          : conflito.faccaoA;

      impactos.push({
        conflitoId: conflito.id,
        conflitoTipo: "FACCAO",
        statusConflito: conflito.status,
        risco: "ALTO",
        conflitoOrigem: {
          id: adolescente.faccao?.id ?? conflito.faccaoAId,
          nome:
            adolescente.faccao?.nomeFaccao ??
            conflito.faccaoA?.nomeFaccao ??
            "Faccao de origem",
        },
        conflitoDestino: {
          id: destino?.id ?? conflito.faccaoBId,
          nome: destino?.nomeFaccao ?? "Faccao em conflito",
        },
        adolescente: {
          id: adolescente.id,
          nome: adolescente.nomeCompleto,
          status: adolescente.statusUnidade,
          numeroSms: adolescente.numeroSms,
          bairro: null,
          faccao: adolescente.faccao
            ? { id: adolescente.faccao.id, nome: adolescente.faccao.nomeFaccao }
            : null,
          alojamento: formatarAlojamento(adolescente.alojamentoAtual ?? undefined),
        },
      });
    });
  });

  const resumoMap = new Map<
    string,
    { conflitoTipo: "BAIRRO" | "FACCAO"; total: number }
  >();

  impactos.forEach((registro) => {
    const atual = resumoMap.get(registro.conflitoId) ?? {
      conflitoTipo: registro.conflitoTipo,
      total: 0,
    };
    atual.total += 1;
    resumoMap.set(registro.conflitoId, atual);
  });

  const payload: ImpactoConflitoPayload = {
    totalRegistros: impactos.length,
    totalConflitos: resumoMap.size,
    filtros: {
      tipo: filtroTipo,
      status: filtroStatus,
      conflitoId: filtroConflito,
    },
    geradoEm: new Date().toISOString(),
    impactos,
    resumoPorConflito: Array.from(resumoMap.entries()).map(
      ([conflitoId, item]) => ({
        conflitoId,
        conflitoTipo: item.conflitoTipo,
        totalAdolescentes: item.total,
      }),
    ),
  };

  if (filtroConflito) {
    payload.resumoPorConflito = payload.resumoPorConflito.filter(
      (item) => item.conflitoId === filtroConflito
    );
  }

  return payload;
}
