import { prisma } from "@/lib/prisma";
import {
  montarMapaBairrosConflitantes,
  montarMapaFaccoesConflitantes,
  type BairroConflitoInfo,
  type FaccaoConflitoInfo,
} from "@/lib/conflitos";
import {
  calcularRiscoAlojamento,
  criarMapaSlots,
  type CasaRisco,
  type ConflitosExternosMapa,
} from "@/lib/riscos/calcular";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";
import type { Adolescente } from "@/types";

type AdolescenteComConflitos = Awaited<
  ReturnType<typeof carregarAdolescenteParaSugestoes>
>;

type CasaComAlojamentos = Awaited<
  ReturnType<typeof carregarCasasComAlojamentos>
>[number];

type AlojamentoCasa = CasaComAlojamentos["alojamentos"][number];

export interface SugestaoAlojamento {
  alojamentoId: string;
  casaId: string;
  casaNome: string;
  numero: string;
  ala: string | null;
  nivel: number;
  rotulo: string;
  descricao: string;
  alertas: string[];
  ambientais: string[];
}

interface SugestaoParams {
  adolescenteId?: string;
  bairroId?: string | null;
  faccaoId?: string | null;
  limite?: number;
}

async function carregarAdolescenteParaSugestoes(adolescenteId: string) {
  return prisma.adolescente.findUnique({
    where: { id: adolescenteId },
    include: {
      bairroOrigem: true,
      faccao: true,
      conflitosA: {
        where: { status: "ATIVO" },
        include: {
          adolescenteB: {
            include: {
              bairroOrigem: true,
              faccao: true,
            },
          },
        },
      },
      conflitosB: {
        where: { status: "ATIVO" },
        include: {
          adolescenteA: {
            include: {
              bairroOrigem: true,
              faccao: true,
            },
          },
        },
      },
    },
  });
}

async function carregarCasasComAlojamentos() {
  return prisma.casa.findMany({
    orderBy: { numero: "asc" },
    include: {
      alojamentos: {
        include: {
          alojamentoFrontal: {
            select: { id: true },
          },
          adolescentes: {
            where: { statusUnidade: "ATIVO" },
            include: {
              bairroOrigem: true,
              faccao: true,
            },
          },
        },
      },
    },
  });
}

const normalizarCasaParaCalculo = (
  casa: CasaComAlojamentos,
  candidato: AdolescenteComConflitos,
  alvoAlojamentoId: string
): CasaRisco => ({
  id: casa.id,
  nome: casa.nome,
  numero: casa.numero ?? 0,
  isolada: Boolean(casa.isolada),
  alojamentos: casa.alojamentos.map(
    (aloj): any => ({
      id: aloj.id,
      casaId: casa.id,
      numeroAlojamento: aloj.numeroAlojamento,
      ala: aloj.ala,
      statusManutencao: aloj.statusManutencao,
      alojamentoFrontalId:
        aloj.alojamentoFrontalId ?? aloj.alojamentoFrontal?.id ?? null,
      localizacaoPreferencial: aloj.localizacaoPreferencial ?? false,
      corRisco: aloj.corRisco ?? undefined,
      nivelRisco: aloj.nivelRisco ?? undefined,
      icones: aloj.icones ?? [],
      alertas: aloj.alertas ?? [],
      adolescentes:
        aloj.id === alvoAlojamentoId
          ? [candidato]
          : (aloj.adolescentes as Adolescente[]),
    })
  ),
});

const criarCandidatoFallback = (
  adolescenteId: string | null | undefined,
  nomeFallback: string,
  bairroId: string | null,
  faccaoId: string | null
): AdolescenteComConflitos =>
  ({
    id: adolescenteId ?? "adolescente-temp",
    nomeCompleto: nomeFallback,
    statusUnidade: "ATIVO",
    bairroOrigemId: bairroId,
    faccaoGrupoId: faccaoId,
    bairroOrigem: null,
    faccao: null,
    conflitosA: [],
    conflitosB: [],
  } as AdolescenteComConflitos);

