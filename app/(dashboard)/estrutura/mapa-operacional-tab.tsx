"use client";

import { useState, useEffect } from "react";
import { MapaInterativo } from "@/components/mapa/mapa-interativo";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, AlertCircle } from "lucide-react";

// Tipos
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

export function MapaOperacionalTab() {
  const { user } = useAuth();
  const [casas, setCasas] = useState<Casa[]>([]);
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Transformar dados da API
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
                  nomeCompleto: aloj.ocupante.nome_completo,
                  numeroSms: aloj.ocupante.numero_sms,
                  fotoUrl: aloj.ocupante.foto_url || null,
                  alojamentoAtualId: aloj.id,
                  statusUnidade: "ATIVO",
                  alertaRiscoSuicidio: false,
                  alertaPerfilMapeado: false,
                  alertaSaudeConfidencial: false,
                  conflitosA: [],
                  conflitosB: [],
                },
              ]
            : [],
        })),
      }));

      setCasas(casasFormatadas);

      // Carregar todos os adolescentes
      const adolescentesResponse = await fetch("/api/adolescentes");

      if (!adolescentesResponse.ok) {
        throw new Error("Erro ao carregar adolescentes");
      }

      const adolescentesData = await adolescentesResponse.json();

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
          adolescenteId: adolescenteId,
          alojamentoId: alojamentoId,
          justificativa: justificativa,
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
        `✅ Adolescente alocado com sucesso!\n\nNível de risco: ${data.nivel_risco || "BAIXO"}\nAlertas processados: ${data.alertas_processados || 0}`
      );

      await carregarDados();
    } catch (error) {
      console.error("Erro ao alocar:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`❌ Erro ao realizar alocação:\n${errorMessage}`);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="inline-block animate-spin text-indigo-600 mb-4" size={48} />
          <p className="text-xl font-semibold text-gray-700">
            Carregando mapa operacional...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Buscando dados de casas e adolescentes
          </p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md border-2 border-red-200 p-8">
        <div className="flex items-start gap-4">
          <div className="bg-red-100 rounded-full p-3">
            <AlertCircle className="text-red-600" size={32} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Erro ao Carregar Mapa
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={carregarDados}
              className="bg-red-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-red-700 transition-colors"
            >
              Tentar Novamente
            </button>
            <div className="mt-4 text-sm text-gray-500">
              <p className="font-semibold mb-2">Possíveis causas:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Banco de dados não conectado</li>
                <li>Execute: npx prisma db push</li>
                <li>Inicialize a estrutura na aba "Visão Geral"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
