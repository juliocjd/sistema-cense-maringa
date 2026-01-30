"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building, MapPin, Pencil, Trash2, XCircle } from "lucide-react";

import { CatalogoBairro } from "@/types/inteligencia";
import type { CidadeCatalogo } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { ESTADOS_BRASIL } from "@/lib/geo/estados";

interface CatalogoBairrosCardProps {
  bairros: CatalogoBairro[];
}

const estadoInicial = { nome: "", cidadeId: "" };

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
  const [cidades, setCidades] = useState<CidadeCatalogo[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
  const [erroCidades, setErroCidades] = useState<string | null>(null);
  const [modalNovaCidade, setModalNovaCidade] = useState<{
    aberto: boolean;
    nome: string;
    estado: string;
    salvando: boolean;
    erro: string | null;
  }>({
    aberto: false,
    nome: "",
    estado: "PR",
    salvando: false,
    erro: null,
  });

  const totalCidades = useMemo(() => {
    const cidadesSet = new Set(
      bairros.map((bairro) => bairro.cidadeId ?? bairro.cidade)
    );
    return cidadesSet.size;
  }, [bairros]);

  useEffect(() => {
    let ativo = true;
    const carregarCidades = async () => {
      setCarregandoCidades(true);
      try {
        const resposta = await fetch("/api/cidades");
        if (!resposta.ok) {
          throw new Error("Falha ao carregar cidades");
        }
        const payload = await resposta.json().catch(() => null);
        if (!ativo) return;
        const lista = Array.isArray(payload?.cidades) ? payload.cidades : [];
        setCidades(lista);
        setErroCidades(null);
      } catch (error) {
        if (!ativo) return;
        setErroCidades("Nao foi possivel carregar as cidades.");
      } finally {
        if (ativo) {
          setCarregandoCidades(false);
        }
      }
    };

    carregarCidades();
    return () => {
      ativo = false;
    };
  }, []);

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
        cidadeId: form.cidadeId,
      };

      if (!payload.nomeBairro || !payload.cidadeId) {
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

  const abrirModalNovaCidade = () => {
    setModalNovaCidade({
      aberto: true,
      nome: "",
      estado: "PR",
      salvando: false,
      erro: null,
    });
  };

  const fecharModalNovaCidade = () => {
    setModalNovaCidade({
      aberto: false,
      nome: "",
      estado: "PR",
      salvando: false,
      erro: null,
    });
  };

  const salvarNovaCidade = async () => {
    if (modalNovaCidade.salvando) return;
    const nome = modalNovaCidade.nome.trim();
    const estado = modalNovaCidade.estado.trim().toUpperCase();

    if (nome.length < 2) {
      setModalNovaCidade((prev) => ({
        ...prev,
        erro: "Informe o nome da cidade.",
      }));
      return;
    }

    setModalNovaCidade((prev) => ({ ...prev, salvando: true, erro: null }));
    try {
      const resposta = await fetch("/api/cidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, estado }),
      });
      const payload = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        throw new Error(payload?.erro ?? "Erro ao cadastrar cidade");
      }

      const novaCidade: CidadeCatalogo = {
        id: payload.id,
        nome: payload.nome ?? nome,
        estado: payload.estado ?? estado,
      };

      setCidades((prev) =>
        [...prev, novaCidade].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR")
        )
      );
      setForm((prev) => ({ ...prev, cidadeId: novaCidade.id }));
      fecharModalNovaCidade();
    } catch (error) {
      setModalNovaCidade((prev) => ({
        ...prev,
        salvando: false,
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao cadastrar cidade",
      }));
    }
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
          <div className="mt-1 flex gap-2">
            <select
              value={form.cidadeId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, cidadeId: event.target.value }))
              }
              disabled={!podeGerenciar || carregandoCidades}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">
                {carregandoCidades ? "Carregando cidades..." : "Selecione"}
              </option>
              {cidades.map((cidade) => (
                <option key={cidade.id} value={cidade.id}>
                  {cidade.nome} - {cidade.estado}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={abrirModalNovaCidade}
              disabled={!podeGerenciar}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              Nova cidade
            </button>
          </div>
          {erroCidades && (
            <p className="mt-1 text-xs text-rose-600">{erroCidades}</p>
          )}
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
                  {bairro.cidade}
                  {bairro.estado ? ` - ${bairro.estado}` : ""} •{" "}
                  {bairro.totalAdolescentes ?? 0} adolescente(s)
                </p>
              </div>
              <div className="flex gap-2 text-slate-400">
                <button
                  type="button"
                  onClick={() => {
                    setEditandoId(bairro.id);
                    setForm({
                      nome: bairro.nome,
                      cidadeId: bairro.cidadeId ?? "",
                    });
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
      {modalNovaCidade.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Cadastrar nova cidade
            </h3>
            <p className="text-sm text-slate-500">
              Informe o nome da cidade e selecione o estado.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Nome da cidade
                </label>
                <input
                  type="text"
                  value={modalNovaCidade.nome}
                  onChange={(event) =>
                    setModalNovaCidade((prev) => ({
                      ...prev,
                      nome: event.target.value,
                      erro: null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex.: Maringa"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Estado
                </label>
                <select
                  value={modalNovaCidade.estado}
                  onChange={(event) =>
                    setModalNovaCidade((prev) => ({
                      ...prev,
                      estado: event.target.value,
                      erro: null,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  {ESTADOS_BRASIL.map((estado) => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.sigla} - {estado.nome}
                    </option>
                  ))}
                </select>
              </div>
              {modalNovaCidade.erro && (
                <p className="text-sm text-rose-600">{modalNovaCidade.erro}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharModalNovaCidade}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                disabled={modalNovaCidade.salvando}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarNovaCidade}
                disabled={modalNovaCidade.salvando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {modalNovaCidade.salvando ? "Salvando..." : "Salvar cidade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
