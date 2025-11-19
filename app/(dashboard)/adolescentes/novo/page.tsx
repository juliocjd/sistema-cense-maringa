"use client";

import { useState } from "react";
import { CadastroAdolescente } from "@/components/cadastro/cadastro-adolescente";
import { useRouter } from "next/navigation";
import type { AdolescenteCadastroPayload } from "@/types";
import { useAuth } from "@/hooks/useAuth";

export default function CadastroAdolescentePage() {
  const router = useRouter();
  const [mostrarFormulario, setMostrarFormulario] = useState(true);
  const { user } = useAuth();

  const handleSalvar = async (
    adolescente: AdolescenteCadastroPayload,
    alojamentoId?: string
  ) => {
    if (!user?.id) {
      alert("Operador não autenticado. Faça login novamente para cadastrar.");
      throw new Error("Operador não autenticado");
    }

    try {
      // Chamar API
      const payload = {
        ...adolescente,
        alojamentoAtualId:
          alojamentoId ?? adolescente.alojamentoAtualId ?? undefined,
      };

      const response = await fetch("/api/adolescentes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao cadastrar adolescente");
      }

      const data = await response.json();
      const novoId =
        data?.adolescente?.id ??
        data?.id ??
        data?.adolescenteId ??
        null;

      if (!novoId) {
        throw new Error("Resposta inválida da API: ID ausente");
      }

      router.push(`/adolescentes/${novoId}`);
    } catch (error) {
      throw error;
    }
  };

  const handleCancelar = () => {
    if (
      confirm(
        "Deseja realmente cancelar o cadastro? Os dados não salvos serão perdidos."
      )
    ) {
      router.push("/adolescentes");
    }
  };

  return (
    <div>
      {mostrarFormulario && (
        <CadastroAdolescente
          onSalvar={handleSalvar}
          onCancelar={handleCancelar}
        />
      )}
    </div>
  );
}
