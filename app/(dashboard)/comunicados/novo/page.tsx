"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RegistroCI } from "@/components/comunicados/registro-ci";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  numeroSms: string;
  fotoUrl?: string | null;
  alojamento?: string;
};

export default function NovoCIPage() {
  const router = useRouter();
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarAdolescentes();
  }, []);

  const carregarAdolescentes = async () => {
    try {
      const response = await fetch("/api/adolescentes?status=ATIVO");

      if (!response.ok) {
        throw new Error("Erro ao carregar adolescentes");
      }

      const payload = await response.json();
      const lista = Array.isArray(payload?.data) ? payload.data : [];
      setAdolescentes(lista);
    } catch (error) {
      // Mock de dados
      setAdolescentes([
        {
          id: "adol-001",
          nomeCompleto: "João da Silva Santos",
          numeroSms: "12345",
          alojamento: "Casa 02 - Aloj 05",
        },
        {
          id: "adol-002",
          nomeCompleto: "Maria Aparecida Costa",
          numeroSms: "12346",
          alojamento: "Casa 03 - Aloj 01",
        },
        {
          id: "adol-003",
          nomeCompleto: "Pedro Henrique Oliveira",
          numeroSms: "12347",
          alojamento: "Casa 02 - Aloj 06",
        },
        {
          id: "adol-004",
          nomeCompleto: "Ana Paula Rodrigues",
          numeroSms: "12348",
          alojamento: "Casa 05 - Aloj 03",
        },
        {
          id: "adol-005",
          nomeCompleto: "Carlos Eduardo Mendes",
          numeroSms: "12349",
          alojamento: "Casa 06 - Aloj 08",
        },
        {
          id: "adol-006",
          nomeCompleto: "Juliana Cristina Souza",
          numeroSms: "12350",
          alojamento: undefined,
        },
        {
          id: "adol-007",
          nomeCompleto: "Rafael dos Santos Lima",
          numeroSms: "12351",
          alojamento: "Casa 07 - Aloj 02",
        },
        {
          id: "adol-008",
          nomeCompleto: "Fernanda Alves Pereira",
          numeroSms: "12352",
          alojamento: "Casa 06 - Aloj 04",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (formData: any) => {
    try {
      const response = await fetch("/api/comunicados", {
        method: "POST",
        body: formData, // FormData com PDF
      });

      if (!response.ok) {
        throw new Error("Erro ao registrar CI");
      }

      // Redirecionar para lista
      router.push("/comunicados");
    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando...</p>
        </div>
      </div>
    );
  }

  return <RegistroCI adolescentes={adolescentes} onSalvar={handleSalvar} />;
}
