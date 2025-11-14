"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Users,
  Home,
  Swords,
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  UserCircle,
  MapPin,
  PieChart,
  Activity,
  RefreshCw,
  Download,
  Clock,
  Filter,
  X,
  ChevronUp,
  ChevronDown,
  Minus,
  FileDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AnalyticsData = {
  resumo: {
    totalAdolescentes: number;
    totalConflitos: number;
    totalCasas: number;
    totalAlojamentos: number;
    alertasAtivos: number;
    gruposAtivos: number;
    adolescentesComTatuagens: number;
    taxaOcupacao: string;
    alojamentosOcupados: number;
    alojamentosLivres: number;
  };
  distribuicoes: {
    porFase: Array<{ fase: string; total: number }>;
    porFaccao: Array<{ faccao: string; total: number }>;
    porBairro: Array<{ bairro: string; total: number }>;
    porTipoConflito: Array<{ tipo: string; total: number }>;
  };
  tatuagens: {
    top10: Array<{ nome: string; nivelRisco: string | null; total: number }>;
    porcentagemComTatuagem: string;
  };
  ocupacao: {
    porCasa: Array<{
      casa: string;
      total: number;
      ocupados: number;
      livres: number;
      taxaOcupacao: string;
    }>;
  };
  timestamp: string;
};

type TemporalData = {
  periodo: {
    dias: number;
    dataInicio: string;
    dataFim: string;
  };
  evolucao: {
    cadastrosPorDia: Array<{ dia: string; total: number }>;
    conflitosPorDia: Array<{ dia: string; total: number }>;
    alertasPorDia: Array<{ dia: string; total: number }>;
    cadastrosPorSemana: Array<{ semana: string; total: number }>;
    conflitosPorSemana: Array<{ semana: string; total: number }>;
  };
  tendencias: {
    cadastros: { inclinacao: number; direcao: string };
    conflitos: { inclinacao: number; direcao: string };
    alertas: { inclinacao: number; direcao: string };
  };
  comparacao: {
    cadastros: { atual: number; anterior: number; variacao: number };
    conflitos: { atual: number; anterior: number; variacao: number };
    alertas: { atual: number; anterior: number; variacao: number };
  };
  tatuagens: {
    riscoAlto: number;
    riscoMedio: number;
    percentualAltoRisco: string;
  };
  timestamp: string;
};

