"use client";

import { useState, useMemo } from "react";
import { X, HousePlus } from "lucide-react";

type Casa = {
  id: string;
  nome: string;
  numero: number;
};

type ModalGrupoEspecialProps = {
  casas: Casa[];
  onClose: () => void;
  onSubmit: (data: {
    nome: string;
    tipo: string;
    descricao?: string;
    casas: string[];
  }) => Promise<void>;
  submitLabel?: string;
  title?: string;
  initial?: {
    nome: string;
    tipo: string;
    descricao?: string | null;
    casas: string[];
  };
  membros?: Array<{ adolescenteId: string; nomeCompleto: string; numeroSms?: string | null }>;
  grupoId?: string;
  onRemoverMembro?: (adolescenteId: string) => Promise<void>;
};

export function ModalGrupoEspecial({
  casas,
  onClose,
  onSubmit,
  submitLabel = "Criar grupo especial",
  title = "Criar grupo especial",
  initial,
  membros,
  onRemoverMembro,
}: ModalGrupoEspecialProps) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [tipo, setTipo] = useState(initial?.tipo ?? "ESCOLARIZACAO");
  const [selecionadas, setSelecionadas] = useState<string[]>(initial?.casas ?? []);
  const [loading, setLoading] = useState(false);

  const toggleCasa = (casaId: string) => {
    setSelecionadas((prev) =>
      prev.includes(casaId) ? prev.filter((id) => id !== casaId) : [...prev, casaId]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nome.trim() || selecionadas.length === 0) {
      alert("Informe nome e ao menos uma casa.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        nome,
        tipo,
        descricao: descricao.trim() || undefined,
        casas: selecionadas,
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert("Não foi possível salvar o grupo especial.");
    } finally {
      setLoading(false);
    }
  };

  const labelList = useMemo(
    () => casas.map((c) => `${c.nome || `Casa ${c.numero}`}`),
    [casas]
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <HousePlus size={24} className="text-indigo-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">
                Agrupe adolescentes de diferentes casas sem impactar os grupos regulares.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Nome</label>
            <input
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            >
              <option value="ESCOLARIZACAO">Escolarização especial</option>
              <option value="EVENTO">Evento multi-casa</option>
              <option value="TERAPIA">Terapia especializada</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">
              Casas participantes ({labelList.length})
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {casas.map((casa) => (
                <label
                  key={casa.id}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer ${
                    selecionadas.includes(casa.id)
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selecionadas.includes(casa.id)}
                    onChange={() => toggleCasa(casa.id)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">
                    {casa.nome || `Casa ${casa.numero}`}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {membros && membros.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Membros ativos ({membros.length})
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {membros.map((membro) => (
                  <div
                    key={membro.adolescenteId}
                    className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {membro.nomeCompleto}
                      </p>
                      <p className="text-xs text-gray-500">
                        SMS: {membro.numeroSms ?? "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoverMembro?.(membro.adolescenteId)}
                      className="text-sm text-red-600 font-semibold hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Descrição</label>
            <textarea
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:border-gray-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Salvando..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
