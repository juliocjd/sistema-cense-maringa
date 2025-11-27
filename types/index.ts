// Shared domain types for the CENSE Maringa system. All strings are kept in
// ASCII to avoid encoding issues that were breaking build pipelines.

import type { AlertaEspecialTipo } from "@/lib/alertas/especiais";

export type StatusUnidade = "ATIVO" | "TRANSFERIDO" | "LIBERADO" | "EVADIDO";
export type StatusManutencao = "LIVRE" | "INTERDITADO";
export type Ala = "A" | "B" | null;
export type RiscoFuga = "BAIXO" | "MEDIO" | "ALTO";
export type FaccaoInformacaoOrigem = "CONFESSADA" | "OBSERVACAO";

export interface CasaResumo {
  id: string;
  nome: string;
  numero: number | string | null;
}

export interface AdolescenteAlojamentoResumo {
  id: string;
  numero: string;
  ala: Ala;
  casa: CasaResumo | null;
  localizacaoPreferencial: boolean;
}

export interface AdolescenteGrupoResumo {
  id: string;
  nome: string;
  casa: CasaResumo | null;
}

export interface Conflito {
  id: string;
  adolescenteAId: string;
  adolescenteBId: string;
  tipoConflito?: string | null;
  status: "ATIVO" | "RESOLVIDO" | string;
  descricao?: string | null;
  criadoEm?: string;
  resolvidoEm?: string | null;
  adversario?: {
    id: string;
    nomeCompleto: string;
    numeroSms?: string | null;
  } | null;
  adversarioLocal?: string | null;
}

export interface AdolescenteTatuagemResumo {
  id: string;
  catalogoId: string;
  simbolo: string;
  significado?: string | null;
  significadoPessoal?: string | null;
  nivelRisco?: string | null;
  localCorpo?: string | null;
  observacoes?: string | null;
}

export interface FaccaoCatalogo {
  id: string;
  nomeFaccao: string;
  descricao?: string | null;
  totalAdolescentes?: number;
}

export interface BairroCatalogo {
  id: string;
  nomeBairro: string;
  cidade: string;
  totalAdolescentes?: number;
}

export interface TatuagemCatalogo {
  id: string;
  nomeSimbolo: string;
  significadoAssociado?: string | null;
  nivelRisco?: string | null;
  totalUso?: number;
}

export interface AdolescenteHistoricoInfracionalItem {
  id: string;
  descricao: string;
  ano?: number | null;
  processo?: string | null;
  gravidade: boolean;
  gravidadeObs?: string | null;
  unidadeInternacao?: string | null;
  observacoes?: string | null;
}

export interface AdolescenteHistoricoRegistroInput {
  descricao: string;
  ano?: number | string | null;
  unidade?: string | null;
  observacoes?: string | null;
}

export interface Adolescente {
  id: string;
  nomeCompleto: string;
  nomeSocial?: string | null;
  vulgo?: string | null;
  numeroSms?: string | null;
  numeroInterno?: number | null;
  fotoUrl?: string | null;
  dataNascimento?: string;
  dataEntrada?: string;
  numeroProcesso?: string | null;
  atoInfracionalAtual?: string | null;
  atoInfracionalAno?: number | null;
  atoInfracionalProcesso?: string | null;
  atoInfracionalGravidade: boolean;
  atoInfracionalGravidadeObs?: string | null;
  statusUnidade: StatusUnidade;

  alojamentoAtualId?: string | null;
  faseInternacaoAtualId?: string | null;
  alojamentoAtual?: AdolescenteAlojamentoResumo | null;
  dataDesinternacao?: string | null;
  tecnicoReferenciaId?: string | null;
  tecnicoReferencia?: {
    id: string;
    nome: string;
    atividade?: string | null;
    email: string;
    telefone?: string | null;
  } | null;

  faccaoGrupoId?: string | null;
  faccaoFuncao?: string | null;
  faccaoInformacaoOrigem?: FaccaoInformacaoOrigem | string | null;
  faccaoInformacaoDetalhe?: string | null;
  faccao?: {
    id: string;
    nome: string;
  } | null;

  bairroOrigemId?: string | null;
  bairroOrigem?: {
    id: string;
    nome: string;
    cidade: string;
  } | null;

  riscoFuga?: RiscoFuga | string | null;

  grupos: AdolescenteGrupoResumo[];
  tatuagens: AdolescenteTatuagemResumo[];

  alertaRiscoSuicidio: boolean;
  alertaPerfilMapeado: boolean;
  alertaSaudeConfidencial: boolean;
  alertaSaudeDetalhes?: string | null;

