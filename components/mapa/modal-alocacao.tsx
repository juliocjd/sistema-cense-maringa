"use client";

import { useState } from "react";
import { X, AlertTriangle, Search, CheckCircle, XCircle } from "lucide-react";

type Adolescente = any;
type Alojamento = any;

type VerificacaoConflito = {
  permite_alocacao: boolean;
  requer_justificativa: boolean;
  nivel_risco: "CRÍTICO" | "ALTO" | "MÉDIO" | "BAIXO" | null;
  alertas: {
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
    justificativa?: string
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
  const [loading, setLoading] = useState(false);

  if (!isOpen || !alojamento) return null;

  // Filtrar adolescentes disponíveis (sem alojamento atual)
  const adolescentesDisponiveis = adolescentes.filter(
    (a) => !a.alojamentoAtualId && a.statusUnidade === "ATIVO"
  );

  const adolescentesFiltrados = adolescentesDisponiveis.filter(
    (a) =>
      a.nomeCompleto.toLowerCase().includes(busca.toLowerCase()) ||
      a.numeroSms?.includes(busca)
  );

  // Verificação de conflitos com API REAL
  const verificarConflitos = async (adolescente: Adolescente) => {
    setLoading(true);

    try {
      // Chamar API de verificação de alocação
      const response = await fetch(
        `/api/verificar-alocacao?adolescenteId=${adolescente.id}&alojamentoId=${alojamento.id}`
      );

      if (!response.ok) {
        throw new Error("Erro ao verificar alocação");
      }

      const data = await response.json();

      // Transformar resposta da API para o formato esperado
      const verificacaoAPI: VerificacaoConflito = {
        permite_alocacao: data.permite_alocacao,
        requer_justificativa: data.requer_justificativa,
        nivel_risco: data.nivel_risco,
        alertas: data.alertas || [],
      };

      setVerificacao(verificacaoAPI);
    } catch (error) {
      console.error("Erro ao verificar conflitos:", error);
      alert(
        "Erro ao verificar conflitos. Verifique se o banco de dados está configurado."
      );

      // Em caso de erro, permitir alocação mas avisar
      setVerificacao({
        permite_alocacao: true,
        requer_justificativa: false,
        nivel_risco: null,
        alertas: [
          {
            tipo: "ERRO_VERIFICACAO",
            nivel: 0,
            mensagem:
              "⚠️ Não foi possível verificar conflitos. Prossiga com cautela.",
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
    verificarConflitos(adolescente);
  };

  const handleConfirmarAlocacao = async () => {
    if (!adolescenteSelecionado) return;

    if (verificacao?.requer_justificativa && !justificativa.trim()) {
      alert("Justificativa obrigatória para este nível de risco!");
      return;
    }

    setLoading(true);
    try {
      await onAlocar(
        adolescenteSelecionado.id,
        alojamento.id,
        verificacao?.requer_justificativa ? justificativa : undefined
      );

      // Resetar e fechar
      setAdolescenteSelecionado(null);
      setVerificacao(null);
      setJustificativa("");
      setBusca("");
      onClose();
    } catch (error) {
      console.error("Erro ao alocar:", error);
      alert("Erro ao realizar alocação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const getNivelCorClass = (nivel: string | null) => {
    switch (nivel) {
      case "CRÍTICO":
        return "text-red-600 bg-red-50 border-red-200";
      case "ALTO":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "MÉDIO":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-green-600 bg-green-50 border-green-200";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Alocar Adolescente</h2>
            <p className="text-rose-100 text-sm mt-1">
              Alojamento {alojamento.numeroAlojamento} - {alojamento.casa?.nome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {!adolescenteSelecionado ? (
            // ETAPA 1: Seleção de Adolescente
            <div>
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
                    placeholder="Nome ou número SMS..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Lista de Adolescentes */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {adolescentesFiltrados.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum adolescente disponível</p>
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

                      {/* Informações */}
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
            </div>
          ) : (
            // ETAPA 2: Verificação e Confirmação
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

              {/* Resultado da Verificação */}
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
                            : "Alocação Segura"}
                        </p>
                        <p className="text-sm opacity-80">
                          {verificacao.requer_justificativa
                            ? "Justificativa obrigatória"
                            : "Nenhum conflito crítico detectado"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Alertas */}
                  {verificacao.alertas.length > 0 && (
                    <div className="mb-6 space-y-3">
                      <h4 className="font-semibold text-gray-800">
                        Alertas Detectados:
                      </h4>
                      {verificacao.alertas.map((alerta, index) => (
                        <div
                          key={index}
                          className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg"
                        >
                          <div className="flex items-start gap-3">
                            <AlertTriangle
                              size={20}
                              className="text-red-600 mt-0.5 flex-shrink-0"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-red-900">
                                {alerta.tipo.replace(/_/g, " ")} - Nível{" "}
                                {alerta.nivel}
                              </p>
                              <p className="text-sm text-red-800 mt-1">
                                {alerta.mensagem}
                              </p>
                              {alerta.adolescente_conflitante && (
                                <p className="text-sm text-red-700 mt-2">
                                  <span className="font-semibold">
                                    Conflito com:
                                  </span>{" "}
                                  {alerta.adolescente_conflitante.nome}{" "}
                                  (Alojamento{" "}
                                  {alerta.adolescente_conflitante.alojamento})
                                </p>
                              )}
                              {alerta.origem && (
                                <p className="text-xs text-red-600 mt-1">
                                  Origem: {alerta.origem}
                                </p>
                              )}
                              {alerta.recomendacao && (
                                <p className="text-sm text-red-700 mt-2 bg-red-100 p-2 rounded">
                                  💡 {alerta.recomendacao}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Campo de Justificativa */}
                  {verificacao.requer_justificativa && (
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Justificativa Obrigatória *
                      </label>
                      <textarea
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                        placeholder="Explique os motivos da decisão de alocar mesmo com os riscos detectados..."
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all resize-none"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        A justificativa será registrada permanentemente no
                        sistema.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t-2 border-gray-200 p-6 bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
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
                  Confirmar Alocação
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
