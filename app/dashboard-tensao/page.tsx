"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Home,
  AlertTriangle,
  TrendingUp,
  Users,
  Shield,
  ArrowLeft,
  BarChart3,
  Activity,
  Clock,
  ExternalLink,
  Download,
  Filter,
  X,
  PieChart,
  BarChart2,
  RefreshCw,
  Pause,
  Play
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CasaMetrics = {
  id: string;
  nome: string;
  numero: number;
  isolada: boolean;
  scoreTensao: number;
  alojamentos: {
    total: number;
    ocupados: number;
    livres: number;
    emRisco: number;
  };
  nivelRisco: {
    critico: number; // nível 5
    elevado: number; // nível 4
    atencao: number; // nível 3
    monitorar: number; // nível 2
    seguro: number; // nível 1
    livre: number; // nível 0
  };
  conflitos: {
    total: number;
    ativos: number;
  };
};

type DashboardData = {
  casas: CasaMetrics[];
  estatisticas: {
    totalAlojamentos: number;
    alojamentosOcupados: number;
    alojamentosComRisco: number;
    taxaOcupacao: string;
  };
};

type FiltroRisco = "todos" | "critico" | "alto" | "medio" | "baixo" | "sem-risco";
type FiltroAlerta = "todos" | "com-conflitos" | "superlotacao" | "sem-alertas";
type TipoOrdenacao = "casa" | "tensao" | "ocupacao" | "conflitos";

