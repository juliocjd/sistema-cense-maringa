"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Eye,
  FileText,
  Download,
  Plus,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

type AdolescenteResumo = {
  id: string;
  nome: string;
  numeroSms: string;
  fotoUrl?: string | null;
  ladoConflito?: "LADO_1" | "LADO_2" | null;
};

type ConflitoResumo = {
  id: string;
  status?: string;
  adolescenteA?: {
    id?: string | null;
    nome?: string | null;
    numeroSms?: string | null;
  } | null;
  adolescenteB?: {
    id?: string | null;
    nome?: string | null;
    numeroSms?: string | null;
  } | null;
};

type ComunicadoInterno = {
  id: string;
  numero: number;
  ano: number;
  dataFato: string;
  tipoCi: string;
  resumoCi: string;
  caminhoPdf?: string;
  operador: {
    id: string;
    nome: string;
  };
  adolescentes: AdolescenteResumo[];
  conflitos?: ConflitoResumo[];
  criadoEm: string;
  temConflito: boolean;
  temAlerta: boolean;
};

interface ListagemCIsProps {
  comunicados: ComunicadoInterno[];
}

const obterLadosConflito = (ci: ComunicadoInterno) => {
  if (
    ci.tipoCi !== "CONFLITO" ||
    !ci.conflitos ||
    ci.conflitos.length === 0
  ) {
    const temLados = ci.adolescentes.some(
      (participante) => participante.ladoConflito
    );
    if (!temLados) {
      return null;
    }
  }

  const participantesRegistrados = ci.adolescentes.filter(
    (participante) => participante.ladoConflito
  );

  if (participantesRegistrados.length > 0) {
    const lado1 = participantesRegistrados.filter(
      (participante) => participante.ladoConflito === "LADO_1"
    );
    const lado2 = participantesRegistrados.filter(
      (participante) => participante.ladoConflito === "LADO_2"
    );
    return {
      lado1,
      lado2,
    };
  }

  if (!ci.conflitos || ci.conflitos.length === 0) {
    return null;
  }

  const mapaParticipantes = new Map(
    ci.adolescentes.map((participante) => [participante.id, participante])
  );
  const lado1 = new Map<string, AdolescenteResumo>();
  const lado2 = new Map<string, AdolescenteResumo>();

  const resolverParticipante = (
    registro:
      | {
          id?: string | null;
          nome?: string | null;
          numeroSms?: string | null;
        }
      | null
      | undefined,
    fallbackId: string
  ): AdolescenteResumo | null => {
    if (!registro) return null;
    if (registro.id) {
      const existente = mapaParticipantes.get(registro.id);
      if (existente) return existente;
    }
    const participanteId = registro.id ?? fallbackId;
    const existente = mapaParticipantes.get(participanteId);
    if (existente) return existente;
    return {
      id: participanteId,
      nome: registro.nome ?? "Participante",
      numeroSms: registro.numeroSms ?? "Nao informado",
    };
  };

  ci.conflitos.forEach((conflito, index) => {
    const participanteA = resolverParticipante(
      conflito.adolescenteA ?? null,
      `${conflito.id}-A-${index}`
    );
    const participanteB = resolverParticipante(
      conflito.adolescenteB ?? null,
      `${conflito.id}-B-${index}`
    );

    if (participanteA) {
      lado1.set(participanteA.id, participanteA);
    }
    if (participanteB) {
      lado2.set(participanteB.id, participanteB);
    }
  });

  if (lado1.size === 0 && lado2.size === 0) {
    return null;
  }

  return {
    lado1: Array.from(lado1.values()),
    lado2: Array.from(lado2.values()),
  };
};

