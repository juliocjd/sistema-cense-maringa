"use client";

import { useState } from "react";

type Tipo = "FACCAO" | "CI" | "PESSOAL";

interface Props {
  adolescentes: { id: string; nome: string }[];
  onSucesso?: () => void;
}

export default function FormConflitoInterno({
  adolescentes,
  onSucesso,
}: Props) {
  const [adolescenteA, setAdolescenteA] = useState("");
  const [adolescenteB, setAdolescenteB] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<Tipo>("PESSOAL");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const podeEnviar =
    adolescenteA &&
    adolescenteB &&
    adolescenteA !== adolescenteB &&
    descricao.trim().length >= 5;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!podeEnviar) return;
    setLoading(true);
    setErro(null);
    setSucesso(null);

    try {
      const response = await fetch("/api/conflitos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adolescenteAId: adolescenteA,
          adolescenteBId: adolescenteB,
          tipoConflito: tipo,
          descricao: descricao.trim(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Erro ao registrar conflito");
      }

      setDescricao("");
      setAdolescenteA("");
      setAdolescenteB("");
      setSucesso("Conflito registrado com sucesso.");
      onSucesso?.();
    } catch (error) {
      setErro((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-slate-900">
        Registrar conflito interno
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={adolescenteA}
          onChange={(e) => setAdolescenteA(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">Adolescente principal</option>
          {adolescentes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
        <select
          value={adolescenteB}
          onChange={(e) => setAdolescenteB(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">Adversário</option>
          {adolescentes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as Tipo)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          <option value="PESSOAL">Pessoal</option>
          <option value="FACCAO">Facção</option>
          <option value="CI">Ciência Interna</option>
        </select>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          rows={3}
          placeholder="Descreva a situação com detalhes (mín. 5 caracteres)"
        />
      </div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      {sucesso && <p className="text-xs text-emerald-600">{sucesso}</p>}
      <button
        type="submit"
        disabled={!podeEnviar || loading}
        className={`w-full rounded-lg px-3 py-2 text-sm font-semibold transition ${
          podeEnviar
            ? "bg-indigo-600 text-white hover:bg-indigo-500"
            : "bg-slate-200 text-slate-500 cursor-not-allowed"
        }`}
      >
        {loading ? "Registrando..." : "Registrar conflito interno"}
      </button>
    </form>
  );
}
