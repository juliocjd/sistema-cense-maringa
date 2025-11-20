"use client";

import { FileText, ArrowLeft } from "lucide-react";
import { PainelRelatorioMensal } from "@/components/relatorios/painel-relatorio-mensal";
import Link from "next/link";

export default function RelatoriosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium mb-4"
          >
            <ArrowLeft size={20} />
            Voltar para Dashboard
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
              <FileText className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Relatórios de Visitas
              </h1>
              <p className="text-gray-600 mt-1">
                Visualize e exporte relatórios mensais detalhados
              </p>
            </div>
          </div>
        </div>

        {/* Painel de Relatório */}
        <PainelRelatorioMensal />
      </div>
    </div>
  );
}
