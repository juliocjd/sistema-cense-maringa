"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Casa = {
  id: string;
  nome: string;
  numero: number;
};

export default function NovoGrupoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [casas, setCasas] = useState<Casa[]>([]);
  const [erros, setErros] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    nomeGrupo: "",
    casaId: "",
    ordemAla: "",
    status: "ATIVO" as "ATIVO" | "INATIVO",
  });

  useEffect(() => {
    carregarCasas();
  }, []);

  const carregarCasas = async () => {
    try {
      const response = await fetch("/api/casas");
      if (!response.ok) throw new Error("Erro ao carregar casas");
      const data = await response.json();
      setCasas(data.casas || []);
    } catch (error) {
      console.error("Erro ao carregar casas:", error);
    }
  };

  const validarFormulario = (): boolean => {
    const novosErros: Record<string, string> = {};

    if (!formData.nomeGrupo.trim()) {
      novosErros.nomeGrupo = "Nome do grupo é obrigatório";
    } else if (formData.nomeGrupo.trim().length < 2) {
      novosErros.nomeGrupo = "Nome deve ter no mínimo 2 caracteres";
    }

    if (!formData.casaId) {
      novosErros.casaId = "Selecione uma casa";
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    try {
      setLoading(true);

      const payload = {
        nomeGrupo: formData.nomeGrupo.trim(),
        casaId: formData.casaId,
        ordemAla: formData.ordemAla.trim() || null,
        status: formData.status,
      };

      const response = await fetch("/api/grupos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.erro || "Erro ao criar grupo");
        return;
      }

      alert("Grupo criado com sucesso!");
      router.push(`/grupos/${data.id}`);
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      alert("Erro ao criar grupo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/grupos"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 font-semibold transition-colors"
        >
          <ArrowLeft size={20} />
          Voltar para Grupos
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Users className="text-indigo-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Novo Grupo</h1>
            <p className="text-gray-600">Crie um novo grupo para organizar adolescentes</p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Nome do Grupo */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nome do Grupo *
            </label>
            <input
              type="text"
              value={formData.nomeGrupo}
              onChange={(e) =>
                setFormData({ ...formData, nomeGrupo: e.target.value })
              }
              placeholder="Ex: Grupo 2A, Grupo Manhã, etc."
              className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all ${
                erros.nomeGrupo
                  ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              }`}
            />
            {erros.nomeGrupo && (
              <p className="text-red-600 text-sm mt-1 font-semibold">
                {erros.nomeGrupo}
              </p>
            )}
          </div>

          {/* Casa */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Casa *
            </label>
            <select
              value={formData.casaId}
              onChange={(e) =>
                setFormData({ ...formData, casaId: e.target.value })
              }
              className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all ${
                erros.casaId
                  ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              }`}
            >
              <option value="">Selecione uma casa</option>
              {casas.map((casa) => (
                <option key={casa.id} value={casa.id}>
                  {casa.nome}
                </option>
              ))}
            </select>
            {erros.casaId && (
              <p className="text-red-600 text-sm mt-1 font-semibold">
                {erros.casaId}
              </p>
            )}
          </div>

          {/* Ordem/Ala */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Ordem/Ala (Opcional)
            </label>
            <input
              type="text"
              value={formData.ordemAla}
              onChange={(e) =>
                setFormData({ ...formData, ordemAla: e.target.value })
              }
              placeholder="Ex: A, B, C, etc."
              maxLength={10}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
            <p className="text-sm text-gray-500 mt-1">
              Identifique a ala ou ordem do grupo dentro da casa
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="ATIVO"
                  checked={formData.status === "ATIVO"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "ATIVO" | "INATIVO",
                    })
                  }
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-gray-700 font-semibold">Ativo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="INATIVO"
                  checked={formData.status === "INATIVO"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "ATIVO" | "INATIVO",
                    })
                  }
                  className="w-4 h-4 text-gray-600"
                />
                <span className="text-gray-700 font-semibold">Inativo</span>
              </label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {loading ? "Criando..." : "Criar Grupo"}
            </button>

            <Link
              href="/grupos"
              className="flex-1 text-center py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-bold"
            >
              Cancelar
            </Link>
          </div>
        </form>

        {/* Dicas */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2">💡 Dicas</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use nomes descritivos que facilitem a identificação do grupo</li>
            <li>• A ordem/ala ajuda a organizar múltiplos grupos na mesma casa</li>
            <li>• Grupos inativos não aparecem nos filtros padrão</li>
            <li>• Você pode adicionar membros após criar o grupo</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
