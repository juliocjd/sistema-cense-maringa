"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, UsersRound, Pencil, Trash2, XCircle } from "lucide-react";

import { CatalogoFaccao } from "@/types/inteligencia";

interface CatalogoFaccoesCardProps {
  faccoes: CatalogoFaccao[];
}

const estadoInicial = { nome: "", descricao: "" };

export default function CatalogoFaccoesCard({
  faccoes,
}: CatalogoFaccoesCardProps) {
  const router = useRouter();
  const [form, setForm] = useState(estadoInicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setErro(null);
    setMensagem(null);

    try {
      const nomeFaccao = form.nome.trim();
      const descricaoNormalizada = form.descricao.trim();
      const payload = {
        nomeFaccao,
        descricao: descricaoNormalizada.length > 0 ? descricaoNormalizada : null,
      };

      if (!nomeFaccao) {
        throw new Error("Informe o nome da faccao.");
      }

      const endpoint = editandoId
        ? `/api/faccoes/${editandoId}`
        : "/api/faccoes";
      const method = editandoId ? "PUT" : "POST";

      const resposta = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resposta.ok) {
        const body = await resposta.json().catch(() => null);
        throw new Error(body?.erro ?? "Erro ao salvar faccao");
      }

      setMensagem(
        editandoId ? "Faccao atualizada." : "Faccao cadastrada com sucesso."
      );
      setForm(estadoInicial);
      setEditandoId(null);
      router.refresh();
    } catch (error) {
      setErro((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setForm(estadoInicial);
    setErro(null);
  };

  const remover = async (id: string) => {
    if (loading) return;
    const confirmar = window.confirm(
      "Remover a faccao selecionada? Essa opcao so e permitida quando nao ha adolescentes vinculados."
    );
    if (!confirmar) return;

    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const resposta = await fetch(`/api/faccoes/${id}`, { method: "DELETE" });
      if (!resposta.ok) {
        const body = await resposta.json().catch(() => null);
        throw new Error(body?.erro ?? "Erro ao remover faccao");
      }
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
          Catalogo de faccoes monitoradas
        </p>
        <h3 className="text-xl font-semibold text-slate-900">
          {faccoes.length} faccao(oes) cadastradas
        </h3>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Nome
          </label>
          <input
            type="text"
            value={form.nome}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, nome: event.target.value }))
            }
            placeholder="Ex.: PCC"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Observacao
          </label>
          <textarea
            value={form.descricao}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, descricao: event.target.value }))
            }
            rows={2}
            placeholder="Resumo ou fonte da informacao"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        {erro && <p className="text-xs text-rose-600">{erro}</p>}
        {mensagem && <p className="text-xs text-emerald-600">{mensagem}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {editandoId ? "Salvar alteracoes" : "Cadastrar faccao"}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={cancelarEdicao}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
            >
              <XCircle size={14} />
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="mt-5 max-h-48 space-y-3 overflow-y-auto pr-1">
        {faccoes.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma faccao cadastrada no momento.
          </p>
        ) : (
          faccoes.map((faccao) => (
            <div
              key={faccao.id}
              className="flex items-start justify-between rounded-xl border border-slate-100 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                  <Shield size={14} className="text-slate-400" />
                  {faccao.nome}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <UsersRound size={12} />
                  {faccao.totalAdolescentes ?? 0} adolescente(s)
                </p>
                {faccao.descricao && (
                  <p className="mt-1 text-xs text-slate-500">
                    {faccao.descricao}
                  </p>
                )}
              </div>
              <div className="flex gap-2 text-slate-400">
                <button
                  type="button"
                  onClick={() => {
                    setEditandoId(faccao.id);
                    setForm({
                      nome: faccao.nome,
                      descricao: faccao.descricao ?? "",
                    });
                    setErro(null);
                    setMensagem(null);
                  }}
                  className="rounded-full border border-transparent p-1 hover:border-slate-200 hover:text-slate-600"
                  title="Editar faccao"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remover(faccao.id)}
                  className="rounded-full border border-transparent p-1 hover:border-rose-200 hover:text-rose-600"
                  title="Remover faccao"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
