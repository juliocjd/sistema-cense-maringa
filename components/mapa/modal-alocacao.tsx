"use client";

import { useState, useEffect, useMemo } from "react";
import { X, AlertTriangle, Search, CheckCircle, XCircle } from "lucide-react";

type Adolescente = any;
type Alojamento = any;

type VerificacaoConflito = {
  permite_alocacao: boolean;
  requer_justificativa: boolean;
  nivel_risco:
    | "CRITICO"
    | "ALTO"
    | "MEDIO"
    | "BAIXO"
    | "MONITORAR"
    | "SEGURO"
    | "LIVRE"
    | null;
  nivel_numerico: number | null;
  alertas: {
    tipo: string;
    nivel: number;
    mensagem: string;
    conflitoId?: string;
    conflitoCriadoEm?: string | null;
    alertaId?: string;
    alertaCriadoEm?: string | null;
    adolescente_conflitante?: {
      id: string;
      nome: string;
      alojamento: string;
    };
    origem?: string;
    tipo_conflito?: string;
    recomendacao?: string;
  }[];
};

interface ModalAlocacaoProps {
  isOpen: boolean;
  onClose: () => void;
  alojamento: Alojamento | null;
  adolescentes: Adolescente[];
  onAlocar: (
    adolescenteId: string,
    alojamentoId: string,
    justificativa?: string,
    motivoTransferencia?: string,
    motivoTransferenciaObrigatorio?: boolean
  ) => Promise<void>;
}

