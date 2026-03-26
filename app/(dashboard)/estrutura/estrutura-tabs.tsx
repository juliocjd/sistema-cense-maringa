"use client";

import { Suspense, useState } from "react";
import { Building2, BarChart3, PieChart, Settings2 } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

import { ConfiguracoesCasasTab } from "./configuracoes-casas-tab";
import { VisaoGeralTab } from "./visao-geral-tab";
import { EstatisticasTab } from "./estatisticas-tab";

type EstruturaTabsProps = {
  casas: any[];
  totalAlojamentos: number;
};

type TabType = "visao-geral" | "estatisticas" | "configuracoes";

export function EstruturaTabsComponent({
  casas,
  totalAlojamentos,
}: EstruturaTabsProps) {
  const { user } = useAuth();
  const podeEditarEstrutura = hasPermission(
    user?.permissions,
    PERMISSIONS.ESTRUTURA_EDIT,
  );
  const [activeTab, setActiveTab] = useState<TabType>("visao-geral");

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <Building2 className="text-indigo-600" size={36} />
              Estrutura Operacional
            </h1>
            <p className="mt-2 text-gray-600">
              Gerencie a estrutura física e operacional da unidade
            </p>
          </div>

          <Link
            href="/dashboard-tensao"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg lg:w-auto"
          >
            <BarChart3 size={20} />
            Dashboard de Tensão
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-md">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("visao-geral")}
              className={`flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition-all ${
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
              className={`flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition-all ${
                activeTab === "estatisticas"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <PieChart size={20} />
              Estatísticas
            </button>
            {podeEditarEstrutura ? (
              <button
                onClick={() => setActiveTab("configuracoes")}
                className={`flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition-all ${
                  activeTab === "configuracoes"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Settings2 size={20} />
                Configurações
              </button>
            ) : null}
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
          ) : activeTab === "estatisticas" ? (
            <EstatisticasTab casas={casas} totalAlojamentos={totalAlojamentos} />
          ) : (
            <ConfiguracoesCasasTab casas={casas} />
          )}
        </Suspense>
      </div>
    </div>
  );
}
