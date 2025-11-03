"use client";

import { useState, useEffect } from "react";
import { ListagemAdolescentes } from "@/components/adolescentes/listagem-adolescentes";
import type { Adolescente } from "@/types";

export default function AdolescentesPage() {
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarAdolescentes();
  }, []);

  const carregarAdolescentes = async () => {
    try {
      // Chamar API
      const response = await fetch("/api/adolescentes");

      if (!response.ok) {
        throw new Error("Erro ao carregar adolescentes");
      }

      const data = await response.json();
      setAdolescentes(data);
    } catch (error) {
      console.error("Erro:", error);

      // Mock de dados para desenvolvimento
      setAdolescentes([
        {
          id: "adol-001",
          nomeCompleto: "João da Silva Santos",
          nomeSocial: "João",
          numeroSms: "12345",
          fotoUrl: null,
          numeroProcesso: "0001234-56.2024.8.16.0000",
          alojamentoAtualId: "aloj-02-05",
          statusUnidade: "ATIVO",
          alertaRiscoSuicidio: true,
          alertaPerfilMapeado: false,
          alertaSaudeConfidencial: false,
          conflitosA: [],
          conflitosB: [],
        },
        {
          id: "adol-002",
          nomeCompleto: "Maria Aparecida Costa",
          nomeSocial: undefined,
          numeroSms: "12346",
          fotoUrl: null,
          numeroProcesso: "0001235-56.2024.8.16.0000",
          alojamentoAtualId: "aloj-03-01",
          statusUnidade: "ATIVO",
          alertaRiscoSuicidio: false,
          alertaPerfilMapeado: true,
          alertaSaudeConfidencial: false,
          conflitosA: [],
          conflitosB: [],
        },
        {
          id: "adol-003",
          nomeCompleto: "Pedro Henrique Oliveira",
          nomeSocial: "PH",
          numeroSms: "12347",
          fotoUrl: null,
          numeroProcesso: "0001236-56.2024.8.16.0000",
          alojamentoAtualId: null,
          statusUnidade: "ATIVO",
          alertaRiscoSuicidio: false,
          alertaPerfilMapeado: false,
          alertaSaudeConfidencial: true,
          conflitosA: [],
          conflitosB: [],
        },
        {
          id: "adol-004",
          nomeCompleto: "Ana Paula Rodrigues",
          nomeSocial: undefined,
          numeroSms: "12348",
          fotoUrl: null,
          numeroProcesso: "0001237-56.2024.8.16.0000",
          alojamentoAtualId: "aloj-05-03",
          statusUnidade: "ATIVO",
          alertaRiscoSuicidio: false,
          alertaPerfilMapeado: false,
          alertaSaudeConfidencial: false,
          conflitosA: [],
          conflitosB: [],
        },
        {
          id: "adol-005",
          nomeCompleto: "Carlos Eduardo Mendes",
          nomeSocial: "Cadu",
          numeroSms: "12349",
          fotoUrl: null,
          numeroProcesso: "0001238-56.2024.8.16.0000",
          alojamentoAtualId: "aloj-06-08",
          statusUnidade: "TRANSFERIDO",
          alertaRiscoSuicidio: false,
          alertaPerfilMapeado: false,
          alertaSaudeConfidencial: false,
          conflitosA: [],
          conflitosB: [],
        },
        {
          id: "adol-006",
          nomeCompleto: "Juliana Cristina Souza",
          nomeSocial: "Ju",
          numeroSms: "12350",
          fotoUrl: null,
          numeroProcesso: undefined,
          alojamentoAtualId: null,
          statusUnidade: "LIBERADO",
          alertaRiscoSuicidio: false,
          alertaPerfilMapeado: false,
          alertaSaudeConfidencial: false,
          conflitosA: [],
          conflitosB: [],
        },
        {
          id: "adol-007",
          nomeCompleto: "Rafael dos Santos Lima",
          nomeSocial: undefined,
          numeroSms: "12351",
          fotoUrl: null,
          numeroProcesso: "0001239-56.2024.8.16.0000",
          alojamentoAtualId: "aloj-07-02",
          statusUnidade: "ATIVO",
          alertaRiscoSuicidio: true,
          alertaPerfilMapeado: true,
          alertaSaudeConfidencial: true,
          conflitosA: [],
          conflitosB: [],
        },
        {
          id: "adol-008",
          nomeCompleto: "Fernanda Alves Pereira",
          nomeSocial: "Fê",
          numeroSms: "12352",
          fotoUrl: null,
          numeroProcesso: "0001240-56.2024.8.16.0000",
          alojamentoAtualId: null,
          statusUnidade: "ATIVO",
          alertaRiscoSuicidio: false,
          alertaPerfilMapeado: false,
          alertaSaudeConfidencial: false,
          conflitosA: [],
          conflitosB: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">
            Carregando adolescentes...
          </p>
        </div>
      </div>
    );
  }

  return <ListagemAdolescentes adolescentes={adolescentes} />;
}
