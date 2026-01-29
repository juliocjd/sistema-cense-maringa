"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  listarConflitosExternos,
  calcularImpactosExternos,
} from "@/lib/inteligencia/conflitos";
import PainelConflitos from "@/components/conflitos/painel-conflitos";
import FormConflito from "@/components/conflitos/form-conflito";
import CatalogoBairrosCard from "@/components/conflitos/catalogo-bairros-card";
import CatalogoFaccoesCard from "@/components/conflitos/catalogo-faccoes-card";
import RelatorioImpactoModalTrigger from "@/components/conflitos/relatorio-impacto-modal-trigger";
import RelatorioAfiliacoesModalTrigger from "@/components/conflitos/relatorio-afiliacoes-modal";
import { CatalogoBairro, CatalogoFaccao } from "@/types/inteligencia";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

async function buscarCatalogoBairros(): Promise<CatalogoBairro[]> {
  const bairros = await prisma.bairro.findMany({
    select: {
      id: true,
      nomeBairro: true,
      cidade: true,
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
    totalAdolescentes: bairro.adolescentes.length,
  }));
}

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

type PageProps = {
  searchParams?: Promise<{
    conflitoId?: string;
  }>;
};

export default async function InteligenciaConflitos({
  searchParams,
}: PageProps) {
  const session = await auth().catch(() => null);
  const permissoes = session?.user?.permissions ?? [];
  if (!hasPermission(permissoes, PERMISSIONS.CONFLITOS_EXTERNOS_VIEW)) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const conflitoIdDefault = resolvedSearchParams?.conflitoId ?? null;
  const [bairros, faccoes, conflitos, impactoResumo] = await Promise.all([
    buscarCatalogoBairros(),
    buscarCatalogoFaccoes(),
    listarConflitosExternos("ATIVO"),
    calcularImpactosExternos(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-widest text-indigo-500">
              Inteligencia Operacional
            </p>
            <h1 className="text-3xl font-bold text-slate-900">Conflitos Externos</h1>
            <p className="text-sm text-slate-600">
              Painel preventivo para mapear conflitos entre bairros e faccoes antes da alocacao de adolescentes.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <RelatorioAfiliacoesModalTrigger />
            <RelatorioImpactoModalTrigger
              resumo={impactoResumo}
              conflitoIdDefault={conflitoIdDefault}
            />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
          <PainelConflitos conflitos={conflitos} impactoResumo={impactoResumo} />
          <div className="space-y-6">
            <FormConflito bairros={bairros} faccoes={faccoes} />
            <CatalogoBairrosCard bairros={bairros} />
            <CatalogoFaccoesCard faccoes={faccoes} />
          </div>
        </div>
      </div>
    </div>
  );
}
