"use client";

import { useState, useEffect } from "react";
import { Shield, Plus, X, AlertTriangle, Search, ExternalLink } from "lucide-react";
import ModalCriarTatuagem from "@/components/tatuagens/modal-criar-tatuagem";

interface Tatuagem {
  catalogoId: string;
  localCorpo: string;
  observacoes: string;
  significadoPessoal: string;
}

interface TatuagemCatalogo {
  id: string;
  nomeSimbolo: string;
  significadoAssociado: string | null;
  nivelRisco: "ALTO" | "MEDIO" | "BAIXO" | null;
}

interface SeletorTatuagensProps {
  tatuagens: Tatuagem[];
  onChange: (tatuagens: Tatuagem[]) => void;
}

export function SeletorTatuagens({ tatuagens, onChange }: SeletorTatuagensProps) {
  const [catalogo, setCatalogo] = useState<TatuagemCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalCriarAberto, setModalCriarAberto] = useState(false);

  const carregarCatalogo = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tatuagens");
      if (!response.ok) throw new Error("Erro ao carregar catálogo");

      const data = await response.json();
      setCatalogo(data.tatuagens);
    } catch (error) {
      console.error("Erro ao carregar catálogo:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarCatalogo();
  }, []);

  const adicionarTatuagem = () => {
    onChange([
      ...tatuagens,
      { catalogoId: "", localCorpo: "", observacoes: "", significadoPessoal: "" },
    ]);
  };

  const removerTatuagem = (index: number) => {
    onChange(tatuagens.filter((_, i) => i !== index));
  };

  const atualizarTatuagem = (index: number, campo: keyof Tatuagem, valor: string) => {
    const novas = [...tatuagens];
    novas[index][campo] = valor;
    onChange(novas);
  };

  const getNivelRiscoColor = (nivel: "ALTO" | "MEDIO" | "BAIXO" | null) => {
    switch (nivel) {
      case "ALTO":
        return "text-red-600 bg-red-50 border-red-300";
      case "MEDIO":
        return "text-yellow-600 bg-yellow-50 border-yellow-300";
      case "BAIXO":
        return "text-green-600 bg-green-50 border-green-300";
      default:
        return "text-gray-600 bg-gray-50 border-gray-300";
    }
  };

  const getNivelRiscoLabel = (nivel: "ALTO" | "MEDIO" | "BAIXO" | null) => {
    return nivel || "Não classificado";
  };

  const catalogoFiltrado = busca
    ? catalogo.filter((t) =>
        t.nomeSimbolo.toLowerCase().includes(busca.toLowerCase())
      )
    : catalogo;

  const obterTatuagem = (id: string) => catalogo.find((t) => t.id === id);

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Tatuagens Identificadas
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Registre as tatuagens identificadas no adolescente
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalCriarAberto(true)}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
            title="Cadastrar nova tatuagem no catálogo"
          >
            <Plus className="w-4 h-4" />
            Nova no Catálogo
          </button>

          <button
            type="button"
            onClick={adicionarTatuagem}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Tatuagem
          </button>
        </div>
      </div>

      {/* Lista de tatuagens */}
      {tatuagens.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Shield size={48} className="mx-auto mb-2 text-gray-400" />
          <p className="mb-2">Nenhuma tatuagem registrada</p>
          <p className="text-xs text-gray-500">
            Clique em &quot;Adicionar Tatuagem&quot; para registrar
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tatuagens.map((tatuagem, index) => {
            const catalogoSelecionado = obterTatuagem(tatuagem.catalogoId);

            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition-all ${
                  catalogoSelecionado
                    ? "bg-white border-indigo-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                {/* Header do card */}
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">
                      {index + 1}
                    </span>
                    Tatuagem #{index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removerTatuagem(index)}
                    className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                    title="Remover tatuagem"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Seleção do tipo */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Tipo/Símbolo <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={tatuagem.catalogoId}
                      onChange={(e) => atualizarTatuagem(index, "catalogoId", e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                      required
                    >
                      <option value="">Selecione o tipo de tatuagem...</option>
                      {loading ? (
                        <option disabled>Carregando catálogo...</option>
                      ) : (
                        catalogoFiltrado.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.nomeSimbolo}
                            {cat.nivelRisco && ` • ${getNivelRiscoLabel(cat.nivelRisco)}`}
                            {cat.significadoAssociado && ` - ${cat.significadoAssociado.substring(0, 50)}${cat.significadoAssociado.length > 50 ? "..." : ""}`}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Informações da tatuagem selecionada */}
                  {catalogoSelecionado && (
                    <div className="md:col-span-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h5 className="font-semibold text-indigo-900 mb-1">
                            {catalogoSelecionado.nomeSimbolo}
                          </h5>
                          {catalogoSelecionado.significadoAssociado && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-indigo-800 mb-0.5">
                                Significado catalogado:
                              </p>
                              <p className="text-sm text-indigo-700">
                                {catalogoSelecionado.significadoAssociado}
                              </p>
                            </div>
                          )}
                          {catalogoSelecionado.nivelRisco && (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getNivelRiscoColor(catalogoSelecionado.nivelRisco)}`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Risco: {getNivelRiscoLabel(catalogoSelecionado.nivelRisco)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Auto-declaração / Significado Pessoal */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Auto-declaração do Adolescente (Significado Pessoal)
                    </label>
                    <textarea
                      value={tatuagem.significadoPessoal}
                      onChange={(e) => atualizarTatuagem(index, "significadoPessoal", e.target.value)}
                      placeholder="O que esta tatuagem significa para você? Por que a fez?"
                      rows={2}
                      className="w-full px-3 py-2.5 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm bg-blue-50"
                    />
                    <p className="text-xs text-blue-700 mt-1 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Importante:</strong> Este campo registra o significado declarado pelo próprio adolescente,
                        que pode ser diferente do significado catalogado. Respeite a narrativa individual.
                      </span>
                    </p>
                  </div>

                  {/* Local do corpo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Local do Corpo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tatuagem.localCorpo}
                      onChange={(e) => atualizarTatuagem(index, "localCorpo", e.target.value)}
                      placeholder="Ex: Braço direito, Pescoço..."
                      className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                      required
                    />
                  </div>

                  {/* Observações Técnicas */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Observações Técnicas
                    </label>
                    <input
                      type="text"
                      value={tatuagem.observacoes}
                      onChange={(e) => atualizarTatuagem(index, "observacoes", e.target.value)}
                      placeholder="Características, tamanho, estado..."
                      className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Link para gerenciar catálogo */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Não encontrou a tatuagem? Cadastre-a no catálogo usando o botão &quot;Nova no Catálogo&quot;
        </p>
        <a
          href="/tatuagens"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
        >
          <ExternalLink className="w-4 h-4" />
          Gerenciar Catálogo
        </a>
      </div>

      {/* Modal para criar nova tatuagem */}
      <ModalCriarTatuagem
        isOpen={modalCriarAberto}
        onClose={() => setModalCriarAberto(false)}
        onSuccess={() => {
          carregarCatalogo();
          setModalCriarAberto(false);
        }}
      />
    </div>
  );
}