const COLORS = {
  primary: "#4f46e5",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
  teal: "#14b8a6",
  pink: "#ec4899",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.info,
  COLORS.purple,
  COLORS.teal,
  COLORS.pink,
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [temporalData, setTemporalData] = useState<TemporalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  // Filtros
  const [periodo, setPeriodo] = useState("30");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [casaSelecionada, setCasaSelecionada] = useState<string>("");
  const [faseSelecionada, setFaseSelecionada] = useState<string>("");

  // Listas para filtros
  const [casas, setCasas] = useState<{ id: string; nome: string; numero: number }[]>([]);
  const [fases, setFases] = useState<{ id: string; nomeFase: string }[]>([]);

  // Drill-down modal
  const [drillDownModal, setDrillDownModal] = useState<{
    tipo: "fase" | "faccao" | "bairro" | "tatuagem" | null;
    dados: any;
  }>({ tipo: null, dados: null });

  // Buscar casas e fases para os filtros
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [casasRes, fasesRes] = await Promise.all([
          fetch("/api/casas"),
          fetch("/api/fases-internacao"),
        ]);

        if (casasRes.ok) {
          const casasData = await casasRes.json();
          // A API retorna { casas: [...] }
          setCasas(casasData.casas || casasData);
        }

        if (fasesRes.ok) {
          const fasesData = await fasesRes.json();
          setFases(fasesData);
        }
      } catch (error) {
        console.error("Erro ao carregar filtros:", error);
      }
    };

    fetchFilters();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErro(null);

      const params = new URLSearchParams();
      if (periodo) params.append("periodo", periodo);
      if (casaSelecionada) params.append("casaId", casaSelecionada);
      if (faseSelecionada) params.append("faseId", faseSelecionada);

      const [analyticsRes, temporalRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch(`/api/analytics/temporal?${params.toString()}`),
      ]);

      if (!analyticsRes.ok || !temporalRes.ok) {
        throw new Error("Erro ao carregar dados");
      }

      const [analyticsData, temporalData] = await Promise.all([
        analyticsRes.json(),
        temporalRes.json(),
      ]);

      setData(analyticsData);
      setTemporalData(temporalData);
      setUltimaAtualizacao(new Date());
    } catch (error) {
      console.error("Erro ao carregar analytics:", error);
      setErro(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periodo, casaSelecionada, faseSelecionada]);

  const exportarPDF = () => {
    if (!data || !temporalData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const now = new Date();

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Dashboard Analytics", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Sistema CENSE Maringá", pageWidth / 2, 28, { align: "center" });

    doc.setFontSize(9);
    doc.text(`Gerado em: ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}`, pageWidth / 2, 34, { align: "center" });

    // Resumo Geral
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Geral", 14, 45);

    autoTable(doc, {
      startY: 50,
      head: [["Métrica", "Valor"]],
      body: [
        ["Total de Adolescentes", data.resumo.totalAdolescentes.toString()],
        ["Total de Conflitos Ativos", data.resumo.totalConflitos.toString()],
        ["Alertas Ativos", data.resumo.alertasAtivos.toString()],
        ["Taxa de Ocupação", `${data.resumo.taxaOcupacao}%`],
        ["Alojamentos Ocupados", data.resumo.alojamentosOcupados.toString()],
        ["Alojamentos Livres", data.resumo.alojamentosLivres.toString()],
      ],
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });

    // Análise Temporal
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Análise Temporal", 14, finalY);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Métrica", "Atual", "Anterior", "Variação", "Tendência"]],
      body: [
        [
          "Cadastros",
          temporalData.comparacao.cadastros.atual.toString(),
          temporalData.comparacao.cadastros.anterior.toString(),
          `${temporalData.comparacao.cadastros.variacao.toFixed(1)}%`,
          temporalData.tendencias.cadastros.direcao,
        ],
        [
          "Conflitos",
          temporalData.comparacao.conflitos.atual.toString(),
          temporalData.comparacao.conflitos.anterior.toString(),
          `${temporalData.comparacao.conflitos.variacao.toFixed(1)}%`,
          temporalData.tendencias.conflitos.direcao,
        ],
        [
          "Alertas",
          temporalData.comparacao.alertas.atual.toString(),
          temporalData.comparacao.alertas.anterior.toString(),
          `${temporalData.comparacao.alertas.variacao.toFixed(1)}%`,
          temporalData.tendencias.alertas.direcao,
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });

    // Distribuição por Fase
    finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Distribuição por Fase de Internação", 14, finalY);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Fase", "Total", "Percentual"]],
      body: data.distribuicoes.porFase.map((item) => [
        item.fase,
        item.total.toString(),
        `${((item.total / data.resumo.totalAdolescentes) * 100).toFixed(1)}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [139, 92, 246] },
    });

    // Distribuição por Facção
    if (data.distribuicoes.porFaccao.length > 0) {
      finalY = (doc as any).lastAutoTable.finalY + 10;
      if (finalY > 250) {
        doc.addPage();
        finalY = 20;
      }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Distribuição por Facção", 14, finalY);

      autoTable(doc, {
        startY: finalY + 5,
        head: [["Facção", "Total"]],
        body: data.distribuicoes.porFaccao.map((item) => [
          item.faccao,
          item.total.toString(),
        ]),
        theme: "grid",
        headStyles: { fillColor: [220, 38, 38] },
      });
    }

    // Top 10 Tatuagens
    finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY > 240) {
      doc.addPage();
      finalY = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Top 10 Tatuagens Mais Comuns", 14, finalY);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Tatuagem", "Ocorrências", "Nível de Risco"]],
      body: data.tatuagens.top10.slice(0, 10).map((item) => [
        item.nome,
        item.total.toString(),
        item.nivelRisco || "Não classificado",
      ]),
      theme: "grid",
      headStyles: { fillColor: [20, 184, 166] },
    });

    // Ocupação por Casa
    if (data.ocupacao.porCasa.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Ocupação por Casa", 14, 20);

      autoTable(doc, {
        startY: 25,
        head: [["Casa", "Total", "Ocupados", "Livres", "Taxa"]],
        body: data.ocupacao.porCasa.map((item) => [
          item.casa,
          item.total.toString(),
          item.ocupados.toString(),
          item.livres.toString(),
          `${item.taxaOcupacao}%`,
        ]),
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    // Rodapé em todas as páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Página ${i} de ${pageCount} | CENSE Maringá - Dashboard Analytics`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    // Salvar PDF
    doc.save(`analytics_cense_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const renderTendenciaIcon = (direcao: string) => {
    switch (direcao) {
      case "CRESCENTE":
        return <TrendingUp className="text-green-600" size={20} />;
      case "DECRESCENTE":
        return <TrendingDown className="text-red-600" size={20} />;
      default:
        return <Minus className="text-gray-600" size={20} />;
    }
  };

  const renderVariacao = (variacao: number) => {
    const isPositive = variacao > 0;
    const Icon = isPositive ? ChevronUp : variacao < 0 ? ChevronDown : Minus;
    const colorClass = isPositive
      ? "text-green-600 bg-green-100"
      : variacao < 0
      ? "text-red-600 bg-red-100"
      : "text-gray-600 bg-gray-100";

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}
      >
        <Icon size={14} />
        {Math.abs(variacao).toFixed(1)}%
      </span>
    );
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">Erro ao Carregar Dados</h2>
            <p className="text-red-700 mb-4">{erro}</p>
            <button
              onClick={fetchData}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !temporalData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-8 h-8 text-indigo-600" />
                <h1 className="text-3xl font-bold text-slate-800">
                  Dashboard Analytics Avançado
                </h1>
              </div>
              <p className="text-slate-600">
                Análise temporal completa com gráficos interativos e tendências
              </p>
              {ultimaAtualizacao && (
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                  <Clock size={14} />
                  Última atualização: {ultimaAtualizacao.toLocaleTimeString("pt-BR")}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Filter size={18} />
                Filtros
              </button>
              <button
                onClick={exportarPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FileDown size={18} />
                Exportar PDF
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                {loading ? "Atualizando..." : "Atualizar"}
              </button>
            </div>
          </div>
        </div>

        {/* Badges de Filtros Ativos */}
        {(casaSelecionada || faseSelecionada || periodo !== "30") && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-indigo-900">Filtros ativos:</span>

              {periodo !== "30" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium border border-indigo-300">
                  <Clock size={14} />
                  {periodo} dias
                  <button
                    onClick={() => setPeriodo("30")}
                    className="ml-1 hover:bg-indigo-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {casaSelecionada && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium border border-purple-300">
                  <Home size={14} />
                  {casas.find((c) => c.id === casaSelecionada)?.nome ||
                   `Casa ${casas.find((c) => c.id === casaSelecionada)?.numero}`}
                  <button
                    onClick={() => setCasaSelecionada("")}
                    className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {faseSelecionada && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium border border-teal-300">
                  <Activity size={14} />
                  {fases.find((f) => f.id === faseSelecionada)?.nomeFase}
                  <button
                    onClick={() => setFaseSelecionada("")}
                    className="ml-1 hover:bg-teal-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              <button
                onClick={() => {
                  setPeriodo("30");
                  setCasaSelecionada("");
                  setFaseSelecionada("");
                }}
                className="ml-auto text-sm text-indigo-700 hover:text-indigo-900 font-medium flex items-center gap-1"
              >
                <X size={16} />
                Limpar todos
              </button>
            </div>
          </div>
        )}

        {/* Painel de Filtros */}
        {mostrarFiltros && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Filter className="text-purple-600" size={20} />
                Filtros Avançados
              </h3>
              <button
                onClick={() => {
                  setPeriodo("30");
                  setCasaSelecionada("");
                  setFaseSelecionada("");
                }}
                className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <X size={16} />
                Limpar Filtros
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Período de Análise
                </label>
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="7">Últimos 7 dias</option>
                  <option value="15">Últimos 15 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="60">Últimos 60 dias</option>
                  <option value="90">Últimos 90 dias</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Filtrar por Casa
                </label>
                <select
                  value={casaSelecionada}
                  onChange={(e) => setCasaSelecionada(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Todas as casas</option>
                  {casas.map((casa) => (
                    <option key={casa.id} value={casa.id}>
                      {casa.nome || `Casa ${String(casa.numero).padStart(2, "0")}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Filtrar por Fase
                </label>
                <select
                  value={faseSelecionada}
                  onChange={(e) => setFaseSelecionada(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Todas as fases</option>
                  {fases.map((fase) => (
                    <option key={fase.id} value={fase.id}>
                      {fase.nomeFase}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Cards de Resumo com Comparação */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-indigo-500">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-indigo-600" size={32} />
              {renderTendenciaIcon(temporalData.tendencias.cadastros.direcao)}
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Adolescentes</h3>
            <p className="text-4xl font-bold text-slate-900 mb-2">
              {data.resumo.totalAdolescentes}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {temporalData.comparacao.cadastros.atual} no período
              </p>
              {renderVariacao(temporalData.comparacao.cadastros.variacao)}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <Swords className="text-red-600" size={32} />
              {renderTendenciaIcon(temporalData.tendencias.conflitos.direcao)}
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Conflitos</h3>
            <p className="text-4xl font-bold text-slate-900 mb-2">{data.resumo.totalConflitos}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {temporalData.comparacao.conflitos.atual} no período
              </p>
              {renderVariacao(temporalData.comparacao.conflitos.variacao)}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="text-orange-600" size={32} />
              {renderTendenciaIcon(temporalData.tendencias.alertas.direcao)}
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Alertas Ativos</h3>
            <p className="text-4xl font-bold text-slate-900 mb-2">{data.resumo.alertasAtivos}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {temporalData.comparacao.alertas.atual} no período
              </p>
              {renderVariacao(temporalData.comparacao.alertas.variacao)}
            </div>
          </div>
        </div>

        {/* Gráficos de Linha - Evolução Temporal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Evolução de Cadastros */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="text-indigo-600" size={20} />
              Evolução de Cadastros
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={temporalData.evolucao.cadastrosPorDia}>
                <defs>
                  <linearGradient id="colorCadastros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("pt-BR");
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCadastros)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Evolução de Conflitos */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <Swords className="text-red-600" size={20} />
              Evolução de Conflitos
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temporalData.evolucao.conflitosPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("pt-BR");
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={COLORS.danger}
                  strokeWidth={3}
                  dot={{ fill: COLORS.danger, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráficos de Pizza e Barras */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Distribuição por Fase - Pizza */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <PieChart className="text-purple-600" size={20} />
              Distribuição por Fase
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              Clique em uma fatia para ver detalhes
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={data.distribuicoes.porFase}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ fase, percent }) => `${fase}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="total"
                  onClick={(entry) => setDrillDownModal({ tipo: "fase", dados: entry })}
                  style={{ cursor: "pointer" }}
                >
                  {data.distribuicoes.porFase.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>

          {/* Top 10 Tatuagens - Barras Horizontais */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <Shield className="text-teal-600" size={20} />
              Top 10 Tatuagens
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              Clique em uma barra para ver detalhes
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.tatuagens.top10.slice(0, 8)}
                layout="vertical"
                margin={{ left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="nome"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={75}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="total"
                  fill={COLORS.teal}
                  radius={[0, 8, 8, 0]}
                  onClick={(entry) => setDrillDownModal({ tipo: "tatuagem", dados: entry })}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela de Ocupação */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 mb-8">
          <h3 className="font-bold text-slate-800 text-xl mb-6 flex items-center gap-2">
            <Home className="text-blue-600" size={24} />
            Ocupação por Casa
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Casa
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">
                    Ocupados
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">
                    Livres
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">
                    Taxa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Ocupação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.ocupacao.porCasa.map((casa, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{casa.casa}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{casa.total}</td>
                    <td className="px-4 py-3 text-center text-green-700 font-semibold">
                      {casa.ocupados}
                    </td>
                    <td className="px-4 py-3 text-center text-blue-700 font-semibold">
                      {casa.livres}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">
                      {casa.taxaOcupacao}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-slate-200 rounded-full h-4">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full flex items-center justify-center text-xs font-semibold text-white"
                          style={{ width: `${casa.taxaOcupacao}%` }}
                        >
                          {parseFloat(casa.taxaOcupacao) > 20 && `${casa.taxaOcupacao}%`}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Drill-Down */}
        {drillDownModal.tipo && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDrillDownModal({ tipo: null, dados: null })}
          >
            <div
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {drillDownModal.tipo === "fase" && <Activity size={24} />}
                    {drillDownModal.tipo === "tatuagem" && <Shield size={24} />}
                    <h3 className="text-2xl font-bold">
                      {drillDownModal.tipo === "fase" && "Detalhes da Fase"}
                      {drillDownModal.tipo === "tatuagem" && "Detalhes da Tatuagem"}
                    </h3>
                  </div>
                  <button
                    onClick={() => setDrillDownModal({ tipo: null, dados: null })}
                    className="hover:bg-white/20 rounded-full p-2 transition"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {drillDownModal.tipo === "fase" && (
                  <div className="space-y-4">
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 rounded-lg p-4">
                      <h4 className="font-bold text-indigo-900 text-lg mb-2">
                        {drillDownModal.dados.fase}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-indigo-700 font-semibold">Total de Adolescentes</p>
                          <p className="text-3xl font-bold text-indigo-900">
                            {drillDownModal.dados.total}
                          </p>
                        </div>
                        <div>
                          <p className="text-indigo-700 font-semibold">Percentual</p>
                          <p className="text-3xl font-bold text-indigo-900">
                            {((drillDownModal.dados.total / data.resumo.totalAdolescentes) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4">
                      <h5 className="font-semibold text-slate-800 mb-3">Informações Adicionais</h5>
                      <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          Fase de internação importante para o acompanhamento socioeducativo
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          Cada fase possui requisitos específicos de progressão
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          O período em cada fase varia conforme o desempenho individual
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {drillDownModal.tipo === "tatuagem" && (
                  <div className="space-y-4">
                    <div
                      className={`border-l-4 rounded-lg p-4 ${
                        drillDownModal.dados.nivelRisco === "ALTO"
                          ? "bg-red-50 border-red-500"
                          : drillDownModal.dados.nivelRisco === "MEDIO"
                          ? "bg-yellow-50 border-yellow-500"
                          : "bg-green-50 border-green-500"
                      }`}
                    >
                      <h4 className="font-bold text-slate-900 text-lg mb-2">
                        {drillDownModal.dados.nome}
                      </h4>
                      <div className="flex items-center gap-3 mb-3">
                        {drillDownModal.dados.nivelRisco && (
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              drillDownModal.dados.nivelRisco === "ALTO"
                                ? "bg-red-100 text-red-800 border border-red-300"
                                : drillDownModal.dados.nivelRisco === "MEDIO"
                                ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                                : "bg-green-100 text-green-800 border border-green-300"
                            }`}
                          >
                            <AlertTriangle size={12} />
                            Risco: {drillDownModal.dados.nivelRisco}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-700 font-semibold">Total de Ocorrências</p>
                          <p className="text-3xl font-bold text-slate-900">
                            {drillDownModal.dados.total}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-700 font-semibold">Percentual</p>
                          <p className="text-3xl font-bold text-slate-900">
                            {data.resumo.totalAdolescentes > 0
                              ? ((drillDownModal.dados.total / data.resumo.totalAdolescentes) * 100).toFixed(1)
                              : "0"}
                            %
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4">
                      <h5 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <Shield size={16} />
                        Contexto de Segurança
                      </h5>
                      <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                          Tatuagens podem indicar vínculos faccionais ou territoriais
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                          Use estas informações para alocação segura em alojamentos
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                          Sempre considere o contexto individual e auto-declarações
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setDrillDownModal({ tipo: null, dados: null })}
                    className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
