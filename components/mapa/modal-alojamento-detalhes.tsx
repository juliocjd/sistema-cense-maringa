"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  X,
  AlertTriangle,
  Lock,
  Activity,
  Shield,
  MapPin,
  CheckCircle,
} from "lucide-react";

import type {
  Adolescente,
  AdolescenteAlertaEspecial,
  Alojamento,
  Casa,
  Conflito,
} from "@/types";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";
import type { RiscoDetalhado as RiscoDetalhadoCalculo } from "@/lib/riscos/calcular";
import { ALERTAS_ESPECIAIS } from "@/lib/alertas/especiais";

type TabKey = "ocupacao" | "transferencia" | "interdicao";

const INTERDICAO_TIPOS = [
  { value: "CI", label: "Comunicado Interno (CI)" },
  { value: "DECISAO_JUDICIAL", label: "Decisao judicial" },
  { value: "OUTRO", label: "Outro documento" },
] as const;

type InterdicaoDocumentoTipo = (typeof INTERDICAO_TIPOS)[number]["value"];

type AlertaEspecialChave = keyof typeof ALERTAS_ESPECIAIS;

type RiscoEnvolvido = {
  id?: string;
  nome: string;
  local?: string | null;
};

type RiscoDetalhadoResumo = {
  titulo: string;
  descricao: string;
  nivel: "CRITICO" | "ALTO" | "MEDIO" | "BAIXO" | "DEFAULT";
  envolvidos?: RiscoEnvolvido[];
  alertaEspecialTipo?: string;
  alertaEspecialId?: string;
  adolescenteId?: string;
  tagNivel?: NivelBadge;
  tagLabel?: string;
  frontalSuicidioLabel?: string;
  semVigilanciaFrontalLabel?: string;
  altaMedicaInfo?: {
    data: string;
    descricao: string | null;
  } | null;
  conflitoId?: string;
  labelOrigem?: string | null;
};

const ALERTA_DESCRICAO_LIMITE = 220;
const resumirDescricaoAlerta = (
  texto?: string | null,
  limite = ALERTA_DESCRICAO_LIMITE
) => {
  if (!texto) {
    return null;
  }
  const normalizado = texto.replace(/\s+/g, " ").trim();
  if (normalizado.length <= limite) {
    return normalizado;
  }
  return `${normalizado.slice(0, limite - 3).trim()}...`;
};

type VerificacaoConflito = {
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
  alertas: {
    tipo: string;
    nivel: number;
    mensagem: string;
  }[];
};

