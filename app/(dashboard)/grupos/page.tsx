"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Filter, X, AlertTriangle, UserPlus } from "lucide-react";
import Link from "next/link";
import { CardGrupo } from "@/components/grupos/card-grupo";

type Casa = {
  id: string;
  nome: string;
  numero: number;
};

type Alojamento = {
  id: string;
  numero: string;
  ala: string | null;
  casaId?: string | null;
};

type Adolescente = {
  id: string;
  nomeCompleto: string;
  nomeSocial: string | null;
  numeroSms: string | null;
  fotoUrl: string | null;
  statusUnidade: string;
  alojamento: Alojamento | null;
  conflitosAtivos?: number;
};

type Membro = {
  id: string;
  dataEntrada: string;
  dataSaida: string | null;
  ativo: boolean;
  adolescente: Adolescente;
};

type AlertaConflito = {
  tipo: string;
  nivel: number;
  mensagem: string;
  adolescente?: {
    id: string;
    nome: string;
    grupo?: string;
  };
};

type TransferenciaContexto = {
  adolescenteId: string;
  adolescenteNome: string;
  grupoAtualId: string;
  grupoAtualNome: string;
  grupoDestinoId: string;
  grupoDestinoNome: string;
  casaAtualNome: string;
};

type Grupo = {
  id: string;
  nomeGrupo: string;
  ordemAla: string | null;
  status: "ATIVO" | "INATIVO";
  criadoEm: string;
  casa: Casa;
  totalMembros?: number;
  membros?: Membro[];
  agrupamentosResumo?: {
    faccao: number;
    bairro: number;
    atoInfracional: number;
  };
  agrupamentosDetalhes?: {
    faccao: Array<{
      a: { id: string; nome: string };
      b: { id: string; nome: string };
      detalhe: string;
    }>;
    bairro: Array<{
      a: { id: string; nome: string };
      b: { id: string; nome: string };
      detalhe: string;
    }>;
    atoInfracional: Array<{
      a: { id: string; nome: string };
      b: { id: string; nome: string };
      detalhe: string;
    }>;
  };
};

type InconsistenciaItem = {
  membro: Membro;
  grupoAtual: Grupo;
  casaAtualId: string;
  casaAtualNome: string;
};

