"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
} from "react";
import { Users, MapPin, Shield, Loader2, X, FileText } from "lucide-react";

type RelatorioTipo = "REGIAO" | "FACCAO";
type StatusFiltro = "ATIVOS" | "INATIVOS" | "OUTROS" | "TODOS";

type AdolescenteRelatorio = {
  id: string;
  nome: string;
  numeroSms?: string;
  statusUnidade?: string;
  alojamento?: string;
};

type GrupoRelatorio = {
  id: string;
  nome: string;
  descricao?: string | null;
  cidade?: string | null;
  total: number;
  adolescentes: AdolescenteRelatorio[];
};

type RelatorioResponse = {
  tipo: RelatorioTipo;
  statusFiltro?: StatusFiltro;
  grupos: GrupoRelatorio[];
};

const TIPOS: Array<{
  value: RelatorioTipo;
  label: string;
  icon: ReactNode;
}> = [
  {
    value: "REGIAO",
    label: "Regiões mapeadas",
    icon: <MapPin size={14} />,
  },
  {
    value: "FACCAO",
    label: "Facções cadastradas",
    icon: <Shield size={14} />,
  },
];

const STATUS_OPTIONS: Array<{ value: StatusFiltro; label: string }> = [
  { value: "ATIVOS", label: "Ativos" },
  { value: "INATIVOS", label: "Inativos" },
  { value: "OUTROS", label: "Outros status" },
  { value: "TODOS", label: "Todos" },
];

export default function RelatorioAfiliacoesModalTrigger() {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<RelatorioTipo>("REGIAO");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("ATIVOS");
  const [dados, setDados] = useState<RelatorioResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const totalInternos = useMemo(() => {
    if (!dados) return 0;
    return dados.grupos.reduce((acc, grupo) => acc + grupo.total, 0);
  }, [dados]);

  useEffect(() => {
    if (!aberto) return;
    setCarregando(true);
    setErro(null);

    const controller = new AbortController();
    const carregar = async () => {
      try {
        const searchParams = new URLSearchParams({
          tipo,
          status: statusFiltro,
        });
        const response = await fetch(
          `/api/inteligencia/relatorios/afiliacoes?${searchParams.toString()}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.erro ?? "Falha ao carregar relatório.");
        }
        const json = (await response.json()) as RelatorioResponse;
        setDados(json);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        setErro(
          error instanceof Error
            ? error.message
            : "Erro inesperado ao gerar relatório."
        );
      } finally {
        setCarregando(false);
      }
    };

    carregar();
    return () => controller.abort();
  }, [aberto, tipo, statusFiltro]);

  const fechar = () => {
    setAberto(false);
    setErro(null);
  };

  const alterarStatus = (event: ChangeEvent<HTMLSelectElement>) => {
    setStatusFiltro(event.target.value as StatusFiltro);
  };

  const toggleModal = () => {
    setAberto(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleModal}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
      >
        <Users size={16} />
        Relatório de Internos
      </button>

      {aberto && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={fechar}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-indigo-500">
                    Inteligência operacional
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Relatório de internos por afiliação
                  </h2>
                  <p className="text-sm text-slate-600">
                    Consulte rapidamente os adolescentes conforme regiões
                    mapeadas ou facções cadastradas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fechar}
                  className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    {TIPOS.map((opcao) => (
                      <button
                        key={opcao.value}
                        type="button"
                        onClick={() => setTipo(opcao.value)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          tipo === opcao.value
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {opcao.icon}
                        {opcao.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col text-sm text-slate-600">
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      Status dos internos
                    </span>
                    <select
                      value={statusFiltro}
                      onChange={alterarStatus}
                      className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((opcao) => (
                        <option key={opcao.value} value={opcao.value}>
                          {opcao.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="text-right text-sm text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-900">
                      {dados?.grupos.length ?? 0}
                    </span>{" "}
                    grupo(s) encontrados
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">
                      {totalInternos}
                    </span>{" "}
                    adolescente(s) listados
                  </div>
                </div>
              </div>

              <div className="h-[60vh] overflow-y-auto px-6 py-4">
                {carregando && (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p>Gerando relatório...</p>
                  </div>
                )}

                {!carregando && erro && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {erro}
                  </div>
                )}

                {!carregando && !erro && dados?.grupos.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Não há dados disponíveis para o tipo selecionado.
                  </div>
                )}

                {!carregando &&
                  !erro &&
                  (dados?.grupos ?? []).map((grupo) => (
                    <details
                      key={grupo.id}
                      className="group mb-3 rounded-xl border border-slate-200"
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-3 bg-slate-100 px-4 py-3 hover:bg-slate-200">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {grupo.nome}
                            {grupo.cidade ? ` • ${grupo.cidade}` : ""}
                          </p>
                          {grupo.descricao && (
                            <p className="text-xs text-slate-500">
                              {grupo.descricao}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {grupo.total} adolescente(s)
                        </span>
                      </summary>
                      {grupo.total === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          Nenhum adolescente vinculado.
                        </div>
                      ) : (
                        <div className="px-4 py-3">
                          <div className="overflow-x-auto rounded-lg border border-slate-100">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                                <tr>
                                  <th className="px-3 py-2">Nome</th>
                                  <th className="px-3 py-2">SMS</th>
                                  <th className="px-3 py-2">Status</th>
                                  <th className="px-3 py-2">Alojamento</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                                {grupo.adolescentes.map((adolescente) => (
                                  <tr key={adolescente.id}>
                                    <td className="px-3 py-2 font-semibold text-slate-900">
                                      {adolescente.nome}
                                    </td>
                                    <td className="px-3 py-2">
                                      {adolescente.numeroSms ?? "—"}
                                    </td>
                                    <td className="px-3 py-2 text-xs uppercase">
                                      {adolescente.statusUnidade ?? "—"}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-slate-600">
                                      {adolescente.alojamento ?? "Não informado"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </details>
                  ))}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  Relatório atualizado em tempo real.
                </div>
                <button
                  type="button"
                  onClick={fechar}
                  className="rounded-full border border-slate-300 px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
