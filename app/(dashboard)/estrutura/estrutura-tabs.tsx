"use client";

import { useState } from "react";
import { Building2, Map, Eye, LayoutGrid } from "lucide-react";
import { VisaoGeralTab } from "./visao-geral-tab";
import { MapaOperacionalTab } from "./mapa-operacional-tab";

type TabType = "visao-geral" | "mapa";

type EstruturaTabsProps = {
  casas: any[];
  totalAlojamentos: number;
};

export function EstruturaTabsComponent({ casas, totalAlojamentos }: EstruturaTabsProps) {
  const [abaAtiva, setAbaAtiva] = useState<TabType>("visao-geral");

  const tabs = [
    {
      id: "visao-geral" as TabType,
      label: "Visão Geral",
      icon: LayoutGrid,
      description: "Estrutura física das casas e alojamentos",
    },
    {
      id: "mapa" as TabType,
      label: "Mapa Operacional",
      icon: Map,
      description: "Gestão interativa de alocações e riscos",
    },
  ];

  return (
    <div>
      {/* Header com título */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Building2 className="text-indigo-600" size={36} />
          Estrutura & Mapa Operacional
        </h1>
        <p className="text-gray-600 mt-2">
          Gerencie a estrutura física e operacional da unidade
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 bg-white rounded-xl shadow-md border border-gray-200 p-2">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = abaAtiva === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setAbaAtiva(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg
                  transition-all duration-200 font-semibold
                  ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                  }
                `}
              >
                <Icon size={20} />
                <div className="text-left">
                  <div className="text-sm font-bold">{tab.label}</div>
                  <div
                    className={`text-xs ${
                      isActive ? "text-indigo-100" : "text-gray-500"
                    }`}
                  >
                    {tab.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {abaAtiva === "visao-geral" && (
          <VisaoGeralTab casas={casas} totalAlojamentos={totalAlojamentos} />
        )}
        {abaAtiva === "mapa" && <MapaOperacionalTab />}
      </div>
    </div>
  );
}
