"use client";

import { useState, useEffect } from "react";
import { Users, Clock, AlertTriangle, Home, User, RefreshCw } from "lucide-react";

type VisitaAtiva = {
  id: string;
  dataHoraEntrada: string;
  periodoAutorizado: string;
  visitante: {
    id: string;
    nomeCompleto: string;
    cpf: string | null;
    fotoUrl: string | null;
    telefones: string[];
  };
  adolescente: {
    id: string;
    nomeCompleto: string;
    casa: {
      numero: number;
      nome: string;
    } | null;
    alojamento: number | null;
  };
  totalAcompanhantes: number;
  quantidadeAdultos: number;
  quantidadeCriancas: number;
  tempoDecorrido: {
    horas: number;
    minutos: number;
    total: string;
    percentual: number;
    alertaProximoLimite: boolean;
    alertaExcedido: boolean;
  };
  observacoes: string | null;
};

export function ListaVisitasAtivas() {
  const [visitas, setVisitas] = useState<VisitaAtiva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarVisitas = async () => {
    try {
      const response = await fetch("/api/visitas/em-andamento");
      if (response.ok) {
        const data = await response.json();
        setVisitas(data.visitas || []);
        setErro(null);
      } else {
        setErro("Erro ao carregar visitas");
      }
    } catch (error) {
      console.error("Erro ao carregar visitas:", error);
      setErro("Erro ao carregar visitas");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarVisitas();

    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      carregarVisitas();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatarHoraEntrada = (dataHora: string) => {
    return new Date(dataHora).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCorStatusTempo = (visita: VisitaAtiva) => {
    if (visita.tempoDecorrido.alertaExcedido) {
      return "bg-red-50 border-red-300";
    }
    if (visita.tempoDecorrido.alertaProximoLimite) {
      return "bg-yellow-50 border-yellow-300";
    }
    return "bg-white border-gray-200";
  };

  const getIconeStatusTempo = (visita: VisitaAtiva) => {
    if (visita.tempoDecorrido.alertaExcedido) {
      return <AlertTriangle className="text-red-600" size={20} />;
    }
    if (visita.tempoDecorrido.alertaProximoLimite) {
      return <AlertTriangle className="text-yellow-600" size={20} />;
    }
    return <Clock className="text-green-600" size={20} />;
  };

  if (carregando) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="animate-spin text-indigo-600 mr-3" size={24} />
          <p className="text-gray-600">Carregando visitas...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-700 font-medium">{erro}</p>
        <button
          onClick={carregarVisitas}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} />
          <h2 className="text-xl font-bold">Visitas de Hoje</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-white bg-opacity-20 px-4 py-2 rounded-lg font-bold">
            {visitas.length} {visitas.length === 1 ? "visita" : "visitas"}
          </span>
          <button
            onClick={carregarVisitas}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="p-6">
        {visitas.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-300 mb-4" size={64} />
            <p className="text-gray-500 text-lg">Nenhuma visita registrada hoje</p>
            <p className="text-gray-400 text-sm mt-2">
              As visitas de hoje aparecerão aqui automaticamente
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visitas.map((visita) => (
              <div
                key={visita.id}
                className={`border-2 rounded-xl p-4 transition-all ${getCorStatusTempo(visita)}`}
              >
                <div className="flex items-start gap-4">
                  {/* Foto do Visitante */}
                  {visita.visitante.fotoUrl ? (
                    <img
                      src={visita.visitante.fotoUrl}
                      alt={visita.visitante.nomeCompleto}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="text-gray-400" size={32} />
                    </div>
                  )}

                  {/* Informações */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          {visita.visitante.nomeCompleto}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Visitando: <strong>{visita.adolescente.nomeCompleto}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getIconeStatusTempo(visita)}
                        <span className="font-mono font-bold text-gray-900">
                          {visita.tempoDecorrido.total}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock size={16} />
                        <span>Entrada: {formatarHoraEntrada(visita.dataHoraEntrada)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Home size={16} />
                        <span>
                          {visita.adolescente.casa
                            ? `Casa ${visita.adolescente.casa.numero}`
                            : "Casa não definida"}
                        </span>
                      </div>
                      <div className="text-gray-700">
                        <span className="font-medium">Período:</span> {visita.periodoAutorizado}
                      </div>
                      {visita.totalAcompanhantes > 0 && (
                        <div className="text-gray-700">
                          <span className="font-medium">Acompanhantes:</span>{" "}
                          {visita.totalAcompanhantes}
                        </div>
                      )}
                    </div>

                    {/* Detalhes de Acompanhantes */}
                    {visita.totalAcompanhantes > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-2">
                        <p className="text-sm text-gray-700">
                          <strong>Adultos:</strong> {visita.quantidadeAdultos} |{" "}
                          <strong>Crianças:</strong> {visita.quantidadeCriancas}
                        </p>
                      </div>
                    )}

                    {/* Observações */}
                    {visita.observacoes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Obs:</strong> {visita.observacoes}
                        </p>
                      </div>
                    )}

                    {/* Barra de Progresso */}
                    <div className="mt-3">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            visita.tempoDecorrido.alertaExcedido
                              ? "bg-red-500"
                              : visita.tempoDecorrido.alertaProximoLimite
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(visita.tempoDecorrido.percentual, 100)}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {visita.tempoDecorrido.percentual}% do tempo autorizado
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