type SugestaoApi = {
  alojamentoId: string;
  casaId: string;
  casaNome: string;
  casaNumero?: number;
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

type MotivoAmbientalDetalhado = {
  original: string;
  exibicao: string;
  ehSuicidio: boolean;
};

interface ModalAlojamentoDetalhesProps {
  isOpen: boolean;
  alojamento: (Alojamento & { casa?: Casa }) | null;
  avaliacaoRisco?: {
    nivel: number;
    categoria: string;
    rotulo: string;
    descricao: string;
    corClass: string;
    detalhes?: RiscoDetalhadoCalculo[];
    ambiental?: {
      ativo: boolean;
      nivel: number;
      motivos: string[];
    } | null;
  } | null;
  onClose: () => void;
  casas: Casa[];
  conflitosExternos: Record<string, ImpactoConflitoExterno[]>;
  onDesalocar: (
    alojamentoId: string,
    adolescenteId: string,
    motivo?: string
  ) => Promise<void>;
  desinternandoId?: string | null;
  onDesinternar: (adolescenteId: string) => Promise<void>;
  onTransferir: (
    adolescente: Adolescente,
    destinoAlojamentoId: string,
    justificativa?: string,
    motivoOperador?: string,
    motivoObrigatorio?: boolean
  ) => Promise<void>;
  onSolicitarAlocacao: () => void;
  onInterditar: (
    alojamentoId: string,
    justificativa: string,
    documentoTipo: InterdicaoDocumentoTipo,
    documentoReferencia: string
  ) => Promise<void>;
  onLiberarInterdicao: (
    alojamentoId: string,
    justificativa: string,
    documentoTipo: InterdicaoDocumentoTipo,
    documentoReferencia: string
  ) => Promise<void>;
  readOnly?: boolean;
}

const nivelClasses: Record<string, string> = {
  CRITICO: "border-red-200 bg-red-50 text-red-700",
  ALTO: "border-orange-200 bg-orange-50 text-orange-700",
  MEDIO: "border-yellow-200 bg-yellow-50 text-yellow-700",
  BAIXO: "border-green-200 bg-green-50 text-green-700",
  DEFAULT: "border-slate-200 bg-slate-50 text-slate-600",
};

type NivelBadge = "CRITICO" | "ALTO" | "MEDIO" | "BAIXO";

const nivelBadgeClasses: Record<NivelBadge, string> = {
  CRITICO: "border-red-300 bg-red-100 text-red-800",
  ALTO: "border-orange-300 bg-orange-100 text-orange-800",
  MEDIO: "border-yellow-300 bg-yellow-100 text-yellow-800",
  BAIXO: "border-blue-300 bg-blue-100 text-blue-800",
};

const normalizarTexto = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const SUICIDIO_MOTIVO_TAG = normalizarTexto("Monitorar risco de suicidio");

const ehMotivoSuicidio = (mensagem: string) =>
  normalizarTexto(mensagem).includes(SUICIDIO_MOTIVO_TAG);

const extrairComplementoSuicidio = (mensagem: string) => {
  const separador = mensagem.indexOf(":");
  if (separador === -1) {
    return "";
  }
  return mensagem.slice(separador + 1).trim();
};

const formatarMensagemSuicidio = (
  mensagem: string,
  somenteSuicidio: boolean,
  possuiOutrosFatores: boolean
) => {
  if (somenteSuicidio) {
    return "Nao ha adolescente na frente do alojamento. Monitoramento continuo obrigatorio.";
  }

  if (possuiOutrosFatores) {
    return "Nao ha adolescente na frente do alojamento e Tensao Ambiental ativa.";
  }

  const complemento = extrairComplementoSuicidio(mensagem);

  return complemento
    ? `Sem vigilancia frontal: ${complemento}`
    : "Sem vigilancia frontal identificado.";
};

const numeroParaNivelBadge = (valor?: number | null): NivelBadge => {
  if (!valor || valor <= 2) return "BAIXO";
  if (valor === 3) return "MEDIO";
  if (valor === 4) return "ALTO";
  return "CRITICO";
};

const normalizarNivelTexto = (
  valor?: string | null
): NivelBadge | null => {
  if (!valor) return null;
  const texto = valor.toUpperCase();
  if (texto === "CRITICO") return "CRITICO";
  if (texto === "ALTO") return "ALTO";
  if (texto === "MEDIO") return "MEDIO";
  if (texto === "BAIXO") return "BAIXO";
  return null;
};

const riscoExigeMotivoTransferencia = (
  nivel?: string | null,
  nivelNumerico?: number | null
) => {
  if (typeof nivelNumerico === "number") {
    return nivelNumerico >= 3;
  }
  const texto = (nivel ?? "").toString().trim().toUpperCase();
  if (!texto) {
    return false;
  }
  return texto === "ATENCAO" || texto === "ALTO" || texto === "CRITICO";
};

const formatarNivelBadgeLabel = (nivel: NivelBadge) => {
  switch (nivel) {
    case "CRITICO":
      return "Crítico";
    case "ALTO":
      return "Alto";
    case "MEDIO":
      return "Médio";
    case "BAIXO":
    default:
      return "Baixo";
  }
};

export default function ModalAlojamentoDetalhes({
  isOpen,
  alojamento,
  avaliacaoRisco,
  onClose,
  casas,
  conflitosExternos: _conflitosExternos,
  onDesalocar,
  desinternandoId,
  onDesinternar,
  onTransferir,
  onSolicitarAlocacao,
  onInterditar,
  onLiberarInterdicao,
  readOnly = false,
}: ModalAlojamentoDetalhesProps) {
  const somenteLeitura = readOnly;
  const ocupante = alojamento?.adolescentes?.[0] ?? null;
  const alertasEspeciaisPorTipo = useMemo(() => {
    if (!ocupante?.alertasEspeciais?.length) {
      return {};
    }
    return ocupante.alertasEspeciais.reduce<
      Partial<Record<AlertaEspecialChave, AdolescenteAlertaEspecial>>
    >((acc, alerta) => {
      acc[alerta.tipo as AlertaEspecialChave] = alerta;
      return acc;
    }, {});
  }, [ocupante?.alertasEspeciais]);

  const suicidioAlertaId =
    alertasEspeciaisPorTipo.RISCO_SUICIDIO?.id ?? null;
  const [protocoloSuicidioInfo, setProtocoloSuicidioInfo] = useState<{
    ultimaEntrada?: { data: string; descricao: string | null } | null;
    ultimaAlta?: { data: string; descricao: string | null } | null;
  } | null>(null);

  useEffect(() => {
    let ativo = true;
    if (!suicidioAlertaId) {
      setProtocoloSuicidioInfo(null);
      return;
    }
    const carregar = async () => {
      try {
        const response = await fetch(`/api/alertas/${suicidioAlertaId}`);
        if (!response.ok) {
          if (ativo) {
            setProtocoloSuicidioInfo(null);
          }
          return;
        }
        const dados = await response.json();
        if (!ativo) {
          return;
        }
        setProtocoloSuicidioInfo(
          dados?.protocoloRiscoSuicidio ?? null
        );
      } catch {
        if (ativo) {
          setProtocoloSuicidioInfo(null);
        }
      }
    };
    carregar();
    return () => {
      ativo = false;
    };
  }, [suicidioAlertaId]);

  const altaMedicaValida = useMemo(() => {
    const registro = protocoloSuicidioInfo?.ultimaAlta;
    if (!registro?.data) {
      return null;
    }
    const dataAlta = new Date(registro.data);
    if (Number.isNaN(dataAlta.getTime())) {
      return registro;
    }
    const entrada = protocoloSuicidioInfo?.ultimaEntrada?.data
      ? new Date(protocoloSuicidioInfo.ultimaEntrada.data)
      : null;
    if (
      entrada &&
      !Number.isNaN(entrada.getTime()) &&
      entrada.getTime() > dataAlta.getTime()
    ) {
      return null;
    }
    return registro;
  }, [protocoloSuicidioInfo]);

  const [transferenciaCasaId, setTransferenciaCasaId] = useState("");
  const [transferenciaAlojamentoId, setTransferenciaAlojamentoId] =
    useState("");
  const [transferenciaVerificacao, setTransferenciaVerificacao] =
    useState<VerificacaoConflito | null>(null);
  const [transferenciaJustificativa, setTransferenciaJustificativa] =
    useState("");
  const [transferenciaMotivo, setTransferenciaMotivo] = useState("");
  const [transferindo, setTransferindo] = useState(false);
  const [transferenciaErro, setTransferenciaErro] = useState<string | null>(
    null
  );

  const [interdicaoJustificativa, setInterdicaoJustificativa] = useState("");
  const [interdicaoDocumentoTipo, setInterdicaoDocumentoTipo] = useState<
    InterdicaoDocumentoTipo | ""
  >("");
  const [interdicaoDocumentoReferencia, setInterdicaoDocumentoReferencia] =
    useState("");
  const [interdicaoLoading, setInterdicaoLoading] = useState(false);
  const [interdicaoErro, setInterdicaoErro] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<TabKey>("ocupacao");
  const [sugestoes, setSugestoes] = useState<SugestaoApi[]>([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [erroSugestoes, setErroSugestoes] = useState<string | null>(null);
  const [diagnosticoCasa, setDiagnosticoCasa] =
    useState<DiagnosticoCasaApi | null>(null);
  const [diagnosticoAberto, setDiagnosticoAberto] = useState(false);
  const [diagnosticoLoading, setDiagnosticoLoading] = useState(false);
  const [diagnosticoErro, setDiagnosticoErro] = useState<string | null>(null);
  const [mostrarBreakdownRisco, setMostrarBreakdownRisco] = useState(false);
  const [desinternandoLocal, setDesinternandoLocal] = useState(false);

  const statusInterditado = alojamento?.statusManutencao === "INTERDITADO";
  const podeInterditar = !ocupante;

  const resetarFluxoTransferencia = () => {
    setTransferenciaCasaId("");
    setTransferenciaAlojamentoId("");
    setTransferenciaVerificacao(null);
    setTransferenciaJustificativa("");
    setTransferenciaErro(null);
    setTransferindo(false);
    setDiagnosticoCasa(null);
    setDiagnosticoErro(null);
    setDiagnosticoLoading(false);
    setDiagnosticoAberto(false);
  };

  const resetarFluxoInterdicao = () => {
    setInterdicaoJustificativa("");
    setInterdicaoDocumentoTipo("");
    setInterdicaoDocumentoReferencia("");
    setInterdicaoErro(null);
    setInterdicaoLoading(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetarFluxoTransferencia();
      resetarFluxoInterdicao();
      setAbaAtiva("ocupacao");
      setSugestoes([]);
      setErroSugestoes(null);
      setCarregandoSugestoes(false);
      return;
    }

    resetarFluxoTransferencia();
    resetarFluxoInterdicao();
    setAbaAtiva("ocupacao");
  }, [isOpen, alojamento?.id]);

  // Fecha modal com ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !alojamento) {
      return;
    }

    if (alojamento.statusManutencao === "INTERDITADO") {
      setInterdicaoJustificativa(alojamento.interdicaoJustificativa ?? "");
      setInterdicaoDocumentoTipo(
        (alojamento.interdicaoDocumentoTipo as InterdicaoDocumentoTipo | null) ??
          ""
      );
      setInterdicaoDocumentoReferencia(
        alojamento.interdicaoDocumentoReferencia ?? ""
      );
    } else {
      setInterdicaoJustificativa("");
      setInterdicaoDocumentoTipo("");
      setInterdicaoDocumentoReferencia("");
    }
  }, [isOpen, alojamento]);

  useEffect(() => {
    if (statusInterditado && abaAtiva !== "interdicao") {
      setAbaAtiva("interdicao");
    }
  }, [statusInterditado, abaAtiva]);

  useEffect(() => {
    setSugestoes([]);
    setErroSugestoes(null);
    setCarregandoSugestoes(false);
    setDiagnosticoCasa(null);
    setDiagnosticoErro(null);
    setDiagnosticoLoading(false);
    setDiagnosticoAberto(false);
  }, [ocupante?.id, abaAtiva]);

  // Auto-verify risk when alojamento is selected for transfer
  useEffect(() => {
    if (somenteLeitura) {
      return;
    }
    if (transferenciaAlojamentoId && ocupante) {
      verificarTransferencia();
    }
  }, [somenteLeitura, transferenciaAlojamentoId, ocupante?.id]);

  const localizarAdolescente = (
    adolescenteId?: string | null
  ): { casa: string | null; numero: string | null; ala: string | null } | null => {
    if (!adolescenteId) return null;
    for (const casa of casas) {
      for (const aloj of casa.alojamentos) {
        if (aloj.adolescentes.some((a) => a.id === adolescenteId)) {
          return {
            casa: casa.nome ?? null,
            numero: aloj.numeroAlojamento ?? null,
            ala: aloj.ala ?? null,
          };
        }
      }
    }
    return null;
  };

  const buscarAdolescentePorId = (adolescenteId?: string | null) => {
    if (!adolescenteId) return null;
    for (const casa of casas) {
      for (const aloj of casa.alojamentos) {
        const alvo = aloj.adolescentes.find((a) => a.id === adolescenteId);
        if (alvo) {
          return alvo;
        }
      }
    }
    return null;
  };

  const alojamentoFrontalInfo = useMemo(() => {
    if (!alojamento?.alojamentoFrontalId) {
      return null;
    }

    for (const casa of casas) {
      const frontal = casa.alojamentos.find(
        (a) => a.id === alojamento.alojamentoFrontalId
      );
      if (frontal) {
        return { casa, alojamento: frontal };
      }
    }
    return null;
  }, [alojamento?.alojamentoFrontalId, casas]);

  const frontalOcupante =
    alojamentoFrontalInfo?.alojamento.adolescentes?.[0] ?? null;

  const semVigilanciaFrontal = (() => {
    if (!alojamento) {
      return false;
    }
    if (!alojamento.alojamentoFrontalId) {
      return true;
    }
    if (!alojamentoFrontalInfo) {
      return true;
    }
    const frontal = alojamentoFrontalInfo.alojamento;
    if (frontal.statusManutencao === "INTERDITADO") {
      return true;
    }
    return frontal.adolescentes.length === 0;
  })();

  const frontalSuicidioInfo = useMemo(() => {
    if (!frontalOcupante?.alertaRiscoSuicidio) {
      return null;
    }

    const nivel =
      normalizarNivelTexto(
        frontalOcupante.alertaRiscoSuicidioNivel ?? null
      ) ?? "BAIXO";

    const localPartes: string[] = [];
    if (alojamentoFrontalInfo?.casa?.nome) {
      localPartes.push(alojamentoFrontalInfo.casa.nome);
    }
    const frontalNumero =
      alojamentoFrontalInfo?.alojamento.numeroAlojamento ?? null;
    if (frontalNumero) {
      localPartes.push(`Aloj. ${frontalNumero}`);
    }

    return {
      nivel,
      nivelLabel: formatarNivelBadgeLabel(nivel),
      local: localPartes.length ? localPartes.join(" - ") : null,
    };
  }, [frontalOcupante, alojamentoFrontalInfo]);

  const formatarLocalizacao = (local?: {
    casa?: string | null;
    numero?: string | null;
    ala?: string | null;
  }) => {
    if (!local) return null;
    const partes: string[] = [];
    if (local.casa) partes.push(local.casa);
    if (local.numero) partes.push(`Aloj. ${local.numero}`);
    if (local.ala) partes.push(`Ala ${local.ala}`);
    return partes.length > 0 ? partes.join(" - ") : null;
  };

  const formatarDataCurta = (valor?: string | null) => {
    if (!valor) return null;
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) {
      return valor;
    }
    return data.toLocaleDateString("pt-BR");
  };

  /**
   * Mapeia ícones visuais para cada tipo de proximidade
   */
  const iconeProximidade: Record<string, string> = {
    FRONTAL: "🔴",
    MESMA_ALA: "⚠️",
    MESMA_CASA: "🟡",
    ZONA_JANELA: "🟢",
    FORA: "⚪",
  };

  /**
   * Labels descritivos para cada tipo de proximidade
   */