const construirImpactosExternos = (
  adolescente: AdolescenteComConflitos,
  bairroReferencia: string | null,
  faccaoReferencia: string | null,
  mapaBairros: Map<string, BairroConflitoInfo>,
  mapaFaccoes: Map<string, FaccaoConflitoInfo>
): ConflitosExternosMapa => {
  const impactos: ImpactoConflitoExterno[] = [];

  if (bairroReferencia) {
    mapaBairros.forEach((info) => {
      const rival =
        info.origem.id === bairroReferencia ? info.destino : info.origem;
      const origem =
        info.origem.id === bairroReferencia ? info.origem : info.destino;

      impactos.push({
        conflitoId: info.id,
        conflitoTipo: "BAIRRO",
        statusConflito: info.status,
        risco: "MEDIO",
        conflitoOrigem: {
          id: origem.id,
          nome:
            adolescente.bairroOrigem?.nomeBairro ??
            origem.nome ??
            "Bairro origem",
        },
        conflitoDestino: {
          id: rival.id,
          nome: rival.nome,
        },
        adolescente: {
          id: adolescente.id,
          nome: adolescente.nomeCompleto,
          status: adolescente.statusUnidade,
          numeroSms: adolescente.numeroSms ?? null,
          bairro: adolescente.bairroOrigem
            ? {
                id: adolescente.bairroOrigem.id,
                nome: adolescente.bairroOrigem.nomeBairro,
                cidade: adolescente.bairroOrigem.cidade,
              }
            : null,
          faccao: adolescente.faccao
            ? { id: adolescente.faccao.id, nome: adolescente.faccao.nomeFaccao }
            : null,
          alojamento: null,
        },
      });
    });
  }

  if (faccaoReferencia) {
    mapaFaccoes.forEach((info) => {
      const rival =
        info.origem.id === faccaoReferencia ? info.destino : info.origem;
      const origem =
        info.origem.id === faccaoReferencia ? info.origem : info.destino;

      impactos.push({
        conflitoId: info.id,
        conflitoTipo: "FACCAO",
        statusConflito: info.status,
        risco: "MEDIO",
        conflitoOrigem: {
          id: origem.id,
          nome:
            adolescente.faccao?.nomeFaccao ??
            origem.nome ??
            "Faccao origem",
        },
        conflitoDestino: {
          id: rival.id,
          nome: rival.nome,
        },
        adolescente: {
          id: adolescente.id,
          nome: adolescente.nomeCompleto,
          status: adolescente.statusUnidade,
          numeroSms: adolescente.numeroSms ?? null,
          bairro: adolescente.bairroOrigem
            ? {
                id: adolescente.bairroOrigem.id,
                nome: adolescente.bairroOrigem.nomeBairro,
                cidade: adolescente.bairroOrigem.cidade,
              }
            : null,
          faccao: adolescente.faccao
            ? { id: adolescente.faccao.id, nome: adolescente.faccao.nomeFaccao }
            : null,
          alojamento: null,
        },
      });
    });
  }

  return impactos.length > 0 ? { [adolescente.id]: impactos } : {};
};

const avaliarCandidato = (
  casa: CasaComAlojamentos,
  alojamento: AlojamentoCasa,
  candidato: AdolescenteComConflitos,
  conflitosExternos: ConflitosExternosMapa
): SugestaoAlojamento => {
  const casaNormalizada = normalizarCasaParaCalculo(
    casa,
    candidato,
    alojamento.id
  );
  const slots = criarMapaSlots([casaNormalizada]);
  const alvo = casaNormalizada.alojamentos.find(
    (aloj) => aloj.id === alojamento.id
  );

  if (!alvo) {
    throw new Error("Alojamento alvo nao encontrado para avaliacao.");
  }

  const resultado = calcularRiscoAlojamento({
    alojamento: alvo,
    casaAtual: casaNormalizada,
    casas: [casaNormalizada],
    slots,
    conflitosExternos,
  });

  return {
    alojamentoId: alojamento.id,
    casaId: casa.id,
    casaNome: casa.nome,
    numero: alojamento.numeroAlojamento,
    ala: alojamento.ala,
    nivel: resultado.nivel,
    rotulo: resultado.rotulo,
    descricao: resultado.descricao,
    alertas: resultado.motivos,
    ambientais: resultado.ambiental?.motivos ?? [],
  };
};

