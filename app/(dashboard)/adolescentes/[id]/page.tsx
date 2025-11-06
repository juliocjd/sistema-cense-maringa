"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DossieAdolescente } from "@/components/adolescentes/dossie-adolescente";
import type { Adolescente } from "@/types";

export default function DossieAdolescentePage() {
  const params = useParams();
  const adolescenteId = params.id as string;

  const [adolescente, setAdolescente] = useState<Adolescente | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarAdolescente = useCallback(async () => {
    setLoading(true);
    setErro(null);

    try {
      const response = await fetch(`/api/adolescentes/${adolescenteId}`);
      const payload = await response.json();

      if (!response.ok) {
        const mensagem =
          payload?.erro || "Erro ao carregar dados do adolescente.";
        throw new Error(mensagem);
      }

      setAdolescente(payload);
    } catch (error) {
      console.error("Erro ao carregar adolescente:", error);
      setAdolescente(null);
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar dados do adolescente."
      );
    } finally {
      setLoading(false);
    }
  }, [adolescenteId]);

  useEffect(() => {
    if (!adolescenteId) return;
    carregarAdolescente();
  }, [adolescenteId, carregarAdolescente]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando dossie...</p>
        </div>
      </div>
    );
  }

  if (erro && !adolescente) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">:/</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Nao foi possivel carregar o adolescente
          </h2>
          <p className="text-gray-600 mb-4">{erro}</p>
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