export default function DashboardTensaoPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ordenacao, setOrdenacao] = useState<TipoOrdenacao>("tensao");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  // Estados de filtro
  const [filtroRisco, setFiltroRisco] = useState<FiltroRisco>("todos");
  const [filtroAlerta, setFiltroAlerta] = useState<FiltroAlerta>("todos");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarGraficos, setMostrarGraficos] = useState(true);

  // Estados de auto-refresh
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(3); // minutos
  const [proximaAtualizacao, setProximaAtualizacao] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) {
      setProximaAtualizacao(null);
      return;
    }

    const intervalMs = refreshInterval * 60 * 1000; // converter minutos para ms
    const proximaData = new Date(Date.now() + intervalMs);
    setProximaAtualizacao(proximaData);

    const timer = setInterval(() => {
      fetchData();
      const novaProximaData = new Date(Date.now() + intervalMs);
      setProximaAtualizacao(novaProximaData);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, refreshInterval]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErro(null);

      const response = await fetch("/api/casas/status");
      if (!response.ok) throw new Error("Erro ao carregar dados");

      const result = await response.json();

      // Processar dados para o dashboard
      const casasMetrics: CasaMetrics[] = result.casas.map((casa: any) => {
        const alojamentos = casa.alojamentos || [];

        // Contar alojamentos por nível de risco
        const nivelRisco = {
          critico: 0,
          elevado: 0,
          atencao: 0,
          monitorar: 0,
          seguro: 0,
          livre: 0,
        };

        alojamentos.forEach((aloj: any) => {
          const nivel = aloj.nivel_risco ?? 0;
          if (nivel === 5) nivelRisco.critico++;
          else if (nivel === 4) nivelRisco.elevado++;
          else if (nivel === 3) nivelRisco.atencao++;
          else if (nivel === 2) nivelRisco.monitorar++;
          else if (nivel === 1) nivelRisco.seguro++;
          else nivelRisco.livre++;
        });

        // Contar conflitos ativos
        let conflitosAtivos = 0;
        alojamentos.forEach((aloj: any) => {
          if (aloj.ocupante) {
            const totalConflitosA = aloj.ocupante.conflitosA?.length || 0;
            const totalConflitosB = aloj.ocupante.conflitosB?.length || 0;
            conflitosAtivos += totalConflitosA + totalConflitosB;
          }
        });

        return {
          id: casa.id,
          nome: casa.nome,
          numero: casa.numero,
          isolada: casa.isolada,
          scoreTensao: casa.score_tensao || 0,
          alojamentos: {
            total: alojamentos.length,
            ocupados: alojamentos.filter((a: any) => a.ocupante !== null).length,
            livres: alojamentos.filter((a: any) => a.ocupante === null).length,
            emRisco: alojamentos.filter((a: any) => (a.nivel_risco ?? 0) >= 3).length,
          },
          nivelRisco,
          conflitos: {
            total: conflitosAtivos,
            ativos: conflitosAtivos,
          },
        };
      });

      setData({
        casas: casasMetrics,
        estatisticas: result.estatisticas,
      });
      setUltimaAtualizacao(new Date());
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      setErro(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  // Calcular dados para gráficos
  const dadosGraficos = useMemo(() => {
    if (!data?.casas) return null;

    // Distribuição geral de riscos (todos os alojamentos)
    const totalAlojamentos = data.casas.reduce((sum, casa) => sum + casa.alojamentos.total, 0);
    const distribuicaoRisco = {
      critico: data.casas.reduce((sum, casa) => sum + casa.nivelRisco.critico, 0),
      elevado: data.casas.reduce((sum, casa) => sum + casa.nivelRisco.elevado, 0),
      atencao: data.casas.reduce((sum, casa) => sum + casa.nivelRisco.atencao, 0),
      monitorar: data.casas.reduce((sum, casa) => sum + casa.nivelRisco.monitorar, 0),
      seguro: data.casas.reduce((sum, casa) => sum + casa.nivelRisco.seguro, 0),
      livre: data.casas.reduce((sum, casa) => sum + casa.nivelRisco.livre, 0),
    };

    // Top 5 casas com maior tensão
    const top5Tensao = [...data.casas]
      .sort((a, b) => b.scoreTensao - a.scoreTensao)
      .slice(0, 5);

    // Dados para mapa de calor (matriz de casas e alas)
    const mapaCalor = data.casas.map(casa => ({
      nome: casa.nome || `Casa ${String(casa.numero).padStart(2, '0')}`,
      numero: casa.numero,
      tensao: casa.scoreTensao,
      nivel: casa.scoreTensao === 0 ? 0 :
             casa.scoreTensao <= 5 ? 1 :
             casa.scoreTensao <= 15 ? 2 :
             casa.scoreTensao <= 30 ? 3 : 4
    }));

    return {
      totalAlojamentos,
      distribuicaoRisco,
      top5Tensao,
      mapaCalor
    };
  }, [data?.casas]);

  // Aplicar filtros e ordenação com useMemo
  const casasFiltradas = useMemo(() => {
    if (!data?.casas) return [];

    let resultado = data.casas.slice();

    // Filtro por Risco
    if (filtroRisco !== "todos") {
      resultado = resultado.filter((casa) => {
        const maxNivel = Math.max(
          casa.nivelRisco.critico > 0 ? 5 : 0,
          casa.nivelRisco.elevado > 0 ? 4 : 0,
          casa.nivelRisco.atencao > 0 ? 3 : 0,
          casa.nivelRisco.monitorar > 0 ? 2 : 0,
          casa.nivelRisco.seguro > 0 ? 1 : 0
        );

        switch (filtroRisco) {
          case "critico":
            return maxNivel === 5;
          case "alto":
            return maxNivel === 4;
          case "medio":
            return maxNivel === 3;
          case "baixo":
            return maxNivel >= 1 && maxNivel <= 2;
          case "sem-risco":
            return maxNivel === 0;
          default:
            return true;
        }
      });
    }

    // Filtro por Alerta
    if (filtroAlerta !== "todos") {
      resultado = resultado.filter((casa) => {
        const taxaOcupacao = casa.alojamentos.total > 0
          ? (casa.alojamentos.ocupados / casa.alojamentos.total) * 100
          : 0;
        const temConflitos = casa.conflitos.ativos > 0;
        const superlotado = taxaOcupacao >= 90;

        switch (filtroAlerta) {
          case "com-conflitos":
            return temConflitos;
          case "superlotacao":
            return superlotado;
          case "sem-alertas":
            return !temConflitos && !superlotado;
          default:
            return true;
        }
      });
    }

    // Ordenação
    resultado.sort((a, b) => {
      switch (ordenacao) {
        case "tensao":
          return b.scoreTensao - a.scoreTensao;
        case "ocupacao":
          const taxaA = a.alojamentos.total > 0 ? (a.alojamentos.ocupados / a.alojamentos.total) : 0;
          const taxaB = b.alojamentos.total > 0 ? (b.alojamentos.ocupados / b.alojamentos.total) : 0;
          return taxaB - taxaA;
        case "conflitos":
          return b.conflitos.ativos - a.conflitos.ativos;
        case "casa":
        default:
          return a.numero - b.numero;
      }
    });

    return resultado;
  }, [data?.casas, filtroRisco, filtroAlerta, ordenacao]);

  // Formatar timestamp
  const formatarHora = (data: Date | null) => {
    if (!data) return "";
    return data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  // Exportar dados para CSV
  const exportarCSV = () => {
    if (!data) return;

    const linhas = [
      // Cabeçalho
      [
        "Casa",
        "Score Tensão",
        "Nível Tensão",
        "Total Alojamentos",
        "Ocupados",
        "Livres",
        "Em Risco",
        "Crítico (5)",
        "Elevado (4)",
        "Atenção (3)",
        "Conflitos Ativos"
      ].join(","),

      // Dados
      ...casasFiltradas.map((casa: CasaMetrics) => [
        casa.nome || `Casa ${String(casa.numero).padStart(2, '0')}`,
        casa.scoreTensao,
        getTensaoLabel(casa.scoreTensao),
        casa.alojamentos.total,
        casa.alojamentos.ocupados,
        casa.alojamentos.livres,
        casa.alojamentos.emRisco,
        casa.nivelRisco.critico,
        casa.nivelRisco.elevado,
        casa.nivelRisco.atencao,
        casa.conflitos.ativos
      ].join(","))
    ];

    const csv = linhas.join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-tensao-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTensaoColor = (score: number) => {
    if (score === 0) return "bg-green-100 text-green-800 border-green-300";
    if (score <= 5) return "bg-lime-100 text-lime-800 border-lime-300";
    if (score <= 15) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (score <= 30) return "bg-orange-100 text-orange-800 border-orange-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const getTensaoLabel = (score: number) => {
    if (score === 0) return "Sem Tensão";
    if (score <= 5) return "Baixa";
    if (score <= 15) return "Moderada";
    if (score <= 30) return "Alta";
    return "Crítica";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Activity className="animate-spin mx-auto mb-4 text-indigo-600" size={48} />
              <p className="text-slate-600">Carregando dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto mb-4 text-red-600" size={48} />
            <p className="text-red-800 font-semibold mb-2">Erro ao carregar dashboard</p>
            <p className="text-red-600 text-sm">{erro}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/estrutura"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4"
          >
            <ArrowLeft size={20} />
            Voltar para Estrutura
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <BarChart3 size={36} className="text-indigo-600" />
                Dashboard de Tensão por Casa
              </h1>
              <p className="text-slate-600 mt-2">
                Visão geral do nível de risco e conflitos em cada casa da unidade
              </p>
              {ultimaAtualizacao && (
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                  <Clock size={14} />
                  Última atualização: {formatarHora(ultimaAtualizacao)}
                </p>
              )}
            </div>

            <div className="flex gap-3 items-center">
              {/* Auto-refresh Controls */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-300">
                <RefreshCw size={16} className="text-slate-600" />
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="text-sm bg-transparent border-none focus:outline-none text-slate-700 cursor-pointer"
                  disabled={autoRefreshEnabled}
                >
                  <option value={1}>1 min</option>
                  <option value={3}>3 min</option>
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                </select>
                <button
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  className={`p-1.5 rounded transition-colors ${
                    autoRefreshEnabled
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-slate-300 text-slate-600 hover:bg-slate-400"
                  }`}
                  title={autoRefreshEnabled ? "Pausar auto-atualização" : "Iniciar auto-atualização"}
                >
                  {autoRefreshEnabled ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>

              {/* Próxima atualização */}
              {proximaAtualizacao && autoRefreshEnabled && (
                <span className="text-xs text-slate-500">
                  Próxima: {proximaAtualizacao.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}

              <button
                onClick={exportarCSV}
                disabled={!data}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar dados em CSV"
              >
                <Download size={18} />
                Exportar
              </button>

              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Activity size={18} className={loading ? "animate-spin" : ""} />
                {loading ? "Atualizando..." : "Atualizar"}
              </button>
            </div>
          </div>
        </div>

        {/* Estatísticas Gerais */}
        {data && dadosGraficos && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <Home className="text-indigo-600" size={24} />
                <h3 className="font-semibold text-slate-700">Total Alojamentos</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {data.estatisticas.totalAlojamentos}
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-green-600" size={24} />
                <h3 className="font-semibold text-slate-700">Ocupados</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {data.estatisticas.alojamentosOcupados}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Taxa: {data.estatisticas.taxaOcupacao}
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="text-orange-600" size={24} />
                <h3 className="font-semibold text-slate-700">Com Risco</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {data.estatisticas.alojamentosComRisco}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Nível 3+
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-purple-600" size={24} />
                <h3 className="font-semibold text-slate-700">Tensão Total</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {data.casas.reduce((sum, casa) => sum + casa.scoreTensao, 0)}
              </p>
            </div>
          </div>
        )}

        {/* Seção de Gráficos Visuais */}
        {dadosGraficos && mostrarGraficos && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 border-b border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="text-purple-600" size={20} />
                  <h3 className="text-sm font-semibold text-slate-800">Análise Visual</h3>
                </div>
                <button
                  onClick={() => setMostrarGraficos(!mostrarGraficos)}
                  className="px-3 py-1 text-sm bg-white text-purple-600 rounded-lg hover:bg-purple-50 border border-purple-300 font-medium transition-colors"
                >
                  Ocultar
                </button>
              </div>
            </div>

            {/* Grid de Gráficos */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Gráfico 1: Distribuição de Risco (Donut Chart) */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="text-purple-600" size={18} />
                  <h4 className="font-semibold text-slate-800">Distribuição de Risco</h4>
                </div>

                <div className="flex items-center gap-6">
                  {/* Gráfico Donut com CSS */}
                  <div className="relative w-40 h-40 flex-shrink-0">
                    {/* Círculo externo */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {(() => {
                        const total = dadosGraficos.totalAlojamentos || 1;
                        const strokeWidth = 20;
                        const radius = 40;
                        const circumference = 2 * Math.PI * radius;

                        let currentOffset = 0;

                        const segmentos = [
                          { valor: dadosGraficos.distribuicaoRisco.critico, cor: '#ef4444', label: 'Crítico' },
                          { valor: dadosGraficos.distribuicaoRisco.elevado, cor: '#f97316', label: 'Elevado' },
                          { valor: dadosGraficos.distribuicaoRisco.atencao, cor: '#eab308', label: 'Atenção' },
                          { valor: dadosGraficos.distribuicaoRisco.monitorar, cor: '#3b82f6', label: 'Monitorar' },
                          { valor: dadosGraficos.distribuicaoRisco.seguro, cor: '#22c55e', label: 'Seguro' },
                          { valor: dadosGraficos.distribuicaoRisco.livre, cor: '#10b981', label: 'Livre' }
                        ];

                        return segmentos.map((seg, idx) => {
                          if (seg.valor === 0) return null;

                          const percentage = seg.valor / total;
                          const strokeDasharray = `${percentage * circumference} ${circumference}`;
                          const strokeDashoffset = -currentOffset * circumference;
                          currentOffset += percentage;

                          return (
                            <circle
                              key={idx}
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="transparent"
                              stroke={seg.cor}
                              strokeWidth={strokeWidth}
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-300"
                            />
                          );
                        });
                      })()}
                    </svg>

                    {/* Centro com total */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-slate-900">{dadosGraficos.totalAlojamentos}</span>
                      <span className="text-xs text-slate-600">Total</span>
                    </div>
                  </div>

                  {/* Legenda */}
                  <div className="flex-1 space-y-2">
                    {[
                      { label: 'Crítico (5)', valor: dadosGraficos.distribuicaoRisco.critico, cor: 'bg-red-500' },
                      { label: 'Elevado (4)', valor: dadosGraficos.distribuicaoRisco.elevado, cor: 'bg-orange-500' },
                      { label: 'Atenção (3)', valor: dadosGraficos.distribuicaoRisco.atencao, cor: 'bg-yellow-500' },
                      { label: 'Monitorar (2)', valor: dadosGraficos.distribuicaoRisco.monitorar, cor: 'bg-blue-500' },
                      { label: 'Seguro (1)', valor: dadosGraficos.distribuicaoRisco.seguro, cor: 'bg-green-500' },
                      { label: 'Livre (0)', valor: dadosGraficos.distribuicaoRisco.livre, cor: 'bg-emerald-500' }
                    ].map((item, idx) => (
                      item.valor > 0 && (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${item.cor}`}></div>
                            <span className="text-slate-700">{item.label}</span>
                          </div>
                          <span className="font-semibold text-slate-900">{item.valor}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>

              {/* Gráfico 2: Top 5 Casas por Tensão (Barras Horizontais) */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="text-purple-600" size={18} />
                  <h4 className="font-semibold text-slate-800">Top 5 Casas - Maior Tensão</h4>
                </div>

                <div className="space-y-3">
                  {dadosGraficos.top5Tensao.map((casa, idx) => {
                    const maxTensao = Math.max(...dadosGraficos.top5Tensao.map(c => c.scoreTensao));
                    const porcentagem = maxTensao > 0 ? (casa.scoreTensao / maxTensao) * 100 : 0;

                    const corBarra = casa.scoreTensao === 0 ? 'bg-green-500' :
                                    casa.scoreTensao <= 5 ? 'bg-lime-500' :
                                    casa.scoreTensao <= 15 ? 'bg-yellow-500' :
                                    casa.scoreTensao <= 30 ? 'bg-orange-500' : 'bg-red-500';

                    return (
                      <div key={casa.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">
                            {casa.nome || `Casa ${String(casa.numero).padStart(2, '0')}`}
                          </span>
                          <span className="font-bold text-slate-900">{casa.scoreTensao}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-6 overflow-hidden">
                          <div
                            className={`h-full ${corBarra} transition-all duration-500 flex items-center justify-end pr-2`}
                            style={{ width: `${Math.max(porcentagem, 5)}%` }}
                          >
                            <span className="text-xs font-semibold text-white">
                              {casa.conflitos.ativos} conflitos
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gráfico 3: Mapa de Calor das Casas */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="text-purple-600" size={18} />
                  <h4 className="font-semibold text-slate-800">Mapa de Calor - Nível de Tensão por Casa</h4>
                </div>

                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {dadosGraficos.mapaCalor.map((casa) => {
                    const corFundo = casa.nivel === 0 ? 'bg-green-100 border-green-300' :
                                    casa.nivel === 1 ? 'bg-lime-100 border-lime-300' :
                                    casa.nivel === 2 ? 'bg-yellow-100 border-yellow-300' :
                                    casa.nivel === 3 ? 'bg-orange-100 border-orange-300' :
                                    'bg-red-100 border-red-300';

                    const corTexto = casa.nivel === 0 ? 'text-green-800' :
                                    casa.nivel === 1 ? 'text-lime-800' :
                                    casa.nivel === 2 ? 'text-yellow-800' :
                                    casa.nivel === 3 ? 'text-orange-800' :
                                    'text-red-800';

                    return (
                      <div
                        key={casa.numero}
                        className={`${corFundo} ${corTexto} rounded-lg p-3 border-2 hover:scale-105 transition-transform cursor-pointer`}
                        title={`${casa.nome} - Tensão: ${casa.tensao}`}
                      >
                        <div className="text-center">
                          <div className="text-2xl font-bold">{casa.numero}</div>
                          <div className="text-xs font-semibold mt-1">{casa.tensao}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legenda do Mapa de Calor */}
                <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                    <span className="text-slate-600">Sem Tensão</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-lime-100 border-2 border-lime-300 rounded"></div>
                    <span className="text-slate-600">Baixa (≤5)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
                    <span className="text-slate-600">Moderada (6-15)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
                    <span className="text-slate-600">Alta (16-30)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
                    <span className="text-slate-600">Crítica (&gt;30)</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Botão para mostrar gráficos quando ocultos */}
        {!mostrarGraficos && (
          <div className="mb-6">
            <button
              onClick={() => setMostrarGraficos(true)}
              className="w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 border-2 border-purple-200 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <BarChart3 size={20} />
              Mostrar Gráficos de Análise Visual
            </button>
          </div>
        )}

        {/* Controles de Filtros e Ordenação */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 overflow-hidden">
          {/* Header com toggle de filtros */}
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 border-b border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Filter className="text-indigo-600" size={20} />
                <h3 className="text-sm font-semibold text-slate-800">Filtros e Ordenação</h3>
                {(filtroRisco !== "todos" || filtroAlerta !== "todos") && (
                  <span className="px-2 py-1 bg-indigo-600 text-white text-xs rounded-full font-medium">
                    {[filtroRisco !== "todos" && 1, filtroAlerta !== "todos" && 1].filter(Boolean).length} ativo(s)
                  </span>
                )}
              </div>
              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="px-3 py-1 text-sm bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 border border-indigo-300 font-medium transition-colors"
              >
                {mostrarFiltros ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {/* Painel de Filtros (expansível) */}
          {mostrarFiltros && (
            <div className="p-4 space-y-4 bg-slate-50">
              {/* Filtro por Risco */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Filtrar por Nível de Risco:
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFiltroRisco("todos")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroRisco === "todos"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroRisco("critico")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroRisco === "critico"
                        ? "bg-red-600 text-white"
                        : "bg-white text-slate-700 hover:bg-red-50 border border-red-300"
                    }`}
                  >
                    Crítico (5)
                  </button>
                  <button
                    onClick={() => setFiltroRisco("alto")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroRisco === "alto"
                        ? "bg-orange-600 text-white"
                        : "bg-white text-slate-700 hover:bg-orange-50 border border-orange-300"
                    }`}
                  >
                    Alto (4)
                  </button>
                  <button
                    onClick={() => setFiltroRisco("medio")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroRisco === "medio"
                        ? "bg-yellow-600 text-white"
                        : "bg-white text-slate-700 hover:bg-yellow-50 border border-yellow-300"
                    }`}
                  >
                    Médio (3)
                  </button>
                  <button
                    onClick={() => setFiltroRisco("baixo")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroRisco === "baixo"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-700 hover:bg-blue-50 border border-blue-300"
                    }`}
                  >
                    Baixo (1-2)
                  </button>
                  <button
                    onClick={() => setFiltroRisco("sem-risco")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroRisco === "sem-risco"
                        ? "bg-green-600 text-white"
                        : "bg-white text-slate-700 hover:bg-green-50 border border-green-300"
                    }`}
                  >
                    Sem Risco (0)
                  </button>
                </div>
              </div>

              {/* Filtro por Alerta */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Filtrar por Tipo de Alerta:
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFiltroAlerta("todos")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroAlerta === "todos"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroAlerta("com-conflitos")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroAlerta === "com-conflitos"
                        ? "bg-red-600 text-white"
                        : "bg-white text-slate-700 hover:bg-red-50 border border-red-300"
                    }`}
                  >
                    Com Conflitos
                  </button>
                  <button
                    onClick={() => setFiltroAlerta("superlotacao")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroAlerta === "superlotacao"
                        ? "bg-orange-600 text-white"
                        : "bg-white text-slate-700 hover:bg-orange-50 border border-orange-300"
                    }`}
                  >
                    Superlotação (≥90%)
                  </button>
                  <button
                    onClick={() => setFiltroAlerta("sem-alertas")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroAlerta === "sem-alertas"
                        ? "bg-green-600 text-white"
                        : "bg-white text-slate-700 hover:bg-green-50 border border-green-300"
                    }`}
                  >
                    Sem Alertas
                  </button>
                </div>
              </div>

              {/* Botão Limpar Filtros */}
              {(filtroRisco !== "todos" || filtroAlerta !== "todos") && (
                <div className="pt-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setFiltroRisco("todos");
                      setFiltroAlerta("todos");
                    }}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <X size={16} />
                    Limpar Filtros
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Ordenação */}
          <div className="p-4 bg-white">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-semibold text-slate-700">Ordenar por:</span>
              <button
                onClick={() => setOrdenacao("tensao")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  ordenacao === "tensao"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Maior Tensão
              </button>
              <button
                onClick={() => setOrdenacao("ocupacao")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  ordenacao === "ocupacao"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Taxa de Ocupação
              </button>
              <button
                onClick={() => setOrdenacao("conflitos")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  ordenacao === "conflitos"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Mais Conflitos
              </button>
              <button
                onClick={() => setOrdenacao("casa")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  ordenacao === "casa"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Número da Casa
              </button>
            </div>
          </div>
        </div>

        {/* Mensagem quando não há resultados */}
        {casasFiltradas.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <AlertTriangle className="mx-auto mb-4 text-yellow-600" size={48} />
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Nenhuma casa encontrada
            </h3>
            <p className="text-yellow-700 mb-4">
              Não há casas que correspondam aos filtros selecionados.
            </p>
            <button
              onClick={() => {
                setFiltroRisco("todos");
                setFiltroAlerta("todos");
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
            >
              Limpar Filtros
            </button>
          </div>
        )}

        {/* Contador de Resultados */}
        {casasFiltradas.length > 0 && (
          <div className="mb-4 text-sm text-slate-600">
            Mostrando <span className="font-semibold text-slate-900">{casasFiltradas.length}</span> de{" "}
            <span className="font-semibold text-slate-900">{data?.casas.length || 0}</span> casas
          </div>
        )}

        {/* Cards das Casas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {casasFiltradas.map((casa) => (
            <div
              key={casa.id}
              className="bg-white rounded-lg shadow-md border-2 border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Header do Card */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Home size={24} />
                    <h3 className="text-xl font-bold">
                      {casa.nome || `Casa ${String(casa.numero).padStart(2, '0')}`}
                    </h3>
                  </div>
                  {casa.isolada && (
                    <Shield size={20} className="text-yellow-300" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getTensaoColor(casa.scoreTensao)}`}>
                    Tensão: {getTensaoLabel(casa.scoreTensao)} ({casa.scoreTensao})
                  </span>
                </div>
              </div>

              {/* Conteúdo do Card */}
              <div className="p-4 space-y-4">
                {/* Alojamentos */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Home size={16} />
                    Alojamentos
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-50 rounded p-2">
                      <p className="text-slate-600">Total</p>
                      <p className="text-lg font-bold text-slate-900">{casa.alojamentos.total}</p>
                    </div>
                    <div className="bg-green-50 rounded p-2">
                      <p className="text-green-700">Ocupados</p>
                      <p className="text-lg font-bold text-green-900">{casa.alojamentos.ocupados}</p>
                    </div>
                    <div className="bg-blue-50 rounded p-2">
                      <p className="text-blue-700">Livres</p>
                      <p className="text-lg font-bold text-blue-900">{casa.alojamentos.livres}</p>
                    </div>
                    <div className="bg-orange-50 rounded p-2">
                      <p className="text-orange-700">Em Risco</p>
                      <p className="text-lg font-bold text-orange-900">{casa.alojamentos.emRisco}</p>
                    </div>
                  </div>
                </div>

                {/* Distribuição de Risco */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Distribuição de Risco
                  </h4>
                  <div className="space-y-1">
                    {casa.nivelRisco.critico > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 text-xs text-slate-600">Crítico (5)</div>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-red-500 h-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ width: `${(casa.nivelRisco.critico / casa.alojamentos.total) * 100}%` }}
                          >
                            {casa.nivelRisco.critico > 0 && casa.nivelRisco.critico}
                          </div>
                        </div>
                      </div>
                    )}
                    {casa.nivelRisco.elevado > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 text-xs text-slate-600">Elevado (4)</div>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-orange-500 h-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ width: `${(casa.nivelRisco.elevado / casa.alojamentos.total) * 100}%` }}
                          >
                            {casa.nivelRisco.elevado > 0 && casa.nivelRisco.elevado}
                          </div>
                        </div>
                      </div>
                    )}
                    {casa.nivelRisco.atencao > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 text-xs text-slate-600">Atenção (3)</div>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-yellow-500 h-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ width: `${(casa.nivelRisco.atencao / casa.alojamentos.total) * 100}%` }}
                          >
                            {casa.nivelRisco.atencao > 0 && casa.nivelRisco.atencao}
                          </div>
                        </div>
                      </div>
                    )}
                    {(casa.nivelRisco.critico === 0 && casa.nivelRisco.elevado === 0 && casa.nivelRisco.atencao === 0) && (
                      <p className="text-sm text-green-600 flex items-center gap-2">
                        <Shield size={16} />
                        Todos os alojamentos seguros (nível 0-2)
                      </p>
                    )}
                  </div>
                </div>

                {/* Conflitos */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Conflitos Ativos</span>
                    <span className={`text-2xl font-bold ${casa.conflitos.ativos > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {casa.conflitos.ativos}
                    </span>
                  </div>
                </div>

                {/* Link para Detalhes */}
                <button
                  onClick={() => router.push(`/estrutura?casa=${casa.numero}`)}
                  className="w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  Ver Detalhes da Casa
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
