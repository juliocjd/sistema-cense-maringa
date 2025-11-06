"use client";

import { useEffect, useState } from "react";
import { ListagemAdolescentes } from "@/components/adolescentes/listagem-adolescentes";
import type { Adolescente } from "@/types";

export default function AdolescentesPage() {
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarAdolescentes() {
    setLoading(true);
    setErro(null);

    try {
      const response = await fetch("/api/adolescentes");
      const payload = await response.json();

      if (!response.ok) {
        const mensagem =
          payload?.erro || "Erro ao carregar lista de adolescentes.";
        throw new Error(mensagem);
      }

      const dados = Array.isArray(payload.data) ? payload.data : [];
      setAdolescentes(dados);
    } catch (error) {
      console.error("Erro ao carregar adolescentes:", error);
      setAdolescentes([]);
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar lista de adolescentes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarAdolescentes();
  }, []);

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

  if (erro) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Nao foi possivel carregar os dados
          </h2>
          <p className="text-gray-600 mb-6">{erro}</p>
          <button
            onClick={carregarAdolescentes}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return <ListagemAdolescentes adolescentes={adolescentes} />;
}
