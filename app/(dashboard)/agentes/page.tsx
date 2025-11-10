"use server";

import { prisma } from "@/lib/prisma";
import FormAgente from "@/components/agentes/form-agente";

async function buscarAgentes() {
  return prisma.agenteProfissional.findMany({
    orderBy: { nome: "asc" },
  });
}

export default async function AgentesPage() {
  const agentes = await buscarAgentes();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-indigo-500">
            Gestão de agentes
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Agentes profissionais
          </h1>
        </header>

        <div className="grid gap-6 md:grid-cols-[1.3fr,0.7fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Agentes cadastrados</h2>
              <p className="text-sm text-slate-500">Atualize os dados conforme as operações.</p>
            </div>
            <div className="space-y-3">
              {agentes.map((agente) => (
                <div
                  key={agente.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-sm uppercase tracking-wide text-indigo-500">
                    {agente.atividade ?? "Agente"}
                  </p>
                  <p className="text-xl font-bold text-slate-900">{agente.nome}</p>
                  <p className="text-sm text-slate-600">{agente.email}</p>
                  {agente.telefone && (
                    <p className="text-xs text-slate-500 mt-1">Tel: {agente.telefone}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <FormAgente onSucesso={() => {}} />
        </div>
      </div>
    </div>
  );
}
