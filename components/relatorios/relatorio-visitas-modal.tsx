"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Download,
  FileDown,
  Loader2,
  RefreshCw,
  Search,
  Table,
  User,
  Users,
  X,
} from "lucide-react";

type ResultadoBusca = {
  id: string;
  nome: string;
  numeroSms?: string | null;
  status?: string | null;
  alojamento?: string | null;
};

type RelatorioVisitas = {
  mes: {
    nome: string;
    inicio: string;
    fim: string;
  };
  estatisticas: {
    totalVisitas: number;
    totalPessoas: number;
    visitantesUnicos: number;
    adolescentesVisitados: number;
    alertas: {
      faccaoRival: number;
      horario: number;
      limiteVisitas: number;
    };
  };
  porPeriodo: {
    MANHA: number;
    TARDE: number;
    ESPECIAL: number;
  };
  porAdolescente: Array<{
    adolescente: {
      nomeCompleto: string;
      nomeSocial: string | null;
    };
    totalVisitas: number;
    visitantes: string[];
  }>;
  porVisitante: Array<{
    visitante: {
      nomeCompleto: string;
    };
    totalVisitas: number;
    adolescentes: string[];
  }>;
};

const formatInputDate = (date: Date) => date.toISOString().slice(0, 10);

export function RelatorioVisitasModalTrigger() {
  const hoje = new Date();
  const inicioPadrao = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [aberto, setAberto] = useState(false);
  const [inicio, setInicio] = useState(formatInputDate(inicioPadrao));
  const [fim, setFim] = useState(formatInputDate(hoje));
  const [adolescenteBusca, setAdolescenteBusca] = useState("");
  const [adolescenteSelecionado, setAdolescenteSelecionado] =
    useState<ResultadoBusca | null>(null);
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioVisitas | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto || adolescenteBusca.trim().length < 2) {
      setResultados([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(adolescenteBusca)}`,
          { signal: controller.signal }
        );
        if (!response.ok) return;
        const json = await response.json();
        setResultados(json.resultados?.adolescentes ?? []);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [aberto, adolescenteBusca]);

  const resetFiltros = () => {
    setAdolescenteBusca("");
    setResultados([]);
    setAdolescenteSelecionado(null);
    setInicio(formatInputDate(inicioPadrao));
    setFim(formatInputDate(hoje));
  };

  const limparEstados = () => {
    resetFiltros();
    setRelatorio(null);
    setErro(null);
  };

  const gerarRelatorio = async () => {
    if (!inicio || !fim) {
      setErro("Informe o periodo completo.");
      return;
    }
    setCarregando(true);
    setErro(null);
    setRelatorio(null);
    try {
      const params = new URLSearchParams({ inicio, fim });
      if (adolescenteSelecionado) {
        params.set("adolescenteId", adolescenteSelecionado.id);
      }
      const response = await fetch(`/api/visitas/relatorio-mensal?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.erro ?? "Falha ao carregar relatorio");
      }
      const json = (await response.json()) as RelatorioVisitas;
      setRelatorio(json);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setCarregando(false);
    }
  };

  const totalAlertas = useMemo(() => {
    if (!relatorio) return 0;
    return (
      relatorio.estatisticas.alertas.faccaoRival +
      relatorio.estatisticas.alertas.horario +
      relatorio.estatisticas.alertas.limiteVisitas
    );
  }, [relatorio]);

  const topAdolescentes = useMemo(() => {
    if (!relatorio) return [];
    return [...relatorio.porAdolescente]
      .sort((a, b) => b.totalVisitas - a.totalVisitas)
      .slice(0, 5);
  }, [relatorio]);

  const topVisitantes = useMemo(() => {
    if (!relatorio) return [];
    return [...relatorio.porVisitante]
      .sort((a, b) => b.totalVisitas - a.totalVisitas)
      .slice(0, 5);
  }, [relatorio]);

  const abrirArquivo = (tipo: "pdf" | "excel") => {
    if (!inicio || !fim) return;
    const params = new URLSearchParams({ inicio, fim });
    if (adolescenteSelecionado) {
      params.set("adolescenteId", adolescenteSelecionado.id);
    }
    const rota =
      tipo === "pdf"
        ? `/api/visitas/relatorio-mensal/pdf?${params.toString()}`
        : `/api/visitas/relatorio-mensal/excel?${params.toString()}`;
    window.open(rota, "_blank");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        Abrir relatorio
      </button>

      {aberto && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => {
              setAberto(false);
              limparEstados();
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-indigo-500">
                    Relatorio de visitas
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Exportar por periodo ou adolescente
                  </h2>
                  <p className="text-sm text-slate-600">
                    Defina o intervalo e, se desejar, filtre por um adolescente especifico.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false);
                    limparEstados();
                  }}
                  className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      Data inicial
                    </label>
                    <input
                      type="date"
                      value={inicio}
                      onChange={(event) => setInicio(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      Data final
                    </label>
                    <input
                      type="date"
                      value={fim}
                      onChange={(event) => setFim(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      Buscar adolescente (opcional)
                    </label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={adolescenteBusca}
                        onChange={(event) => setAdolescenteBusca(event.target.value)}
                        placeholder="Digite nome, SMS ou processo"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-9 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    {adolescenteSelecionado && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {adolescenteSelecionado.nome}
                        <button
                          type="button"
                          onClick={() => setAdolescenteSelecionado(null)}
                          className="text-indigo-500 hover:text-indigo-700"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {adolescenteBusca.trim().length >= 2 && resultados.length > 0 && (
                  <ul className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {resultados.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between border-b border-slate-100 px-3 py-2 last:border-b-0"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.nome}</p>
                          <p className="text-xs text-slate-500">
                            SMS: {item.numeroSms ?? "Nao informado"} • Status:{" "}
                            {item.status ?? "?"}
                          </p>
                          {item.alojamento && (
                            <p className="text-xs text-slate-500">{item.alojamento}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAdolescenteSelecionado(item);
                            setResultados([]);
                            setAdolescenteBusca("");
                          }}
                          className="rounded-lg border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                        >
                          Selecionar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={gerarRelatorio}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                  >
                    <RefreshCw size={16} />
                    Gerar relatorio
                  </button>
                  {relatorio && (
                    <>
                      <button
                        type="button"
                        onClick={() => abrirArquivo("pdf")}
                        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        <FileDown size={14} />
                        Baixar PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirArquivo("excel")}
                        className="inline-flex items-center gap-2 rounded-xl border border-green-200 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50"
                      >
                        <Table size={14} />
                        Baixar Excel
                      </button>
                    </>
                  )}
                  {erro && <p className="text-xs font-semibold text-rose-600">{erro}</p>}
                </div>
              </div>

              <div className="h-[55vh] overflow-y-auto px-6 py-4">
                {carregando && (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Coletando visitas...</span>
                  </div>
                )}

                {!carregando && !relatorio && !erro && (
                  <p className="text-center text-sm text-slate-500">
                    Informe o periodo e clique em &quot;Gerar relatorio&quot;.
                  </p>
                )}

                {relatorio && (
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                        <p className="text-xs font-semibold uppercase text-indigo-600">
                          Total de visitas
                        </p>
                        <p className="text-3xl font-bold text-indigo-900">
                          {relatorio.estatisticas.totalVisitas}
                        </p>
                        <p className="text-xs text-indigo-700">
                          {relatorio.estatisticas.totalPessoas} pessoas somadas
                        </p>
                      </div>
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-xs font-semibold uppercase text-emerald-600">
                          Visitantes unicos
                        </p>
                        <p className="text-3xl font-bold text-emerald-900">
                          {relatorio.estatisticas.visitantesUnicos}
                        </p>
                        <p className="text-xs text-emerald-700">
                          {relatorio.estatisticas.adolescentesVisitados} adolescentes visitados
                        </p>
                      </div>
                      <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                        <p className="text-xs font-semibold uppercase text-purple-600">
                          Alertas
                        </p>
                        <p className="text-3xl font-bold text-purple-900">{totalAlertas}</p>
                        <p className="text-xs text-purple-700">
                          Faccoes: {relatorio.estatisticas.alertas.faccaoRival} | Horario:{" "}
                          {relatorio.estatisticas.alertas.horario} | Limite:{" "}
                          {relatorio.estatisticas.alertas.limiteVisitas}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Periodo selecionado
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {relatorio.mes.nome}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      {(["MANHA", "TARDE", "ESPECIAL"] as const).map((periodo) => (
                        <div
                          key={periodo}
                          className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            {periodo === "MANHA"
                              ? "Manha"
                              : periodo === "TARDE"
                              ? "Tarde"
                              : "Especial"}
                          </p>
                          <p className="text-2xl font-bold text-slate-900">
                            {relatorio.porPeriodo[periodo]}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(
                              (relatorio.porPeriodo[periodo] /
                                relatorio.estatisticas.totalVisitas) *
                              100
                            ).toFixed(1)}
                            % das visitas
                          </p>
                        </div>
                      ))}
                    </div>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase text-slate-500">
                          Adolescentes com mais visitas
                        </h3>
                        <Users size={16} className="text-slate-400" />
                      </div>
                      {topAdolescentes.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Nenhuma visita encontrada para o periodo.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {topAdolescentes.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {item.adolescente.nomeCompleto ||
                                    item.adolescente.nomeSocial}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {item.visitantes.length} visitante(s)
                                </p>
                              </div>
                              <span className="text-lg font-bold text-slate-900">
                                {item.totalVisitas}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase text-slate-500">
                          Visitantes mais ativos
                        </h3>
                        <User size={16} className="text-slate-400" />
                      </div>
                      {topVisitantes.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Nenhum visitante encontrado para o periodo.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {topVisitantes.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {item.visitante.nomeCompleto}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {item.adolescentes.length} adolescente(s)
                                </p>
                              </div>
                              <span className="text-lg font-bold text-slate-900">
                                {item.totalVisitas}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
