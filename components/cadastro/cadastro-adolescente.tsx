"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  MapPin,
  Users,
  FileText,
  AlertTriangle,
  Camera,
  Save,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Loader2,
  Lock,
  Activity,
  Bed,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  Adolescente,
  AdolescenteCadastroPayload,
  AdolescenteCasoInfracionalItem,
  AdolescenteHistoricoInfracionalItem,
  AdolescenteHistoricoRegistroInput,
  AdolescenteAtoInfracionalVinculoItem,
  AdolescenteAtoInfracionalVinculoAdolescente,
  AdolescenteFaccaoHistoricoItem,
  FaccaoCatalogo,
  BairroCatalogo,
  CidadeCatalogo,
  TatuagemCatalogo,
  RiscoFuga,
  StatusUnidade,
} from "@/types";
import { SeletorTatuagens } from "@/components/cadastro/seletor-tatuagens";
import {
  ALERTAS_ESPECIAIS,
  type AlertaEspecialTipo,
} from "@/lib/alertas/especiais";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { ESTADOS_BRASIL } from "@/lib/geo/estados";
import {
  filtrarCasasCompativeis,
  filtrarSugestoesCompativeis,
  obterEtiquetaCasaOperacional,
} from "@/lib/casas/configuracao-operacional";

const STATUS_OPCOES: Array<{ value: StatusUnidade; label: string }> = [
  { value: "ATIVO", label: "Ativo / Internado" },
  { value: "TRANSFERIDO", label: "Transferido" },
  { value: "LIBERADO", label: "Liberado" },
  { value: "EVADIDO", label: "Evadido" },
];

type AlertasEspeciaisFormState = Record<
  AlertaEspecialTipo,
  { ativo: boolean; descricao: string }
>;

const ALERTAS_ESPECIAIS_UI: Record<
  AlertaEspecialTipo,
  {
    titulo: string;
    descricao: string;
    destaque: string;
    corClasse: string;
    Icone: LucideIcon;
    fullWidth?: boolean;
  }
> = {
  RISCO_SUICIDIO: {
    titulo: "Risco de suicídio",
    descricao:
      "Adolescente apresenta histórico ou comportamento de risco para autolesão.",
    destaque:
      "Priorizar alojamentos 1, 6, 7 ou 10 e garantir monitoramento constante.",
    corClasse: "border-orange-200 bg-orange-50",
    Icone: AlertTriangle,
  },
  PERFIL_MAPEADO: {
    titulo: "Perfil mapeado (proteção)",
    descricao: "Ato infracional que necessita sigilo e proteção especial.",
    destaque:
      "Informa aos demais módulos que este perfil requer tratamento reservado.",
    corClasse: "border-purple-200 bg-purple-50",
    Icone: Lock,
  },
  SAUDE_CONFIDENCIAL: {
    titulo: "Alerta de saúde confidencial",
    descricao:
      "Condição de saúde que requer atençãoo e acompanhamento diferenciado.",
    destaque:
      "Utilize este campo para orientar equipes de plantão sobre cuidados específicos.",
    corClasse: "border-blue-200 bg-blue-50",
    Icone: Activity,
    fullWidth: true,
  },
};

const ALERTAS_ESPECIAIS_ORDEM: AlertaEspecialTipo[] = [
  "RISCO_SUICIDIO",
  "PERFIL_MAPEADO",
  "SAUDE_CONFIDENCIAL",
];
const MENSAGEM_SAIDA_SEM_SALVAR =
  "Voce tem alteracoes nao salvas. Deseja sair sem salvar?";

type TipoInternacao = "PROVISORIA" | "DEFINITIVA";

type SugestaoAlojamentoCadastro = {
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
};

type DiagnosticoCasaApi = {
  casaId: string;
  casaNome: string;
  casaNumero: number;
  totalAlojamentos: number;
  livres: number;
  ocupados: number;
  interditados: number;
  bloqueadosVigilancia: number;
  exigeVigilanciaFrontal: boolean;
  alojamentos: Array<{
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
  }>;
};

type AtoCatalogoOption = {
  id: string;
  nome: string;
  ativo: boolean;
  gravidade?: string | null;
  violenciaOuGraveAmeaca?: boolean | null;
};

type GestaoAtoItem = {
  id: string;
  nome: string;
  gravidade?: string | null;
  violenciaOuGraveAmeaca?: boolean | null;
  ativo: boolean;
};

type GestaoAtoAdolescenteVinculado = {
  id: string;
  nomeCompleto: string;
  statusUnidade?: string | null;
};

type CasoTipificacaoFormState = {
  id?: string;
  ordem: number;
  buscaCatalogo: string;
  catalogoId: string;
  descricao: string;
  principal: boolean;
  naturezaExecucao: "" | "CONSUMADO" | "TENTADO";
  qualificadora: string;
  majorante: string;
  observacoes: string;
};

const NATUREZA_EXECUCAO_OPCOES: Array<{
  value: "" | "CONSUMADO" | "TENTADO";
  label: string;
}> = [
  { value: "", label: "Não informado" },
  { value: "CONSUMADO", label: "Consumado" },
  { value: "TENTADO", label: "Tentado" },
];

type CasoInfracionalFormState = {
  id?: string;
  status?: string | null;
  comarca: string;
  narrativa: string;
  tipificacoes: CasoTipificacaoFormState[];
};

type CasoHistoricoFormState = {
  chaveLocal: string;
  id?: string;
  status?: string | null;
  numeroProcesso: string;
  anoFato: string;
  comarca: string;
  narrativa: string;
  tipificacoes: CasoTipificacaoFormState[];
};

let sequencialCasoHistoricoLocal = 0;

const criarChaveCasoHistoricoLocal = () =>
  `caso-historico-${++sequencialCasoHistoricoLocal}`;

const compararAtoPorNome = (
  a: { nome?: string | null },
  b: { nome?: string | null },
) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR", { sensitivity: "base" });

const removerMarcadorTentativa = (descricao?: string | null) =>
  (descricao ?? "").replace(/\s+tentad[oa]\s*$/i, "").trim();

const montarDescricaoAutomaticaTipificacao = (
  descricaoBase?: string | null,
  naturezaExecucao?: "" | "CONSUMADO" | "TENTADO" | null,
) => {
  const descricaoNormalizada = removerMarcadorTentativa(descricaoBase);
  if (!descricaoNormalizada) {
    return "";
  }

  return naturezaExecucao === "TENTADO"
    ? `${descricaoNormalizada} Tentado`
    : descricaoNormalizada;
};

const obterSugestoesAtoCatalogo = (
  atos: AtoCatalogoOption[],
  termo: string,
  limite: number = 12,
) => {
  const termoNormalizado = normalizarTexto(termo.trim());
  const base = termoNormalizado
    ? atos.filter((ato) => normalizarTexto(ato.nome).includes(termoNormalizado))
    : atos;

  return base.slice(0, limite);
};

const criarTipificacaoCasoVazia = (
  ordem: number = 1,
): CasoTipificacaoFormState => ({
  ordem,
  buscaCatalogo: "",
  catalogoId: "",
  descricao: "",
  principal: ordem === 1,
  naturezaExecucao: "",
  qualificadora: "",
  majorante: "",
  observacoes: "",
});

const normalizarCasoInfracionalFormulario = (
  caso?: AdolescenteCasoInfracionalItem | null,
): CasoInfracionalFormState => ({
  id: caso?.id,
  status: caso?.status ?? null,
  comarca: caso?.comarca ?? "",
  narrativa: caso?.narrativa ?? "",
  tipificacoes: (() => {
    const tipificacoesBase = caso?.tipificacoes ?? [];
    if (tipificacoesBase.length === 0) {
      return [criarTipificacaoCasoVazia(1)];
    }
    return tipificacoesBase.map((tipificacao, indiceTip) => ({
      id: tipificacao.id,
      ordem: tipificacao.ordem ?? indiceTip + 1,
      buscaCatalogo: removerMarcadorTentativa(tipificacao.descricao ?? ""),
      catalogoId: tipificacao.catalogoId ?? "",
      descricao: tipificacao.catalogoId
        ? montarDescricaoAutomaticaTipificacao(
            tipificacao.descricao ?? "",
            tipificacao.naturezaExecucao ?? "",
          )
        : tipificacao.descricao ?? "",
      principal: tipificacao.principal ?? indiceTip === 0,
      naturezaExecucao:
        tipificacao.naturezaExecucao === "CONSUMADO" ||
        tipificacao.naturezaExecucao === "TENTADO"
          ? tipificacao.naturezaExecucao
          : "",
      qualificadora: tipificacao.qualificadora ?? "",
      majorante: tipificacao.majorante ?? "",
      observacoes: tipificacao.observacoes ?? "",
    }));
  })(),
});

const normalizarCasoHistoricoFormulario = (
  caso?: AdolescenteCasoInfracionalItem | null,
): CasoHistoricoFormState => ({
  chaveLocal: criarChaveCasoHistoricoLocal(),
  id: caso?.id,
  status: caso?.status ?? "HISTORICO",
  numeroProcesso: caso?.numeroProcesso ?? "",
  anoFato:
    caso?.anoFato !== null && caso?.anoFato !== undefined
      ? String(caso.anoFato)
      : "",
  comarca: caso?.comarca ?? "",
  narrativa: caso?.narrativa ?? "",
  tipificacoes: normalizarCasoInfracionalFormulario(caso).tipificacoes,
});

const converterHistoricoLegadoParaCasoFormulario = (
  item: AdolescenteHistoricoInfracionalItem,
): CasoHistoricoFormState => ({
  chaveLocal: criarChaveCasoHistoricoLocal(),
  id: item.id,
  status: "HISTORICO",
  numeroProcesso: item.processo ?? "",
  anoFato: item.ano !== null && item.ano !== undefined ? String(item.ano) : "",
  comarca: item.comarca ?? item.unidadeInternacao ?? "",
  narrativa: "",
  tipificacoes: [
    {
      ordem: 1,
      buscaCatalogo: removerMarcadorTentativa(item.descricao ?? ""),
      catalogoId: item.catalogoId ?? "",
      descricao: item.descricao ?? "",
      principal: true,
      naturezaExecucao: "",
      qualificadora: "",
      majorante: "",
      observacoes: item.observacoes ?? "",
    },
  ],
});

const normalizarCasosHistoricosFormulario = (
  casos?: AdolescenteCasoInfracionalItem[] | null,
  historicoLegado?: AdolescenteHistoricoInfracionalItem[] | null,
): CasoHistoricoFormState[] => {
  const historicosEstruturados = (casos ?? [])
    .filter((caso) => caso.status !== "ATUAL")
    .map((caso) => normalizarCasoHistoricoFormulario(caso));

  if (historicosEstruturados.length > 0) {
    return historicosEstruturados;
  }

  return (historicoLegado ?? []).map((item) =>
    converterHistoricoLegadoParaCasoFormulario(item),
  );
};

const resumirTipificacaoCasoHistorico = (
  tipificacao: CasoTipificacaoFormState,
) => {
  const descricao =
    montarDescricaoAutomaticaTipificacao(
      tipificacao.descricao,
      tipificacao.naturezaExecucao,
    ) || "Ato não informado";
  const complementos = [
    tipificacao.qualificadora.trim(),
    tipificacao.majorante.trim(),
  ].filter(Boolean);

  return complementos.length > 0
    ? `${descricao} (${complementos.join(" | ")})`
    : descricao;
};

const resumirCasoHistorico = (caso: CasoHistoricoFormState) => {
  const tipificacoes = caso.tipificacoes
    .map(resumirTipificacaoCasoHistorico)
    .filter(Boolean);
  const principal = tipificacoes[0] ?? "Sem ato informado";

  if (tipificacoes.length <= 1) {
    return principal;
  }

  return `${principal} + ${tipificacoes.length - 1} tipificacao(oes)`;
};

type ResultadoFiltroSugestoes = {
  lista: SugestaoAlojamentoCadastro[];
  aviso: string | null;
};

type CasaCatalogoOperacional = {
  id: string;
  nome: string;
  numero: number;
  destinacaoOperacional?: string | null;
  faseExclusivaId?: string | null;
  faseExclusiva?: { id: string; nomeFase: string } | null;
  prazoMaximoDias?: number | null;
  riscoMaximoPermitido?: number | null;
};

type SmsDuplicadoInfo = {
  id: string;
  nomeCompleto: string;
  numeroSms: string | null;
};

const aplicarFiltroSugestoes = (
  sugestoes: SugestaoAlojamentoCadastro[],
  tipo: TipoInternacao | null,
  casasCatalogo: CasaCatalogoOperacional[],
  faseInternacaoAtualId?: string | null,
  casaPreferenciaId?: string | null,
): ResultadoFiltroSugestoes => {
  if (sugestoes.length === 0) {
    return { lista: [], aviso: null };
  }

  let filtradas = filtrarSugestoesCompativeis({
    sugestoes,
    casas: casasCatalogo,
    tipoInternacao: tipo,
    faseInternacaoAtualId,
  });

  if (casaPreferenciaId) {
    filtradas = filtradas.filter((item) => item.casaId === casaPreferenciaId);
    if (filtradas.length === 0) {
      return {
        lista: [],
        aviso: "Nenhum alojamento recomendado para a casa selecionada.",
      };
    }
  }

  if (filtradas.length === 0) {
    return {
      lista: [],
      aviso:
        tipo !== null
          ? "Nenhum alojamento atende aos criterios definidos para este tipo de internacao."
          : null,
    };
  }

  const ordenadas = [...filtradas].sort((a, b) => a.nivel - b.nivel);
  const seguras = ordenadas.filter((item) => item.nivel <= 3);

  if (seguras.length > 0) {
    return {
      lista: seguras.slice(0, 10),
      aviso: null,
    };
  }

  return {
    lista: ordenadas.slice(0, 3),
    aviso:
      "Nenhum alojamento seguro disponivel. Listando as opcoes menos arriscadas.",
  };
};

const normalizarTexto = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const forcarNomeMaiusculo = (valor: string) => valor.toLocaleUpperCase("pt-BR");

const calcularIdade = (data?: string | null) => {
  if (!data) return null;
  const partes = data.split("-");
  if (partes.length !== 3) return null;
  const [anoStr, mesStr, diaStr] = partes;
  const ano = Number.parseInt(anoStr, 10);
  const mes = Number.parseInt(mesStr, 10);
  const dia = Number.parseInt(diaStr, 10);
  if (!Number.isFinite(ano) || !Number.isFinite(mes) || !Number.isFinite(dia)) {
    return null;
  }
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const aniversario = new Date(hoje.getFullYear(), mes - 1, dia);
  if (hoje < aniversario) {
    idade -= 1;
  }
  return idade >= 0 ? idade : null;
};

interface CadastroAdolescenteProps {
  onSalvar: (
    adolescente: AdolescenteCadastroPayload,
    alojamentoId?: string,
  ) => Promise<void>;
  onCancelar: () => void;
  initialData?: Adolescente | null;
  modo?: "CADASTRO" | "EDICAO";
  permitirAlocacaoAutomatica?: boolean;
}

