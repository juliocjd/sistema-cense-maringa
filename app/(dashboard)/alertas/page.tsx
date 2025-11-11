"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Bell,
  Filter,
  Search,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { CardAlerta } from "@/components/alertas/card-alerta";
import { ModalNovoAlerta } from "@/components/alertas/modal-novo-alerta";
import type { AlertaAtivo } from "@/types";

type Casa = {
  id: string;
  nome: string;
  numero: number;
};

type Estatisticas = {
  totalAtivos: number;
  porNivel: Record<string, number>;
  porTipo: Record<string, number>;
};

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<AlertaAtivo[]>([]);
  const [casas, setCasas] = useState<Casa[]>([]);
  const [loading, setLoading] = useState(true);
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    totalAtivos: 0,
    porNivel: {},
    porTipo: {},
  });

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<"ATIVO" | "DESATIVADO" | "TODOS">("ATIVO");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [filtroCasa, setFiltroCasa] = useState("");
  const [busca, setBusca] = useState("");

  // Modal
  const [modalNovoAberto, setModalNovoAberto] = useState(false);

  useEffect(() => {
    carregarCasas();
  }, []);

  useEffect(() => {
    carregarAlertas();
  }, [filtroStatus, filtroTipo, filtroNivel, filtroCasa]);

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

  const carregarAlertas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filtroStatus) params.append("status", filtroStatus);
      if (filtroTipo) params.append("tipoAlerta", filtroTipo);
      if (filtroNivel) params.append("nivelRisco", filtroNivel);
      if (filtroCasa) params.append("casaId", filtroCasa);

      const response = await fetch(`/api/alertas?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar alertas");
      }

      const data = await response.json();
      setAlertas(data.alertas || []);
      setEstatisticas(data.estatisticas || { totalAtivos: 0, porNivel: {}, porTipo: {} });
    } catch (error) {
      console.error("Erro ao carregar alertas:", error);
      alert("Erro ao carregar alertas");
    } finally {
      setLoading(false);
    }
  };

  const handleDesativarAlerta = async (alertaId: string) => {
    if (!confirm("Deseja realmente desativar este alerta?")) return;

    try {
      const response = await fetch(`/api/alertas/${alertaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desativar: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.erro || "Erro ao desativar alerta");
        return;
      }

      alert("Alerta desativado com sucesso!");
      carregarAlertas();
    } catch (error) {
      console.error("Erro ao desativar alerta:", error);
      alert("Erro ao desativar alerta");
    }
  };

  const handleReativarAlerta = async (alertaId: string) => {
    if (!confirm("Deseja realmente reativar este alerta?")) return;

    try {
      const response = await fetch(`/api/alertas/${alertaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reativar: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.erro || "Erro ao reativar alerta");
        return;
      }

      alert("Alerta reativado com sucesso!");
      carregarAlertas();
    } catch (error) {
      console.error("Erro ao reativar alerta:", error);
      alert("Erro ao reativar alerta");
    }
  };

  const alertasFiltrados = alertas.filter((alerta) => {
    if (!busca) return true;

    const termoBusca = busca.toLowerCase();
    const nomeCompleto = alerta.adolescente?.nomeCompleto?.toLowerCase() || "";
    const nomeSocial = alerta.adolescente?.nomeSocial?.toLowerCase() || "";
    const numeroSms = alerta.adolescente?.numeroSms || "";
    const descricao = alerta.descricaoAlerta?.toLowerCase() || "";

    return (
      nomeCompleto.includes(termoBusca) ||
      nomeSocial.includes(termoBusca) ||
      numeroSms.includes(termoBusca) ||
      descricao.includes(termoBusca)
    );
  });

  const tiposUnicos = Array.from(
    new Set(alertas.map((a) => a.tipoAlerta).filter(Boolean))
  ) as string[];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Bell className="text-red-600" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Alertas Ativos</h1>
              <p className="text-gray-600">
                Gerenciamento de alertas e notificações do sistema
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={carregarAlertas}
              className="flex items-center gap-2 bg-white border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              <RefreshCw size={18} />
              Atualizar
            </button>
            <button
              onClick={() => setModalNovoAberto(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-bold shadow-lg"
            >
              <Plus size={20} />
              Novo Alerta
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">Total Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {estatisticas.totalAtivos}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">Críticos</p>
                <p className="text-2xl font-bold text-red-600">
                  {estatisticas.porNivel?.CRITICO || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">Altos</p>
                <p className="text-2xl font-bold text-orange-600">
                  {estatisticas.porNivel?.ALTO || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">Médios</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {estatisticas.porNivel?.MEDIO || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-600" />
          <h3 className="font-bold text-gray-900">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filtroStatus}
              onChange={(e) =>
                setFiltroStatus(e.target.value as "ATIVO" | "DESATIVADO" | "TODOS")
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
            >
              <option value="ATIVO">Ativos</option>
              <option value="DESATIVADO">Desativados</option>
              <option value="TODOS">Todos</option>
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de Alerta
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
            >
              <option value="">Todos os tipos</option>
              {tiposUnicos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          {/* Nível */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nível de Risco
            </label>
            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
            >
              <option value="">Todos os níveis</option>
              <option value="CRITICO">Crítico</option>
              <option value="ALTO">Alto</option>
              <option value="MEDIO">Médio</option>
              <option value="BAIXO">Baixo</option>
            </select>
          </div>

          {/* Casa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Casa
            </label>
            <select
              value={filtroCasa}
              onChange={(e) => setFiltroCasa(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
            >
              <option value="">Todas as casas</option>
              {casas.map((casa) => (
                <option key={casa.id} value={casa.id}>
                  {casa.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Busca */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Buscar
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, SMS, descrição..."
                className="w-full pl-10 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Alertas */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando alertas...</p>
        </div>
      ) : alertasFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Bell className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Nenhum alerta encontrado
          </h3>
          <p className="text-gray-600 mb-6">
            {busca
              ? "Nenhum alerta corresponde aos critérios de busca"
              : "Não há alertas com os filtros selecionados"}
          </p>
          {filtroStatus === "ATIVO" && !busca && (
            <button
              onClick={() => setModalNovoAberto(true)}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-bold"
            >
              <Plus size={20} />
              Criar Primeiro Alerta
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {alertasFiltrados.map((alerta) => (
            <CardAlerta
              key={alerta.id}
              alerta={alerta}
              onDesativar={handleDesativarAlerta}
              onReativar={handleReativarAlerta}
              onAtualizar={carregarAlertas}
            />
          ))}
        </div>
      )}

      {/* Modal Novo Alerta */}
      {modalNovoAberto && (
        <ModalNovoAlerta
          onClose={() => setModalNovoAberto(false)}
          onSucesso={() => {
            carregarAlertas();
            setModalNovoAberto(false);
          }}
        />
      )}
    </div>
  );
}
