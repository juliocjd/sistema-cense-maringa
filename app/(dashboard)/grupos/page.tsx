"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Filter, X } from "lucide-react";
import Link from "next/link";
import { CardGrupo } from "@/components/grupos/card-grupo";

type Casa = {
  id: string;
  nome: string;
  numero: number;
};

type Grupo = {
  id: string;
  nomeGrupo: string;
  ordemAla: string | null;
  status: "ATIVO" | "INATIVO";
  criadoEm: string;
  casa: Casa;
  totalMembros?: number;
};

export default function GruposPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    casaId: "",
    status: "ATIVO",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [casas, setCasas] = useState<Casa[]>([]);

  useEffect(() => {
    carregarCasas();
    carregarGrupos();
  }, []);

  useEffect(() => {
    carregarGrupos();
  }, [filtros]);

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

  const carregarGrupos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.casaId) params.append("casa_id", filtros.casaId);
      if (filtros.status) params.append("status", filtros.status);
      params.append("incluir_membros", "true");

      const response = await fetch(`/api/grupos?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar grupos");
      }

      const data = await response.json();
      setGrupos(data.grupos || []);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
      setGrupos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLimparFiltros = () => {
    setFiltros({
      casaId: "",
      status: "ATIVO",
    });
  };

  const gruposPorCasa = grupos.reduce((acc, grupo) => {
    const casaNome = grupo.casa.nome;
    if (!acc[casaNome]) {
      acc[casaNome] = [];
    }
    acc[casaNome].push(grupo);
    return acc;
  }, {} as Record<string, Grupo[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando grupos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="text-indigo-600" size={32} />
              Gestão de Grupos
            </h1>
            <p className="text-gray-600 mt-1">
              Organize adolescentes em grupos por casa e atividades
            </p>
          </div>

          <Link
            href="/grupos/novo"
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl font-semibold justify-center w-full lg:w-auto"
          >
            <Plus size={20} />
            Novo Grupo
          </Link>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="flex items-center gap-2 text-gray-700 font-semibold hover:text-indigo-600 transition-colors"
            >
              <Filter size={20} />
              Filtros
              {(filtros.casaId || filtros.status !== "ATIVO") && (
                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-bold">
                  Ativos
                </span>
              )}
            </button>

            {(filtros.casaId || filtros.status !== "ATIVO") && (
              <button
                onClick={handleLimparFiltros}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-semibold"
              >
                <X size={16} />
                Limpar filtros
              </button>
            )}
          </div>

          {mostrarFiltros && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
              {/* Filtro por Casa */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Casa
                </label>
                <select
                  value={filtros.casaId}
                  onChange={(e) =>
                    setFiltros({ ...filtros, casaId: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                >
                  <option value="">Todas as casas</option>
                  {casas.map((casa) => (
                    <option key={casa.id} value={casa.id}>
                      {casa.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filtros.status}
                  onChange={(e) =>
                    setFiltros({ ...filtros, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                >
                  <option value="">Todos</option>
                  <option value="ATIVO">Ativos</option>
                  <option value="INATIVO">Inativos</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-semibold">Total de Grupos</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{grupos.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-semibold">Grupos Ativos</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {grupos.filter((g) => g.status === "ATIVO").length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-semibold">Total de Membros</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">
            {grupos.reduce((acc, g) => acc + (g.totalMembros || 0), 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-semibold">Casas com Grupos</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {Object.keys(gruposPorCasa).length}
          </p>
        </div>
      </div>

      {/* Listagem de Grupos */}
      {grupos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Users className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Nenhum grupo encontrado
          </h3>
          <p className="text-gray-600 mb-6">
            {filtros.casaId || filtros.status !== "ATIVO"
              ? "Tente ajustar os filtros ou criar um novo grupo."
              : "Comece criando seu primeiro grupo."}
          </p>
          <Link
            href="/grupos/novo"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            <Plus size={20} />
            Criar Primeiro Grupo
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(gruposPorCasa)
            .sort(([casaA], [casaB]) => casaA.localeCompare(casaB))
            .map(([casaNome, gruposCasa]) => (
              <div key={casaNome}>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                  {casaNome}
                  <span className="text-sm font-normal text-gray-600">
                    ({gruposCasa.length}{" "}
                    {gruposCasa.length === 1 ? "grupo" : "grupos"})
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gruposCasa.map((grupo) => (
                    <CardGrupo
                      key={grupo.id}
                      grupo={grupo}
                      onAtualizar={carregarGrupos}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
