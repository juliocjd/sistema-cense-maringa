"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Info, X, ArrowRight, CheckCircle } from "lucide-react";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  nomeSocial: string | null;
};

interface ModalValidacaoPreviaProps {
  visitanteId: string;
  visitanteNome: string;
  adolescentes: Adolescente[];
  onConfirmar: (
    adolescenteId: string,
    justificativa: string | null,
    registrarDireto: boolean
  ) => void;
  onCancelar: () => void;
}

type ValidationResult = {
  permitido: boolean;
  alertas: string[];
  avisos: string[];
  requerJustificativa: boolean;
  periodoAtual?: string;
  periodoAutorizado?: string;
  erro?: string;
};

export function ModalValidacaoPrevia({
  visitanteId,
  visitanteNome,
  adolescentes,
  onConfirmar,
  onCancelar,
}: ModalValidacaoPreviaProps) {
  const [adolescenteSelecionado, setAdolescenteSelecionado] = useState<string>(
    adolescentes.length === 1 ? adolescentes[0].id : ""
  );
  const [validacao, setValidacao] = useState<ValidationResult | null>(null);
  const [validando, setValidando] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [mostrarJustificativa, setMostrarJustificativa] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (adolescentes.length === 1) {
      setAdolescenteSelecionado(adolescentes[0].id);
    }
  }, [adolescentes]);

  // Validar automaticamente quando adolescente for selecionado
  useEffect(() => {
    if (adolescenteSelecionado) {
      validarEntrada();
    } else {
      setValidacao(null);
      setMostrarJustificativa(false);
      setJustificativa("");
    }
  }, [adolescenteSelecionado]);

  const validarEntrada = async () => {
    setValidando(true);
    setValidacao(null);
    setMostrarJustificativa(false);

    try {
      const response = await fetch("/api/visitas/validar-pre-entrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitanteId,
          adolescenteId: adolescenteSelecionado,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setValidacao({
          permitido: false,
          alertas: [],
          avisos: [],
          requerJustificativa: false,
          erro: data.erro || "Erro ao validar entrada",
        });
        return;
      }

      setValidacao(data);

      // Se requer justificativa, mostrar campo
      if (data.requerJustificativa) {
        setMostrarJustificativa(true);
      }
    } catch (error) {
      console.error("Erro ao validar:", error);
      setValidacao({
        permitido: false,
        alertas: [],
        avisos: [],
        requerJustificativa: false,
        erro: "Erro ao validar entrada",
      });
    } finally {
      setValidando(false);
    }
  };

  const handleProsseguir = async () => {
    if (!adolescenteSelecionado) {
      return;
    }

    if (mostrarJustificativa && !justificativa.trim()) {
      alert("Por favor, informe a justificativa para prosseguir");
      return;
    }

    setConfirmando(true);
    try {
      await onConfirmar(
        adolescenteSelecionado,
        mostrarJustificativa ? justificativa : null,
        mostrarJustificativa
      );
    } finally {
      setConfirmando(false);
    }
  };

  const podeAvancar =
    adolescenteSelecionado &&
    validacao &&
    validacao.permitido &&
    (!mostrarJustificativa || justificativa.trim().length > 0) &&
    !confirmando;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div>
            <h2 className="text-2xl font-bold text-white">Validação de Entrada</h2>
            <p className="text-indigo-100 mt-1">{visitanteNome}</p>
          </div>
          <button
            onClick={onCancelar}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Seleção de Adolescente */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Selecione o adolescente a ser visitado:
            </label>

            {adolescentes.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800">
                  Este visitante nao possui vinculos com adolescentes.
                </p>
              </div>
            ) : adolescentes.length === 1 ? (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-indigo-900 font-semibold">
                  {adolescentes[0].nomeSocial || adolescentes[0].nomeCompleto}
                </p>
                <p className="text-sm text-indigo-700 mt-1">
                  Selecionado automaticamente (unico vinculo)
                </p>
              </div>
            ) : (
              <select
                value={adolescenteSelecionado}
                onChange={(e) => setAdolescenteSelecionado(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={validando}
              >
                <option value="">-- Selecione --</option>
                {adolescentes.map((adolescente) => (
                  <option key={adolescente.id} value={adolescente.id}>
                    {adolescente.nomeSocial || adolescente.nomeCompleto}
                  </option>
                ))}
              </select>
            )}          </div>

          {/* Loading */}
          {validando && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="ml-4 text-gray-600">Validando entrada...</p>
            </div>
          )}

          {/* Resultado da Validação */}
          {validacao && !validando && (
            <div className="space-y-4">
              {/* Erro */}
              {validacao.erro && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={24} />
                    <div>
                      <h3 className="font-bold text-red-900 mb-1">Erro</h3>
                      <p className="text-red-700">{validacao.erro}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Alertas (Requer Justificativa) */}
              {validacao.alertas.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertTriangle className="text-amber-600 flex-shrink-0 mt-1" size={28} />
                    <div>
                      <h3 className="font-bold text-amber-900 text-lg mb-2">
                        ⚠️ ATENÇÃO - Situação Irregular
                      </h3>
                      <p className="text-amber-800 mb-3">
                        Foram identificadas as seguintes irregularidades:
                      </p>
                      <ul className="space-y-2">
                        {validacao.alertas.map((alerta, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 bg-white bg-opacity-60 p-3 rounded-lg"
                          >
                            <span className="text-amber-700 font-semibold">•</span>
                            <span className="text-amber-900 flex-1">{alerta}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {validacao.requerJustificativa && (
                    <div className="mt-4 pt-4 border-t border-amber-300">
                      <p className="text-amber-900 font-semibold mb-1">
                        ⚠️ Justificativa Obrigatória
                      </p>
                      <p className="text-amber-800 text-sm mb-3">
                        Para prosseguir com o registro desta visita, é necessário informar o
                        motivo da exceção:
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Avisos Informativos */}
              {validacao.avisos.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="text-blue-600 flex-shrink-0 mt-1" size={24} />
                    <div>
                      <h3 className="font-bold text-blue-900 mb-2">Informações</h3>
                      <ul className="space-y-1">
                        {validacao.avisos.map((aviso, index) => (
                          <li key={index} className="text-blue-800 text-sm">
                            {aviso}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Tudo OK */}
              {validacao.permitido &&
                validacao.alertas.length === 0 &&
                validacao.avisos.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-600" size={24} />
                      <div>
                        <h3 className="font-bold text-green-900">
                          ✅ Entrada Autorizada
                        </h3>
                        <p className="text-green-700 text-sm mt-1">
                          Todas as regras foram atendidas. Você pode prosseguir com o
                          registro.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Campo de Justificativa */}
              {mostrarJustificativa && (
                <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-5">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    📝 Justificativa da Exceção *
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Descreva o motivo pelo qual esta visita deve ser autorizada mesmo fora
                    das regras estabelecidas:
                  </p>
                  <textarea
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    placeholder="Ex: Autorização especial da direção, visita judicial, urgência familiar, etc."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                    required
                  />
                  {justificativa.trim().length === 0 && (
                    <p className="text-red-600 text-sm mt-2">
                      ⚠️ Campo obrigatório
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancelar}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={handleProsseguir}
            disabled={!podeAvancar}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mostrarJustificativa ? (
              <>
                {confirmando ? "Processando..." : "Confirmar Entrada"}
                {!confirmando && <CheckCircle size={20} />}
              </>
            ) : (
              <>
                {confirmando ? "Processando..." : "Prosseguir para Registro"}
                {!confirmando && <ArrowRight size={20} />}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

