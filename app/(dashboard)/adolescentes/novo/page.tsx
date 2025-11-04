"use client";

import { useState } from "react";
import { CadastroAdolescente } from "@/components/cadastro/cadastro-adolescente";
import { useRouter } from "next/navigation";
import type { Adolescente } from "@/types";

export default function CadastroAdolescentePage() {
  const router = useRouter();
  const [mostrarFormulario, setMostrarFormulario] = useState(true);

  const handleSalvar = async (adolescente: Partial<Adolescente>) => {
    console.log("Salvando adolescente:", adolescente);

    try {
      // Chamar API
      const response = await fetch("/api/adolescentes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...adolescente,
          operador_id: "uuid-operador-logado", // TODO: Pegar do contexto de auth
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao cadastrar adolescente");
      }

      const data = await response.json();
      console.log("Adolescente cadastrado:", data);

      // Redirecionar para dossiê
      router.push(`/adolescentes/${data.id}`);
    } catch (error) {
      console.error("Erro:", error);
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
