"use client";

import { Suspense, useState } from "react";
import { Building2, BarChart3, PieChart } from "lucide-react";
import Link from "next/link";
import { VisaoGeralTab } from "./visao-geral-tab";
import { EstatisticasTab } from "./estatisticas-tab";

type EstruturaTabsProps = {
  casas: any[];
  totalAlojamentos: number;
};

type TabType = "visao-geral" | "estatisticas";

export function EstruturaTabsComponent({
  casas,
  totalAlojamentos,
}: EstruturaTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("visao-geral");

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="text-indigo-600" size={36} />
              Estrutura Operacional
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie a estrutura física e operacional da unidade
            </p>
          </div>

          <Link
            href="/dashboard-tensao"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-semibold"
          >
            <BarChart3 size={20} />
            Dashboard de Tensão
          </Link>
        </div>
      </div>

      {/* Sistema de Tabs */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("visao-geral")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "visao-geral"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Building2 size={20} />
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab("estatisticas")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "estatisticas"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <PieChart size={20} />
              Estatísticas
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-[600px]">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-gray-500">
              Carregando estrutura...
            </div>
          }
        >
          {activeTab === "visao-geral" ? (
            <VisaoGeralTab casas={casas} totalAlojamentos={totalAlojamentos} />
          ) : (
            <EstatisticasTab casas={casas} totalAlojamentos={totalAlojamentos} />
          )}
        </Suspense>
      </div>
    </div>
  );
}
