"use client";

import { Suspense } from "react";
import { Building2, BarChart3 } from "lucide-react";
import Link from "next/link";
import { VisaoGeralTab } from "./visao-geral-tab";

type EstruturaTabsProps = {
  casas: any[];
  totalAlojamentos: number;
};

export function EstruturaTabsComponent({
  casas,
  totalAlojamentos,
}: EstruturaTabsProps) {
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

      <div className="min-h-[600px]">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-gray-500">
              Carregando estrutura...
            </div>
          }
        >
          <VisaoGeralTab casas={casas} totalAlojamentos={totalAlojamentos} />
        </Suspense>
      </div>
    </div>
  );
}
