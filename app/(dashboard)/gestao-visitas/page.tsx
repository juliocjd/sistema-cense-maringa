import Link from "next/link";
import { Mail, Shield, Settings, ClipboardList, ArrowRight, FileText } from "lucide-react";

const gestaoLinks = [
  {
    title: "E-mail Visitantes",
    description: "Configure modelos, remetentes e fluxo de disparos automáticos.",
    href: "/configuracoes/email",
    icon: Mail,
    accent: "from-indigo-50 to-white border-indigo-100",
  },
  {
    title: "Configuração LGPD",
    description: "Gerencie consentimentos, termos e o ciclo de retenção de dados.",
    href: "/configuracoes/lgpd",
    icon: Shield,
    accent: "from-emerald-50 to-white border-emerald-100",
  },
  {
    title: "Config. de Visitas",
    description: "Ajuste regras de agendamento, limites e parâmetros operacionais.",
    href: "/configuracoes/visitas",
    icon: Settings,
    accent: "from-amber-50 to-white border-amber-100",
  },
  {
    title: "Relatório de Visitas",
    description: "Gere indicadores consolidados de fluxo, tempo médio e restrições aplicadas.",
    href: "/relatorios",
    icon: FileText,
    accent: "from-slate-50 to-white border-slate-200",
  },
];

export default function GestaoVisitasPage() {
  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-500">Visitantes</p>
            <h1 className="mt-4 text-4xl font-bold text-gray-900 lg:text-5xl">Gestão Integrada de Visitas</h1>
            <p className="mt-4 text-base text-gray-600 lg:text-lg">
              Centralize as principais configurações e mantenha o fluxo de visitas alinhado às políticas da instituição.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/relatorios"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition"
              >
                <FileText size={18} />
                Relatório de Visitas
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-6 text-sm text-indigo-900 max-w-md shadow-sm">
            <p className="font-semibold text-indigo-700">Dica</p>
            <p className="mt-2">
              Utilize esta central antes de grandes eventos ou mutirões para garantir que templates de comunicação, termos LGPD e
              parâmetros operacionais estejam atualizados.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        {gestaoLinks.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`rounded-3xl border bg-gradient-to-br p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${item.accent}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-900">
                  <Icon size={24} />
                </div>
                <ClipboardList className="text-gray-300" size={32} />
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-gray-900">{item.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{item.description}</p>
              <Link
                href={item.href}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Acessar
                <ArrowRight size={18} />
              </Link>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900">Checklist Operacional</h3>
          <ul className="mt-4 space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
              Revise semanalmente os modelos de e-mail para garantir alinhamento com a comunicação institucional.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
              Valide consentimentos LGPD sempre que houver atualização de termos ou novas políticas.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
              Ajuste regras de visitação antes de períodos de alta demanda para evitar filas e sobreposição de horários.
            </li>
          </ul>
        </div>
        <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900">Integração com Portaria</h3>
          <p className="mt-3 text-sm text-gray-600">
            Toda alteração realizada aqui impacta diretamente o fluxo operacional executado na Portaria. Utilize esta central como o
            ponto de partida antes de liberar novas campanhas de comunicação, revisões de privacidade ou ajustes de regra.
          </p>
          <div className="mt-6 rounded-2xl bg-white px-4 py-3 text-sm text-gray-600 border border-gray-100">
            Última atualização recomendada: <span className="font-semibold text-gray-900">há 3 dias</span>
          </div>
          <Link
            href="/portaria"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Ir para Portaria
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}


