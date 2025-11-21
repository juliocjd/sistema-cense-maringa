"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  Search,
  Shield,
  Trash2,
  X,
} from "lucide-react";

import {
  ConflitoExternoResumo,
  ImpactoConflitoPayload,
} from "@/types/inteligencia";
import RelatorioImpactoCard from "./relatorio-impacto-card";

type FiltroTipo = "TODOS" | "BAIRRO" | "FACCAO";
type FiltroStatus = "TODOS" | "ATIVO" | "INATIVO";

interface PainelConflitosProps {
  conflitos: ConflitoExternoResumo[];
  impactoResumo: ImpactoConflitoPayload;
}

export default function PainelConflitos({
  conflitos,
  impactoResumo,
}: PainelConflitosProps) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>("TODOS");
  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>("TODOS");
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

  const getTipoBadge = (tipo: ConflitoExternoResumo["tipo"]) => {
    if (tipo === "BAIRRO") {
      return "bg-amber-100 text-amber-800 border-amber-300";
    }
    return "bg-rose-100 text-rose-800 border-rose-300";
  };

  const getStatusBadge = (status: string) => {
    if (status === "ATIVO") {
      return "bg-red-100 text-red-700 border-red-300";
    }
    return "bg-emerald-100 text-emerald-700 border-emerald-300";
  };

  return (
    <>
      <section className="space-y-4 md:space-y-5 rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
      <header className="flex flex-col gap-3 md:gap-4 border-b border-slate-100 pb-3 md:pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-500">
            Monitoramento preventivo
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">
            Conflitos externos
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            {stats.total} registros (ativo(s): {stats.ativos}) — territoriais:{" "}
            {stats.territoriais}, faccionais: {stats.faccionais}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setTipoFiltro("TODOS");
              setStatusFiltro("TODOS");
              setBusca("");
            }}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 md:px-3 py-1 font-semibold text-slate-600"
          >
            <Filter className="w-3 h-3" />
            Limpar filtros
          </button>
        </div>
      </header>

      <div className="grid gap-2 md:gap-3 sm:grid-cols-2 md:grid-cols-3">
        <label className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 md:px-3 py-2 text-xs md:text-sm">
          <Search className="mr-2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por bairro ou faccao"
            className="w-full border-0 bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none min-w-0"
          />
        </label>

        <select
          value={tipoFiltro}
          onChange={(event) => setTipoFiltro(event.target.value as FiltroTipo)}
          className="rounded-xl border border-slate-200 bg-white px-2.5 md:px-3 py-2 text-xs md:text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="TODOS">Todos os tipos</option>
          <option value="BAIRRO">Territorial</option>
          <option value="FACCAO">Faccao</option>
        </select>

        <select
          value={statusFiltro}
          onChange={(event) =>
            setStatusFiltro(event.target.value as FiltroStatus)
          }
          className="rounded-xl border border-slate-200 bg-white px-2.5 md:px-3 py-2 text-xs md:text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="TODOS">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Encerrado</option>
        </select>
      </div>

      {conflitosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 md:p-10 text-center text-xs md:text-sm text-slate-500">
          Nenhum conflito encontrado para os filtros informados.
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {conflitosFiltrados.map((conflito) => {
            const impacto =
              resumoImpacto.get(conflito.id) ?? undefined;
            const dataCriacao =
              conflito.criadoEm && !Number.isNaN(Date.parse(conflito.criadoEm))
                ? new Date(conflito.criadoEm).toLocaleDateString("pt-BR")
                : null;
            return (
              <div
                key={conflito.id}
                className="rounded-2xl border border-slate-200 p-3 md:p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 md:px-3 py-1 text-xs font-semibold ${getTipoBadge(
                        conflito.tipo
                      )}`}
                    >
                      <Shield className="w-3 h-3" />
                      {conflito.tipo === "BAIRRO"
                        ? "Territorial"
                        : "Faccao"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 md:px-3 py-1 text-xs font-semibold ${getStatusBadge(
                        conflito.status
                      )}`}
                    >
                      {conflito.status === "ATIVO" ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      {conflito.status}
                    </span>
                  </div>
                  {impacto !== undefined && impacto > 0 && (
                    <span className="text-xs font-semibold text-slate-500">
                      Impacto direto em {impacto} adolescente(s)
                    </span>
                  )}
                </div>

                <div className="mt-2 md:mt-3 space-y-1">
                  <p className="text-base md:text-lg font-semibold text-slate-900">
                    {conflito.origem.nome} → {conflito.destino.nome}
                  </p>
                  <p className="text-xs md:text-sm text-slate-500">
                    {conflito.origem.complemento}
                    {conflito.origem.complemento && conflito.destino.complemento
                      ? " • "
                      : ""}
                    {conflito.destino.complemento}
                  </p>
                  <p className="text-xs text-slate-400">
                    {dataCriacao
                      ? `Registrado em ${dataCriacao}`
                      : "Registro recente (sem data registrada)"}
                  </p>
                  {conflito.fonteInformacao && (
                    <p className="text-xs text-slate-500">
                      Fonte: {conflito.fonteInformacao}
                    </p>
                  )}
                </div>

                <div className="mt-3 md:mt-4 flex flex-wrap gap-2 md:gap-3">
                  <button
                    type="button"
                    onClick={() => setImpactoSelecionado(conflito)}
                    className="inline-flex items-center gap-1 rounded-full border border-indigo-200 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
                  >
                    <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Ver impactos</span>
                    <span className="sm:hidden">Impactos</span>
                  </button>
                  {conflito.status === "ATIVO" && (
                    <button
                      type="button"
                      onClick={() => encerrarConflito(conflito)}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white"
                    >
                      <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      Encerrar
                    </button>
                  )}
                  {estadoAcao[conflito.id] && (
                    <span className="text-xs font-semibold text-slate-500">
                      {estadoAcao[conflito.id]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
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
