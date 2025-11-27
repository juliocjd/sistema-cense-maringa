"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
  Users,
} from "lucide-react";

type EventoStatus = "PLANEJADO" | "EM_ANDAMENTO" | "CONCLUIDO";

type EventoEspecial = {
  id: string;
  nomeEvento: string;
  dataHoraInicio: string;
  dataHoraFim?: string | null;
  tipo?: string | null;
  status: EventoStatus;
  observacoes?: string | null;
  grupos?: Array<{
    id: string;
    nomeGrupo: string | null;
    casa?: {
      id: string;
      nome: string;
      numero: number | null;
    } | null;
  }>;
  participantes?: Array<{
    id: string;
    nomeCompleto: string | null;
    statusUnidade: string | null;
  }>;
};

const STATUS_OPTIONS: Array<{ value: "" | EventoStatus; label: string }> = [
  { value: "", label: "Todos os status" },
  { value: "PLANEJADO", label: "Planejado" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "CONCLUIDO", label: "Concluído" },
];

const STATUS_BADGES: Record<EventoStatus, string> = {
  PLANEJADO: "bg-amber-100 text-amber-700 border border-amber-200",
  EM_ANDAMENTO: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  CONCLUIDO: "bg-slate-100 text-slate-600 border border-slate-200",
};

const STATUS_LABELS: Record<EventoStatus, string> = {
  PLANEJADO: "Planejado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
};

const formatarDataHora = (valor?: string | null) => {
  if (!valor) {
    return "--";
  }

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
};

const resumoParticipantes = (evento: EventoEspecial) => {
  const total = evento.participantes?.length ?? 0;
  if (total === 0) {
    return "Nenhum participante confirmado";
  }
  if (total === 1) {
    return "1 participante confirmado";
  }
  return `${total} participantes confirmados`;
};

export default function EventosEspeciaisPage() {
  const [eventos, setEventos] = useState<EventoEspecial[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<"" | EventoStatus>("");
  const [busca, setBusca] = useState("");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const carregarEventos = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      params.set("incluirGrupos", "true");
      params.set("incluirParticipantes", "true");
      if (statusFiltro) {
        params.set("status", statusFiltro);
      }

      const url = `/api/eventos-especiais${
        params.size > 0 ? `?${params.toString()}` : ""
      }`;
      const response = await fetch(url, { cache: "no-store" });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof payload?.erro === "string"
            ? payload.erro
            : "Erro ao carregar eventos especiais"
        );
      }

      const lista = Array.isArray(payload?.eventos) ? payload.eventos : [];
      setEventos(lista);
      setUltimaAtualizacao(new Date());
    } catch (error) {
      setEventos([]);
      setUltimaAtualizacao(null);
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao carregar eventos"
      );
    } finally {
      setLoading(false);
    }
  }, [statusFiltro]);

  useEffect(() => {
    carregarEventos();
  }, [carregarEventos]);

  const eventosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) {
      return eventos;
    }

    return eventos.filter((evento) => {
      const campos = [
        evento.nomeEvento,
        evento.tipo,
        evento.observacoes,
        evento.participantes?.map((p) => p.nomeCompleto).join(" "),
        evento.grupos?.map((g) => g.nomeGrupo).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return campos.includes(termo);
    });
  }, [eventos, busca]);

  const totalParticipantes = eventosFiltrados.reduce(
    (acc, evento) => acc + (evento.participantes?.length ?? 0),
    0
  );
  const emAndamento = eventosFiltrados.filter(
    (evento) => evento.status === "EM_ANDAMENTO"
  ).length;
  const planejados = eventosFiltrados.filter(
    (evento) => evento.status === "PLANEJADO"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-indigo-600 font-semibold">
            Eventos Especiais
          </p>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">
            Monitoramento e planejamento
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Acompanhe operações fora da rotina, confirme participantes e avalie
            rapidamente o impacto sobre alojamentos e grupos.
          </p>
        </div>

        <button
          onClick={carregarEventos}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-900 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : undefined}
          />
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Eventos ativos</p>
            <Calendar className="text-indigo-500" size={18} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {eventosFiltrados.length}
          </p>
          <p className="text-sm text-slate-500">
            {eventosFiltrados.length === 1
              ? "1 registro monitorado"
              : `${eventosFiltrados.length} registros monitorados`}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Participantes</p>
            <Users className="text-emerald-500" size={18} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {totalParticipantes}
          </p>
          <p className="text-sm text-slate-500">
            {totalParticipantes === 1
              ? "1 adolescente vinculado"
              : `${totalParticipantes} adolescentes vinculados`}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Situação</p>
            <AlertTriangle className="text-amber-500" size={18} />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {emAndamento} em andamento
              </p>
              <p className="text-sm text-slate-500">{planejados} planejados</p>
            </div>
            <CheckCircle className="text-emerald-500" size={24} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-col">
              <label className="text-sm font-medium text-slate-600">
                Filtrar por status
              </label>
              <div className="relative mt-1">
                <select
                  value={statusFiltro}
                  onChange={(event) =>
                    setStatusFiltro(event.target.value as "" | EventoStatus)
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value || "todos"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                  ▾
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col">
              <label className="text-sm font-medium text-slate-600">
                Buscar por nome ou grupo
              </label>
              <input
                type="text"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Digite parte do nome, tipo ou participante"
                className="mt-1 rounded-xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock size={16} />
            {ultimaAtualizacao
              ? `Atualizado às ${ultimaAtualizacao.toLocaleTimeString("pt-BR")}`
              : "Sem atualização recente"}
          </div>
        </div>

        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {!erro && eventosFiltrados.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <p className="text-lg font-semibold text-slate-700">
              Nenhum evento encontrado
            </p>
            <p className="mt-2 text-slate-500">
              Ajuste os filtros acima ou cadastre um novo evento especial.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {eventosFiltrados.map((evento) => (
            <div
              key={evento.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-slate-900">
                      {evento.nomeEvento}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_BADGES[evento.status]}`}
                    >
                      {STATUS_LABELS[evento.status]}
                    </span>
                  </div>
                  {evento.tipo && (
                    <p className="text-sm font-medium text-indigo-600">
                      {evento.tipo}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>Início: {formatarDataHora(evento.dataHoraInicio)}</p>
                  <p>Fim: {formatarDataHora(evento.dataHoraFim)}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Participantes
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {resumoParticipantes(evento)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Grupos envolvidos
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {evento.grupos?.length
                      ? evento.grupos
                          .map((grupo) => grupo.nomeGrupo ?? "Grupo sem nome")
                          .join(", ")
                      : "Nenhum grupo associado"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Observações
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {evento.observacoes
                      ? evento.observacoes
                      : "Sem observações registradas"}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 px-6 py-10 text-center text-indigo-700">
              Carregando eventos...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
