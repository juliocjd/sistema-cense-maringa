"use client";

import { useState, useEffect } from "react";
import { X, Search, UserPlus } from "lucide-react";
import type { Adolescente } from "@/types";

type ModalProps = {
  grupoId: string;
  grupoNome: string;
  onClose: () => void;
  onSucesso: () => void;
};

export function ModalAdicionarMembroEspecial({
  grupoId,
  grupoNome,
  onClose,
  onSucesso,
}: ModalProps) {
  const [busca, setBusca] = useState("");
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarAdolescentes();
  }, []);

  const carregarAdolescentes = async () => {
    const params = new URLSearchParams({
      status: "ATIVO",
      excluir_grupos: "true",
    });
    const response = await fetch(`/api/adolescentes?${params.toString()}`);
    const data = await response.json();
    setAdolescentes(data.data ?? []);
  };

  const filtrar = (item: Adolescente) => {
    const termo = busca.toLowerCase();
    return (
      item.nomeCompleto.toLowerCase().includes(termo) ||
      item.numeroSms?.includes(termo) ||
      item.numeroProcesso?.includes(termo)
    );
  };

  const toggleSelecionado = (adolescenteId: string) => {
    setSelecionados((prev) =>
      prev.includes(adolescenteId)
        ? prev.filter((id) => id !== adolescenteId)
        : [...prev, adolescenteId]
    );
  };

  const handleAdicionar = async () => {
    if (!selecionados.length) return;
    setLoading(true);
    try {
      for (const adolescenteId of selecionados) {
        const response = await fetch(
          `/api/grupos-especiais/${grupoId}/membros`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adolescenteId }),
          }
        );
        if (!response.ok) {
          console.error("Erro ao adicionar", adolescenteId);
        }
      }
      onSucesso();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Não foi possível adicionar os adolescentes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Adicionar adolescente a {grupoNome}
            </h2>
            <p className="text-sm text-gray-500">O grupo especial aceita qualquer casa.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              className="w-full border border-gray-200 rounded-xl px-10 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder="Buscar por nome, SMS ou processo"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {adolescentes.filter(filtrar).map((adolescente) => (
              <label
                key={adolescente.id}
                className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 ${
                  selecionados.includes(adolescente.id)
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-indigo-300"
                }`}
              >
                <div>
                  <span className="font-semibold text-gray-900">
                    {adolescente.nomeCompleto}
                  </span>
                  <span className="text-xs text-gray-500 block">
                    SMS: {adolescente.numeroSms || "—"}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={selecionados.includes(adolescente.id)}
                  onChange={() => toggleSelecionado(adolescente.id)}
                  className="accent-indigo-600"
                />
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700">
            Cancelar
          </button>
          <button
            onClick={handleAdicionar}
            disabled={loading || selecionados.length === 0}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Adicionando..." : "Adicionar adolescente"}
          </button>
        </div>
      </div>
    </div>
  );
}
