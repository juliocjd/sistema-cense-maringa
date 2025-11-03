// types/index.ts
// Tipos compartilhados do sistema CENSE Maringá

export type StatusUnidade = "ATIVO" | "TRANSFERIDO" | "LIBERADO" | "EVADIDO";
export type StatusManutencao = "LIVRE" | "INTERDITADO";
export type Ala = "A" | "B" | null;

export type Conflito = {
  id: string;
  adolescenteAId: string;
  adolescenteBId: string;
  tipoConflito: string;
  status: "ATIVO" | "RESOLVIDO";
  descricao?: string;
  criadoEm: Date | string;
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

  // Alocação atual
  alojamentoAtualId?: string | null;

  // Alertas
  alertaRiscoSuicidio: boolean;
  alertaPerfilMapeado: boolean;
  alertaSaudeConfidencial: boolean;

  // Conflitos
  conflitosA: Conflito[];
  conflitosB: Conflito[];

  // Timestamps
  criadoEm?: Date | string;
  atualizadoEm?: Date | string;
};

export type Alojamento = {
  id: string;
  casaId: string;
  numeroAlojamento: string;
  ala: Ala;
  statusManutencao: StatusManutencao;
  alojamentoFrontalId?: string | null;
  localizacaoPreferencial?: boolean;
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
  nivel_risco: "CRÍTICO" | "ALTO" | "MÉDIO" | "BAIXO" | null;
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