  conflitosA: Conflito[];
  conflitosB: Conflito[];
  conflitosResolvidos?: Conflito[];
  historicoInfracional: AdolescenteHistoricoInfracionalItem[];
  alertasEspeciais?: AdolescenteAlertaEspecial[];
  alertasPendentes?: number;

  criadoEm?: string;
  atualizadoEm?: string;
}

export type AdolescenteAlertaEspecial = {
  id?: string;
  tipo: AlertaEspecialTipo;
  descricao?: string | null;
  nivelRisco?: string | null;
};

export type AdolescenteCadastroPayload = Partial<
  Omit<
    Adolescente,
    | "alojamentoAtual"
    | "tecnicoReferencia"
    | "grupos"
    | "tatuagens"
    | "conflitosA"
    | "conflitosB"
    | "conflitosResolvidos"
    | "historicoInfracional"
  >
  > & {
    alertasEspeciais?: Array<
      Pick<AdolescenteAlertaEspecial, "tipo" | "descricao">
    >;
    historicoInfracional?: AdolescenteHistoricoRegistroInput[];
    tatuagens?: Array<{
    catalogoId: string;
    localCorpo: string;
    observacoes?: string;
    significadoPessoal?: string;
  }>;
};

export interface ListaAdolescentesMeta {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ListaAdolescentesResponse {
  data: Adolescente[];
  meta: ListaAdolescentesMeta;
}

export interface Alojamento {
  id: string;
  casaId: string;
  numeroAlojamento: string;
  ala: Ala;
  statusManutencao: StatusManutencao;
  alojamentoFrontalId?: string | null;
  localizacaoPreferencial: boolean;
  corRisco?: "livre" | "interditado" | "perigo" | "atencao" | "seguro";
  nivelRisco?: number;
  icones?: string[];
  alertas?: string[];
  interdicaoJustificativa?: string | null;
  interdicaoDocumentoTipo?: "CI" | "DECISAO_JUDICIAL" | "OUTRO" | null;
  interdicaoDocumentoReferencia?: string | null;
  adolescentes: Adolescente[];
}

export interface Casa {
  id: string;
  numero: number;
  nome: string;
  isolada: boolean;
  observacoes?: string | null;
  alojamentos: Alojamento[];
}

export interface VerificacaoConflito {
  permite_alocacao: boolean;
  requer_justificativa: boolean;
  nivel_risco: "CRITICO" | "ALTO" | "MEDIO" | "BAIXO" | null;
  alertas: AlertaConflito[];
}

export interface AlertaConflito {
  tipo: string;
  nivel: number;
  mensagem: string;
  adolescente_conflitante?: {
    id: string;
    nome: string;
    alojamento: string;
  };
  origem?: string;
  tipo_conflito?: string;
  recomendacao?: string;
}

export interface Operador {
  id: string;
  nomeCompleto: string;
  email: string;
  funcaoRole: "ADMIN" | "OPERADOR";
  status: string;
}

export interface TecnicoReferencia {
  id: string;
  nome: string;
  atividade?: string | null;
  email: string;
  telefone?: string | null;
}

export interface DecisaoOperacional {
  id: string;
  operadorId: string;
  dataHora: string;
  tipoOperacao: string;
  adolescenteId?: string;
  grupoId?: string;
  alojamentoId?: string;
  nivelAlerta?: string;
  conflitosDetectados?: unknown;
  justificativaOperador: string;
  medidasAdicionais?: string[];
  status: string;
}

export interface AlertaAtivo {
  id: string;
  adolescenteId: string;
  ciOrigemId?: string | null;
  tipoAlerta?: string | null;
  descricaoAlerta: string;
  nivelRisco?: string | null;
  criadoEm: string;
  desativadoEm?: string | null;
  adolescente?: {
    id: string;
    nomeCompleto: string;
    nomeSocial?: string | null;
    numeroSms?: string | null;
    fotoUrl?: string | null;
    statusUnidade: string;
    dataNascimento?: string | null;
    alojamentoAtual?: {
      id: string;
      numeroAlojamento: string;
      ala: Ala;
      casa: {
        id: string;
        nome: string;
        numero: number;
      };
    } | null;
    bairroOrigem?: {
      id: string;
      nomeBairro: string;
      cidade: string;
    } | null;
    faccao?: {
      id: string;
      nomeFaccao: string;
    } | null;
  };
  ciOrigem?: {
    id: string;
    numero: number;
    resumoCI: string;
    tipoCI: string;
    dataFato?: string | null;
  } | null;
}
