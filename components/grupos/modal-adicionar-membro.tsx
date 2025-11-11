"use client";

import { useState, useEffect } from "react";
import { X, Search, UserPlus, AlertTriangle, CheckCircle, Users } from "lucide-react";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  nomeSocial: string | null;
  numeroSms: string | null;
  fotoUrl: string | null;
  statusUnidade: string;
};

type AlertaConflito = {
  tipo: string;
  nivel: number;
  mensagem: string;
  adolescente?: {
    id: string;
    nome: string;
    grupo?: string;
  };
};

type RespostaVerificacao = {
  status: "REQUER_JUSTIFICATIVA";
  nivel: "CRITICO" | "ALTO" | "MEDIO";
  conflitos: AlertaConflito[];
  mensagem: string;
};

type ModalAdicionarMembroProps = {
  grupoId: string;
  nomeGrupo: string;
  onClose: () => void;
  onSucesso: () => void;
};

export function ModalAdicionarMembro({
  grupoId,
  nomeGrupo,
  onClose,
  onSucesso,
}: ModalAdicionarMembroProps) {
  const [etapa, setEtapa] = useState<"selecionar" | "conflitos">("selecionar");
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [busca, setBusca] = useState("");
  const [adolescenteSelecionado, setAdolescenteSelecionado] =
    useState<Adolescente | null>(null);
  const [loading, setLoading] = useState(false);
  const [carregandoAdolescentes, setCarregandoAdolescentes] = useState(true);

  // Estado dos conflitos
  const [conflitos, setConflitos] = useState<AlertaConflito[]>([]);
  const [nivelRisco, setNivelRisco] = useState<"CRITICO" | "ALTO" | "MEDIO" | null>(
    null
  );
  const [justificativa, setJustificativa] = useState("");
  const [medidasAdicionais, setMedidasAdicionais] = useState<string[]>([]);

  useEffect(() => {
    carregarAdolescentes();
  }, []);

  const carregarAdolescentes = async () => {
    try {
      setCarregandoAdolescentes(true);
      const response = await fetch("/api/adolescentes?status=ATIVO");

      if (!response.ok) {
        throw new Error("Erro ao carregar adolescentes");
      }

      const data = await response.json();
      setAdolescentes(data.data || []);
    } catch (error) {
      console.error("Erro ao carregar adolescentes:", error);
      alert("Erro ao carregar adolescentes");
    } finally {
      setCarregandoAdolescentes(false);
    }
  };

  const verificarConflitos = async (adolescenteId: string) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/grupos/${grupoId}/adicionar-membro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adolescenteId,
        }),
      });

      const data = await response.json();

      // Se retornou 400 com conflitos, mostrar tela de justificativa
      if (response.status === 400 && data.status === "REQUER_JUSTIFICATIVA") {
        setConflitos(data.conflitos);
        setNivelRisco(data.nivel);
        setEtapa("conflitos");
        return;
      }

      // Se foi 201, sucesso direto
      if (response.status === 201) {
        alert("Membro adicionado com sucesso!");
        onSucesso();
        return;
      }

      // Outros erros
      alert(data.erro || "Erro ao adicionar membro");
    } catch (error) {
      console.error("Erro ao verificar conflitos:", error);
      alert("Erro ao verificar conflitos");
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarComJustificativa = async () => {
    if (!adolescenteSelecionado) return;

    if (!justificativa.trim()) {
      alert("A justificativa é obrigatória para continuar");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/grupos/${grupoId}/adicionar-membro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adolescenteId: adolescenteSelecionado.id,
          justificativa: justificativa.trim(),
          medidas_adicionais: medidasAdicionais.filter((m) => m.trim()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.erro || "Erro ao adicionar membro");
        return;
      }

      alert("Membro adicionado com sucesso!");
      onSucesso();
    } catch (error) {
      console.error("Erro ao adicionar membro:", error);
      alert("Erro ao adicionar membro");
    } finally {
      setLoading(false);
    }
  };

  const adolescentesFiltrados = adolescentes.filter((adolescente) => {
    const termoBusca = busca.toLowerCase();
    return (
      adolescente.nomeCompleto.toLowerCase().includes(termoBusca) ||
      adolescente.nomeSocial?.toLowerCase().includes(termoBusca) ||
      adolescente.numeroSms?.includes(termoBusca)
    );
  });

  const corNivel = {
    CRITICO: "bg-red-100 text-red-800 border-red-300",
    ALTO: "bg-orange-100 text-orange-800 border-orange-300",
    MEDIO: "bg-yellow-100 text-yellow-800 border-yellow-300",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Adicionar Membro</h2>
            <p className="text-sm text-gray-600 mt-1">Grupo: {nomeGrupo}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {etapa === "selecionar" && (
            <>
              {/* Busca */}
              <div className="mb-6">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por nome, nome social ou SMS..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  />
                </div>
              </div>

              {/* Lista de Adolescentes */}
              {carregandoAdolescentes ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregando adolescentes...</p>
                </div>
              ) : adolescentesFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-600">Nenhum adolescente encontrado</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {adolescentesFiltrados.map((adolescente) => (
                    <button
                      key={adolescente.id}
                      onClick={() => {
                        setAdolescenteSelecionado(adolescente);
                        verificarConflitos(adolescente.id);
                      }}
                      disabled={loading}
                      className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left disabled:opacity-50"
                    >
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
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
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">
                          {adolescente.nomeCompleto}
                        </p>
                        {adolescente.nomeSocial && (
                          <p className="text-sm text-gray-600">
                            Nome social: {adolescente.nomeSocial}
                          </p>
                        )}
                        {adolescente.numeroSms && (
                          <p className="text-xs text-gray-500 font-mono">
                            SMS: {adolescente.numeroSms}
                          </p>
                        )}
                      </div>
                      <UserPlus className="text-indigo-600" size={20} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {etapa === "conflitos" && adolescenteSelecionado && nivelRisco && (
            <>
              {/* Alerta de Nível de Risco */}
              <div
                className={`p-4 rounded-lg border-2 mb-6 ${
                  corNivel[nivelRisco]
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle size={24} className="flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-1">
                      Conflito Detectado - Nível {nivelRisco}
                    </h3>
                    <p className="text-sm">
                      Foram detectados {conflitos.length} conflito(s) ao adicionar{" "}
                      <strong>{adolescenteSelecionado.nomeCompleto}</strong> ao grupo.
                      A justificativa é obrigatória para continuar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de Conflitos */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3">
                  Conflitos Identificados:
                </h3>
                <div className="space-y-3">
                  {conflitos.map((conflito, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`px-2 py-1 rounded text-xs font-bold flex-shrink-0 ${
                            conflito.nivel >= 4
                              ? "bg-red-100 text-red-700"
                              : conflito.nivel === 3
                              ? "bg-orange-100 text-orange-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          Nível {conflito.nivel}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">
                            {conflito.tipo}
                          </p>
                          <p className="text-sm text-gray-700">
                            {conflito.mensagem}
                          </p>
                          {conflito.adolescente && (
                            <p className="text-xs text-gray-600 mt-2">
                              Envolve: {conflito.adolescente.nome}
                              {conflito.adolescente.grupo && (
                                <span> ({conflito.adolescente.grupo})</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Justificativa */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Justificativa Operacional *
                </label>
                <textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Explique os motivos para adicionar este adolescente ao grupo mesmo com conflitos detectados..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Esta justificativa será registrada e ficará disponível para auditoria.
                </p>
              </div>

              {/* Medidas Adicionais */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Medidas Adicionais (Opcional)
                </label>
                <div className="space-y-2">
                  {[
                    "Supervisão reforçada durante atividades",
                    "Mediação prévia com equipe multidisciplinar",
                    "Acompanhamento intensivo nos primeiros 15 dias",
                    "Separação durante horários de risco",
                  ].map((medida) => (
                    <label
                      key={medida}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={medidasAdicionais.includes(medida)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMedidasAdicionais([...medidasAdicionais, medida]);
                          } else {
                            setMedidasAdicionais(
                              medidasAdicionais.filter((m) => m !== medida)
                            );
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{medida}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {etapa === "conflitos" && (
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-4">
            <button
              onClick={() => {
                setEtapa("selecionar");
                setAdolescenteSelecionado(null);
                setConflitos([]);
                setNivelRisco(null);
                setJustificativa("");
                setMedidasAdicionais([]);
              }}
              className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-bold"
            >
              Voltar
            </button>
            <button
              onClick={handleAdicionarComJustificativa}
              disabled={loading || !justificativa.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus size={20} />
              {loading ? "Adicionando..." : "Confirmar e Adicionar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
