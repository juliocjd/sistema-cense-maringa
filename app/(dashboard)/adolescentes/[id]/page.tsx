"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DossieAdolescente } from "@/components/adolescentes/dossie-adolescente";
import type { Adolescente } from "@/types";

export default function DossieAdolescentePage() {
  const params = useParams();
  const adolescenteId = params.id as string;

  const [adolescente, setAdolescente] = useState<Adolescente | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    carregarAdolescente();
  }, [adolescenteId]);

  const carregarAdolescente = async () => {
    try {
      // Chamar API
      const response = await fetch(`/api/adolescentes/${adolescenteId}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar adolescente");
      }

      const data = await response.json();
      setAdolescente(data);
    } catch (error) {
      console.error("Erro:", error);
      setErro(true);

      // Mock de dados para desenvolvimento
      // Simular adolescente baseado no ID
      const mockAdolescente: Adolescente = {
        id: adolescenteId,
        nomeCompleto: "João da Silva Santos",
        nomeSocial: "João",
        numeroSms: "12345",
        fotoUrl: null,
        numeroProcesso: "0001234-56.2024.8.16.0000",
        dataNascimento: "2008-05-15",
        dataEntrada: "2025-10-15",
        atoInfracionalAtual: "Análogo a roubo qualificado (art. 157, §2º, CP)",
        alojamentoAtualId: "aloj-02-05",
        statusUnidade: "ATIVO",
        alertaRiscoSuicidio: true,
        alertaPerfilMapeado: false,
        alertaSaudeConfidencial: false,
        conflitosA: [],
        conflitosB: [],
      };

      setAdolescente(mockAdolescente);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando dossiê...</p>
        </div>
      </div>
    );
  }

  if (erro && !adolescente) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Adolescente não encontrado
          </h2>
          <p className="text-gray-600 mb-4">
            O adolescente com ID {adolescenteId} não foi encontrado no sistema.
          </p>
          <a
            href="/adolescentes"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Voltar para lista
          </a>
        </div>
      </div>
    );
  }

  if (!adolescente) {
    return null;
  }

  return <DossieAdolescente adolescente={adolescente} />;
}
