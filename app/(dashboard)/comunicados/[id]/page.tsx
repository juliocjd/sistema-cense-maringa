"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DetalhesCI } from "@/components/comunicados/detalhes-ci";

type ComunicadoInterno = {
  id: string;
  numero: number;
  ano: number;
  dataFato: string;
  tipoCi: string;
  resumoCi: string;
  caminhoPdf?: string;
  operador: {
    id: string;
    nome: string;
  };
  adolescentes: Array<{
    id: string;
    nome: string;
    numeroSms: string;
    alojamento?: string;
  }>;
  criadoEm: string;
  conflitosGerados: Array<{
    id: string;
    adolescenteA: string;
    adolescenteB: string;
  }>;
  alertasGerados: Array<{
    id: string;
    adolescente: string;
    tipo: string;
  }>;
};

export default function CIPorIdPage() {
  const params = useParams();
  const router = useRouter();
  const ciId = params.id as string;

  const [ci, setCI] = useState<ComunicadoInterno | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    carregarCI();
  }, [ciId]);

  const carregarCI = async () => {
    try {
      const response = await fetch(`/api/comunicados/${ciId}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar CI");
      }

      const data = await response.json();
      setCI(data);
    } catch (error) {
      console.error("Erro:", error);
      setErro(true);

      // Mock de dados para desenvolvimento
      const mockCI: ComunicadoInterno = {
        id: ciId,
        numero: 145,
        ano: 2025,
        dataFato: "2025-10-20",
        tipoCi: "CONFLITO",
        resumoCi:
          "Conflito entre adolescentes durante atividade no solário. Facções rivais envolvidas. Necessária intervenção da equipe de segurança.",
        caminhoPdf: "/pdfs/ci-145-2025.pdf",
        operador: {
          id: "op-001",
          nome: "José Silva",
        },
        adolescentes: [
          {
            id: "adol-001",
            nome: "João da Silva Santos",
            numeroSms: "12345",
            alojamento: "Casa 02 - Aloj 05",
          },
          {
            id: "adol-003",
            nome: "Pedro Henrique Oliveira",
            numeroSms: "12347",
            alojamento: "Casa 02 - Aloj 06",
          },
        ],
        criadoEm: "2025-10-20T14:30:00",
        conflitosGerados: [
          {
            id: "conf-001",
            adolescenteA: "João da Silva Santos",
            adolescenteB: "Pedro Henrique Oliveira",
          },
        ],
        alertasGerados: [],
      };

      setCI(mockCI);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarConflito = async (dados: any) => {
    try {
      const response = await fetch("/api/conflitos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dados),
      });

      if (!response.ok) {
        throw new Error("Erro ao criar conflito");
      }

      // Recarregar CI para mostrar novo conflito
      await carregarCI();
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  };

  const handleCriarAlerta = async (dados: any) => {
    try {
      const response = await fetch("/api/alertas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dados),
      });

      if (!response.ok) {
        throw new Error("Erro ao criar alerta");
      }

      // Recarregar CI para mostrar novo alerta
      await carregarCI();
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando CI...</p>
        </div>
      </div>
    );
  }

  if (erro && !ci) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            CI não encontrado
          </h2>
          <p className="text-gray-600 mb-4">
            O CI com ID {ciId} não foi encontrado no sistema.
          </p>
          <button
            onClick={() => router.push("/comunicados")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  if (!ci) {
    return null;
  }

  return (
    <DetalhesCI
      ci={ci}
      onCriarConflito={handleCriarConflito}
      onCriarAlerta={handleCriarAlerta}
    />
  );
}
