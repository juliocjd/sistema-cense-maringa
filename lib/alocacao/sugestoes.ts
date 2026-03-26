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
import {
  construirMapaAlojamentos,
  avaliarVigilanciaFrontal,
} from "@/lib/alocacao/vigilancia-frontal";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";
import type { Adolescente, StatusUnidade } from "@/types";
import {
  ALERTAS_ESPECIAIS,
  alertaSuicidioExigeMonitoramento,
  extrairNivelRiscoSuicidio,
} from "@/lib/alertas/especiais";
import {
  casaCompativelComInternacao,
  type TipoInternacaoOperacional,
} from "@/lib/casas/configuracao-operacional";

type AdolescenteComConflitos = NonNullable<
  Awaited<ReturnType<typeof carregarAdolescenteParaSugestoes>>
> & {
  alertaRiscoSuicidioNivel?: string | null;
};

type CasaComAlojamentos = Awaited<
  ReturnType<typeof carregarCasasComAlojamentos>
>[number];

type AlojamentoCasa = CasaComAlojamentos["alojamentos"][number];

export interface SugestaoAlojamento {
  alojamentoId: string;
  casaId: string;
  casaNome: string;
  casaNumero: number;
  numero: string;
  ala: string | null;
  nivel: number;
  rotulo: string;
  descricao: string;
  alertas: string[];
  ambientais: string[];
}

export type DiagnosticoAlojamento = {
  id: string;
  numero: string;
  ala: string | null;
  status: "LIVRE" | "OCUPADO" | "INTERDITADO" | "BLOQUEADO_VIGILANCIA";
  ocupantes?: Array<{
    id: string;
    nome: string;
    numeroSms?: string | null;
  }>;
  motivos?: string[];
  risco?: {
    nivel: number;
    rotulo: string;
    descricao: string;
    alertas: string[];
    ambientais: string[];
  };
};

export type DiagnosticoCasa = {
  casaId: string;
  casaNome: string;
  casaNumero: number;
  totalAlojamentos: number;
  livres: number;
  ocupados: number;
  interditados: number;
  bloqueadosVigilancia: number;
  exigeVigilanciaFrontal: boolean;
  alojamentos: DiagnosticoAlojamento[];
};

interface SugestaoParams {
  adolescenteId?: string;
  bairroId?: string | null;
  faccaoId?: string | null;
  limite?: number;
  tipoInternacao?: TipoInternacaoOperacional | null;
  faseInternacaoAtualId?: string | null;
}

async function carregarAdolescenteParaSugestoes(adolescenteId: string) {
  const resultado = await prisma.adolescente.findUnique({
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
      alertasAtivos: {
        where: {
          desativadoEm: null,
          tipoAlerta: ALERTAS_ESPECIAIS.RISCO_SUICIDIO.tipoAlerta,
        },
        select: {
          tipoAlerta: true,
          nivelRisco: true,
        },
      },
    },
  });
  return resultado
    ? {
        ...resultado,
        alertaRiscoSuicidioNivel: extrairNivelRiscoSuicidio(
          resultado.alertasAtivos
        ),
      }
    : null;
}

