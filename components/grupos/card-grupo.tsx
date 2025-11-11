"use client";

import { Users, Calendar, MoreVertical, Eye, Edit, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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

type CardGrupoProps = {
  grupo: Grupo;
  onAtualizar: () => void;
};

export function CardGrupo({ grupo, onAtualizar }: CardGrupoProps) {
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [deletando, setDeletando] = useState(false);

  const handleDeletar = async () => {
    if (!confirm(`Deseja realmente excluir o grupo "${grupo.nomeGrupo}"?`)) {
      return;
    }

    try {
      setDeletando(true);
      const response = await fetch(`/api/grupos/${grupo.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.erro || "Erro ao excluir grupo");
        return;
      }

      alert("Grupo excluído com sucesso!");
      onAtualizar();
    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
      alert("Erro ao excluir grupo");
    } finally {
      setDeletando(false);
      setMostrarMenu(false);
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
      {/* Header do Card */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900">
                {grupo.nomeGrupo}
              </h3>
              {grupo.ordemAla && (
                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">
                  Ala {grupo.ordemAla}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{grupo.casa.nome}</p>
          </div>

          {/* Menu de Ações */}
          <div className="relative">
            <button
              onClick={() => setMostrarMenu(!mostrarMenu)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical size={18} className="text-gray-600" />
            </button>

            {mostrarMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMostrarMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                  <Link
                    href={`/grupos/${grupo.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Eye size={16} />
                    Ver Detalhes
                  </Link>
                  <Link
                    href={`/grupos/${grupo.id}?acao=adicionar-membro`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <UserPlus size={16} />
                    Adicionar Membro
                  </Link>
                  <button
                    onClick={handleDeletar}
                    disabled={deletando || (grupo.totalMembros ?? 0) > 0}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} />
                    {deletando ? "Excluindo..." : "Excluir Grupo"}
                  </button>
                  {(grupo.totalMembros ?? 0) > 0 && (
                    <div className="px-4 py-2 text-xs text-gray-500 italic">
                      Remova os membros primeiro
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Informações */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-600" />
            <span className="text-sm text-gray-600">Membros:</span>
            <span className="font-bold text-gray-900">
              {grupo.totalMembros ?? 0}
            </span>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              grupo.status === "ATIVO"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {grupo.status}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Calendar size={14} />
          Criado em {formatarData(grupo.criadoEm)}
        </div>

        {/* Botão de Ação Principal */}
        <Link
          href={`/grupos/${grupo.id}`}
          className="block w-full text-center bg-indigo-50 text-indigo-700 py-2 rounded-lg hover:bg-indigo-100 transition-colors font-semibold text-sm"
        >
          Ver Detalhes
        </Link>
      </div>
    </div>
  );
}
