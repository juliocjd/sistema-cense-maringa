"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Send,
  Search,
  Filter,
} from "lucide-react";

type NotificacaoVisitante = {
  id: string;
  tipoNotificacao: string;
  assunto: string;
  mensagem: string;
  emailDestinatario: string;
  statusEnvio: "PENDENTE" | "ENVIADO" | "FALHA" | "ERRO";
  dataEnvio: string | null;
  erroEnvio: string | null;
  criadoEm: string;
  visitante: {
    id: string;
    nomeCompleto: string;
  };
};

export function PainelNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<NotificacaoVisitante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");
  const [busca, setBusca] = useState("");

  const carregarNotificacoes = async () => {
    try {
      const response = await fetch("/api/email/notificacoes");
      if (response.ok) {
        const data = await response.json();
        setNotificacoes(data.notificacoes || []);
        setErro(null);
      } else {
        setErro("Erro ao carregar notificações");
      }
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      setErro("Erro ao carregar notificações");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarNotificacoes();

    // Auto-refresh a cada 30 segundos
    const interval = setInterval(carregarNotificacoes, 30000);
    return () => clearInterval(interval);
  }, []);

  const reenviarNotificacao = async (id: string) => {
    try {
      const response = await fetch("/api/email/reenviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificacaoId: id }),
      });

      if (response.ok) {
        await carregarNotificacoes();
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao reenviar notificação");
      }
    } catch (error) {
      console.error("Erro ao reenviar:", error);
      alert("Erro ao reenviar notificação");
    }
  };

  const getIconeStatus = (status: string) => {
    switch (status) {
      case "ENVIADO":
        return <CheckCircle className="text-green-600" size={20} />;
      case "PENDENTE":
        return <Clock className="text-yellow-600" size={20} />;
      case "FALHA":
        return <AlertTriangle className="text-orange-600" size={20} />;
      case "ERRO":
        return <XCircle className="text-red-600" size={20} />;
      default:
        return <Mail className="text-gray-600" size={20} />;
    }
  };

  const getCorStatus = (status: string) => {
    switch (status) {
      case "ENVIADO":
        return "bg-green-50 border-green-300";
      case "PENDENTE":
        return "bg-yellow-50 border-yellow-300";
      case "FALHA":
        return "bg-orange-50 border-orange-300";
      case "ERRO":
        return "bg-red-50 border-red-300";
      default:
        return "bg-white border-gray-200";
    }
  };

  const notificacoesFiltradas = notificacoes.filter((n) => {
    const matchStatus =
      filtroStatus === "TODOS" || n.statusEnvio === filtroStatus;
    const matchBusca =
      busca === "" ||
      n.visitante.nomeCompleto.toLowerCase().includes(busca.toLowerCase()) ||
      n.emailDestinatario.toLowerCase().includes(busca.toLowerCase()) ||
      n.assunto.toLowerCase().includes(busca.toLowerCase());

    return matchStatus && matchBusca;
  });

  const estatisticas = {
    total: notificacoes.length,
    enviadas: notificacoes.filter((n) => n.statusEnvio === "ENVIADO").length,
    pendentes: notificacoes.filter((n) => n.statusEnvio === "PENDENTE").length,
    falhas:
      notificacoes.filter((n) => n.statusEnvio === "FALHA").length +
      notificacoes.filter((n) => n.statusEnvio === "ERRO").length,
  };

  if (carregando) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="animate-spin text-indigo-600 mr-3" size={24} />
          <p className="text-gray-600">Carregando notificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              Histórico de Notificações
            </h2>
            <p className="text-indigo-100">
              Acompanhe o status de envio dos emails
            </p>
          </div>
          <button
            onClick={carregarNotificacoes}
            className="p-3 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={24} />
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="text-indigo-100 text-sm mb-1">Total</p>
            <p className="text-3xl font-bold">{estatisticas.total}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="text-indigo-100 text-sm mb-1">Enviadas</p>
            <p className="text-3xl font-bold">{estatisticas.enviadas}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="text-indigo-100 text-sm mb-1">Pendentes</p>
            <p className="text-3xl font-bold">{estatisticas.pendentes}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="text-indigo-100 text-sm mb-1">Falhas</p>
            <p className="text-3xl font-bold">{estatisticas.falhas}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por visitante, email ou assunto..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
            >
              <option value="TODOS">Todos os status</option>
              <option value="ENVIADO">Enviadas</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="FALHA">Falhas</option>
              <option value="ERRO">Erros</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Notificações */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-medium">{erro}</p>
          <button
            onClick={carregarNotificacoes}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {notificacoesFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Mail className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-500 text-lg">Nenhuma notificação encontrada</p>
          {busca || filtroStatus !== "TODOS" ? (
            <p className="text-gray-400 text-sm mt-2">
              Tente ajustar os filtros de busca
            </p>
          ) : (
            <p className="text-gray-400 text-sm mt-2">
              As notificações enviadas aparecerão aqui
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {notificacoesFiltradas.map((notificacao) => (
            <div
              key={notificacao.id}
              className={`border-2 rounded-xl p-5 transition-all ${getCorStatus(
                notificacao.statusEnvio
              )}`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-lg">
                  {getIconeStatus(notificacao.statusEnvio)}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {notificacao.visitante.nomeCompleto}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {notificacao.emailDestinatario}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        notificacao.statusEnvio === "ENVIADO"
                          ? "bg-green-100 text-green-700"
                          : notificacao.statusEnvio === "PENDENTE"
                          ? "bg-yellow-100 text-yellow-700"
                          : notificacao.statusEnvio === "FALHA"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {notificacao.statusEnvio}
                    </span>
                  </div>

                  <div className="bg-white bg-opacity-50 rounded-lg p-3 mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {notificacao.assunto}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notificacao.mensagem}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>
                        Tipo: <strong>{notificacao.tipoNotificacao}</strong>
                      </span>
                      <span>
                        Criado em:{" "}
                        {new Date(notificacao.criadoEm).toLocaleString("pt-BR")}
                      </span>
                      {notificacao.dataEnvio && (
                        <span>
                          Enviado em:{" "}
                          {new Date(notificacao.dataEnvio).toLocaleString(
                            "pt-BR"
                          )}
                        </span>
                      )}
                    </div>

                    {(notificacao.statusEnvio === "FALHA" ||
                      notificacao.statusEnvio === "ERRO") && (
                      <button
                        onClick={() => reenviarNotificacao(notificacao.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium"
                      >
                        <Send size={14} />
                        Reenviar
                      </button>
                    )}
                  </div>

                  {notificacao.erroEnvio && (
                    <div className="mt-3 bg-red-100 border border-red-200 rounded-lg p-3">
                      <p className="text-xs text-red-800">
                        <strong>Erro:</strong> {notificacao.erroEnvio}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