const labelProximidade: Record<string, string> = {
  FRONTAL: "Frontal (risco máximo)",
  MESMA_ALA: "Mesma ala (atenção)",
  MESMA_CASA: "Mesma casa (risco moderado)",
  ZONA_JANELA: "Zona de janela (risco baixo)",
  FORA: "Fora de alcance",
};

  /**
   * Labels descritivos para cada tipo de risco
   */
  const labelTipoRisco: Record<string, string> = {
    CONFLITO_INTERNO: "Conflito Interno",
    CONFLITO_EXTERNO: "Conflito Externo",
    ALIADO: "Aliado de Rival",
    AMBIENTAL: "Tensão Ambiental",
  };

  /**
   * Parse message details to extract structured information
   */
  const parseDetalheMensagem = (msg: string) => {
    // Try to identify STRONG/WEAK ALLIANCE pattern
    const matchAlianca = msg.match(/^(ALIANÇA (?:FORTE|FRACA) \((?:Facção|Bairro)\)): (.+?) - (.+?) (da mesma facção|do mesmo bairro) que o rival - (.+)$/);
    if (matchAlianca) {
      return {
        tipo: 'alianca' as const,
        badge: matchAlianca[1],
        nome: matchAlianca[2],
        local: matchAlianca[3],
        vinculo: matchAlianca[4],
        contexto: matchAlianca[5]
      };
    }

    // Try to identify Internal Conflict pattern
    const matchCI = msg.match(/^Conflito interno \((.+?)\) com (.+?) - (.+)$/);
    if (matchCI) {
      return {
        tipo: 'conflito_interno' as const,
        tipoConflito: matchCI[1],
        nomeRival: matchCI[2],
        local: matchCI[3]
      };
    }

    // Try to identify External Conflict pattern
    const matchCE = msg.match(/^Rival associado a (.+?): (.+?) - (.+)$/);
    if (matchCE) {
      return {
        tipo: 'conflito_externo' as const,
        origem: matchCE[1],
        nomeRival: matchCE[2],
        local: matchCE[3]
      };
    }

    // Fallback: original message
    return { tipo: 'outro' as const, mensagem: msg };
  };

  /**
   * Formata motivos ambientais de tensão para melhor legibilidade
   * Extrai informações estruturadas da string de motivo
   */
  const formatarMotivoAmbiental = (motivo: string) => {
    // Padrão: "Nome - Local alinhado ao rival (contexto)"
    // Exemplo: "João - Casa 01 - Aloj. 04 - Ala A alinhado ao rival (conflito interno com Marcos)."

    const match = motivo.match(/^(.+?) alinhado ao rival \((.+?)\)\.?$/);

    if (match) {
      const [, alidoComLocal, contexto] = match;

      // Extrair nome e localização
      const partes = alidoComLocal.split(' - ');
      const nomeAliado = partes[0];
      const localizacao = partes.slice(1).join(' - ');

      // Extrair informações do contexto (ex: "conflito interno com Marcos")
      const matchRival = contexto.match(/conflito (?:interno|externo entre \w+) (?:com|envolvendo) (.+?)$/i);
      const rival = matchRival ? matchRival[1] : null;

      return {
        formatado: true,
        nomeAliado,
        localizacao,
        contexto,
        rival,
      };
    }

    // Se não conseguir parsear, retorna o motivo original
    return {
      formatado: false,
      textoOriginal: motivo,
    };
  };

const conflitosInternos = useMemo<Conflito[]>(() => {
  if (!ocupante) return [];
  return [
    ...(ocupante.conflitosA ?? []),
    ...(ocupante.conflitosB ?? []),
  ];
}, [ocupante]);

// Somente conflitos ativos contam para risco e listagem principal de risco
const conflitosInternosAtivos = useMemo(
  () => conflitosInternos.filter((c) => c.status === "ATIVO"),
  [conflitosInternos]
);

// Mapa de origem do conflito para rotular ações
const origemConflitoLabel = useMemo(() => {
  const map = new Map<string, string>();
  conflitosInternos.forEach((c) => {
    let origem = (c as any).origem ?? "Registro direto";
    const ciOrigem = (c as any).ciOrigem as
      | { numero?: string | number; ano?: string | number }
      | undefined;
    const ciOrigemId = (c as any).ciOrigemId as string | undefined;
    let numero =
      ciOrigem?.numero ??
      (c as any).ciOrigemNumero ??
      (c as any).ciNumero ??
      (c as any).ci?.numero;
    let ano =
      ciOrigem?.ano ??
      (c as any).ciOrigemAno ??
      (c as any).ciAno ??
      (c as any).ci?.ano;

    if (!numero && c.ocorrencias?.length) {
      const ci = c.ocorrencias.find((oc) => (oc as any).ci)?.ci as
        | { numero?: string | number; ano?: string | number }
        | undefined;
      if (ci?.numero) {
        numero = ci.numero;
        ano = ci.ano ?? ano;
      }
    }

    if (numero) {
      origem = `CI ${numero}/${ano ?? ""}`.trim();
    } else if (ciOrigemId || (c as any).origem === "CI") {
      origem = "CI";
    }
    map.set(c.id, origem);
  });
  return map;
}, [conflitosInternos]);

const conflitosResolvidosLista = useMemo(() => {
  if (!ocupante) return [];
  const mapa = new Map<string, Conflito>();
  (ocupante.conflitosResolvidos ?? []).forEach((conflito) => {
    mapa.set(conflito.id, conflito);
  });
  conflitosInternos
    .filter((conflito) => conflito.status === "RESOLVIDO")
    .forEach((conflito) => {
      if (!mapa.has(conflito.id)) {
        mapa.set(conflito.id, conflito);
      }
    });
  return Array.from(mapa.values());
}, [ocupante, conflitosInternos]);