export function ListagemCIs({ comunicados }: ListagemCIsProps) {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [filtroAno, setFiltroAno] = useState<string>("TODOS");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Filtrar CIs
  const cisFiltrados = comunicados.filter((ci) => {
    const matchBusca =
      busca === "" ||
      ci.numero.toString().includes(busca) ||
      ci.resumoCi.toLowerCase().includes(busca.toLowerCase()) ||
      ci.adolescentes.some(
        (a) =>
          a.nome.toLowerCase().includes(busca.toLowerCase()) ||
          a.numeroSms.includes(busca)
      );

    const matchTipo = filtroTipo === "TODOS" || ci.tipoCi === filtroTipo;

    const matchAno = filtroAno === "TODOS" || ci.ano.toString() === filtroAno;

    return matchBusca && matchTipo && matchAno;
  });

  // EstatÃ­sticas
  const stats = {
    total: comunicados.length,
    ano2025: comunicados.filter((c) => c.ano === 2025).length,
    conflitos: comunicados.filter((c) => c.temConflito).length,
    alertas: comunicados.filter((c) => c.temAlerta).length,
  };

  // Anos disponÃ­veis
  const anosDisponiveis = Array.from(
    new Set(comunicados.map((c) => c.ano))
  ).sort((a, b) => b - a);

  const getTipoBadge = (tipo: string) => {
    const badges: Record<string, { cor: string; texto: string }> = {
      DISCIPLINAR: {
        cor: "bg-red-100 text-red-800 border-red-300",
        texto: "Disciplinar",
      },
      CONFLITO: {
        cor: "bg-orange-100 text-orange-800 border-orange-300",
        texto: "Conflito",
      },
      AUTORIZACAO_ESPECIAL: {
        cor: "bg-blue-100 text-blue-800 border-blue-300",
        texto: "Autorizacao item excepcional",
      },
      SAUDE_CONFIDENCIAL: {
        cor: "bg-blue-100 text-blue-800 border-blue-300",
        texto: "Saude confidencial",
      },
      FUGA: {
        cor: "bg-orange-100 text-orange-800 border-orange-300",
        texto: "Fuga",
      },
      AGRESSAO: {
        cor: "bg-rose-100 text-rose-800 border-rose-300",
        texto: "Agressao",
      },
      AMEACA_SERVIDOR: {
        cor: "bg-amber-100 text-amber-800 border-amber-300",
        texto: "Ameaca a servidor",
      },
      RISCO_SUICIDIO: {
        cor: "bg-red-100 text-red-800 border-red-300",
        texto: "Risco de suicidio",
      },
      PERFIL_MAPEADO: {
        cor: "bg-indigo-100 text-indigo-800 border-indigo-300",
        texto: "Perfil mapeado",
      },
      OUTROS: {
        cor: "bg-gray-100 text-gray-800 border-gray-300",
        texto: "Outros",
      },
    };
    return badges[tipo] || badges.OUTROS;
  };

  const limparFiltros = () => {
    setBusca("");
    setFiltroTipo("TODOS");
    setFiltroAno("TODOS");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-blue-600">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <FileText className="text-blue-600" size={36} />
              Comunicados Internos (CIs)
            </h1>
            <p className="text-gray-600">
              {cisFiltrados.length} CI(s) encontrado(s)
            </p>
          </div>
          <Link
            href="/comunicados/novo"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold shadow-lg w-full text-center lg:w-auto justify-center"
          >
            <Plus size={20} />
            Novo CI
          </Link>
        </div>
      </div>

      {/* Cards de EstatÃ­sticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total de CIs</p>
              <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <FileText size={32} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">CIs em 2025</p>
              <p className="text-3xl font-bold text-green-600">
                {stats.ano2025}
              </p>
            </div>
            <Calendar size={32} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Geraram Conflito</p>
              <p className="text-3xl font-bold text-orange-600">
                {stats.conflitos}
              </p>
            </div>
            <AlertTriangle size={32} className="text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Geraram Alerta</p>
              <p className="text-3xl font-bold text-purple-600">
                {stats.alertas}
              </p>
            </div>
            <CheckCircle size={32} className="text-purple-500" />
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
                placeholder="Buscar por número, resumo, adolescente..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>
          </div>

          {/* BotÃ£o Filtros */}
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              mostrarFiltros
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Filter size={20} />
            Filtros
            {(filtroTipo !== "TODOS" || filtroAno !== "TODOS") && (
              <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                !
              </span>
            )}
          </button>
        </div>

        {/* Painel de Filtros */}
        {mostrarFiltros && (
          <div className="border-t-2 border-gray-200 pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro Tipo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de CI
                </label>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                >
                  <option value="TODOS">Todos</option>
                  <option value="DISCIPLINAR">Disciplinar</option>
                  <option value="CONFLITO">Conflito</option>
                  <option value="AUTORIZACAO_ESPECIAL">
                    AutorizaÃ§Ã£o Especial
                  </option>
                  <option value="SAUDE">SaÃºde</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>

              {/* Filtro Ano */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ano
                </label>
                <select
                  value={filtroAno}
                  onChange={(e) => setFiltroAno(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                >
                  <option value="TODOS">Todos</option>
                  {anosDisponiveis.map((ano) => (
                    <option key={ano} value={ano.toString()}>
                      {ano}
                    </option>
                  ))}
                </select>
              </div>

              {/* BotÃ£o Limpar */}
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

      {/* Lista de CIs */}
      <div className="space-y-4">
        {cisFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <FileText size={64} className="mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-semibold text-gray-600 mb-2">
              Nenhum CI encontrado
            </p>
            <p className="text-gray-500">Tente ajustar os filtros ou busca</p>
          </div>
        ) : (
          cisFiltrados.map((ci) => {
            const badge = getTipoBadge(ci.tipoCi);
            const ladosConflito = obterLadosConflito(ci);
            const exibirLados =
              ci.tipoCi === "CONFLITO" && ladosConflito !== null;
            return (
              <div
                key={ci.id}
                className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        CI {ci.numero}/{ci.ano}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.cor}`}
                        >
                          {badge.texto}
                        </span>
                        {ci.temConflito && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-bold">
                            Gerou Conflito
                          </span>
                        )}
                        {ci.temAlerta && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-bold">
                            Gerou Alerta
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                    <div className="flex items-center gap-2">
                      {ci.caminhoPdf && (
                        <a
                          href={ci.caminhoPdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-semibold"
                        >
                          <Download size={18} />
                          PDF
                        </a>
                      )}
                      <Link
                        href={`/comunicados/${ci.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
                      >
                        <Eye size={18} />
                        Ver Detalhes
                      </Link>
                    </div>
                  </div>

                <div className="mb-4">
                  <p className="text-gray-800 line-clamp-2">{ci.resumoCi}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar size={16} />
                    <span>
                      <span className="font-semibold">Data do Fato:</span>{" "}
                      {new Date(ci.dataFato).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <User size={16} />
                    <span>
                      <span className="font-semibold">Operador:</span>{" "}
                      {ci.operador?.nome || "NÃ£o informado"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText size={16} />
                    <span>
                      <span className="font-semibold">Adolescentes:</span>{" "}
                      {ci.adolescentes.length}
                    </span>
                  </div>
                </div>

                {ci.adolescentes.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Adolescentes envolvidos:
                    </p>
                      {exibirLados && ladosConflito ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {[
                            { titulo: "Lado 1", lista: ladosConflito.lado1 },
                            { titulo: "Lado 2", lista: ladosConflito.lado2 },
                          ].map(({ titulo, lista }) => (
                            <div
                            key={titulo}
                            className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold text-gray-800">
                                {titulo}
                              </p>
                              <span className="text-[11px] font-semibold text-gray-500">
                                {lista.length} participante(s)
                              </span>
                            </div>
                            {lista.length === 0 ? (
                              <p className="text-xs text-gray-500">
                                Nenhum adolescente neste lado.
                              </p>
                            ) : (
                                <div className="space-y-2">
                                  {lista.map((participante) => (
                                    <Link
                                      key={participante.id}
                                      href={`/adolescentes/${participante.id}`}
                                      className="block rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm hover:bg-indigo-100"
                                    >
                                      <div className="flex items-center gap-3">
                                        {participante.fotoUrl ? (
                                          <div className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0">
                                            <img
                                              src={participante.fotoUrl}
                                              alt={participante.nome}
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
                                        ) : (
                                          <div
                                            title="Sem foto cadastrada"
                                            className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0"
                                          >
                                            {participante.nome?.trim().charAt(0) ?? "?"}
                                          </div>
                                        )}
                                        <div>
                                          <p className="font-semibold text-gray-800">
                                            {participante.nome}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            SMS: {participante.numeroSms}
                                          </p>
                                        </div>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {ci.adolescentes.map((adolescente) => (
                            <Link
                              key={adolescente.id}
                              href={`/adolescentes/${adolescente.id}`}
                              className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm hover:bg-indigo-100"
                            >
                              <div className="flex items-center gap-3">
                                {adolescente.fotoUrl ? (
                                  <div className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0">
                                    <img
                                      src={adolescente.fotoUrl}
                                      alt={adolescente.nome}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div
                                    title="Sem foto cadastrada"
                                    className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0"
                                  >
                                    {adolescente.nome?.trim().charAt(0) ?? "?"}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-gray-800">
                                    {adolescente.nome}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    SMS: {adolescente.numeroSms}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
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
