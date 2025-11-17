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
import type { Adolescente, StatusUnidade } from "@/types";

type AdolescenteComConflitos = NonNullable<
  Awaited<ReturnType<typeof carregarAdolescenteParaSugestoes>>
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
      corRisco: (aloj as any).corRisco ?? undefined,
      nivelRisco: (aloj as any).nivelRisco ?? undefined,
      icones: (aloj as any).icones ?? [],
      alertas: (aloj as any).alertas ?? [],
      adolescentes:
        aloj.id === alvoAlojamentoId
          ? [preencherAdolescenteBasico(candidato)]
          : aloj.adolescentes.map((ado) => preencherAdolescenteBasico(ado)),
    })
  ),
});

const toOptionalString = (valor: string | Date | null | undefined) => {
  if (valor === null || valor === undefined) return undefined;
  if (valor instanceof Date) return valor.toISOString();
  return valor;
};

const toNullableString = (valor: string | Date | null | undefined) => {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString();
  return valor;
};

const preencherAdolescenteBasico = (
  adolescente:
    | CasaComAlojamentos["alojamentos"][number]["adolescentes"][number]
    | AdolescenteComConflitos
): Adolescente => {
  if (!adolescente) {
    throw new Error("Adolescente invalido para sugestoes de alocacao");
  }

  const base = adolescente as unknown as Partial<Adolescente> & {
    dataNascimento?: string | Date | null;
    dataEntrada?: string | Date | null;
    dataDesinternacao?: string | Date | null;
    criadoEm?: string | Date | null;
    atualizadoEm?: string | Date | null;
    faccao?: {
      id: string;
      nomeFaccao?: string | null;
      nome?: string | null;
      numeroMembro?: string | null;
    } | null;
    bairroOrigem?: {
      id: string;
      nomeBairro: string;
      nome?: string | null;
      cidade: string;
    } | null;
  };

  const faccaoInfo = base.faccao
    ? {
        id: base.faccao.id,
        nome: base.faccao.nomeFaccao ?? base.faccao.nome ?? "",
        numeroMembro: base.faccao.numeroMembro ?? null,
      }
    : null;

  const bairroInfo = base.bairroOrigem
    ? {
        id: base.bairroOrigem.id,
        nome: base.bairroOrigem.nomeBairro ?? base.bairroOrigem.nome ?? "",
        cidade: base.bairroOrigem.cidade,
      }
    : null;

  return {
    ...adolescente,
    statusUnidade: (base.statusUnidade ?? "ATIVO") as StatusUnidade,
    nomeSocial: base.nomeSocial ?? null,
    fotoUrl: base.fotoUrl ?? null,
    numeroSms: base.numeroSms ?? null,
    dataNascimento: toOptionalString(base.dataNascimento),
    dataEntrada: toOptionalString(base.dataEntrada),
    alojamentoAtualId: base.alojamentoAtualId ?? null,
    faseInternacaoAtualId: base.faseInternacaoAtualId ?? null,
    tecnicoReferenciaId: base.tecnicoReferenciaId ?? null,
    tecnicoReferencia: base.tecnicoReferencia ?? null,
    dataDesinternacao: toNullableString(base.dataDesinternacao),
    faccaoGrupoId: base.faccaoGrupoId ?? faccaoInfo?.id ?? null,
    faccaoNumeroMembro: base.faccaoNumeroMembro ?? null,
    faccao: faccaoInfo,
    bairroOrigemId: base.bairroOrigemId ?? bairroInfo?.id ?? null,
    bairroOrigem: bairroInfo,
    riscoFuga: base.riscoFuga ?? null,
    grupos: (base as any).grupos ?? [],
    tatuagens: (base as any).tatuagens ?? [],
    conflitosA: (base as any).conflitosA ?? [],
    conflitosB: (base as any).conflitosB ?? [],
    conflitosResolvidos: (base as any).conflitosResolvidos ?? [],
    historicoInfracional: (base as any).historicoInfracional ?? [],
    alertaRiscoSuicidio: base.alertaRiscoSuicidio ?? false,
    alertaPerfilMapeado: base.alertaPerfilMapeado ?? false,
    alertaSaudeConfidencial: base.alertaSaudeConfidencial ?? false,
    alertaSaudeDetalhes: base.alertaSaudeDetalhes ?? null,
    criadoEm: toOptionalString(base.criadoEm),
    atualizadoEm: toOptionalString(base.atualizadoEm),
  };
};

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
    nomeSocial: null,
    fotoUrl: null,
    numeroSms: null,
    dataNascimento: null,
    dataEntrada: null,
    numeroProcesso: null,
    atoInfracionalAtual: null,
    atoInfracionalAno: null,
    atoInfracionalProcesso: null,
    atoInfracionalGravidade: false,
    atoInfracionalGravidadeObs: null,
    bairroOrigemId: bairroId,
    faccaoGrupoId: faccaoId,
    alojamentoAtualId: null,
    faseInternacaoAtualId: null,
    faccao: null,
    bairroOrigem: null,
    riscoFuga: null,
    grupos: [],
    tatuagens: [],
    alertaRiscoSuicidio: false,
    alertaPerfilMapeado: false,
    alertaSaudeConfidencial: false,
    alertaSaudeDetalhes: null,
    conflitosA: [],
    conflitosB: [],
    conflitosResolvidos: [],
    historicoInfracional: [],
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  } as unknown as AdolescenteComConflitos);

const construirImpactosExternos = (
  adolescente: AdolescenteComConflitos,
  bairroReferencia: string | null,
  faccaoReferencia: string | null,
  mapaBairros: Map<string, BairroConflitoInfo>,
  mapaFaccoes: Map<string, FaccaoConflitoInfo>
): ConflitosExternosMapa => {
  const impactos: ImpactoConflitoExterno[] = [];

  // PRIORIDADE DE FACÇÃO: Só considera conflito de bairro se adolescente NÃO tem facção
  if (bairroReferencia && !faccaoReferencia) {
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
  let adolescente: AdolescenteComConflitos | null = adolescenteId
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

  if (!adolescente) {
    throw new Error("Nao foi possivel determinar dados do adolescente");
  }

  const adolescenteAvaliado = adolescente;

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
    adolescenteAvaliado,
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
          adolescenteAvaliado,
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
      id: adolescenteAvaliado.id,
      nome: adolescenteAvaliado.nomeCompleto,
    },
    sugestoes: selecionados.slice(0, limite),
  };
}
