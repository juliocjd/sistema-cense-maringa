"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CadastroAdolescente } from "@/components/cadastro/cadastro-adolescente";
import type { Adolescente } from "@/types";

export default function EditarAdolescentePage() {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const adolescenteId = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

  const [adolescente, setAdolescente] = useState<Adolescente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!adolescenteId) {
      setErro("Adolescente nao informado.");
      setCarregando(false);
      return;
    }

    const carregar = async () => {
      setCarregando(true);
      setErro(null);
      try {
        const response = await fetch(`/api/adolescentes/${adolescenteId}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.erro ?? "Erro ao carregar adolescente.");
        }
        const dados: Adolescente = await response.json();
        setAdolescente(dados);
      } catch (error) {
        const mensagem =
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao carregar adolescente.";
        setErro(mensagem);
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [adolescenteId]);

  const handleSalvar = async (dados: Partial<Adolescente>) => {
    if (!adolescenteId) {
      throw new Error("Identificador do adolescente nao encontrado.");
    }

    const response = await fetch(`/api/adolescentes/${adolescenteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.erro ?? "Erro ao atualizar adolescente.");
    }

    router.push(`/adolescentes/${adolescenteId}`);
  };

  const handleCancelar = () => {
    if (adolescenteId) {
      router.push(`/adolescentes/${adolescenteId}`);
    } else {
      router.back();
    }
  };

  if (!adolescenteId) {
    return (
      <div className="p-6 text-center text-red-700">
        Nao foi possivel identificar o adolescente solicitado.
      </div>
    );
  }

  if (carregando) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-sm text-slate-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6 border border-rose-200">
        <p className="text-rose-600 font-semibold mb-2">
          Nao foi possivel carregar o adolescente.
        </p>
        <p className="text-sm text-slate-600 mb-4">{erro}</p>
        <button
          type="button"
          onClick={handleCancelar}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!adolescente) {
    return null;
  }

  return (
    <CadastroAdolescente
      modo="EDICAO"
      initialData={adolescente}
      permitirAlocacaoAutomatica={false}
      onSalvar={handleSalvar}
      onCancelar={handleCancelar}
    />
  );
}