export function CadastroAdolescente({
  onSalvar,
  onCancelar,
  initialData,
  modo = "CADASTRO",
  permitirAlocacaoAutomatica,
}: CadastroAdolescenteProps) {
  const ehEdicao = modo === "EDICAO";
  const { user } = useAuth();
  const isAdmin = useMemo(() => {
    const cargo = user?.cargo ?? "";
    const roles = user?.roles ?? [];
    return (
      cargo.toUpperCase() === "ADMIN" ||
      roles.some((role) => role.toUpperCase() === "ADMIN")
    );
  }, [user]);
  const podeAlterarAlojamento = useMemo(
    () =>
      hasPermission(
        user?.permissions,
        PERMISSIONS.ADOLESCENTES_EDIT_ALOJAMENTO,
      ),
    [user?.permissions],
  );
  const podeSelecionarAlojamento = podeAlterarAlojamento;
  const podeGerarSugestoes =
    (permitirAlocacaoAutomatica ?? !ehEdicao) && podeAlterarAlojamento;
  const tituloPagina = ehEdicao
    ? "Editar adolescente"
    : "Cadastro de Adolescente";
  const subtituloPagina = ehEdicao
    ? "Revise e atualize os dados cadastrados antes de salvar."
    : "Preencha todas as informações necessárias para o dossiê completo.";
  const textoBotaoSalvar = ehEdicao ? "Salvar alterações" : "Salvar cadastro";
  const textoCancelarAcao = ehEdicao ? "Cancelar edição" : "Cancelar cadastro";
  const mensagemSucesso = ehEdicao
    ? "Adolescente atualizado com sucesso!"
    : "Adolescente cadastrado com sucesso!";
  const mensagemErro = ehEdicao
    ? "Erro ao atualizar adolescente. Tente novamente."
    : "Erro ao salvar adolescente. Tente novamente.";
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [loading, setLoading] = useState(false);
  const estadoInicialRef = useRef<string | null>(null);
  const temAlteracaoRef = useRef(false);
  const [errosFormulario, setErrosFormulario] = useState<string[]>([]);
  const [statusUnidade, setStatusUnidade] = useState<StatusUnidade>("ATIVO");
  const [dataStatus, setDataStatus] = useState("");
  const router = useRouter();
  const [smsDuplicado, setSmsDuplicado] = useState<SmsDuplicadoInfo | null>(
    null,
  );
  const [smsVerificando, setSmsVerificando] = useState(false);
  const [smsUltimoVerificado, setSmsUltimoVerificado] = useState<string | null>(
    null,
  );
  const [smsErroVerificacao, setSmsErroVerificacao] = useState<string | null>(
    null,
  );
  const smsValidacaoRef = useRef(0);

  // Estados do formulario
  const [dadosPessoais, setDadosPessoais] = useState({
    nomeCompleto: "",
    nomeSocial: "",
    vulgo: "",
    dataNascimento: "",
    numeroSms: "",
    numeroInterno: "",
    dataEntrada: new Date().toISOString().split("T")[0],
  });
  const idadeAdolescente = useMemo(
    () => calcularIdade(dadosPessoais.dataNascimento),
    [dadosPessoais.dataNascimento],
  );

  const [atoInfracional, setAtoInfracional] = useState({
    catalogoId: "",
    descricao: "",
    gravidadeCatalogo: "",
    violenciaCatalogo: null as boolean | null,
    ano: "",
    processo: "",
    observacoesComplementares: "",
    gravidade: false,
    gravidadeDescricao: "",
  });
  const [casoInfracionalAtual, setCasoInfracionalAtual] =
    useState<CasoInfracionalFormState>(() =>
      normalizarCasoInfracionalFormulario(initialData?.casoInfracionalAtual),
    );
  const [casosHistoricos, setCasosHistoricos] = useState<
    CasoHistoricoFormState[]
  >(() =>
    normalizarCasosHistoricosFormulario(
      initialData?.casosInfracionais,
      initialData?.historicoInfracional,
    ),
  );
  const [casosHistoricosExpandidos, setCasosHistoricosExpandidos] = useState<
    string[]
  >([]);
  const [atoInfracionalVinculos, setAtoInfracionalVinculos] = useState<
    AdolescenteAtoInfracionalVinculoItem[]
  >([]);
  const [vinculoDescricao, setVinculoDescricao] = useState("");
  const [vinculoBusca, setVinculoBusca] = useState("");
  const [vinculoSugestoes, setVinculoSugestoes] = useState<
    AdolescenteAtoInfracionalVinculoAdolescente[]
  >([]);
  const [mostrandoSugestoesVinculo, setMostrandoSugestoesVinculo] =
    useState(false);
  const [buscandoVinculo, setBuscandoVinculo] = useState(false);
  const [vinculoSelecionados, setVinculoSelecionados] = useState<
    AdolescenteAtoInfracionalVinculoAdolescente[]
  >([]);
  const [vinculoEmEdicao, setVinculoEmEdicao] =
    useState<AdolescenteAtoInfracionalVinculoItem | null>(null);
  const [vinculoEmEdicaoId, setVinculoEmEdicaoId] = useState<string | null>(
    null,
  );

  const [vinculacoes, setVinculacoes] = useState({
    faccaoId: "",
    faccaoFuncao: "",
    faccaoOrigem: "" as
      | ""
      | "CONFESSADA"
      | "OBSERVACAO"
      | "INTELIGENCIA"
      | "TERCEIROS"
      | "NAO_INFORMADO"
      | "OUTRO_INTERNO",
    faccaoOrigemDetalhe: "",
    bairroId: "",
    riscoFuga: "BAIXO" as RiscoFuga,
  });
  const [faccaoHistorico, setFaccaoHistorico] = useState<
    AdolescenteFaccaoHistoricoItem[]
  >(initialData?.faccaoHistorico ?? []);
  const [modalDeclaracaoFaccao, setModalDeclaracaoFaccao] = useState<{
    aberto: boolean;
    faccaoId: string;
    funcao: string;
    origem:
      | ""
      | "CONFESSADA"
      | "OBSERVACAO"
      | "INTELIGENCIA"
      | "TERCEIROS"
      | "NAO_INFORMADO"
      | "OUTRO_INTERNO";
    nivelConfianca: "" | "BAIXO" | "MEDIO" | "ALTO" | "NAO_AVALIADO";
    observacao: string;
    fonte: string;
    informanteId: string;
    informanteNome: string;
    informanteSms: string;
    salvando: boolean;
    erro: string | null;
  }>({
    aberto: false,
    faccaoId: "",
    funcao: "",
    origem: "NAO_INFORMADO",
    nivelConfianca: "NAO_AVALIADO",
    observacao: "",
    fonte: "",
    informanteId: "",
    informanteNome: "",
    informanteSms: "",
    salvando: false,
    erro: null,
  });
  const [informanteBusca, setInformanteBusca] = useState("");
  const [informanteSugestoes, setInformanteSugestoes] = useState<
    Array<{ id: string; nome: string; numeroSms: string | null }>
  >([]);
  const [mostrandoInformanteSugestoes, setMostrandoInformanteSugestoes] =
    useState(false);
  const [buscandoInformante, setBuscandoInformante] = useState(false);
  const [riscoFugaOrigemInfo, setRiscoFugaOrigemInfo] = useState<
    Adolescente["riscoFugaOrigem"] | null
  >(null);
  const temFaccaoSelecionada = Boolean(vinculacoes.faccaoId);

  const [tecnicosReferenciaIds, setTecnicosReferenciaIds] = useState<string[]>(
    [],
  );
  const [tecnicosDisponiveis, setTecnicosDisponiveis] = useState<
    Array<{
      id: string;
      nome: string;
      atividade?: string | null;
      email: string;
    }>
  >([]);
  const [carregandoTecnicos, setCarregandoTecnicos] = useState(false);
  const [erroTecnicos, setErroTecnicos] = useState<string | null>(null);
  const [buscaTecnico, setBuscaTecnico] = useState("");
  const tecnicosFiltrados = useMemo(() => {
    const termo = buscaTecnico.toLowerCase();
    return tecnicosDisponiveis.filter(
      (tec) =>
        tec.nome.toLowerCase().includes(termo) ||
        (tec.email ?? "").toLowerCase().includes(termo) ||
        (tec.atividade ?? "").toLowerCase().includes(termo),
    );
  }, [buscaTecnico, tecnicosDisponiveis]);
  const podeAdicionarVinculo =
    vinculoDescricao.trim().length >= 3 && vinculoSelecionados.length > 0;

  const [tatuagens, setTatuagens] = useState<
    {
      catalogoId: string;
      localCorpo: string;
      observacoes: string;
      significadoPessoal: string;
    }[]
  >([]);

  const [alertasEspeciais, setAlertasEspeciais] =
    useState<AlertasEspeciaisFormState>({
      RISCO_SUICIDIO: { ativo: false, descricao: "" },
      PERFIL_MAPEADO: { ativo: false, descricao: "" },
      SAUDE_CONFIDENCIAL: { ativo: false, descricao: "" },
    });
  const [modalAlertaEspecial, setModalAlertaEspecial] = useState<{
    aberto: boolean;
    tipo: AlertaEspecialTipo | null;
    descricao: string;
  }>({
    aberto: false,
    tipo: null,
    descricao: "",
  });

  const abrirModalAlertaEspecial = (tipo: AlertaEspecialTipo) => {
    setModalAlertaEspecial({
      aberto: true,
      tipo,
      descricao: alertasEspeciais[tipo]?.descricao ?? "",
    });
  };

  const fecharModalAlertaEspecial = () =>
    setModalAlertaEspecial({ aberto: false, tipo: null, descricao: "" });

  const confirmarModalAlertaEspecial = () => {
    const tipo = modalAlertaEspecial.tipo;
    if (!tipo) return;
    setAlertasEspeciais((prev) => ({
      ...prev,
      [tipo]: {
        ativo: true,
        descricao: modalAlertaEspecial.descricao.trim(),
      },
    }));
    fecharModalAlertaEspecial();
  };

  const handleToggleAlertaEspecial = (
    tipo: AlertaEspecialTipo,
    ativar: boolean,
  ) => {
    if (ativar) {
      abrirModalAlertaEspecial(tipo);
      return;
    }
    setAlertasEspeciais((prev) => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        ativo: false,
      },
    }));
  };

  const formatarDataInput = (valor?: string | null) => {
    if (!valor) return "";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime()) || data.getUTCFullYear() < 1900) {
      return "";
    }
    return data.toISOString().split("T")[0];
  };

  const obterStatusLabel = (status?: StatusUnidade | null) => {
    if (!status) return "Não informado";
    return (
      STATUS_OPCOES.find((opcao) => opcao.value === status)?.label ?? status
    );
  };

  const limparValidacaoSms = () => {
    setSmsDuplicado(null);
    setSmsErroVerificacao(null);
    setSmsUltimoVerificado(null);
  };

  const verificarNumeroSms = async () => {
    const smsSanitizado = dadosPessoais.numeroSms.trim();
    if (!smsSanitizado) {
      limparValidacaoSms();
      return;
    }

    if (
      ehEdicao &&
      initialData?.numeroSms &&
      smsSanitizado === initialData.numeroSms.trim()
    ) {
      setSmsDuplicado(null);
      setSmsErroVerificacao(null);
      setSmsUltimoVerificado(smsSanitizado);
      return;
    }

    if (smsSanitizado === smsUltimoVerificado) {
      return;
    }

    const requestId = ++smsValidacaoRef.current;
    setSmsVerificando(true);
    setSmsErroVerificacao(null);

    try {
      const params = new URLSearchParams({ numeroSms: smsSanitizado });
      if (ehEdicao && initialData?.id) {
        params.set("ignorarId", initialData.id);
      }
      const response = await fetch(
        `/api/adolescentes/validar-sms?${params.toString()}`,
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.erro ?? "Erro ao validar número SMS");
      }

      if (smsValidacaoRef.current !== requestId) {
        return;
      }

      if (payload?.existe) {
        setSmsDuplicado(payload.adolescente ?? null);
      } else {
        setSmsDuplicado(null);
      }
      setSmsUltimoVerificado(smsSanitizado);
    } catch (error) {
      if (smsValidacaoRef.current !== requestId) {
        return;
      }
      setSmsErroVerificacao(
        error instanceof Error ? error.message : "Erro ao validar número SMS",
      );
      setSmsDuplicado(null);
      setSmsUltimoVerificado(null);
    } finally {
      if (smsValidacaoRef.current === requestId) {
        setSmsVerificando(false);
      }
    }
  };

  useEffect(() => {
    if (!initialData) return;
    estadoInicialRef.current = null;
    temAlteracaoRef.current = false;

    setDadosPessoais({
      nomeCompleto: forcarNomeMaiusculo(initialData.nomeCompleto ?? ""),
      nomeSocial: initialData.nomeSocial ?? "",
      vulgo: initialData.vulgo ?? "",
      dataNascimento: formatarDataInput(initialData.dataNascimento),
      numeroSms: initialData.numeroSms ?? "",
      numeroInterno: initialData.numeroInterno
        ? String(initialData.numeroInterno)
        : "",
      dataEntrada: formatarDataInput(initialData.dataEntrada) || "",
    });

    setStatusUnidade(initialData.statusUnidade ?? "ATIVO");
    setDataStatus(
      initialData.statusUnidade && initialData.statusUnidade !== "ATIVO"
        ? formatarDataInput(initialData.dataDesinternacao)
        : "",
    );

    setAtoInfracional({
      catalogoId:
        initialData.casoInfracionalAtual?.tipificacoes?.find(
          (tipificacao) => tipificacao.principal,
        )?.catalogoId ??
        initialData.casoInfracionalAtual?.tipificacoes?.[0]?.catalogoId ??
        initialData.atoInfracionalAtualId ??
        "",
      descricao: initialData.atoInfracionalAtual ?? "",
      gravidadeCatalogo: initialData.atoInfracionalCatalogoGravidade ?? "",
      violenciaCatalogo: initialData.atoInfracionalCatalogoViolencia ?? null,
      ano:
        (initialData.casoInfracionalAtual?.anoFato ??
        initialData.atoInfracionalAno)
          ? String(
              initialData.casoInfracionalAtual?.anoFato ??
                initialData.atoInfracionalAno,
            )
          : "",
      processo:
        initialData.casoInfracionalAtual?.numeroProcesso ??
        initialData.atoInfracionalProcesso ??
        initialData.numeroProcesso ??
        "",
      observacoesComplementares:
        initialData.casoInfracionalAtual?.narrativa ??
        initialData.atoInfracionalObservacoes ??
        "",
      gravidade: initialData.atoInfracionalGravidade ?? false,
      gravidadeDescricao: initialData.atoInfracionalGravidadeObs ?? "",
    });
    setCasoInfracionalAtual(
      normalizarCasoInfracionalFormulario(initialData.casoInfracionalAtual),
    );
    setCasosHistoricos(
      normalizarCasosHistoricosFormulario(
        initialData.casosInfracionais,
        initialData.historicoInfracional,
      ),
    );
    setCasosHistoricosExpandidos([]);
    setAtoInfracionalVinculos(
      (initialData.atoInfracionalVinculos ?? []).map((vinculo) => ({
        ...vinculo,
        adolescentes: (vinculo.adolescentes ?? []).filter(
          (adolescente) => adolescente.id !== initialData.id,
        ),
      })),
    );

    setVinculacoes({
      faccaoId: initialData.faccaoGrupoId ?? "",
      faccaoFuncao: initialData.faccaoFuncao ?? "",
      faccaoOrigem:
        (initialData.faccaoInformacaoOrigem as
          | ""
          | "CONFESSADA"
          | "OBSERVACAO") ?? "",
      faccaoOrigemDetalhe: initialData.faccaoInformacaoDetalhe ?? "",
      bairroId: initialData.bairroOrigemId ?? "",
      riscoFuga: (initialData.riscoFuga as RiscoFuga) ?? "BAIXO",
    });
    if (initialData.bairroOrigem) {
      const estado = initialData.bairroOrigem.estado
        ? ` - ${initialData.bairroOrigem.estado}`
        : "";
      setBairroBusca(
        `${initialData.bairroOrigem.nome} - ${initialData.bairroOrigem.cidade}${estado}`,
      );
    } else {
      setBairroBusca("");
    }
    setFaccaoHistorico(initialData.faccaoHistorico ?? []);
    setTecnicosReferenciaIds(
      Array.isArray(initialData.tecnicosReferencia)
        ? initialData.tecnicosReferencia.map((tec) => tec.id)
        : [],
    );
    setRiscoFugaOrigemInfo(initialData.riscoFugaOrigem ?? null);

    const descricaoEspecial = (tipo: AlertaEspecialTipo) => {
      return (
        initialData.alertasEspeciais?.find((alerta) => alerta.tipo === tipo)
          ?.descricao ??
        (tipo === "SAUDE_CONFIDENCIAL"
          ? (initialData.alertaSaudeDetalhes ?? "")
          : "")
      );
    };

    setAlertasEspeciais({
      RISCO_SUICIDIO: {
        ativo: initialData.alertaRiscoSuicidio ?? false,
        descricao: descricaoEspecial("RISCO_SUICIDIO") ?? "",
      },
      PERFIL_MAPEADO: {
        ativo: initialData.alertaPerfilMapeado ?? false,
        descricao: descricaoEspecial("PERFIL_MAPEADO") ?? "",
      },
      SAUDE_CONFIDENCIAL: {
        ativo: initialData.alertaSaudeConfidencial ?? false,
        descricao: descricaoEspecial("SAUDE_CONFIDENCIAL") ?? "",
      },
    });

    setFoto(initialData.fotoUrl ?? null);
    setTatuagens(
      initialData.tatuagens?.map((t) => ({
        catalogoId: t.catalogoId ?? t.id ?? "",
        localCorpo: t.localCorpo ?? "",
        observacoes: t.observacoes ?? "",
        significadoPessoal: t.significadoPessoal ?? "",
      })) ?? [],
    );
    setAlojamentoSelecionado(initialData.alojamentoAtualId ?? null);
  }, [initialData]);

  useEffect(() => {
    let ativo = true;
    const carregarTecnicos = async () => {
      setCarregandoTecnicos(true);
      try {
        const response = await fetch("/api/tecnicos");
        if (!response.ok) {
          throw new Error("Erro ao carregar tecnicos");
        }
        const payload = await response.json().catch(() => null);
        if (!ativo) return;
        const lista = Array.isArray(payload?.data) ? payload.data : [];
        setTecnicosDisponiveis(lista);
        setErroTecnicos(null);
      } catch (error) {
        if (!ativo) return;
        setErroTecnicos(
          error instanceof Error ? error.message : "Erro ao carregar tecnicos",
        );
      } finally {
        if (ativo) {
          setCarregandoTecnicos(false);
        }
      }
    };
    carregarTecnicos();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    setDataStatus((prev) => {
      if (statusUnidade === "ATIVO") {
        return "";
      }
      return prev || new Date().toISOString().split("T")[0];
    });
  }, [statusUnidade]);

  const [alojamentosLivres, setAlojamentosLivres] = useState<
    {
      id: string;
      casa: string;
      numero: string;
      ala: string | null;
      atual?: boolean;
    }[]
  >([]);
  const [alojamentoSelecionado, setAlojamentoSelecionado] = useState<
    string | null
  >(null);
  const [tipoInternacao, setTipoInternacao] = useState<TipoInternacao | null>(
    null,
  );
  const [casasCatalogo, setCasasCatalogo] = useState<CasaCatalogoOperacional[]>(
    [],
  );
  const [casaPreferenciaId, setCasaPreferenciaId] = useState("");
  const [sugestoesOriginais, setSugestoesOriginais] = useState<
    SugestaoAlojamentoCadastro[]
  >([]);
  const [sugestoesAlojamento, setSugestoesAlojamento] = useState<
    SugestaoAlojamentoCadastro[]
  >([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [erroSugestoes, setErroSugestoes] = useState<string | null>(null);
  const [avisoSugestoes, setAvisoSugestoes] = useState<string | null>(null);
  const [diagnosticoCasa, setDiagnosticoCasa] =
    useState<DiagnosticoCasaApi | null>(null);
  const [diagnosticoAberto, setDiagnosticoAberto] = useState(false);
  const [diagnosticoLoading, setDiagnosticoLoading] = useState(false);
  const [diagnosticoErro, setDiagnosticoErro] = useState<string | null>(null);
  const casasCompativeisTipoInternacao = useMemo(
    () =>
      filtrarCasasCompativeis({
        casas: casasCatalogo,
        tipoInternacao,
        faseInternacaoAtualId: initialData?.faseInternacaoAtualId ?? null,
      }),
    [casasCatalogo, tipoInternacao, initialData?.faseInternacaoAtualId],
  );

  useEffect(() => {
    const carregarAlojamentosLivres = async () => {
      try {
        const response = await fetch("/api/alojamentos?apenas_livres=true");
        if (!response.ok) {
          throw new Error("Falha ao carregar alojamentos livres");
        }
        const payload = await response.json();
        let lista = payload.alojamentos.map((aloj: any) => ({
          id: aloj.id,
          casa: `${aloj.casa.nome} (${aloj.casa.numero})`,
          numero: aloj.numero_alojamento,
          ala: aloj.ala ?? null,
        }));

        if (
          ehEdicao &&
          initialData?.alojamentoAtualId &&
          initialData.alojamentoAtual &&
          !lista.some((item: any) => item.id === initialData.alojamentoAtualId)
        ) {
          const casaNome = initialData.alojamentoAtual.casa?.nome ?? "Casa";
          const casaNumero = initialData.alojamentoAtual.casa?.numero ?? "-";
          lista = [
            ...lista,
            {
              id: initialData.alojamentoAtualId,
              casa: `${casaNome} (${casaNumero})`,
              numero: initialData.alojamentoAtual.numero ?? "-",
              ala: initialData.alojamentoAtual.ala ?? null,
              atual: true,
            },
          ];
        }

        setAlojamentosLivres(lista);
      } catch {
        setAlojamentosLivres([]);
      }
    };

    carregarAlojamentosLivres();
  }, [ehEdicao, initialData?.alojamentoAtualId, initialData?.alojamentoAtual]);

  useEffect(() => {
    const carregarCasas = async () => {
      try {
        const response = await fetch("/api/casas");
        if (!response.ok) {
          throw new Error("Falha ao carregar casas");
        }
        const payload = await response.json();
        const lista = Array.isArray(payload?.casas)
          ? payload.casas.map((casa: any) => ({
              id: casa.id,
              nome: casa.nome,
              numero:
                typeof casa.numero === "number"
                  ? casa.numero
                  : Number(casa.numero ?? 0),
              destinacaoOperacional:
                casa.destinacao_operacional ??
                casa.destinacaoOperacional ??
                null,
              faseExclusivaId:
                casa.fase_exclusiva_id ?? casa.faseExclusivaId ?? null,
              faseExclusiva: casa.fase_exclusiva ?? casa.faseExclusiva ?? null,
              prazoMaximoDias:
                typeof (casa.prazo_maximo_dias ?? casa.prazoMaximoDias) ===
                "number"
                  ? (casa.prazo_maximo_dias ?? casa.prazoMaximoDias)
                  : null,
              riscoMaximoPermitido:
                typeof (
                  casa.risco_maximo_permitido ?? casa.riscoMaximoPermitido
                ) === "number"
                  ? (casa.risco_maximo_permitido ?? casa.riscoMaximoPermitido)
                  : null,
            }))
          : [];
        setCasasCatalogo(lista);
      } catch {
        setCasasCatalogo([]);
      }
    };
    carregarCasas();
  }, []);

  useEffect(() => {
    setSugestoesOriginais([]);
    setSugestoesAlojamento([]);
    setErroSugestoes(null);
    setAvisoSugestoes(null);
    setDiagnosticoCasa(null);
    setDiagnosticoErro(null);
    setDiagnosticoAberto(false);
    setDiagnosticoLoading(false);
  }, [vinculacoes.bairroId, vinculacoes.faccaoId]);

  useEffect(() => {
    if (tipoInternacao !== "DEFINITIVA") {
      setCasaPreferenciaId("");
      setDiagnosticoCasa(null);
      setDiagnosticoErro(null);
      setDiagnosticoAberto(false);
      setDiagnosticoLoading(false);
    }
  }, [tipoInternacao]);

  useEffect(() => {
    if (sugestoesOriginais.length === 0) {
      setSugestoesAlojamento([]);
      setAvisoSugestoes(null);
      if (
        erroSugestoes ===
        "Nenhum alojamento recomendado para a casa selecionada."
      ) {
        setErroSugestoes(null);
      }
      return;
    }
    const { lista, aviso } = aplicarFiltroSugestoes(
      sugestoesOriginais,
      tipoInternacao,
      casasCatalogo,
      initialData?.faseInternacaoAtualId ?? null,
      casaPreferenciaId || null,
    );
    setSugestoesAlojamento(lista);
    setAvisoSugestoes(aviso);
    if (casaPreferenciaId && lista.length === 0) {
      setErroSugestoes(
        "Nenhum alojamento recomendado para a casa selecionada.",
      );
    } else if (
      erroSugestoes === "Nenhum alojamento recomendado para a casa selecionada."
    ) {
      setErroSugestoes(null);
    }
  }, [
    sugestoesOriginais,
    tipoInternacao,
    casasCatalogo,
    initialData?.faseInternacaoAtualId,
    casaPreferenciaId,
    erroSugestoes,
  ]);

  const buscarSugestoesAlojamento = async () => {
    if (!podeGerarSugestoes) {
      setErroSugestoes(
        "Sem permissao para selecionar alojamento para este perfil.",
      );
      return;
    }
    if (!vinculacoes.bairroId && !vinculacoes.faccaoId) {
      setErroSugestoes(
        "Informe o bairro ou a faccao antes de solicitar sugestoes.",
      );
      return;
    }

    if (!tipoInternacao) {
      setErroSugestoes(
        "Selecione o tipo de internacao antes de sugerir um alojamento.",
      );
      return;
    }

    setCarregandoSugestoes(true);
    setErroSugestoes(null);
    setAvisoSugestoes(null);
    setDiagnosticoCasa(null);
    setDiagnosticoErro(null);
    setDiagnosticoAberto(false);
    setDiagnosticoLoading(false);
    try {
      const limiteSugestoes = casaPreferenciaId
        ? Math.max(casasCatalogo.length, 3)
        : 3;
      const response = await fetch("/api/alocar/sugestoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adolescenteId: initialData?.id ?? undefined,
          bairroId: vinculacoes.bairroId || null,
          faccaoId: vinculacoes.faccaoId || null,
          limite: limiteSugestoes,
          tipoInternacao,
          faseInternacaoAtualId: initialData?.faseInternacaoAtualId ?? null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.erro ?? "Falha ao buscar sugestoes");
      }

      const payload = await response.json();
      const lista = Array.isArray(payload?.sugestoes) ? payload.sugestoes : [];
      const normalizadas: SugestaoAlojamentoCadastro[] = lista.map(
        (item: any) => ({
          alojamentoId: item.alojamentoId,
          casaId: item.casaId,
          casaNome: item.casaNome,
          casaNumero:
            typeof item.casaNumero === "number"
              ? item.casaNumero
              : Number(item.casaNumero ?? 0),
          numero: item.numero,
          ala: item.ala ?? null,
          nivel: item.nivel,
          rotulo: item.rotulo,
          descricao: item.descricao,
          alertas: Array.isArray(item.alertas) ? item.alertas : [],
          ambientais: Array.isArray(item.ambientais) ? item.ambientais : [],
        }),
      );

      setSugestoesOriginais(normalizadas);
      if (normalizadas.length === 0) {
        setErroSugestoes(
          "Nenhum alojamento disponivel para os filtros atuais.",
        );
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Erro ao buscar sugestoes de alojamento";
      setErroSugestoes(msg);
      setSugestoesOriginais([]);
      setSugestoesAlojamento([]);
    } finally {
      setCarregandoSugestoes(false);
    }
  };

  useEffect(() => {
    if (
      !modalDeclaracaoFaccao.aberto ||
      modalDeclaracaoFaccao.origem !== "OUTRO_INTERNO"
    ) {
      setInformanteSugestoes([]);
      setMostrandoInformanteSugestoes(false);
      setBuscandoInformante(false);
      return;
    }
    const termo = informanteBusca.trim();
    if (termo.length < 2) {
      setInformanteSugestoes([]);
      return;
    }
    let ativo = true;
    setBuscandoInformante(true);
    const carregar = async () => {
      try {
        const response = await fetch(
          `/api/adolescentes?busca=${encodeURIComponent(
            termo,
          )}&limit=20&ignorar_acentos=true`,
        );
        if (!response.ok) {
          throw new Error("Falha ao buscar adolescentes");
        }
        const payload = await response.json().catch(() => null);
        if (!ativo) return;
        const lista = Array.isArray(payload?.data)
          ? payload.data
              .map((item: any) => ({
                id: item.id,
                nome: item.nomeCompleto,
                numeroSms: item.numeroSms ?? null,
              }))
              .filter((item: any) => item.id !== initialData?.id)
          : [];
        setInformanteSugestoes(lista);
        setMostrandoInformanteSugestoes(true);
      } catch {
        if (ativo) {
          setInformanteSugestoes([]);
        }
      } finally {
        if (ativo) {
          setBuscandoInformante(false);
        }
      }
    };
    carregar();
    return () => {
      ativo = false;
    };
  }, [
    informanteBusca,
    modalDeclaracaoFaccao.aberto,
    modalDeclaracaoFaccao.origem,
    initialData?.id,
  ]);

  useEffect(() => {
    const termo = vinculoBusca.trim();
    if (termo.length < 2) {
      setVinculoSugestoes([]);
      setMostrandoSugestoesVinculo(false);
      setBuscandoVinculo(false);
      return;
    }

    let ativo = true;
    setBuscandoVinculo(true);
    const carregar = async () => {
      try {
        const response = await fetch(
          `/api/adolescentes?busca=${encodeURIComponent(
            termo,
          )}&limit=20&ignorar_acentos=true`,
        );
        if (!response.ok) {
          throw new Error("Falha ao buscar adolescentes");
        }
        const payload = await response.json().catch(() => null);
        if (!ativo) return;
        const lista = Array.isArray(payload?.data)
          ? payload.data
              .map((item: any) => ({
                id: item.id,
                nomeCompleto: item.nomeCompleto,
                numeroSms: item.numeroSms ?? null,
                fotoUrl: item.fotoUrl ?? null,
                statusUnidade: item.statusUnidade ?? undefined,
              }))
              .filter(
                (item: any) =>
                  item.id !== initialData?.id &&
                  !vinculoSelecionados.some(
                    (selecionado) => selecionado.id === item.id,
                  ),
              )
          : [];
        setVinculoSugestoes(lista);
        setMostrandoSugestoesVinculo(true);
      } catch {
        if (ativo) {
          setVinculoSugestoes([]);
        }
      } finally {
        if (ativo) {
          setBuscandoVinculo(false);
        }
      }
    };

    carregar();
    return () => {
      ativo = false;
    };
  }, [vinculoBusca, vinculoSelecionados, initialData?.id]);

  const abrirDiagnosticoCasa = async () => {
    if (!casaPreferenciaId) return;
    setDiagnosticoLoading(true);
    setDiagnosticoErro(null);
    try {
      const response = await fetch("/api/alocar/sugestoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adolescenteId: initialData?.id ?? undefined,
          bairroId: vinculacoes.bairroId || null,
          faccaoId: vinculacoes.faccaoId || null,
          casaId: casaPreferenciaId,
          diagnostico: true,
          tipoInternacao,
          faseInternacaoAtualId: initialData?.faseInternacaoAtualId ?? null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.erro ?? "Falha ao buscar diagnostico");
      }
      if (!payload?.diagnostico) {
        throw new Error("Diagnostico indisponivel para esta casa.");
      }
      setDiagnosticoCasa(payload.diagnostico as DiagnosticoCasaApi);
      setDiagnosticoAberto(true);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Falha ao buscar diagnostico";
      setDiagnosticoErro(msg);
    } finally {
      setDiagnosticoLoading(false);
    }
  };

  const [foto, setFoto] = useState<string | null>(null);

  const [referencias, setReferencias] = useState<{
    faccoes: FaccaoCatalogo[];
    bairros: BairroCatalogo[];
    cidades: CidadeCatalogo[];
    tatuagens: TatuagemCatalogo[];
  }>({
    faccoes: [],
    bairros: [],
    cidades: [],
    tatuagens: [],
  });
  const [atoSugestoes, setAtoSugestoes] = useState<AtoCatalogoOption[]>([]);
  const [atosCatalogoCache, setAtosCatalogoCache] = useState<
    AtoCatalogoOption[]
  >([]);
  const [buscandoAto, setBuscandoAto] = useState(false);
  const [mostrarSugestoesAto, setMostrarSugestoesAto] = useState(false);
  const [gestaoAtos, setGestaoAtos] = useState<{
    aberto: boolean;
    itens: GestaoAtoItem[];
    busca: string;
    carregando: boolean;
    erro: string | null;
    salvandoId: string | null;
    excluindoId: string | null;
    bloqueioExclusao: {
      atoId: string;
      atoNome: string;
      adolescentes: GestaoAtoAdolescenteVinculado[];
    } | null;
  }>({
    aberto: false,
    itens: [],
    busca: "",
    carregando: false,
    erro: null,
    salvandoId: null,
    excluindoId: null,
    bloqueioExclusao: null,
  });
  const [modalNovoAto, setModalNovoAto] = useState<{
    aberto: boolean;
    nome: string;
    gravidade: string;
    violenciaOuGraveAmeaca: boolean;
    erro: string | null;
    salvando: boolean;
  }>({
    aberto: false,
    nome: "",
    gravidade: "",
    violenciaOuGraveAmeaca: false,
    erro: null,
    salvando: false,
  });
  const [contextoNovoAtoTipificacao, setContextoNovoAtoTipificacao] = useState<{
    origem: "ATUAL" | "HISTORICO";
    casoHistoricoIndex?: number;
    tipificacaoIndex: number;
  } | null>(null);
  const [campoBuscaAtoAtivo, setCampoBuscaAtoAtivo] = useState<{
    origem: "ATUAL" | "HISTORICO";
    tipificacaoIndex: number;
    casoHistoricoIndex?: number;
  } | null>(null);
  const atosCatalogoOrdenados = useMemo(
    () => [...atosCatalogoCache].sort(compararAtoPorNome),
    [atosCatalogoCache],
  );
  const gestaoAtosOrdenados = useMemo(
    () => [...gestaoAtos.itens].sort(compararAtoPorNome),
    [gestaoAtos.itens],
  );

  useEffect(() => {
    if (statusUnidade !== "ATIVO") {
      setDadosPessoais((prev) => ({
        ...prev,
        numeroInterno: "",
        alojamentoAtualId: null,
        alojamentoPreferencialId: null,
      }));
      setAlojamentoSelecionado(null);
      setSugestoesAlojamento([]);
      setTipoInternacao(null);
    }
  }, [statusUnidade]);

  useEffect(() => {
    if (atosCatalogoCache.length > 0) {
      return;
    }

    const carregarCatalogoBase = async () => {
      try {
        const response = await fetch(
          "/api/atos-infracionais?incluirInativos=true",
        );
        if (!response.ok) {
          return;
        }
        const payload = await response.json().catch(() => null);
        if (Array.isArray(payload?.atos)) {
          setAtosCatalogoCache(payload.atos);
        }
      } catch (error) {
        console.error("Erro ao carregar catálogo base de atos", error);
      }
    };

    void carregarCatalogoBase();
  }, [atosCatalogoCache.length]);

  useEffect(() => {
    const termo = atoInfracional.descricao.trim();
    if (termo.length < 2) {
      setAtoSugestoes([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      setBuscandoAto(true);
      try {
        const response = await fetch(
          `/api/atos-infracionais?busca=${encodeURIComponent(termo)}`,
        );
        let lista: Array<{
          id: string;
          nome: string;
          ativo: boolean;
          gravidade?: string | null;
          violenciaOuGraveAmeaca?: boolean | null;
        }> = [];
        if (response.ok) {
          const payload = await response.json();
          if (Array.isArray(payload?.atos)) {
            lista = payload.atos;
          }
        }

        if (lista.length === 0) {
          let base = atosCatalogoCache;
          if (base.length === 0) {
            const fallback = await fetch(
              "/api/atos-infracionais?incluirInativos=true",
            );
            if (fallback.ok) {
              const payload = await fallback.json();
              if (Array.isArray(payload?.atos)) {
                base = payload.atos;
                setAtosCatalogoCache(base);
              }
            }
          }
          const termoNormalizado = normalizarTexto(termo);
          if (base.length > 0 && termoNormalizado) {
            lista = base
              .filter((ato) =>
                normalizarTexto(ato.nome).includes(termoNormalizado),
              )
              .sort(compararAtoPorNome)
              .slice(0, 20);
          }
        }

        setAtoSugestoes(lista);
      } catch (error) {
        console.error("Erro ao buscar atos infracionais", error);
      } finally {
        setBuscandoAto(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [atoInfracional.descricao, atosCatalogoCache]);

  const carregarGestaoAtos = async (termo?: string) => {
    setGestaoAtos((prev) => ({
      ...prev,
      carregando: true,
      erro: null,
      bloqueioExclusao: null,
    }));
    try {
      const params = new URLSearchParams();
      params.set("incluirInativos", "true");
      if (termo && termo.trim().length >= 1) {
        params.set("busca", termo.trim());
      }
      const response = await fetch(
        `/api/atos-infracionais?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Falha ao carregar atos infracionais");
      }
      const payload = await response.json();
      const itens = Array.isArray(payload?.atos) ? payload.atos : [];
      setGestaoAtos((prev) => ({ ...prev, itens, carregando: false }));
    } catch (error: any) {
      console.error(error);
      setGestaoAtos((prev) => ({
        ...prev,
        carregando: false,
        erro: error?.message ?? "Erro ao carregar atos",
      }));
    }
  };

  const abrirGestaoAtos = () => {
    setGestaoAtos((prev) => ({
      ...prev,
      aberto: true,
      erro: null,
      bloqueioExclusao: null,
    }));
    carregarGestaoAtos(gestaoAtos.busca);
  };

  const fecharGestaoAtos = () => {
    setGestaoAtos((prev) => ({
      ...prev,
      aberto: false,
      salvandoId: null,
      excluindoId: null,
      erro: null,
      bloqueioExclusao: null,
    }));
  };

  const atualizarCampoGestao = (
    id: string,
    campo: "nome" | "gravidade" | "violenciaOuGraveAmeaca" | "ativo",
    valor: any,
  ) => {
    setGestaoAtos((prev) => ({
      ...prev,
      itens: prev.itens.map((item) =>
        item.id === id ? { ...item, [campo]: valor } : item,
      ),
    }));
  };

  const salvarGestaoAto = async (id: string) => {
    const item = gestaoAtos.itens.find((i) => i.id === id);
    if (!item) return;
    setGestaoAtos((prev) => ({
      ...prev,
      salvandoId: id,
      erro: null,
      bloqueioExclusao: null,
    }));
    try {
      const response = await fetch("/api/atos-infracionais", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          nome: item.nome,
          gravidade: item.gravidade ?? null,
          violenciaOuGraveAmeaca: !!item.violenciaOuGraveAmeaca,
          ativo: item.ativo,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.erro ?? "Nao foi possivel salvar");
      }
      // Atualiza lista com dados retornados
      setGestaoAtos((prev) => ({
        ...prev,
        salvandoId: null,
        itens: prev.itens.map((i) =>
          i.id === id
            ? {
                ...i,
                nome: payload.nome ?? i.nome,
                gravidade: payload.gravidade ?? i.gravidade,
                violenciaOuGraveAmeaca:
                  payload.violenciaOuGraveAmeaca ?? i.violenciaOuGraveAmeaca,
                ativo: payload.ativo ?? i.ativo,
              }
            : i,
        ),
      }));
      // Atualiza sugestões locais caso o item seja usado
      setAtoSugestoes((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                nome: payload.nome ?? s.nome,
                gravidade: payload.gravidade ?? s.gravidade,
                violenciaOuGraveAmeaca:
                  payload.violenciaOuGraveAmeaca ?? s.violenciaOuGraveAmeaca,
                ativo: payload.ativo ?? s.ativo,
              }
            : s,
        ),
      );
      setAtosCatalogoCache((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                nome: payload.nome ?? s.nome,
                gravidade: payload.gravidade ?? s.gravidade,
                violenciaOuGraveAmeaca:
                  payload.violenciaOuGraveAmeaca ?? s.violenciaOuGraveAmeaca,
                ativo: payload.ativo ?? s.ativo,
              }
            : s,
        ),
      );
      // Se o ato selecionado no formulário for este, reflita imediatamente
      setAtoInfracional((prev) =>
        prev.catalogoId === id
          ? {
              ...prev,
              descricao: payload.nome ?? prev.descricao,
              gravidadeCatalogo: payload.gravidade ?? prev.gravidadeCatalogo,
              violenciaCatalogo:
                payload.violenciaOuGraveAmeaca ?? prev.violenciaCatalogo,
            }
          : prev,
      );
    } catch (error: any) {
      console.error(error);
      setGestaoAtos((prev) => ({
        ...prev,
        salvandoId: null,
        erro: error?.message ?? "Erro ao salvar ato",
      }));
    }
  };

  const limparReferenciasLocaisAto = (id: string) => {
    setAtosCatalogoCache((prev) => prev.filter((item) => item.id !== id));
    setAtoSugestoes((prev) => prev.filter((item) => item.id !== id));
    setAtoInfracional((prev) =>
      prev.catalogoId === id
        ? {
            ...prev,
            catalogoId: "",
            descricao: "",
            gravidadeCatalogo: "",
            violenciaCatalogo: null,
          }
        : prev,
    );
    setCasoInfracionalAtual((prev) => ({
      ...prev,
      tipificacoes: prev.tipificacoes.map((tipificacao) =>
        tipificacao.catalogoId === id
          ? {
              ...tipificacao,
              buscaCatalogo: "",
              catalogoId: "",
              descricao: "",
            }
          : tipificacao,
      ),
    }));
    setCasosHistoricos((prev) =>
      prev.map((caso) => ({
        ...caso,
        tipificacoes: caso.tipificacoes.map((tipificacao) =>
          tipificacao.catalogoId === id
            ? {
                ...tipificacao,
                buscaCatalogo: "",
                catalogoId: "",
                descricao: "",
              }
            : tipificacao,
        ),
      })),
    );
  };

  const excluirGestaoAto = async (id: string) => {
    const item = gestaoAtos.itens.find((registro) => registro.id === id);
    if (!item) return;

    if (
      !confirm(
        `Excluir o ato infracional "${item.nome}" do catálogo? Esta ação não poderá ser desfeita.`,
      )
    ) {
      return;
    }

    setGestaoAtos((prev) => ({
      ...prev,
      excluindoId: id,
      erro: null,
      bloqueioExclusao: null,
    }));

    try {
      const response = await fetch(`/api/atos-infracionais/${id}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 409) {
          setGestaoAtos((prev) => ({
            ...prev,
            excluindoId: null,
            erro:
              payload?.erro ??
              "Nao foi possivel excluir o ato infracional selecionado.",
            bloqueioExclusao: {
              atoId: id,
              atoNome: item.nome,
              adolescentes: Array.isArray(payload?.adolescentes)
                ? payload.adolescentes
                : [],
            },
          }));
          return;
        }
        throw new Error(payload?.erro ?? "Nao foi possivel excluir o ato.");
      }

      setGestaoAtos((prev) => ({
        ...prev,
        excluindoId: null,
        itens: prev.itens.filter((registro) => registro.id !== id),
        erro: null,
        bloqueioExclusao: null,
      }));
      limparReferenciasLocaisAto(id);
    } catch (error: any) {
      console.error(error);
      setGestaoAtos((prev) => ({
        ...prev,
        excluindoId: null,
        erro: error?.message ?? "Erro ao excluir ato",
      }));
    }
  };
  const [modalNovoBairro, setModalNovoBairro] = useState<{
    aberto: boolean;
    nome: string;
    cidadeId: string;
    erro: string | null;
    salvando: boolean;
  }>({
    aberto: false,
    nome: "",
    cidadeId: "",
    erro: null,
    salvando: false,
  });
  const [modalNovaCidade, setModalNovaCidade] = useState<{
    aberto: boolean;
    nome: string;
    estado: string;
    erro: string | null;
    salvando: boolean;
  }>({
    aberto: false,
    nome: "",
    estado: "PR",
    erro: null,
    salvando: false,
  });
  const [modalNovaFaccao, setModalNovaFaccao] = useState<{
    aberto: boolean;
    nome: string;
    descricao: string;
    erro: string | null;
    salvando: boolean;
  }>({
    aberto: false,
    nome: "",
    descricao: "",
    erro: null,
    salvando: false,
  });
  const [carregandoReferencias, setCarregandoReferencias] = useState(true);
  const [erroReferencias, setErroReferencias] = useState<string | null>(null);
  const [bairroBusca, setBairroBusca] = useState("");
  const [mostrarSugestoesBairro, setMostrarSugestoesBairro] = useState(false);
  const estadoSerializado = useMemo(
    () =>
      JSON.stringify({
        dadosPessoais,
        statusUnidade,
        dataStatus,
        atoInfracional,
        casoInfracionalAtual,
        atoInfracionalVinculos,
        vinculoDescricao,
        vinculoSelecionados,
        vinculacoes,
        tecnicosReferenciaIds,
        tatuagens,
        alertasEspeciais,
        foto,
        alojamentoSelecionado,
        bairroBusca,
      }),
    [
      dadosPessoais,
      statusUnidade,
      dataStatus,
      atoInfracional,
      casoInfracionalAtual,
      atoInfracionalVinculos,
      vinculoDescricao,
      vinculoSelecionados,
      vinculacoes,
      tecnicosReferenciaIds,
      tatuagens,
      alertasEspeciais,
      foto,
      alojamentoSelecionado,
      bairroBusca,
    ],
  );

  if (estadoInicialRef.current === null) {
    estadoInicialRef.current = estadoSerializado;
  }
  const temAlteracaoAtual =
    estadoInicialRef.current !== null &&
    estadoSerializado !== estadoInicialRef.current;
  temAlteracaoRef.current = temAlteracaoAtual;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!temAlteracaoRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!temAlteracaoRef.current) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const alvo = event.target as HTMLElement | null;
      const link = alvo?.closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      const destino = link.getAttribute("target");
      if (destino && destino !== "_self") return;
      if (!confirm(MENSAGEM_SAIDA_SEM_SALVAR)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  const podeSairSemSalvar = () =>
    !temAlteracaoRef.current || confirm(MENSAGEM_SAIDA_SEM_SALVAR);

  const carregarReferencias = async () => {
    setCarregandoReferencias(true);
    setErroReferencias(null);

    try {
      const [faccoesRes, bairrosRes, cidadesRes, tatuagensRes] =
        await Promise.all([
          fetch("/api/faccoes"),
          fetch("/api/bairros"),
          fetch("/api/cidades"),
          fetch("/api/tatuagens"),
        ]);

      if (
        !faccoesRes.ok ||
        !bairrosRes.ok ||
        !cidadesRes.ok ||
        !tatuagensRes.ok
      ) {
        throw new Error("Falha ao carregar dados auxiliares");
      }

      const [faccoesPayload, bairrosPayload, cidadesPayload, tatuagensPayload] =
        await Promise.all([
          faccoesRes.json(),
          bairrosRes.json(),
          cidadesRes.json(),
          tatuagensRes.json(),
        ]);

      setReferencias({
        faccoes: Array.isArray(faccoesPayload?.faccoes)
          ? faccoesPayload.faccoes
          : [],
        bairros: Array.isArray(bairrosPayload?.bairros)
          ? bairrosPayload.bairros
          : [],
        cidades: Array.isArray(cidadesPayload?.cidades)
          ? cidadesPayload.cidades
          : [],
        tatuagens: Array.isArray(tatuagensPayload?.tatuagens)
          ? tatuagensPayload.tatuagens
          : [],
      });
    } catch (error) {
      console.error("Erro ao carregar referencias:", error);
      setErroReferencias(
        error instanceof Error
          ? error.message
          : "Erro ao carregar dados auxiliares",
      );
    } finally {
      setCarregandoReferencias(false);
    }
  };

  useEffect(() => {
    carregarReferencias();
  }, []);

  const faccoesDisponiveis = useMemo(
    () => [
      {
        id: "",
        nome: "Sem facção / não informado",
        total: undefined,
      },
      ...referencias.faccoes.map((faccao) => ({
        id: faccao.id,
        nome: faccao.nomeFaccao,
        total: faccao.totalAdolescentes ?? undefined,
      })),
    ],
    [referencias.faccoes],
  );

  const bairrosDisponiveis = useMemo(
    () => referencias.bairros,
    [referencias.bairros],
  );
  const bairroSugestoes = useMemo(() => {
    const termo = normalizarTexto(bairroBusca);
    if (!termo) return [];
    return bairrosDisponiveis
      .filter((bairro) => {
        const nome = normalizarTexto(bairro.nomeBairro);
        const cidade = normalizarTexto(bairro.cidade);
        const estado = normalizarTexto(bairro.estado ?? "");
        return (
          nome.includes(termo) ||
          cidade.includes(termo) ||
          estado.includes(termo)
        );
      })
      .slice(0, 20);
  }, [bairroBusca, bairrosDisponiveis]);

  const faccaoSomenteHistorico = modo === "EDICAO";
  const faccaoHistoricoAtivo = useMemo(() => {
    if (faccaoHistorico.length === 0) return null;
    return (
      faccaoHistorico.find((item) => item.statusRegistro === "ATIVA") ??
      faccaoHistorico[0]
    );
  }, [faccaoHistorico]);
  const faccaoAtualNome =
    faccaoHistoricoAtivo?.faccaoNome ??
    faccoesDisponiveis.find((f) => f.id === vinculacoes.faccaoId)?.nome ??
    "Sem facção / não informado";
  const faccaoAtualFuncao =
    faccaoHistoricoAtivo?.funcao ?? vinculacoes.faccaoFuncao ?? "";
  const faccaoAtualOrigem =
    faccaoHistoricoAtivo?.origemInformacao ?? vinculacoes.faccaoOrigem ?? "";
  const faccaoAtualObs =
    faccaoHistoricoAtivo?.observacao ?? vinculacoes.faccaoOrigemDetalhe ?? "";

  const tipificacaoTemConteudo = (tipificacao: CasoTipificacaoFormState) =>
    Boolean(
      tipificacao.catalogoId.trim() ||
      tipificacao.descricao.trim() ||
      tipificacao.naturezaExecucao.trim() ||
      tipificacao.qualificadora.trim() ||
      tipificacao.majorante.trim() ||
      tipificacao.observacoes.trim(),
    );

  const tipificacoesCasoPreenchidas = useMemo(
    () =>
      casoInfracionalAtual.tipificacoes.filter((tipificacao) =>
        tipificacaoTemConteudo(tipificacao),
      ),
    [casoInfracionalAtual.tipificacoes],
  );

  const tipificacaoPrincipalAtual = useMemo(() => {
    if (tipificacoesCasoPreenchidas.length > 0) {
      return (
        tipificacoesCasoPreenchidas.find(
          (tipificacao) => tipificacao.principal,
        ) ?? tipificacoesCasoPreenchidas[0]
      );
    }

    return casoInfracionalAtual.tipificacoes[0] ?? null;
  }, [casoInfracionalAtual.tipificacoes, tipificacoesCasoPreenchidas]);

  const atoPrincipalCatalogoAtual = useMemo(() => {
    const catalogoId = tipificacaoPrincipalAtual?.catalogoId?.trim();
    if (!catalogoId) return null;

    return atosCatalogoCache.find((item) => item.id === catalogoId) ?? null;
  }, [atosCatalogoCache, tipificacaoPrincipalAtual]);

  const atualizarTipificacoesCaso = (
    atualizador: (
      tipificacoes: CasoTipificacaoFormState[],
    ) => CasoTipificacaoFormState[],
  ) => {
    setCasoInfracionalAtual((prev) => ({
      ...prev,
      tipificacoes: atualizador(prev.tipificacoes),
    }));
  };

  const adicionarTipificacaoCaso = () => {
    atualizarTipificacoesCaso((tipificacoes) => [
      ...tipificacoes,
      criarTipificacaoCasoVazia(tipificacoes.length + 1),
    ]);
  };

  const removerTipificacaoCaso = (tipificacaoIndex: number) => {
    atualizarTipificacoesCaso((tipificacoes) => {
      const atualizadas = tipificacoes
        .filter((_, itemIndex) => itemIndex !== tipificacaoIndex)
        .map((tipificacao, itemIndex) => ({
          ...tipificacao,
          ordem: itemIndex + 1,
          principal: itemIndex === 0 ? true : tipificacao.principal,
        }));

      return atualizadas.length > 0
        ? atualizadas
        : [criarTipificacaoCasoVazia(1)];
    });
  };

  const selecionarAtoCatalogoCasoAtual = (
    tipificacaoIndex: number,
    ato: AtoCatalogoOption,
  ) => {
    atualizarTipificacoesCaso((tipificacoes) =>
      tipificacoes.map((item, index) =>
        index !== tipificacaoIndex
          ? item
          : {
              ...item,
              buscaCatalogo: ato.nome,
              catalogoId: ato.id,
              descricao: montarDescricaoAutomaticaTipificacao(
                ato.nome,
                item.naturezaExecucao,
              ),
            },
      ),
    );
    setCampoBuscaAtoAtivo(null);
  };

  const atualizarBuscaAtoCatalogoCasoAtual = (
    tipificacaoIndex: number,
    valor: string,
  ) => {
    atualizarTipificacoesCaso((tipificacoes) =>
      tipificacoes.map((item, index) => {
        if (index !== tipificacaoIndex) {
          return item;
        }

        const nomeSelecionado =
          atosCatalogoCache.find((ato) => ato.id === item.catalogoId)?.nome ?? "";
        const mantemSelecao =
          item.catalogoId &&
          normalizarTexto(valor) === normalizarTexto(nomeSelecionado);

        return {
          ...item,
          buscaCatalogo: valor,
          catalogoId: mantemSelecao ? item.catalogoId : "",
          descricao:
            item.catalogoId && !mantemSelecao
              ? ""
              : item.descricao,
        };
      }),
    );
  };

  const atualizarCampoCasoInfracional = (campo: "narrativa", valor: string) => {
    setCasoInfracionalAtual((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const selecionarAtoCatalogo = (ato: {
    id: string;
    nome: string;
    gravidade?: string | null;
    violenciaOuGraveAmeaca?: boolean | null;
  }) => {
    setAtoInfracional((prev) => ({
      ...prev,
      catalogoId: ato.id,
      descricao: ato.nome,
      gravidadeCatalogo: ato.gravidade ?? "",
      violenciaCatalogo:
        ato.violenciaOuGraveAmeaca ?? prev.violenciaCatalogo ?? null,
    }));
    setMostrarSugestoesAto(false);
  };

  const abrirModalNovoAto = () => {
    setContextoNovoAtoTipificacao(null);
    setModalNovoAto({
      aberto: true,
      nome: atoInfracional.descricao,
      gravidade: "",
      violenciaOuGraveAmeaca: false,
      erro: null,
      salvando: false,
    });
  };

  const abrirModalNovoAtoParaTipificacao = (
    origem: "ATUAL" | "HISTORICO",
    tipificacaoIndex: number,
    casoHistoricoIndex?: number,
    nomeInicial = "",
  ) => {
    setContextoNovoAtoTipificacao({
      origem,
      casoHistoricoIndex,
      tipificacaoIndex,
    });
    setModalNovoAto({
      aberto: true,
      nome: nomeInicial,
      gravidade: "",
      violenciaOuGraveAmeaca: false,
      erro: null,
      salvando: false,
    });
  };

  const fecharModalNovoAto = () => {
    setContextoNovoAtoTipificacao(null);
    setModalNovoAto({
      aberto: false,
      nome: "",
      gravidade: "",
      violenciaOuGraveAmeaca: false,
      erro: null,
      salvando: false,
    });
  };

  const salvarNovoAto = async () => {
    if (modalNovoAto.salvando) return;
    const nome = modalNovoAto.nome.trim();
    if (nome.length < 3) {
      setModalNovoAto((prev) => ({
        ...prev,
        erro: "Informe um nome com pelo menos 3 caracteres.",
      }));
      return;
    }
    setModalNovoAto((prev) => ({ ...prev, salvando: true, erro: null }));
    try {
      const response = await fetch("/api/atos-infracionais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          gravidade: modalNovoAto.gravidade || undefined,
          violenciaOuGraveAmeaca: modalNovoAto.violenciaOuGraveAmeaca,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setModalNovoAto((prev) => ({
          ...prev,
          salvando: false,
          erro: payload?.erro ?? "Nao foi possivel salvar o ato infracional.",
        }));
        return;
      }

      const novo = {
        id: payload.id as string,
        nome: payload.nome as string,
        ativo: payload.ativo !== false,
        gravidade: payload.gravidade ?? null,
        violenciaOuGraveAmeaca: payload.violenciaOuGraveAmeaca ?? false,
      };
      setAtoSugestoes((prev) => [novo, ...prev]);
      setAtosCatalogoCache((prev) => {
        const semDuplicado = prev.filter((item) => item.id !== novo.id);
        return [novo, ...semDuplicado];
      });
      if (contextoNovoAtoTipificacao) {
        if (contextoNovoAtoTipificacao.origem === "ATUAL") {
          atualizarTipificacoesCaso((tipificacoes) =>
            tipificacoes.map((tipificacao, tipificacaoIndex) =>
              tipificacaoIndex !== contextoNovoAtoTipificacao.tipificacaoIndex
                ? tipificacao
                : {
                    ...tipificacao,
                    buscaCatalogo: novo.nome,
                    catalogoId: novo.id,
                    descricao: montarDescricaoAutomaticaTipificacao(
                      novo.nome,
                      tipificacao.naturezaExecucao,
                    ),
                  },
            ),
          );
        } else if (
          typeof contextoNovoAtoTipificacao.casoHistoricoIndex === "number"
        ) {
          atualizarTipificacoesCasoHistorico(
            contextoNovoAtoTipificacao.casoHistoricoIndex,
            (tipificacoes) =>
              tipificacoes.map((tipificacao, tipificacaoIndex) =>
                tipificacaoIndex !== contextoNovoAtoTipificacao.tipificacaoIndex
                  ? tipificacao
                  : {
                      ...tipificacao,
                      buscaCatalogo: novo.nome,
                      catalogoId: novo.id,
                      descricao: montarDescricaoAutomaticaTipificacao(
                        novo.nome,
                        tipificacao.naturezaExecucao,
                      ),
                    },
              ),
          );
        }
      } else {
        selecionarAtoCatalogo(novo);
      }
      fecharModalNovoAto();
    } catch (error) {
      console.error("Erro ao salvar novo ato infracional:", error);
      setModalNovoAto((prev) => ({
        ...prev,
        salvando: false,
        erro: "Erro ao salvar novo ato infracional.",
      }));
    }
  };

  const abrirModalNovoBairro = () => {
    setModalNovoBairro({
      aberto: true,
      nome: "",
      cidadeId: "",
      erro: null,
      salvando: false,
    });
  };

  const fecharModalNovoBairro = () => {
    setModalNovoBairro({
      aberto: false,
      nome: "",
      cidadeId: "",
      erro: null,
      salvando: false,
    });
  };

  const abrirModalNovaCidade = () => {
    setModalNovaCidade({
      aberto: true,
      nome: "",
      estado: "PR",
      erro: null,
      salvando: false,
    });
  };

  const fecharModalNovaCidade = () => {
    setModalNovaCidade({
      aberto: false,
      nome: "",
      estado: "PR",
      erro: null,
      salvando: false,
    });
  };

  const salvarNovaCidade = async () => {
    if (modalNovaCidade.salvando) return;
    const nome = modalNovaCidade.nome.trim();
    const estado = modalNovaCidade.estado.trim().toUpperCase();

    if (nome.length < 2) {
      setModalNovaCidade((prev) => ({
        ...prev,
        erro: "Informe o nome da cidade.",
      }));
      return;
    }

    setModalNovaCidade((prev) => ({ ...prev, salvando: true, erro: null }));
    try {
      const response = await fetch("/api/cidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, estado }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.erro ?? "Erro ao cadastrar cidade");
      }

      const novaCidade: CidadeCatalogo = {
        id: payload.id,
        nome: payload.nome ?? nome,
        estado: payload.estado ?? estado,
      };

      setReferencias((prev) => ({
        ...prev,
        cidades: [...prev.cidades, novaCidade].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR"),
        ),
      }));

      setModalNovoBairro((prev) => ({
        ...prev,
        cidadeId: novaCidade.id,
      }));

      fecharModalNovaCidade();
    } catch (error) {
      setModalNovaCidade((prev) => ({
        ...prev,
        salvando: false,
        erro:
          error instanceof Error ? error.message : "Erro ao cadastrar cidade",
      }));
    }
  };

  const salvarNovoBairro = async () => {
    if (modalNovoBairro.salvando) return;

    const nome = modalNovoBairro.nome.trim();
    const cidadeId = modalNovoBairro.cidadeId;
    const cidadeSelecionada =
      referencias.cidades.find((cidade) => cidade.id === cidadeId) ?? null;

    if (nome.length < 2 || !cidadeId) {
      setModalNovoBairro((prev) => ({
        ...prev,
        erro: "Informe nome e cidade.",
      }));
      return;
    }

    if (!cidadeSelecionada) {
      setModalNovoBairro((prev) => ({
        ...prev,
        erro: "Selecione uma cidade valida.",
      }));
      return;
    }

    setModalNovoBairro((prev) => ({ ...prev, salvando: true, erro: null }));

    try {
      const response = await fetch("/api/bairros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeBairro: nome, cidadeId }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.erro ?? "Erro ao cadastrar bairro");
      }

      const novoBairro: BairroCatalogo = {
        id: payload.id,
        nomeBairro: payload.nomeBairro ?? nome,
        cidade: payload.cidade ?? cidadeSelecionada.nome,
        cidadeId: payload.cidadeId ?? cidadeId,
        estado: payload.estado ?? cidadeSelecionada.estado ?? null,
      };

      setReferencias((prev) => ({
        ...prev,
        bairros: [...prev.bairros, novoBairro].sort((a, b) =>
          a.nomeBairro.localeCompare(b.nomeBairro, "pt-BR"),
        ),
      }));

      setVinculacoes((prev) => ({
        ...prev,
        bairroId: novoBairro.id,
      }));
      const sufixoEstado = novoBairro.estado ? ` - ${novoBairro.estado}` : "";
      setBairroBusca(
        `${novoBairro.nomeBairro} - ${novoBairro.cidade}${sufixoEstado}`,
      );
      setMostrarSugestoesBairro(false);

      fecharModalNovoBairro();
    } catch (error) {
      setModalNovoBairro((prev) => ({
        ...prev,
        erro:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao salvar bairro",
        salvando: false,
      }));
      return;
    }

    setModalNovoBairro({
      aberto: false,
      nome: "",
      cidadeId: "",
      erro: null,
      salvando: false,
    });
  };

  const abrirModalNovaFaccao = () => {
    setModalNovaFaccao({
      aberto: true,
      nome: "",
      descricao: "",
      erro: null,
      salvando: false,
    });
  };

  const fecharModalNovaFaccao = () => {
    setModalNovaFaccao({
      aberto: false,
      nome: "",
      descricao: "",
      erro: null,
      salvando: false,
    });
  };

  const salvarNovaFaccao = async () => {
    if (modalNovaFaccao.salvando) return;

    const nome = modalNovaFaccao.nome.trim();
    const descricao = modalNovaFaccao.descricao.trim();

    if (nome.length < 2) {
      setModalNovaFaccao((prev) => ({
        ...prev,
        erro: "Informe um nome com ao menos 2 caracteres.",
      }));
      return;
    }

    setModalNovaFaccao((prev) => ({ ...prev, salvando: true, erro: null }));

    try {
      const response = await fetch("/api/faccoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeFaccao: nome, descricao }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.erro ?? "Erro ao cadastrar faccao");
      }

      const novaFaccao: FaccaoCatalogo = {
        id: payload.id,
        nomeFaccao: payload.nomeFaccao ?? nome,
        descricao: (payload.descricao ?? descricao) || undefined,
        totalAdolescentes: 0,
      };

      setReferencias((prev) => ({
        ...prev,
        faccoes: [...prev.faccoes, novaFaccao].sort((a, b) =>
          a.nomeFaccao.localeCompare(b.nomeFaccao, "pt-BR"),
        ),
      }));

      setVinculacoes((prev) => ({
        ...prev,
        faccaoId: novaFaccao.id,
      }));

      fecharModalNovaFaccao();
    } catch (error) {
      setModalNovaFaccao((prev) => ({
        ...prev,
        erro:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao salvar faccao",
        salvando: false,
      }));
      return;
    }

    setModalNovaFaccao({
      aberto: false,
      nome: "",
      descricao: "",
      erro: null,
      salvando: false,
    });
  };

  const catalogoTatuagens = useMemo(
    () =>
      referencias.tatuagens.map((item) => ({
        id: item.id,
        nome: item.nomeSimbolo,
        significado: item.significadoAssociado ?? "Significado nao informado",
        nivel: item.nivelRisco ?? "DESCONHECIDO",
      })),
    [referencias.tatuagens],
  );

  const alertasFaccaoPorTatuagem = useMemo(() => {
    if (!Array.isArray(tatuagens) || tatuagens.length === 0) {
      return [];
    }
    const catalogoMap = new Map(
      referencias.tatuagens.map((item) => [item.id, item]),
    );
    const vistos = new Set<string>();
    const alertas: Array<{ tatuagem: string; faccao: string }> = [];

    tatuagens.forEach((item) => {
      const catalogo = item.catalogoId
        ? catalogoMap.get(item.catalogoId)
        : null;
      if (!catalogo || !Array.isArray(catalogo.faccoesAssociadas)) {
        return;
      }
      catalogo.faccoesAssociadas.forEach((faccao) => {
        const chave = `${catalogo.id}-${faccao.id}`;
        if (vistos.has(chave)) return;
        vistos.add(chave);
        alertas.push({
          tatuagem: catalogo.nomeSimbolo,
          faccao: faccao.nomeFaccao,
        });
      });
    });

    return alertas;
  }, [tatuagens, referencias.tatuagens]);

  if (carregandoReferencias) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-600 font-semibold">
            Carregando dados auxiliares...
          </p>
        </div>
      </div>
    );
  }

  if (erroReferencias) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600">
            <AlertTriangle />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Nao foi possivel carregar os dados
            </h2>
            <p className="text-sm text-gray-600">{erroReferencias}</p>
          </div>
          <button
            type="button"
            onClick={carregarReferencias}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Etapas do cadastro
  const etapas = [
    { numero: 1, titulo: "Dados Pessoais", icone: User },
    { numero: 2, titulo: "Ato Infracional", icone: FileText },
    { numero: 3, titulo: "Vinculações", icone: Users },
    { numero: 4, titulo: "Alojamento", icone: Bed },
    { numero: 5, titulo: "Tatuagens", icone: Camera },
    { numero: 6, titulo: "Alertas", icone: AlertTriangle },
  ];

  const proximaEtapa = () => {
    if (etapaAtual < etapas.length) setEtapaAtual(etapaAtual + 1);
  };

  const abrirModalDeclaracaoFaccao = () => {
    setModalDeclaracaoFaccao({
      aberto: true,
      faccaoId: faccaoHistoricoAtivo?.faccaoId ?? vinculacoes.faccaoId,
      funcao: faccaoHistoricoAtivo?.funcao ?? vinculacoes.faccaoFuncao,
      origem: (vinculacoes.faccaoOrigem || "NAO_INFORMADO") as
        | "CONFESSADA"
        | "OBSERVACAO"
        | "INTELIGENCIA"
        | "TERCEIROS"
        | "NAO_INFORMADO"
        | "OUTRO_INTERNO"
        | "",
      nivelConfianca: "NAO_AVALIADO",
      observacao:
        faccaoHistoricoAtivo?.observacao ?? vinculacoes.faccaoOrigemDetalhe,
      fonte: "",
      informanteId: "",
      informanteNome: "",
      informanteSms: "",
      salvando: false,
      erro: null,
    });
    setInformanteBusca("");
    setInformanteSugestoes([]);
    setMostrandoInformanteSugestoes(false);
  };

  const fecharModalDeclaracaoFaccao = () => {
    setModalDeclaracaoFaccao((prev) => ({
      ...prev,
      aberto: false,
      salvando: false,
      erro: null,
    }));
  };

  const salvarDeclaracaoFaccao = async () => {
    if (!initialData?.id || modalDeclaracaoFaccao.salvando) return;
    if (
      modalDeclaracaoFaccao.origem === "OBSERVACAO" &&
      !modalDeclaracaoFaccao.observacao.trim()
    ) {
      setModalDeclaracaoFaccao((prev) => ({
        ...prev,
        erro: "Descreva como a informacao foi obtida para origem OBSERVACAO.",
      }));
      return;
    }
    if (
      modalDeclaracaoFaccao.origem === "OUTRO_INTERNO" &&
      !modalDeclaracaoFaccao.informanteId
    ) {
      setModalDeclaracaoFaccao((prev) => ({
        ...prev,
        erro: "Selecione o adolescente informante quando a origem for Outro interno.",
      }));
      return;
    }
    const payload: Record<string, any> = {
      faccaoGrupoId: modalDeclaracaoFaccao.faccaoId || null,
      faccaoFuncao: modalDeclaracaoFaccao.funcao || null,
      faccaoInformacaoOrigem: modalDeclaracaoFaccao.origem || "NAO_INFORMADO",
      faccaoInformacaoDetalhe: modalDeclaracaoFaccao.observacao || null,
      faccaoInformanteAdolescenteId:
        modalDeclaracaoFaccao.origem === "OUTRO_INTERNO"
          ? modalDeclaracaoFaccao.informanteId
          : null,
    };
    setModalDeclaracaoFaccao((prev) => ({
      ...prev,
      salvando: true,
      erro: null,
    }));
    try {
      const response = await fetch(`/api/adolescentes/${initialData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          result?.erro ?? "Nao foi possivel registrar declaracao",
        );
      }
      // atualiza estados locais
      setVinculacoes((prev) => ({
        ...prev,
        faccaoId: result.faccaoGrupoId ?? "",
        faccaoFuncao: result.faccaoFuncao ?? "",
        faccaoOrigem: (result.faccaoInformacaoOrigem ?? "") as
          | ""
          | "CONFESSADA"
          | "OBSERVACAO"
          | "INTELIGENCIA"
          | "TERCEIROS"
          | "NAO_INFORMADO"
          | "OUTRO_INTERNO",
        faccaoOrigemDetalhe: result.faccaoInformacaoDetalhe ?? "",
      }));
      setFaccaoHistorico(result.faccaoHistorico ?? []);
      if (
        !Array.isArray(result.faccaoHistorico) ||
        result.faccaoHistorico.length === 0
      ) {
        const response = await fetch(`/api/adolescentes/${initialData.id}`);
        if (response.ok) {
          const atualizado = await response.json();
          setFaccaoHistorico(atualizado?.faccaoHistorico ?? []);
        }
      }
      fecharModalDeclaracaoFaccao();
    } catch (error: any) {
      console.error(error);
      setModalDeclaracaoFaccao((prev) => ({
        ...prev,
        salvando: false,
        erro: error?.message ?? "Erro ao registrar declaracao",
      }));
    }
  };

  const etapaAnterior = () => {
    if (etapaAtual > 1) setEtapaAtual(etapaAtual - 1);
  };

  const validarFormulario = () => {
    const mensagens: string[] = [];
    let etapaErro = 1;

    const nomeLimpo = dadosPessoais.nomeCompleto.trim();
    if (!nomeLimpo) {
      mensagens.push("Nome completo e obrigatorio.");
    } else if (nomeLimpo.length < 3) {
      mensagens.push("Nome completo deve ter pelo menos 3 caracteres.");
    }

    if (dadosPessoais.dataNascimento) {
      const dataNasc = new Date(dadosPessoais.dataNascimento);
      if (Number.isNaN(dataNasc.getTime())) {
        mensagens.push("Data de nascimento invalida.");
      } else if (dataNasc > new Date()) {
        mensagens.push("Data de nascimento nao pode ser futura.");
      }
    }

    if (dadosPessoais.dataEntrada) {
      const dataEnt = new Date(dadosPessoais.dataEntrada);
      if (Number.isNaN(dataEnt.getTime())) {
        mensagens.push("Data de entrada invalida.");
      }
    }

    if (smsVerificando) {
      mensagens.push("Aguarde a validacao do número SMS.");
      etapaErro = Math.max(etapaErro, 1);
    }

    if (smsDuplicado) {
      mensagens.push(
        `Número SMS ja cadastrado para ${smsDuplicado.nomeCompleto}.`,
      );
      etapaErro = Math.max(etapaErro, 1);
    }

    if (statusUnidade !== "ATIVO") {
      const dataStatusLimpa = dataStatus.trim();
      if (!dataStatusLimpa) {
        mensagens.push("Informe a data de desinternacao/inatividade.");
        etapaErro = Math.max(etapaErro, 1);
      } else {
        const dataStatusDate = new Date(dataStatusLimpa);
        if (Number.isNaN(dataStatusDate.getTime())) {
          mensagens.push("Data de desinternacao invalida.");
          etapaErro = Math.max(etapaErro, 1);
        } else if (dataStatusDate > new Date()) {
          mensagens.push("Data de desinternacao nao pode ser futura.");
          etapaErro = Math.max(etapaErro, 1);
        }
      }
    }

    if (atoInfracional.ano.trim()) {
      const anoNumero = Number.parseInt(atoInfracional.ano.trim(), 10);
      if (
        Number.isNaN(anoNumero) ||
        anoNumero < 1900 ||
        anoNumero > new Date().getFullYear()
      ) {
        mensagens.push("Informe um ano valido para o ato infracional.");
        etapaErro = Math.max(etapaErro, 2);
      }
    }

    if (atoInfracional.gravidade && !atoInfracional.gravidadeDescricao.trim()) {
      mensagens.push(
        "Detalhe a repercussao ou gravidade quando o indicador estiver marcado.",
      );
      etapaErro = Math.max(etapaErro, 2);
    }

    const casoTemConteudo = Boolean(
      atoInfracional.processo.trim() ||
      atoInfracional.ano.trim() ||
      casoInfracionalAtual.comarca.trim() ||
      casoInfracionalAtual.narrativa.trim() ||
      tipificacoesCasoPreenchidas.length > 0,
    );

    if (statusUnidade === "ATIVO" && tipificacoesCasoPreenchidas.length === 0) {
      mensagens.push(
        "Informe ao menos um ato infracional vinculado ao caso atual.",
      );
      etapaErro = Math.max(etapaErro, 2);
    }

    if (casoTemConteudo) {
      if (!casoInfracionalAtual.narrativa.trim()) {
        mensagens.push(
          "Informe a narrativa do fato principal no caso infracional.",
        );
        etapaErro = Math.max(etapaErro, 2);
      }

      if (tipificacoesCasoPreenchidas.length === 0) {
        mensagens.push(
          "Informe ao menos um ato infracional vinculado ao caso.",
        );
        etapaErro = Math.max(etapaErro, 2);
      } else {
        const tipificacaoSemCatalogo = tipificacoesCasoPreenchidas.find(
          (tipificacao) => !tipificacao.catalogoId.trim(),
        );

        if (tipificacaoSemCatalogo) {
          mensagens.push(
            "Selecione o ato infracional no catálogo para cada tipificação preenchida.",
          );
          etapaErro = Math.max(etapaErro, 2);
        }

        const principalPreenchida =
          tipificacoesCasoPreenchidas.find(
            (tipificacao) => tipificacao.principal,
          ) ?? null;

        if (!principalPreenchida) {
          mensagens.push(
            "Defina qual ato infracional deve ser tratado como principal no caso.",
          );
          etapaErro = Math.max(etapaErro, 2);
        }
      }
    }

    if (statusUnidade === "ATIVO") {
      const numeroLimpo = dadosPessoais.numeroInterno.trim();
      if (!numeroLimpo) {
        mensagens.push(
          "Informe o número interno (1 a 86) para adolescentes ativos.",
        );
        etapaErro = Math.max(etapaErro, 1);
      } else {
        const numeroValor = Number.parseInt(numeroLimpo, 10);
        if (Number.isNaN(numeroValor) || numeroValor < 1 || numeroValor > 86) {
          mensagens.push("Número interno deve ser um valor de 1 a 86.");
          etapaErro = Math.max(etapaErro, 1);
        }
      }
    }

    if (
      !faccaoSomenteHistorico &&
      vinculacoes.faccaoOrigem === "OBSERVACAO" &&
      !vinculacoes.faccaoOrigemDetalhe.trim()
    ) {
      mensagens.push(
        "Explique como a informacao de faccao foi obtida quando a origem for observacao.",
      );
      etapaErro = Math.max(etapaErro, 3);
    }

    if (mensagens.length > 0) {
      setErrosFormulario(mensagens);
      setEtapaAtual(etapaErro);
      return false;
    }

    setErrosFormulario([]);
    return true;
  };

  const handleSalvar = async () => {
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      const sanitize = (valor?: string) => {
        if (!valor) return undefined;
        const trimmed = valor.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      };

      const sanitizeOrNull = (valor?: string) => {
        const san = sanitize(valor);
        return san ?? null;
      };

      const anoSanitizado = sanitize(atoInfracional.ano);
      const anoNumero =
        anoSanitizado !== undefined
          ? Number.parseInt(anoSanitizado, 10)
          : undefined;
      const anoValido =
        anoNumero !== undefined && !Number.isNaN(anoNumero)
          ? anoNumero
          : undefined;

      const processoSanitizado = sanitize(atoInfracional.processo);
      const gravidadeDescricaoSanitizada = sanitize(
        atoInfracional.gravidadeDescricao,
      );
      const numeroInternoSanitizado =
        statusUnidade === "ATIVO"
          ? sanitize(dadosPessoais.numeroInterno)
          : undefined;
      const vulgoSanitizado = sanitizeOrNull(dadosPessoais.vulgo);
      const faccaoIdSanitizado = sanitize(vinculacoes.faccaoId);
      const faccaoFuncaoSanitizada = sanitize(vinculacoes.faccaoFuncao);
      const faccaoOrigemValor =
        vinculacoes.faccaoOrigem === "" || !faccaoIdSanitizado
          ? undefined
          : vinculacoes.faccaoOrigem;
      const faccaoOrigemDetalheSanitizada =
        faccaoOrigemValor === "OBSERVACAO" ||
        faccaoOrigemValor === "OUTRO_INTERNO"
          ? sanitize(vinculacoes.faccaoOrigemDetalhe)
          : undefined;
      const enviarFaccao = !faccaoSomenteHistorico;
      const casosHistoricosPayload = casosHistoricos
        .map((caso) => {
          const numeroProcesso = sanitizeOrNull(caso.numeroProcesso);
          const anoHistoricoSanitizado = sanitize(caso.anoFato);
          const anoHistoricoNumerico =
            anoHistoricoSanitizado !== undefined
              ? Number.parseInt(anoHistoricoSanitizado, 10)
              : undefined;
          const anoFato =
            anoHistoricoNumerico !== undefined &&
            !Number.isNaN(anoHistoricoNumerico)
              ? anoHistoricoNumerico
              : null;
          const comarca = sanitizeOrNull(caso.comarca);
          const narrativa = sanitizeOrNull(caso.narrativa);
          const tipificacoes = caso.tipificacoes
            .map((tipificacao, indiceTipificacao) => {
              const catalogoId = sanitize(tipificacao.catalogoId);
              const descricao = sanitize(tipificacao.descricao);
              const naturezaExecucao =
                tipificacao.naturezaExecucao === "CONSUMADO" ||
                tipificacao.naturezaExecucao === "TENTADO"
                  ? tipificacao.naturezaExecucao
                  : null;
              const qualificadora = sanitizeOrNull(tipificacao.qualificadora);
              const majorante = sanitizeOrNull(tipificacao.majorante);
              const observacoes = sanitizeOrNull(tipificacao.observacoes);

              if (
                !catalogoId &&
                !descricao &&
                !naturezaExecucao &&
                !qualificadora &&
                !majorante &&
                !observacoes
              ) {
                return null;
              }

              return {
                id: tipificacao.id,
                ordem: indiceTipificacao + 1,
                catalogoId: catalogoId ?? null,
                descricao: descricao ?? null,
                principal: tipificacao.principal,
                naturezaExecucao,
                qualificadora,
                majorante,
                observacoes,
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

          if (
            !numeroProcesso &&
            anoFato === null &&
            !comarca &&
            !narrativa &&
            tipificacoes.length === 0
          ) {
            return null;
          }

          return {
            id: caso.id,
            status: "HISTORICO",
            numeroProcesso,
            anoFato,
            comarca,
            narrativa,
            tipificacoes,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
      const narrativaCasoSanitizada = sanitize(casoInfracionalAtual.narrativa);
      const tipificacoesCasoPayload = casoInfracionalAtual.tipificacoes
        .map((tipificacao, indiceTipificacao) => {
          const catalogoId = sanitize(tipificacao.catalogoId);
          const descricao = sanitize(tipificacao.descricao);
          const naturezaExecucao =
            tipificacao.naturezaExecucao === "CONSUMADO" ||
            tipificacao.naturezaExecucao === "TENTADO"
              ? tipificacao.naturezaExecucao
              : null;
          const qualificadora = sanitizeOrNull(tipificacao.qualificadora);
          const majorante = sanitizeOrNull(tipificacao.majorante);
          const observacoes = sanitizeOrNull(tipificacao.observacoes);

          if (
            !catalogoId &&
            !descricao &&
            !naturezaExecucao &&
            !qualificadora &&
            !majorante &&
            !observacoes
          ) {
            return null;
          }

          return {
            id: tipificacao.id,
            ordem: indiceTipificacao + 1,
            catalogoId: catalogoId ?? null,
            descricao: descricao ?? null,
            principal: tipificacao.principal,
            naturezaExecucao,
            qualificadora,
            majorante,
            observacoes,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
      const tipificacaoPrincipalPayload =
        tipificacoesCasoPayload.find((tipificacao) => tipificacao.principal) ??
        tipificacoesCasoPayload[0] ??
        null;
      const comarcaCasoSanitizada = sanitizeOrNull(
        casoInfracionalAtual.comarca,
      );
      const enviarCasoInfracionalAtual = Boolean(
        processoSanitizado ||
        anoValido !== undefined ||
        comarcaCasoSanitizada ||
        narrativaCasoSanitizada ||
        tipificacoesCasoPayload.length > 0,
      );

      const alertasEspeciaisSelecionados = ALERTAS_ESPECIAIS_ORDEM.filter(
        (tipo) => alertasEspeciais[tipo]?.ativo,
      ).map((tipo) => ({
        tipo,
        descricao:
          sanitizeOrNull(alertasEspeciais[tipo]?.descricao ?? "") ?? undefined,
      }));

      const adolescente: AdolescenteCadastroPayload = {
        nomeCompleto: forcarNomeMaiusculo(dadosPessoais.nomeCompleto.trim()),
        nomeSocial: sanitizeOrNull(dadosPessoais.nomeSocial) ?? undefined,
        vulgo: vulgoSanitizado ?? undefined,
        dataNascimento: sanitize(dadosPessoais.dataNascimento),
        numeroSms: sanitize(dadosPessoais.numeroSms),
        numeroInterno: numeroInternoSanitizado
          ? Number.parseInt(numeroInternoSanitizado, 10)
          : undefined,
        dataEntrada: sanitize(dadosPessoais.dataEntrada),
        atoInfracionalGravidade: atoInfracional.gravidade,
        atoInfracionalGravidadeObs: gravidadeDescricaoSanitizada,
        fotoUrl: foto,
        alertaRiscoSuicidio: alertasEspeciais.RISCO_SUICIDIO.ativo,
        alertaPerfilMapeado: alertasEspeciais.PERFIL_MAPEADO.ativo,
        alertaSaudeConfidencial: alertasEspeciais.SAUDE_CONFIDENCIAL.ativo,
        alertaSaudeDetalhes:
          sanitizeOrNull(alertasEspeciais.SAUDE_CONFIDENCIAL.descricao ?? "") ??
          undefined,
        alertasEspeciais: alertasEspeciaisSelecionados,
        statusUnidade,
        dataDesinternacao:
          statusUnidade === "ATIVO" ? undefined : sanitize(dataStatus),
        tatuagens: tatuagens
          .filter((t) => t.catalogoId && t.localCorpo)
          .map((t) => ({
            catalogoId: t.catalogoId,
            localCorpo: t.localCorpo,
            observacoes: t.observacoes || "",
            significadoPessoal: t.significadoPessoal || "",
          })),
        ...(enviarFaccao
          ? {
              faccaoGrupoId: faccaoIdSanitizado,
              faccaoFuncao:
                faccaoIdSanitizado && faccaoFuncaoSanitizada
                  ? faccaoFuncaoSanitizada
                  : undefined,
              faccaoInformacaoOrigem: faccaoOrigemValor,
              faccaoInformacaoDetalhe:
                faccaoOrigemValor === "OBSERVACAO" ||
                faccaoOrigemValor === "OUTRO_INTERNO"
                  ? faccaoOrigemDetalheSanitizada
                  : undefined,
            }
          : {}),
        bairroOrigemId: sanitize(vinculacoes.bairroId),
        riscoFuga: vinculacoes.riscoFuga,
        tecnicosReferenciaIds: tecnicosReferenciaIds,
      };

      adolescente.casosInfracionais = casosHistoricosPayload;

      if (enviarCasoInfracionalAtual) {
        adolescente.casoInfracionalAtual = {
          id: casoInfracionalAtual.id,
          status: statusUnidade === "ATIVO" ? "ATUAL" : "HISTORICO",
          numeroProcesso: processoSanitizado ?? null,
          anoFato: anoValido ?? null,
          comarca: comarcaCasoSanitizada,
          narrativa: narrativaCasoSanitizada ?? null,
          tipificacoes: tipificacoesCasoPayload,
        };
      }

      const vinculosPayload = atoInfracionalVinculos
        .map((vinculo) => {
          const descricao = vinculo.descricao?.trim();
          if (!descricao) return null;
          const ids = Array.from(
            new Set(
              (vinculo.adolescentes ?? [])
                .map((item) => item.id)
                .filter((id) => id && id !== initialData?.id),
            ),
          );
          if (ids.length === 0) return null;
          return {
            id: vinculo.id,
            descricao,
            adolescentesIds: ids,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      adolescente.atoInfracionalVinculos = vinculosPayload;

      const destinoAlojamento = podeSelecionarAlojamento
        ? (alojamentoSelecionado ?? undefined)
        : undefined;

      await onSalvar(adolescente, destinoAlojamento);
      estadoInicialRef.current = estadoSerializado;
      temAlteracaoRef.current = false;
      alert(mensagemSucesso);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      const mensagemDetalhada =
        error instanceof Error && error.message ? error.message : mensagemErro;
      alert(mensagemDetalhada);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    if (!podeSairSemSalvar()) return;
    onCancelar();
  };

  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasteFoto = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (!items || items.length === 0) {
      return;
    }

    const imagemItem = Array.from(items).find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );

    if (!imagemItem) {
      return;
    }

    const file = imagemItem.getAsFile();
    if (!file) {
      return;
    }

    event.preventDefault();
    const reader = new FileReader();
    reader.onloadend = () => {
      setFoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const criarCasoHistoricoVazio = (): CasoHistoricoFormState => ({
    chaveLocal: criarChaveCasoHistoricoLocal(),
    status: "HISTORICO",
    numeroProcesso: "",
    anoFato: "",
    comarca: "",
    narrativa: "",
    tipificacoes: [criarTipificacaoCasoVazia(1)],
  });

  const atualizarCasosHistoricos = (
    atualizador: (casos: CasoHistoricoFormState[]) => CasoHistoricoFormState[],
  ) => {
    setCasosHistoricos((prev) => atualizador(prev));
  };

  const adicionarCasoHistorico = () => {
    const novoCaso = criarCasoHistoricoVazio();
    atualizarCasosHistoricos((prev) => [...prev, novoCaso]);
    setCasosHistoricosExpandidos((prev) => [...prev, novoCaso.chaveLocal]);
  };

  const removerCasoHistorico = (casoIndex: number) => {
    const chaveLocal = casosHistoricos[casoIndex]?.chaveLocal;
    atualizarCasosHistoricos((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== casoIndex),
    );
    if (chaveLocal) {
      setCasosHistoricosExpandidos((prev) =>
        prev.filter((chave) => chave !== chaveLocal),
      );
    }
  };

  const toggleEdicaoCasoHistorico = (chaveLocal: string) => {
    setCasosHistoricosExpandidos((prev) =>
      prev.includes(chaveLocal)
        ? prev.filter((chave) => chave !== chaveLocal)
        : [...prev, chaveLocal],
    );
  };

  const atualizarCasoHistorico = (
    casoIndex: number,
    atualizador: (caso: CasoHistoricoFormState) => CasoHistoricoFormState,
  ) => {
    atualizarCasosHistoricos((prev) =>
      prev.map((caso, itemIndex) =>
        itemIndex === casoIndex ? atualizador(caso) : caso,
      ),
    );
  };

  const atualizarTipificacoesCasoHistorico = (
    casoIndex: number,
    atualizador: (
      tipificacoes: CasoTipificacaoFormState[],
    ) => CasoTipificacaoFormState[],
  ) => {
    atualizarCasoHistorico(casoIndex, (caso) => ({
      ...caso,
      tipificacoes: atualizador(caso.tipificacoes),
    }));
  };

  const adicionarTipificacaoCasoHistorico = (casoIndex: number) => {
    atualizarTipificacoesCasoHistorico(casoIndex, (tipificacoes) => [
      ...tipificacoes,
      criarTipificacaoCasoVazia(tipificacoes.length + 1),
    ]);
  };

  const removerTipificacaoCasoHistorico = (
    casoIndex: number,
    tipificacaoIndex: number,
  ) => {
    atualizarTipificacoesCasoHistorico(casoIndex, (tipificacoes) => {
      const atualizadas = tipificacoes
        .filter((_, itemIndex) => itemIndex !== tipificacaoIndex)
        .map((tipificacao, itemIndex) => ({
          ...tipificacao,
          ordem: itemIndex + 1,
          principal: itemIndex === 0 ? true : tipificacao.principal,
        }));

      return atualizadas.length > 0
        ? atualizadas
        : [criarTipificacaoCasoVazia(1)];
    });
  };

  const selecionarAtoCatalogoCasoHistorico = (
    casoIndex: number,
    tipificacaoIndex: number,
    ato: AtoCatalogoOption,
  ) => {
    atualizarTipificacoesCasoHistorico(casoIndex, (tipificacoes) =>
      tipificacoes.map((item, index) =>
        index !== tipificacaoIndex
          ? item
          : {
              ...item,
              buscaCatalogo: ato.nome,
              catalogoId: ato.id,
              descricao: montarDescricaoAutomaticaTipificacao(
                ato.nome,
                item.naturezaExecucao,
              ),
            },
      ),
    );
    setCampoBuscaAtoAtivo(null);
  };

  const atualizarBuscaAtoCatalogoCasoHistorico = (
    casoIndex: number,
    tipificacaoIndex: number,
    valor: string,
  ) => {
    atualizarTipificacoesCasoHistorico(casoIndex, (tipificacoes) =>
      tipificacoes.map((item, index) => {
        if (index !== tipificacaoIndex) {
          return item;
        }

        const nomeSelecionado =
          atosCatalogoCache.find((ato) => ato.id === item.catalogoId)?.nome ?? "";
        const mantemSelecao =
          item.catalogoId &&
          normalizarTexto(valor) === normalizarTexto(nomeSelecionado);

        return {
          ...item,
          buscaCatalogo: valor,
          catalogoId: mantemSelecao ? item.catalogoId : "",
          descricao:
            item.catalogoId && !mantemSelecao
              ? ""
              : item.descricao,
        };
      }),
    );
  };

  const limparFormularioVinculo = (reporEdicao: boolean = true) => {
    if (reporEdicao && vinculoEmEdicao) {
      setAtoInfracionalVinculos((prev) => [...prev, vinculoEmEdicao]);
    }
    setVinculoDescricao("");
    setVinculoBusca("");
    setVinculoSugestoes([]);
    setVinculoSelecionados([]);
    setMostrandoSugestoesVinculo(false);
    setBuscandoVinculo(false);
    setVinculoEmEdicaoId(null);
    setVinculoEmEdicao(null);
  };

  const adicionarVinculoInfracional = () => {
    const descricao = vinculoDescricao.trim();
    if (!descricao || vinculoSelecionados.length === 0) {
      return;
    }
    const adolescentes = Array.from(
      new Map(vinculoSelecionados.map((item) => [item.id, item])).values(),
    );
    setAtoInfracionalVinculos((prev) => [
      ...prev,
      {
        id: vinculoEmEdicaoId ?? undefined,
        descricao,
        adolescentes,
      },
    ]);
    limparFormularioVinculo(false);
  };

  const iniciarEdicaoVinculoInfracional = (
    vinculo: AdolescenteAtoInfracionalVinculoItem,
    index: number,
  ) => {
    setVinculoEmEdicaoId(vinculo.id ?? null);
    setVinculoEmEdicao(vinculo);
    setVinculoDescricao(vinculo.descricao ?? "");
    setVinculoSelecionados(vinculo.adolescentes ?? []);
    setAtoInfracionalVinculos((prev) => prev.filter((_, i) => i !== index));
  };

  const removerVinculoInfracional = (index: number) => {
    setAtoInfracionalVinculos((prev) => prev.filter((_, i) => i !== index));
  };

  const adicionarTatuagem = () => {
    setTatuagens([
      ...tatuagens,
      {
        catalogoId: "",
        localCorpo: "",
        observacoes: "",
        significadoPessoal: "",
      },
    ]);
  };

  const removerTatuagem = (index: number) => {
    setTatuagens(tatuagens.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Cabecalho */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-b-4 border-indigo-600">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {tituloPagina}
          </h1>
          <p className="text-gray-600">{subtituloPagina}</p>
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="overflow-x-auto pb-3">
            <div className="flex items-center gap-4 min-w-[520px] sm:min-w-0 sm:gap-0">
              {etapas.map((etapa, index) => (
                <button
                  key={etapa.numero}
                  type="button"
                  onClick={() => setEtapaAtual(etapa.numero)}
                  className="flex items-center min-w-[130px] sm:flex-1 focus:outline-none"
                >
                  <div className="flex items-center w-full">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                          etapa.numero === etapaAtual
                            ? "bg-indigo-600 text-white scale-110"
                            : etapa.numero < etapaAtual
                              ? "bg-green-500 text-white"
                              : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {etapa.numero < etapaAtual ? (
                          <CheckCircle size={24} />
                        ) : (
                          <etapa.icone size={24} />
                        )}
                      </div>
                      <span
                        className={`text-xs mt-2 font-semibold text-center ${
                          etapa.numero === etapaAtual
                            ? "text-indigo-600"
                            : etapa.numero < etapaAtual
                              ? "text-green-500"
                              : "text-gray-500"
                        }`}
                      >
                        {etapa.titulo}
                      </span>
                    </div>
                    {index < etapas.length - 1 && (
                      <div
                        className={`h-1 hidden sm:flex flex-1 mx-2 rounded transition-all ${
                          etapa.numero < etapaAtual
                            ? "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {errosFormulario.length > 0 && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl p-5 space-y-2">
            <p className="font-semibold">
              Ajuste os itens abaixo antes de salvar:
            </p>
            <ul className="list-disc list-inside text-sm">
              {errosFormulario.map((erro) => (
                <li key={erro}>{erro}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* ETAPA 1: Dados Pessoais */}
          {etapaAtual === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <User className="text-indigo-600" />
                Dados Pessoais
              </h2>

              {/* Upload de Foto */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div
                    className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    onPaste={handlePasteFoto}
                    tabIndex={0}
                    title="Clique e pressione Ctrl+V para colar uma foto"
                  >
                    {foto ? (
                      <img
                        src={foto}
                        alt="Foto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera size={48} className="text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg">
                    <Camera size={20} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadFoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome no Cronograma *
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.nomeCompleto}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        nomeCompleto: forcarNomeMaiusculo(e.target.value),
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Ex: Joao da Silva Santos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome Social
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.nomeSocial}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        nomeSocial: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Ex: Joao"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vulgo / Apelido
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.vulgo}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        vulgo: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Ex: Juninho do Centro"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Utilize este campo para registrar apelidos mencionados em
                    investigacoes ou relatos.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px] gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={dadosPessoais.dataNascimento}
                      onChange={(e) =>
                        setDadosPessoais({
                          ...dadosPessoais,
                          dataNascimento: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Idade
                    </label>
                    <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600 flex items-center justify-center">
                      {idadeAdolescente !== null
                        ? `${idadeAdolescente} anos`
                        : "--"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número SMS
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.numeroSms}
                    onChange={(e) => {
                      const novoValor = e.target.value;
                      setDadosPessoais((prev) => ({
                        ...prev,
                        numeroSms: novoValor,
                      }));
                      if (
                        smsDuplicado ||
                        smsErroVerificacao ||
                        smsUltimoVerificado
                      ) {
                        limparValidacaoSms();
                      }
                    }}
                    onBlur={verificarNumeroSms}
                    className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all ${
                      smsDuplicado
                        ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                        : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    }`}
                    placeholder="Ex: 12345"
                  />
                  {smsVerificando && (
                    <p className="text-xs text-gray-500 mt-1">
                      Verificando número SMS...
                    </p>
                  )}
                  {!smsVerificando && smsErroVerificacao && (
                    <p className="text-xs text-amber-600 mt-1">
                      {smsErroVerificacao}
                    </p>
                  )}
                  {!smsVerificando && smsDuplicado && (
                    <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 flex flex-wrap items-center justify-between gap-2">
                      <span>
                        Número SMS ja cadastrado para{" "}
                        {smsDuplicado.nomeCompleto}. Deseja abrir a ficha
                        existente?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!podeSairSemSalvar()) return;
                          router.push(`/adolescentes/${smsDuplicado.id}`);
                        }}
                        className="font-semibold underline text-rose-700 hover:text-rose-800"
                      >
                        Abrir ficha existente
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número interno (1 a 86)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={86}
                    inputMode="numeric"
                    disabled={statusUnidade !== "ATIVO"}
                    value={dadosPessoais.numeroInterno}
                    onChange={(e) => {
                      const somenteNumeros = e.target.value.replace(/\D/g, "");
                      const limitado = somenteNumeros.slice(0, 2);
                      setDadosPessoais((prev) => ({
                        ...prev,
                        numeroInterno: limitado,
                      }));
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="Ex: 12"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {statusUnidade === "ATIVO"
                      ? "Obrigatorio para adolescentes ativos. Informe um numero entre 1 e 86."
                      : "Número interno reservado apenas para adolescentes com status ATIVO."}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data de Entrada
                  </label>
                  <input
                    type="date"
                    value={dadosPessoais.dataEntrada}
                    onChange={(e) =>
                      setDadosPessoais({
                        ...dadosPessoais,
                        dataEntrada: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Situação na Unidade
                  </label>
                  <select
                    value={statusUnidade}
                    onChange={(e) =>
                      setStatusUnidade(e.target.value as StatusUnidade)
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white"
                  >
                    {STATUS_OPCOES.map((opcao) => (
                      <option key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </option>
                    ))}
                  </select>
                </div>

                {statusUnidade !== "ATIVO" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Data da mudanca de status
                    </label>
                    <input
                      type="date"
                      value={dataStatus}
                      onChange={(e) => setDataStatus(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Utilize esta data para registrar liberacao, transferencia
                      ou evasao.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ETAPA 2: Caso Infracional */}
          {etapaAtual === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileText className="text-indigo-600" />
                Caso Infracional
              </h2>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-5 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Caso infracional atual
                      </h3>
                      <p className="text-sm text-slate-600">
                        Organize o registro em tres etapas: identificacao do
                        processo, narrativa unica do fato e atos infracionais
                        vinculados.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                        1. Processo
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                        2. Narrativa
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                        3. Atos vinculados
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                          Etapa 1
                        </p>
                        <h4 className="mt-1 text-base font-semibold text-slate-900">
                          Dados do processo
                        </h4>
                        <p className="text-xs text-slate-500">
                          Preencha os dados objetivos que identificam o processo
                          e o julgamento do fato.
                        </p>
                      </div>

                      <div className="grid gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Número do processo
                          </label>
                          <input
                            type="text"
                            value={atoInfracional.processo}
                            onChange={(e) =>
                              setAtoInfracional({
                                ...atoInfracional,
                                processo: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                            placeholder="Ex: 0001234-56.2024.8.16.0000"
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Ano do fato
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={atoInfracional.ano}
                              onChange={(e) =>
                                setAtoInfracional({
                                  ...atoInfracional,
                                  ano: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                              placeholder="Ex: 2024"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Comarca
                            </label>
                            <input
                              type="text"
                              value={casoInfracionalAtual.comarca}
                              onChange={(e) =>
                                setCasoInfracionalAtual((prev) => ({
                                  ...prev,
                                  comarca: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                              placeholder="Ex: Maringa/PR"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                          Etapa 2
                        </p>
                        <h4 className="mt-1 text-base font-semibold text-slate-900">
                          Narrativa do fato
                        </h4>
                        <p className="text-xs text-slate-500">
                          Use um único texto para descrever a dinâmica completa.
                          Período, local, meio de execução e papel do
                          adolescente devem aparecer dentro da própria
                          narrativa.
                        </p>
                      </div>

                      <textarea
                        value={casoInfracionalAtual.narrativa}
                        onChange={(e) =>
                          atualizarCampoCasoInfracional(
                            "narrativa",
                            e.target.value,
                          )
                        }
                        rows={12}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-relaxed focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                        placeholder="Descreva toda a dinamica fatica do processo, com contexto, periodo, local, vitimas, coautoria, forma de execucao e demais elementos relevantes."
                      />

                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                        Esta narrativa e a base principal do caso. Evite criar
                        campos paralelos para informações que ja cabem aqui.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                          Etapa 3
                        </p>
                        <h4 className="mt-1 text-base font-semibold text-slate-900">
                          Atos infracionais vinculados
                        </h4>
                        <p className="text-xs text-slate-500">
                          Vincule todos os atos ao mesmo fato/processo e marque
                          qual deles deve ser tratado como principal.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => adicionarTipificacaoCaso()}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        + Ato infracional
                      </button>
                    </div>

                    <div className="space-y-3">
                      {casoInfracionalAtual.tipificacoes.map(
                        (tipificacao, tipificacaoIndex) => (
                          <div
                            key={tipificacao.id ?? `tip-${tipificacaoIndex}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  Ato infracional {tipificacaoIndex + 1}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Defina o enquadramento e complemente com
                                  qualificadoras, majorantes e observacoes
                                  tecnicas quando necessario.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  removerTipificacaoCaso(tipificacaoIndex)
                                }
                                className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                              >
                                Remover
                              </button>
                            </div>

                            <div className="grid gap-3 md:grid-cols-6">
                              <div className="md:col-span-3">
                                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                  <label className="block text-[11px] font-semibold text-slate-600">
                                    Ato infracional no catalogo
                                  </label>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        abrirModalNovoAtoParaTipificacao(
                                          "ATUAL",
                                          tipificacaoIndex,
                                          undefined,
                                          tipificacao.descricao,
                                        )
                                      }
                                      className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-600"
                                    >
                                      Cadastrar novo ato
                                    </button>
                                    <button
                                      type="button"
                                      onClick={abrirGestaoAtos}
                                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-800"
                                    >
                                      Gerenciar atos
                                    </button>
                                  </div>
                                </div>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={tipificacao.buscaCatalogo}
                                    onFocus={() =>
                                      setCampoBuscaAtoAtivo({
                                        origem: "ATUAL",
                                        tipificacaoIndex,
                                      })
                                    }
                                    onBlur={() => {
                                      window.setTimeout(() => {
                                        setCampoBuscaAtoAtivo((atual) =>
                                          atual?.origem === "ATUAL" &&
                                          atual.tipificacaoIndex ===
                                            tipificacaoIndex
                                            ? null
                                            : atual,
                                        );
                                      }, 120);
                                    }}
                                    onChange={(e) =>
                                      atualizarBuscaAtoCatalogoCasoAtual(
                                        tipificacaoIndex,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                    placeholder="Digite para buscar o ato"
                                    autoComplete="off"
                                  />
                                  {campoBuscaAtoAtivo?.origem === "ATUAL" &&
                                  campoBuscaAtoAtivo.tipificacaoIndex ===
                                    tipificacaoIndex ? (
                                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                                      {obterSugestoesAtoCatalogo(
                                        atosCatalogoOrdenados,
                                        tipificacao.buscaCatalogo,
                                      ).map((ato) => (
                                        <button
                                          key={ato.id}
                                          type="button"
                                          onMouseDown={(event) => {
                                            event.preventDefault();
                                            selecionarAtoCatalogoCasoAtual(
                                              tipificacaoIndex,
                                              ato,
                                            );
                                          }}
                                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                                        >
                                          <span>{ato.nome}</span>
                                          {!ato.ativo ? (
                                            <span className="text-[11px] font-semibold text-amber-600">
                                              Inativo
                                            </span>
                                          ) : null}
                                        </button>
                                      ))}
                                      {obterSugestoesAtoCatalogo(
                                        atosCatalogoOrdenados,
                                        tipificacao.buscaCatalogo,
                                      ).length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-slate-500">
                                          Nenhum ato encontrado.
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div className="md:col-span-3">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Consumado ou Tentado
                                </label>
                                <select
                                  value={tipificacao.naturezaExecucao}
                                  onChange={(e) =>
                                    atualizarTipificacoesCaso((tipificacoes) =>
                                      tipificacoes.map((item, index) =>
                                        index !== tipificacaoIndex
                                          ? item
                                          : {
                                              ...item,
                                              descricao: item.catalogoId
                                                ? montarDescricaoAutomaticaTipificacao(
                                                    atosCatalogoCache.find(
                                                      (ato) =>
                                                        ato.id === item.catalogoId,
                                                    )?.nome ?? item.descricao,
                                                    e.target
                                                      .value as CasoTipificacaoFormState["naturezaExecucao"],
                                                  )
                                                : item.descricao,
                                              naturezaExecucao: e.target
                                                .value as CasoTipificacaoFormState["naturezaExecucao"],
                                            },
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                >
                                  {NATUREZA_EXECUCAO_OPCOES.map((opcao) => (
                                    <option
                                      key={opcao.value || "vazio"}
                                      value={opcao.value}
                                    >
                                      {opcao.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Descricao manual
                                </label>
                                <input
                                  type="text"
                                  value={tipificacao.descricao}
                                  onChange={(e) =>
                                    atualizarTipificacoesCaso((tipificacoes) =>
                                      tipificacoes.map((item, index) =>
                                        index !== tipificacaoIndex
                                          ? item
                                          : {
                                              ...item,
                                              descricao: e.target.value,
                                            },
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                  placeholder="Use apenas se precisar detalhar manualmente"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Qualificadora
                                </label>
                                <input
                                  type="text"
                                  value={tipificacao.qualificadora}
                                  onChange={(e) =>
                                    atualizarTipificacoesCaso((tipificacoes) =>
                                      tipificacoes.map((item, index) =>
                                        index !== tipificacaoIndex
                                          ? item
                                          : {
                                              ...item,
                                              qualificadora: e.target.value,
                                            },
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                  placeholder="Ex: vitima menor de 14 anos"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Majorante / causa de aumento
                                </label>
                                <input
                                  type="text"
                                  value={tipificacao.majorante}
                                  onChange={(e) =>
                                    atualizarTipificacoesCaso((tipificacoes) =>
                                      tipificacoes.map((item, index) =>
                                        index !== tipificacaoIndex
                                          ? item
                                          : {
                                              ...item,
                                              majorante: e.target.value,
                                            },
                                      ),
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                  placeholder="Ex: concurso de pessoas, internet"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                id={`tip-principal-${tipificacaoIndex}`}
                                type="checkbox"
                                checked={tipificacao.principal}
                                onChange={(e) =>
                                  atualizarTipificacoesCaso((tipificacoes) =>
                                    tipificacoes.map((item, index) => ({
                                      ...item,
                                      principal:
                                        index === tipificacaoIndex
                                          ? e.target.checked
                                          : e.target.checked
                                            ? false
                                            : item.principal,
                                    })),
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <label
                                htmlFor={`tip-principal-${tipificacaoIndex}`}
                                className="text-xs font-semibold text-slate-700"
                              >
                                Marcar como ato principal do caso
                              </label>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Observacoes da tipificacao
                              </label>
                              <textarea
                                value={tipificacao.observacoes}
                                onChange={(e) =>
                                  atualizarTipificacoesCaso((tipificacoes) =>
                                    tipificacoes.map((item, index) =>
                                      index !== tipificacaoIndex
                                        ? item
                                        : {
                                            ...item,
                                            observacoes: e.target.value,
                                          },
                                    ),
                                  )
                                }
                                rows={2}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                                placeholder="Detalhes complementares da tipificacao."
                              />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900">
                          Vinculação no mesmo ato infracional
                        </h4>
                        <p className="text-xs text-slate-500">
                          Registre outros adolescentes envolvidos no mesmo
                          caso/processo. O alerta de alocação aparece apenas
                          quando estiverem na mesma ala.
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {atoInfracionalVinculos.length} registrado(s)
                      </span>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Adolescentes envolvidos
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={vinculoBusca}
                            onFocus={() => setMostrandoSugestoesVinculo(true)}
                            onChange={(e) => setVinculoBusca(e.target.value)}
                            onBlur={() =>
                              window.setTimeout(
                                () => setMostrandoSugestoesVinculo(false),
                                120,
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                            placeholder="Busque pelo nome ou SMS"
                          />
                          {buscandoVinculo && (
                            <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-indigo-500" />
                          )}
                          {mostrandoSugestoesVinculo &&
                            vinculoBusca.trim().length >= 2 && (
                              <div className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                                {vinculoSugestoes.length === 0 && (
                                  <p className="px-3 py-2 text-sm text-slate-500">
                                    {buscandoVinculo
                                      ? "Buscando..."
                                      : "Nenhum adolescente encontrado."}
                                  </p>
                                )}
                                {vinculoSugestoes.map((item) => (
                                  <button
                                    type="button"
                                    key={item.id}
                                    onMouseDown={() => {
                                      setVinculoSelecionados((prev) => [
                                        ...prev,
                                        item,
                                      ]);
                                      setVinculoBusca("");
                                      setMostrandoSugestoesVinculo(false);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50"
                                  >
                                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-slate-500 shadow-sm">
                                      {item.fotoUrl ? (
                                        <img
                                          src={item.fotoUrl}
                                          alt={item.nomeCompleto}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        (item.nomeCompleto?.trim().charAt(0) ??
                                        "?")
                                      )}
                                    </span>
                                    <span className="flex flex-col">
                                      <span className="text-sm font-semibold text-slate-800">
                                        {item.nomeCompleto}
                                      </span>
                                      <span className="text-[11px] text-slate-500">
                                        {item.numeroSms
                                          ? `SMS ${item.numeroSms}`
                                          : "SMS nao informado"}{" "}
                                        • {obterStatusLabel(item.statusUnidade)}
                                      </span>
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
                        {vinculoSelecionados.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {vinculoSelecionados.map((item) => (
                              <span
                                key={item.id}
                                className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700"
                              >
                                <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-[9px] font-semibold text-slate-500 shadow-sm">
                                  {item.fotoUrl ? (
                                    <img
                                      src={item.fotoUrl}
                                      alt={item.nomeCompleto}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    (item.nomeCompleto?.trim().charAt(0) ?? "?")
                                  )}
                                </span>
                                <span className="max-w-[140px] truncate">
                                  {item.nomeCompleto}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVinculoSelecionados((prev) =>
                                      prev.filter(
                                        (selecionado) =>
                                          selecionado.id !== item.id,
                                      ),
                                    )
                                  }
                                  className="text-indigo-400 hover:text-indigo-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Descrição do vínculo
                        </label>
                        <textarea
                          value={vinculoDescricao}
                          onChange={(e) => setVinculoDescricao(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
                          placeholder="Ex: Ocorrência conjunta registrada no mesmo boletim."
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={adicionarVinculoInfracional}
                        disabled={!podeAdicionarVinculo}
                        className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                      >
                        {vinculoEmEdicaoId
                          ? "Salvar vínculo"
                          : "Adicionar vínculo"}
                      </button>
                      {vinculoEmEdicaoId && (
                        <button
                          type="button"
                          onClick={() => limparFormularioVinculo()}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Cancelar edição
                        </button>
                      )}
                    </div>

                    {atoInfracionalVinculos.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-[11px] text-slate-500">
                        Nenhum vínculo infracional registrado.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {atoInfracionalVinculos.map((vinculo, index) => (
                          <div
                            key={`${vinculo.id ?? "novo"}-${index}`}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <p className="text-xs font-semibold text-slate-800">
                              {vinculo.descricao}
                            </p>
                            <ul className="mt-2 space-y-1 text-[11px] text-slate-600">
                              {(vinculo.adolescentes ?? []).map(
                                (adolescente) => (
                                  <li
                                    key={adolescente.id}
                                    className="flex items-center gap-2"
                                  >
                                    <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-[9px] font-semibold text-slate-500 shadow-sm">
                                      {adolescente.fotoUrl ? (
                                        <img
                                          src={adolescente.fotoUrl}
                                          alt={adolescente.nomeCompleto}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        (adolescente.nomeCompleto
                                          ?.trim()
                                          .charAt(0) ?? "?")
                                      )}
                                    </span>
                                    <span>
                                      {adolescente.nomeCompleto}
                                      {adolescente.numeroSms
                                        ? ` (SMS ${adolescente.numeroSms})`
                                        : ""}{" "}
                                      •{" "}
                                      {obterStatusLabel(
                                        adolescente.statusUnidade,
                                      )}
                                    </span>
                                  </li>
                                ),
                              )}
                            </ul>
                            <div className="mt-2 flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  iniciarEdicaoVinculoInfracional(
                                    vinculo,
                                    index,
                                  )
                                }
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => removerVinculoInfracional(index)}
                                className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className={`p-4 rounded-xl border-2 transition-all ${
                    atoInfracional.gravidade
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="gravidadeAto"
                      checked={atoInfracional.gravidade}
                      onChange={(e) =>
                        setAtoInfracional({
                          ...atoInfracional,
                          gravidade: e.target.checked,
                        })
                      }
                      className="mt-1 h-5 w-5 text-orange-500 rounded focus:ring-orange-500 border-gray-300"
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor="gravidadeAto"
                        className="font-semibold text-gray-800 cursor-pointer flex items-center gap-2"
                      >
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Ato com repercussão pública ou gravidade elevada
                      </label>
                      <p className="text-sm text-gray-600">
                        Use esta opcao quando o fato tenha grande repercussao ou
                        represente risco excepcional. Caso o indicador esteja
                        marcado a descricao detalhada sera destacada em
                        relatorios operacionais (ex.: justificativa de algema).
                      </p>
                      <p className="text-xs text-gray-500">
                        Dica: revise tambem a etapa de alertas para garantir
                        coerência com esta marcacao.
                      </p>
                    </div>
                  </div>

                  {atoInfracional.gravidade && (
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Descricao complementar da gravidade ou repercussao
                      </label>
                      <textarea
                        value={atoInfracional.gravidadeDescricao}
                        onChange={(e) =>
                          setAtoInfracional({
                            ...atoInfracional,
                            gravidadeDescricao: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all resize-none bg-white"
                        placeholder="Detalhe fatos relevantes, vitimas envolvidas, repercussao midiaticas ou decisoes judiciais correlatas."
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Casos Históricos
                  </h3>
                  <button
                    type="button"
                    onClick={adicionarCasoHistorico}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                  >
                    + Adicionar caso
                  </button>
                </div>

                {casosHistoricos.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-8 text-center text-gray-500">
                    <FileText
                      size={48}
                      className="mx-auto mb-2 text-gray-400"
                    />
                    <p>Nenhum caso histórico registrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {casosHistoricos.map((caso, casoIndex) => (
                      <div
                        key={caso.chaveLocal}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        {(() => {
                          const editando = casosHistoricosExpandidos.includes(
                            caso.chaveLocal,
                          );
                          const metadados = [
                            caso.numeroProcesso.trim()
                              ? `Proc. ${caso.numeroProcesso.trim()}`
                              : null,
                            caso.anoFato.trim()
                              ? `Ano ${caso.anoFato.trim()}`
                              : null,
                            caso.comarca.trim() || null,
                          ].filter(Boolean);

                          return (
                            <>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    Caso histórico {casoIndex + 1}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-600">
                                    {resumirCasoHistorico(caso)}
                                  </p>
                                  {metadados.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {metadados.map((item) => (
                                        <span
                                          key={`${caso.chaveLocal}-${item}`}
                                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200"
                                        >
                                          {item}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="mt-2 text-xs text-slate-500">
                                      Caso sem dados complementares preenchidos.
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleEdicaoCasoHistorico(caso.chaveLocal)
                                    }
                                    className="text-sm font-semibold text-indigo-700 hover:text-indigo-600"
                                  >
                                    {editando ? "Ocultar edicao" : "Editar"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removerCasoHistorico(casoIndex)
                                    }
                                    className="text-sm font-semibold text-red-600 hover:text-red-700"
                                  >
                                    Remover caso
                                  </button>
                                </div>
                              </div>

                              {editando ? (
                                <>
                                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                                    <div>
                                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                                        Número do processo
                                      </label>
                                      <input
                                        type="text"
                                        value={caso.numeroProcesso}
                                        onChange={(e) =>
                                          atualizarCasoHistorico(
                                            casoIndex,
                                            (atual) => ({
                                              ...atual,
                                              numeroProcesso: e.target.value,
                                            }),
                                          )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                        placeholder="Ex.: 0001234-56.2024.8.16.0000"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                                        Ano do fato
                                      </label>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={caso.anoFato}
                                        onChange={(e) =>
                                          atualizarCasoHistorico(
                                            casoIndex,
                                            (atual) => ({
                                              ...atual,
                                              anoFato: e.target.value,
                                            }),
                                          )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                        placeholder="Ex.: 2024"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                                        Comarca
                                      </label>
                                      <input
                                        type="text"
                                        value={caso.comarca}
                                        onChange={(e) =>
                                          atualizarCasoHistorico(
                                            casoIndex,
                                            (atual) => ({
                                              ...atual,
                                              comarca: e.target.value,
                                            }),
                                          )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                        placeholder="Ex.: Maringa/PR"
                                      />
                                    </div>
                                  </div>

                                  <div className="mt-4">
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                                      Narrativa do caso
                                    </label>
                                    <textarea
                                      value={caso.narrativa}
                                      onChange={(e) =>
                                        atualizarCasoHistorico(
                                          casoIndex,
                                          (atual) => ({
                                            ...atual,
                                            narrativa: e.target.value,
                                          }),
                                        )
                                      }
                                      rows={3}
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                                      placeholder="Descreva o contexto do caso histórico (opcional)."
                                    />
                                  </div>

                                  <div className="mt-5 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                          Tipificações
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Inclua qualificadoras, majorantes e
                                          observações.
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          adicionarTipificacaoCasoHistorico(
                                            casoIndex,
                                          )
                                        }
                                        className="text-sm font-semibold text-indigo-700 hover:text-indigo-600"
                                      >
                                        + Adicionar tipificação
                                      </button>
                                    </div>

                                    {caso.tipificacoes.map(
                                      (tipificacao, tipificacaoIndex) => (
                                        <div
                                          key={
                                            tipificacao.id ??
                                            `tip-historico-${casoIndex}-${tipificacaoIndex}`
                                          }
                                          className="rounded-xl border border-slate-200 bg-white p-4"
                                        >
                                          <div className="mb-3 flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-slate-800">
                                              Tipificação {tipificacaoIndex + 1}
                                            </p>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                removerTipificacaoCasoHistorico(
                                                  casoIndex,
                                                  tipificacaoIndex,
                                                )
                                              }
                                              className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                                            >
                                              Remover
                                            </button>
                                          </div>

                                        <div className="grid gap-3 md:grid-cols-6">
                                          <div className="md:col-span-3">
                                              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                                <label className="block text-[11px] font-semibold text-slate-600">
                                                  Ato infracional no catalogo
                                                </label>
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      abrirModalNovoAtoParaTipificacao(
                                                        "HISTORICO",
                                                        tipificacaoIndex,
                                                        casoIndex,
                                                        tipificacao.descricao,
                                                      )
                                                    }
                                                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-600"
                                                  >
                                                    Cadastrar novo ato
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={abrirGestaoAtos}
                                                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-800"
                                                  >
                                                    Gerenciar atos
                                                  </button>
                                                </div>
                                              </div>
                                              <div className="relative">
                                                <input
                                                  type="text"
                                                  value={
                                                    tipificacao.buscaCatalogo
                                                  }
                                                  onFocus={() =>
                                                    setCampoBuscaAtoAtivo({
                                                      origem: "HISTORICO",
                                                      casoHistoricoIndex:
                                                        casoIndex,
                                                      tipificacaoIndex,
                                                    })
                                                  }
                                                  onBlur={() => {
                                                    window.setTimeout(() => {
                                                      setCampoBuscaAtoAtivo(
                                                        (atual) =>
                                                          atual?.origem ===
                                                            "HISTORICO" &&
                                                          atual.casoHistoricoIndex ===
                                                            casoIndex &&
                                                          atual.tipificacaoIndex ===
                                                            tipificacaoIndex
                                                            ? null
                                                            : atual,
                                                      );
                                                    }, 120);
                                                  }}
                                                  onChange={(e) =>
                                                    atualizarBuscaAtoCatalogoCasoHistorico(
                                                      casoIndex,
                                                      tipificacaoIndex,
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                                  placeholder="Digite para buscar o ato"
                                                  autoComplete="off"
                                                />
                                                {campoBuscaAtoAtivo?.origem ===
                                                  "HISTORICO" &&
                                                campoBuscaAtoAtivo.casoHistoricoIndex ===
                                                  casoIndex &&
                                                campoBuscaAtoAtivo.tipificacaoIndex ===
                                                  tipificacaoIndex ? (
                                                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                                                    {obterSugestoesAtoCatalogo(
                                                      atosCatalogoOrdenados,
                                                      tipificacao.buscaCatalogo,
                                                    ).map((ato) => (
                                                      <button
                                                        key={ato.id}
                                                        type="button"
                                                        onMouseDown={(
                                                          event,
                                                        ) => {
                                                          event.preventDefault();
                                                          selecionarAtoCatalogoCasoHistorico(
                                                            casoIndex,
                                                            tipificacaoIndex,
                                                            ato,
                                                          );
                                                        }}
                                                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                                                      >
                                                        <span>{ato.nome}</span>
                                                        {!ato.ativo ? (
                                                          <span className="text-[11px] font-semibold text-amber-600">
                                                            Inativo
                                                          </span>
                                                        ) : null}
                                                      </button>
                                                    ))}
                                                    {obterSugestoesAtoCatalogo(
                                                      atosCatalogoOrdenados,
                                                      tipificacao.buscaCatalogo,
                                                    ).length === 0 ? (
                                                      <div className="px-3 py-2 text-sm text-slate-500">
                                                        Nenhum ato encontrado.
                                                      </div>
                                                    ) : null}
                                                  </div>
                                                ) : null}
                                              </div>
                                            </div>
                                            <div className="md:col-span-3">
                                              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                                                Consumado ou Tentado
                                              </label>
                                              <select
                                                value={
                                                  tipificacao.naturezaExecucao
                                                }
                                                onChange={(e) =>
                                                  atualizarTipificacoesCasoHistorico(
                                                    casoIndex,
                                                    (tipificacoes) =>
                                                      tipificacoes.map(
                                                        (item, index) =>
                                                          index !==
                                                          tipificacaoIndex
                                                            ? item
                                                            : {
                                                                ...item,
                                                                descricao:
                                                                  item.catalogoId
                                                                    ? montarDescricaoAutomaticaTipificacao(
                                                                        atosCatalogoCache.find(
                                                                          (
                                                                            ato,
                                                                          ) =>
                                                                            ato.id ===
                                                                            item.catalogoId,
                                                                        )?.nome ??
                                                                          item.descricao,
                                                                        e.target
                                                                          .value as CasoTipificacaoFormState["naturezaExecucao"],
                                                                      )
                                                                    : item.descricao,
                                                                naturezaExecucao:
                                                                  e.target
                                                                    .value as CasoTipificacaoFormState["naturezaExecucao"],
                                                              },
                                                      ),
                                                  )
                                                }
                                                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                              >
                                                {NATUREZA_EXECUCAO_OPCOES.map(
                                                  (opcao) => (
                                                    <option
                                                      key={
                                                        opcao.value || "vazio"
                                                      }
                                                      value={opcao.value}
                                                    >
                                                      {opcao.label}
                                                    </option>
                                                  ),
                                                )}
                                              </select>
                                            </div>

                                            <div className="md:col-span-2">
                                              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                                                Descricao manual
                                              </label>
                                              <input
                                                type="text"
                                                value={tipificacao.descricao}
                                                onChange={(e) =>
                                                  atualizarTipificacoesCasoHistorico(
                                                    casoIndex,
                                                    (tipificacoes) =>
                                                      tipificacoes.map(
                                                        (item, index) =>
                                                          index !==
                                                          tipificacaoIndex
                                                            ? item
                                                            : {
                                                                ...item,
                                                                descricao:
                                                                  e.target
                                                                    .value,
                                                              },
                                                      ),
                                                  )
                                                }
                                                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                                placeholder="Opcional quando houver ato no catalogo"
                                              />
                                            </div>

                                            <div className="md:col-span-2">
                                              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                                                Qualificadora
                                              </label>
                                              <input
                                                type="text"
                                                value={
                                                  tipificacao.qualificadora
                                                }
                                                onChange={(e) =>
                                                  atualizarTipificacoesCasoHistorico(
                                                    casoIndex,
                                                    (tipificacoes) =>
                                                      tipificacoes.map(
                                                        (item, index) =>
                                                          index !==
                                                          tipificacaoIndex
                                                            ? item
                                                            : {
                                                                ...item,
                                                                qualificadora:
                                                                  e.target
                                                                    .value,
                                                              },
                                                      ),
                                                  )
                                                }
                                                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                                placeholder="Ex.: concurso de pessoas"
                                              />
                                            </div>

                                            <div className="md:col-span-2">
                                              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                                                Majorante
                                              </label>
                                              <input
                                                type="text"
                                                value={tipificacao.majorante}
                                                onChange={(e) =>
                                                  atualizarTipificacoesCasoHistorico(
                                                    casoIndex,
                                                    (tipificacoes) =>
                                                      tipificacoes.map(
                                                        (item, index) =>
                                                          index !==
                                                          tipificacaoIndex
                                                            ? item
                                                            : {
                                                                ...item,
                                                                majorante:
                                                                  e.target
                                                                    .value,
                                                              },
                                                      ),
                                                  )
                                                }
                                                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                                placeholder="Ex.: emprego de arma"
                                              />
                                            </div>

                                            <div className="md:col-span-6">
                                              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                                                Observacoes da tipificação
                                              </label>
                                              <textarea
                                                value={tipificacao.observacoes}
                                                onChange={(e) =>
                                                  atualizarTipificacoesCasoHistorico(
                                                    casoIndex,
                                                    (tipificacoes) =>
                                                      tipificacoes.map(
                                                        (item, index) =>
                                                          index !==
                                                          tipificacaoIndex
                                                            ? item
                                                            : {
                                                                ...item,
                                                                observacoes:
                                                                  e.target
                                                                    .value,
                                                              },
                                                      ),
                                                  )
                                                }
                                                rows={2}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                                                placeholder="Detalhes complementares da tipificação"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </>
                              ) : null}
                            </>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ETAPA 3: Vinculacoes */}
          {etapaAtual === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Users className="text-indigo-600" />
                Vinculações
              </h2>

              {alertasFaccaoPorTatuagem.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Possível vínculo faccional
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-800">
                    {alertasFaccaoPorTatuagem.map((item, index) => (
                      <li key={`${item.tatuagem}-${item.faccao}-${index}`}>
                        Possível vínculo faccional, já que o adolescente tem a
                        tatuagem {item.tatuagem}, que normalmente é vinculada à
                        facção {item.faccao}.
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!faccaoSomenteHistorico && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-semibold text-gray-700">
                        Faccao / Grupo
                      </label>
                      <button
                        type="button"
                        onClick={abrirModalNovaFaccao}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                      >
                        + Nova faccao
                      </button>
                    </div>
                    <select
                      value={vinculacoes.faccaoId}
                      onChange={(e) => {
                        const novoValor = e.target.value;
                        setVinculacoes((prev) => ({
                          ...prev,
                          faccaoId: novoValor,
                          faccaoFuncao: novoValor ? prev.faccaoFuncao : "",
                          faccaoOrigem: novoValor ? prev.faccaoOrigem : "",
                          faccaoOrigemDetalhe: novoValor
                            ? prev.faccaoOrigemDetalhe
                            : "",
                        }));
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    >
                      {faccoesDisponiveis.map((faccao) => (
                        <option
                          key={faccao.id || "sem-faccao"}
                          value={faccao.id}
                        >
                          {faccao.nome}
                          {typeof faccao.total === "number"
                            ? ` - ${faccao.total} adolescentes`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!faccaoSomenteHistorico && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Funcao dentro da organizacao
                    </label>
                    <input
                      type="text"
                      value={vinculacoes.faccaoFuncao}
                      onChange={(e) =>
                        setVinculacoes({
                          ...vinculacoes,
                          faccaoFuncao: e.target.value,
                        })
                      }
                      disabled={!temFaccaoSelecionada}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder="Ex: Vigia, recrutador, sem funcao definida"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Se conhecido, informe o papel desempenhado pelo
                      adolescente dentro da faccao.
                    </p>
                  </div>
                )}

                {faccaoSomenteHistorico && (
                  <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          Facção / Grupo (somente leitura)
                        </p>
                        <p className="text-xs text-slate-500">
                          Alterações devem ser feitas via “Nova declaração”.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={abrirModalNovaFaccao}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                      >
                        + Nova facção
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                      <div>
                        <span className="text-xs uppercase text-slate-500">
                          Facção atual
                        </span>
                        <p className="font-semibold">{faccaoAtualNome}</p>
                      </div>
                      <div>
                        <span className="text-xs uppercase text-slate-500">
                          Origem
                        </span>
                        <p className="font-semibold">
                          {faccaoAtualOrigem || "NAO INFORMADO"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs uppercase text-slate-500">
                          Função
                        </span>
                        <p className="font-semibold">
                          {faccaoAtualFuncao || "Nao informada"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs uppercase text-slate-500">
                          Observação
                        </span>
                        <p className="font-semibold">
                          {faccaoAtualObs || "Sem observações"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {initialData?.id && (
                  <div className="md:col-span-2 rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          Histórico de facção
                        </p>
                        <p className="text-xs text-slate-500">
                          A declaração atual fica ativa; anteriores permanecem
                          registradas.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={abrirModalDeclaracaoFaccao}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        Nova declaração
                      </button>
                    </div>
                    <div className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
                      {faccaoHistorico.length === 0 && (
                        <p className="text-xs text-slate-500">
                          Nenhuma declaração registrada.
                        </p>
                      )}
                      {faccaoHistorico.map((h) => (
                        <div
                          key={h.id}
                          className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              {h.faccaoNome || "Sem facção / não informado"}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-[2px] text-[10px] font-semibold uppercase text-slate-600">
                              {h.statusRegistro}
                            </span>
                            {h.nivelConfianca && (
                              <span className="rounded-full bg-indigo-50 px-2 py-[2px] text-[10px] font-semibold uppercase text-indigo-700">
                                Confiança: {h.nivelConfianca}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500">
                              Origem: {h.origemInformacao}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {h.criadoEm}
                            </span>
                          </div>
                          {h.funcao && (
                            <p className="mt-1 text-[11px] text-slate-600">
                              Função: {h.funcao}
                            </p>
                          )}
                          {h.observacao && (
                            <p className="mt-1 text-[11px] text-slate-600">
                              Obs: {h.observacao}
                            </p>
                          )}
                          {h.origemInformacao === "OUTRO_INTERNO" && (
                            <p className="mt-1 text-[11px] text-slate-600">
                              Informante:{" "}
                              {isAdmin
                                ? h.informante?.nome
                                  ? `${h.informante.nome}${
                                      h.informante.numeroSms
                                        ? ` (SMS ${h.informante.numeroSms})`
                                        : ""
                                    }`
                                  : "Não informado"
                                : "Acesso restrito"}
                            </p>
                          )}
                          {h.criadoPor && (
                            <p className="mt-1 text-[10px] text-slate-500">
                              Registrado por {h.criadoPor.nome}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!faccaoSomenteHistorico && (
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Origem da informacao sobre a faccao
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Nao informado", value: "" },
                        {
                          label: "Confessada pelo adolescente",
                          value: "CONFESSADA",
                        },
                        {
                          label: "Observacao/Inteligencia",
                          value: "OBSERVACAO",
                        },
                      ].map((opcao) => {
                        const ativo = vinculacoes.faccaoOrigem === opcao.value;
                        return (
                          <button
                            key={opcao.value || "sem-origem"}
                            type="button"
                            disabled={!temFaccaoSelecionada}
                            onClick={() =>
                              setVinculacoes((prev) => ({
                                ...prev,
                                faccaoOrigem: opcao.value as
                                  | ""
                                  | "CONFESSADA"
                                  | "OBSERVACAO",
                                faccaoOrigemDetalhe:
                                  opcao.value === "OBSERVACAO"
                                    ? prev.faccaoOrigemDetalhe
                                    : "",
                              }))
                            }
                            className={`px-4 py-2 rounded-full border text-xs font-semibold transition ${
                              ativo
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                            } ${!temFaccaoSelecionada ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            {opcao.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500">
                      {temFaccaoSelecionada
                        ? "Registre se o vinculo foi relatado pelo adolescente ou identificado pela equipe."
                        : "Campos de origem ficam habilitados ao selecionar uma faccao."}
                    </p>
                    {temFaccaoSelecionada &&
                      vinculacoes.faccaoOrigem === "OBSERVACAO" && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Descreva como essa informacao foi obtida
                          </label>
                          <textarea
                            value={vinculacoes.faccaoOrigemDetalhe}
                            onChange={(e) =>
                              setVinculacoes({
                                ...vinculacoes,
                                faccaoOrigemDetalhe: e.target.value,
                              })
                            }
                            rows={3}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm"
                            placeholder="Ex: Confirmado por registro de inteligencia, relato de tecnico, observacao de tatuagem..."
                          />
                        </div>
                      )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bairro de Origem
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={bairroBusca}
                      onFocus={() => setMostrarSugestoesBairro(true)}
                      onChange={(e) => {
                        setBairroBusca(e.target.value);
                        setVinculacoes({
                          ...vinculacoes,
                          bairroId: "",
                        });
                        setMostrarSugestoesBairro(true);
                      }}
                      onBlur={() =>
                        window.setTimeout(
                          () => setMostrarSugestoesBairro(false),
                          120,
                        )
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                      placeholder="Digite para buscar bairro ou cidade"
                    />
                    {mostrarSugestoesBairro &&
                      (bairroSugestoes.length > 0 ||
                        bairroBusca.trim().length >= 2) && (
                        <div className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                          {bairroSugestoes.length === 0 && (
                            <p className="px-3 py-2 text-sm text-slate-500">
                              Nenhum bairro encontrado para o termo informado.
                            </p>
                          )}
                          {bairroSugestoes.map((bairro) => (
                            <button
                              key={bairro.id}
                              type="button"
                              onMouseDown={() => {
                                setVinculacoes({
                                  ...vinculacoes,
                                  bairroId: bairro.id,
                                });
                                const sufixoEstado = bairro.estado
                                  ? ` - ${bairro.estado}`
                                  : "";
                                setBairroBusca(
                                  `${bairro.nomeBairro} - ${bairro.cidade}${sufixoEstado}`,
                                );
                                setMostrarSugestoesBairro(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-indigo-50"
                            >
                              <span className="font-semibold text-slate-800">
                                {bairro.nomeBairro}
                              </span>
                              <span className="ml-2 text-xs text-slate-500">
                                {bairro.cidade}
                                {bairro.estado ? ` - ${bairro.estado}` : ""}
                              </span>
                            </button>
                          ))}
                          <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
                            <button
                              type="button"
                              onMouseDown={abrirModalNovoBairro}
                              className="text-sm font-semibold text-indigo-700 hover:text-indigo-600"
                            >
                              Novo endereço
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Comece a digitar para filtrar. Se nao encontrar, registre
                    como novo endereco.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Risco de Fuga
                  </label>
                  <select
                    value={vinculacoes.riscoFuga}
                    onChange={(e) =>
                      setVinculacoes({
                        ...vinculacoes,
                        riscoFuga: e.target.value as RiscoFuga,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  >
                    <option value="BAIXO">Baixo</option>
                    <option value="MEDIO">Medio</option>
                    <option value="ALTO">Alto</option>
                  </select>
                  {ehEdicao && riscoFugaOrigemInfo && (
                    <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                      <p className="font-semibold text-rose-800">
                        Elevado automaticamente
                      </p>
                      <p className="mt-1">
                        {riscoFugaOrigemInfo.descricao ??
                          "Risco ajustado automaticamente devido a comunicados ou alertas de fuga."}
                      </p>
                      {riscoFugaOrigemInfo.registradoEm && (
                        <p className="mt-1 text-[11px] text-rose-600">
                          Registrado em{" "}
                          {new Date(
                            riscoFugaOrigemInfo.registradoEm,
                          ).toLocaleString("pt-BR")}
                        </p>
                      )}
                      {riscoFugaOrigemInfo.referenciaTipo && (
                        <p className="mt-1 text-[11px] text-rose-600">
                          Origem:{" "}
                          {riscoFugaOrigemInfo.referenciaTipo === "CI"
                            ? "Comunicado Interno"
                            : riscoFugaOrigemInfo.referenciaTipo === "ALERTA"
                              ? "Alerta interno"
                              : riscoFugaOrigemInfo.referenciaTipo}
                        </p>
                      )}
                      {riscoFugaOrigemInfo.referenciaTipo === "CI" &&
                        riscoFugaOrigemInfo.referenciaId && (
                          <a
                            href={`/comunicados/${riscoFugaOrigemInfo.referenciaId}`}
                            className="mt-2 inline-flex text-[11px] font-semibold text-rose-800 underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir CI relacionado
                          </a>
                        )}
                      {riscoFugaOrigemInfo.referenciaTipo === "ALERTA" && (
                        <p className="mt-1 text-[11px] text-rose-600">
                          Origem: alerta de fuga registrado na central.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Tecnicos de referencia
                  </label>
                  <div className="space-y-3 rounded-xl border-2 border-gray-200 p-3 bg-white">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <input
                        type="text"
                        value={buscaTecnico}
                        onChange={(e) => setBuscaTecnico(e.target.value)}
                        placeholder="Buscar por nome, email ou atividade..."
                        className="w-full sm:w-2/3 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                        disabled={carregandoTecnicos}
                      />
                      <p className="text-xs text-gray-500">
                        Clique para adicionar; clique no chip para remover.
                      </p>
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-2">
                      {carregandoTecnicos ? (
                        <p className="text-sm text-gray-500">
                          Carregando tecnicos...
                        </p>
                      ) : tecnicosFiltrados.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Nenhum tecnico encontrado para a busca.
                        </p>
                      ) : (
                        tecnicosFiltrados.map((tecnico) => {
                          const selecionado = tecnicosReferenciaIds.includes(
                            tecnico.id,
                          );
                          return (
                            <button
                              type="button"
                              key={tecnico.id}
                              onClick={() => {
                                setTecnicosReferenciaIds((prev) =>
                                  selecionado
                                    ? prev.filter((id) => id !== tecnico.id)
                                    : [...prev, tecnico.id],
                                );
                              }}
                              className={`w-full text-left rounded-lg border-2 px-3 py-2 transition ${
                                selecionado
                                  ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                                  : "border-gray-200 hover:border-indigo-200"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-semibold">
                                    {tecnico.nome}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {tecnico.atividade || "Atividade n/d"}
                                  </p>
                                  <p className="text-[11px] text-gray-500 font-mono">
                                    {tecnico.email}
                                  </p>
                                </div>
                                {selecionado && (
                                  <span className="text-[11px] font-semibold text-indigo-700">
                                    Selecionado
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {tecnicosReferenciaIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tecnicosReferenciaIds
                          .map((id) =>
                            tecnicosDisponiveis.find((t) => t.id === id),
                          )
                          .filter(Boolean)
                          .map((tec) => (
                            <button
                              key={tec!.id}
                              type="button"
                              onClick={() =>
                                setTecnicosReferenciaIds((prev) =>
                                  prev.filter((id) => id !== tec!.id),
                                )
                              }
                              className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-200 hover:bg-indigo-200"
                            >
                              {tec!.nome}
                              <span className="text-indigo-500">×</span>
                            </button>
                          ))}
                      </div>
                    )}
                    {erroTecnicos && (
                      <p className="text-xs text-red-600 mt-1">
                        {erroTecnicos}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* ETAPA 4: Alojamento */}
          {etapaAtual === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Bed className="text-indigo-600" />
                Alojamento
              </h2>
              {!podeAlterarAlojamento && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Seu perfil permite apenas visualizar alojamentos. Alteracoes
                  estao bloqueadas.
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Tipo de internacao
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      label: "Provisoria",
                      value: "PROVISORIA" as TipoInternacao,
                      dica: "Usa as casas configuradas para internação provisória",
                    },
                    {
                      label: "Definitiva",
                      value: "DEFINITIVA" as TipoInternacao,
                      dica: "Usa casas definitivas e, se compativel, casa exclusiva de fase",
                    },
                  ].map((opcao) => {
                    const ativo = tipoInternacao === opcao.value;
                    return (
                      <button
                        key={opcao.value}
                        type="button"
                        onClick={() => setTipoInternacao(opcao.value)}
                        className={`flex-1 min-w-[140px] rounded-xl border px-4 py-2 text-left text-sm transition ${
                          ativo
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        } ${
                          statusUnidade !== "ATIVO" || !podeGerarSugestoes
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        disabled={
                          statusUnidade !== "ATIVO" || !podeGerarSugestoes
                        }
                      >
                        <span className="block font-semibold">
                          {opcao.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {opcao.dica}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!tipoInternacao && (
                  <p className="mt-1 text-xs text-slate-500">
                    Escolha o tipo de internacao para aplicar as regras de
                    sugestao automaticamente.
                  </p>
                )}
              </div>

              {tipoInternacao === "DEFINITIVA" && (
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-700">
                    Casa de preferencia (opcional)
                  </label>
                  <select
                    value={casaPreferenciaId}
                    onChange={(event) => {
                      setCasaPreferenciaId(event.target.value);
                      setDiagnosticoCasa(null);
                      setDiagnosticoErro(null);
                      setDiagnosticoAberto(false);
                    }}
                    className="mt-1 w-full rounded-lg border-2 border-gray-300 px-4 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    disabled={!podeGerarSugestoes}
                  >
                    <option value="">Sem preferencia</option>
                    {casasCompativeisTipoInternacao.map((casa) => (
                      <option key={casa.id} value={casa.id}>
                        {casa.nome} (Casa {String(casa.numero).padStart(2, "0")}
                        ) - {obterEtiquetaCasaOperacional(casa)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Se informado, as sugestoes serao filtradas para uma casa
                    compativel com a configuracao operacional atual.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mb-2">
                <label className="text-sm font-semibold text-gray-700">
                  Alojamento preferencial
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!vinculacoes.bairroId && !vinculacoes.faccaoId) {
                      setErroSugestoes(
                        "Informe bairro ou faccao antes de gerar sugestoes.",
                      );
                      return;
                    }
                    buscarSugestoesAlojamento();
                  }}
                  className="rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                  disabled={
                    carregandoSugestoes ||
                    !tipoInternacao ||
                    !podeGerarSugestoes
                  }
                >
                  {carregandoSugestoes
                    ? "Sugerindo..."
                    : "Sugerir com base no risco"}
                </button>
                {!vinculacoes.bairroId && !vinculacoes.faccaoId && (
                  <span className="text-[11px] text-slate-500">
                    Informe bairro ou faccao para liberar as sugestoes.
                  </span>
                )}
              </div>

              {erroSugestoes && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-rose-600">
                  <span>{erroSugestoes}</span>
                  {erroSugestoes ===
                    "Nenhum alojamento recomendado para a casa selecionada." &&
                    casaPreferenciaId && (
                      <button
                        type="button"
                        onClick={abrirDiagnosticoCasa}
                        className="text-indigo-600 hover:text-indigo-700 font-semibold underline decoration-dotted"
                        disabled={diagnosticoLoading}
                      >
                        {diagnosticoLoading
                          ? "Carregando motivos..."
                          : "Ver motivos técnicos"}
                      </button>
                    )}
                  {diagnosticoErro && (
                    <span className="text-rose-500">{diagnosticoErro}</span>
                  )}
                </div>
              )}
              {avisoSugestoes && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {avisoSugestoes}
                </div>
              )}

              {sugestoesAlojamento.length > 0 && (
                <div className="mt-3 space-y-2">
                  {sugestoesAlojamento.map((sugestao) => (
                    <div
                      key={sugestao.alojamentoId}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {sugestao.casaNome} - Aloj. {sugestao.numero}
                            {sugestao.ala ? ` (Ala ${sugestao.ala})` : ""}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {sugestao.rotulo}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAlojamentoSelecionado(sugestao.alojamentoId)
                          }
                          disabled={!podeSelecionarAlojamento}
                          className="rounded-full border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Usar
                        </button>
                      </div>
                      <p className="mt-1">{sugestao.descricao}</p>
                      {sugestao.alertas.length > 0 && (
                        <ul className="mt-1 list-disc pl-4 text-rose-600 space-y-0.5">
                          {sugestao.alertas.map((alerta, index) => (
                            <li
                              key={`alerta-${sugestao.alojamentoId}-${index}`}
                            >
                              {alerta}
                            </li>
                          ))}
                        </ul>
                      )}
                      {sugestao.ambientais.length > 0 && (
                        <ul className="mt-1 list-disc pl-4 text-amber-600 space-y-0.5">
                          {sugestao.ambientais.map((motivo, index) => (
                            <li
                              key={`ambiental-${sugestao.alojamentoId}-${index}`}
                            >
                              {motivo}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500">
                Selecione o alojamento atual do adolescente ou escolha o destino
                para alocacao automatica.
              </p>
              <select
                value={alojamentoSelecionado ?? ""}
                onChange={(e) => {
                  if (statusUnidade !== "ATIVO") return;
                  setAlojamentoSelecionado(
                    e.target.value ? e.target.value : null,
                  );
                }}
                disabled={
                  statusUnidade !== "ATIVO" || !podeSelecionarAlojamento
                }
                className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all ${
                  statusUnidade === "ATIVO"
                    ? "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    : "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                }`}
              >
                <option value="">Nenhum (sem alocacao automatica)</option>
                {alojamentosLivres.map((aloj) => (
                  <option key={aloj.id} value={aloj.id}>
                    {aloj.casa} - Aloj. {aloj.numero}
                    {aloj.ala ? ` (Ala ${aloj.ala})` : ""}
                    {aloj.atual ? " (Atual)" : ""}
                  </option>
                ))}
              </select>

              <p className="text-xs text-gray-500 mt-2">
                A selecao sera usada para acionar /api/alocar automaticamente
                apos salvar.
              </p>
            </div>
          )}
          {/* ETAPA 5: Tatuagens */}
          {etapaAtual === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Camera className="text-indigo-600" />
                Tatuagens
              </h2>

              <SeletorTatuagens tatuagens={tatuagens} onChange={setTatuagens} />
            </div>
          )}
          {/* ETAPA 6: Alertas */}
          {etapaAtual === 6 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <AlertTriangle className="text-indigo-600" />
                Alertas Especiais
              </h2>

              {Array.isArray(initialData?.alertasAtivos) &&
                initialData.alertasAtivos.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-700 mb-3">
                      Alertas ativos registrados
                    </p>
                    <div className="space-y-2">
                      {initialData.alertasAtivos.map((alerta) => (
                        <div
                          key={alerta.id}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                              {alerta.tipo ?? "Alerta"}
                            </span>
                            {alerta.nivelRisco && (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">
                                {alerta.nivelRisco}
                              </span>
                            )}
                            {alerta.criadoEm && (
                              <span className="text-[10px] text-slate-500">
                                {new Date(alerta.criadoEm).toLocaleDateString(
                                  "pt-BR",
                                )}
                              </span>
                            )}
                          </div>
                          {alerta.descricao && (
                            <p className="mt-2 text-xs text-slate-600">
                              {alerta.descricao}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {atoInfracional.gravidade && (
                <div className="rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-orange-500 mt-1" />
                    <div className="space-y-1">
                      <p className="font-semibold text-orange-900">
                        Ato atual marcado como grave ou com repercussao
                      </p>
                      {(atoInfracional.processo || atoInfracional.ano) && (
                        <p className="text-sm text-orange-800">
                          {atoInfracional.processo && (
                            <span>
                              Processo: {atoInfracional.processo}
                              {atoInfracional.ano ? " â€¢ " : ""}
                            </span>
                          )}
                          {atoInfracional.ano && (
                            <span>Ano: {atoInfracional.ano}</span>
                          )}
                        </p>
                      )}
                      <p className="text-sm text-orange-800">
                        {atoInfracional.gravidadeDescricao.trim() ||
                          "Detalhe a gravidade na etapa anterior para registrar no dossie e nos relatorios operacionais."}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-orange-700">
                    Considere ativar alertas de perfil protegido ou emitir
                    comunicados internos quando necessario.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ALERTAS_ESPECIAIS_ORDEM.map((tipo) => {
                  const info = ALERTAS_ESPECIAIS_UI[tipo];
                  const estado = alertasEspeciais[tipo];
                  const Icone = info.Icone;
                  const inputId = `alerta-${tipo.toLowerCase()}`;
                  return (
                    <div
                      key={tipo}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 ${info.corClasse} ${
                        info.fullWidth ? "md:col-span-2" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={inputId}
                        checked={estado?.ativo ?? false}
                        onChange={(e) =>
                          handleToggleAlertaEspecial(tipo, e.target.checked)
                        }
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={inputId}
                          className="flex items-center gap-2 font-semibold text-gray-900 cursor-pointer"
                        >
                          <Icone className="h-5 w-5 opacity-80" />
                          {info.titulo}
                        </label>
                        <p className="text-sm text-gray-700 mt-1">
                          {info.descricao}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {info.destaque}
                        </p>
                        {estado?.ativo ? (
                          <div className="mt-3 space-y-2">
                            {estado.descricao ? (
                              <div className="rounded-lg bg-white/80 border border-gray-200 p-3 text-sm text-gray-700">
                                <p className="font-semibold text-gray-900">
                                  Descricao registrada
                                </p>
                                <p>{estado.descricao}</p>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600">
                                Nenhuma descricao adicional registrada.
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => abrirModalAlertaEspecial(tipo)}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              <FileText size={14} />
                              Atualizar detalhes
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => abrirModalAlertaEspecial(tipo)}
                            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            <FileText size={12} />
                            Registrar detalhes antes de confirmar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}{" "}
          {/* Botoes de Navegacao */}
          <div className="mt-8 pt-6 border-t-2 border-gray-200 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={etapaAnterior}
              disabled={etapaAtual === 1}
              className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft size={20} />
              Anterior
            </button>

            <div className="text-sm text-gray-600 font-semibold text-center">
              Etapa {etapaAtual} de {etapas.length}
            </div>

            {etapaAtual < 5 ? (
              <button
                type="button"
                onClick={proximaEtapa}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                Proxima
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSalvar}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    {textoBotaoSalvar}
                  </>
                )}
              </button>
            )}
          </div>
          {/* Botao Cancelar */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleCancelar}
              className="text-gray-600 hover:text-gray-800 text-sm font-semibold"
            >
              {textoCancelarAcao}
            </button>
          </div>
        </div>
      </div>
      {diagnosticoAberto && diagnosticoCasa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-indigo-500">
                  Diagnostico tecnico • {diagnosticoCasa.casaNome}
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  Motivos detalhados para a casa selecionada
                </h3>
              </div>
              <button
                onClick={() => setDiagnosticoAberto(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar diagnostico"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-5 py-4 space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                  Total: {diagnosticoCasa.totalAlojamentos}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                  Livres: {diagnosticoCasa.livres}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                  Ocupados: {diagnosticoCasa.ocupados}
                </span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                  Interditados: {diagnosticoCasa.interditados}
                </span>
                {diagnosticoCasa.exigeVigilanciaFrontal && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                    Protocolo suicidio ativo
                  </span>
                )}
                {diagnosticoCasa.bloqueadosVigilancia > 0 && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                    Bloqueados por vigilancia:{" "}
                    {diagnosticoCasa.bloqueadosVigilancia}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {diagnosticoCasa.alojamentos.map((alojamento) => {
                  const statusLabel =
                    alojamento.status === "LIVRE"
                      ? "Livre"
                      : alojamento.status === "OCUPADO"
                        ? "Ocupado"
                        : alojamento.status === "INTERDITADO"
                          ? "Interditado"
                          : "Sem vigilancia frontal";
                  const statusClass =
                    alojamento.status === "LIVRE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : alojamento.status === "OCUPADO"
                        ? "bg-slate-50 text-slate-600 border-slate-200"
                        : alojamento.status === "INTERDITADO"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <div
                      key={alojamento.id}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900">
                          Aloj. {alojamento.numero}
                          {alojamento.ala ? ` • Ala ${alojamento.ala}` : ""}
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {alojamento.status === "OCUPADO" &&
                        alojamento.ocupantes?.length && (
                          <p className="mt-2 text-xs text-slate-600">
                            Ocupado por:{" "}
                            {alojamento.ocupantes
                              .map((oc) =>
                                oc.numeroSms
                                  ? `${oc.nome} (SMS ${oc.numeroSms})`
                                  : oc.nome,
                              )
                              .join(", ")}
                          </p>
                        )}

                      {alojamento.status !== "LIVRE" &&
                        alojamento.motivos?.length && (
                          <ul className="mt-2 list-disc pl-5 text-xs text-slate-600 space-y-1">
                            {alojamento.motivos.map((motivo, idx) => (
                              <li key={`${alojamento.id}-motivo-${idx}`}>
                                {motivo}
                              </li>
                            ))}
                          </ul>
                        )}

                      {alojamento.status === "LIVRE" && alojamento.risco && (
                        <div className="mt-2 space-y-2">
                          <div className="text-xs text-slate-700">
                            <span className="font-semibold">Risco:</span>{" "}
                            {alojamento.risco.rotulo} • Nível{" "}
                            {alojamento.risco.nivel}
                          </div>
                          <p className="text-xs text-slate-500">
                            {alojamento.risco.descricao}
                          </p>
                          {alojamento.risco.alertas.length > 0 && (
                            <ul className="list-disc pl-5 text-xs text-rose-600 space-y-1">
                              {alojamento.risco.alertas.map((alerta, idx) => (
                                <li key={`${alojamento.id}-alerta-${idx}`}>
                                  {alerta}
                                </li>
                              ))}
                            </ul>
                          )}
                          {alojamento.risco.ambientais.length > 0 && (
                            <ul className="list-disc pl-5 text-xs text-amber-600 space-y-1">
                              {alojamento.risco.ambientais.map(
                                (alerta, idx) => (
                                  <li key={`${alojamento.id}-ambiental-${idx}`}>
                                    {alerta}
                                  </li>
                                ),
                              )}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {modalAlertaEspecial.aberto && modalAlertaEspecial.tipo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            {(() => {
              const tipo = modalAlertaEspecial.tipo as AlertaEspecialTipo;
              const info = ALERTAS_ESPECIAIS_UI[tipo];
              const meta = ALERTAS_ESPECIAIS[tipo];
              return (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <info.Icone className="h-6 w-6 text-indigo-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {info.titulo}
                      </h3>
                      <p className="text-sm text-slate-600">{info.descricao}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">
                        Orientacao:
                      </p>
                      <p>{info.destaque}</p>
                    </div>

                    <label className="block text-sm font-semibold text-gray-700">
                      Descricao adicional (opcional)
                    </label>
                    <textarea
                      value={modalAlertaEspecial.descricao}
                      onChange={(event) =>
                        setModalAlertaEspecial((prev) => ({
                          ...prev,
                          descricao: event.target.value,
                        }))
                      }
                      rows={4}
                      placeholder={meta.descricaoPadrao}
                      className="w-full resize-none rounded-lg border-2 border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                    <p className="text-xs text-gray-500">
                      Esta informacao abastece automaticamente o modulo de
                      alertas e o mapa de estrutura. Pode ser atualizada a
                      qualquer momento.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={fecharModalAlertaEspecial}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmarModalAlertaEspecial}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                      Confirmar e ativar alerta
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      {modalNovoAto.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Cadastrar novo ato infracional
            </h3>
            <p className="text-sm text-slate-500">
              Utilize este cadastro para manter o catalogo padronizado.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Nome do ato infracional
                </label>
                <input
                  type="text"
                  value={modalNovoAto.nome}
                  onChange={(event) =>
                    setModalNovoAto((prev) => ({
                      ...prev,
                      nome: event.target.value,
                      erro: null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: Roubo qualificado (art. 157, paragrafo 2)"
                />
              </div>
              {modalNovoAto.erro && (
                <p className="text-sm text-rose-600">{modalNovoAto.erro}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Gravidade (catálogo)
              </label>
              <select
                value={modalNovoAto.gravidade}
                onChange={(event) =>
                  setModalNovoAto((prev) => ({
                    ...prev,
                    gravidade: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Selecione</option>
                <option value="LEVE">Leve</option>
                <option value="MEDIO">Medio</option>
                <option value="GRAVE">Grave</option>
                <option value="HEDIONDO">Hediondo</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="novo-ato-violencia"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={modalNovoAto.violenciaOuGraveAmeaca}
                onChange={(event) =>
                  setModalNovoAto((prev) => ({
                    ...prev,
                    violenciaOuGraveAmeaca: event.target.checked,
                  }))
                }
              />
              <label
                htmlFor="novo-ato-violencia"
                className="text-sm font-semibold text-slate-700"
              >
                Violencia ou grave ameaca
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharModalNovoAto}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={modalNovoAto.salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarNovoAto}
                disabled={modalNovoAto.salvando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {modalNovoAto.salvando ? "Salvando..." : "Salvar ato"}
              </button>
            </div>
          </div>
        </div>
      )}
      {gestaoAtos.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Gerenciar atos infracionais
                </h3>
                <p className="text-sm text-slate-500">
                  Edite nome, gravidade, violência/grave ameaça ou
                  ative/desative sem sair do cadastro.
                </p>
              </div>
              <button
                type="button"
                onClick={fecharGestaoAtos}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                type="text"
                value={gestaoAtos.busca}
                onChange={(e) => {
                  const v = e.target.value;
                  setGestaoAtos((prev) => ({ ...prev, busca: v }));
                  carregarGestaoAtos(v);
                }}
                placeholder="Buscar por nome"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => carregarGestaoAtos(gestaoAtos.busca)}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Atualizar
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-auto rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">
                      Nome
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">
                      Gravidade
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">
                      Violência?
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">
                      Ativo
                    </th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gestaoAtos.carregando && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-4 text-center text-slate-500"
                      >
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!gestaoAtos.carregando && gestaoAtos.itens.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-4 text-center text-slate-500"
                      >
                        Nenhum ato encontrado.
                      </td>
                    </tr>
                  )}
                  {gestaoAtosOrdenados.map((item) => (
                    <tr
                      key={item.id}
                      className={!item.ativo ? "bg-amber-50" : ""}
                    >
                      <td className="px-3 py-2 align-top">
                        <input
                          value={item.nome}
                          onChange={(e) =>
                            atualizarCampoGestao(
                              item.id,
                              "nome",
                              e.target.value,
                            )
                          }
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <select
                          value={item.gravidade ?? ""}
                          onChange={(e) =>
                            atualizarCampoGestao(
                              item.id,
                              "gravidade",
                              e.target.value || null,
                            )
                          }
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                        >
                          <option value="">-</option>
                          <option value="LEVE">Leve</option>
                          <option value="MEDIO">Medio</option>
                          <option value="GRAVE">Grave</option>
                          <option value="HEDIONDO">Hediondo</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={!!item.violenciaOuGraveAmeaca}
                            onChange={(e) =>
                              atualizarCampoGestao(
                                item.id,
                                "violenciaOuGraveAmeaca",
                                e.target.checked,
                              )
                            }
                          />
                          Sim
                        </label>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={item.ativo}
                            onChange={(e) =>
                              atualizarCampoGestao(
                                item.id,
                                "ativo",
                                e.target.checked,
                              )
                            }
                          />
                          Ativo
                        </label>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => salvarGestaoAto(item.id)}
                            disabled={
                              gestaoAtos.salvandoId === item.id ||
                              gestaoAtos.excluindoId === item.id
                            }
                            className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                          >
                            {gestaoAtos.salvandoId === item.id
                              ? "Salvando..."
                              : "Salvar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => excluirGestaoAto(item.id)}
                            disabled={
                              gestaoAtos.salvandoId === item.id ||
                              gestaoAtos.excluindoId === item.id
                            }
                            className="rounded border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                          >
                            {gestaoAtos.excluindoId === item.id
                              ? "Excluindo..."
                              : "Excluir"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {gestaoAtos.erro && (
              <p className="mt-3 text-sm text-rose-600">{gestaoAtos.erro}</p>
            )}
            {gestaoAtos.bloqueioExclusao && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  O ato "{gestaoAtos.bloqueioExclusao.atoNome}" nao pode ser
                  excluido porque esta vinculado aos adolescentes abaixo:
                </p>
                <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-amber-100 bg-white">
                  <ul className="divide-y divide-amber-100 text-sm text-slate-700">
                    {gestaoAtos.bloqueioExclusao.adolescentes.map(
                      (adolescente) => (
                        <li
                          key={adolescente.id}
                          className="flex items-center justify-between gap-3 px-3 py-2"
                        >
                          <span className="font-medium text-slate-800">
                            {adolescente.nomeCompleto}
                          </span>
                          <span className="text-xs uppercase tracking-wide text-slate-500">
                            {adolescente.statusUnidade ?? "Sem status"}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {modalNovoBairro.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Cadastrar novo bairro
            </h3>
            <p className="text-sm text-slate-500">
              Preencha os dados abaixo para inserir um novo bairro no catalogo.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Nome do bairro
                </label>
                <input
                  type="text"
                  value={modalNovoBairro.nome}
                  onChange={(event) =>
                    setModalNovoBairro((prev) => ({
                      ...prev,
                      nome: event.target.value,
                      erro: null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: Zona 7"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Cidade
                </label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={modalNovoBairro.cidadeId}
                    onChange={(event) =>
                      setModalNovoBairro((prev) => ({
                        ...prev,
                        cidadeId: event.target.value,
                        erro: null,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Selecione a cidade</option>
                    {referencias.cidades.map((cidade) => (
                      <option key={cidade.id} value={cidade.id}>
                        {cidade.nome} - {cidade.estado}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={abrirModalNovaCidade}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Nova cidade
                  </button>
                </div>
              </div>
              {modalNovoBairro.erro && (
                <p className="text-sm text-rose-600">{modalNovoBairro.erro}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharModalNovoBairro}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={modalNovoBairro.salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarNovoBairro}
                disabled={modalNovoBairro.salvando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {modalNovoBairro.salvando ? "Salvando..." : "Salvar bairro"}
              </button>
            </div>
          </div>
        </div>
      )}
      {modalNovaCidade.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Cadastrar nova cidade
            </h3>
            <p className="text-sm text-slate-500">
              Informe o nome da cidade e selecione o estado.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Nome da cidade
                </label>
                <input
                  type="text"
                  value={modalNovaCidade.nome}
                  onChange={(event) =>
                    setModalNovaCidade((prev) => ({
                      ...prev,
                      nome: event.target.value,
                      erro: null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: Maringa"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Estado
                </label>
                <select
                  value={modalNovaCidade.estado}
                  onChange={(event) =>
                    setModalNovaCidade((prev) => ({
                      ...prev,
                      estado: event.target.value,
                      erro: null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  {ESTADOS_BRASIL.map((estado) => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.sigla} - {estado.nome}
                    </option>
                  ))}
                </select>
              </div>
              {modalNovaCidade.erro && (
                <p className="text-sm text-rose-600">{modalNovaCidade.erro}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharModalNovaCidade}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={modalNovaCidade.salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarNovaCidade}
                disabled={modalNovaCidade.salvando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {modalNovaCidade.salvando ? "Salvando..." : "Salvar cidade"}
              </button>
            </div>
          </div>
        </div>
      )}
      {modalDeclaracaoFaccao.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Nova declaração de facção
            </h3>
            <p className="text-sm text-slate-500">
              Registre uma nova versão; as anteriores permanecem no histórico.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Facção / Grupo
                </label>
                <select
                  value={modalDeclaracaoFaccao.faccaoId}
                  onChange={(e) =>
                    setModalDeclaracaoFaccao((prev) => ({
                      ...prev,
                      faccaoId: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  {faccoesDisponiveis.map((faccao) => (
                    <option key={faccao.id} value={faccao.id}>
                      {faccao.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Função (opcional)
                </label>
                <input
                  type="text"
                  value={modalDeclaracaoFaccao.funcao}
                  onChange={(e) =>
                    setModalDeclaracaoFaccao((prev) => ({
                      ...prev,
                      funcao: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: liderança, soldado, sem função"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Origem da informação
                  </label>
                  <select
                    value={modalDeclaracaoFaccao.origem}
                    onChange={(e) => {
                      const valor = e.target.value as any;
                      setModalDeclaracaoFaccao((prev) => ({
                        ...prev,
                        origem: valor,
                        informanteId:
                          valor === "OUTRO_INTERNO" ? prev.informanteId : "",
                        informanteNome:
                          valor === "OUTRO_INTERNO" ? prev.informanteNome : "",
                        informanteSms:
                          valor === "OUTRO_INTERNO" ? prev.informanteSms : "",
                      }));
                      if (valor !== "OUTRO_INTERNO") {
                        setInformanteBusca("");
                        setInformanteSugestoes([]);
                        setMostrandoInformanteSugestoes(false);
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="NAO_INFORMADO">Não informado</option>
                    <option value="CONFESSADA">Confessada</option>
                    <option value="OBSERVACAO">
                      Observação / inteligência
                    </option>
                    <option value="INTELIGENCIA">Inteligência formal</option>
                    <option value="TERCEIROS">Relato de terceiros</option>
                    <option value="OUTRO_INTERNO">Outro interno</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Nível de confiança
                  </label>
                  <select
                    value={modalDeclaracaoFaccao.nivelConfianca}
                    onChange={(e) =>
                      setModalDeclaracaoFaccao((prev) => ({
                        ...prev,
                        nivelConfianca: e.target.value as any,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="NAO_AVALIADO">Não avaliado</option>
                    <option value="BAIXO">Baixo</option>
                    <option value="MEDIO">Médio</option>
                    <option value="ALTO">Alto</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Observação (opcional)
                </label>
                <textarea
                  value={modalDeclaracaoFaccao.observacao}
                  onChange={(e) =>
                    setModalDeclaracaoFaccao((prev) => ({
                      ...prev,
                      observacao: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Detalhe a narrativa, contexto, quem presenciou, etc."
                />
              </div>
              {modalDeclaracaoFaccao.origem === "OUTRO_INTERNO" && (
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Adolescente informante
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={informanteBusca}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setInformanteBusca(valor);
                        setModalDeclaracaoFaccao((prev) => ({
                          ...prev,
                          informanteId: "",
                          informanteNome: "",
                          informanteSms: "",
                        }));
                        setMostrandoInformanteSugestoes(true);
                      }}
                      onFocus={() => setMostrandoInformanteSugestoes(true)}
                      onBlur={() =>
                        window.setTimeout(
                          () => setMostrandoInformanteSugestoes(false),
                          120,
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                      placeholder="Digite nome ou SMS do informante"
                    />
                    {buscandoInformante && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-indigo-500" />
                    )}
                    {mostrandoInformanteSugestoes &&
                      informanteBusca.trim().length >= 2 && (
                        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                          {informanteSugestoes.length === 0 && (
                            <p className="px-3 py-2 text-xs text-slate-500">
                              {buscandoInformante
                                ? "Buscando..."
                                : "Nenhum adolescente encontrado."}
                            </p>
                          )}
                          {informanteSugestoes.map((item) => (
                            <button
                              type="button"
                              key={item.id}
                              onMouseDown={() => {
                                setModalDeclaracaoFaccao((prev) => ({
                                  ...prev,
                                  informanteId: item.id,
                                  informanteNome: item.nome,
                                  informanteSms: item.numeroSms ?? "",
                                }));
                                setInformanteBusca(item.nome);
                                setMostrandoInformanteSugestoes(false);
                              }}
                              className="flex w-full flex-col px-3 py-2 text-left text-xs hover:bg-indigo-50"
                            >
                              <span className="font-semibold text-slate-800">
                                {item.nome}
                              </span>
                              {item.numeroSms && (
                                <span className="text-[10px] text-slate-500">
                                  SMS {item.numeroSms}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                  {modalDeclaracaoFaccao.informanteId && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Selecionado: {modalDeclaracaoFaccao.informanteNome}
                      {modalDeclaracaoFaccao.informanteSms
                        ? ` (SMS ${modalDeclaracaoFaccao.informanteSms})`
                        : ""}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Fonte / documento (opcional)
                </label>
                <input
                  type="text"
                  value={modalDeclaracaoFaccao.fonte}
                  onChange={(e) =>
                    setModalDeclaracaoFaccao((prev) => ({
                      ...prev,
                      fonte: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: relatório psicossocial, BO, anotação interna"
                />
              </div>
              {modalDeclaracaoFaccao.erro && (
                <p className="text-sm text-rose-600">
                  {modalDeclaracaoFaccao.erro}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharModalDeclaracaoFaccao}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={modalDeclaracaoFaccao.salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarDeclaracaoFaccao}
                disabled={modalDeclaracaoFaccao.salvando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {modalDeclaracaoFaccao.salvando
                  ? "Salvando..."
                  : "Salvar declaração"}
              </button>
            </div>
          </div>
        </div>
      )}
      {modalNovaFaccao.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Cadastrar nova faccao
            </h3>
            <p className="text-sm text-slate-500">
              Registre a faccao/grupo para manter o catalogo atualizado.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Nome da faccao
                </label>
                <input
                  type="text"
                  value={modalNovaFaccao.nome}
                  onChange={(event) =>
                    setModalNovaFaccao((prev) => ({
                      ...prev,
                      nome: event.target.value,
                      erro: null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: PCC"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Observacao
                </label>
                <textarea
                  value={modalNovaFaccao.descricao}
                  onChange={(event) =>
                    setModalNovaFaccao((prev) => ({
                      ...prev,
                      descricao: event.target.value,
                      erro: null,
                    }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none resize-none"
                  placeholder="Contexto ou observações adicionais"
                />
              </div>
              {modalNovaFaccao.erro && (
                <p className="text-sm text-rose-600">{modalNovaFaccao.erro}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharModalNovaFaccao}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={modalNovaFaccao.salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarNovaFaccao}
                disabled={modalNovaFaccao.salvando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {modalNovaFaccao.salvando ? "Salvando..." : "Salvar faccao"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
