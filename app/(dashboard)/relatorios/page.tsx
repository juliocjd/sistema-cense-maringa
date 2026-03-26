export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  FileText,
  LucideIcon,
  Shield,
  Users,
} from "lucide-react";

import RelatorioImpactoModalTrigger from "@/components/conflitos/relatorio-impacto-modal-trigger";
import RelatorioAfiliacoesModalTrigger from "@/components/conflitos/relatorio-afiliacoes-modal";
import { RelatorioHistoricoModalTrigger } from "@/components/relatorios/relatorio-historico-modal";
import { RelatorioTransferenciaModalTrigger } from "@/components/relatorios/relatorio-transferencia-modal";
import { RelatorioVisitasModalTrigger } from "@/components/relatorios/relatorio-visitas-modal";
import { RelatorioFase3ModalTrigger } from "@/components/relatorios/relatorio-fase3-modal";
import { RelatorioInterdicoesModalTrigger } from "@/components/relatorios/relatorio-interdicoes-modal";
import { RelatorioProcessoSocioeducativoModalTrigger } from "@/components/relatorios/relatorio-processo-socioeducativo-modal";
import { calcularImpactosExternos } from "@/lib/inteligencia/conflitos";

export default async function RelatoriosPage() {
  const impactoResumo = await calcularImpactosExternos();
  const cards: Array<{
    id: string;
    tone: "indigo" | "orange" | "emerald" | "slate";
    label: string;
    icon: LucideIcon;
    title: string;
    description: string;
    action: ReactNode;
  }> = [
    {
      id: "visitas",
      tone: "indigo",
      label: "Visitas",
      icon: Users,
      title: "Relatório de Visitas",
      description:
        "Escolha o intervalo desejado e, se necessário, filtre por um adolescente específico antes de exportar o PDF ou Excel.",
      action: <RelatorioVisitasModalTrigger />,
    },
    {
      id: "impacto",
      tone: "orange",
      label: "Inteligencia",
      icon: AlertTriangle,
      title: "Internos impactados por Conflitos Externos",
      description:
        "Gere a lista atualizada de adolescentes afetados por conflitos territoriais ou de facção e exporte em PDF.",
      action: <RelatorioImpactoModalTrigger resumo={impactoResumo} />,
    },
    {
      id: "afiliacoes",
      tone: "emerald",
      label: "Inteligencia",
      icon: ClipboardList,
      title: "Relação de Internos por Facção ou Região",
      description:
        "Consulte rapidamente os adolescentes conforme facções ou origem territorial, com filtros por status.",
      action: <RelatorioAfiliacoesModalTrigger />,
    },
    {
      id: "historico",
      tone: "slate",
      label: "Planejamento",
      icon: Activity,
      title: "Relatório de conflitos e alertas por adolescente",
      description:
        "Documento completo mostrando o histórico de conflitos e alertas para subsidiar decisões sobre desinternação.",
      action: <RelatorioHistoricoModalTrigger />,
    },
    {
      id: "processo-socioeducativo",
      tone: "slate",
      label: "Planejamento",
      icon: FileText,
      title: "Historico do processo socioeducativo",
      description:
        "Consolida mes a mes comunicados, conflitos e alertas sem duplicidade (CI como evento mestre), incluindo envolvidos desinternados.",
      action: <RelatorioProcessoSocioeducativoModalTrigger />,
    },
    {
      id: "transferencia",
      tone: "slate",
      label: "Planejamento",
      icon: Activity,
      title: "Relatório de pedido de transferência judicial",
      description:
        "Justificativa detalhada quando não ha possibilidade de permanência do adolescente na Unidade.",
      action: <RelatorioTransferenciaModalTrigger />,
    },
    {
      id: "fase3",
      tone: "slate",
      label: "Planejamento",
      icon: Shield,
      title: "Analise para Casa 08 (Fase 3)",
      description:
        "Cruza conflitos, alertas e risco de fuga para avaliar se o adolescente pode ingressar na Casa 08 e gera um PDF com os achados.",
      action: <RelatorioFase3ModalTrigger />,
    },
    {
      id: "interdicoes",
      tone: "slate",
      label: "Estrutura",
      icon: AlertTriangle,
      title: "Alojamentos interditados",
      description:
        "Lista os alojamentos atualmente interditados com justificativa, tipo de documento e referencia vinculada em um PDF organizado.",
      action: <RelatorioInterdicoesModalTrigger />,
    },
  ];

  const toneStyles: Record<
    (typeof cards)[number]["tone"],
    { border: string; badge: string; badgeText: string }
  > = {
    indigo: {
      border: "border-indigo-100",
      badge: "bg-indigo-50",
      badgeText: "text-indigo-600",
    },
    orange: {
      border: "border-orange-100",
      badge: "bg-orange-50",
      badgeText: "text-orange-600",
    },
    emerald: {
      border: "border-emerald-100",
      badge: "bg-emerald-50",
      badgeText: "text-emerald-600",
    },
    slate: {
      border: "border-slate-200",
      badge: "bg-slate-100",
      badgeText: "text-slate-600",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft size={20} />
            Voltar para Dashboard
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-3 text-white shadow-lg">
              <FileText size={36} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Central de Relatorios
              </h1>
              <p className="text-gray-600">
                Gere rapidamente os principais relatorios operacionais do CENSE.
              </p>
            </div>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          {cards.map((card) => {
            const tone = toneStyles[card.tone];
            const Icon = card.icon;

            return (
              <article
                key={card.id}
                className={`flex h-full flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm ${tone.border}`}
              >
                <div>
                  <div
                    className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tone.badge} ${tone.badgeText}`}
                  >
                    <Icon size={14} />
                    {card.label}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm text-gray-600">
                    {card.description}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-end">
                  {card.action}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
