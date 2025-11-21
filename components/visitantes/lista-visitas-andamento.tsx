"use client";

import { useState, useEffect } from "react";
import { Clock, User, AlertCircle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type VisitaAndamento = {
  id: string;
  visitante: {
    id: string;
    nomeCompleto: string;
  };
  adolescente: {
    id: string;
    nomeCompleto: string;
    nomeSocial: string | null;
  };
  dataHoraEntrada: string;
  periodoAutorizado: string;
  periodoRealizado: string;
  alertaHorario: boolean;
  alertaFaccaoRival: boolean;
  alertaLimiteVisitas: boolean;
};

interface ListaVisitasAndamentoProps {
  onVisitaFinalizada?: () => void;
}

export function ListaVisitasAndamento({ onVisitaFinalizada }: ListaVisitasAndamentoProps) {
  const [visitas, setVisitas] = useState<VisitaAndamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [duracaoMaxima, setDuracaoMaxima] = useState(120); // minutos padrão

  useEffect(() => {
    carregarVisitas();
    carregarConfiguracao();

    // Atualizar a cada 30 segundos
    const intervalo = setInterval(() => {
      carregarVisitas();
    }, 30000);

    return () => clearInterval(intervalo);
  }, []);

  const carregarConfiguracao = async () => {
    try {
      const response = await fetch("/api/configuracoes/visitas");
      if (response.ok) {
        const data = await response.json();
        setDuracaoMaxima(data.duracaoVisitaMinutos || 120);
      }
    } catch (err) {
      console.error("Erro ao carregar configuração:", err);
    }
  };

  const carregarVisitas = async () => {
    try {
      const response = await fetch("/api/visitas?status=ativas&limit=50", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Erro ao carregar visitas");
      }
      const data = await response.json();

      const visitasRecebidas = Array.isArray(data.visitas)
        ? (data.visitas as VisitaAndamento[])
        : [];

      setVisitas(visitasRecebidas);
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar visitas");
    } finally {
      setCarregando(false);
    }
  };

  const calcularTempoDecorrido = (dataEntrada: string) => {
    const entrada = new Date(dataEntrada);
    const agora = new Date();
    const diffMinutos = Math.floor((agora.getTime() - entrada.getTime()) / (1000 * 60));
    return diffMinutos;
  };

  const finalizarVisita = async (visitaId: string, visitanteId: string) => {
    if (!confirm("Deseja finalizar esta visita?")) return;

    try {
      const response = await fetch(`/api/visitantes/${visitanteId}/visitas/${visitaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataHoraSaida: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao finalizar visita");
      }

      await carregarVisitas();
      if (onVisitaFinalizada) {
        onVisitaFinalizada();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao finalizar visita");
    }
  };

  if (carregando) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="text-indigo-600" size={24} />
          <h3 className="text-lg font-bold text-gray-900">Visitas em Andamento</h3>
        </div>
        <p className="text-gray-600 text-sm">Carregando...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="text-indigo-600" size={24} />
          <h3 className="text-lg font-bold text-gray-900">Visitas em Andamento</h3>
        </div>
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          <span>{erro}</span>
        </div>
      </div>
    );
  }

  if (visitas.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="text-indigo-600" size={24} />
          <h3 className="text-lg font-bold text-gray-900">Visitas em Andamento</h3>
        </div>
        <p className="text-gray-500 text-sm">Nenhuma visita em andamento no momento</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="text-indigo-600" size={24} />
        <h3 className="text-lg font-bold text-gray-900">
          Visitas em Andamento <span className="text-indigo-600">({visitas.length})</span>
        </h3>
      </div>

      <div className="space-y-3">
        {visitas.map((visita) => {
          const tempoDecorrido = calcularTempoDecorrido(visita.dataHoraEntrada);
          const percentualTempo = (tempoDecorrido / duracaoMaxima) * 100;
          const proximo90Porcento = percentualTempo >= 90;
          const temAlerta = visita.alertaHorario || visita.alertaFaccaoRival || visita.alertaLimiteVisitas;

          return (
            <div
              key={visita.id}
              className={`p-4 border-2 rounded-lg transition-all ${
                proximo90Porcento
                  ? "border-red-300 bg-red-50"
                  : temAlerta
                  ? "border-amber-300 bg-amber-50"
                  : "border-indigo-200 bg-indigo-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={16} className="text-gray-600 flex-shrink-0" />
                    <p className="font-semibold text-gray-900 truncate">
                      {visita.visitante.nomeCompleto}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 ml-6 mb-2">
                    Visitando: <span className="font-medium">{visita.adolescente.nomeSocial || visita.adolescente.nomeCompleto}</span>
                  </p>
                  <div className="ml-6 space-y-1">
                    <p className="text-xs text-gray-600">
                      Entrada: {formatDistanceToNow(new Date(visita.dataHoraEntrada), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            proximo90Porcento ? "bg-red-600" : temAlerta ? "bg-amber-500" : "bg-indigo-600"
                          }`}
                          style={{ width: `${Math.min(percentualTempo, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        proximo90Porcento ? "text-red-700" : "text-gray-700"
                      }`}>
                        {tempoDecorrido} / {duracaoMaxima} min
                      </span>
                    </div>
                  </div>
                  {temAlerta && (
                    <div className="ml-6 mt-2 flex items-center gap-1 text-xs text-amber-700">
                      <AlertCircle size={12} />
                      <span>Visita com alertas</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => finalizarVisita(visita.id, visita.visitante.id)}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors flex-shrink-0"
                  title="Finalizar visita"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
