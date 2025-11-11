"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  AlertTriangle,
  Lock,
  Activity,
  Shield,
  MapPin,
  CheckCircle,
} from "lucide-react";

import type { Adolescente, Alojamento, Casa, Conflito } from "@/types";
import type { ImpactoConflitoExterno } from "@/types/inteligencia";

type TabKey = "ocupacao" | "transferencia" | "interdicao";

type RiscoEnvolvido = {
  id?: string;
  nome: string;
  local?: string | null;
};

type RiscoDetalhado = {
  titulo: string;
  descricao: string;
  nivel: "CRITICO" | "ALTO" | "MEDIO" | "BAIXO" | "DEFAULT";
  envolvidos?: RiscoEnvolvido[];
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
    numeroCi: string
  ) => Promise<void>;
  onLiberarInterdicao: (
    alojamentoId: string,
    justificativa: string,
    numeroCi: string
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
  const [interdicaoCi, setInterdicaoCi] = useState("");
  const [interdicaoLoading, setInterdicaoLoading] = useState(false);
  const [interdicaoErro, setInterdicaoErro] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<TabKey>("ocupacao");
  const [sugestoes, setSugestoes] = useState<SugestaoApi[]>([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [erroSugestoes, setErroSugestoes] = useState<string | null>(null);

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
    setInterdicaoCi("");
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
    setSugestoes([]);
    setErroSugestoes(null);
    setCarregandoSugestoes(false);
  }, [ocupante?.id, abaAtiva]);

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

  const localizarAdolescente = (adolescenteId?: string | null) => {
    if (!adolescenteId) return null;
    for (const casa of casas) {
      for (const aloj of casa.alojamentos) {
        if (aloj.adolescentes.some((a) => a.id === adolescenteId)) {
          return {
            casa: casa.nome,
            numero: aloj.numeroAlojamento,
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

    const riscos: RiscoDetalhado[] = [];

    if (ocupante.alertaRiscoSuicidio) {
      riscos.push({
        titulo: "Risco de suicidio",
        descricao: "Marcado no cadastro do adolescente.",
        nivel: "ALTO",
      });
    }

    if (ocupante.alertaPerfilMapeado) {
      riscos.push({
        titulo: "Perfil mapeado",
        descricao: "Perfis conflituosos registrados pela inteligencia.",
        nivel: "MEDIO",
      });
    }

    if (ocupante.alertaSaudeConfidencial) {
      riscos.push({
        titulo: "Alerta de saude",
        descricao: ocupante.alertaSaudeDetalhes ?? "Detalhe confidencial.",
        nivel: "MEDIO",
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

      // DEBUG
      if (todosRelacionados.length > 0) {
        console.log('=== DEBUG Conflito Externo ===');
        console.log('Ocupante:', ocupante.nomeCompleto);
        console.log('Conflito:', impacto.conflitoDestino.nome);
        console.log('Tipo:', impacto.conflitoTipo);
        console.log('Total relacionados:', todosRelacionados.length);
        todosRelacionados.forEach(r => {
          console.log('  - ', r.adolescente.nome, 'Bairro:', r.adolescente.bairro?.nome, 'ID:', r.adolescente.bairro?.id);
        });
        console.log('Destino ID:', impacto.conflitoDestino.id);
      }

      // Filtrar apenas os RIVAIS (do bairro/facção oposta), não os aliados do mesmo bairro/facção
      const rivaisReais = todosRelacionados.filter((registro) => {
        if (impacto.conflitoTipo === "BAIRRO") {
          // O adolescente rival deve ser do bairro de DESTINO do conflito (não do mesmo bairro do ocupante)
          // IMPORTANTE: O campo é "bairro", não "bairroOrigem"
          const match = registro.adolescente.bairro?.id === impacto.conflitoDestino.id;
          console.log('    Comparando:', registro.adolescente.nome, match ? '✓ MATCH' : '✗ NO MATCH');
          return match;
        } else if (impacto.conflitoTipo === "FACCAO") {
          // O adolescente rival deve ser da facção de DESTINO do conflito (não da mesma facção do ocupante)
          return registro.adolescente.faccao?.id === impacto.conflitoDestino.id;
        }
        return false;
      });

      // DEBUG
      console.log('Rivais reais encontrados:', rivaisReais.length);

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
            ? "Conflito externo - faccao"
            : "Conflito externo - bairro",
        descricao: `Risco ativo envolvendo ${impacto.conflitoDestino.nome}${destinoComplemento}.`,
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
      await verificarTransferencia();
      if (!transferenciaVerificacao) return;
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
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erro ao transferir adolescente.";
      setTransferenciaErro(msg);
    } finally {
      setTransferindo(false);
    }
  };

  const handleInterdicao = async () => {
    if (!alojamento) return;

    if (!interdicaoJustificativa.trim() || !interdicaoCi.trim()) {
      setInterdicaoErro("Informe justificativa e numero da CI.");
      return;
    }

    setInterdicaoLoading(true);
    setInterdicaoErro(null);

    try {
      if (statusInterditado) {
        await onLiberarInterdicao(
          alojamento.id,
          interdicaoJustificativa.trim(),
          interdicaoCi.trim()
        );
      } else {
        if (!podeInterditar) {
          setInterdicaoErro(
            "Remova ou transfira o adolescente antes de interditar o alojamento."
          );
          return;
        }
        await onInterditar(
          alojamento.id,
          interdicaoJustificativa.trim(),
          interdicaoCi.trim()
        );
      }

      setInterdicaoJustificativa("");
      setInterdicaoCi("");
      onClose();
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
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-indigo-500">
              Alojamento {alojamento.numeroAlojamento} -{" "}
              {alojamento.casa?.nome ?? ""}
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Status:{" "}
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${colorClass}`}>
                {statusInterditado ? "Interditado" : "Operacional"}
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-6 space-y-6">
          <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
            {(
              [
                { id: "ocupacao", label: "Ocupacao atual" },
                { id: "transferencia", label: "Transferir / realocar" },
                { id: "interdicao", label: "Interdicao" },
              ] as Array<{ id: TabKey; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAbaAtiva(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  abaAtiva === tab.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {abaAtiva === "ocupacao" && (
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Ocupacao atual
              </h3>

              {ocupante ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-xl font-bold text-slate-900">
                      {ocupante.nomeCompleto}
                    </p>
                    <p className="text-sm text-slate-500">
                      SMS: {ocupante.numeroSms ?? "Nao informado"}
                    </p>
                    {ocupante.bairroOrigem && (
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <MapPin size={14} />
                        {ocupante.bairroOrigem.nome} - {ocupante.bairroOrigem.cidade}
                      </p>
                    )}
                    {ocupante.faccao && (
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Shield size={14} />
                        {ocupante.faccao.nome}
                      </p>
                    )}
                    {avaliacaoRisco && (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-600">
                          Nivel de risco atual:{" "}
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
                    )}
                {avaliacaoRisco?.ambiental?.ativo && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <p className="font-semibold">Ala em tensao</p>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      {avaliacaoRisco.ambiental.motivos.map((motivo, index) => (
                        <li key={`ambiental-${index}`}>{motivo}</li>
                      ))}
                    </ul>
                  </div>
                )}
                  </div>

                  {riscosDetalhados.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">
                        Conflitos e justificativas do risco:
                      </p>
                      <div className="space-y-2">
                        {riscosDetalhados.map((risco, index) => {
                          const classe =
                            nivelClasses[risco.nivel ?? "DEFAULT"] ??
                            nivelClasses.DEFAULT;
                          return (
                            <div
                              key={`${risco.titulo}-${index}`}
                              className={`rounded-xl border px-3 py-2 text-sm ${classe}`}
                            >
                              <p className="font-semibold">{risco.titulo}</p>
                              {risco.envolvidos && risco.envolvidos.length > 0 && (
                                <ul className="mt-1 space-y-1 text-xs text-slate-600">
                                  {risco.envolvidos.map((envolvido, idx) => (
                                    <li key={`${envolvido.id ?? envolvido.nome}-${idx}`}>
                                      <span className="font-semibold text-slate-800">
                                        {envolvido.nome}
                                      </span>
                                      {envolvido.local && (
                                        <span className="text-slate-600"> • {envolvido.local}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <p className="mt-1 text-sm leading-relaxed">
                                {risco.descricao}
                              </p>
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
                              localizarAdolescente(adversarioId)
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
                    <div
                      className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                        transferenciaVerificacao.nivel_risco === "CRITICO"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : transferenciaVerificacao.nivel_risco === "ALTO"
                          ? "border-orange-200 bg-orange-50 text-orange-700"
                          : "border-yellow-200 bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      <p className="font-semibold">
                        Nivel:
                        {" "}
                        {transferenciaVerificacao.nivel_risco ?? "Sem classificacao"}
                      </p>
                      {transferenciaVerificacao.alertas.length > 0 && (
                        <ul className="mt-2 list-disc pl-4">
                          {transferenciaVerificacao.alertas.map((alerta, index) => (
                            <li key={`${alerta.tipo}-${index}`}>{alerta.mensagem}</li>
                          ))}
                        </ul>
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
                      onClick={verificarTransferencia}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                      disabled={transferindo || !transferenciaAlojamentoId}
                    >
                      Verificar riscos
                    </button>
                    <button
                      type="button"
                      onClick={confirmarTransferencia}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                      disabled={transferindo || !transferenciaAlojamentoId}
                    >
                      {transferindo ? "Processando..." : "Confirmar transferencia"}
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
                Registre a interdicao ou liberacao do alojamento com justificativa e numero da CI correspondente.
              </p>
              <p className="text-xs text-slate-500 mb-3">
                Apenas alojamentos livres podem ser interditados.
              </p>
              {!podeInterditar && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Remova ou transfira o adolescente atual antes de prosseguir com a interdicao.
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
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
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Numero da CI
                  </label>
                  <input
                    type="text"
                    value={interdicaoCi}
                    onChange={(event) => setInterdicaoCi(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {interdicaoErro && (
                <p className="mt-2 text-sm text-rose-600">{interdicaoErro}</p>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleInterdicao}
                  disabled={interdicaoLoading || (!statusInterditado && !podeInterditar)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                    statusInterditado
                      ? "bg-emerald-600 hover:bg-emerald-500"
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