const conflitosAvaliacaoDetalhados = useMemo<RiscoDetalhadoResumo[]>(() => {
  if (!avaliacaoRisco?.detalhes?.length) {
    return [];
  }

  return avaliacaoRisco.detalhes.reduce<RiscoDetalhadoResumo[]>(
    (lista, detalhe) => {
      if (
        detalhe.tipo !== "CONFLITO_INTERNO" &&
        detalhe.tipo !== "CONFLITO_EXTERNO"
      ) {
        return lista;
      }

      const parsed = parseDetalheMensagem(detalhe.mensagem);
      const proximidadeLabel = detalhe.proximidade
        ? labelProximidade[detalhe.proximidade] ?? detalhe.proximidade
        : null;
      const tituloBase =
        labelTipoRisco[detalhe.tipo] ?? "Risco identificado";
      const titulo = proximidadeLabel
        ? `${tituloBase} • ${proximidadeLabel}`
        : tituloBase;

      let descricao = detalhe.mensagem;
      let envolvidos: RiscoEnvolvido[] | undefined = undefined;

      if (parsed.tipo === "conflito_interno") {
        descricao = `Conflito ${parsed.tipoConflito ?? "interno"} com ${
          parsed.nomeRival ?? "adversário"
        }`;
        if (parsed.local) {
          descricao = `${descricao} - ${parsed.local}`;
        }
        if (parsed.nomeRival) {
          envolvidos = [
            {
              nome: parsed.nomeRival,
              local: parsed.local ?? null,
            },
          ];
        }
      } else if (parsed.tipo === "conflito_externo") {
        descricao = parsed.origem
          ? `Rival associado a ${parsed.origem}`
          : detalhe.mensagem;
        if (parsed.nomeRival) {
          envolvidos = [
            {
              nome: parsed.nomeRival,
              local: parsed.local ?? null,
            },
          ];
        }
      } else if (parsed.tipo === "alianca") {
        descricao = `${parsed.vinculo} - ${parsed.contexto}`;
        envolvidos = [
          {
            nome: parsed.nome,
            local: parsed.local ?? null,
          },
        ];
      }

      const item: RiscoDetalhadoResumo = {
        titulo,
        descricao,
        nivel: numeroParaNivelBadge(detalhe.nivel),
        envolvidos,
        conflitoId: detalhe.referenciaConflitoId ?? undefined,
        labelOrigem: detalhe.referenciaConflitoId
          ? origemConflitoLabel.get(detalhe.referenciaConflitoId) ?? null
          : null,
      };

      // Ignorar conflitos resolvidos nas justificativas de risco
      if (item.conflitoId) {
        const conflitoReferenciado = conflitosInternos.find(
          (c) => c.id === item.conflitoId
        );
        // Ignorar apenas se explicitamente resolvido; manter pendente/ativo mesmo que nao esteja no array "ativos"
        if (conflitoReferenciado?.status === "RESOLVIDO") {
          return lista;
        }
      }

      lista.push(item);

      return lista;
    },
    []
  );
}, [avaliacaoRisco?.detalhes, conflitosInternosAtivos]);

  
  const riscosDetalhados = useMemo(() => {
    if (!ocupante) return [];

    const riscos: RiscoDetalhadoResumo[] = [];

    const construirInfoAlerta = (
      tipo: AlertaEspecialChave,
      fallback: string
    ) => {
      const registro = alertasEspeciaisPorTipo[tipo];
      const textoBase =
        registro?.descricao ??
        fallback ??
        ALERTAS_ESPECIAIS[tipo].descricaoPadrao;
      const descricaoNormalizada =
        resumirDescricaoAlerta(textoBase) ?? textoBase;
      return {
        descricao: descricaoNormalizada,
        tipoAlerta: ALERTAS_ESPECIAIS[tipo].tipoAlerta,
        alertaId: registro?.id ?? undefined,
        nivelRisco: registro?.nivelRisco ?? null,
      };
    };

    if (ocupante.alertaRiscoSuicidio) {
      const info = construirInfoAlerta(
        "RISCO_SUICIDIO",
        "Marcado no cadastro do adolescente."
      );
      const suicidioNivel =
        normalizarNivelTexto(
          ocupante.alertaRiscoSuicidioNivel ?? info.nivelRisco ?? null
        ) ?? "ALTO";
      const frontalFlagLabel = frontalSuicidioInfo
        ? "Frontal com historico de suicidio"
        : undefined;
      const semVigilanciaLabel =
        semVigilanciaFrontal && (suicidioNivel === "ALTO" || suicidioNivel === "CRITICO")
          ? "Sem vigilancia frontal"
          : undefined;
      riscos.push({
        titulo: "Risco de suicidio",
        descricao: info.descricao,
        nivel: suicidioNivel,
        alertaEspecialTipo: info.tipoAlerta,
        alertaEspecialId: info.alertaId,
        adolescenteId: ocupante.id,
        tagNivel: suicidioNivel,
        tagLabel: formatarNivelBadgeLabel(suicidioNivel),
        frontalSuicidioLabel: frontalFlagLabel,
        semVigilanciaFrontalLabel: semVigilanciaLabel,
        altaMedicaInfo: altaMedicaValida,
      });
    }

    if (ocupante.alertaPerfilMapeado) {
      const info = construirInfoAlerta(
        "PERFIL_MAPEADO",
        "Perfis conflituosos registrados pela inteligencia."
      );
      riscos.push({
        titulo: "Perfil mapeado",
        descricao: info.descricao,
        nivel: "MEDIO",
        alertaEspecialTipo: info.tipoAlerta,
        alertaEspecialId: info.alertaId,
        adolescenteId: ocupante.id,
      });
    }

    if (ocupante.alertaSaudeConfidencial) {
      const info = construirInfoAlerta(
        "SAUDE_CONFIDENCIAL",
        "Detalhe confidencial."
      );
      const descricaoSaude =
        resumirDescricaoAlerta(ocupante.alertaSaudeDetalhes) ??
        info.descricao;
      riscos.push({
        titulo: "Alerta de saude",
        descricao: descricaoSaude,
        nivel: "MEDIO",
        alertaEspecialTipo: info.tipoAlerta,
        alertaEspecialId: info.alertaId,
        adolescenteId: ocupante.id,
      });
    }

    // Adiciona riscos de conflitos que nao foram resolvidos
    conflitosAvaliacaoDetalhados.forEach((risco) => {
      if (risco.conflitoId) {
        const conflitoReferenciado = conflitosInternos.find(
          (c) => c.id === risco.conflitoId
        );
        if (conflitoReferenciado?.status === "RESOLVIDO") {
          return;
        }
      }
      riscos.push(risco);
    });

    return riscos;
  }, [
    ocupante,
    alertasEspeciaisPorTipo,
    conflitosAvaliacaoDetalhados,
    conflitosInternosAtivos,
    conflitosInternos,
    frontalSuicidioInfo,
    semVigilanciaFrontal,
    altaMedicaValida,
  ]);

  // Agrupa riscos com mesma mensagem/proximidade/tipo e acumula links de conflitos distintos
  const riscosAgrupados = useMemo(() => {
    const map = new Map<
      string,
      {
        base: RiscoDetalhadoResumo;
        conflitos: Array<{ id: string; label: string }>;
      }
    >();

    riscosDetalhados.forEach((r) => {
      const key = `${r.titulo}|${r.descricao ?? ""}`;
      const origemLabel =
        r.labelOrigem && r.labelOrigem !== "Registro direto"
          ? r.labelOrigem
          : r.conflitoId && origemConflitoLabel.get(r.conflitoId)
          ? origemConflitoLabel.get(r.conflitoId)!
          : r.conflitoId
          ? "Registro direto"
          : "";

      if (!map.has(key)) {
        map.set(key, {
          base: r,
          conflitos: r.conflitoId
            ? [{ id: r.conflitoId, label: origemLabel }]
            : [],
        });
      } else if (r.conflitoId) {
        const entry = map.get(key)!;
        const jaExiste = entry.conflitos.some((c) => c.id === r.conflitoId);
        if (!jaExiste) {
          entry.conflitos.push({ id: r.conflitoId, label: origemLabel });
        }
      }
    });

    return Array.from(map.values());
  }, [riscosDetalhados, origemConflitoLabel]);