export async function gerarSugestoesParaAlocacao({
  adolescenteId,
  bairroId,
  faccaoId,
  limite = 3,
}: SugestaoParams) {
  let adolescente = adolescenteId
    ? await carregarAdolescenteParaSugestoes(adolescenteId)
    : null;

  if (adolescenteId && !adolescente) {
    throw new Error("Adolescente nao encontrado");
  }

  const bairroParaAnalise =
    bairroId ?? adolescente?.bairroOrigemId ?? null;
  const faccaoParaAnalise =
    faccaoId ?? adolescente?.faccaoGrupoId ?? null;

  if (!adolescente && !bairroParaAnalise && !faccaoParaAnalise) {
    throw new Error(
      "Informe adolescenteId ou pelo menos bairroId/faccaoId para gerar sugestoes."
    );
  }

  if (!adolescente) {
    adolescente = criarCandidatoFallback(
      adolescenteId,
      "Adolescente em cadastro",
      bairroParaAnalise,
      faccaoParaAnalise
    );
  }

  const casas = await carregarCasasComAlojamentos();

  const mapaBairros =
    bairroParaAnalise && bairroParaAnalise !== ""
      ? await montarMapaBairrosConflitantes(bairroParaAnalise)
      : new Map<string, BairroConflitoInfo>();

  const mapaFaccoes =
    faccaoParaAnalise && faccaoParaAnalise !== ""
      ? await montarMapaFaccoesConflitantes(faccaoParaAnalise)
      : new Map<string, FaccaoConflitoInfo>();

  const conflitosExternos = construirImpactosExternos(
    adolescente,
    bairroParaAnalise,
    faccaoParaAnalise,
    mapaBairros,
    mapaFaccoes
  );

  const candidatos: SugestaoAlojamento[] = [];

  casas.forEach((casa) => {
    casa.alojamentos.forEach((alojamento) => {
      if (
        alojamento.statusManutencao !== "LIVRE" ||
        alojamento.adolescentes.length > 0
      ) {
        return;
      }

      const avaliacao = avaliarCandidato(
        casa,
        alojamento,
        adolescente as AdolescenteComConflitos,
        conflitosExternos
      );

      candidatos.push(avaliacao);
    });
  });

  candidatos.sort((a, b) => {
    if (a.nivel !== b.nivel) return a.nivel - b.nivel;
    if (a.alertas.length !== b.alertas.length) {
      return a.alertas.length - b.alertas.length;
    }
    return a.casaNome.localeCompare(b.casaNome);
  });

  const selecionados: SugestaoAlojamento[] = [];
  const casasUsadas = new Set<string>();
  const alojamentosUsados = new Set<string>();

  for (const candidato of candidatos) {
    if (selecionados.length === limite) break;
    if (casasUsadas.has(candidato.casaId)) {
      continue;
    }
    selecionados.push(candidato);
    casasUsadas.add(candidato.casaId);
    alojamentosUsados.add(candidato.alojamentoId);
  }

  if (selecionados.length < limite) {
    for (const candidato of candidatos) {
      if (selecionados.length === limite) break;
      if (alojamentosUsados.has(candidato.alojamentoId)) {
        continue;
      }
      selecionados.push(candidato);
      alojamentosUsados.add(candidato.alojamentoId);
    }
  }

  return {
    adolescente: {
      id: adolescente?.id ?? adolescenteId ?? null,
      nome: adolescente?.nomeCompleto ?? "Adolescente em cadastro",
    },
    sugestoes: selecionados.slice(0, limite),
  };
}