async function carregarCasasComAlojamentos() {
  const casas = await prisma.casa.findMany({
    orderBy: { numero: "asc" },
    include: {
      faseExclusiva: {
        select: {
          id: true,
          nomeFase: true,
        },
      },
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
              alertasAtivos: {
                where: {
                  desativadoEm: null,
                  tipoAlerta: ALERTAS_ESPECIAIS.RISCO_SUICIDIO.tipoAlerta,
                },
                select: {
                  tipoAlerta: true,
                  nivelRisco: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return casas.map((casa) => ({
    ...casa,
    alojamentos: casa.alojamentos.map((alojamento) => ({
      ...alojamento,
      adolescentes:
        alojamento.adolescentes?.map((adolescente: any) => ({
          ...adolescente,
          alertaRiscoSuicidioNivel: extrairNivelRiscoSuicidio(
            adolescente.alertasAtivos
          ),
        })) ?? [],
    })),
  }));
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
    vulgo?: string | null;
    faccaoFuncao?: string | null;
    faccaoInformacaoOrigem?: string | null;
    faccaoInformacaoDetalhe?: string | null;
    faccao?: {
      id: string;
      nomeFaccao?: string | null;
      nome?: string | null;
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
      }
    : null;

  const bairroInfo = base.bairroOrigem
    ? {
        id: base.bairroOrigem.id,
        nome: base.bairroOrigem.nomeBairro ?? base.bairroOrigem.nome ?? "",
        cidade: base.bairroOrigem.cidade,
      }
    : null;

  const alertaSuicidioNivel =
    base.alertaRiscoSuicidioNivel ??
    extrairNivelRiscoSuicidio(
      (base as any).alertasAtivos ?? (base as any).alertasEspeciais
    );

  return {
    ...adolescente,
    statusUnidade: (base.statusUnidade ?? "ATIVO") as StatusUnidade,
    nomeSocial: base.nomeSocial ?? null,
    fotoUrl: base.fotoUrl ?? null,
    numeroSms: base.numeroSms ?? null,
    dataNascimento: toOptionalString(base.dataNascimento),
    dataEntrada: toOptionalString(base.dataEntrada),
    vulgo: base.vulgo ?? null,
    alojamentoAtualId: base.alojamentoAtualId ?? null,
    faseInternacaoAtualId: base.faseInternacaoAtualId ?? null,
    tecnicosReferencia:
      (base as any).tecnicosReferencia ??
      [],
    dataDesinternacao: toNullableString(base.dataDesinternacao),
    faccaoGrupoId: base.faccaoGrupoId ?? faccaoInfo?.id ?? null,
    faccaoFuncao: base.faccaoFuncao ?? null,
    faccaoInformacaoOrigem: base.faccaoInformacaoOrigem ?? null,
    faccaoInformacaoDetalhe: base.faccaoInformacaoDetalhe ?? null,
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
    alertaRiscoSuicidioNivel: alertaSuicidioNivel ?? null,
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
    vulgo: null,
    fotoUrl: null,
    numeroSms: null,
    dataNascimento: null,
    dataEntrada: null,
    numeroProcesso: null,
    atoInfracionalAtualId: null,
    atoInfracionalAtual: null,
    atoInfracionalAno: null,
    atoInfracionalProcesso: null,
    atoInfracionalGravidade: false,
    atoInfracionalGravidadeObs: null,
    bairroOrigemId: bairroId,
    faccaoGrupoId: faccaoId,
    faccaoFuncao: null,
    faccaoInformacaoOrigem: null,
    faccaoInformacaoDetalhe: null,
    alojamentoAtualId: null,
    faseInternacaoAtualId: null,
    faccao: null,
    bairroOrigem: null,
    riscoFuga: null,
    grupos: [],
    tatuagens: [],
    alertaRiscoSuicidio: false,
    alertaRiscoSuicidioNivel: null,
    alertaPerfilMapeado: false,
    alertaSaudeConfidencial: false,
    alertaSaudeDetalhes: null,
    tecnicosReferencia: [],
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
    casaNumero: casa.numero ?? 0,
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
  tipoInternacao = null,
  faseInternacaoAtualId,
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
  const faseParaAnalise =
    faseInternacaoAtualId ?? adolescenteAvaliado.faseInternacaoAtualId ?? null;

  const casas = await carregarCasasComAlojamentos();
  const mapaAlojamentos = construirMapaAlojamentos(casas);

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

      let avisosVigilancia: string[] = [];

      if (
        alertaSuicidioExigeMonitoramento(
          adolescenteAvaliado.alertaRiscoSuicidio ?? false,
          adolescenteAvaliado.alertaRiscoSuicidioNivel
        )
      ) {
        const vigilado = avaliarVigilanciaFrontal(alojamento, mapaAlojamentos);
        if (!vigilado.valido) {
          return;
        }
        avisosVigilancia = vigilado.avisos ?? [];
      }

      const avaliacao = avaliarCandidato(
        casa,
        alojamento,
        adolescenteAvaliado,
        conflitosExternos
      );

      if (
        !casaCompativelComInternacao({
          casa,
          tipoInternacao,
          faseInternacaoAtualId: faseParaAnalise,
          nivelRisco: avaliacao.nivel,
        })
      ) {
        return;
      }

      if (avisosVigilancia.length > 0) {
        const combinado = new Set(avaliacao.alertas);
        avisosVigilancia.forEach((aviso) => combinado.add(aviso));
        avaliacao.alertas = Array.from(combinado);
      }

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

export async function gerarDiagnosticoCasaParaAlocacao({
  adolescenteId,
  casaId,
  bairroId,
  faccaoId,
  tipoInternacao = null,
  faseInternacaoAtualId,
}: SugestaoParams & { casaId: string }) {
  let adolescente: AdolescenteComConflitos | null = adolescenteId
    ? await carregarAdolescenteParaSugestoes(adolescenteId)
    : null;

  if (adolescenteId && !adolescente) {
    throw new Error("Adolescente nao encontrado");
  }

  const bairroParaAnalise = bairroId ?? adolescente?.bairroOrigemId ?? null;
  const faccaoParaAnalise = faccaoId ?? adolescente?.faccaoGrupoId ?? null;

  if (!adolescente && !bairroParaAnalise && !faccaoParaAnalise) {
    throw new Error(
      "Informe adolescenteId ou pelo menos bairroId/faccaoId para diagnostico."
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
  const faseParaAnalise =
    faseInternacaoAtualId ?? adolescenteAvaliado.faseInternacaoAtualId ?? null;
  const casas = await carregarCasasComAlojamentos();
  const casaSelecionada = casas.find((casa) => casa.id === casaId);

  if (!casaSelecionada) {
    throw new Error("Casa nao encontrada para diagnostico");
  }

  if (
    !casaCompativelComInternacao({
      casa: casaSelecionada,
      tipoInternacao,
      faseInternacaoAtualId: faseParaAnalise,
    })
  ) {
    throw new Error("Casa incompatível com o tipo de internacao informado.");
  }

  const mapaAlojamentos = construirMapaAlojamentos(casas);
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

  const exigeVigilancia = alertaSuicidioExigeMonitoramento(
    adolescenteAvaliado.alertaRiscoSuicidio ?? false,
    adolescenteAvaliado.alertaRiscoSuicidioNivel
  );

  let livres = 0;
  let ocupados = 0;
  let interditados = 0;
  let bloqueadosVigilancia = 0;

  const alojamentos: DiagnosticoAlojamento[] = casaSelecionada.alojamentos.map(
    (alojamento) => {
      if (alojamento.statusManutencao !== "LIVRE") {
        interditados += 1;
        return {
          id: alojamento.id,
          numero: alojamento.numeroAlojamento,
          ala: alojamento.ala,
          status: "INTERDITADO",
          motivos: ["Alojamento interditado para uso."],
        };
      }

      if (alojamento.adolescentes.length > 0) {
        ocupados += 1;
        return {
          id: alojamento.id,
          numero: alojamento.numeroAlojamento,
          ala: alojamento.ala,
          status: "OCUPADO",
          ocupantes: alojamento.adolescentes.map((ado) => ({
            id: ado.id,
            nome: ado.nomeCompleto ?? "Sem nome",
            numeroSms: ado.numeroSms ?? null,
          })),
          motivos: ["Alojamento ocupado."],
        };
      }

      if (exigeVigilancia) {
        const vigilado = avaliarVigilanciaFrontal(
          alojamento,
          mapaAlojamentos
        );
        if (!vigilado.valido) {
          bloqueadosVigilancia += 1;
          return {
            id: alojamento.id,
            numero: alojamento.numeroAlojamento,
            ala: alojamento.ala,
            status: "BLOQUEADO_VIGILANCIA",
            motivos: [vigilado.motivo ?? "Sem vigilancia frontal valida."],
          };
        }
      }

      livres += 1;
      const avaliacao = avaliarCandidato(
        casaSelecionada,
        alojamento,
        adolescenteAvaliado,
        conflitosExternos
      );

      if (exigeVigilancia) {
        const vigilado = avaliarVigilanciaFrontal(
          alojamento,
          mapaAlojamentos
        );
        if (vigilado.avisos?.length) {
          const combinado = new Set(avaliacao.alertas);
          vigilado.avisos.forEach((aviso) => combinado.add(aviso));
          avaliacao.alertas = Array.from(combinado);
        }
      }

      return {
        id: alojamento.id,
        numero: alojamento.numeroAlojamento,
        ala: alojamento.ala,
        status: "LIVRE",
        risco: {
          nivel: avaliacao.nivel,
          rotulo: avaliacao.rotulo,
          descricao: avaliacao.descricao,
          alertas: avaliacao.alertas,
          ambientais: avaliacao.ambientais,
        },
      };
    }
  );

  return {
    casaId: casaSelecionada.id,
    casaNome: casaSelecionada.nome,
    casaNumero: casaSelecionada.numero ?? 0,
    totalAlojamentos: casaSelecionada.alojamentos.length,
    livres,
    ocupados,
    interditados,
    bloqueadosVigilancia,
    exigeVigilanciaFrontal: exigeVigilancia,
    alojamentos,
  };
}
