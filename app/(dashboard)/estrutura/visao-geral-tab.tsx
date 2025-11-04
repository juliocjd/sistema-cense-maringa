"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Home,
  Bed,
  AlertCircle,
  User,
  Loader2,
  AlertTriangle,
  Lock,
  Activity,
  X
} from "lucide-react";
import { InicializarEstruturaButton } from "./inicializar-button";
import { ModalAlocacao } from "@/components/mapa/modal-alocacao";
import { useAuth } from "@/hooks/useAuth";

type VisaoGeralTabProps = {
  casas: any[];
  totalAlojamentos: number;
};

type Adolescente = {
  id: string;
  nomeCompleto: string;
  numeroSms: string;
  fotoUrl: string | null;
  alojamentoAtualId: string | null;
  statusUnidade: "ATIVO" | "TRANSFERIDO" | "LIBERADO" | "EVADIDO";
  alertaRiscoSuicidio: boolean;
  alertaPerfilMapeado: boolean;
  alertaSaudeConfidencial: boolean;
  conflitosA: any[];
  conflitosB: any[];
};

export function VisaoGeralTab({ casas: casasIniciais, totalAlojamentos }: VisaoGeralTabProps) {
  const { user } = useAuth();
  const [casas, setCasas] = useState(casasIniciais);
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [alojamentoSelecionado, setAlojamentoSelecionado] = useState<any>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalCasas = casas.length;

  // Carregar adolescentes e ocupação atualizada
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar adolescentes com conflitos primeiro
      const adolescentesResponse = await fetch("/api/adolescentes");
      let adolescentesData: Adolescente[] = [];

      if (adolescentesResponse.ok) {
        adolescentesData = await adolescentesResponse.json();
        setAdolescentes(adolescentesData);
      }

      // Carregar ocupação atualizada das casas
      const casasResponse = await fetch("/api/casas/status");
      if (casasResponse.ok) {
        const casasData = await casasResponse.json();

        // Transformar para formato compatível com lógica de cores
        const casasFormatadas = casasData.casas.map((casa: any) => ({
          ...casa,
          alojamentos: casa.alojamentos.map((aloj: any) => {
            // Se tem ocupante, buscar dados completos do adolescente (com conflitos!)
            let adolescenteCompleto = null;
            if (aloj.ocupante) {
              adolescenteCompleto = adolescentesData.find(
                (a: Adolescente) => a.id === aloj.ocupante.id
              );
            }

            return {
              id: aloj.id,
              numeroAlojamento: aloj.numero,
              statusManutencao: aloj.status_manutencao,
              ala: aloj.ala,
              alojamentoFrontalId: aloj.alojamento_frontal_id,
              casaId: casa.id,
              corRisco: aloj.cor_risco,
              nivelRisco: aloj.nivel_risco,
              alertas: aloj.alertas || [],
              icones: aloj.icones || [],
              // Sempre usar os dados completos do adolescente se existir
              ocupante: adolescenteCompleto,
              adolescentes: adolescenteCompleto ? [adolescenteCompleto] : [],
            };
          }),
        }));

        setCasas(casasFormatadas);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== FUN��O DE COR ALINHADA AO BACKEND ====================
  function getCorAlojamento(alojamento: any) {
    const corRisco: string | undefined = alojamento.corRisco;

    if (alojamento.statusManutencao === "INTERDITADO" || corRisco === "interditado") {
      return "bg-gray-400 border-gray-600 text-gray-800";
    }

    switch (corRisco) {
      case "perigo":
        return "bg-red-100 border-red-400 shadow-lg shadow-red-200 text-red-800";
      case "atencao":
        return "bg-yellow-100 border-yellow-400 shadow-lg shadow-yellow-200 text-yellow-800";
      case "seguro":
        return "bg-green-100 border-green-400 shadow-lg shadow-green-200 text-green-800";
      case "livre":
        return "bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-700";
      default: {
        const ocupante = alojamento.adolescentes?.[0] || alojamento.ocupante;
        if (!ocupante) {
          return "bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-700";
        }
        return "bg-green-100 border-green-400 shadow-lg shadow-green-200 text-green-800";
      }
    }
  }

// ==================== ÍCONES DE ALERTA (MESMOS DO MAPA) ====================
  function getIconesAlerta(alojamento: any) {
    const ocupante = alojamento.adolescentes?.[0] || alojamento.ocupante;
    if (!ocupante) return null;

    return (
      <div className="absolute -top-1 -right-1 flex gap-0.5 z-10">
        {ocupante.alertaRiscoSuicidio && (
          <div
            className="bg-orange-500 rounded-full p-0.5"
            title="Risco de Suicídio"
          >
            <AlertTriangle size={10} className="text-white" />
          </div>
        )}
        {ocupante.alertaPerfilMapeado && (
          <div
            className="bg-purple-500 rounded-full p-0.5"
            title="Perfil Mapeado"
          >
            <Lock size={10} className="text-white" />
          </div>
        )}
        {ocupante.alertaSaudeConfidencial && (
          <div
            className="bg-blue-500 rounded-full p-0.5"
            title="Alerta de Saúde"
          >
            <Activity size={10} className="text-white" />
          </div>
        )}
      </div>
    );
  }

  // ==================== HANDLERS ====================
  const handleCliqueAlojamento = (casa: any, aloj: any) => {
    // Se estiver interditado, não faz nada
    if (aloj.statusManutencao === "INTERDITADO") {
      alert("Este alojamento está interditado e não pode receber alocações.");
      return;
    }

    const ocupante = aloj.adolescentes?.[0] || aloj.ocupante;

    // Se já tem ocupante, mostrar opções
    if (ocupante) {
      const confirmar = confirm(
        `Alojamento ocupado por:\n${ocupante.nomeCompleto || ocupante.nome_completo}\nSMS: ${ocupante.numeroSms || ocupante.numero_sms}\n\nDeseja REMOVER este adolescente do alojamento?`
      );

      if (confirmar) {
        handleDesalocar(aloj.id, ocupante.id);
      }
      return;
    }

    // Se estiver livre, abrir modal de alocação
    setAlojamentoSelecionado({
      id: aloj.id,
      numero: aloj.numeroAlojamento,
      casaNome: casa.nome,
    });
    setModalAberto(true);
  };

  const handleAlocar = async (
    adolescenteId: string,
    alojamentoId: string,
    justificativa?: string
  ): Promise<void> => {
    try {
      const response = await fetch("/api/alocar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adolescenteId,
          alojamentoId,
          justificativa,
          medidas_adicionais: [],
          ...(user?.id ? { operadorId: user.id } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || "Erro ao alocar adolescente");
      }

      const data = await response.json();

      alert(
        `✅ Adolescente alocado com sucesso!\n\nNível de risco: ${data.nivel_risco || "BAIXO"}`
      );

      // Fechar modal e recarregar dados
      setModalAberto(false);
      await carregarDados();
    } catch (error) {
      console.error("Erro ao alocar:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`❌ Erro ao realizar alocação:\n${errorMessage}`);
    }
  };

  const handleDesalocar = async (alojamentoId: string, adolescenteId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/alocar", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adolescenteId,
          alojamentoId,
          ...(user?.id ? { operadorId: user.id } : {}),
          motivo: "Desalocação manual via interface",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || "Erro ao desalocar adolescente");
      }

      alert("✅ Adolescente removido do alojamento com sucesso!");
      await carregarDados();
    } catch (error) {
      console.error("Erro ao desalocar:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`❌ Erro ao remover adolescente:\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Estatísticas */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 border-2 border-blue-200 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <Home className="text-blue-600" size={24} />
            <p className="text-sm font-semibold text-blue-700">Total de Casas</p>
          </div>
          <p className="text-4xl font-bold text-blue-900">{totalCasas}</p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-6 border-2 border-green-200 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <Bed className="text-green-600" size={24} />
            <p className="text-sm font-semibold text-green-700">Total de Alojamentos</p>
          </div>
          <p className="text-4xl font-bold text-green-900">{totalAlojamentos}</p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-6 border-2 border-purple-200 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="text-purple-600" size={24} />
            <p className="text-sm font-semibold text-purple-700">Capacidade Total</p>
          </div>
          <p className="text-4xl font-bold text-purple-900">78</p>
        </div>
      </div>

      {/* Legenda de Cores */}
      <div className="mb-4 p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
        <h4 className="font-semibold text-sm text-gray-700 mb-3">Legenda de Status:</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-50 border-2 border-gray-300 rounded"></div>
            <span className="text-gray-700">Desocupado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 border-2 border-green-400 rounded"></div>
            <span className="text-gray-700">Seguro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
            <span className="text-gray-700">Atenção</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 border-2 border-red-400 rounded"></div>
            <span className="text-gray-700">Perigo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-400 border-2 border-gray-600 rounded"></div>
            <span className="text-gray-700">Interditado</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <span className="text-gray-700">Risco Suicídio</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-purple-500" />
            <span className="text-gray-700">Perfil Mapeado</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-blue-500" />
            <span className="text-gray-700">Alerta Saúde</span>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {totalCasas === 0 ? (
        <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 p-8 shadow-lg">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-yellow-600 flex-shrink-0" size={32} />
            <div className="flex-1">
              <h3 className="font-bold text-xl text-yellow-900 mb-2">
                🏗️ Estrutura não inicializada
              </h3>
              <p className="text-yellow-800 mb-4">
                O sistema precisa criar as 8 casas e 78 alojamentos da unidade antes de começar as operações.
              </p>
              <InicializarEstruturaButton />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Estrutura das Casas
              </h2>
              <p className="text-sm text-gray-600">
                Clique em um alojamento livre para alocar, ou em um ocupado para remover
              </p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-indigo-600">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm">Atualizando...</span>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            {casas.map((casa) => (
              <div
                key={casa.id}
                className="rounded-xl bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Building2 className="text-indigo-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-gray-800">
                      {casa.nome}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {casa.alojamentos.length} alojamentos
                      {casa.isolada && (
                        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          Isolada
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Grid de Alojamentos */}
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {casa.alojamentos.map((aloj: any) => {
                    const corClasse = getCorAlojamento(aloj);
                    const ocupante = aloj.adolescentes?.[0] || aloj.ocupante;
                    const interditado = aloj.statusManutencao === "INTERDITADO";

                    return (
                      <button
                        key={aloj.id}
                        onClick={() => handleCliqueAlojamento(casa, aloj)}
                        disabled={loading || interditado}
                        className={`
                          text-center p-3 rounded-lg text-sm font-bold
                          transition-all hover:scale-105 cursor-pointer
                          relative border-2
                          ${corClasse}
                          ${(loading || interditado) && "opacity-50 cursor-not-allowed"}
                        `}
                        title={
                          interditado
                            ? `Alojamento ${aloj.numeroAlojamento} - Interditado`
                            : ocupante
                            ? `Alojamento ${aloj.numeroAlojamento} - ${ocupante.nomeCompleto || ocupante.nome_completo} - Clique para remover`
                            : `Alojamento ${aloj.numeroAlojamento} - Clique para alocar`
                        }
                      >
                        {/* Ícones de Alerta */}
                        {getIconesAlerta(aloj)}

                        {/* Número do alojamento */}
                        {aloj.numeroAlojamento}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Alocação */}
      <ModalAlocacao
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        alojamento={alojamentoSelecionado}
        adolescentes={adolescentes}
        onAlocar={handleAlocar}
      />
    </div>
  );
}
