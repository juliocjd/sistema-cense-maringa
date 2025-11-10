"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  Filter,
  Lock,
  MapPin,
  Search,
  UserPlus,
  Flame,
} from "lucide-react";
import type { Adolescente } from "@/types";

interface ListagemAdolescentesProps {
  adolescentes: Adolescente[];
}

type StatusFiltro = "TODOS" | "ATIVO" | "TRANSFERIDO" | "LIBERADO" | "EVADIDO";
type AlertaFiltro =
  | "TODOS"
  | "RISCO_SUICIDIO"
  | "PERFIL_MAPEADO"
  | "SAUDE"
  | "COM_ALERTAS";

const STATUS_OPTIONS: Array<{ label: string; value: StatusFiltro }> = [
  { label: "Todos", value: "TODOS" },
  { label: "Ativo", value: "ATIVO" },
  { label: "Transferido", value: "TRANSFERIDO" },
  { label: "Liberado", value: "LIBERADO" },
  { label: "Evadido", value: "EVADIDO" },
];

const ALERTA_OPTIONS: Array<{ label: string; value: AlertaFiltro }> = [
  { label: "Todos", value: "TODOS" },
  { label: "Risco suicidio", value: "RISCO_SUICIDIO" },
  { label: "Perfil mapeado", value: "PERFIL_MAPEADO" },
  { label: "Saude confidencial", value: "SAUDE" },
  { label: "Qualquer alerta ativo", value: "COM_ALERTAS" },
];

const ITENS_POR_PAGINA = 10;

const STATUS_BADGES: Record<
  StatusFiltro,
  { classe: string; texto: string }
> = {
  ATIVO: {
    classe: "bg-green-100 text-green-800 border-green-300",
    texto: "Ativo",
  },
  TRANSFERIDO: {
    classe: "bg-blue-100 text-blue-800 border-blue-300",
    texto: "Transferido",
  },
  LIBERADO: {
    classe: "bg-gray-100 text-gray-800 border-gray-300",
    texto: "Liberado",
  },
  EVADIDO: {
    classe: "bg-red-100 text-red-800 border-red-300",
    texto: "Evadido",
  },
  TODOS: {
    classe: "bg-gray-100 text-gray-800 border-gray-300",
    texto: "Todos",
  },
};

const temAlertas = (adolescente: Adolescente) =>
  adolescente.alertaRiscoSuicidio ||
  adolescente.alertaPerfilMapeado ||
  adolescente.alertaSaudeConfidencial;

const aplicaFiltroAlertas = (aluno: Adolescente, filtro: AlertaFiltro) => {
  switch (filtro) {
    case "RISCO_SUICIDIO":
      return aluno.alertaRiscoSuicidio;
    case "PERFIL_MAPEADO":
      return aluno.alertaPerfilMapeado;
    case "SAUDE":
      return aluno.alertaSaudeConfidencial;
    case "COM_ALERTAS":
      return temAlertas(aluno);
    default:
      return true;
  }
};

const normalizaTexto = (valor?: string | null) =>
  typeof valor === "string" ? valor.trim().toLowerCase() : "";

const extraiIniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toUpperCase();

