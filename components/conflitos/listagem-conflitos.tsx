"use client";

import { useMemo, useState } from "react";
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
  Trash2,
} from "lucide-react";

type Participante = {
  id: string;
  nome: string;
  numeroSms: string;
  alojamento?: string;
};

type Conflito = {
  id: string;
  registroGrupoId: string;
  participantes: Participante[];
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
  onExcluir?: (conflito: Conflito) => Promise<void> | void;
  incluirInativos?: boolean;
  onToggleInativos?: (value: boolean) => void;
}

export function ListagemConflitos({
  conflitos,
  onExcluir,
  incluirInativos = false,
  onToggleInativos,
}: ListagemConflitosProps) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const conflitosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return conflitos.filter((conflito) => {
      const matchBusca =
        termo === "" ||
        conflito.participantes.some(
          (participante) =>
            participante.nome.toLowerCase().includes(termo) ||
            participante.numeroSms.includes(busca)
        );

      const matchStatus =
        filtroStatus === "TODOS" || conflito.status === filtroStatus;

      const matchTipo =
        filtroTipo === "TODOS" || conflito.tipoConflito === filtroTipo;

      return matchBusca && matchStatus && matchTipo;
    });
  }, [conflitos, busca, filtroStatus, filtroTipo]);

  const stats = useMemo(
    () => ({
      total: conflitos.length,
      ativos: conflitos.filter((c) => c.status === "ATIVO").length,
      resolvidos: conflitos.filter((c) => c.status === "RESOLVIDO").length,
      semMediacao: conflitos.filter(
        (c) => c.status === "ATIVO" && c.tentativasMediacao === 0
      ).length,
    }),
    [conflitos]
  );

  const gerarRelatorioPDF = () => {
    if (conflitosFiltrados.length === 0) {
      return;
    }
    const linhas = conflitosFiltrados
      .map(
        (conflito) => `
          <tr>
            <td>${conflito.tipoConflito}</td>
            <td>${conflito.status}</td>
            <td>${conflito.participantes
              .map((p) => `${p.nome} (${p.numeroSms ?? "sem SMS"})`)
              .join(" vs ")}</td>
            <td>${new Date(conflito.criadoEm).toLocaleString("pt-BR")}</td>
            <td>${conflito.resolvidoEm
              ? new Date(conflito.resolvidoEm).toLocaleString("pt-BR")
              : "—"}</td>
            <td>${conflito.descricao ?? "—"}</td>
          </tr>`
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Relatório de Conflitos</title>
          <style>
            body { font-family: sans-serif; padding: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { padding: 8px; border: 1px solid #ccc; font-size: 12px; }
            th { background: #111827; color: #fff; }
          </style>
        </head>
        <body>
          <h1>Relatório de Conflitos</h1>
          <p>Gerado em ${new Date().toLocaleString("pt-BR")}</p>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Status</th>
                <th>Participantes</th>
                <th>Criado em</th>
                <th>Resolvido em</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              ${linhas}
            </tbody>
          </table>
        </body>
      </html>`;

    const janela = window.open("", "_blank");
    if (!janela) {
      return;
    }
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    janela.print();
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

  const acionarExclusao = async (conflito: Conflito) => {
    if (!onExcluir) {
      return;
    }
    try {
      setExcluindoId(conflito.id);
      await onExcluir(conflito);
    } finally {
      setExcluindoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-red-600">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <Swords className="text-red-600" size={36} />
              Gestao de Conflitos
            </h1>
            <p className="text-gray-600">
              {conflitosFiltrados.length} conflito(s) encontrado(s)
            </p>
          </div>
          <Link
            href="/conflitos/novo"
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-semibold shadow-lg justify-center w-full lg:w-auto"
          >
            <Plus size={20} />
            Registrar Conflito
          </Link>
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
              <p className="text-sm text-gray-600 mb-1">Sem Mediacao</p>
              <p className="text-3xl font-bold text-orange-600">
                {stats.semMediacao}
              </p>
            </div>
            <Clock size={32} className="text-orange-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
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
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-600 hover:border-gray-500 hover:text-gray-900 transition"
          >
            <Eye size={18} />
            Limpar
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={incluirInativos}
              onChange={(event) =>
                onToggleInativos && onToggleInativos(event.target.checked)
              }
              className="form-checkbox h-4 w-4 text-red-600 border-gray-300 rounded"
            />
            Incluir adolescentes inativos/desinternados
          </label>
          <button
            type="button"
            onClick={gerarRelatorioPDF}
            className="px-4 py-2 rounded-full border border-red-400 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            Gerar relatório (PDF)
          </button>
        </div>
        {mostrarFiltros && (
          <div className="grid gap-4 md:grid-cols-3">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200"
            >
              <option value="TODOS">Todos os status</option>
              <option value="ATIVO">Ativo</option>
              <option value="RESOLVIDO">Resolvido</option>
            </select>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200"
            >
              <option value="TODOS">Todos os tipos</option>
              <option value="FACCAO">Faccao</option>
              <option value="TERRITORIAL">Territorial</option>
              <option value="PESSOAL">Pessoal</option>
              <option value="OUTROS">Outros</option>
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
            const participantes = conflito.participantes ?? [];
            const primeiro = participantes[0];
            const segundo = participantes[1];
            const extras = participantes.slice(2);
            const semParticipantes = participantes.length === 0;
            const fallbackTitulo =
              conflito.descricao?.trim() ||
              conflito.tipoConflito ||
              "Conflito registrado";

            const titulo = segundo
              ? `${primeiro.nome} x ${segundo.nome}${
                  extras.length ? ` +${extras.length}` : ""
                }`
              : primeiro?.nome ?? fallbackTitulo;

            return (
              <div
                key={`${conflito.registroGrupoId}-${conflito.id}`}
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
                      <h3 className="text-lg font-bold text-gray-800">{titulo}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold border ${getTipoColor(
                            conflito.tipoConflito
                          )}`}
                        >
                          {conflito.tipoConflito}
                        </span>
                        {getStatusBadge(conflito.status)}
                        {semParticipantes && (
                          <span className="px-2 py-1 rounded text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-700">
                            Participantes nao informados
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {onExcluir && (
                      <button
                        type="button"
                        onClick={() => acionarExclusao(conflito)}
                        disabled={excluindoId === conflito.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={18} />
                        {excluindoId === conflito.id ? "Excluindo..." : "Excluir"}
                      </button>
                    )}
                    <Link
                      href={`/conflitos/${conflito.id}`}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-semibold"
                    >
                      <Eye size={18} />
                      Ver Detalhes
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {participantes.map((participante) => (
                    <div key={participante.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Participante</p>
                      <p className="font-semibold text-gray-800">{participante.nome}</p>
                      <p className="text-sm text-gray-600">
                        SMS: {participante.numeroSms}
                        {participante.alojamento && (
                          <> - {participante.alojamento}</>
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                  <div className="flex items-center gap-4 text-gray-600 flex-wrap">
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
                        {conflito.tentativasMediacao} mediacao(oes)
                      </span>
                    )}
                  </div>
                  {conflito.status === "ATIVO" &&
                    conflito.tentativasMediacao === 0 && (
                      <Link
                        href={`/conflitos/${conflito.id}`}
                        className="text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 text-sm"
                      >
                        <UserPlus size={16} />
                        Iniciar mediacao
                      </Link>
                    )}
                </div>

                {conflito.descricao && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-700">{conflito.descricao}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