export function ModalAlocacao({
  isOpen,
  onClose,
  alojamento,
  adolescentes,
  onAlocar,
}: ModalAlocacaoProps) {
  const [busca, setBusca] = useState("");
  const [adolescenteSelecionado, setAdolescenteSelecionado] =
    useState<Adolescente | null>(null);
  const [verificacao, setVerificacao] = useState<VerificacaoConflito | null>(
    null
  );
  const [justificativa, setJustificativa] = useState("");
  const [motivoTransferencia, setMotivoTransferencia] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{
    tipo: "erro" | "info";
    texto: string;
  } | null>(null);

  const alertasAgrupados = useMemo(() => {
    if (!verificacao?.alertas?.length) return [];

    const mapa = new Map<
      string,
      {
        tipo: string;
        nivel: number;
        mensagens: string[];
        conflitos: Array<{ id: string; data?: string | null }>;
        alertas: Array<{ id: string; data?: string | null }>;
      }
    >();

    verificacao.alertas.forEach((alerta) => {
      const tipoKey = (alerta.tipo ?? "OUTRO").toUpperCase();
      const msgNorm = (alerta.mensagem ?? "").trim();

      const entry =
        mapa.get(tipoKey) ??
        mapa
          .set(tipoKey, {
            tipo: tipoKey,
            nivel: alerta.nivel ?? 0,
            mensagens: [],
            conflitos: [],
            alertas: [],
          })
          .get(tipoKey)!;

      entry.nivel = Math.max(entry.nivel, alerta.nivel ?? 0);
      if (msgNorm && !entry.mensagens.includes(msgNorm)) {
        entry.mensagens.push(msgNorm);
      }

      if (alerta.conflitoId && !entry.conflitos.some((c) => c.id === alerta.conflitoId)) {
        entry.conflitos.push({ id: alerta.conflitoId, data: alerta.conflitoCriadoEm ?? null });
      }

      if (alerta.alertaId && !entry.alertas.some((a) => a.id === alerta.alertaId)) {
        entry.alertas.push({ id: alerta.alertaId, data: alerta.alertaCriadoEm ?? null });
      }
    });

    return Array.from(mapa.values());
  }, [verificacao?.alertas]);

  const resetarEstado = () => {
    setBusca("");
    setAdolescenteSelecionado(null);
    setVerificacao(null);
    setJustificativa("");
    setMotivoTransferencia("");
    setMensagem(null);
  };

  const formatarLocalAtual = (aloj?: any): string | null => {
    if (!aloj) return null;
    const casa = aloj.casa?.nome ?? aloj.casaNome ?? null;
    const numero =
      aloj.numero ??
      aloj.numeroAlojamento ??
      aloj.descricao ??
      aloj.nome ??
      null;
    const ala = aloj.ala ? `Ala ${aloj.ala}` : null;
    const partes = [casa, numero ? `Alojamento ${numero}` : null, ala].filter(
      Boolean
    ) as string[];
    if (partes.length === 0) return null;
    return partes.join(" - ");
  };

const riscoIndicaPerigo = (
  nivel?: string | null,
  nivelNumerico?: number | null
) => {
  if (typeof nivelNumerico === "number") {
    return nivelNumerico >= 3;
  }
  const texto = (nivel ?? "").toString().trim().toUpperCase();
  if (!texto) return false;
  return !["LIVRE", "SEGURO", "MONITORAR"].includes(texto);
};

  useEffect(() => {
    if (!isOpen) {
      resetarEstado();
    }
  }, [isOpen, alojamento?.id]);

  const handleFechar = () => {
    resetarEstado();
    onClose();
  };

  if (!isOpen || !alojamento) return null;

  // Filtrar adolescentes ativos (mesmo que ja alocados em outro alojamento)
  const adolescentesDisponiveis = adolescentes.filter((a) => {
    const ativo = (a.statusUnidade ?? "").toUpperCase() === "ATIVO";
    const ocupanteAtualId =
      Array.isArray(alojamento.adolescentes) && alojamento.adolescentes[0]
        ? alojamento.adolescentes[0].id
        : null;
    // Evita listar o mesmo ocupante do alojamento de destino
    const naoEhOcupanteDestino = a.id !== ocupanteAtualId;
    return ativo && naoEhOcupanteDestino;
  });

  const adolescentesFiltrados = adolescentesDisponiveis.filter(
    (a) =>
      a.nomeCompleto.toLowerCase().includes(busca.toLowerCase()) ||
      a.numeroSms?.includes(busca)
  );

  // Verificacao de conflitos com API REAL
  const verificarConflitos = async (adolescente: Adolescente) => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/verificar-alocacao?adolescenteId=${adolescente.id}&alojamentoId=${alojamento.id}`
      );

      if (!response.ok) {
        throw new Error("Erro ao verificar alocacao");
      }

      const data = await response.json();

      const verificacaoAPI: VerificacaoConflito = {
        permite_alocacao: data.permite_alocacao,
        requer_justificativa: data.requer_justificativa,
        nivel_risco: data.nivel_risco,
        nivel_numerico:
          typeof data.nivel_numerico === "number" ? data.nivel_numerico : null,
        alertas: data.alertas || [],
      };

      setVerificacao(verificacaoAPI);
    } catch (error) {
      setMensagem({
        tipo: "erro",
        texto: "Erro ao verificar conflitos. Prosseguir com cautela.",
      });

      setVerificacao({
        permite_alocacao: true,
        requer_justificativa: false,
        nivel_risco: null,
        nivel_numerico: null,
        alertas: [
          {
            tipo: "ERRO_VERIFICACAO",
            nivel: 0,
            mensagem:
              "Nao foi possivel verificar conflitos. Prossiga com cautela.",
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarAdolescente = (adolescente: Adolescente) => {
    setAdolescenteSelecionado(adolescente);
    setVerificacao(null);
    setJustificativa("");
    setMotivoTransferencia("");
    setMensagem(null);
    verificarConflitos(adolescente);
  };

  const handleConfirmarAlocacao = async () => {
    if (!adolescenteSelecionado) return;
    const jaAlocado = Boolean(adolescenteSelecionado.alojamentoAtualId);
    const riscoRelevante = riscoIndicaPerigo(
      verificacao?.nivel_risco,
      verificacao?.nivel_numerico
    );
    const exigeMotivoTransferencia = Boolean(jaAlocado && riscoRelevante);

    if (verificacao?.requer_justificativa && !justificativa.trim()) {
      setMensagem({
        tipo: "erro",
        texto: "Justificativa obrigatoria para este nivel de risco.",
      });
      return;
    }

    if (exigeMotivoTransferencia && !motivoTransferencia.trim()) {
      setMensagem({
        tipo: "erro",
        texto: "Informe o motivo da transferencia do alojamento atual.",
      });
      return;
    }

    setLoading(true);
    try {
      const justificativaLimpa = justificativa.trim();
      const motivoTransferenciaLimpo = motivoTransferencia.trim();
      await onAlocar(
        adolescenteSelecionado.id,
        alojamento.id,
        verificacao?.requer_justificativa && justificativaLimpa
          ? justificativaLimpa
          : undefined,
        exigeMotivoTransferencia
          ? motivoTransferenciaLimpo || "Transferencia interna via mapa"
          : undefined,
        exigeMotivoTransferencia
      );
      handleFechar();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao realizar alocacao.";
      setMensagem({ tipo: "erro", texto: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const getNivelCorClass = (nivel: string | null) => {
    switch (nivel) {
      case "CRITICO":
        return "text-red-600 bg-red-50 border-red-200";
      case "ALTO":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "MEDIO":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "BAIXO":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Cabecalho */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Alocar Adolescente</h2>
            <p className="text-rose-100 text-sm mt-1">
              Alojamento {alojamento.numeroAlojamento} - {alojamento.casa?.nome}
            </p>
          </div>
          <button
            onClick={handleFechar}
            className="hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Conteudo */}
        <div className="flex-1 overflow-y-auto p-6">
          {mensagem && (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                mensagem.tipo === "erro"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700"
              }`}
            >
              {mensagem.texto}
            </div>
          )}
          {!adolescenteSelecionado ? (
            <>
            <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Buscar Adolescente
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome ou numero SMS..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Lista de Adolescentes */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {adolescentesFiltrados.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum adolescente ativo encontrado</p>
                  </div>
                ) : (
                  adolescentesFiltrados.map((adolescente) => (
                    <button
                      key={adolescente.id}
                      onClick={() => handleSelecionarAdolescente(adolescente)}
                      className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-rose-500 hover:bg-rose-50 transition-all group"
                    >
                      {/* Foto */}
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold flex-shrink-0">
                        {adolescente.fotoUrl ? (
                          <img
                            src={adolescente.fotoUrl}
                            alt={adolescente.nomeCompleto}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          adolescente.nomeCompleto.charAt(0)
                        )}
                      </div>

                      {/* Informacoes */}
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-800 group-hover:text-rose-700">
                          {adolescente.nomeCompleto}
                        </p>
                        <p className="text-sm text-gray-600">
                          SMS: {adolescente.numeroSms || "N/A"}
                        </p>
                      </div>

                      {/* Alertas */}
                      <div className="flex gap-1">
                        {adolescente.alertaRiscoSuicidio && (
                          <div className="bg-orange-100 rounded-full p-1">
                            <AlertTriangle
                              size={16}
                              className="text-orange-600"
                            />
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
            ) : (
            // ETAPA 2: Verificacao e Confirmacao
            <div>
              {/* Adolescente Selecionado */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold text-xl">
                      {adolescenteSelecionado.fotoUrl ? (
                        <img
                          src={adolescenteSelecionado.fotoUrl}
                        alt={adolescenteSelecionado.nomeCompleto}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      adolescenteSelecionado.nomeCompleto.charAt(0)
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg text-gray-800">
                      {adolescenteSelecionado.nomeCompleto}
                    </p>
                    <p className="text-sm text-gray-600">
                      SMS: {adolescenteSelecionado.numeroSms || "N/A"}
                    </p>
                    {adolescenteSelecionado.alojamentoAtualId && (
                      <p className="text-xs font-semibold text-amber-700 mt-1">
                        {`Atualmente em: ${
                          formatarLocalAtual(adolescenteSelecionado.alojamentoAtual) ??
                          "Outro alojamento"
                        }`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setAdolescenteSelecionado(null);
                      setVerificacao(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Loading */}
              {loading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-rose-200 border-t-rose-600"></div>
                  <p className="mt-4 text-gray-600">Verificando conflitos...</p>
                </div>
              )}

              {/* Resultado da Verificacao */}
              {verificacao && !loading && (
                <div>
                  {/* Status Geral */}
                  <div
                    className={`mb-6 p-4 rounded-lg border-2 ${getNivelCorClass(
                      verificacao.nivel_risco
                    )}`}
                  >
                    <div className="flex items-center gap-3">
                      {verificacao.nivel_risco ? (
                        <AlertTriangle size={24} />
                      ) : (
                        <CheckCircle size={24} />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-lg">
                          {verificacao.nivel_risco
                            ? `Risco ${verificacao.nivel_risco} Detectado`
                            : "Alocacao Segura"}
                        </p>
                        <p className="text-sm opacity-80">
                          {verificacao.requer_justificativa
                            ? "Justificativa obrigatoria"
                            : "Nenhum conflito critico detectado"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Alertas */}
                  {alertasAgrupados.length > 0 && (
                    <div className="mb-6 space-y-3">
                      <h4 className="font-semibold text-gray-800">
                        Alertas Detectados:
                      </h4>
                      {alertasAgrupados.map((alerta, index) => (
                        <div
                          key={`${alerta.tipo}-${index}`}
                          className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg"
                        >
                          <div className="flex items-start gap-3">
                            <AlertTriangle
                              size={20}
                              className="text-red-600 mt-0.5 flex-shrink-0"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-red-900">
                                {alerta.tipo.replace(/_/g, " ")} - Nível {alerta.nivel}
                              </p>
                              {alerta.mensagens.map((msg, i) => (
                                <p key={`msg-${index}-${i}`} className="text-sm text-red-800 mt-1">
                                  {msg}
                                </p>
                              ))}

                              <div className="mt-2 flex flex-wrap gap-2">
                                {alerta.conflitos?.map((c) => (
                                  <a
                                    key={c.id}
                                    href={`/conflitos/${c.id}`}
                                    className="inline-flex items-center rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                                  >
                                    Ver conflito
                                    {c.data
                                      ? ` • ${new Date(c.data).toLocaleDateString("pt-BR")}`
                                      : ""}
                                  </a>
                                ))}
                                {alerta.alertas?.map((a) => (
                                  <a
                                    key={a.id}
                                    href={`/alertas/${a.id}`}
                                    className="inline-flex items-center rounded-full border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50"
                                  >
                                    Ver alerta
                                    {a.data
                                      ? ` • ${new Date(a.data).toLocaleDateString("pt-BR")}`
                                      : ""}
                                  </a>
                                ))}
                                {(!alerta.alertas || alerta.alertas.length === 0) &&
                                  alerta.tipo === "AMBIENTAL" &&
                                  (alerta.mensagens?.some((m) => /suicid/i.test(m)) ?? false) && (
                                    <a
                                      href={`/alertas${adolescenteSelecionado?.id ? `?adolescenteId=${adolescenteSelecionado.id}` : ""}`}
                                      className="inline-flex items-center rounded-full border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50"
                                    >
                                      Ver alerta
                                    </a>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}                  {/* Campo de Justificativa */}
                  {verificacao.requer_justificativa && (
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Justificativa Obrigatoria *
                      </label>
                      <textarea
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                        placeholder="Explique os motivos da decisao de alocar mesmo com os riscos detectados..."
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all resize-none"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        A justificativa sera registrada permanentemente no
                        sistema.
                      </p>
                    </div>
                  )}

                  {adolescenteSelecionado.alojamentoAtualId &&
                    riscoIndicaPerigo(
                      verificacao?.nivel_risco,
                      verificacao?.nivel_numerico
                    ) && (
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Motivo da transferencia *
                      </label>
                      <textarea
                        value={motivoTransferencia}
                        onChange={(e) => setMotivoTransferencia(e.target.value)}
                        placeholder="Informe por que o adolescente sera movido do alojamento atual para este."
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all resize-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodape */}
        <div className="border-t-2 border-gray-200 p-6 bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={handleFechar}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          {adolescenteSelecionado && verificacao && (
            <button
              onClick={handleConfirmarAlocacao}
              disabled={
                loading ||
                (verificacao.requer_justificativa && !justificativa.trim())
              }
              className="px-6 py-3 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Alocando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Confirmar Alocacao
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


