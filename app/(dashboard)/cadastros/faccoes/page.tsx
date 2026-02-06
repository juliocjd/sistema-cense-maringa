"use server";

import { redirect } from "next/navigation";
import { Flag } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import CatalogoFaccoesCard from "@/components/conflitos/catalogo-faccoes-card";
import type { CatalogoFaccao } from "@/types/inteligencia";

async function buscarCatalogoFaccoes(): Promise<CatalogoFaccao[]> {
  const faccoes = await prisma.faccao.findMany({
    select: {
      id: true,
      nomeFaccao: true,
      descricao: true,
      adolescentes: {
        where: { statusUnidade: "ATIVO" },
        select: { id: true },
      },
    },
    orderBy: { nomeFaccao: "asc" },
  });

  return faccoes.map((faccao) => ({
    id: faccao.id,
    nome: faccao.nomeFaccao,
    descricao: faccao.descricao,
    totalAdolescentes: faccao.adolescentes.length,
  }));
}

export default async function CadastroFaccoesPage() {
  const session = await auth().catch(() => null);
  const permissoes = session?.user?.permissions ?? [];
  if (!hasPermission(permissoes, PERMISSIONS.CONFLITOS_EXTERNOS_VIEW)) {
    redirect("/dashboard");
  }

  const faccoes = await buscarCatalogoFaccoes();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-red-600">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Flag size={24} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Cadastro de Facções
              </h1>
              <p className="text-gray-600">
                Catálogo de facções monitoradas para conflitos externos.
              </p>
            </div>
          </div>
        </div>

        <CatalogoFaccoesCard faccoes={faccoes} />
      </div>
    </div>
  );
}
