"use server";

import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import CatalogoBairrosCard from "@/components/conflitos/catalogo-bairros-card";
import type { CatalogoBairro } from "@/types/inteligencia";

async function buscarCatalogoBairros(): Promise<CatalogoBairro[]> {
  const bairros = await prisma.bairro.findMany({
    select: {
      id: true,
      nomeBairro: true,
      cidade: true,
      cidadeId: true,
      cidadeCatalogo: { select: { estado: true } },
      adolescentes: {
        where: { statusUnidade: "ATIVO" },
        select: { id: true },
      },
    },
    orderBy: [{ cidade: "asc" }, { nomeBairro: "asc" }],
  });

  return bairros.map((bairro) => ({
    id: bairro.id,
    nome: bairro.nomeBairro,
    cidade: bairro.cidade,
    cidadeId: bairro.cidadeId ?? undefined,
    estado: bairro.cidadeCatalogo?.estado ?? null,
    totalAdolescentes: bairro.adolescentes.length,
  }));
}

export default async function CadastroBairrosPage() {
  const session = await auth().catch(() => null);
  const permissoes = session?.user?.permissions ?? [];
  if (!hasPermission(permissoes, PERMISSIONS.CONFLITOS_EXTERNOS_VIEW)) {
    redirect("/dashboard");
  }

  const bairros = await buscarCatalogoBairros();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-red-600">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <MapPin size={24} className="text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Cadastro de Bairros
              </h1>
              <p className="text-gray-600">
                Catálogo de regioes monitoradas para conflitos externos.
              </p>
            </div>
          </div>
        </div>

        <CatalogoBairrosCard bairros={bairros} />
      </div>
    </div>
  );
}
