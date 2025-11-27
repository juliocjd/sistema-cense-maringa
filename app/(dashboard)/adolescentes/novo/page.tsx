"use client";

import { useState } from "react";
import { CadastroAdolescente } from "@/components/cadastro/cadastro-adolescente";
import { useRouter } from "next/navigation";
import type { AdolescenteCadastroPayload } from "@/types";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_API_ERROR = "Erro ao cadastrar adolescente";

const collectDetalhesMensagens = (detalhes: unknown): string | null => {
  if (!detalhes) {
    return null;
  }

  if (typeof detalhes === "string" && detalhes.trim().length > 0) {
    return detalhes;
  }

  if (Array.isArray(detalhes)) {
    const mensagens = detalhes
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((mensagem) => mensagem.length > 0);
    if (mensagens.length > 0) {
      return mensagens.join(" | ");
    }
    return null;
  }

  if (typeof detalhes === "object") {
    const mensagens: string[] = [];
    Object.values(detalhes as Record<string, unknown>).forEach((valor) => {
      if (typeof valor === "string" && valor.trim().length > 0) {
        mensagens.push(valor.trim());
      } else if (Array.isArray(valor)) {
        valor.forEach((item) => {
          if (typeof item === "string" && item.trim().length > 0) {
            mensagens.push(item.trim());
          }
        });
      }
    });

    if (mensagens.length > 0) {
      return mensagens.join(" | ");
    }
  }

  return null;
};

const extrairMensagemErroApi = (payload: unknown): string => {
  if (!payload || typeof payload !== "object") {
    return DEFAULT_API_ERROR;
  }

  const data = payload as Record<string, unknown>;
  const erroDireto = data["erro"];
  if (typeof erroDireto === "string" && erroDireto.trim().length > 0) {
    return erroDireto;
  }

  const mensagemDireta = data["message"];
  if (
    typeof mensagemDireta === "string" &&
    mensagemDireta.trim().length > 0
  ) {
    return mensagemDireta;
  }

  const detalhesMensagem = collectDetalhesMensagens(data["detalhes"]);
  if (detalhesMensagem) {
    return detalhesMensagem;
  }

  return DEFAULT_API_ERROR;
};

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

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(extrairMensagemErroApi(body));
      }

      const data = body as
        | {
            adolescente?: { id?: string };
            id?: string;
            adolescenteId?: string;
          }
        | null;
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
