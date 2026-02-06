"use client";

import { useState, useEffect } from "react";
import { PenTool, Search, Plus, Edit2, Trash2, AlertTriangle } from "lucide-react";
import ModalCriarTatuagem from "@/components/tatuagens/modal-criar-tatuagem";
import ModalEditarTatuagem from "@/components/tatuagens/modal-editar-tatuagem";

type NivelRisco = "ALTO" | "MEDIO" | "BAIXO" | null;

interface Tatuagem {
  id: string;
  nomeSimbolo: string;
  significadoAssociado: string | null;
  nivelRisco: NivelRisco;
  totalUso?: number;
  faccoesAssociadas?: Array<{
    id: string;
    nomeFaccao: string;
  }>;
}

interface TatuagemResponse {
  total: number;
  tatuagens: Tatuagem[];
}

export default function TatuagensPage() {
  const [tatuagens, setTatuagens] = useState<Tatuagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroRisco, setFiltroRisco] = useState<"TODOS" | NivelRisco>("TODOS");
  const [modalAberto, setModalAberto] = useState<"criar" | "editar" | null>(null);
  const [tatuagemSelecionada, setTatuagemSelecionada] = useState<Tatuagem | null>(null);

  const fetchTatuagens = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (busca) params.append("busca", busca);
      if (filtroRisco !== "TODOS") params.append("nivelRisco", filtroRisco as string);
      params.append("incluirTotal", "true");

      const response = await fetch(`/api/tatuagens?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao buscar tatuagens");

      const data: TatuagemResponse = await response.json();
      setTatuagens(data.tatuagens);
    } catch (error) {
      console.error("Erro ao carregar tatuagens:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchTatuagens();
    }, 300);

    return () => clearTimeout(debounce);
  }, [busca, filtroRisco]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tatuagem do catálogo?")) return;

    try {
      const response = await fetch(`/api/tatuagens/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao excluir tatuagem");

      await fetchTatuagens();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir tatuagem");
    }
  };

  const handleEdit = (tatuagem: Tatuagem) => {
    setTatuagemSelecionada(tatuagem);
    setModalAberto("editar");
  };

  const getNivelRiscoColor = (nivel: NivelRisco) => {
    switch (nivel) {
      case "ALTO":
        return "bg-red-100 text-red-800 border-red-300";
      case "MEDIO":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "BAIXO":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-600 border-gray-300";
    }
  };

  const getNivelRiscoLabel = (nivel: NivelRisco) => {
    return nivel || "Não classificado";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <PenTool className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-slate-800">
              Catálogo de Tatuagens
            </h1>
          </div>
          <p className="text-slate-600">
            Gerencie os símbolos e tatuagens catalogados com níveis de risco associados
          </p>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Buscar por nome/símbolo
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite o nome da tatuagem..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filtro de Risco */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nível de Risco
              </label>
              <select
                value={filtroRisco || "TODOS"}
                onChange={(e) => setFiltroRisco(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="TODOS">Todos os níveis</option>
                <option value="ALTO">Alto</option>
                <option value="MEDIO">Médio</option>
                <option value="BAIXO">Baixo</option>
                <option value="">Não classificado</option>
              </select>
            </div>
          </div>

          {/* Botão Adicionar */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setModalAberto("criar")}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nova Tatuagem
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Lista de Tatuagens */}
        {!loading && tatuagens.length === 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              Nenhuma tatuagem encontrada
            </h3>
            <p className="text-slate-500">
              {busca || filtroRisco !== "TODOS"
                ? "Tente ajustar os filtros de busca"
                : "Comece adicionando uma nova tatuagem ao catálogo"}
            </p>
          </div>
        )}

        {!loading && tatuagens.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-50 via-slate-50 to-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Nome/Simbolo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Significado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Faccoes possivelmente associadas
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Nivel de Risco
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tatuagens.map((tatuagem) => (
                    <tr key={tatuagem.id} className="odd:bg-white even:bg-slate-50/60 hover:bg-indigo-50/40 transition-colors">
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {tatuagem.nomeSimbolo}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="text-slate-600 max-w-md line-clamp-2" title={tatuagem.significadoAssociado || undefined}>
                          {tatuagem.significadoAssociado || (
                            <span className="italic text-slate-400">Não informado</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {tatuagem.faccoesAssociadas &&
                        tatuagem.faccoesAssociadas.length > 0 ? (
                          <div className="flex flex-wrap gap-2 max-w-sm">
                            {tatuagem.faccoesAssociadas.map((faccao) => (
                              <span
                                key={faccao.id}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600"
                              >
                                {faccao.nomeFaccao}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Nenhuma associacao registrada
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getNivelRiscoColor(
                            tatuagem.nivelRisco
                          )}`}
                        >
                          {getNivelRiscoLabel(tatuagem.nivelRisco)}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(tatuagem)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tatuagem.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer com total */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Total: <span className="font-semibold">{tatuagens.length}</span> tatuagem(ns)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ModalCriarTatuagem
        isOpen={modalAberto === "criar"}
        onClose={() => setModalAberto(null)}
        onSuccess={fetchTatuagens}
      />

      <ModalEditarTatuagem
        isOpen={modalAberto === "editar"}
        tatuagem={tatuagemSelecionada}
        onClose={() => {
          setModalAberto(null);
          setTatuagemSelecionada(null);
        }}
        onSuccess={fetchTatuagens}
      />
    </div>
  );
}

