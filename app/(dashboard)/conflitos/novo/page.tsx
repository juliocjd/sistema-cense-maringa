"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RegistroConflito } from "@/components/conflitos/registro-conflito";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  numeroSms: string;
  alojamento?: string;
};

export default function NovoConflitoPage() {
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

      const data = await response.json();
      setAdolescentes(data);
    } catch (error) {
      console.error("Erro:", error);

      // Mock de dados para desenvolvimento
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

  const handleSalvar = async (conflito: any) => {
    try {
      const response = await fetch("/api/conflitos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(conflito),
      });

      if (!response.ok) {
        throw new Error("Erro ao registrar conflito");
      }

      // Redirecionar para lista de conflitos
      router.push("/dashboard/conflitos");
    } catch (error) {
      console.error("Erro:", error);
      throw error; // Re-throw para o componente tratar
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <RegistroConflito adolescentes={adolescentes} onSalvar={handleSalvar} />
  );
}
