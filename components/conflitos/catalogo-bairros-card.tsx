"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building, MapPin, Pencil, Trash2, XCircle } from "lucide-react";

import { CatalogoBairro } from "@/types/inteligencia";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

interface CatalogoBairrosCardProps {
  bairros: CatalogoBairro[];
}

const estadoInicial = { nome: "", cidade: "" };

export default function CatalogoBairrosCard({
  bairros,
}: CatalogoBairrosCardProps) {
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

  const totalCidades = useMemo(() => {
    const cidades = new Set(bairros.map((bairro) => bairro.cidade));
    return cidades.size;
  }, [bairros]);

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
      const payload = {
        nomeBairro: form.nome.trim(),
        cidade: form.cidade.trim(),
      };

      if (!payload.nomeBairro || !payload.cidade) {
        throw new Error("Informe nome e cidade.");
      }

      const endpoint = editandoId
        ? `/api/bairros/${editandoId}`
        : "/api/bairros";
      const method = editandoId ? "PUT" : "POST";

      const resposta = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resposta.ok) {
        const body = await resposta.json().catch(() => null);
        throw new Error(body?.erro ?? "Erro ao salvar bairro");
      }

      setMensagem(
        editandoId ? "Bairro atualizado." : "Bairro cadastrado com sucesso."
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
      "Confirma a exclusao deste bairro? Essa operacao so e permitida quando nao ha vinculacoes ativas."
    );
    if (!confirmar) return;

    setLoading(true);
    setErro(null);
    setMensagem(null);
    try {
      const resposta = await fetch(`/api/bairros/${id}`, {
        method: "DELETE",
      });
      if (!resposta.ok) {
        const body = await resposta.json().catch(() => null);
        throw new Error(body?.erro ?? "Erro ao remover bairro");
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
          Catalogo de bairros monitorados
        </p>
        <h3 className="text-xl font-semibold text-slate-900">
          Regioes mapeadas ({bairros.length}) • {totalCidades} cidades
        </h3>
        {!podeGerenciar && (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            Acesso somente leitura: edicao de bairros bloqueada.
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Nome do bairro
          </label>
          <input
            type="text"
            value={form.nome}
            onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
            disabled={!podeGerenciar}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
            placeholder="Ex.: Zona 7"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Cidade
          </label>
          <input
            type="text"
            value={form.cidade}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, cidade: event.target.value }))
            }
            disabled={!podeGerenciar}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
            placeholder="Ex.: Maringa"
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
            {editandoId ? "Salvar alteracoes" : "Cadastrar bairro"}
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

      <div className="mt-5 max-h-60 space-y-3 overflow-y-auto pr-1">
        {bairros.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum bairro cadastrado.</p>
        ) : (
          bairros.map((bairro) => (
            <div
              key={bairro.id}
              className="flex items-start justify-between rounded-xl border border-slate-100 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                  <Building size={14} className="text-slate-400" />
                  {bairro.nome}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin size={12} />
                  {bairro.cidade} • {bairro.totalAdolescentes ?? 0} adolescente(s)
                </p>
              </div>
              <div className="flex gap-2 text-slate-400">
                <button
                  type="button"
                  onClick={() => {
                    setEditandoId(bairro.id);
                    setForm({ nome: bairro.nome, cidade: bairro.cidade });
                    setErro(null);
                    setMensagem(null);
                  }}
                  disabled={!podeGerenciar}
                  className="rounded-full border border-transparent p-1 hover:border-slate-200 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Editar bairro"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remover(bairro.id)}
                  disabled={!podeGerenciar}
                  className="rounded-full border border-transparent p-1 hover:border-rose-200 hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remover bairro"
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
