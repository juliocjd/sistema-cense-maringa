"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { ImpactoConflitoPayload } from "@/types/inteligencia";
import RelatorioImpactoCard from "./relatorio-impacto-card";

interface RelatorioImpactoModalTriggerProps {
  resumo: ImpactoConflitoPayload;
  conflitoIdDefault?: string | null;
}

export default function RelatorioImpactoModalTrigger({
  resumo,
  conflitoIdDefault,
}: RelatorioImpactoModalTriggerProps) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center justify-center rounded-lg border border-indigo-200 px-5 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
      >
        Relatorio de impacto
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="relative flex w-full max-w-4xl flex-col rounded-2xl bg-white p-4 shadow-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Relatorio de impacto
                </h3>
                <p className="text-sm text-slate-500">
                  Gere e exporte o impacto atualizado dos conflitos externos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar relatorio de impacto"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto pr-1">
              <RelatorioImpactoCard
                resumo={resumo}
                conflitoIdDefault={conflitoIdDefault}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
