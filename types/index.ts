// Shared domain types for the CENSE Maringa system

export type StatusUnidade = "ATIVO" | "TRANSFERIDO" | "LIBERADO" | "EVADIDO";
export type StatusManutencao = "LIVRE" | "INTERDITADO";
export type Ala = "A" | "B" | null;
export type RiscoFuga = "BAIXO" | "MEDIO" | "ALTO";

export type CasaResumo = {
  id: string;
  nome: string;
  numero: number | string | null;
};

export type AdolescenteAlojamentoResumo = {
  id: string;
  numero: string;
  ala?: Ala;
  casa?: CasaResumo | null;
  localizacaoPreferencial?: boolean;
};

export type AdolescenteGrupoResumo = {
  id: string;
  nome: string;
  casa?: CasaResumo | null;
};

export type Conflito = {
  id: string;
  adolescenteAId: string;
  adolescenteBId: string;
  tipoConflito?: string | null;
  status: "ATIVO" | "RESOLVIDO" | string;
  descricao?: string | null;
  criadoEm?: Date | string;
  adversario?: {
    id: string;
    nomeCompleto: string;
    numeroSms?: string | null;
  } | null;
};

export type AdolescenteTatuagemResumo = {
  id: string;
  catalogoId: string;
  simbolo: string;
  significado?: string | null;
  nivelRisco?: string | null;
  localCorpo?: string | null;
  observacoes?: string | null;
};

export type Adolescente = {
  id: string;
  nomeCompleto: string;
  nomeSocial?: string;
  numeroSms?: string;
  fotoUrl?: string | null;
  dataNascimento?: Date | string;
  dataEntrada?: Date | string;
  numeroProcesso?: string;
  atoInfracionalAtual?: string;
  statusUnidade: StatusUnidade;

  // Alocacao atual
  alojamentoAtualId?: string | null;
  alojamentoAtual?: AdolescenteAlojamentoResumo | null;

  // Vinculacoes e perfil
  faccao?: {
    id: string;
    nome: string;
    numeroMembro?: string | null;
  } | null;
  bairroOrigem?: {
    id: string;
    nome: string;
    cidade: string;
  } | null;
  riscoFuga?: RiscoFuga | string | null;

  grupos?: AdolescenteGrupoResumo[];

  tatuagens?: AdolescenteTatuagemResumo[];

  // Alertas
  alertaRiscoSuicidio: boolean;
  alertaPerfilMapeado: boolean;
  alertaSaudeConfidencial: boolean;
  alertaSaudeDetalhes?: string | null;

  // Conflitos (origem e adversarios completos)
  conflitosA?: Conflito[];
  conflitosB?: Conflito[];

  criadoEm?: Date | string;
  atualizadoEm?: Date | string;
};

export type ListaAdolescentesMeta = {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type ListaAdolescentesResponse = {
  data: Adolescente[];
  meta: ListaAdolescentesMeta;
};

export type Alojamento = {
  id: string;
  casaId: string;
  numeroAlojamento: string;
  ala: Ala;
  statusManutencao: StatusManutencao;
  alojamentoFrontalId?: string | null;
  localizacaoPreferencial?: boolean;
  corRisco?: "livre" | "interditado" | "perigo" | "atencao" | "seguro";
  nivelRisco?: number;
  icones?: string[];
  alertas?: string[];
  adolescentes: Adolescente[];
};

export type Casa = {
  id: string;
  numero: number;
  nome: string;
  isolada: boolean;
  observacoes?: string;
  alojamentos: Alojamento[];
};

export type VerificacaoConflito = {
  permite_alocacao: boolean;
  requer_justificativa: boolean;
  nivel_risco: "CRITICO" | "ALTO" | "MEDIO" | "BAIXO" | null;
  alertas: AlertaConflito[];
};

export type AlertaConflito = {
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
};

export type Operador = {
  id: string;
  nomeCompleto: string;
  email: string;
  funcaoRole: "ADMIN" | "OPERADOR";
  status: string;
};

export type DecisaoOperacional = {
  id: string;
  operadorId: string;
  dataHora: Date | string;
  tipoOperacao: string;
  adolescenteId?: string;
  grupoId?: string;
  alojamentoId?: string;
  nivelAlerta?: string;
  conflitosDetectados?: any;
  justificativaOperador: string;
  medidasAdicionais?: string[];
  status: string;
};
