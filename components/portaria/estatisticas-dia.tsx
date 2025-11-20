"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  Camera,
  QrCode,
  RefreshCw,
  UserCheck,
  Home,
} from "lucide-react";

type Estatisticas = {
  data: string;
  estatisticas: {
    visitas: {
      total: number;
      totalPessoas: number;
    };
    visitantes: {
      unicos: number;
      adolescentesVisitados: number;
    };
    periodos: {
      MANHA: number;
      TARDE: number;
      ESPECIAL: number;
    };
    tempo: {
      mediaPermanenciaMinutos: number;
      mediaPermanenciaFormatada: string;
    };
    identificacao: {
      verificacoesFaciais: number;
      verificacoesSucesso: number;
      taxaSucessoFacial: number;
      qrCodesEscaneados: number;
    };
    grafico: {
      ultimasHoras: Array<{
        hora: string;
        quantidade: number;
      }>;
    };
  };
};

export function EstatisticasDia() {
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarEstatisticas = async () => {
    try {
      const response = await fetch("/api/visitas/estatisticas-dia");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setErro(null);
      } else {
        setErro("Erro ao carregar estatísticas");
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
      setErro("Erro ao carregar estatísticas");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarEstatisticas();

    // Atualizar a cada 1 minuto
    const interval = setInterval(() => {
      carregarEstatisticas();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (carregando) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="animate-spin text-indigo-600 mr-3" size={24} />
          <p className="text-gray-600">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  if (erro || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-700 font-medium">{erro || "Dados não disponíveis"}</p>
        <button
          onClick={carregarEstatisticas}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const { estatisticas } = stats;
  const maxVisitasHora = Math.max(...estatisticas.grafico.ultimasHoras.map((h) => h.quantidade), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Estatísticas de Hoje</h2>
            <p className="text-indigo-100">
              {new Date(stats.data).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={carregarEstatisticas}
            className="p-3 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={24} />
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
              {estatisticas.visitas.total}
            </span>
          </div>
          <p className="text-gray-600 font-medium">Total de Visitas</p>
          <p className="text-sm text-gray-500 mt-1">
            {estatisticas.visitas.totalPessoas} pessoas no total
          </p>
        </div>

        {/* Total de Pessoas */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <Users className="text-green-600" size={32} />
            <span className="text-3xl font-bold text-gray-900">
              {estatisticas.visitas.totalPessoas}
            </span>
          </div>
          <p className="text-gray-600 font-medium">Total de Pessoas</p>
          <p className="text-sm text-gray-500 mt-1">
            Visitantes + Acompanhantes
          </p>
        </div>

        {/* Visitantes Únicos */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <UserCheck className="text-purple-600" size={32} />
            <span className="text-3xl font-bold text-gray-900">
              {estatisticas.visitantes.unicos}
            </span>
          </div>
          <p className="text-gray-600 font-medium">Visitantes Únicos</p>
          <p className="text-sm text-gray-500 mt-1">
            {estatisticas.visitantes.adolescentesVisitados} adolescentes visitados
          </p>
        </div>

        {/* Tempo Médio de Permanência */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-2">
            <Clock className="text-orange-600" size={32} />
            <span className="text-2xl font-bold text-gray-900">
              {estatisticas.tempo.mediaPermanenciaFormatada}
            </span>
          </div>
          <p className="text-gray-600 font-medium">Tempo Médio</p>
          <p className="text-sm text-gray-500 mt-1">Permanência atual</p>
        </div>
      </div>

      {/* Períodos e Identificação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitas por Período */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Home size={20} />
            Visitas por Período
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Manhã</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{
                      width: `${(estatisticas.periodos.MANHA / Math.max(estatisticas.visitas.total, 1)) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="font-bold text-gray-900 w-8 text-right">
                  {estatisticas.periodos.MANHA}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Tarde</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{
                      width: `${(estatisticas.periodos.TARDE / Math.max(estatisticas.visitas.total, 1)) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="font-bold text-gray-900 w-8 text-right">
                  {estatisticas.periodos.TARDE}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Especial</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{
                      width: `${(estatisticas.periodos.ESPECIAL / Math.max(estatisticas.visitas.total, 1)) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="font-bold text-gray-900 w-8 text-right">
                  {estatisticas.periodos.ESPECIAL}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Métodos de Identificação */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle size={20} />
            Métodos de Identificação
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <Camera className="text-indigo-600" size={24} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Reconhecimento Facial</p>
                <p className="text-sm text-gray-600">
                  {estatisticas.identificacao.verificacoesSucesso} de{" "}
                  {estatisticas.identificacao.verificacoesFaciais} verificações
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-indigo-600">
                  {estatisticas.identificacao.taxaSucessoFacial}%
                </p>
                <p className="text-xs text-gray-500">Taxa de sucesso</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <QrCode className="text-purple-600" size={24} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">QR Code</p>
                <p className="text-sm text-gray-600">Escaneamentos realizados</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-600">
                  {estatisticas.identificacao.qrCodesEscaneados}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Visitas por Hora */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Visitas nas Últimas 12 Horas
        </h3>
        <div className="flex items-end justify-between gap-2 h-48">
          {estatisticas.grafico.ultimasHoras.map((hora, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="flex-1 w-full flex items-end justify-center">
                <div
                  className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                  style={{
                    height: `${(hora.quantidade / maxVisitasHora) * 100}%`,
                    minHeight: hora.quantidade > 0 ? "8px" : "0px",
                  }}
                  title={`${hora.hora}: ${hora.quantidade} ${
                    hora.quantidade === 1 ? "visita" : "visitas"
                  }`}
                >
                  {hora.quantidade > 0 && (
                    <div className="text-center">
                      <span className="text-xs font-bold text-white">
                        {hora.quantidade}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-600 font-medium">{hora.hora}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
