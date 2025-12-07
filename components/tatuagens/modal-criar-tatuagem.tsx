"use client";

import { useState } from "react";
import { X, Shield, AlertCircle } from "lucide-react";

type NivelRisco = "ALTO" | "MEDIO" | "BAIXO" | null;

interface ModalCriarTatuagemProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalCriarTatuagem({
  isOpen,
  onClose,
  onSuccess,
}: ModalCriarTatuagemProps) {
  const [nomeSimbolo, setNomeSimbolo] = useState("");
  const [significadoAssociado, setSignificadoAssociado] = useState("");
  const [nivelRisco, setNivelRisco] = useState<NivelRisco>(null);
  const [localizacao, setLocalizacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (nomeSimbolo.trim().length < 2) {
      setErro("O nome do símbolo deve ter pelo menos 2 caracteres");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/tatuagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeSimbolo: nomeSimbolo.trim(),
        significadoAssociado: significadoAssociado.trim() || null,
        nivelRisco: nivelRisco || null,
        localizacao: localizacao.trim() || null,
      }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.erro || "Erro ao criar tatuagem");
      }

      // Reset form
      setNomeSimbolo("");
      setSignificadoAssociado("");
      setNivelRisco(null);

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao criar tatuagem:", error);
      setErro(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNomeSimbolo("");
      setSignificadoAssociado("");
      setNivelRisco(null);
      setLocalizacao("");
      setErro(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-slate-800">
              Nova Tatuagem
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Erro */}
          {erro && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-1">Erro</h3>
                <p className="text-sm text-red-700">{erro}</p>
              </div>
            </div>
          )}

          {/* Nome do Símbolo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome do Símbolo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nomeSimbolo}
              onChange={(e) => setNomeSimbolo(e.target.value)}
              placeholder="Ex: Caveira, Estrela de 5 pontas, Palhaço..."
              required
              minLength={2}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Mínimo de 2 caracteres
            </p>
          </div>

          {/* Significado Associado */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Significado Associado
            </label>
            <textarea
              value={significadoAssociado}
              onChange={(e) => setSignificadoAssociado(e.target.value)}
              placeholder="Descreva o significado, simbolismo ou contexto da tatuagem..."
              rows={4}
              maxLength={1000}
              disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
          />
            <p className="mt-1 text-xs text-slate-500">
              Máximo de 1000 caracteres ({significadoAssociado.length}/1000)
            </p>
          </div>

          {/* Nível de Risco */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nível de Risco
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setNivelRisco(null)}
                disabled={loading}
                className={`p-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                  nivelRisco === null
                    ? "border-slate-400 bg-slate-50 ring-2 ring-slate-300"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-slate-700">Não classificado</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNivelRisco("BAIXO")}
                disabled={loading}
                className={`p-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                  nivelRisco === "BAIXO"
                    ? "border-green-400 bg-green-50 ring-2 ring-green-300"
                    : "border-green-200 hover:border-green-300"
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-green-700">Baixo</div>
                  <div className="text-xs text-green-600 mt-1">Comum</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNivelRisco("MEDIO")}
                disabled={loading}
                className={`p-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                  nivelRisco === "MEDIO"
                    ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-300"
                    : "border-yellow-200 hover:border-yellow-300"
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-yellow-700">Médio</div>
                  <div className="text-xs text-yellow-600 mt-1">Atenção</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNivelRisco("ALTO")}
                disabled={loading}
                className={`p-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                  nivelRisco === "ALTO"
                    ? "border-red-400 bg-red-50 ring-2 ring-red-300"
                    : "border-red-200 hover:border-red-300"
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-red-700">Alto</div>
                  <div className="text-xs text-red-600 mt-1">Crítico</div>
                </div>
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Classifique o nível de risco associado a esta tatuagem no contexto institucional
            </p>
          </div>

          {/* Localização */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Local onde se encontra
            </label>
            <input
              type="text"
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              placeholder="Ex: Braço direito, Costas, Peito..."
              maxLength={60}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Máximo de 60 caracteres
            </p>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || nomeSimbolo.trim().length < 2}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
