// Shared domain types for the CENSE Maringa system. All strings are kept in
// ASCII to avoid encoding issues that were breaking build pipelines.

import type { AlertaEspecialTipo } from "@/lib/alertas/especiais";

export type StatusUnidade = "ATIVO" | "TRANSFERIDO" | "LIBERADO" | "EVADIDO";
export type StatusManutencao = "LIVRE" | "INTERDITADO";
export type Ala = "A" | "B" | null;
export type RiscoFuga = "BAIXO" | "MEDIO" | "ALTO";
export type DestinacaoOperacionalCasa =
  | "PROVISORIA"
  | "DEFINITIVA"
  | "FASE_EXCLUSIVA"
  | "ABRIGAMENTO";
export type FaccaoInformacaoOrigem =
  | "CONFESSADA"
  | "OBSERVACAO"
  | "INTELIGENCIA"
  | "TERCEIROS"
  | "NAO_INFORMADO"
  | "OUTRO_INTERNO";

export interface CasaResumo {
  id: string;
  nome: string;
  numero: number | string | null;
  destinacaoOperacional?: DestinacaoOperacionalCasa | string | null;
  faseExclusivaId?: string | null;
  faseExclusiva?: { id: string; nomeFase: string } | null;
  prazoMaximoDias?: number | null;
  riscoMaximoPermitido?: number | null;
}

export interface PrazoOperacionalResumo {
  destinacao: "PROVISORIA" | "ABRIGAMENTO";
  prazoMaximoDias: number;
  dataInicio: string | null;
  dataLimite: string | null;
  diasPermanencia: number | null;
  vencido: boolean;
  diasAtraso: number;
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
  totalOcorrencias?: number;
  ultimaOcorrenciaEm?: string | null;
  ocorrencias?: Array<{
    id: string;
    descricao?: string | null;
    criadoEm: string | null;
    ci?: {
      id: string;
      numero: string | number | null;
      ano: string | number | null;
      tipo?: string | null;
      resumo?: string | null;
      dataFato?: string | null;
    } | null;
  }>;
  adversario?: {
    id: string;
    nomeCompleto: string;
    numeroSms?: string | null;
  } | null;
  adversarioLocal?: string | null;
  operadorResponsavel?: {
    id: string;
    nomeCompleto: string;
  } | null;
  protocoloRiscoSuicidio?: {
    ultimaEntrada?: { data: string; descricao: string | null } | null;
    ultimaAlta?: { data: string; descricao: string | null } | null;
  } | null;
}

export interface ConflitoResumo {
  id: string;
  tipo: string | null;
  status: string;
  ciNumero?: number | string | null;
  ciAno?: number | string | null;
  adversario?: {
    id: string;
    nome: string;
    sms?: string | null;
    alojamento?: string | null;
  } | null;
  adolescenteAId?: string | null;
  adolescenteBId?: string | null;
  origem?: string | null;
  criadoEm?: string | Date;
  resolvidoEm?: string | Date | null;
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
  faccoesAssociadas?: Array<{
    id: string;
    nomeFaccao: string;
  }>;
}

export interface HistoricoMovimentacaoRegistro {
  id: string;
  tipo: string;
  descricao?: string | null;
  registradoEm?: string | null;
  criadoEm: string;
  referenciaTipo?: string | null;
  referenciaId?: string | null;
  origemCasa?: {
    id: string;
    nome?: string | null;
    numero?: number | string | null;
  } | null;
  destinoCasa?: {
    id: string;
    nome?: string | null;
    numero?: number | string | null;
  } | null;
  origemAlojamento?: {
    id: string;
    numeroAlojamento?: string | null;
    ala?: Ala | string | null;
  } | null;
  destinoAlojamento?: {
    id: string;
    numeroAlojamento?: string | null;
    ala?: Ala | string | null;
  } | null;
  operador?: {
    id: string;
    nomeCompleto: string;
  } | null;
}

export interface FaccaoCatalogo {
  id: string;
  nomeFaccao: string;
  descricao?: string | null;
  totalAdolescentes?: number;
}

export interface CidadeCatalogo {
  id: string;
  nome: string;
  estado: string;
}

export interface BairroCatalogo {
  id: string;
  nomeBairro: string;
  cidade: string;
  cidadeId?: string;
  estado?: string | null;
  totalAdolescentes?: number;
}

