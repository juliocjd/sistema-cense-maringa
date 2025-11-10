"use client";

import { useState } from "react";

interface FormProps {
  onSucesso?: () => void;
}

export default function FormAgente({ onSucesso }: FormProps) {
  const [nome, setNome] = useState("");
  const [atividade, setAtividade] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const podeEnviar =
    nome.trim().length >= 3 && email.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!podeEnviar) return;
    setLoading(true);
    setErro(null);
    setSucesso(false);

    try {
      const response = await fetch("/api/agentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          atividade: atividade.trim() || undefined,
          email: email.trim(),
          telefone: telefone.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.erro || "Não foi possível criar o agente"
        );
      }

      setNome("");
      setAtividade("");
      setEmail("");
      setTelefone("");
      setSucesso(true);
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
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Cadastrar novo agente
        </h3>
        <span className="text-xs text-slate-500">
          Obrigatório: nome + e-mail
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome completo"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <input
          value={atividade}
          onChange={(e) => setAtividade(e.target.value)}
          placeholder="Atividade (ex: Assistente social)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email corporativo"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          type="email"
        />
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="Telefone"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>
      {erro && (
        <p className="text-sm text-red-600">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="text-sm text-emerald-600">
          Agente cadastrado com sucesso.
        </p>
      )}
      <button
        type="submit"
        disabled={!podeEnviar || loading}
        className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
          podeEnviar
            ? "bg-indigo-600 text-white hover:bg-indigo-500"
            : "bg-slate-200 text-slate-500 cursor-not-allowed"
        }`}
      >
        {loading ? "Salvando..." : "Cadastrar agente"}
      </button>
    </form>
  );
}