export default function GruposPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    casaId: "",
    status: "ATIVO",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [casas, setCasas] = useState<Casa[]>([]);
  const [gruposDisponiveis, setGruposDisponiveis] = useState<Grupo[]>([]);
  const [carregandoInconsistencias, setCarregandoInconsistencias] =
    useState(true);
  const [destinosSelecionados, setDestinosSelecionados] = useState<
    Record<string, string>
  >({});
  const [transferindoId, setTransferindoId] = useState<string | null>(null);
  const [etapaTransferencia, setEtapaTransferencia] = useState<
    "nenhuma" | "conflitos"
  >("nenhuma");
  const [conflitosTransferencia, setConflitosTransferencia] = useState<
    AlertaConflito[]
  >([]);
  const [nivelTransferencia, setNivelTransferencia] = useState<
    "CRITICO" | "ALTO" | "MEDIO" | null
  >(null);
  const [justificativaTransferencia, setJustificativaTransferencia] =
    useState("");
  const [medidasTransferencia, setMedidasTransferencia] = useState<string[]>([]);
  const [transferenciaPendente, setTransferenciaPendente] =
    useState<TransferenciaContexto | null>(null);

  useEffect(() => {
    carregarCasas();
    carregarGrupos();
    carregarGruposDisponiveis();
  }, []);

  useEffect(() => {
    carregarGrupos();
  }, [filtros]);

  const carregarCasas = async () => {
    try {
      const response = await fetch("/api/casas");
      if (!response.ok) throw new Error("Erro ao carregar casas");
      const data = await response.json();
      setCasas(data.casas || []);
    } catch (error) {
      console.error("Erro ao carregar casas:", error);
    }
  };

  const carregarGrupos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.casaId) params.append("casa_id", filtros.casaId);
      if (filtros.status) params.append("status", filtros.status);
      params.append("incluir_membros", "true");

      const response = await fetch(`/api/grupos?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar grupos");
      }

      const data = await response.json();
      setGrupos(data.grupos || []);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
      setGrupos([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarGruposDisponiveis = async () => {
    try {
      setCarregandoInconsistencias(true);
      const params = new URLSearchParams({
        status: "ATIVO",
        incluir_membros: "true",
      });
      const response = await fetch(`/api/grupos?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar grupos disponiveis");
      }
      const data = await response.json();
      setGruposDisponiveis(data.grupos || []);
    } catch (error) {
      console.error("Erro ao carregar grupos disponiveis:", error);
      setGruposDisponiveis([]);
    } finally {
      setCarregandoInconsistencias(false);
    }
  };

  const solicitarTransferencia = async (
    contexto: TransferenciaContexto,
    justificativa?: string,
    medidas?: string[]
  ) => {
    try {
      setTransferindoId(contexto.adolescenteId);
      const response = await fetch(
        `/api/grupos/${contexto.grupoDestinoId}/adicionar-membro`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adolescenteId: contexto.adolescenteId,
            justificativa,
            medidas_adicionais: medidas,
            confirmar_remocao: true,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 400 && data.status === "REQUER_JUSTIFICATIVA") {
        setConflitosTransferencia(
          Array.isArray(data.conflitos) ? data.conflitos : []
        );
        setNivelTransferencia(data.nivel ?? null);
        setTransferenciaPendente(contexto);
        setEtapaTransferencia("conflitos");
        return;
      }

      if (response.status === 201) {
        setEtapaTransferencia("nenhuma");
        setConflitosTransferencia([]);
        setNivelTransferencia(null);
        setJustificativaTransferencia("");
        setMedidasTransferencia([]);
        setTransferenciaPendente(null);
        await Promise.all([carregarGrupos(), carregarGruposDisponiveis()]);
        return;
      }

      alert(data.erro || "Erro ao transferir adolescente");
    } catch (error) {
      console.error("Erro ao transferir adolescente:", error);
      alert("Erro ao transferir adolescente");
    } finally {
      setTransferindoId(null);
    }
  };

  const handleLimparFiltros = () => {
    setFiltros({
      casaId: "",
      status: "ATIVO",
    });
  };

  const handleSelecionarDestino = (adolescenteId: string, grupoId: string) => {
    setDestinosSelecionados((prev) => ({ ...prev, [adolescenteId]: grupoId }));
  };

  const iniciarTransferencia = async (
    membro: Membro,
    grupoAtual: Grupo,
    casaAtualNome: string
  ) => {
    const destinoId = destinosSelecionados[membro.adolescente.id];
    if (!destinoId) {
      alert("Selecione o grupo destino.");
      return;
    }

    const grupoDestino = gruposDisponiveis.find((g) => g.id === destinoId);
    if (!grupoDestino) {
      alert("Grupo destino nao encontrado.");
      return;
    }

    const confirmar = confirm(
      `Transferir ${membro.adolescente.nomeCompleto} do grupo ${grupoAtual.nomeGrupo} para ${grupoDestino.nomeGrupo}?`
    );
    if (!confirmar) {
      return;
    }

    const contexto: TransferenciaContexto = {
      adolescenteId: membro.adolescente.id,
      adolescenteNome: membro.adolescente.nomeCompleto,
      grupoAtualId: grupoAtual.id,
      grupoAtualNome: grupoAtual.nomeGrupo,
      grupoDestinoId: grupoDestino.id,
      grupoDestinoNome: grupoDestino.nomeGrupo,
      casaAtualNome,
    };

    await solicitarTransferencia(contexto);
  };

  const handleConfirmarTransferenciaComJustificativa = async () => {
    if (!transferenciaPendente) return;
    if (!justificativaTransferencia.trim()) {
      alert("Justificativa obrigatoria para continuar.");
      return;
    }
    const medidasLimpa = medidasTransferencia.filter((m) => m.trim());
    await solicitarTransferencia(
      transferenciaPendente,
      justificativaTransferencia.trim(),
      medidasLimpa
    );
  };

  const handleCancelarTransferencia = () => {
    setEtapaTransferencia("nenhuma");
    setConflitosTransferencia([]);
    setNivelTransferencia(null);
    setJustificativaTransferencia("");
    setMedidasTransferencia([]);
    setTransferenciaPendente(null);
  };

  const gruposPorCasa = grupos.reduce((acc, grupo) => {
    const casaNome = grupo.casa.nome;
    if (!acc[casaNome]) {
      acc[casaNome] = [];
    }
    acc[casaNome].push(grupo);
    return acc;
  }, {} as Record<string, Grupo[]>);

  const casasPorId = new Map(casas.map((casa) => [casa.id, casa.nome]));

  const gruposPorCasaId = gruposDisponiveis.reduce((acc, grupo) => {
    if (grupo.status !== "ATIVO") {
      return acc;
    }
    const casaId = grupo.casa.id;
    if (!acc[casaId]) {
      acc[casaId] = [];
    }
    acc[casaId].push(grupo);
    return acc;
  }, {} as Record<string, Grupo[]>);

  const inconsistencias = gruposDisponiveis.flatMap<InconsistenciaItem>(
    (grupo) => {
      const membros = grupo.membros ?? [];
      return membros
        .filter((membro) => (membro.ativo ?? true) && membro.adolescente.alojamento?.casaId)
        .map((membro) => ({
          membro,
          grupoAtual: grupo,
          casaAtualId: membro.adolescente.alojamento?.casaId ?? "",
          casaAtualNome:
            casasPorId.get(membro.adolescente.alojamento?.casaId ?? "") ??
            "Casa desconhecida",
        }))
        .filter((item) => item.casaAtualId && item.casaAtualId !== grupo.casa.id);
    }
  );

  const corNivel = {
    CRITICO: "bg-red-100 text-red-800 border-red-300",
    ALTO: "bg-orange-100 text-orange-800 border-orange-300",
    MEDIO: "bg-yellow-100 text-yellow-800 border-yellow-300",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando grupos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="text-indigo-600" size={32} />
              Gestão de Grupos
            </h1>
            <p className="text-gray-600 mt-1">
              Organize adolescentes em grupos por casa e atividades
            </p>
          </div>

          <Link
            href="/grupos/novo"
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl font-semibold justify-center w-full lg:w-auto"
          >
            <Plus size={20} />
            Novo Grupo
          </Link>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="flex items-center gap-2 text-gray-700 font-semibold hover:text-indigo-600 transition-colors"
            >
              <Filter size={20} />
              Filtros
              {(filtros.casaId || filtros.status !== "ATIVO") && (
                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-bold">
                  Ativos
                </span>
              )}
            </button>

            {(filtros.casaId || filtros.status !== "ATIVO") && (
              <button
                onClick={handleLimparFiltros}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-semibold"
              >
                <X size={16} />
                Limpar filtros
              </button>
            )}
          </div>

          {mostrarFiltros && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
              {/* Filtro por Casa */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Casa
                </label>
                <select
                  value={filtros.casaId}
                  onChange={(e) =>
                    setFiltros({ ...filtros, casaId: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                >
                  <option value="">Todas as casas</option>
                  {casas.map((casa) => (
                    <option key={casa.id} value={casa.id}>
                      {casa.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filtros.status}
                  onChange={(e) =>
                    setFiltros({ ...filtros, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                >
                  <option value="">Todos</option>
                  <option value="ATIVO">Ativos</option>
                  <option value="INATIVO">Inativos</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-semibold">Total de Grupos</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{grupos.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-semibold">Grupos Ativos</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {grupos.filter((g) => g.status === "ATIVO").length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-semibold">Total de Membros</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">
            {grupos.reduce((acc, g) => acc + (g.totalMembros || 0), 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-semibold">Casas com Grupos</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {Object.keys(gruposPorCasa).length}
          </p>
        </div>
      </div>

      {/* Inconsistencias casa x grupo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="text-amber-600" size={22} />
              Adolescentes em grupo divergente da casa
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Lista adolescentes que estão em grupos fora da casa atual.
            </p>
          </div>
          <span className="text-sm font-semibold text-gray-600">
            {carregandoInconsistencias ? "Carregando..." : `${inconsistencias.length} encontrado(s)`}
          </span>
        </div>

        {carregandoInconsistencias ? (
          <div className="p-6 text-sm text-gray-600">Carregando inconsistencias...</div>
        ) : inconsistencias.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">
            Nenhum adolescente em grupo divergente da casa atual.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {inconsistencias.map((item) => {
              const gruposCasa = gruposPorCasaId[item.casaAtualId] ?? [];
              const alojamentoAtual = item.membro.adolescente.alojamento;
              return (
                <div
                  key={`${item.grupoAtual.id}-${item.membro.adolescente.id}`}
                  className="p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {item.membro.adolescente.nomeCompleto}
                    </p>
                    <p className="text-sm text-gray-600">
                      Grupo atual:{" "}
                      <span className="font-semibold text-gray-800">
                        {item.grupoAtual.nomeGrupo}
                      </span>{" "}
                      ({item.grupoAtual.casa.nome})
                    </p>
                    <p className="text-sm text-gray-600">
                      Casa atual:{" "}
                      <span className="font-semibold text-gray-800">
                        {item.casaAtualNome}
                      </span>
                      {alojamentoAtual ? (
                        <span className="text-gray-500">
                          {" "}
                          - Aloj {alojamentoAtual.numero}
                          {alojamentoAtual.ala ? ` (Ala ${alojamentoAtual.ala})` : ""}
                        </span>
                      ) : null}
                    </p>
                    {(item.membro.adolescente.conflitosAtivos ?? 0) > 0 && (
                      <p className="text-xs font-semibold text-red-600 mt-1">
                        Conflitos ativos: {item.membro.adolescente.conflitosAtivos}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select
                      value={destinosSelecionados[item.membro.adolescente.id] ?? ""}
                      onChange={(event) =>
                        handleSelecionarDestino(
                          item.membro.adolescente.id,
                          event.target.value
                        )
                      }
                      className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    >
                      <option value="">Selecionar grupo da casa</option>
                      {gruposCasa.map((grupo) => (
                        <option key={grupo.id} value={grupo.id}>
                          {grupo.nomeGrupo}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={
                        transferindoId === item.membro.adolescente.id ||
                        gruposCasa.length === 0
                      }
                      onClick={() =>
                        iniciarTransferencia(item.membro, item.grupoAtual, item.casaAtualNome)
                      }
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserPlus size={16} />
                      {transferindoId === item.membro.adolescente.id
                        ? "Transferindo..."
                        : "Transferir"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Listagem de Grupos */}
      {grupos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Users className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Nenhum grupo encontrado
          </h3>
          <p className="text-gray-600 mb-6">
            {filtros.casaId || filtros.status !== "ATIVO"
              ? "Tente ajustar os filtros ou criar um novo grupo."
              : "Comece criando seu primeiro grupo."}
          </p>
          <Link
            href="/grupos/novo"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            <Plus size={20} />
            Criar Primeiro Grupo
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(gruposPorCasa)
            .sort(([casaA], [casaB]) => casaA.localeCompare(casaB))
            .map(([casaNome, gruposCasa]) => (
              <div key={casaNome}>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                  {casaNome}
                  <span className="text-sm font-normal text-gray-600">
                    ({gruposCasa.length}{" "}
                    {gruposCasa.length === 1 ? "grupo" : "grupos"})
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gruposCasa.map((grupo) => (
                    <CardGrupo
                      key={grupo.id}
                      grupo={grupo}
                      onAtualizar={carregarGrupos}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {etapaTransferencia === "conflitos" &&
        transferenciaPendente &&
        nivelTransferencia && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Conflitos detectados
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Transferencia para {transferenciaPendente.grupoDestinoNome}
                  </p>
                </div>
                <button
                  onClick={handleCancelarTransferencia}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} className="text-gray-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div
                  className={`p-4 rounded-lg border-2 mb-6 ${
                    corNivel[nivelTransferencia]
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={24} className="flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-lg mb-1">
                        Nivel {nivelTransferencia}
                      </h3>
                      <p className="text-sm">
                        Foram detectados {conflitosTransferencia.length} conflito(s)
                        ao transferir{" "}
                        <strong>{transferenciaPendente.adolescenteNome}</strong> do
                        grupo {transferenciaPendente.grupoAtualNome} para{" "}
                        {transferenciaPendente.grupoDestinoNome}. Justificativa
                        obrigatoria.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-3">
                    Conflitos identificados:
                  </h3>
                  <div className="space-y-3">
                    {conflitosTransferencia.map((conflito, index) => (
                      <div
                        key={`${conflito.tipo}-${index}`}
                        className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`px-2 py-1 rounded text-xs font-bold flex-shrink-0 ${
                              conflito.nivel >= 4
                                ? "bg-red-100 text-red-700"
                                : conflito.nivel === 3
                                ? "bg-orange-100 text-orange-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            Nivel {conflito.nivel}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-1">
                              {conflito.tipo}
                            </p>
                            <p className="text-sm text-gray-700">
                              {conflito.mensagem}
                            </p>
                            {conflito.adolescente && (
                              <p className="text-xs text-gray-600 mt-2">
                                Envolve: {conflito.adolescente.nome}
                                {conflito.adolescente.grupo && (
                                  <span> ({conflito.adolescente.grupo})</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Justificativa operacional *
                  </label>
                  <textarea
                    value={justificativaTransferencia}
                    onChange={(event) =>
                      setJustificativaTransferencia(event.target.value)
                    }
                    placeholder="Explique os motivos para a transferencia."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    A justificativa sera registrada para auditoria.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Medidas adicionais (opcional)
                  </label>
                  <div className="space-y-2">
                    {[
                      "Supervisao reforcada durante atividades",
                      "Mediacao previa com equipe multidisciplinar",
                      "Acompanhamento intensivo nos primeiros 15 dias",
                      "Separacao durante horarios de risco",
                    ].map((medida) => (
                      <label
                        key={medida}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={medidasTransferencia.includes(medida)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setMedidasTransferencia([
                                ...medidasTransferencia,
                                medida,
                              ]);
                            } else {
                              setMedidasTransferencia(
                                medidasTransferencia.filter((m) => m !== medida)
                              );
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{medida}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-4">
                <button
                  onClick={handleCancelarTransferencia}
                  className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarTransferenciaComJustificativa}
                  disabled={!justificativaTransferencia.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus size={20} />
                  Confirmar e transferir
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
