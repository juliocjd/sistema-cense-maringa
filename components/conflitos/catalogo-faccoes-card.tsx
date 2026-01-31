"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, UsersRound, Pencil, Trash2, XCircle } from "lucide-react";

import { CatalogoFaccao } from "@/types/inteligencia";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

interface CatalogoFaccoesCardProps {
  faccoes: CatalogoFaccao[];
  compact?: boolean;
}

const estadoInicial = { nome: "", descricao: "" };

export default function CatalogoFaccoesCard({
  faccoes,
  compact = false,
}: CatalogoFaccoesCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const podeGerenciar = useMemo(
    () => hasPermission(user?.permissions, PERMISSIONS.CONFLITOS_EXTERNOS_MANAGE),
    [user?.permissions]
  );
  const [form, setForm] = useState(estadoInicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!podeGerenciar) {
      return;
    }
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
        throw new Error("Informe o nome da facção.");
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
        throw new Error(body?.erro ?? "Erro ao salvar facção");
      }

      setMensagem(
        editandoId ? "Facção atualizada." : "Facção cadastrada com sucesso."
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
    if (loading || !podeGerenciar) return;
    const confirmar = window.confirm(
      "Remover a facção selecionada? Essa opcao so e permitida quando nao ha adolescentes vinculados."
    );
    if (!confirmar) return;

    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const resposta = await fetch(`/api/faccoes/${id}`, { method: "DELETE" });
      if (!resposta.ok) {
        const body = await resposta.json().catch(() => null);
        throw new Error(body?.erro ?? "Erro ao remover facção");
      }
      router.refresh();
    } catch (error) {
      setErro((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const containerClass = compact
    ? "space-y-4"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
  const headerClass = compact ? "mb-3" : "mb-4";
  const titleClass = compact
    ? "text-lg font-semibold text-slate-900"
    : "text-xl font-semibold text-slate-900";

  return (
    <section className={containerClass}>
      <header className={headerClass}>
        <p className="text-xs uppercase tracking-wide text-indigo-500">
          Catálogo de facções monitoradas
        </p>
        <h3 className={titleClass}>
          {faccoes.length} Facções cadastradas
        </h3>
        {!podeGerenciar && (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            Acesso somente leitura: edicao de facções bloqueada.
          </p>
        )}
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
            disabled={!podeGerenciar}
            placeholder="Ex.: PCC"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Observação
          </label>
          <textarea
            value={form.descricao}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, descricao: event.target.value }))
            }
            disabled={!podeGerenciar}
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
            disabled={loading || !podeGerenciar}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {editandoId ? "Salvar alteracoes" : "Cadastrar facção"}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={cancelarEdicao}
              disabled={!podeGerenciar}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
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
            Nenhuma facção cadastrada no momento.
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
                  disabled={!podeGerenciar}
                  className="rounded-full border border-transparent p-1 hover:border-slate-200 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Editar Facção"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remover(faccao.id)}
                  disabled={!podeGerenciar}
                  className="rounded-full border border-transparent p-1 hover:border-rose-200 hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remover Facção"
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