export interface TatuagemCatalogo {
  id: string;
  nomeSimbolo: string;
  significadoAssociado?: string | null;
  nivelRisco?: string | null;
  totalUso?: number;
  faccoesAssociadas?: Array<{
    id: string;
    nomeFaccao: string;
  }>;
}

export interface AdolescenteHistoricoInfracionalItem {
  id: string;
  descricao: string;
  ano?: number | null;
  processo?: string | null;
  gravidade: boolean;
  gravidadeObs?: string | null;
  unidadeInternacao?: string | null;
  comarca?: string | null;
  observacoes?: string | null;
  catalogoId?: string | null;
}

export interface AdolescenteHistoricoRegistroInput {
  id?: string;
  descricao: string;
  ano?: number | string | null;
  processo?: string | null;
  comarca?: string | null;
  unidade?: string | null;
  observacoes?: string | null;
  catalogoId?: string | null;
}

export interface AdolescenteCasoInfracionalTipificacaoItem {
  id?: string;
  ordem?: number;
  catalogoId?: string | null;
  descricao?: string | null;
  principal?: boolean;
  naturezaExecucao?: "CONSUMADO" | "TENTADO" | null;
  qualificadora?: string | null;
  majorante?: string | null;
  observacoes?: string | null;
}

export interface AdolescenteCasoInfracionalTipificacaoInput {
  id?: string;
  ordem?: number;
  catalogoId?: string | null;
  descricao?: string | null;
  principal?: boolean;
  naturezaExecucao?: "CONSUMADO" | "TENTADO" | null;
  qualificadora?: string | null;
  majorante?: string | null;
  observacoes?: string | null;
}

export interface AdolescenteCasoInfracionalItem {
  id?: string;
  status?: string | null;
  numeroProcesso?: string | null;
  anoFato?: number | null;
  comarca?: string | null;
  narrativa?: string | null;
  tipificacoes?: AdolescenteCasoInfracionalTipificacaoItem[];
}

export interface AdolescenteCasoInfracionalInput {
  id?: string;
  status?: string | null;
  numeroProcesso?: string | null;
  anoFato?: number | string | null;
  comarca?: string | null;
  narrativa?: string | null;
  tipificacoes?: AdolescenteCasoInfracionalTipificacaoInput[];
}

export interface AdolescenteAtoInfracionalVinculoAdolescente {
  id: string;
  nomeCompleto: string;
  numeroSms?: string | null;
  fotoUrl?: string | null;
  statusUnidade?: StatusUnidade;
}

export interface AdolescenteAtoInfracionalVinculoItem {
  id?: string;
  descricao: string;
  adolescentes: AdolescenteAtoInfracionalVinculoAdolescente[];
  criadoEm?: string | null;
  atualizadoEm?: string | null;
}

export interface AdolescenteAtoInfracionalVinculoInput {
  id?: string;
  descricao: string;
  adolescentesIds: string[];
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
  atoInfracionalAtualId?: string | null;
  atoInfracionalAtual?: string | null;
  atoInfracionalCatalogoGravidade?: string | null;
  atoInfracionalCatalogoViolencia?: boolean | null;
  atoInfracionalAno?: number | null;
  atoInfracionalProcesso?: string | null;
  atoInfracionalObservacoes?: string | null;
  atoInfracionalGravidade: boolean;
  atoInfracionalGravidadeObs?: string | null;
  statusUnidade: StatusUnidade;

  alojamentoAtualId?: string | null;
  faseInternacaoAtualId?: string | null;
  alojamentoAtual?: AdolescenteAlojamentoResumo | null;
  dataDesinternacao?: string | null;
  tecnicosReferencia: {
    id: string;
    nome: string;
    atividade?: string | null;
    email: string;
    telefone?: string | null;
  }[];

  faccaoGrupoId?: string | null;
  faccaoFuncao?: string | null;
  faccaoInformacaoOrigem?: FaccaoInformacaoOrigem | string | null;
  faccaoInformacaoDetalhe?: string | null;
  faccaoVinculoAtualId?: string | null;
  faccaoHistorico?: AdolescenteFaccaoHistoricoItem[];
  faccao?: {
    id: string;
    nome: string;
  } | null;

  bairroOrigemId?: string | null;
  bairroOrigem?: {
    id: string;
    nome: string;
    cidade: string;
    estado?: string | null;
  } | null;

  riscoFuga?: RiscoFuga | string | null;
  riscoFugaOrigem?: {
    descricao?: string | null;
    registradoEm?: string | null;
    referenciaTipo?: string | null;
    referenciaId?: string | null;
    operador?: {
      id: string;
      nomeCompleto: string;
    } | null;
  } | null;