const getStatusBadge = (status: StatusFiltro) => {
  const badge = STATUS_BADGES[status] ?? STATUS_BADGES.ATIVO;
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.classe}`}
    >
      {badge.texto}
    </span>
  );
};

const renderAlertas = (adolescente: Adolescente) => {
  if (!temAlertas(adolescente)) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-gray-500">
        Nenhum alerta ativo
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {adolescente.atoInfracionalGravidade && (
        <span
          title={
            adolescente.atoInfracionalGravidadeObs ?? "Gravidade do ato infracional atual"
          }
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold"
        >
          <Flame size={14} />
          Gravidade do ato
        </span>
      )}
      {adolescente.alertaRiscoSuicidio && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
          <AlertTriangle size={14} />
          Risco suicidio
        </span>
      )}
      {adolescente.alertaPerfilMapeado && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
          <Lock size={14} />
          Perfil mapeado
        </span>
      )}
      {adolescente.alertaSaudeConfidencial && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
          <Activity size={14} />
          Saude confidencial
        </span>
      )}
    </div>
  );
};

const renderAlojamento = (adolescente: Adolescente) => {
  const alojamento = adolescente.alojamentoAtual;

  if (!alojamento) {
    return <span className="text-sm text-gray-500">Nao alocado</span>;
  }

  const casaLabel =
    alojamento.casa?.nome ??
    (typeof alojamento.casa?.numero !== "undefined"
      ? `Casa ${String(alojamento.casa.numero).padStart(2, "0")}`
      : "Casa nao identificada");

  const numeroFormatado = alojamento.numero
    ? alojamento.numero.padStart(2, "0")
    : "-";

  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <MapPin size={14} className="text-indigo-600" />
      <div className="flex flex-col leading-tight">
        <span className="font-semibold">{casaLabel}</span>
        <span className="text-xs text-gray-500 uppercase">
          Aloj {numeroFormatado}
          {alojamento.ala ? ` - Ala ${alojamento.ala}` : ""}
        </span>
      </div>
    </div>
  );
};

export function ListagemAdolescentes({
  adolescentes,
}: ListagemAdolescentesProps) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] =
    useState<StatusFiltro>("TODOS");
  const [filtroAlertas, setFiltroAlertas] =
    useState<AlertaFiltro>("TODOS");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] =
    useState(false);

  const filtrados = useMemo(() => {
    const termo = normalizaTexto(busca);

    return adolescentes.filter((adolescente) => {
      const matchBusca =
        termo.length === 0 ||
        normalizaTexto(adolescente.nomeCompleto).includes(termo) ||
        normalizaTexto(adolescente.nomeSocial).includes(termo) ||
        (adolescente.numeroSms ?? "").includes(busca.trim()) ||
        normalizaTexto(adolescente.numeroProcesso).includes(termo);

      const matchStatus =
        filtroStatus === "TODOS" ||
        adolescente.statusUnidade === filtroStatus;

      const matchAlertas = aplicaFiltroAlertas(
        adolescente,
        filtroAlertas
      );

      return matchBusca && matchStatus && matchAlertas;
    });
  }, [adolescentes, busca, filtroStatus, filtroAlertas]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(filtrados.length / ITENS_POR_PAGINA)
  );
  const paginaCorrente = Math.min(paginaAtual, totalPaginas);
  const inicio = (paginaCorrente - 1) * ITENS_POR_PAGINA;
  const paginados = filtrados.slice(inicio, inicio + ITENS_POR_PAGINA);

  const limparFiltros = () => {
    setBusca("");
    setFiltroStatus("TODOS");
    setFiltroAlertas("TODOS");
    setPaginaAtual(1);
  };

  return (
    <div className="space-y-6">
      <header className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-indigo-600">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Lista de Adolescentes
            </h1>
            <p className="text-gray-600">
              {filtrados.length} adolescente(s) encontrado(s)
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => alert("Exportar para Excel (implementar)")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
            >
              <Download size={18} />
              Exportar
            </button>
            <Link
              href="/adolescentes/novo"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-semibold"
            >
              <UserPlus size={18} />
              Novo cadastro
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="search"
              value={busca}
              onChange={(event) => {
                setBusca(event.target.value);
                setPaginaAtual(1);
              }}
              placeholder="Buscar por nome, SMS ou processo..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setMostrarFiltrosAvancados((valor) => !valor)
              }
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <Filter size={16} />
              Filtros
            </button>
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex items-center gap-2 px-3 py-2 border border-transparent rounded-lg text-sm font-semibold text-gray-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>

        {mostrarFiltrosAvancados && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status na unidade
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFiltroStatus(option.value);
                      setPaginaAtual(1);
                    }}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      filtroStatus === option.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Alertas ativos
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ALERTA_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFiltroAlertas(option.value);
                      setPaginaAtual(1);
                    }}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      filtroAlertas === option.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Adolescente
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contatos
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Alojamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Alertas
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginados.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    Nenhum adolescente encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                paginados.map((adolescente) => (
                  <tr key={adolescente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                          {extraiIniciais(adolescente.nomeCompleto)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {adolescente.nomeCompleto}
                            </span>
                            {adolescente.riscoFuga && (
                              <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold uppercase">
                                Risco fuga: {adolescente.riscoFuga}
                              </span>
                            )}
                          </div>
                          {adolescente.nomeSocial && (
                            <p className="text-xs text-gray-500">
                              Nome social:{" "}
                              <span className="font-medium text-gray-700">
                                {adolescente.nomeSocial}
                              </span>
                            </p>
                          )}
                          {adolescente.faccao && (
                            <p className="text-xs text-gray-500">
                              Faccao:{" "}
                              <span className="font-medium text-gray-700">
                                {adolescente.faccao.nome}
                              </span>
                              {adolescente.faccao.numeroMembro && (
                                <> - No {adolescente.faccao.numeroMembro}</>
                              )}
                            </p>
                          )}
                          {adolescente.bairroOrigem && (
                            <p className="text-xs text-gray-400">
                              Bairro de origem: {adolescente.bairroOrigem.nome}{" "}
                              ({adolescente.bairroOrigem.cidade})
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="space-y-1">
                        <span className="block">
                          <span className="font-semibold text-gray-500">
                            SMS:
                          </span>{" "}
                          {adolescente.numeroSms || "-"}
                        </span>
                        <span className="block">
                          <span className="font-semibold text-gray-500">
                            Processo:
                          </span>{" "}
                          {adolescente.numeroProcesso || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{renderAlojamento(adolescente)}</td>
                    <td className="px-6 py-4">
                      {getStatusBadge(
                        (adolescente.statusUnidade as StatusFiltro) ?? "ATIVO"
                      )}
                    </td>
                    <td className="px-6 py-4">{renderAlertas(adolescente)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/adolescentes/${adolescente.id}`}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                          title="Visualizar"
                        >
                          <Eye size={16} />
                          Ver
                        </Link>
                        <Link
                          href={`/adolescentes/${adolescente.id}/editar`}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-indigo-500 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                          Editar
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            <span className="text-sm text-gray-500">
              Pagina {paginaCorrente} de {totalPaginas}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setPaginaAtual((pagina) => Math.max(1, pagina - 1))
                }
                disabled={paginaCorrente === 1}
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPaginas }, (_, indice) => indice + 1).map(
                (pagina) => (
                  <button
                    key={pagina}
                    type="button"
                    onClick={() => setPaginaAtual(pagina)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                      pagina === paginaCorrente
                        ? "bg-indigo-600 text-white"
                        : "border border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600"
                    }`}
                  >
                    {pagina}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() =>
                  setPaginaAtual((pagina) =>
                    Math.min(totalPaginas, pagina + 1)
                  )
                }
                disabled={paginaCorrente === totalPaginas}
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
