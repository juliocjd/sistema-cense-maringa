"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Adolescente } from "@/types";
import { CasosInfracionaisPanel } from "@/components/adolescentes/casos-infracionais-panel";

export default function CasosInfracionaisPage() {
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
        throw new Error(payload?.erro || "Erro ao carregar os casos infracionais.");
      }

      setAdolescente(payload);
    } catch (error) {
      setAdolescente(null);
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar os casos infracionais.",
      );
    } finally {
      setLoading(false);
    }
  }, [adolescenteId]);

  useEffect(() => {
    if (!adolescenteId) return;
    carregarAdolescente();
  }, [adolescenteId, carregarAdolescente]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href={`/adolescentes/${adolescenteId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-600"
        >
          <ArrowLeft size={18} />
          Voltar ao dossiê
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="py-16 text-center text-slate-500">
              Carregando casos infracionais...
            </div>
          ) : erro || !adolescente ? (
            <div className="py-16 text-center text-rose-600">
              {erro || "Não foi possível carregar os casos infracionais."}
            </div>
          ) : (
            <CasosInfracionaisPanel
              adolescente={adolescente}
              titulo={`Casos Infracionais de ${adolescente.nomeCompleto}`}
              descricao="Listagem completa dos casos, narrativas e tipificações registradas."
              modo="pagina"
            />
          )}
        </div>
      </div>
    </div>
  );
}
