export type CatalogoBairro = {
  id: string;
  nome: string;
  cidade: string;
  cidadeId?: string;
  estado?: string | null;
  totalAdolescentes?: number;
};

export type CatalogoFaccao = {
  id: string;
  nome: string;
  descricao?: string | null;
  totalAdolescentes?: number;
};

export type ConflitoExternoResumo = {
  id: string;
  tipo: "BAIRRO" | "FACCAO";
  status: string;
  fonteInformacao?: string | null;
  origem: {
    id: string;
    nome: string;
    complemento?: string | null;
  };
  destino: {
    id: string;
    nome: string;
    complemento?: string | null;
  };
  criadoEm?: string | null;
};

export type ImpactoConflitoExterno = {
  conflitoId: string;
  conflitoTipo: "BAIRRO" | "FACCAO";
  statusConflito: string;
  risco: "ALTO" | "MEDIO" | "DESCONHECIDO";
  conflitoOrigem: {
    id: string;
    nome: string;
    complemento?: string | null;
  };
  conflitoDestino: {
    id: string;
    nome: string;
    complemento?: string | null;
  };
  adolescente: {
    id: string;
    nome: string;
    status: string;
    numeroSms?: string | null;
    bairro?: {
      id: string;
      nome: string;
      cidade: string;
      estado?: string | null;
    } | null;
    faccao?: {
      id: string;
      nome: string;
    } | null;
    alojamento?: {
      numero?: string | null;
      ala?: string | null;
      casa?: {
        nome: string;
        numero?: number | null;
      } | null;
    } | null;
  };
};

export type ImpactoConflitoPayload = {
  totalRegistros: number;
  totalConflitos: number;
  filtros: {
    tipo: "TERRITORIAL" | "FACCAO" | "TODOS";
    status: "ATIVO" | "INATIVO" | "TODOS";
    conflitoId?: string | null;
  };
  geradoEm: string;
  impactos: ImpactoConflitoExterno[];
  resumoPorConflito: Array<{
    conflitoId: string;
    conflitoTipo: "BAIRRO" | "FACCAO";
    totalAdolescentes: number;
  }>;
};
