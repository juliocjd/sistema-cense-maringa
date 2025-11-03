"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Eye,
  Edit,
  MapPin,
  AlertTriangle,
  Lock,
  Activity,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Download,
} from "lucide-react";
import type { Adolescente } from "@/types";

interface ListagemAdolescentesProps {
  adolescentes: Adolescente[];
}

export function ListagemAdolescentes({
  adolescentes,
}: ListagemAdolescentesProps) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");
  const [filtroAlertas, setFiltroAlertas] = useState<string>("TODOS");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const itensPorPagina = 10;

  // Filtrar adolescentes
  const adolescentesFiltrados = adolescentes.filter((adolescente) => {
    // Filtro de busca
    const matchBusca =
      busca === "" ||
      adolescente.nomeCompleto.toLowerCase().includes(busca.toLowerCase()) ||
      adolescente.numeroSms?.includes(busca) ||
      adolescente.numeroProcesso?.toLowerCase().includes(busca.toLowerCase());

    // Filtro de status
    const matchStatus =
      filtroStatus === "TODOS" || adolescente.statusUnidade === filtroStatus;

    // Filtro de alertas
    let matchAlertas = true;
    if (filtroAlertas === "RISCO_SUICIDIO") {
      matchAlertas = adolescente.alertaRiscoSuicidio;
    } else if (filtroAlertas === "PERFIL_MAPEADO") {
      matchAlertas = adolescente.alertaPerfilMapeado;
    } else if (filtroAlertas === "SAUDE") {
      matchAlertas = adolescente.alertaSaudeConfidencial;
    } else if (filtroAlertas === "COM_ALERTAS") {
      matchAlertas =
        adolescente.alertaRiscoSuicidio ||
        adolescente.alertaPerfilMapeado ||
        adolescente.alertaSaudeConfidencial;
    }

    return matchBusca && matchStatus && matchAlertas;
  });

  // Paginação
  const totalPaginas = Math.ceil(adolescentesFiltrados.length / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const adolescentesPaginados = adolescentesFiltrados.slice(inicio, fim);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { cor: string; texto: string }> = {
      ATIVO: {
        cor: "bg-green-100 text-green-800 border-green-300",
        texto: "Ativo",
      },
      TRANSFERIDO: {
        cor: "bg-blue-100 text-blue-800 border-blue-300",
        texto: "Transferido",
      },
      LIBERADO: {
        cor: "bg-gray-100 text-gray-800 border-gray-300",
        texto: "Liberado",
      },
      EVADIDO: {
        cor: "bg-red-100 text-red-800 border-red-300",
        texto: "Evadido",
      },
    };
    const badge = badges[status] || badges.ATIVO;
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.cor}`}
      >
        {badge.texto}
      </span>
    );
  };

  const getAlojamentoInfo = (adolescente: Adolescente) => {
    if (!adolescente.alojamentoAtualId) {
      return <span className="text-gray-500 text-sm">Não alocado</span>;
    }
    // Mock - substituir por dados reais
    return (
      <div className="flex items-center gap-1 text-sm">
        <MapPin size={14} className="text-indigo-600" />
        <span className="font-semibold text-gray-800">Casa 02 - Aloj 05</span>
      </div>
    );
  };

  const limparFiltros = () => {
    setBusca("");
    setFiltroStatus("TODOS");
    setFiltroAlertas("TODOS");
    setPaginaAtual(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-indigo-600">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Lista de Adolescentes
            </h1>
            <p className="text-gray-600">
              {adolescentesFiltrados.length} adolescente(s) encontrado(s)
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                // Exportar para Excel
                alert("Exportar para Excel (implementar)");
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
            >
              <Download size={20} />
              Exportar
            </button>
            <Link
              href="/adolescentes/novo"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-semibold"
            >
              <UserPlus size={20} />
              Novo Cadastro
            </Link>
          </div>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Busca */}
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPaginaAtual(1);
                }}
                placeholder="Buscar por nome, SMS ou processo..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>
          </div>

          {/* Botão Filtros */}
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              mostrarFiltros
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Filter size={20} />
            Filtros
            {(filtroStatus !== "TODOS" || filtroAlertas !== "TODOS") && (
              <span className="bg-white text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                !
              </span>
            )}
          </button>
        </div>

        {/* Painel de Filtros */}
        {mostrarFiltros && (
          <div className="border-t-2 border-gray-200 pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filtroStatus}
                  onChange={(e) => {
                    setFiltroStatus(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                >
                  <option value="TODOS">Todos</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="TRANSFERIDO">Transferido</option>
                  <option value="LIBERADO">Liberado</option>
                  <option value="EVADIDO">Evadido</option>
                </select>
              </div>

              {/* Filtro Alertas */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Alertas
                </label>
                <select
                  value={filtroAlertas}
                  onChange={(e) => {
                    setFiltroAlertas(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                >
                  <option value="TODOS">Todos</option>
                  <option value="COM_ALERTAS">Com alertas</option>
                  <option value="RISCO_SUICIDIO">Risco de suicídio</option>
                  <option value="PERFIL_MAPEADO">Perfil mapeado</option>
                  <option value="SAUDE">Alerta de saúde</option>
                </select>
              </div>

              {/* Botão Limpar */}
              <div className="flex items-end">
                <button
                  onClick={limparFiltros}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Adolescente
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  SMS
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Alojamento
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Alertas
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {adolescentesPaginados.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Search size={48} className="text-gray-400" />
                      <p className="text-lg font-semibold">
                        Nenhum adolescente encontrado
                      </p>
                      <p className="text-sm">
                        Tente ajustar os filtros ou busca
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                adolescentesPaginados.map((adolescente) => (
                  <tr
                    key={adolescente.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Nome */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                          {adolescente.fotoUrl ? (
                            <img
                              src={adolescente.fotoUrl}
                              alt={adolescente.nomeCompleto}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            adolescente.nomeCompleto.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {adolescente.nomeCompleto}
                          </p>
                          {adolescente.nomeSocial && (
                            <p className="text-xs text-gray-600">
                              ({adolescente.nomeSocial})
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* SMS */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-gray-700">
                        {adolescente.numeroSms || "-"}
                      </span>
                    </td>

                    {/* Alojamento */}
                    <td className="px-6 py-4">
                      {getAlojamentoInfo(adolescente)}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {getStatusBadge(adolescente.statusUnidade)}
                    </td>

                    {/* Alertas */}
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {adolescente.alertaRiscoSuicidio && (
                          <div
                            className="bg-orange-500 rounded-full p-1"
                            title="Risco de suicídio"
                          >
                            <AlertTriangle size={14} className="text-white" />
                          </div>
                        )}
                        {adolescente.alertaPerfilMapeado && (
                          <div
                            className="bg-purple-500 rounded-full p-1"
                            title="Perfil mapeado"
                          >
                            <Lock size={14} className="text-white" />
                          </div>
                        )}
                        {adolescente.alertaSaudeConfidencial && (
                          <div
                            className="bg-blue-500 rounded-full p-1"
                            title="Alerta de saúde"
                          >
                            <Activity size={14} className="text-white" />
                          </div>
                        )}
                        {!adolescente.alertaRiscoSuicidio &&
                          !adolescente.alertaPerfilMapeado &&
                          !adolescente.alertaSaudeConfidencial && (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/adolescentes/${adolescente.id}`}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Ver dossiê"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/adolescentes/${adolescente.id}/editar`}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="border-t-2 border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {inicio + 1} a{" "}
              {Math.min(fim, adolescentesFiltrados.length)} de{" "}
              {adolescentesFiltrados.length} resultados
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPaginaAtual(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <ChevronLeft size={18} />
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(
                  (pagina) => (
                    <button
                      key={pagina}
                      onClick={() => setPaginaAtual(pagina)}
                      className={`w-10 h-10 rounded-lg font-semibold transition-colors ${
                        pagina === paginaAtual
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {pagina}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => setPaginaAtual(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Próxima
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