  grupos: AdolescenteGrupoResumo[];
  tatuagens: AdolescenteTatuagemResumo[];

  alertaRiscoSuicidio: boolean;
  alertaPerfilMapeado: boolean;
  alertaSaudeConfidencial: boolean;
  alertaSaudeDetalhes?: string | null;
  alertaRiscoSuicidioNivel?: string | null;

  conflitosA: Conflito[];
  conflitosB: Conflito[];
  conflitosResolvidos?: Conflito[];
  historicoInfracional: AdolescenteHistoricoInfracionalItem[];
  atoInfracionalVinculos?: AdolescenteAtoInfracionalVinculoItem[];
  casoInfracionalAtual?: AdolescenteCasoInfracionalItem | null;
  casosInfracionais?: AdolescenteCasoInfracionalItem[];
  alertasEspeciais?: AdolescenteAlertaEspecial[];
  alertasAtivos?: Array<{
    id: string;
    tipo: string | null;
    descricao: string | null;
    nivelRisco: string | null;
    criadoEm?: string | null;
  }>;
  alertasPendentes?: number;
  prazoOperacionalAtual?: PrazoOperacionalResumo | null;

  criadoEm?: string;
  atualizadoEm?: string;
}

export interface AdolescenteFaccaoHistoricoItem {
  id: string;
  faccaoId?: string | null;
  faccaoNome?: string | null;
  funcao?: string | null;
  origemInformacao: string;
  nivelConfianca?: string | null;
  statusRegistro: string;
  observacao?: string | null;
  fonte?: string | null;
  informante?: { id: string; nome: string; numeroSms?: string | null } | null;
  criadoEm: string;
  criadoPor?: { id: string; nome: string } | null;
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
    | "numeroProcesso"
    | "atoInfracionalAtualId"
    | "atoInfracionalAtual"
    | "atoInfracionalCatalogoGravidade"
    | "atoInfracionalCatalogoViolencia"
    | "atoInfracionalAno"
    | "atoInfracionalProcesso"
    | "atoInfracionalObservacoes"
    | "alojamentoAtual"
    | "tecnicosReferencia"
    | "grupos"
    | "tatuagens"
    | "conflitosA"
    | "conflitosB"
    | "conflitosResolvidos"
    | "historicoInfracional"
    | "atoInfracionalVinculos"
  >
  > & {
    alertasEspeciais?: Array<
      Pick<AdolescenteAlertaEspecial, "tipo" | "descricao" | "nivelRisco">
    >;
    casoInfracionalAtual?: AdolescenteCasoInfracionalInput | null;
    casosInfracionais?: AdolescenteCasoInfracionalInput[];
    historicoInfracional?: AdolescenteHistoricoRegistroInput[];
    atoInfracionalVinculos?: AdolescenteAtoInfracionalVinculoInput[];
    tatuagens?: Array<{
      catalogoId: string;
      localCorpo: string;
      observacoes?: string;
      significadoPessoal?: string;
    }>;
    tecnicosReferenciaIds?: string[];
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
  prazoOperacional?: PrazoOperacionalResumo | null;
  adolescentes: Adolescente[];
}

export interface Casa {
  id: string;
  numero: number;
  nome: string;
  isolada: boolean;
  observacoes?: string | null;
  destinacaoOperacional?: DestinacaoOperacionalCasa | string | null;
  faseExclusivaId?: string | null;
  faseExclusiva?: { id: string; nomeFase: string } | null;
  prazoMaximoDias?: number | null;
  riscoMaximoPermitido?: number | null;
  alojamentos: Alojamento[];
}

export interface VerificacaoConflito {
  permite_alocacao: boolean;
  requer_justificativa: boolean;
  nivel_risco:
    | "CRITICO"
    | "ALTO"
    | "MEDIO"
    | "BAIXO"
    | "ATENCAO"
    | "MONITORAR"
    | "SEGURO"
    | "LIVRE"
    | null;
  nivel_numerico: number | null;
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
      estado?: string | null;
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
  operadorResponsavel?: {
    id: string;
    nomeCompleto: string;
  } | null;
  protocoloRiscoSuicidio?: {
    ultimaEntrada?: { data: string; descricao: string | null } | null;
    ultimaAlta?: { data: string; descricao: string | null } | null;
  } | null;
}
