"use server";

import { prisma } from "@/lib/prisma";
import FormTecnico from "@/components/tecnicos/form-tecnico";

async function buscarTecnicos() {
  return prisma.tecnicoReferencia.findMany({
    orderBy: { nome: "asc" },
  });
}

export default async function TecnicosPage() {
  const tecnicos = await buscarTecnicos();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-indigo-500">
            Gestao de tecnicos de referencia
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Tecnicos de referencia
          </h1>
        </header>

        <div className="grid gap-6 md:grid-cols-[1.3fr,0.7fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Tecnicos cadastrados</h2>
              <p className="text-sm text-slate-500">
                Atualize os dados conforme as operacoes.
              </p>
            </div>
            <div className="space-y-3">
              {tecnicos.map((tecnico) => (
                <div
                  key={tecnico.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-sm uppercase tracking-wide text-indigo-500">
                    {tecnico.atividade ?? "Tecnico"}
                  </p>
                  <p className="text-xl font-bold text-slate-900">{tecnico.nome}</p>
                  <p className="text-sm text-slate-600">{tecnico.email}</p>
                  {tecnico.telefone && (
                    <p className="text-xs text-slate-500 mt-1">Tel: {tecnico.telefone}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <FormTecnico />
        </div>
      </div>
    </div>
  );
}
