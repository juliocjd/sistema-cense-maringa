"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CatalogoBairro, CatalogoFaccao } from "@/types/inteligencia";

type TipoConflito = "BAIRRO" | "FACCAO";

interface FormConflitoProps {
  bairros: CatalogoBairro[];
  faccoes: CatalogoFaccao[];
}

export default function FormConflito({
  bairros,
  faccoes,
}: FormConflitoProps) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoConflito>("BAIRRO");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [fonteInformacao, setFonteInformacao] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const opcoes = useMemo(
    () => (tipo === "BAIRRO" ? bairros : faccoes),
    [bairros, faccoes, tipo]
  );

  const fonteValida = fonteInformacao.trim().length >= 5;
  const podeSalvar =
    origem.length > 0 &&
    destino.length > 0 &&
    origem !== destino &&
    fonteValida;

  const resetar = () => {
    setOrigem("");
    setDestino("");
    setFonteInformacao("");
    setErro(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!podeSalvar || loading) {
      return;
    }

    setLoading(true);
    setErro(null);
    setMensagem(null);

    try {
      const endpoint =
        tipo === "BAIRRO"
          ? "/api/bairros/conflitos"
          : "/api/faccoes/conflitos";

      const fonteSanitizada = fonteInformacao.trim();
      const payload =
        tipo === "BAIRRO"
          ? {
              bairroAId: origem,
              bairroBId: destino,
              fonteInformacao: fonteSanitizada,
            }
          : {
              faccaoAId: origem,
              faccaoBId: destino,
              fonteInformacao: fonteSanitizada,
            };

      const resposta = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resposta.ok) {
        const body = await resposta.json().catch(() => null);
        throw new Error(body?.erro ?? "Falha ao registrar conflito");
      }

      resetar();
      setMensagem("Conflito registrado com sucesso.");
      router.refresh();
    } catch (error) {
      setErro((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-indigo-500">
          Registrar conflito externo
        </p>
        <h3 className="text-xl font-semibold text-slate-900">
          Novo conflito territorial ou faccional
        </h3>
        <p className="text-sm text-slate-500">
          A selecao de bairros usa cidade como contexto; para faccao apenas o
          nome cadastrado e exibido.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          {(["BAIRRO", "FACCAO"] as const).map((opcao) => (
            <label
              key={opcao}
              className={`flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                tipo === opcao
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <input
                type="radio"
                name="tipo-conflito"
                value={opcao}
                checked={tipo === opcao}
                onChange={() => setTipo(opcao)}
                className="sr-only"
              />
              {opcao === "BAIRRO" ? "Territorial" : "Faccao"}
            </label>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              Origem
            </label>
            <select
              value={origem}
              onChange={(event) => setOrigem(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Selecione a origem</option>
              {opcoes.map((item) => (
                <option key={item.id} value={item.id}>
                  {tipo === "BAIRRO"
                    ? `${item.nome} — ${"cidade" in item ? item.cidade : ""}`
                    : item.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              Destino
            </label>
            <select
              value={destino}
              onChange={(event) => setDestino(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Selecione o destino</option>
              {opcoes.map((item) => (
                <option key={item.id} value={item.id}>
                  {tipo === "BAIRRO"
                    ? `${item.nome} — ${"cidade" in item ? item.cidade : ""}`
                    : item.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Fonte da informacao
          </label>
          <textarea
            value={fonteInformacao}
            onChange={(event) => setFonteInformacao(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
            placeholder="Ex: Entrevista com o adolescente Joao (CI 123/2025), materia jornalistica, comunicacao com outra unidade..."
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Descreva como a equipe teve acesso a este conflito (minimo 5 caracteres).
          </p>
        </div>

        {erro && <p className="text-xs text-rose-600">{erro}</p>}
        {mensagem && <p className="text-xs text-emerald-600">{mensagem}</p>}

        <button
          type="submit"
          disabled={!podeSalvar || loading}
          className={`w-full rounded-xl px-4 py-2 text-sm font-semibold transition ${
            podeSalvar
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {loading ? "Registrando..." : "Registrar conflito"}
        </button>
      </form>
    </section>
  );
}
