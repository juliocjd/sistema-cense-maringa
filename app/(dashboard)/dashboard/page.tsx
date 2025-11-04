"use client";

import Link from "next/link";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Building2,
  FileText,
  UserPlus,
  Swords,
} from "lucide-react";

export default function DashboardPage() {
  // Mock de dados - substituir por dados reais da API
  const stats = {
    totalAdolescentes: 78,
    ocupacao: 65,
    alertasAtivos: 12,
    conflitosAtivos: 8,
    casasComTensao: 3,
  };

  const ocupacaoPercentual = (
    (stats.ocupacao / stats.totalAdolescentes) *
    100
  ).toFixed(1);

  const cards = [
    {
      titulo: "Total de Adolescentes",
      valor: stats.totalAdolescentes,
      subtitulo: "Capacidade total",
      icone: Users,
      cor: "blue",
      link: "/adolescentes",
    },
    {
      titulo: "Ocupação Atual",
      valor: stats.ocupacao,
      subtitulo: `${ocupacaoPercentual}% da capacidade`,
      icone: CheckCircle,
      cor: "green",
      link: "/estrutura",
    },
    {
      titulo: "Alertas Ativos",
      valor: stats.alertasAtivos,
      subtitulo: "Requerem atenção",
      icone: AlertTriangle,
      cor: "orange",
      link: "/alertas",
    },
    {
      titulo: "Conflitos Ativos",
      valor: stats.conflitosAtivos,
      subtitulo: "Sem mediação",
      icone: Swords,
      cor: "red",
      link: "/conflitos",
    },
  ];

  const acoesRapidas = [
    {
      titulo: "Estrutura & Mapa",
      descricao: "Visualizar estrutura e gerenciar alocações",
      icone: Building2,
      link: "/estrutura",
      cor: "indigo",
    },
    {
      titulo: "Novo Cadastro",
      descricao: "Cadastrar novo adolescente",
      icone: UserPlus,
      link: "/adolescentes/novo",
      cor: "green",
    },
    {
      titulo: "Novo CI",
      descricao: "Registrar comunicado interno",
      icone: FileText,
      link: "/comunicados/novo",
      cor: "blue",
    },
    {
      titulo: "Relatórios",
      descricao: "Gerar relatórios e estatísticas",
      icone: TrendingUp,
      link: "/relatorios",
      cor: "purple",
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
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-indigo-600">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Bem-vindo ao Sistema CENSE Maringá
        </h1>
        <p className="text-gray-600">
          Painel de controle e monitoramento em tempo real
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icone;
          return (
            <Link
              key={index}
              href={card.link}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border-2 border-gray-200 hover:border-indigo-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCorClasses(
                    card.cor
                  )}`}
                >
                  <Icon size={24} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-semibold mb-1">
                {card.titulo}
              </h3>
              <p className="text-3xl font-bold text-gray-800 mb-1">
                {card.valor}
              </p>
              <p className="text-xs text-gray-500">{card.subtitulo}</p>
            </Link>
          );
        })}
      </div>

      {/* Ações Rápidas */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {acoesRapidas.map((acao, index) => {
            const Icon = acao.icone;
            return (
              <Link
                key={index}
                href={acao.link}
                className={`${getCorClasses(
                  acao.cor
                )} border-2 rounded-xl p-6 hover:shadow-lg transition-all group`}
              >
                <Icon
                  size={32}
                  className="mb-3 group-hover:scale-110 transition-transform"
                />
                <h3 className="font-bold text-gray-800 mb-1">{acao.titulo}</h3>
                <p className="text-sm text-gray-600">{acao.descricao}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Alertas Recentes */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="text-orange-600" size={24} />
          Alertas Recentes
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
            <AlertTriangle
              size={20}
              className="text-orange-600 mt-0.5 flex-shrink-0"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-800">
                Conflito detectado - Casa 02
              </p>
              <p className="text-sm text-gray-600">
                Adolescentes em alojamentos frontais com facções rivais
              </p>
              <p className="text-xs text-gray-500 mt-1">Há 2 horas</p>
            </div>
            <button className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold">
              Ver detalhes
            </button>
          </div>

          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <AlertTriangle
              size={20}
              className="text-red-600 mt-0.5 flex-shrink-0"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-800">
                Risco de suicídio - Alojamento 305
              </p>
              <p className="text-sm text-gray-600">
                Adolescente com alerta de risco sem supervisão reforçada
              </p>
              <p className="text-xs text-gray-500 mt-1">Há 4 horas</p>
            </div>
            <button className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold">
              Ver detalhes
            </button>
          </div>

          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <AlertTriangle
              size={20}
              className="text-yellow-600 mt-0.5 flex-shrink-0"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-800">
                Casa 06 - Score de tensão elevado
              </p>
              <p className="text-sm text-gray-600">
                Múltiplos conflitos ativos entre membros da casa
              </p>
              <p className="text-xs text-gray-500 mt-1">Ontem</p>
            </div>
            <button className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold">
              Ver detalhes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
