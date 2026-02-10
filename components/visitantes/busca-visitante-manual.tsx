"use client";

import { useState } from "react";
import { Search, UserCheck, AlertCircle, X } from "lucide-react";

type Visitante = {
  id: string;
  nomeCompleto: string;
  cpf: string | null;
  rg: string | null;
  nomePai: string | null;
  nomeMae: string | null;
  dataNascimento: string | null;
  fotoUrl: string | null;
  bnmpUltimaConsultaEm?: string | null;
  antecedentesPdfUrl?: string | null;
  antecedentesPdfAtualizadoEm?: string | null;
  adolescentes?: Array<{
    id: string;
    nomeCompleto: string;
    nomeSocial: string | null;
    statusUnidade?: string | null;
  }>;
};

interface BuscaVisitanteManualProps {
  onVisitanteSelecionado: (visitante: Visitante) => void;
  onCancelar: () => void;
}

export function BuscaVisitanteManual({
  onVisitanteSelecionado,
  onCancelar,
}: BuscaVisitanteManualProps) {
  const [termo, setTermo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<Visitante[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const buscarVisitante = async () => {
    if (!termo.trim()) {
      setErro("Digite um nome ou CPF para buscar");
      return;
    }

    setBuscando(true);
    setErro(null);
    setResultados([]);

    try {
      // Remover pontuação do CPF se for o caso
      const termoLimpo = termo.replace(/[.-]/g, "");

      const response = await fetch(
        `/api/visitantes?busca=${encodeURIComponent(termoLimpo)}&limite=10`
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar visitantes");
      }

      const data = await response.json();

      if (data.visitantes && data.visitantes.length > 0) {
        setResultados(data.visitantes);
      } else {
        setErro("Nenhum visitante encontrado com este nome ou CPF");
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao buscar visitante");
    } finally {
      setBuscando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      buscarVisitante();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-teal-600">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <UserCheck size={28} />
              Cadastro Manual de Visita
            </h2>
            <p className="text-green-100 mt-1">Busque o visitante por nome ou CPF</p>
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
          {/* Busca */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nome Completo ou CPF do Visitante
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ex: João da Silva ou 123.456.789-00"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={buscando}
              />
              <button
                onClick={buscarVisitante}
                disabled={buscando || !termo.trim()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md flex items-center gap-2"
              >
                <Search size={20} />
                {buscando ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <p className="text-red-700">{erro}</p>
            </div>
          )}

          {/* Resultados */}
          {resultados.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Resultados da Busca ({resultados.length})
              </h3>
              <div className="space-y-3">
                {resultados.map((visitante) => (
                  <div
                    key={visitante.id}
                    onClick={() => onVisitanteSelecionado(visitante)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 cursor-pointer transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {visitante.fotoUrl && (
                        <img
                          src={visitante.fotoUrl}
                          alt={visitante.nomeCompleto}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-lg">
                          {visitante.nomeCompleto}
                        </h4>
                        {visitante.cpf && (
                          <p className="text-sm text-gray-600">CPF: {visitante.cpf}</p>
                        )}
                        {visitante.dataNascimento && (
                          <p className="text-sm text-gray-600">
                            Nascimento:{" "}
                            {new Date(visitante.dataNascimento).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                        {Array.isArray(visitante.adolescentes) &&
                          visitante.adolescentes.length > 0 && (
                          <p className="text-sm text-green-700 font-medium mt-1">
                            {visitante.adolescentes.length} adolescente(s) vinculado(s)
                          </p>
                        )}
                      </div>
                      <div className="text-green-600">
                        <UserCheck size={24} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado vazio */}
          {!buscando && !erro && resultados.length === 0 && (
            <div className="text-center py-12">
              <Search className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600">
                Digite um nome ou CPF e clique em Buscar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
