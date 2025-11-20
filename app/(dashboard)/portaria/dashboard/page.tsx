"use client";

import { Monitor, ArrowLeft, UserPlus, FileText, Settings } from "lucide-react";
import { ListaVisitasAtivas } from "@/components/portaria/lista-visitas-ativas";
import { EstatisticasDia } from "@/components/portaria/estatisticas-dia";
import Link from "next/link";

export default function DashboardPortariaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/portaria"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium mb-4"
          >
            <ArrowLeft size={20} />
            Voltar para Portaria
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
              <Monitor className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard de Portaria
              </h1>
              <p className="text-gray-600 mt-1">
                Monitoramento em tempo real das visitas
              </p>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="mb-6">
          <EstatisticasDia />
        </div>

        {/* Ações Rápidas */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Acesso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/visitantes"
              className="flex items-center gap-3 p-4 bg-white rounded-lg shadow hover:shadow-md transition-all border border-gray-200 hover:border-indigo-300"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Cadastrar Visitante</p>
                <p className="text-xs text-gray-600">Gerenciar visitantes</p>
              </div>
            </Link>

            <Link
              href="/relatorios"
              className="flex items-center gap-3 p-4 bg-white rounded-lg shadow hover:shadow-md transition-all border border-gray-200 hover:border-green-300"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Relatórios</p>
                <p className="text-xs text-gray-600">Exportar visitas</p>
              </div>
            </Link>

            <Link
              href="/configuracoes/visitas"
              className="flex items-center gap-3 p-4 bg-white rounded-lg shadow hover:shadow-md transition-all border border-gray-200 hover:border-purple-300"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <Settings size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Configurações</p>
                <p className="text-xs text-gray-600">Regras de visitas</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Visitas Ativas */}
        <ListaVisitasAtivas />
      </div>
    </div>
  );
}
