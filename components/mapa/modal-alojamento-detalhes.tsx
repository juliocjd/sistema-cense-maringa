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
  nivel_risco: "CRITICO" | "ALTO" | "MEDIO" | "BAIXO" | null;
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
  onDesinternar: (adolescenteId: string) => Promise<void>;
  onTransferir: (
    adolescente: Adolescente,
    destinoAlojamentoId: string,
    justificativa?: string
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
}

const nivelClasses: Record<string, string> = {
  CRITICO: "border-red-200 bg-red-50 text-red-700",
  ALTO: "border-orange-200 bg-orange-50 text-orange-700",
  MEDIO: "border-yellow-200 bg-yellow-50 text-yellow-700",
  BAIXO: "border-green-200 bg-green-50 text-green-700",
  DEFAULT: "border-slate-200 bg-slate-50 text-slate-600",
};

export default function ModalAlojamentoDetalhes({
  isOpen,
  alojamento,
  avaliacaoRisco,
  onClose,
  casas,
  conflitosExternos,
  onDesalocar,
  onDesinternar,
  onTransferir,
  onSolicitarAlocacao,
  onInterditar,
  onLiberarInterdicao,
}: ModalAlojamentoDetalhesProps) {
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

  const [transferenciaCasaId, setTransferenciaCasaId] = useState("");
  const [transferenciaAlojamentoId, setTransferenciaAlojamentoId] =
    useState("");
  const [transferenciaVerificacao, setTransferenciaVerificacao] =
    useState<VerificacaoConflito | null>(null);
  const [transferenciaJustificativa, setTransferenciaJustificativa] =
    useState("");
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
  const [mostrarBreakdownRisco, setMostrarBreakdownRisco] = useState(false);

  const statusInterditado = alojamento?.statusManutencao === "INTERDITADO";
  const podeInterditar = !ocupante;

  const resetarFluxoTransferencia = () => {
    setTransferenciaCasaId("");
    setTransferenciaAlojamentoId("");
    setTransferenciaVerificacao(null);
    setTransferenciaJustificativa("");
    setTransferenciaErro(null);
    setTransferindo(false);
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
  }, [ocupante?.id, abaAtiva]);

  // Auto-verify risk when alojamento is selected for transfer
  useEffect(() => {
    if (transferenciaAlojamentoId && ocupante) {
      verificarTransferencia();
    }
  }, [transferenciaAlojamentoId, ocupante?.id]);

  const impactosPorConflito = useMemo(() => {
    const mapa = new Map<string, ImpactoConflitoExterno[]>();
    Object.values(conflitosExternos).forEach((lista) => {
      lista.forEach((impacto) => {
        if (!mapa.has(impacto.conflitoId)) {
          mapa.set(impacto.conflitoId, []);
        }
        mapa.get(impacto.conflitoId)!.push(impacto);
      });
    });
    return mapa;
  }, [conflitosExternos]);

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
    MESMA_ALA: "Mesma ala (alto risco)",
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

  const conflitosInternosAtivos = useMemo(
    () => conflitosInternos.filter((conflito) => conflito.status !== "RESOLVIDO"),
    [conflitosInternos]
  );

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
      };
    };

    if (ocupante.alertaRiscoSuicidio) {
      const info = construirInfoAlerta(
        "RISCO_SUICIDIO",
        "Marcado no cadastro do adolescente."
      );
      riscos.push({
        titulo: "Risco de suicidio",
        descricao: info.descricao,
        nivel: "ALTO",
        alertaEspecialTipo: info.tipoAlerta,
        alertaEspecialId: info.alertaId,
        adolescenteId: ocupante.id,
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

    const externos = conflitosExternos[ocupante.id] ?? [];

    // Agrupar conflitos externos por conflitoId para evitar duplicação
    const conflitosProcessados = new Set<string>();

    externos.forEach((impacto) => {
      // Evitar processar o mesmo conflito múltiplas vezes
      if (conflitosProcessados.has(impacto.conflitoId)) {
        return;
      }
      conflitosProcessados.add(impacto.conflitoId);

      // Buscar TODOS os registros deste conflito
      const todosRelacionados =
        impactosPorConflito
          .get(impacto.conflitoId)
          ?.filter((registro) => registro.adolescente.id !== ocupante.id) ??
        [];

      // Filtrar apenas os RIVAIS (do bairro/facção oposta), não os aliados do mesmo bairro/facção
      const rivaisReais = todosRelacionados.filter((registro) => {
        if (impacto.conflitoTipo === "BAIRRO") {
          // O adolescente rival deve ser do bairro de DESTINO do conflito (não do mesmo bairro do ocupante)
          // IMPORTANTE: O campo é "bairro", não "bairroOrigem"
          return registro.adolescente.bairro?.id === impacto.conflitoDestino.id;
        } else if (impacto.conflitoTipo === "FACCAO") {
          // O adolescente rival deve ser da facção de DESTINO do conflito (não da mesma facção do ocupante)
          return registro.adolescente.faccao?.id === impacto.conflitoDestino.id;
        }
        return false;
      });

      // Mapear TODOS os rivais reais encontrados
      const envolvidos =
        rivaisReais.length > 0
          ? rivaisReais.map((registro) => {
              const localDireto = localizarAdolescente(
                registro.adolescente.id
              );
              const fallback = registro.adolescente.alojamento
                ? {
                    casa: registro.adolescente.alojamento.casa?.nome ?? null,
                    numero: registro.adolescente.alojamento.numero ?? null,
                    ala: registro.adolescente.alojamento.ala ?? null,
                  }
                : null;

              return {
                id: registro.adolescente.id,
                nome: registro.adolescente.nome,
                local: formatarLocalizacao(localDireto ?? fallback ?? undefined),
              };
            })
          : undefined;

      const destinoComplemento = impacto.conflitoDestino.complemento
        ? ` (${impacto.conflitoDestino.complemento})`
        : "";

      // Criar UM ÚNICO card com TODOS os rivais deste conflito
      riscos.push({
        titulo:
          impacto.conflitoTipo === "FACCAO"
            ? `Rivais por facção: ${impacto.conflitoDestino.nome}${destinoComplemento}`
            : `Rivais territoriais: ${impacto.conflitoDestino.nome}${destinoComplemento}`,
        descricao:
          impacto.conflitoTipo === "FACCAO"
            ? `Adolescentes da facção rival ${impacto.conflitoDestino.nome} alocados na unidade.`
            : `Adolescentes do bairro rival ${impacto.conflitoDestino.nome}${destinoComplemento} alocados na unidade.`,
        nivel:
          impacto.risco === "ALTO"
            ? "ALTO"
            : impacto.risco === "MEDIO"
            ? "MEDIO"
            : "BAIXO",
        envolvidos,
      });
    });

    conflitosInternosAtivos.forEach((conflito) => {
      const adversario = conflito.adversario;
      const localAdversario = localizarAdolescente(adversario?.id);

      riscos.push({
        titulo: `Conflito interno (${conflito.tipoConflito ?? "N/I"})`,
        descricao: conflito.descricao ?? "Registro interno.",
        nivel: "ALTO",
        envolvidos: adversario
          ? [
              {
                id: adversario.id,
                nome: adversario.nomeCompleto,
                local: formatarLocalizacao(localAdversario ?? undefined),
              },
            ]
          : undefined,
      });
    });

    return riscos;
  }, [
    ocupante,
    conflitosExternos,
    impactosPorConflito,
    conflitosInternosAtivos,
    alertasEspeciaisPorTipo,
  ]);

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

  const confirmarTransferencia = async () => {
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

    setTransferindo(true);
    setTransferenciaErro(null);
    try {
      await onTransferir(
        ocupante,
        transferenciaAlojamentoId,
        transferenciaVerificacao.requer_justificativa
          ? transferenciaJustificativa
          : undefined
      );
      setTransferenciaCasaId("");
      setTransferenciaAlojamentoId("");
      setTransferenciaJustificativa("");
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
    if (!ocupante) return;
    setCarregandoSugestoes(true);
    setErroSugestoes(null);
    try {
      const response = await fetch(
        `/api/alocar/sugestoes?adolescenteId=${ocupante.id}`
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.erro ?? "Falha ao buscar sugestoes");
      }
      const payload = await response.json();
      setSugestoes(
        Array.isArray(payload?.sugestoes) ? payload.sugestoes : []
      );
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
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ocupante.bairroOrigem && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold">
                        <MapPin size={12} />
                        {ocupante.bairroOrigem.nome}
                        {ocupante.bairroOrigem.cidade
                          ? ` - ${ocupante.bairroOrigem.cidade}`
                          : ""}
                      </span>
                    )}
                    {ocupante.faccao && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold">
                        <Shield size={12} />
                        {ocupante.faccao.nome}
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

        <div className="max-h-[80vh] overflow-y-auto px-6 py-6 space-y-6">
          <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
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

          {statusInterditado && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
              Este alojamento esta interditado. Atualize os dados ou libere o leito na aba
              Interdicao.
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
                                    const parsed = parseDetalheMensagem(detalhe.mensagem);

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
                                  {avaliacaoRisco.ambiental.motivos.map((motivo, idx) => (
                                    <li key={idx}>• {motivo}</li>
                                  ))}
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
                      {avaliacaoRisco.ambiental.motivos.map((motivo, index) => {
                        const info = formatarMotivoAmbiental(motivo);

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

                        // Fallback: exibir texto original se não conseguir parsear
                        return (
                          <li key={`ambiental-${index}`} className="text-xs">
                            {info.textoOriginal}
                          </li>
                        );
                      })}
                    </div>
                  </div>
                )}
                  </div>

                  {riscosDetalhados.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-slate-600" />
                        <p className="text-xs font-semibold uppercase text-slate-600">
                          Conflitos e Justificativas de Risco
                        </p>
                      </div>
                      <div className="space-y-2">
                        {riscosDetalhados.map((risco, index) => {
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
                          return (
                            <div
                              key={`${risco.titulo}-${index}`}
                              className={`rounded-lg border p-3 ${classe}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-lg">⚔️</span>
                                <div className="flex-1 space-y-1">
                                  <p className="text-xs font-bold text-slate-800">{risco.titulo}</p>

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
                                          <Link
                                            href={alertaLink}
                                            className="inline-flex items-center rounded-full border border-white/70 bg-white/60 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-white whitespace-nowrap"
                                          >
                                            Ver alerta
                                          </Link>
                                        )}
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
                                {conflito.resolvidoEm && (
                                  <span className="text-xs text-emerald-700">
                                    Resolvido em {formatarDataCurta(conflito.resolvidoEm)}
                                  </span>
                                )}
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

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        onDesalocar(alojamento.id, ocupante.id, "Remocao manual")
                      }
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Remover do alojamento
                    </button>
                    <button
                      type="button"
                      onClick={() => onDesinternar(ocupante.id)}
                      className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                    >
                      Desinternar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Este alojamento esta livre. Utilize o botao abaixo para iniciar
                    uma nova alocacao.
                  </p>
                  <button
                    type="button"
                    onClick={onSolicitarAlocacao}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    Alocar adolescente
                  </button>
                </div>
              )}
            </section>
          )}

          {abaAtiva === "transferencia" && (
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Transferir / realocar
              </h3>

              {ocupante ? (
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
                      <span className="text-xs text-rose-600">
                        {erroSugestoes}
                      </span>
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

              <div className="grid gap-4 lg:grid-cols-[1.3fr,0.9fr]">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Justificativa
                  </label>
                  <textarea
                    value={interdicaoJustificativa}
                    onChange={(event) => setInterdicaoJustificativa(event.target.value)}
                    rows={2}
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
                    disabled={interdicaoLoading}
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
                    interdicaoLoading || (!statusInterditado && !podeInterditar)
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                    statusInterditado
                      ? "bg-slate-600 hover:bg-slate-500"
                      : "bg-red-600 hover:bg-red-500"
                  } ${
                    !statusInterditado && !podeInterditar
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
  );
}
