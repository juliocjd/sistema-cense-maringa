"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  Search,
  Shield,
  Trash2,
} from "lucide-react";

import {
  ConflitoExternoResumo,
  ImpactoConflitoPayload,
} from "@/types/inteligencia";

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
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-500">
            Monitoramento preventivo
          </p>
          <h2 className="text-2xl font-bold text-slate-900">
            Conflitos externos
          </h2>
          <p className="text-sm text-slate-500">
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
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600"
          >
            <Filter size={12} />
            Limpar filtros
          </button>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <Search className="mr-2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por bairro ou faccao"
            className="w-full border-0 bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </label>

        <select
          value={tipoFiltro}
          onChange={(event) => setTipoFiltro(event.target.value as FiltroTipo)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
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
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="TODOS">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Encerrado</option>
        </select>
      </div>

      {conflitosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Nenhum conflito encontrado para os filtros informados.
        </div>
      ) : (
        <div className="space-y-4">
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
                className="rounded-2xl border border-slate-200 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${getTipoBadge(
                        conflito.tipo
                      )}`}
                    >
                      <Shield size={12} />
                      {conflito.tipo === "BAIRRO"
                        ? "Territorial"
                        : "Faccao"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(
                        conflito.status
                      )}`}
                    >
                      {conflito.status === "ATIVO" ? (
                        <AlertTriangle size={12} />
                      ) : (
                        <CheckCircle size={12} />
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

                <div className="mt-3 space-y-1">
                  <p className="text-lg font-semibold text-slate-900">
                    {conflito.origem.nome} → {conflito.destino.nome}
                  </p>
                  <p className="text-sm text-slate-500">
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
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/inteligencia/conflitos?conflitoId=${conflito.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
                  >
                    <Eye size={14} />
                    Ver impactos
                  </Link>
                  {conflito.status === "ATIVO" && (
                    <button
                      type="button"
                      onClick={() => encerrarConflito(conflito)}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white"
                    >
                      <Trash2 size={14} />
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
  );
}
