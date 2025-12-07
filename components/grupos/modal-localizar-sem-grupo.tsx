"use client";

import { useEffect, useState } from "react";
import { X, Search, UserCheck } from "lucide-react";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  nomeSocial: string | null;
  numeroSms: string | null;
  alojamentoAtual?: {
    numeroAlojamento: string | null;
    ala: string | null;
    casa?: {
      nome?: string | null;
    } | null;
  } | null;
};

type GrupoResumo = {
  id: string;
  nomeGrupo: string;
};

type ModalLocalizarSemGrupoProps = {
  onClose: () => void;
  onSuccess?: () => void;
};

export function ModalLocalizarSemGrupo({ onClose, onSuccess }: ModalLocalizarSemGrupoProps) {
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [grupos, setGrupos] = useState<GrupoResumo[]>([]);
  const [gruposEspeciais, setGruposEspeciais] = useState<
    { id: string; nome: string }[]
  >([]);
  const [selecoes, setSelecoes] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [carregandoGrupos, setCarregandoGrupos] = useState(true);
  const [carregandoEspeciais, setCarregandoEspeciais] = useState(true);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  useEffect(() => {
    carregarAdolescentes();
    carregarGrupos();
    carregarGruposEspeciais();
  }, []);

  const carregarAdolescentes = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams({
        status: "ATIVO",
        excluir_grupos: "true",
      });
      const response = await fetch(`/api/adolescentes?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar adolescentes");
      const data = await response.json();
      setAdolescentes(data.data ?? []);
    } catch (error) {
      console.error("Erro ao carregar adolescentes:", error);
      alert("Erro ao carregar adolescentes");
    } finally {
      setCarregando(false);
    }
  };

  const carregarGrupos = async () => {
    try {
      setCarregandoGrupos(true);
      const response = await fetch("/api/grupos?status=ATIVO");
      const data = await response.json();
      setGrupos(data.grupos ?? []);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
      alert("Erro ao carregar grupos");
    } finally {
      setCarregandoGrupos(false);
    }
  };

  const carregarGruposEspeciais = async () => {
    try {
      setCarregandoEspeciais(true);
      const response = await fetch("/api/grupos-especiais");
      const data = await response.json();
      setGruposEspeciais(data.grupos ?? []);
    } catch (error) {
      console.error("Erro ao carregar grupos especiais:", error);
      setGruposEspeciais([]);
    } finally {
      setCarregandoEspeciais(false);
    }
  };

  const filtrarAdolescentes = () => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return adolescentes;
    return adolescentes.filter((adolescente) => {
      return (
        adolescente.nomeCompleto.toLowerCase().includes(termo) ||
        adolescente.nomeSocial?.toLowerCase().includes(termo) ||
        adolescente.numeroSms?.includes(termo)
      );
    });
  };

  const handleAdicionar = async (adolescenteId: string) => {
    const grupoId =
      selecoes[adolescenteId] || grupos.find((grupo) => !!grupo)?.id;
    if (!grupoId) {
      return alert("Selecione um grupo válido");
    }

    try {
      setEnviandoId(adolescenteId);
      const response = await fetch(`/api/grupos/${grupoId}/adicionar-membro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adolescenteId }),
      });

      const data = await response.json();
      if (response.ok) {
        setAdolescentes((prev) =>
          prev.filter((item) => item.id !== adolescenteId)
        );
        onSuccess?.();
        return;
      }

      if (response.status === 400 && data.erro) {
        alert(data.erro);
        return;
      }

      alert(data.erro || "Erro ao adicionar adolescente");
    } catch (error) {
      console.error("Erro ao adicionar adolescente", error);
      alert("Erro ao adicionar adolescente");
    } finally {
      setEnviandoId(null);
    }
  };

  const handleSelecaoGrupo = (adolescenteId: string, grupoId: string) => {
    setSelecoes((prev) => ({ ...prev, [adolescenteId]: grupoId }));
  };

  const adolescentesFiltrados = filtrarAdolescentes();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Encontrar adolescentes sem grupo</h2>
            <p className="text-sm text-gray-600">
              Selecione um adolescente e atribua-o rapidamente a um grupo existente.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="flex items-center gap-3">
            <Search className="text-gray-400" size={20} />
            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome, ID ou SMS..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-200 text-sm text-gray-500">
              {carregandoGrupos
                ? "Carregando grupos..."
                : grupos.length === 0
                ? "Cadastre um grupo antes."
                : `${grupos.length} grupo(s) disponíveis`}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-200 text-sm text-gray-500">
              {carregando ? "Buscando adolescentes..." : `Encontrados ${adolescentesFiltrados.length}`}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[60vh]">
            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-3"></div>
                <p className="text-sm text-gray-600">Buscando adolescentes...</p>
              </div>
            ) : adolescentesFiltrados.length === 0 ? (
              <p className="text-center text-gray-500 py-12">Nenhum adolescente encontrado.</p>
            ) : (
              <div className="space-y-3">
                {adolescentesFiltrados.map((adolescente) => (
                  <div
                    key={adolescente.id}
                    className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{adolescente.nomeCompleto}</p>
                        <p className="text-sm text-gray-500">
                          SMS: {adolescente.numeroSms ?? "—"}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">{adolescente.id}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {adolescente.alojamentoAtual
                        ? `${adolescente.alojamentoAtual.casa?.nome ?? "Casa ?"} - Aloj. ${adolescente.alojamentoAtual.numeroAlojamento ?? "-"}${adolescente.alojamentoAtual.ala ? ` (${adolescente.alojamentoAtual.ala})` : ""}`
                        : "Sem alojamento definido"}
                    </p>
                    <div className="flex flex-col gap-2">
                      <select
                        value={selecoes[adolescente.id] ?? ""}
                        onChange={(event) =>
                          handleSelecaoGrupo(adolescente.id, event.target.value)
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      >
                        <option value="">Selecione o grupo</option>
                        {grupos.map((grupo) => (
                          <option key={grupo.id} value={grupo.id}>
                            {grupo.nomeGrupo}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAdicionar(adolescente.id)}
                        disabled={enviandoId === adolescente.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <UserCheck size={16} />
                        {enviandoId === adolescente.id ? "Adicionando..." : "Atribuir a um grupo"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
