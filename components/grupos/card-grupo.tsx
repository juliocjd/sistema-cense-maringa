"use client";

import {
  Users,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
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
  conflitosAtivos?: number;
  conflitosSemMediacao?: number;
  agrupamentosResumo?: {
    faccao: number;
    bairro: number;
    atoInfracional: number;
  };
  agrupamentosDetalhes?: {
    faccao: Array<{
      a: { id: string; nome: string };
      b: { id: string; nome: string };
      detalhe: string;
    }>;
    bairro: Array<{
      a: { id: string; nome: string };
      b: { id: string; nome: string };
      detalhe: string;
    }>;
    atoInfracional: Array<{
      a: { id: string; nome: string };
      b: { id: string; nome: string };
      detalhe: string;
    }>;
  };
};

type CardGrupoProps = {
  grupo: Grupo;
  onAtualizar: () => void;
  hideActions?: boolean;
  detalheHref?: string;
};

export function CardGrupo({
  grupo,
  onAtualizar,
  hideActions = false,
  detalheHref,
}: CardGrupoProps) {
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [deletando, setDeletando] = useState(false);
  const [detalheAberto, setDetalheAberto] = useState<
    null | "faccao" | "bairro" | "atoInfracional"
  >(null);

  const prioridade = () => {
    if ((grupo.conflitosSemMediacao ?? 0) > 0) {
      return { label: "Alerta crítico", color: "bg-red-50 text-red-700" };
    }
    if ((grupo.conflitosAtivos ?? 0) > 0) {
      return {
        label: "Monitorar conflitos",
        color: "bg-amber-50 text-amber-700",
      };
    }
    return { label: "Sem conflitos", color: "bg-green-50 text-green-700" };
  };

  const resumoAgrupamentos = grupo.agrupamentosResumo ?? {
    faccao: 0,
    bairro: 0,
    atoInfracional: 0,
  };
  const detalhesAgrupamentos = grupo.agrupamentosDetalhes ?? {
    faccao: [],
    bairro: [],
    atoInfracional: [],
  };
  const temAgrupamentos =
    resumoAgrupamentos.faccao > 0 ||
    resumoAgrupamentos.bairro > 0 ||
    resumoAgrupamentos.atoInfracional > 0;

  const tituloDetalhe = {
    faccao: "Mesma faccao",
    bairro: "Mesmo bairro",
    atoInfracional: "Compartilham o mesmo Ato Infracional",
  } as const;

  const detalhesAtivos =
    detalheAberto === null ? [] : detalhesAgrupamentos[detalheAberto];

  const formatarPares = (detalhes: typeof detalhesAtivos) =>
    detalhes.map((item) => `${item.a.nome} e ${item.b.nome}`);

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
          {!hideActions && (
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
                      href={detalheHref || `/grupos/${grupo.id}`}
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
          )}
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
        <div className="flex flex-col gap-2 mb-3">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${prioridade().color}`}
          >
            {prioridade().label} · {grupo.conflitosAtivos ?? 0} conflito(s)
          </span>
          <p className="text-xs text-gray-500">
            {prioridade().label === "Alerta crítico"
              ? "Há conflitos sem mediação - recomende o reagrupamento."
              : prioridade().label === "Monitorar conflitos"
                ? "Alguns conflitos ativos exigem atenção."
                : "Nenhum conflito ativo detectado."}
          </p>
        </div>
        {temAgrupamentos && (
          <div className="flex flex-wrap gap-2 mb-4">
            {resumoAgrupamentos.faccao > 0 && (
              <button
                type="button"
                onClick={() => setDetalheAberto("faccao")}
                className="rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700"
              >
                Faccao: {resumoAgrupamentos.faccao}
              </button>
            )}
            {resumoAgrupamentos.bairro > 0 && (
              <button
                type="button"
                onClick={() => setDetalheAberto("bairro")}
                className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700"
              >
                Bairro: {resumoAgrupamentos.bairro}
              </button>
            )}
            {resumoAgrupamentos.atoInfracional > 0 && (
              <button
                type="button"
                onClick={() => setDetalheAberto("atoInfracional")}
                className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 text-left"
              >
                <span className="block">
                  Compartilham o mesmo Ato Infracional:
                </span>
                <ul className="mt-1 list-disc list-inside space-y-1 font-medium">
                  {formatarPares(detalhesAgrupamentos.atoInfracional).map(
                    (par, index) => (
                      <li key={`${par}-${index}`}>{par}</li>
                    ),
                  )}
                </ul>
              </button>
            )}
          </div>
        )}
        <Link
          href={`/grupos/${grupo.id}`}
          className="block w-full text-center bg-indigo-50 text-indigo-700 py-2 rounded-lg hover:bg-indigo-100 transition-colors font-semibold text-sm"
        >
          Ver Detalhes
        </Link>
      </div>

      {detalheAberto && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {tituloDetalhe[detalheAberto]}
                </h3>
                <p className="text-xs text-gray-500">
                  Grupo {grupo.nomeGrupo} - {grupo.casa.nome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetalheAberto(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {detalhesAtivos.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nenhum detalhe disponivel.
                </p>
              ) : (
                <div className="space-y-3">
                  {detalhesAtivos.map((item, index) => (
                    <div
                      key={`${item.a.id}-${item.b.id}-${index}`}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
                    >
                      <p className="font-semibold text-gray-900">
                        {item.a.nome} x {item.b.nome}
                      </p>
                      <p className="text-xs text-gray-500">{item.detalhe}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
