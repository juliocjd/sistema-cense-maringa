"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Calendar,
  Users,
  TrendingUp,
  Home,
  RefreshCw,
  FileDown,
  Table,
} from "lucide-react";

type RelatorioMensal = {
  mes: {
    ano: number;
    mes: number;
    nome: string;
    inicio: string;
    fim: string;
  };
  estatisticas: {
    totalVisitas: number;
    totalPessoas: number;
    visitantesUnicos: number;
    adolescentesVisitados: number;
    alertas: {
      faccaoRival: number;
      horario: number;
      limiteVisitas: number;
    };
  };
  porPeriodo: {
    MANHA: number;
    TARDE: number;
    ESPECIAL: number;
  };
  porAdolescente: Array<{
    adolescente: {
      nomeCompleto: string;
      nomeSocial: string | null;
    };
    totalVisitas: number;
    visitantes: string[];
  }>;
  porVisitante: Array<{
    visitante: {
      nomeCompleto: string;
      cpf: string | null;
    };
    totalVisitas: number;
    adolescentes: string[];
  }>;
};

export function PainelRelatorioMensal() {
  const [relatorio, setRelatorio] = useState<RelatorioMensal | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    return `${ano}-${mes}`;
  });

  const carregarRelatorio = async () => {
    setCarregando(true);
    try {
      const response = await fetch(
        `/api/visitas/relatorio-mensal?mes=${mesSelecionado}`
      );
      if (response.ok) {
        const data = await response.json();
        setRelatorio(data);
        setErro(null);
      } else {
        setErro("Erro ao carregar relatório");
      }
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      setErro("Erro ao carregar relatório");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarRelatorio();
  }, [mesSelecionado]);

  const baixarPDF = () => {
    window.open(
      `/api/visitas/relatorio-mensal/pdf?mes=${mesSelecionado}`,
      "_blank"
    );
  };

  const baixarExcel = () => {
    window.open(
      `/api/visitas/relatorio-mensal/excel?mes=${mesSelecionado}`,
      "_blank"
    );
  };

  if (carregando) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="animate-spin text-indigo-600 mr-3" size={24} />
          <p className="text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (erro || !relatorio) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-700 font-medium">{erro || "Dados não disponíveis"}</p>
        <button
          onClick={carregarRelatorio}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const topAdolescentes = [...relatorio.porAdolescente]
    .sort((a, b) => b.totalVisitas - a.totalVisitas)
    .slice(0, 5);

  const topVisitantes = [...relatorio.porVisitante]
    .sort((a, b) => b.totalVisitas - a.totalVisitas)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header com seletor de mês */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Relatório Mensal de Visitas</h2>
            <p className="text-indigo-100">{relatorio.mes.nome}</p>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="text-white" size={20} />
            <input
              type="month"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="px-4 py-2 rounded-lg text-gray-900 font-medium"
            />
          </div>
        </div>

        {/* Botões de Exportação */}
        <div className="flex gap-3">
          <button
            onClick={baixarPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium transition-colors"
          >
            <FileDown size={20} />
            Baixar PDF
          </button>
          <button
            onClick={baixarExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 font-medium transition-colors"
          >
            <Table size={20} />
            Baixar Excel
          </button>
          <button
            onClick={carregarRelatorio}
            className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 font-medium transition-colors ml-auto"
          >
            <RefreshCw size={20} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Visitas */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between mb-2">
            <Users className="text-indigo-600" size={32} />
            <span className="text-3xl font-bold text-gray-900">
              {relatorio.estatisticas.totalVisitas}
            </span>
          </div>
          <p className="text-gray-600 font-medium">Total de Visitas</p>
          <p className="text-sm text-gray-500 mt-1">
            {relatorio.estatisticas.totalPessoas} pessoas no total
          </p>
        </div>

        {/* Visitantes Únicos */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <Users className="text-green-600" size={32} />
            <span className="text-3xl font-bold text-gray-900">
              {relatorio.estatisticas.visitantesUnicos}
            </span>
          </div>
          <p className="text-gray-600 font-medium">Visitantes Únicos</p>
          <p className="text-sm text-gray-500 mt-1">
            {relatorio.estatisticas.adolescentesVisitados} adolescentes visitados
          </p>
        </div>

        {/* Adolescentes Visitados */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <Home className="text-purple-600" size={32} />
            <span className="text-3xl font-bold text-gray-900">
              {relatorio.estatisticas.adolescentesVisitados}
            </span>
          </div>
          <p className="text-gray-600 font-medium">Adolescentes Visitados</p>
          <p className="text-sm text-gray-500 mt-1">
            Média:{" "}
            {(
              relatorio.estatisticas.totalVisitas /
              relatorio.estatisticas.adolescentesVisitados
            ).toFixed(1)}{" "}
            visitas/adolescente
          </p>
        </div>

        {/* Total de Alertas */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="text-orange-600" size={32} />
            <span className="text-3xl font-bold text-gray-900">
              {relatorio.estatisticas.alertas.faccaoRival +
                relatorio.estatisticas.alertas.horario +
                relatorio.estatisticas.alertas.limiteVisitas}
            </span>
          </div>
          <p className="text-gray-600 font-medium">Total de Alertas</p>
          <p className="text-sm text-gray-500 mt-1">
            Durante o período
          </p>
        </div>
      </div>

      {/* Visitas por Período */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Distribuição por Período
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Manhã</span>
            <div className="flex items-center gap-3">
              <div className="w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500"
                  style={{
                    width: `${(relatorio.porPeriodo.MANHA / relatorio.estatisticas.totalVisitas) * 100}%`,
                  }}
                ></div>
              </div>
              <span className="font-bold text-gray-900 w-12 text-right">
                {relatorio.porPeriodo.MANHA}
              </span>
              <span className="text-sm text-gray-500 w-16 text-right">
                {((relatorio.porPeriodo.MANHA / relatorio.estatisticas.totalVisitas) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Tarde</span>
            <div className="flex items-center gap-3">
              <div className="w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500"
                  style={{
                    width: `${(relatorio.porPeriodo.TARDE / relatorio.estatisticas.totalVisitas) * 100}%`,
                  }}
                ></div>
              </div>
              <span className="font-bold text-gray-900 w-12 text-right">
                {relatorio.porPeriodo.TARDE}
              </span>
              <span className="text-sm text-gray-500 w-16 text-right">
                {((relatorio.porPeriodo.TARDE / relatorio.estatisticas.totalVisitas) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Especial</span>
            <div className="flex items-center gap-3">
              <div className="w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: `${(relatorio.porPeriodo.ESPECIAL / relatorio.estatisticas.totalVisitas) * 100}%`,
                  }}
                ></div>
              </div>
              <span className="font-bold text-gray-900 w-12 text-right">
                {relatorio.porPeriodo.ESPECIAL}
              </span>
              <span className="text-sm text-gray-500 w-16 text-right">
                {((relatorio.porPeriodo.ESPECIAL / relatorio.estatisticas.totalVisitas) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Adolescentes Mais Visitados */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Adolescentes Mais Visitados
          </h3>
          <div className="space-y-3">
            {topAdolescentes.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-indigo-600 w-8">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.adolescente.nomeCompleto || item.adolescente.nomeSocial}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.visitantes.length} visitante(s) único(s)
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  {item.totalVisitas}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Visitantes Mais Frequentes */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} />
            Visitantes Mais Frequentes
          </h3>
          <div className="space-y-3">
            {topVisitantes.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-green-600 w-8">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.visitante.nomeCompleto}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.adolescentes.length} adolescente(s) visitado(s)
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  {item.totalVisitas}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas */}
      {(relatorio.estatisticas.alertas.faccaoRival > 0 ||
        relatorio.estatisticas.alertas.horario > 0 ||
        relatorio.estatisticas.alertas.limiteVisitas > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-orange-900 mb-4">
            Resumo de Alertas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Facção Rival</p>
              <p className="text-2xl font-bold text-orange-600">
                {relatorio.estatisticas.alertas.faccaoRival}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Horário</p>
              <p className="text-2xl font-bold text-orange-600">
                {relatorio.estatisticas.alertas.horario}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Limite de Visitas</p>
              <p className="text-2xl font-bold text-orange-600">
                {relatorio.estatisticas.alertas.limiteVisitas}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
