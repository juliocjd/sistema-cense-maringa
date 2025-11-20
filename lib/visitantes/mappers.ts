import type { Prisma } from "@prisma/client";

const DATE_ONLY = /\d{4}-\d{2}-\d{2}/;

type VisitanteBasico = Pick<
  Prisma.VisitanteGetPayload<{
    include: {
      _count: true;
    };
  }>,
  | "id"
  | "nomeCompleto"
  | "cpf"
  | "rg"
  | "nomePai"
  | "nomeMae"
  | "profissao"
  | "dataNascimento"
  | "enderecoCompleto"
  | "telefones"
  | "email"
  | "fotoUrl"
  | "faceEmbeddings"
  | "criadoEm"
  | "atualizadoEm"
  | "_count"
>;

export type VisitanteComRelacoes = Prisma.VisitanteGetPayload<{
  include: {
    adolescentesLink: {
      include: {
        adolescente: {
          select: {
            id: true;
            nomeCompleto: true;
            nomeSocial: true;
            statusUnidade: true;
          };
        };
      };
    };
    visitasRegistro: {
      include: {
        adolescente: {
          select: {
            id: true;
            nomeCompleto: true;
            nomeSocial: true;
          };
        };
      };
    };
    _count: true;
  };
}>;

export type VinculoVisitante = Prisma.AdolescenteVisitanteLinkGetPayload<{
  include: {
    adolescente: {
      select: {
        id: true;
        nomeCompleto: true;
        nomeSocial: true;
        statusUnidade: true;
      };
    };
  };
}>;

export type VisitaRegistroComAdolescente =
  Prisma.VisitaRegistroGetPayload<{
    include: {
      adolescente: {
        select: {
          id: true;
          nomeCompleto: true;
          nomeSocial: true;
        };
      };
    };
  }>;

const formatarData = (valor: Date | null | undefined): string | null => {
  if (!valor) return null;
  const iso = valor.toISOString();
  if (DATE_ONLY.test(iso)) {
    return iso.slice(0, 10);
  }
  return iso;
};

const normalizarTelefones = (telefones: string[] | null | undefined): string[] =>
  Array.isArray(telefones) ? telefones.filter(Boolean) : [];

export function mapVisitanteBasico(
  visitante: VisitanteBasico,
  extras?: {
    totalVinculos?: number;
    totalVisitas?: number;
  }
) {
  return {
    id: visitante.id,
    nomeCompleto: visitante.nomeCompleto,
    cpf: visitante.cpf ?? null,
    rg: visitante.rg ?? null,
    nomePai: visitante.nomePai ?? null,
    nomeMae: visitante.nomeMae ?? null,
    profissao: visitante.profissao ?? null,
    dataNascimento: formatarData(visitante.dataNascimento),
    enderecoCompleto: visitante.enderecoCompleto ?? null,
    telefones: normalizarTelefones(visitante.telefones),
    email: visitante.email ?? null,
    fotoUrl: visitante.fotoUrl ?? null,
    temFaceCadastrada: !!visitante.faceEmbeddings && Array.isArray(visitante.faceEmbeddings) && visitante.faceEmbeddings.length === 128,
    criadoEm: visitante.criadoEm.toISOString(),
    atualizadoEm: visitante.atualizadoEm.toISOString(),
    totalVinculos:
      extras?.totalVinculos ?? visitante._count?.adolescentesLink ?? 0,
    totalVisitas:
      extras?.totalVisitas ?? visitante._count?.visitasRegistro ?? 0,
  };
}

export function mapVinculo(vinculo: VinculoVisitante) {
  return {
    id: vinculo.id,
    adolescente: vinculo.adolescente
      ? {
          id: vinculo.adolescente.id,
          nome: vinculo.adolescente.nomeCompleto,
          nomeSocial: vinculo.adolescente.nomeSocial ?? null,
          statusUnidade: vinculo.adolescente.statusUnidade ?? null,
        }
      : null,
    adolescenteId: vinculo.adolescenteId,
    parentesco: vinculo.parentesco ?? null,
    autorizado: vinculo.autorizado,
    observacoes: vinculo.observacoes ?? null,
  };
}

export function mapVisita(visita: VisitaRegistroComAdolescente) {
  const dataSaida = visita.dataHoraSaida;
  const dataEntrada = visita.dataHoraEntrada;
  let duracaoMinutos: number | null = null;

  if (dataSaida) {
    const diff = dataSaida.getTime() - dataEntrada.getTime();
    if (diff > 0) {
      duracaoMinutos = Math.round(diff / 60000);
    }
  }

  return {
    id: visita.id,
    adolescente: visita.adolescente
      ? {
          id: visita.adolescente.id,
          nome: visita.adolescente.nomeCompleto,
          nomeSocial: visita.adolescente.nomeSocial ?? null,
        }
      : null,
    adolescenteId: visita.adolescenteId,
    dataHoraEntrada: visita.dataHoraEntrada.toISOString(),
    dataHoraSaida: visita.dataHoraSaida
      ? visita.dataHoraSaida.toISOString()
      : null,
    emAberto: visita.dataHoraSaida === null,
    duracaoMinutos,
  };
}

export function mapVisitanteDetalhado(
  visitante: VisitanteComRelacoes,
  options?: {
    incluirVinculos?: boolean;
    incluirVisitas?: boolean;
    limiteVisitas?: number;
  }
) {
  const base = mapVisitanteBasico(visitante);

  const resultado: Record<string, unknown> = {
    ...base,
    totalVisitasRegistradas: visitante.visitasRegistro?.length ?? 0,
    totalVinculos: visitante.adolescentesLink?.length ?? 0,
    totalVinculosAtivos: (visitante.adolescentesLink ?? []).filter(
      (item) => item.autorizado
    ).length,
  };

  if (options?.incluirVinculos) {
    resultado.vinculos = visitante.adolescentesLink.map(mapVinculo);

    // Adicionar array simplificado de adolescentes para compatibilidade com busca manual
    resultado.adolescentes = visitante.adolescentesLink
      .filter((vinculo) => vinculo.autorizado)
      .map((vinculo) => ({
        id: vinculo.adolescente.id,
        nomeCompleto: vinculo.adolescente.nomeCompleto,
        nomeSocial: vinculo.adolescente.nomeSocial ?? null,
      }));
  }

  if (options?.incluirVisitas) {
    const limite = options.limiteVisitas ?? visitante.visitasRegistro.length;
    resultado.visitasRecentes = visitante.visitasRegistro
      .slice(0, limite)
      .map(mapVisita);
  }

  return resultado;
}
