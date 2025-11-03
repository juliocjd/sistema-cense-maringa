"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Eye,
  UserPlus,
  Swords,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  FileText,
} from "lucide-react";

type Conflito = {
  id: string;
  adolescenteA: {
    id: string;
    nome: string;
    numeroSms: string;
    alojamento?: string;
  };
  adolescenteB: {
    id: string;
    nome: string;
    numeroSms: string;
    alojamento?: string;
  };
  tipoConflito: string;
  status: "ATIVO" | "RESOLVIDO";
  origem: string;
  descricao?: string;
  criadoEm: string;
  resolvidoEm?: string;
  tentativasMediacao: number;
  ultimaMediacao?: string;
};

interface ListagemConflitosProps {
  conflitos: Conflito[];
}

export function ListagemConflitos({ conflitos }: ListagemConflitosProps) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Filtrar conflitos
  const conflitosFiltrados = conflitos.filter((conflito) => {
    const matchBusca =
      busca === "" ||
      conflito.adolescenteA.nome.toLowerCase().includes(busca.toLowerCase()) ||
      conflito.adolescenteB.nome.toLowerCase().includes(busca.toLowerCase()) ||
      conflito.adolescenteA.numeroSms.includes(busca) ||
      conflito.adolescenteB.numeroSms.includes(busca);

    const matchStatus =
      filtroStatus === "TODOS" || conflito.status === filtroStatus;

    const matchTipo =
      filtroTipo === "TODOS" || conflito.tipoConflito === filtroTipo;

    return matchBusca && matchStatus && matchTipo;
  });

  // Estatísticas
  const stats = {
    total: conflitos.length,
    ativos: conflitos.filter((c) => c.status === "ATIVO").length,
    resolvidos: conflitos.filter((c) => c.status === "RESOLVIDO").length,
    semMediacao: conflitos.filter(
      (c) => c.status === "ATIVO" && c.tentativasMediacao === 0
    ).length,
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
        RESOLVIDO
      </span>
    );
  };

  const getTipoColor = (tipo: string) => {
    const cores: Record<string, string> = {
      FACCAO: "bg-red-100 text-red-800 border-red-300",
      TERRITORIAL: "bg-orange-100 text-orange-800 border-orange-300",
      PESSOAL: "bg-yellow-100 text-yellow-800 border-yellow-300",
      OUTROS: "bg-gray-100 text-gray-800 border-gray-300",
    };
    return cores[tipo] || cores.OUTROS;
  };

  const limparFiltros = () => {
    setBusca("");
    setFiltroStatus("TODOS");
    setFiltroTipo("TODOS");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-red-600">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <Swords className="text-red-600" size={36} />
              Gestão de Conflitos
            </h1>
            <p className="text-gray-600">
              {conflitosFiltrados.length} conflito(s) encontrado(s)
            </p>
          </div>
          <Link
            href="/conflitos/novo"
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-semibold shadow-lg"
          >
            <Plus size={20} />
            Registrar Conflito
          </Link>
        </div>
      </div>

      {/* Cards de Estatísticas */}
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

        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Resolvidos</p>
              <p className="text-3xl font-bold text-green-600">
                {stats.resolvidos}
              </p>
            </div>
            <CheckCircle size={32} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Sem Mediação</p>
              <p className="text-3xl font-bold text-orange-600">
                {stats.semMediacao}
              </p>
            </div>
            <Clock size={32} className="text-orange-500" />
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
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou SMS..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
              />
            </div>
          </div>

          {/* Botão Filtros */}
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              mostrarFiltros
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Filter size={20} />
            Filtros
            {(filtroStatus !== "TODOS" || filtroTipo !== "TODOS") && (
              <span className="bg-white text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
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
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none"
                >
                  <option value="TODOS">Todos</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="RESOLVIDO">Resolvido</option>
                </select>
              </div>

              {/* Filtro Tipo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Conflito
                </label>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none"
                >
                  <option value="TODOS">Todos</option>
                  <option value="FACCAO">Facções rivais</option>
                  <option value="TERRITORIAL">Territorial</option>
                  <option value="PESSOAL">Pessoal</option>
                  <option value="OUTROS">Outros</option>
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

      {/* Lista de Conflitos */}
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
          conflitosFiltrados.map((conflito) => (
            <div
              key={conflito.id}
              className={`bg-white rounded-xl shadow-lg p-6 border-l-4 hover:shadow-xl transition-all ${
                conflito.status === "ATIVO"
                  ? "border-red-500"
                  : "border-green-500"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Swords size={24} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {conflito.adolescenteA.nome} ×{" "}
                      {conflito.adolescenteB.nome}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold border ${getTipoColor(
                          conflito.tipoConflito
                        )}`}
                      >
                        {conflito.tipoConflito}
                      </span>
                      {getStatusBadge(conflito.status)}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/conflitos/${conflito.id}`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-semibold"
                >
                  <Eye size={18} />
                  Ver Detalhes
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Adolescente A */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Adolescente A</p>
                  <p className="font-semibold text-gray-800">
                    {conflito.adolescenteA.nome}
                  </p>
                  <p className="text-sm text-gray-600">
                    SMS: {conflito.adolescenteA.numeroSms}
                    {conflito.adolescenteA.alojamento && (
                      <> • {conflito.adolescenteA.alojamento}</>
                    )}
                  </p>
                </div>

                {/* Adolescente B */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Adolescente B</p>
                  <p className="font-semibold text-gray-800">
                    {conflito.adolescenteB.nome}
                  </p>
                  <p className="text-sm text-gray-600">
                    SMS: {conflito.adolescenteB.numeroSms}
                    {conflito.adolescenteB.alojamento && (
                      <> • {conflito.adolescenteB.alojamento}</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-gray-600">
                  <span>
                    <span className="font-semibold">Origem:</span>{" "}
                    {conflito.origem}
                  </span>
                  <span>
                    <span className="font-semibold">Registrado:</span>{" "}
                    {new Date(conflito.criadoEm).toLocaleDateString("pt-BR")}
                  </span>
                  {conflito.tentativasMediacao > 0 && (
                    <span className="flex items-center gap-1">
                      <FileText size={14} />
                      {conflito.tentativasMediacao} mediação(ões)
                    </span>
                  )}
                </div>
                {conflito.status === "ATIVO" &&
                  conflito.tentativasMediacao === 0 && (
                    <Link
                      href={`/conflitos/${conflito.id}/mediar`}
                      className="text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
                    >
                      <UserPlus size={16} />
                      Iniciar Mediação
                    </Link>
                  )}
              </div>

              {conflito.descricao && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-700">{conflito.descricao}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
