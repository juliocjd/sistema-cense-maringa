"use client";

import { useState, useEffect } from "react";
import { ListagemCIs } from "@/components/comunicados/listagem-cis";

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
    ladoConflito?: "LADO_1" | "LADO_2" | null;
  }>;
  conflitos?: Array<{
    id: string;
    adolescenteA?: {
      id?: string | null;
      nome?: string | null;
      numeroSms?: string | null;
    } | null;
    adolescenteB?: {
      id?: string | null;
      nome?: string | null;
      numeroSms?: string | null;
    } | null;
  }>;
  criadoEm: string;
  temConflito: boolean;
  temAlerta: boolean;
};

export default function ComunicadosPage() {
  const [comunicados, setComunicados] = useState<ComunicadoInterno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarComunicados();
  }, []);

  const carregarComunicados = async () => {
    try {
      const response = await fetch("/api/comunicados");

      if (!response.ok) {
        throw new Error("Erro ao carregar CIs");
      }

      const data = await response.json();
      setComunicados(data.comunicados || []);
    } catch (error) {
      // Mock de dados para desenvolvimento
      setComunicados([
        {
          id: "ci-001",
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
              ladoConflito: "LADO_1",
            },
            {
              id: "adol-003",
              nome: "Pedro Henrique Oliveira",
              numeroSms: "12347",
              ladoConflito: "LADO_2",
            },
          ],
          criadoEm: "2025-10-20T14:30:00",
          conflitos: [
            {
              id: "conf-001",
              adolescenteA: {
                id: "adol-001",
                nome: "João da Silva Santos",
                numeroSms: "12345",
              },
              adolescenteB: {
                id: "adol-003",
                nome: "Pedro Henrique Oliveira",
                numeroSms: "12347",
              },
            },
          ],
          temConflito: true,
          temAlerta: false,
        },
        {
          id: "ci-002",
          numero: 146,
          ano: 2025,
          dataFato: "2025-10-22",
          tipoCi: "DISCIPLINAR",
          resumoCi:
            "Descumprimento de normas internas. Adolescente desrespeitou agente de segurança durante revista de rotina.",
          caminhoPdf: undefined,
          operador: {
            id: "op-002",
            nome: "Maria Santos",
          },
          adolescentes: [
            {
              id: "adol-004",
              nome: "Carlos Eduardo Mendes",
              numeroSms: "12349",
              ladoConflito: null,
            },
          ],
          criadoEm: "2025-10-22T10:15:00",
          conflitos: [],
          temConflito: false,
          temAlerta: true,
        },
        {
          id: "ci-003",
          numero: 147,
          ano: 2025,
          dataFato: "2025-10-25",
          tipoCi: "SAUDE",
          resumoCi:
            "Adolescente apresentou sintomas de depressão e ideação suicida. Encaminhado para atendimento psicológico urgente.",
          caminhoPdf: "/pdfs/ci-147-2025.pdf",
          operador: {
            id: "op-003",
            nome: "Ana Costa",
          },
          adolescentes: [
            {
              id: "adol-007",
              nome: "Rafael dos Santos Lima",
              numeroSms: "12351",
              ladoConflito: null,
            },
          ],
          criadoEm: "2025-10-25T16:45:00",
          conflitos: [],
          temConflito: false,
          temAlerta: true,
        },
        {
          id: "ci-004",
          numero: 148,
          ano: 2025,
          dataFato: "2025-10-28",
          tipoCi: "AUTORIZACAO_ESPECIAL",
          resumoCi:
            "Autorização para saída externa temporária para tratamento médico especializado. Hospital Municipal de Maringá.",
          caminhoPdf: "/pdfs/ci-148-2025.pdf",
          operador: {
            id: "op-001",
            nome: "José Silva",
          },
          adolescentes: [
            {
              id: "adol-005",
              nome: "Ana Paula Rodrigues",
              numeroSms: "12348",
              ladoConflito: null,
            },
          ],
          criadoEm: "2025-10-28T09:00:00",
          conflitos: [],
          temConflito: false,
          temAlerta: false,
        },
        {
          id: "ci-005",
          numero: 152,
          ano: 2025,
          dataFato: "2025-10-29",
          tipoCi: "CONFLITO",
          resumoCi:
            "Ameaças verbais entre adolescentes de facções rivais. Conflito identificado durante atividade escolar.",
          caminhoPdf: undefined,
          operador: {
            id: "op-002",
            nome: "Maria Santos",
          },
          adolescentes: [
            {
              id: "adol-001",
              nome: "João da Silva Santos",
              numeroSms: "12345",
              ladoConflito: "LADO_1",
            },
            {
              id: "adol-008",
              nome: "Lucas Ferreira Costa",
              numeroSms: "12353",
              ladoConflito: "LADO_2",
            },
          ],
          criadoEm: "2025-10-29T11:20:00",
          conflitos: [
            {
              id: "conf-002",
              adolescenteA: {
                id: "adol-001",
                nome: "João da Silva Santos",
                numeroSms: "12345",
              },
              adolescenteB: {
                id: "adol-008",
                nome: "Lucas Ferreira Costa",
                numeroSms: "12353",
              },
            },
          ],
          temConflito: true,
          temAlerta: false,
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
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando CIs...</p>
        </div>
      </div>
    );
  }

  return <ListagemCIs comunicados={comunicados} />;
}