const motivosAmbientaisDetalhados = useMemo<MotivoAmbientalDetalhado[]>(() => {
    const motivos = avaliacaoRisco?.ambiental?.motivos;
    if (!motivos?.length) {
      return [];
    }

    const temSuicidio = motivos.some(ehMotivoSuicidio);
    const somenteSuicidio = temSuicidio && motivos.every(ehMotivoSuicidio);
    const suicidioComOutros = temSuicidio && !somenteSuicidio;

    return motivos.map((motivo) => {
      if (temSuicidio && ehMotivoSuicidio(motivo)) {
        return {
          original: motivo,
          exibicao: formatarMensagemSuicidio(
            motivo,
            somenteSuicidio,
            suicidioComOutros
          ),
          ehSuicidio: true,
        };
      }

      return {
        original: motivo,
        exibicao: motivo,
        ehSuicidio: false,
      };
    });
  }, [avaliacaoRisco?.ambiental?.motivos]);

  const possuiSuicidioAmbiental = motivosAmbientaisDetalhados.some(
    (motivo) => motivo.ehSuicidio
  );
  const possuiAmbientalNaoSuicidio = motivosAmbientaisDetalhados.some(
    (motivo) => !motivo.ehSuicidio
  );
  const somenteSuicidioAmbiental =
    possuiSuicidioAmbiental && !possuiAmbientalNaoSuicidio;

  const alojamentosDisponiveis = useMemo(() => {
    if (!transferenciaCasaId) return [];
    const casaSelecionada = casas.find((casa) => casa.id === transferenciaCasaId);
    if (!casaSelecionada) return [];

    return casaSelecionada.alojamentos.filter(
      (a) =>
        a.statusManutencao === "LIVRE" &&
        a.adolescentes.length === 0 &&
        (!alojamento?.id || a.id !== alojamento.id)
    );
  }, [casas, transferenciaCasaId, alojamento]);

  const verificarTransferencia = async () => {
    if (somenteLeitura) {
      setTransferenciaErro(
        "Acesso somente leitura: transferencia bloqueada para seu perfil."
      );
      return;
    }
    if (!ocupante || !transferenciaAlojamentoId) return;

    setTransferindo(true);
    setTransferenciaErro(null);
    try {
      const response = await fetch(
        `/api/verificar-alocacao?adolescenteId=${ocupante.id}&alojamentoId=${transferenciaAlojamentoId}`
      );
      if (!response.ok) {
        throw new Error("Falha ao verificar riscos");
      }
      const payload = await response.json();
      setTransferenciaVerificacao({
        permite_alocacao: payload.permite_alocacao,
        requer_justificativa: Boolean(payload.requer_justificativa),
        nivel_risco: payload.nivel_risco ?? null,
        nivel_numerico:
          typeof payload.nivel_numerico === "number"
            ? payload.nivel_numerico
            : null,
        alertas: Array.isArray(payload.alertas) ? payload.alertas : [],
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erro ao verificar riscos";
      setTransferenciaErro(msg);
    } finally {
      setTransferindo(false);
    }
  };

  const transferenciaMotivoObrigatorio = transferenciaVerificacao
    ? riscoExigeMotivoTransferencia(
        transferenciaVerificacao.nivel_risco,
        transferenciaVerificacao.nivel_numerico
      )
    : false;

  const confirmarTransferencia = async () => {
    if (somenteLeitura) {
      setTransferenciaErro(
        "Acesso somente leitura: transferencia bloqueada para seu perfil."
      );
      return;
    }
    if (!ocupante || !transferenciaAlojamentoId) {
      setTransferenciaErro("Selecione o alojamento de destino.");
      return;
    }

    if (!transferenciaVerificacao) {
      setTransferenciaErro("Aguarde a verificação de riscos.");
      return;
    }

    if (
      transferenciaVerificacao.requer_justificativa &&
      transferenciaJustificativa.trim().length === 0
    ) {
      setTransferenciaErro(
        "Justificativa obrigatoria para este nivel de risco."
      );
      return;
    }

    if (
      transferenciaMotivoObrigatorio &&
      transferenciaMotivo.trim().length === 0
    ) {
      setTransferenciaErro("Informe o motivo da transferencia.");
      return;
    }

    setTransferindo(true);
    setTransferenciaErro(null);
    try {
      await onTransferir(
        ocupante,
        transferenciaAlojamentoId,
        transferenciaVerificacao.requer_justificativa
          ? transferenciaJustificativa
          : undefined,
        transferenciaMotivoObrigatorio
          ? transferenciaMotivo.trim()
          : undefined,
        transferenciaMotivoObrigatorio
      );
      setTransferenciaCasaId("");
      setTransferenciaAlojamentoId("");
      setTransferenciaJustificativa("");
      setTransferenciaMotivo("");
      setTransferenciaVerificacao(null);
      onClose(); // Close modal after successful transfer
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erro ao transferir adolescente.";
      setTransferenciaErro(msg);
    } finally {
      setTransferindo(false);
    }
  };

  const executarInterdicao = async (
    acao: "INTERDITAR" | "LIBERAR",
    fecharAoFinal = true
  ) => {
    if (!alojamento) return;

    if (acao === "INTERDITAR" && !statusInterditado && !podeInterditar) {
      setInterdicaoErro(
        "Remova ou transfira o adolescente antes de interditar o alojamento."
      );
      return;
    }

    const justificativa = interdicaoJustificativa.trim();
    const documentoRef = interdicaoDocumentoReferencia.trim();

    if (!justificativa || !interdicaoDocumentoTipo || !documentoRef) {
      setInterdicaoErro(
        "Informe justificativa, tipo de documento e referencia."
      );
      return;
    }

    setInterdicaoLoading(true);
    setInterdicaoErro(null);

    try {
      if (acao === "LIBERAR") {
        await onLiberarInterdicao(
          alojamento.id,
          justificativa,
          interdicaoDocumentoTipo,
          documentoRef
        );
      } else {
        await onInterditar(
          alojamento.id,
          justificativa,
          interdicaoDocumentoTipo,
          documentoRef
        );
      }

      if (fecharAoFinal) {
        setInterdicaoJustificativa("");
        setInterdicaoDocumentoTipo("");
        setInterdicaoDocumentoReferencia("");
        onClose();
      }
      setInterdicaoErro(null);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erro ao atualizar o alojamento.";
      setInterdicaoErro(msg);
    } finally {
      setInterdicaoLoading(false);
    }
  };

  const buscarSugestoes = async () => {
    if (somenteLeitura) {
      setErroSugestoes(
        "Acesso somente leitura: sugestoes bloqueadas para seu perfil."
      );
      return;
    }
    if (!ocupante) return;
    setCarregandoSugestoes(true);
    setErroSugestoes(null);
    setDiagnosticoCasa(null);
    setDiagnosticoErro(null);
    setDiagnosticoAberto(false);
    try {
      const limite =
        transferenciaCasaId && casas.length > 0
          ? Math.max(casas.length, 3)
          : 3;
      const response = await fetch(
        `/api/alocar/sugestoes?adolescenteId=${ocupante.id}&limite=${limite}`
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.erro ?? "Falha ao buscar sugestoes");
      }
      const payload = await response.json();
      const sugestoesBrutas: SugestaoApi[] = Array.isArray(payload?.sugestoes)
        ? payload.sugestoes
        : [];

      if (transferenciaCasaId) {
        const filtradas = sugestoesBrutas
          .filter((s) => s.casaId === transferenciaCasaId)
          .slice(0, 3);
        setSugestoes(filtradas);
        if (filtradas.length === 0) {
          setErroSugestoes("Nenhum alojamento recomendado nessa casa.");
        }
      } else {
        setSugestoes(sugestoesBrutas);
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Erro ao buscar sugestões de alojamento";
      setErroSugestoes(msg);
    } finally {
      setCarregandoSugestoes(false);
    }
  };

  const aplicarSugestao = (sugestao: SugestaoApi) => {
    setTransferenciaCasaId(sugestao.casaId);
    setTransferenciaAlojamentoId(sugestao.alojamentoId);
    setTransferenciaVerificacao(null);
    setSugestoes([]);
    setErroSugestoes(null);
  };

  const abrirDiagnosticoCasa = async () => {
    if (!ocupante || !transferenciaCasaId) {
      return;
    }
    setDiagnosticoLoading(true);
    setDiagnosticoErro(null);
    try {
      const response = await fetch(
        `/api/alocar/sugestoes?adolescenteId=${ocupante.id}&casaId=${transferenciaCasaId}&diagnostico=1`
      );
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

  const colorClass = (() => {
    if (statusInterditado) {
      return "border-gray-300 bg-gray-50 text-gray-600";
    }
    if (avaliacaoRisco?.corClass) {
      return `${avaliacaoRisco.corClass} text-slate-900`;
    }
    if (!ocupante) {
      return "border-gray-200 bg-gray-50 text-gray-700";
    }
    if (riscosDetalhados.some((r) => r.nivel === "ALTO" || r.nivel === "CRITICO")) {
      return "border-red-200 bg-red-50 text-red-600";
    }
    if (riscosDetalhados.length > 0) {
      return "border-yellow-200 bg-yellow-50 text-yellow-600";
    }
    return "border-green-200 bg-green-50 text-green-600";
  })();

  if (!isOpen || !alojamento) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-indigo-500">
                Alojamento {alojamento.numeroAlojamento} • {alojamento.casa?.nome ?? ""}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${colorClass}`}
            >
              {statusInterditado ? "Interditado" : "Operacional"}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1">
              {ocupante ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl font-semibold text-slate-900">
                      {ocupante.nomeCompleto}
                    </p>
                    {ocupante.nomeSocial && (
                      <span className="text-xs font-semibold text-slate-500">
                        ({ocupante.nomeSocial})
                      </span>
                    )}
                    <span className="text-xs font-semibold text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
                      SMS: {ocupante.numeroSms ?? "Nao informado"}
                    </span>
                    <span className="text-xs font-semibold text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
                      Nº interno: {ocupante.numeroInterno ?? "Nao informado"}
                    </span>
                    {ocupante.faccao && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200">
                        <Shield size={12} />
                        {ocupante.faccao.nome}
                      </span>
                    )}
                    {ocupante.bairroOrigem && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold">
                        <MapPin size={12} />
                        Regiao {ocupante.bairroOrigem.nome}
                        {ocupante.bairroOrigem.cidade
                          ? ` - ${ocupante.bairroOrigem.cidade}`
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Alojamento atualmente sem ocupante.
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100 self-start"
              aria-label="Fechar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

          <div className="max-h-[80vh] overflow-y-auto px-6 py-5 space-y-5">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    {
                      id: "ocupacao",
                      label: "Ocupacao atual",
                      disabled: statusInterditado,
                    },
                    {
                      id: "transferencia",
                      label: "Transferir / realocar",
                      disabled: statusInterditado,
                    },
                    { id: "interdicao", label: "Interdicao", disabled: false },
                  ] as Array<{ id: TabKey; label: string; disabled: boolean }>
                ).map((tab) => {
                  const isDisabled = tab.disabled;
                  const isActive = abaAtiva === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (!isDisabled) setAbaAtiva(tab.id);
                      }}
                      title={
                        isDisabled
                          ? "Alojamento interditado: utilize a aba Interdicao."
                          : undefined
                      }
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              {ocupante && (
                <div className="self-start sm:self-center shrink-0">
                  {ocupante.fotoUrl ? (
                    <Link
                      href={`/adolescentes/${ocupante.id}`}
                      title="Abrir cadastro do adolescente"
                      className="h-16 w-16 rounded-2xl border border-slate-200 bg-slate-100 shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-lg font-semibold hover:ring-2 hover:ring-indigo-300"
                    >
                      <img
                        src={ocupante.fotoUrl}
                        alt={ocupante.nomeCompleto}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                  ) : (
                    <Link
                      href={`/adolescentes/${ocupante.id}`}
                      title="Abrir cadastro do adolescente"
                      className="h-16 w-16 rounded-2xl border border-slate-200 bg-slate-100 shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-lg font-semibold hover:ring-2 hover:ring-indigo-300"
                    >
                      {ocupante.nomeCompleto?.charAt(0) ?? "?"}
                    </Link>
                  )}
                </div>
              )}
            </div>

          {statusInterditado && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
              Este alojamento esta interditado. Atualize os dados ou libere o leito na aba
              Interdicao.
            </div>
          )}
          {somenteLeitura && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
              Acesso somente leitura: operacoes de alocacao, transferencia e interdicao estao bloqueadas.
            </div>
          )}

          {abaAtiva === "ocupacao" && (
            <section className="rounded-2xl border border-slate-200 p-4">
              {ocupante ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    {avaliacaoRisco && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <button
                          type="button"
                          onClick={() => setMostrarBreakdownRisco(!mostrarBreakdownRisco)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Activity size={16} className="text-indigo-600" />
                            <p className="text-sm font-medium text-slate-700">
                              Nível de risco atual:
                            </p>
                            <span className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                              ${avaliacaoRisco.nivel === 5 ? 'bg-red-100 text-red-800 border border-red-300' : ''}
                              ${avaliacaoRisco.nivel === 4 ? 'bg-orange-100 text-orange-800 border border-orange-300' : ''}
                              ${avaliacaoRisco.nivel === 3 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : ''}
                              ${avaliacaoRisco.nivel === 2 ? 'bg-lime-100 text-lime-800 border border-lime-300' : ''}
                              ${avaliacaoRisco.nivel === 1 ? 'bg-green-100 text-green-800 border border-green-300' : ''}
                              ${avaliacaoRisco.nivel === 0 ? 'bg-gray-100 text-gray-800 border border-gray-300' : ''}
                            `}>
                              {avaliacaoRisco.rotulo}
                            </span>
                          </div>
                          <span className="text-xs text-indigo-600 font-medium">
                            {mostrarBreakdownRisco ? "Ocultar cálculo ▲" : "Ver cálculo ▼"}
                          </span>
                        </button>

                        {mostrarBreakdownRisco && avaliacaoRisco.detalhes && avaliacaoRisco.detalhes.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                            <div className="flex items-center gap-2 mb-3">
                              <p className="text-xs font-semibold uppercase text-slate-600">
                                📊 Breakdown do Cálculo
                              </p>
                            </div>

                            {/* Agrupar detalhes por nível e renderizar em ordem decrescente */}
                            {[5, 4, 3, 2].map((nivel) => {
                              const detalhesDoNivel =
                                avaliacaoRisco.detalhes?.filter((d) => d.nivel === nivel) ?? [];

                              if (detalhesDoNivel.length === 0) return null;

                              const corNivel =
                                nivel === 5
                                  ? "border-red-300 bg-red-50"
                                  : nivel === 4
                                  ? "border-orange-300 bg-orange-50"
                                  : nivel === 3
                                  ? "border-yellow-300 bg-yellow-50"
                                  : "border-lime-300 bg-lime-50";

                              const labelNivel =
                                nivel === 5
                                  ? "CRÍTICO"
                                  : nivel === 4
                                  ? "ELEVADO"
                                  : nivel === 3
                                  ? "ATENÇÃO"
                                  : "MONITORAR";

                              return (
                                <div key={nivel} className="space-y-2">
                                  <p className="text-xs font-semibold text-slate-700">
                                    ⚠️ Fatores de Nível {nivel} ({labelNivel})
                                  </p>
                                  {detalhesDoNivel.map((detalhe, idx) => {
                                    // Parser para extrair informações estruturadas da mensagem
                                    const precisaReescreverSuicidio =
                                      detalhe.tipo === "AMBIENTAL" &&
                                      ehMotivoSuicidio(detalhe.mensagem ?? "");

                                    const mensagemDetalhe =
                                      precisaReescreverSuicidio
                                        ? formatarMensagemSuicidio(
                                            detalhe.mensagem ?? "",
                                            somenteSuicidioAmbiental,
                                            possuiAmbientalNaoSuicidio
                                          )
                                        : detalhe.mensagem ?? "";

                                    const parsed = parseDetalheMensagem(
                                      mensagemDetalhe
                                    );

                                    return (
                                      <div
                                        key={`${nivel}-${idx}`}
                                        className={`rounded-lg border p-3 ${corNivel}`}
                                      >
                                        <div className="flex items-start gap-2">
                                          {detalhe.proximidade && (
                                            <span className="text-lg" title={labelProximidade[detalhe.proximidade]}>
                                              {iconeProximidade[detalhe.proximidade]}
                                            </span>
                                          )}
                                          <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                              <p className="text-xs font-bold text-slate-800">
                                                {labelTipoRisco[detalhe.tipo] || detalhe.tipo}
                                              </p>
                                              {parsed.tipo === 'alianca' && (
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                  parsed.badge.includes('FORTE')
                                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                                }`}>
                                                  {parsed.badge}
                                                </span>
                                              )}
                                            </div>

                                            {parsed.tipo === 'alianca' && (
                                              <div className="space-y-0.5">
                                                <p className="text-xs text-slate-900 font-semibold">👤 {parsed.nome}</p>
                                                <p className="text-xs text-slate-700">📍 {parsed.local}</p>
                                                <p className="text-xs text-slate-600 italic">🔗 {parsed.vinculo}</p>
                                                <p className="text-xs text-slate-500 mt-1">ℹ️ {parsed.contexto}</p>
                                              </div>
                                            )}

                                            {parsed.tipo === 'conflito_interno' && (
                                              <div className="space-y-0.5">
                                                <p className="text-xs text-slate-900 font-semibold">⚔️ Conflito tipo: {parsed.tipoConflito}</p>
                                                <p className="text-xs text-slate-900 font-semibold">👤 Rival: {parsed.nomeRival}</p>
                                                <p className="text-xs text-slate-700">📍 {parsed.local}</p>
                                              </div>
                                            )}

                                            {parsed.tipo === 'conflito_externo' && (
                                              <div className="space-y-0.5">
                                                <p className="text-xs text-slate-900 font-semibold">🌍 Origem: {parsed.origem}</p>
                                                <p className="text-xs text-slate-900 font-semibold">👤 Rival: {parsed.nomeRival}</p>
                                                <p className="text-xs text-slate-700">📍 {parsed.local}</p>
                                              </div>
                                            )}

                                            {parsed.tipo === 'outro' && (
                                              <p className="text-xs text-slate-700">
                                                {parsed.mensagem}
                                              </p>
                                            )}

                                            {detalhe.proximidade && (
                                              <div className="mt-1 pt-1 border-t border-slate-200">
                                                <p className="text-xs text-slate-600 font-medium">
                                                  📏 Proximidade: {labelProximidade[detalhe.proximidade]}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}

                            {/* Tensão Ambiental */}
                            {avaliacaoRisco.ambiental?.ativo && (
                              <div className="border-t border-slate-200 pt-3">
                                <p className="text-xs font-semibold text-slate-700 mb-2">
                                  🌡️ Tensão Ambiental (Nível {avaliacaoRisco.ambiental.nivel})
                                </p>
                                <ul className="space-y-1 text-xs text-amber-700">
                                  {motivosAmbientaisDetalhados.map(
                                    (motivo, idx) => (
                                      <li
                                        key={`ambiental-breakdown-${idx}`}
                                      >
                                        • {motivo.exibicao}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                            {/* Legenda de Proximidade */}
                            <div className="border-t border-slate-200 pt-3">
                              <p className="text-xs font-semibold text-slate-700 mb-2">
                                📍 Legenda de Proximidade
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                {Object.entries(labelProximidade).map(([key, label]) => (
                                  <div key={key} className="flex items-center gap-1">
                                    <span>{iconeProximidade[key]}</span>
                                    <span>{label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                {avaliacaoRisco?.ambiental?.ativo && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={14} className="text-amber-600" />
                      <p className="font-semibold text-amber-800">Ala em tensão</p>
                    </div>
                    <div className="space-y-2">
                      {motivosAmbientaisDetalhados.map((motivo, index) => {
                        if (motivo.ehSuicidio) {
                          return (
                            <div key={`ambiental-${index}`} className="rounded-lg border border-amber-300 bg-white/60 p-2">
                              <p className="text-xs text-amber-900">{motivo.exibicao}</p>
                            </div>
                          );
                        }

                        const info = formatarMotivoAmbiental(motivo.original);

                        if (info.formatado) {
                          return (
                            <div key={`ambiental-${index}`} className="rounded-lg border border-amber-300 bg-white/60 p-2">
                              {info.rival && (
                                <p className="text-xs font-semibold text-amber-900 mb-1">
                                  Conflito com: {info.rival}
                                </p>
                              )}
                              <p className="text-xs text-amber-800">
                                <span className="font-medium">Aliado do rival:</span> {info.nomeAliado}
                              </p>
                              {info.localizacao && (
                                <p className="text-xs text-amber-700 mt-0.5">
                                  📍 {info.localizacao}
                                </p>
                              )}
                              <p className="text-xs text-amber-600 mt-1 italic">
                                {info.contexto}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <p key={`ambiental-${index}`} className="text-xs text-amber-800">
                            {info.textoOriginal ?? motivo.exibicao}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
                  </div>

                  {riscosAgrupados.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-slate-600" />
                        <p className="text-xs font-semibold uppercase text-slate-600">
                          Conflitos e Justificativas de Risco
                        </p>
                      </div>
                      <div className="space-y-2">
                        {riscosAgrupados.map(({ base: risco, conflitos }, index) => {
                          const classe =
                            nivelClasses[risco.nivel ?? "DEFAULT"] ??
                            nivelClasses.DEFAULT;
                          const params = new URLSearchParams();
                          if (ocupante?.numeroSms) {
                            params.set(
                              "numeroAdolescente",
                              ocupante.numeroSms
                            );
                          } else if (risco.adolescenteId) {
                            params.set("adolescenteId", risco.adolescenteId);
                          }
                          if (risco.alertaEspecialTipo) {
                            params.set("tipoAlerta", risco.alertaEspecialTipo);
                          }
                          const alertaLink =
                            params.has("tipoAlerta") &&
                            (params.has("numeroAdolescente") ||
                              params.has("adolescenteId"))
                              ? `/alertas?${params.toString()}`
                              : null;
                          const linkClass =
                            "inline-flex items-center rounded-full border border-white/70 bg-white/60 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-white whitespace-nowrap";
                          const conflitoLinks =
                            conflitos.length > 0
                              ? conflitos.map((c) => ({
                                  href: `/conflitos/${c.id}`,
                                  label: `Ver conflito (${c.label})`,
                                }))
                              : [];
                          return (
                            <div
                              key={`${risco.titulo}-${index}`}
                              className={`rounded-lg border p-3 ${classe}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-lg">⚔️</span>
                                <div className="flex-1 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xs font-bold text-slate-800">
                                      {risco.titulo}
                                    </p>
                                    {risco.tagNivel && (
                                      <span
                                        className={`text-[10px] font-semibold uppercase tracking-wide rounded-full border px-2 py-0.5 ${nivelBadgeClasses[risco.tagNivel]}`}
                                      >
                                        {risco.tagLabel ?? formatarNivelBadgeLabel(risco.tagNivel)}
                                      </span>
                                    )}
                                    {risco.frontalSuicidioLabel && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-rose-800">
                                        <AlertTriangle size={10} />
                                        {risco.frontalSuicidioLabel}
                                      </span>
                                    )}
                                    {risco.semVigilanciaFrontalLabel && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-800">
                                        <AlertTriangle size={10} />
                                        {risco.semVigilanciaFrontalLabel}
                                      </span>
                                    )}
                                    {risco.altaMedicaInfo && (
                                      <span
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-emerald-800"
                                        title={
                                          risco.altaMedicaInfo.descricao ?? undefined
                                        }
                                      >
                                        <CheckCircle size={10} />
                                        {`Alta medica ${formatarDataCurta(
                                          risco.altaMedicaInfo.data
                                        ) ?? ""}`}
                                      </span>
                                    )}
                                  </div>

                                  {risco.envolvidos && risco.envolvidos.length > 0 && (
                                    <div className="space-y-1.5 mt-2">
                                      {risco.envolvidos.map((envolvido, idx) => (
                                        <div key={`${envolvido.id ?? envolvido.nome}-${idx}`} className="space-y-0.5">
                                          <p className="text-xs text-slate-900 font-semibold">👤 {envolvido.nome}</p>
                                          {envolvido.local && (
                                            <p className="text-xs text-slate-700">📍 {envolvido.local}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {risco.descricao && (
                                    <div className="mt-2 pt-2 border-t border-slate-200">
                                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                        <p className="italic flex-1 min-w-[60%]">
                                          ℹ️ {risco.descricao}
                                        </p>
                                        {alertaLink && (
                                          <Link href={alertaLink} className={linkClass}>
                                            Ver alerta
                                          </Link>
                                        )}
                                        {!alertaLink &&
                                          conflitoLinks.map((link) => (
                                            <Link key={link.href} href={link.href} className={linkClass}>
                                              {link.label}
                                            </Link>
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Nenhum alerta registrado para este adolescente.
                    </p>
                  )}

                  {conflitosResolvidosLista.length > 0 && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                        <CheckCircle size={16} />
                        <span>Conflitos resolvidos</span>
                      </div>
                      <ul className="mt-2 space-y-2 text-sm text-emerald-900">
                        {conflitosResolvidosLista.map((conflito) => {
                          const adversarioId =
                            conflito.adversario?.id ??
                            (conflito.adolescenteAId === ocupante?.id
                              ? conflito.adolescenteBId
                              : conflito.adolescenteAId);
                          const localAdversario =
                            conflito.adversarioLocal ??
                              formatarLocalizacao(
                                localizarAdolescente(adversarioId) ?? undefined
                              );
                          const adversarioNome =
                            conflito.adversario?.nomeCompleto ??
                            buscarAdolescentePorId(adversarioId)?.nomeCompleto ??
                            null;
                          return (
                            <li
                              key={conflito.id}
                              className="rounded-lg border border-emerald-100 bg-white/80 p-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-emerald-800">
                                    {conflito.tipoConflito ?? "Conflito"}
                                  </p>
                                  {conflito.descricao && (
                                    <p className="text-xs text-emerald-700 mt-0.5">
                                      {conflito.descricao}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {conflito.resolvidoEm && (
                                    <span className="text-[11px] font-semibold text-emerald-700 px-2 py-1 bg-white border border-emerald-200 rounded-full shadow-sm">
                                      Resolvido em {formatarDataCurta(conflito.resolvidoEm)}
                                    </span>
                                  )}
                                  <Link
                                    href={`/conflitos/${conflito.id}`}
                                    className="inline-flex items-center rounded-full border border-white/70 bg-white/60 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-white whitespace-nowrap"
                                  >
                                    Ver conflito
                                  </Link>
                                </div>
                              </div>
                              {adversarioNome && (
                                <div className="mt-1 text-xs text-emerald-700">
                                  <p>
                                    Envolvido: {adversarioNome}
                                    {localAdversario ? ` • ${localAdversario}` : ""}
                                  </p>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {somenteLeitura ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Acesso somente leitura: remoção e desinternação estão bloqueadas para seu perfil.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3 items-center">
                      <button
                        type="button"
                        onClick={() =>
                          onDesalocar(alojamento.id, ocupante.id, "Remocao manual")
                        }
                        disabled={desinternandoLocal || desinternandoId === ocupante.id}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Remover do alojamento
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setDesinternandoLocal(true);
                          try {
                            await onDesinternar(ocupante.id);
                            onClose();
                          } finally {
                            setDesinternandoLocal(false);
                          }
                        }}
                        disabled={desinternandoLocal || desinternandoId === ocupante.id}
                        className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span className="inline-flex items-center gap-2">
                          {(desinternandoLocal ||
                            desinternandoId === ocupante.id) && (
                            <Activity className="h-4 w-4 animate-spin" />
                          )}
                          {desinternandoLocal || desinternandoId === ocupante.id
                            ? "Processando..."
                            : "Desinternar"}
                        </span>
                      </button>
                      {(desinternandoLocal || desinternandoId === ocupante.id) && (
                        <span className="text-xs text-amber-700">
                          Aguarde, estamos registrando a desinternacao.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Este alojamento esta livre. Utilize o botao abaixo para iniciar
                    uma nova alocacao.
                  </p>
                  {somenteLeitura ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Acesso somente leitura: alocação está bloqueada para seu perfil.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onSolicitarAlocacao}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                      Alocar adolescente
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {abaAtiva === "transferencia" && (
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Transferir / realocar
              </h3>

              {somenteLeitura ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Acesso somente leitura: transferencias e realocacoes estao
                  bloqueadas para seu perfil.
                </div>
              ) : ocupante ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <p className="text-sm text-slate-600">
                      Consulte sugestões com base nos conflitos mapeados.
                    </p>
                    <button
                      type="button"
                      onClick={buscarSugestoes}
                      className="rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                      disabled={carregandoSugestoes}
                    >
                      {carregandoSugestoes ? "Calculando..." : "Sugerir destino"}
                    </button>
                    {erroSugestoes && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-rose-600">
                        <span>{erroSugestoes}</span>
                        {transferenciaCasaId && (
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
                          <span className="text-rose-500">
                            {diagnosticoErro}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">
                        Casa destino
                      </label>
                        <select
                          value={transferenciaCasaId}
                          onChange={(event) => {
                            setTransferenciaCasaId(event.target.value);
                            setTransferenciaAlojamentoId("");
                            setTransferenciaVerificacao(null);
                            setTransferenciaErro(null);
                            setDiagnosticoCasa(null);
                            setDiagnosticoErro(null);
                            setDiagnosticoLoading(false);
                            setDiagnosticoAberto(false);
                          }}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">Selecione...</option>
                        {casas.map((casa) => (
                          <option key={casa.id} value={casa.id}>
                            {casa.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">
                        Alojamento destino
                      </label>
                      <select
                        value={transferenciaAlojamentoId}
                        onChange={(event) => {
                          setTransferenciaAlojamentoId(event.target.value);
                          setTransferenciaVerificacao(null);
                          setTransferenciaErro(null);
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                        disabled={!transferenciaCasaId}
                      >
                        <option value="">Selecione...</option>
                        {alojamentosDisponiveis.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.numeroAlojamento}
                            {a.ala ? ` - Ala ${a.ala}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {transferenciaVerificacao && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity size={16} className="text-slate-600" />
                        <p className="text-xs font-semibold uppercase text-slate-600">
                          Análise de Risco da Transferência
                        </p>
                      </div>

                      <div
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          transferenciaVerificacao.nivel_risco === "CRITICO"
                            ? "border-red-300 bg-red-50 text-red-800"
                            : transferenciaVerificacao.nivel_risco === "ALTO"
                            ? "border-orange-300 bg-orange-50 text-orange-800"
                            : "border-yellow-300 bg-yellow-50 text-yellow-800"
                        }`}
                      >
                        <p className="font-bold text-xs">
                          📊 NÍVEL: {transferenciaVerificacao.nivel_risco ?? "Sem classificação"}
                        </p>
                      </div>

                      {transferenciaVerificacao.alertas.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {transferenciaVerificacao.alertas.map((alerta, index) => {
                            const parsed = parseDetalheMensagem(alerta.mensagem);

                            return (
                              <div
                                key={`${alerta.tipo}-${index}`}
                                className="rounded-lg border border-slate-200 bg-white p-3"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-lg">⚠️</span>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-bold text-slate-800">
                                        {alerta.tipo === "CONFLITO_INTERNO"
                                          ? "Conflito Interno"
                                          : alerta.tipo === "CONFLITO_EXTERNO"
                                          ? "Conflito Externo"
                                          : alerta.tipo === "ALIADO"
                                          ? "Aliado de Rival"
                                          : "Alerta"}
                                      </p>
                                      {parsed.tipo === 'alianca' && (
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                          parsed.badge.includes('FORTE')
                                            ? 'bg-red-100 text-red-800 border border-red-300'
                                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                                        }`}>
                                          {parsed.badge}
                                        </span>
                                      )}
                                    </div>

                                    {parsed.tipo === 'alianca' && (
                                      <div className="space-y-0.5">
                                        <p className="text-xs text-slate-900 font-semibold">👤 {parsed.nome}</p>
                                        <p className="text-xs text-slate-700">📍 {parsed.local}</p>
                                        <p className="text-xs text-slate-600 italic">🔗 {parsed.vinculo}</p>
                                        <p className="text-xs text-slate-500 mt-1">ℹ️ {parsed.contexto}</p>
                                      </div>
                                    )}

                                    {parsed.tipo === 'conflito_interno' && (
                                      <div className="space-y-0.5">
                                        <p className="text-xs text-slate-900 font-semibold">⚔️ Conflito tipo: {parsed.tipoConflito}</p>
                                        <p className="text-xs text-slate-900 font-semibold">👤 Rival: {parsed.nomeRival}</p>
                                        <p className="text-xs text-slate-700">📍 {parsed.local}</p>
                                      </div>
                                    )}

                                    {parsed.tipo === 'conflito_externo' && (
                                      <div className="space-y-0.5">
                                        <p className="text-xs text-slate-900 font-semibold">🌍 Origem: {parsed.origem}</p>
                                        <p className="text-xs text-slate-900 font-semibold">👤 Rival: {parsed.nomeRival}</p>
                                        <p className="text-xs text-slate-700">📍 {parsed.local}</p>
                                      </div>
                                    )}

                                    {parsed.tipo === 'outro' && (
                                      <p className="text-xs text-slate-700">{parsed.mensagem}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {transferenciaAlojamentoId && transferenciaMotivoObrigatorio && (
                    <div className="mt-3">
                      <label className="text-xs font-semibold uppercase text-slate-500">
                        Motivo da transferencia (obrigatorio)
                      </label>
                      <textarea
                        value={transferenciaMotivo}
                        onChange={(event) =>
                          setTransferenciaMotivo(event.target.value)
                        }
                        rows={2}
                        placeholder="Descreva por que o adolescente precisa mudar de alojamento"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none resize-none"
                      />
                    </div>
                  )}

                  {transferenciaVerificacao?.requer_justificativa &&
                    transferenciaAlojamentoId && (
                      <div className="mt-3">
                        <label className="text-xs font-semibold uppercase text-slate-500">
                          Justificativa (obrigatoria para este nivel)
                        </label>
                        <textarea
                          value={transferenciaJustificativa}
                          onChange={(event) =>
                            setTransferenciaJustificativa(event.target.value)
                          }
                          rows={2}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none resize-none"
                        />
                      </div>
                    )}

                  {transferenciaErro && (
                    <p className="mt-2 text-sm text-rose-600">{transferenciaErro}</p>
                  )}

                  {sugestoes.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {sugestoes.map((sugestao) => (
                        <div
                          key={sugestao.alojamentoId}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {sugestao.casaNome} - Aloj. {sugestao.numero}
                                {sugestao.ala ? ` (Ala ${sugestao.ala})` : ""}
                              </p>
                              <p className="text-xs text-slate-500">
                                {sugestao.rotulo}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => aplicarSugestao(sugestao)}
                              className="rounded-full border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Usar
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            {sugestao.descricao}
                          </p>
                          {sugestoes &&
                            sugestao.alertas.length > 0 && (
                              <ul className="mt-2 list-disc pl-4 text-xs text-rose-600 space-y-1">
                                {sugestao.alertas.map((alerta, idx) => (
                                  <li
                                    key={`alerta-${sugestao.alojamentoId}-${idx}`}
                                  >
                                    {alerta}
                                  </li>
                                ))}
                              </ul>
                            )}
                          {sugestao.ambientais.length > 0 && (
                            <ul className="mt-2 list-disc pl-4 text-xs text-amber-600 space-y-1">
                              {sugestao.ambientais.map((motivo, idx) => (
                                <li
                                  key={`ambiental-${sugestao.alojamentoId}-${idx}`}
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

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={confirmarTransferencia}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                      disabled={transferindo || !transferenciaAlojamentoId || !transferenciaVerificacao}
                    >
                      {transferindo ? "Processando..." : !transferenciaVerificacao ? "Verificando riscos..." : "Confirmar transferencia"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 bg-slate-50">
                  Este alojamento esta livre. Para transferir alguem, selecione um
                  adolescente hospedado.
                </div>
              )}
            </section>
          )}

          {abaAtiva === "interdicao" && (
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Interdicao do alojamento
              </h3>
              <p className="text-sm text-slate-600 mb-3">
                Registre ou atualize os dados da interdicao informando justificativa, tipo e referencia do documento
                (CI, decisao judicial ou outro).
              </p>
              <p className="text-xs text-slate-500 mb-3">
                Apenas alojamentos livres podem ser interditados. Se houver ocupante, realize a transferencia antes.
              </p>
              {!podeInterditar && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Remova ou transfira o adolescente atual antes de prosseguir com a interdicao.
                </div>
              )}
              {somenteLeitura && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Acesso somente leitura: interdição está bloqueada para seu perfil.
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-[1.3fr,0.9fr]">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Justificativa
                  </label>
                  <textarea
                    value={interdicaoJustificativa}
                    onChange={(event) => setInterdicaoJustificativa(event.target.value)}
                    rows={2}
                    disabled={somenteLeitura}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none resize-none"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      Tipo do documento
                    </label>
                    <select
                      value={interdicaoDocumentoTipo}
                      onChange={(event) =>
                        setInterdicaoDocumentoTipo(
                          event.target.value as InterdicaoDocumentoTipo
                        )
                      }
                      disabled={somenteLeitura}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none bg-white"
                    >
                      <option value="">Selecione</option>
                      {INTERDICAO_TIPOS.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      Referencia
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: CI 123/2025"
                      value={interdicaoDocumentoReferencia}
                      onChange={(event) =>
                        setInterdicaoDocumentoReferencia(event.target.value)
                      }
                      disabled={somenteLeitura}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {interdicaoErro && (
                <p className="mt-2 text-sm text-rose-600">{interdicaoErro}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {statusInterditado && (
                  <button
                    type="button"
                    onClick={() => executarInterdicao("INTERDITAR", false)}
                    disabled={interdicaoLoading || somenteLeitura}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {interdicaoLoading ? "Processando..." : "Atualizar dados"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    executarInterdicao(statusInterditado ? "LIBERAR" : "INTERDITAR")
                  }
                  disabled={
                    interdicaoLoading ||
                    somenteLeitura ||
                    (!statusInterditado && !podeInterditar)
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                    statusInterditado
                      ? "bg-slate-600 hover:bg-slate-500"
                      : "bg-red-600 hover:bg-red-500"
                  } ${
                    somenteLeitura || (!statusInterditado && !podeInterditar)
                      ? "opacity-60 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {interdicaoLoading
                    ? "Processando..."
                    : statusInterditado
                    ? "Liberar alojamento"
                    : "Interditar alojamento"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
    {diagnosticoAberto && diagnosticoCasa && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-8">
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
                  Bloqueados por vigilancia: {diagnosticoCasa.bloqueadosVigilancia}
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
                                : oc.nome
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
                            {alojamento.risco.ambientais.map((alerta, idx) => (
                              <li key={`${alojamento.id}-ambiental-${idx}`}>
                                {alerta}
                              </li>
                            ))}
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
    </>
  );
}
