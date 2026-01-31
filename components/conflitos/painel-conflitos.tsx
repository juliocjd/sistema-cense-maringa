"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  MapPin,
  Search,
  Shield,
  Swords,
  Trash2,
  X,
} from "lucide-react";

import {
  ConflitoExternoResumo,
  ImpactoConflitoPayload,
} from "@/types/inteligencia";
import RelatorioImpactoCard from "./relatorio-impacto-card";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

type FiltroTipo = "TODOS" | "BAIRRO" | "FACCAO";
type FiltroStatus = "TODOS" | "ATIVO" | "INATIVO";

interface PainelConflitosProps {
  conflitos: ConflitoExternoResumo[];
  impactoResumo: ImpactoConflitoPayload;
  acoesHeader?: ReactNode;
}

export default function PainelConflitos({
  conflitos,
  impactoResumo,
  acoesHeader,
}: PainelConflitosProps) {
  const router = useRouter();
  const { user } = useAuth();
  const podeGerenciar = useMemo(
    () => hasPermission(user?.permissions, PERMISSIONS.CONFLITOS_EXTERNOS_MANAGE),
    [user?.permissions]
  );
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>("TODOS");
  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>("ATIVO");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [estadoAcao, setEstadoAcao] = useState<Record<string, string>>({});
  const [impactoSelecionado, setImpactoSelecionado] =
    useState<ConflitoExternoResumo | null>(null);

  const resumoImpacto = useMemo(() => {
    const mapa = new Map<string, number>();
    impactoResumo.resumoPorConflito.forEach((item) => {
      mapa.set(item.conflitoId, item.totalAdolescentes);
    });
    return mapa;
  }, [impactoResumo]);

  const stats = useMemo(() => {
    const territoriais = conflitos.filter((c) => c.tipo === "BAIRRO").length;
    const faccionais = conflitos.filter((c) => c.tipo === "FACCAO").length;
    const ativos = conflitos.filter((c) => c.status === "ATIVO").length;
    return {
      total: conflitos.length,
      territoriais,
      faccionais,
      ativos,
    };
  }, [conflitos]);

  const conflitosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return conflitos.filter((conflito) => {
      const matchBusca =
        termo.length === 0 ||
        conflito.origem.nome.toLowerCase().includes(termo) ||
        conflito.destino.nome.toLowerCase().includes(termo) ||
        conflito.origem.complemento?.toLowerCase().includes(termo) ||
        conflito.destino.complemento?.toLowerCase().includes(termo);

      const matchTipo =
        tipoFiltro === "TODOS" || conflito.tipo === tipoFiltro;

      const matchStatus =
        statusFiltro === "TODOS" || conflito.status === statusFiltro;

      return matchBusca && matchTipo && matchStatus;
    });
  }, [busca, conflitos, statusFiltro, tipoFiltro]);

  const encerrarConflito = async (conflito: ConflitoExternoResumo) => {
    if (!podeGerenciar) {
      return;
    }
    if (conflito.status !== "ATIVO") {
      return;
    }

    const endpoint =
      conflito.tipo === "BAIRRO"
        ? `/api/bairros/conflitos/${conflito.id}`
        : `/api/faccoes/conflitos/${conflito.id}`;

    setEstadoAcao((prev) => ({ ...prev, [conflito.id]: "ENCERRANDO" }));
    try {
      const resposta = await fetch(endpoint, { method: "DELETE" });
      if (!resposta.ok) {
        const mensagem = await resposta.json().catch(() => null);
        throw new Error(mensagem?.erro ?? "Erro ao encerrar conflito");
      }
      setEstadoAcao((prev) => ({ ...prev, [conflito.id]: "ENCERRADO" }));
      router.refresh();
    } catch (error) {
      setEstadoAcao((prev) => ({
        ...prev,
        [conflito.id]: (error as Error).message,
      }));
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "ATIVO") {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-300 flex items-center gap-1">
          <AlertTriangle size={12} />
          ATIVO
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-300 flex items-center gap-1">
        <CheckCircle size={12} />
        ENCERRADO
      </span>
    );
  };

  const getTipoColor = (tipo: ConflitoExternoResumo["tipo"]) => {
    const cores: Record<ConflitoExternoResumo["tipo"], string> = {
      BAIRRO: "bg-orange-100 text-orange-800 border-orange-300",
      FACCAO: "bg-red-100 text-red-800 border-red-300",
    };
    return cores[tipo] ?? "bg-gray-100 text-gray-800 border-gray-300";
  };

  const limparFiltros = () => {
    setBusca("");
    setTipoFiltro("TODOS");
    setStatusFiltro("TODOS");
  };

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-red-600">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                <Swords className="text-red-600" size={36} />
                Conflitos externos
              </h1>
              <p className="text-gray-600">
                {conflitosFiltrados.length} conflito(s) encontrado(s)
              </p>
            </div>
            {acoesHeader && (
              <div className="flex flex-wrap gap-2">
                {acoesHeader}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-gray-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total de Conflitos</p>
                <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <Swords size={32} className="text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Conflitos Ativos</p>
                <p className="text-3xl font-bold text-red-600">{stats.ativos}</p>
              </div>
              <AlertTriangle size={32} className="text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Territoriais</p>
                <p className="text-3xl font-bold text-orange-600">{stats.territoriais}</p>
              </div>
              <MapPin size={32} className="text-orange-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Faccionais</p>
                <p className="text-3xl font-bold text-purple-600">{stats.faccionais}</p>
              </div>
              <Shield size={32} className="text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por bairro ou faccao..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 font-semibold text-sm text-gray-600 hover:border-red-500 hover:text-red-500 transition"
            >
              <Filter size={18} />
              {mostrarFiltros ? "Ocultar filtros" : "Filtros"}
            </button>
            <button
              type="button"
              onClick={limparFiltros}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 font-semibold text-sm text-gray-600 hover:border-red-500 hover:text-red-500 transition"
            >
              <X size={18} />
              Limpar
            </button>
          </div>

          {mostrarFiltros && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={tipoFiltro}
                onChange={(event) => setTipoFiltro(event.target.value as FiltroTipo)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200"
              >
                <option value="TODOS">Todos os tipos</option>
                <option value="BAIRRO">Territorial</option>
                <option value="FACCAO">Faccao</option>
              </select>
              <select
                value={statusFiltro}
                onChange={(event) => setStatusFiltro(event.target.value as FiltroStatus)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200"
              >
                <option value="TODOS">Todos os status</option>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Encerrado</option>
              </select>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {conflitosFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <Swords size={64} className="mx-auto mb-4 text-gray-400" />
              <p className="text-xl font-semibold text-gray-600 mb-2">
                Nenhum conflito encontrado
              </p>
              <p className="text-gray-500">Tente ajustar os filtros ou busca</p>
            </div>
          ) : (
            conflitosFiltrados.map((conflito) => {
              const impacto = resumoImpacto.get(conflito.id) ?? undefined;
              const dataCriacao =
                conflito.criadoEm && !Number.isNaN(Date.parse(conflito.criadoEm))
                  ? new Date(conflito.criadoEm).toLocaleDateString("pt-BR")
                  : null;
              const statusAtivo = conflito.status === "ATIVO";
              const bordaStatus = statusAtivo
                ? "border-red-500"
                : "border-green-500";

              return (
                <div
                  key={conflito.id}
                  className={`bg-white rounded-xl shadow-lg p-6 border-l-4 hover:shadow-xl transition-all ${bordaStatus}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 ${statusAtivo ? "bg-red-100" : "bg-green-100"} rounded-full flex items-center justify-center`}
                      >
                        {statusAtivo ? (
                          <AlertTriangle size={24} className="text-red-600" />
                        ) : (
                          <CheckCircle size={24} className="text-green-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          {conflito.origem.nome} x {conflito.destino.nome}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold border ${getTipoColor(
                              conflito.tipo
                            )}`}
                          >
                            {conflito.tipo === "BAIRRO" ? "Territorial" : "Faccao"}
                          </span>
                          {getStatusBadge(conflito.status)}
                          {impacto !== undefined && impacto > 0 && (
                            <span className="px-2 py-1 rounded text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700">
                              Impacto: {impacto}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setImpactoSelecionado(conflito)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-semibold"
                      >
                        <Eye size={18} />
                        Ver impactos
                      </button>
                      {conflito.status === "ATIVO" && (
                        <button
                          type="button"
                          onClick={() => encerrarConflito(conflito)}
                          disabled={!podeGerenciar}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={18} />
                          Encerrar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Origem</p>
                      <p className="font-semibold text-gray-800">{conflito.origem.nome}</p>
                      {conflito.origem.complemento && (
                        <p className="text-sm text-gray-600">{conflito.origem.complemento}</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Destino</p>
                      <p className="font-semibold text-gray-800">{conflito.destino.nome}</p>
                      {conflito.destino.complemento && (
                        <p className="text-sm text-gray-600">{conflito.destino.complemento}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                    <div className="flex items-center gap-4 text-gray-600 flex-wrap">
                      <span>
                        <span className="font-semibold">Registrado:</span>{" "}
                        {dataCriacao ?? "Nao informado"}
                      </span>
                      {conflito.fonteInformacao && (
                        <span>
                          <span className="font-semibold">Fonte:</span>{" "}
                          {conflito.fonteInformacao}
                        </span>
                      )}
                    </div>
                    {estadoAcao[conflito.id] && (
                      <span className="text-xs font-semibold text-gray-500">
                        {estadoAcao[conflito.id]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {impactoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 md:px-4 py-4 md:py-8">
          <div className="relative flex w-full max-w-4xl flex-col rounded-2xl bg-white p-3 md:p-4 lg:p-6 shadow-2xl">
            <div className="mb-3 md:mb-4 flex items-start md:items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-widest text-indigo-500">
                  Impactos ativos
                </p>
                <h3 className="text-base md:text-lg font-semibold text-slate-900 truncate">
                  {impactoSelecionado.origem.nome} - {" "}
                  {impactoSelecionado.destino.nome}
                </h3>
                <p className="text-xs text-slate-500">
                  Lista de adolescentes ativos impactados por este conflito.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImpactoSelecionado(null)}
                className="rounded-full p-1.5 md:p-2 text-slate-500 hover:bg-slate-100 flex-shrink-0"
                aria-label="Fechar impactos do conflito"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            <div className="max-h-[70vh] md:max-h-[75vh] overflow-y-auto pr-1">
              <RelatorioImpactoCard
                resumo={impactoResumo}
                conflitoIdDefault={impactoSelecionado.id}
                id="impacto-conflito-selecionado"
                key={impactoSelecionado.id}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
