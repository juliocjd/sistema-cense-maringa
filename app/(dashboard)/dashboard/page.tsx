"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Building2,
  UserPlus,
  Swords,
  Map,
  Shield,
  BarChart3,
  UsersRound,
  FileText,
  Mail,
  UserCheck,
} from "lucide-react";

type DashboardStats = {
  totalAdolescentes: number;
  totalVagas: number;
  alojamentosOcupados: number;
  ocupacaoPercentual: string;
  conflitosAtivos: number;
  alertasAtivos: number;
  casasComOcupacao: number;
  totalCasas: number;
  alojamentosInterditados: number;
  gruposAtivos: number;
  conflitosPorTipo: Record<string, number>;
  gravidadeAlertas: {
    critico: number;
    alto: number;
    medio: number;
    baixo: number;
    total: number;
  };
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) {
          throw new Error("Erro ao carregar estatísticas");
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-800 font-semibold">Erro ao carregar dashboard</p>
        <p className="text-red-600 text-sm mt-1">{error || "Dados não disponíveis"}</p>
      </div>
    );
  }

  const cards = [
    {
      titulo: "Adolescentes Internados",
      valor: stats.totalAdolescentes,
      subtitulo: `${stats.alojamentosOcupados} de ${stats.totalVagas} vagas ocupadas`,
      icone: Users,
      cor: "blue",
      link: "/adolescentes",
    },
    {
      titulo: "Ocupação",
      valor: `${stats.ocupacaoPercentual}%`,
      subtitulo: `${stats.alojamentosOcupados} alojamentos ocupados`,
      icone: CheckCircle,
      cor: Number(stats.ocupacaoPercentual) > 85 ? "orange" : "green",
      link: "/estrutura",
    },
    {
      titulo: "Alertas Ativos",
      valor: stats.alertasAtivos,
      subtitulo: "Requerem atenção especial",
      icone: AlertTriangle,
      cor: stats.alertasAtivos > 0 ? "orange" : "green",
      link: "/alertas",
    },
    {
      titulo: "Conflitos Ativos",
      valor: stats.conflitosAtivos,
      subtitulo: "Sem resolução",
      icone: Swords,
      cor: stats.conflitosAtivos > 5 ? "red" : stats.conflitosAtivos > 0 ? "orange" : "green",
      link: "/conflitos",
    },
  ];

  const cardsSecundarios = [
    {
      titulo: "Casas em Operação",
      valor: `${stats.casasComOcupacao}/${stats.totalCasas}`,
      icone: Building2,
      link: "/estrutura",
    },
    {
      titulo: "Grupos Ativos",
      valor: stats.gruposAtivos,
      icone: UsersRound,
      link: "/grupos",
    },
    {
      titulo: "Alojamentos Interditados",
      valor: stats.alojamentosInterditados,
      icone: AlertTriangle,
      link: "/estrutura",
    },
  ];

  const acoesRapidas = [
    {
      titulo: "Mapa Operacional",
      descricao: "Visualizar estrutura e gerenciar alocações",
      icone: Map,
      link: "/estrutura",
      cor: "indigo",
    },
    {
      titulo: "Novo Adolescente",
      descricao: "Cadastrar novo adolescente",
      icone: UserPlus,
      link: "/adolescentes/novo",
      cor: "green",
    },
    {
      titulo: "Portaria",
      descricao: "Controle de visitantes e reconhecimento facial",
      icone: UserCheck,
      link: "/portaria",
      cor: "blue",
    },
    {
      titulo: "Gerenciar Conflitos",
      descricao: "Visualizar e mediar conflitos internos",
      icone: Swords,
      link: "/conflitos",
      cor: "red",
    },
    {
      titulo: "Gerenciar Grupos",
      descricao: "Criar e administrar grupos de adolescentes",
      icone: UsersRound,
      link: "/grupos",
      cor: "purple",
    },
    {
      titulo: "Inteligência",
      descricao: "Gerenciar bairros, facções e conflitos externos",
      icone: Shield,
      link: "/inteligencia",
      cor: "blue",
    },
    {
      titulo: "Analytics",
      descricao: "Visualizar métricas e indicadores",
      icone: BarChart3,
      link: "/analytics",
      cor: "orange",
    },
    {
      titulo: "Relatório de Visitas",
      descricao: "Exportar relatórios mensais em PDF/Excel",
      icone: FileText,
      link: "/relatorios",
      cor: "indigo",
    },
    {
      titulo: "Notificações Email",
      descricao: "Gerenciar templates e histórico de emails",
      icone: Mail,
      link: "/configuracoes/email",
      cor: "green",
    },
  ];

  const getCorClasses = (cor: string) => {
    const cores: Record<string, string> = {
      blue: "bg-blue-100 text-blue-600 border-blue-200",
      green: "bg-green-100 text-green-600 border-green-200",
      orange: "bg-orange-100 text-orange-600 border-orange-200",
      red: "bg-red-100 text-red-600 border-red-200",
      indigo: "bg-indigo-100 text-indigo-600 border-indigo-200",
      purple: "bg-purple-100 text-purple-600 border-purple-200",
    };
    return cores[cor] || cores.blue;
  };

  return (
    <div className="space-y-6">

      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {cards.map((card, index) => {
          const Icon = card.icone;
          return (
            <Link
              key={index}
              href={card.link}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-4 md:p-6 border-2 border-gray-100 hover:border-indigo-300 group"
            >
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${getCorClasses(
                    card.cor
                  )}`}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
              </div>
              <h3 className="text-gray-600 text-xs md:text-sm font-semibold mb-1 uppercase tracking-wide">
                {card.titulo}
              </h3>
              <p className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
                {card.valor}
              </p>
              <p className="text-xs text-gray-500">{card.subtitulo}</p>
            </Link>
          );
        })}
      </div>

      {/* Card Gravidade dos Alertas */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl font-bold text-gray-800">Gravidade dos alertas</h3>
          <span className="text-sm text-gray-500">
            Total: {stats.gravidadeAlertas.total}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Critico",
              valor: stats.gravidadeAlertas.critico,
              descricao: "Nivel 5",
              classes: "bg-red-50 border border-red-200 text-red-700",
            },
            {
              label: "Alto",
              valor: stats.gravidadeAlertas.alto,
              descricao: "Nivel 4",
              classes: "bg-orange-50 border border-orange-200 text-orange-700",
            },
            {
              label: "Medio",
              valor: stats.gravidadeAlertas.medio,
              descricao: "Nivel 3",
              classes: "bg-amber-50 border border-amber-200 text-amber-700",
            },
            {
              label: "Monitorar",
              valor: stats.gravidadeAlertas.baixo,
              descricao: "Nivel 2",
              classes: "bg-blue-50 border border-blue-200 text-blue-700",
            },
          ].map((gravidade) => (
            <div
              key={gravidade.label}
              className={`rounded-xl p-3 flex flex-col gap-1 ${gravidade.classes}`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide">
                {gravidade.label}
              </span>
              <span className="text-2xl font-bold">{gravidade.valor}</span>
              <span className="text-xs text-gray-600">{gravidade.descricao}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cards Secundários */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {cardsSecundarios.map((card, index) => {
          const Icon = card.icone;
          return (
            <Link
              key={index}
              href={card.link}
              className="bg-white rounded-xl shadow hover:shadow-md transition-all p-3 md:p-4 border border-gray-200 hover:border-indigo-300 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide truncate">
                    {card.titulo}
                  </p>
                  <p className="text-xl md:text-2xl font-bold text-gray-800">{card.valor}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Conflitos por Tipo */}
      {Object.keys(stats.conflitosPorTipo).length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Swords className="text-red-600 w-5 h-5 md:w-6 md:h-6" />
            Conflitos por Tipo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {Object.entries(stats.conflitosPorTipo).map(([tipo, count]) => (
              <div
                key={tipo}
                className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4"
              >
                <p className="text-xs md:text-sm font-semibold text-red-900 uppercase tracking-wide mb-1">
                  {tipo}
                </p>
                <p className="text-2xl md:text-3xl font-bold text-red-700">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações Rápidas */}
      <div>
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {acoesRapidas.map((acao, index) => {
            const Icon = acao.icone;
            return (
              <Link
                key={index}
                href={acao.link}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 hover:shadow-lg hover:border-indigo-300 transition-all group"
              >
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${getCorClasses(acao.cor)}`}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-sm md:text-base font-bold text-gray-800 mb-1">{acao.titulo}</h3>
                <p className="text-xs md:text-sm text-gray-600">{acao.descricao}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Informação sobre Alojamentos Interditados */}
      {stats.alojamentosInterditados > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 md:p-4">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <AlertTriangle className="text-amber-600 mt-0.5 flex-shrink-0 w-5 h-5" />
            <div className="flex-1">
              <p className="text-sm md:text-base font-semibold text-amber-900">
                {stats.alojamentosInterditados} alojamento(s) interditado(s)
              </p>
              <p className="text-xs md:text-sm text-amber-700 mt-1">
                Há alojamentos fora de operação. Verifique a estrutura para mais detalhes.
              </p>
            </div>
            <Link
              href="/estrutura"
              className="text-amber-700 hover:text-amber-800 text-xs md:text-sm font-semibold whitespace-nowrap self-start"
            >
              Ver estrutura →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
