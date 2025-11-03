"use client";

import { useState, useEffect } from "react";
import { MapaInterativo } from "@/components/mapa/mapa-interativo";
import { useAuth } from "@/hooks/useAuth";

// Definir tipos corretamente
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

type Alojamento = {
  id: string;
  casaId: string;
  numeroAlojamento: string;
  ala: "A" | "B" | null;
  statusManutencao: "LIVRE" | "INTERDITADO";
  adolescentes: Adolescente[];
};

type Casa = {
  id: string;
  numero: number;
  nome: string;
  isolada: boolean;
  alojamentos: Alojamento[];
};

export default function MapaPage() {
  // Autenticação
  const { user } = useAuth();

  // Estados
  const [casas, setCasas] = useState<Casa[]>([]);
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados do banco
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    setError(null);

    try {
      // Carregar casas e alojamentos com ocupantes
      const casasResponse = await fetch("/api/casas/status");

      if (!casasResponse.ok) {
        throw new Error("Erro ao carregar dados das casas");
      }

      const casasData = await casasResponse.json();

      // Transformar dados da API para o formato esperado
      const casasFormatadas: Casa[] = casasData.casas.map((casa: any) => ({
        id: casa.id,
        numero: casa.numero,
        nome: casa.nome,
        isolada: casa.isolada,
        alojamentos: casa.alojamentos.map((aloj: any) => ({
          id: aloj.id,
          casaId: casa.id,
          numeroAlojamento: aloj.numero,
          ala: aloj.ala,
          statusManutencao: aloj.status_manutencao,
          adolescentes: aloj.ocupante
            ? [
                {
                  id: aloj.ocupante.id,
                  nomeCompleto: aloj.ocupante.nome,
                  numeroSms: aloj.ocupante.sms,
                  fotoUrl: aloj.ocupante.foto || null,
                  alojamentoAtualId: aloj.id,
                  statusUnidade: "ATIVO",
                  alertaRiscoSuicidio: aloj.ocupante.alerta_suicidio || false,
                  alertaPerfilMapeado: aloj.ocupante.alerta_perfil || false,
                  alertaSaudeConfidencial: aloj.ocupante.alerta_saude || false,
                  conflitosA: [],
                  conflitosB: [],
                },
              ]
            : [],
        })),
      }));

      setCasas(casasFormatadas);

      // Carregar todos os adolescentes para o modal
      const adolescentesResponse = await fetch("/api/adolescentes");

      if (!adolescentesResponse.ok) {
        throw new Error("Erro ao carregar adolescentes");
      }

      const adolescentesData = await adolescentesResponse.json();

      // Transformar dados
      const adolescentesFormatados: Adolescente[] = adolescentesData.map(
        (a: any) => ({
          id: a.id,
          nomeCompleto: a.nomeCompleto,
          numeroSms: a.numeroSms,
          fotoUrl: a.fotoUrl,
          alojamentoAtualId: a.alojamentoAtualId,
          statusUnidade: a.statusUnidade,
          alertaRiscoSuicidio: a.alertaRiscoSuicidio,
          alertaPerfilMapeado: a.alertaPerfilMapeado,
          alertaSaudeConfidencial: a.alertaSaudeConfidencial,
          conflitosA: a.conflitosA || [],
          conflitosB: a.conflitosB || [],
        })
      );

      setAdolescentes(adolescentesFormatados);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setError(
        error instanceof Error ? error.message : "Erro ao carregar dados"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handler de alocação com tipos corretos
  const handleAlocar = async (
    adolescenteId: string,
    alojamentoId: string,
    justificativa?: string
  ): Promise<void> => {
    console.log("Alocando:", { adolescenteId, alojamentoId, justificativa });

    try {
      // Chamar API com campos CORRETOS
      const response = await fetch("/api/alocar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adolescenteId: adolescenteId, // ✅ Correto
          alojamentoId: alojamentoId, // ✅ Correto
          operadorId: user?.id || "temp-operador-id", // ✅ Pega do contexto de auth
          justificativa: justificativa,
          medidas_adicionais: [], // Opcional
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || "Erro ao alocar adolescente");
      }

      const data = await response.json();
      console.log("Alocação realizada:", data);

      // Mostrar notificação de sucesso com detalhes
      alert(
        `✅ Adolescente alocado com sucesso!\n\nNível de risco: ${data.nivel_risco || "BAIXO"}\nAlertas processados: ${data.alertas_processados || 0}`
      );

      // ✅ Recarregar dados do banco para atualizar o mapa
      await carregarDados();
    } catch (error) {
      console.error("Erro ao alocar:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`❌ Erro ao realizar alocação:\n${errorMessage}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-rose-200 border-t-rose-600 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">
            Carregando dados do mapa...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Buscando informações das casas e adolescentes
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border-l-4 border-red-500">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-red-100 rounded-full p-3">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Erro ao Carregar Dados
            </h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={carregarDados}
              className="w-full bg-rose-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-rose-700 transition-colors"
            >
              Tentar Novamente
            </button>
            <div className="text-sm text-gray-500 space-y-1">
              <p className="font-semibold">Possíveis causas:</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>Banco de dados não está rodando</li>
                <li>Execute: npx prisma db push</li>
                <li>
                  Execute: POST /api/estrutura/inicializar (para criar casas)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mapa normal
  return (
    <div>
      <MapaInterativo
        casas={casas}
        adolescentes={adolescentes}
        onAlocar={handleAlocar}
      />
    </div>
  );
}
