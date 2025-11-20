"use client";

import { useState } from "react";
import { Mail, FileText, ArrowLeft } from "lucide-react";
import { PainelTemplates } from "@/components/email/painel-templates";
import { PainelNotificacoes } from "@/components/email/painel-notificacoes";
import Link from "next/link";

type Tab = "templates" | "notificacoes";

export default function ConfiguracoesEmailPage() {
  const [abaAtiva, setAbaAtiva] = useState<Tab>("templates");

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
              <Mail className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Configurações de Email
              </h1>
              <p className="text-gray-600 mt-1">
                Gerencie templates e acompanhe o envio de notificações
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md p-2 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setAbaAtiva("templates")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                abaAtiva === "templates"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FileText size={20} />
              Templates de Email
            </button>
            <button
              onClick={() => setAbaAtiva("notificacoes")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                abaAtiva === "notificacoes"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Mail size={20} />
              Histórico de Notificações
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        {abaAtiva === "templates" && <PainelTemplates />}
        {abaAtiva === "notificacoes" && <PainelNotificacoes />}
      </div>
    </div>
  );
}
