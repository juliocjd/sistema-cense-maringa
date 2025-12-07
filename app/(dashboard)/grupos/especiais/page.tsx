"use client";

import Link from "next/link";
import { Plus, UserCheck } from "lucide-react";
import { GrupoLayout } from "@/components/grupos/grupo-layout";
import { ModalGrupoEspecial } from "@/components/grupos/modal-grupo-especial";
import { ModalAdicionarMembroEspecial } from "@/components/grupos/modal-adicionar-membro-especial";
import { useEffect, useMemo, useState } from "react";

type Casa = { id: string; nome: string; numero: number };
type GrupoEspecial = {
  id: string;
  nome: string;
  tipo: string;
  descricao?: string | null;
  casas: { id: string; nome: string }[];
  membrosAtivos: number;
};

export default function GruposEspeciaisPage() {
  const [casas, setCasas] = useState<Casa[]>([]);
  const [grupos, setGrupos] = useState<GrupoEspecial[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [grupoParaAdicionar, setGrupoParaAdicionar] = useState<{
    id: string;
    nome: string;
  } | null>(null);

  useEffect(() => {
    carregarCasas();
    carregarGrupos();
  }, []);

  const carregarCasas = async () => {
    const res = await fetch("/api/casas");
    if (!res.ok) return;
    const data = await res.json();
    setCasas(data.casas ?? []);
  };

  const carregarGrupos = async () => {
    setCarregando(true);
    const res = await fetch("/api/grupos-especiais");
    if (res.ok) {
      const data = await res.json();
      setGrupos(data.grupos ?? []);
    }
    setCarregando(false);
  };

  const stats = [
    { label: "Grupos especiais", value: grupos.length },
    {
      label: "Casas envolvidas",
      value: new Set(grupos.flatMap((g) => g.casas.map((c) => c.id))).size,
    },
    {
      label: "Total de membros",
      value: grupos.reduce((acc, g) => acc + g.membrosAtivos, 0),
    },
  ];

  const actionButtons = (
    <>
      <button
        onClick={() => setModalAberto(true)}
        className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
      >
        <Plus size={16} />
        Criar grupo especial
      </button>
      <button
        onClick={() => setModalAberto(true)}
        className="inline-flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
      >
        <UserCheck size={16} />
        Adicionar adolescente
      </button>
    </>
  );

  return (
    <>
      <GrupoLayout
        title="Grupos especiais multi-casa"
        subtitle="Controle turmas específicas com o mesmo visual da gestão principal."
        actionButtons={actionButtons}
        stats={stats}
      >
        {carregando ? (
          <p className="text-sm text-gray-500">Carregando grupos...</p>
        ) : (
          <div className="space-y-3">
            {grupos.map((grupo) => (
              <div
                key={grupo.id}
                className="border border-gray-100 rounded-xl p-4 flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{grupo.nome}</h3>
                  <p className="text-xs text-gray-500">{grupo.tipo}</p>
                  <p className="text-sm text-gray-600">
                    Casas: {grupo.casas.map((c) => c.nome).join(" · ")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Membros</p>
                  <p className="text-xl font-bold text-indigo-600">
                    {grupo.membrosAtivos}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GrupoLayout>
      <ModalGrupoEspecial
        casas={casas}
        onClose={() => setModalAberto(false)}
        onSubmit={async (data) => {
          const res = await fetch("/api/grupos-especiais", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (res.ok) await carregarGrupos();
        }}
      />
      {grupoParaAdicionar && (
        <ModalAdicionarMembroEspecial
          grupoId={grupoParaAdicionar.id}
          grupoNome={grupoParaAdicionar.nome}
          onClose={() => setGrupoParaAdicionar(null)}
          onSucesso={() => {
            setGrupoParaAdicionar(null);
            carregarGrupos();
          }}
        />
      )}
    </>
  );
}
