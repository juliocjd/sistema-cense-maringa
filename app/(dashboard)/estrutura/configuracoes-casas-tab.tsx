"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Loader2,
  Pencil,
  Plus,
  Power,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import {
  destinacaoOperacionalUsaPrazo,
  obterEtiquetaCasaOperacional,
} from "@/lib/casas/configuracao-operacional";
import type { Casa } from "@/types";

type ConfiguracoesCasasTabProps = {
  casas: Casa[];
};

type FaseItem = {
  id: string;
  nomeFase: string;
  ordem?: number | null;
  descricaoFase?: string | null;
  ativa: boolean;
};

type CasaFormState = {
  id: string;
  nome: string;
  numero: number;
  isolada: boolean;
  observacoes: string;
  destinacaoOperacional: string;
  faseExclusivaId: string;
  prazoMaximoDias: string;
  riscoMaximoPermitido: string;
};

type FaseFormState = {
  nomeFase: string;
  ordem: string;
  descricaoFase: string;
};

const FASE_FORM_INICIAL: FaseFormState = {
  nomeFase: "",
  ordem: "",
  descricaoFase: "",
};

const DESTINACOES = [
  { value: "PROVISORIA", label: "Internação provisória" },
  { value: "DEFINITIVA", label: "Internação definitiva" },
  { value: "FASE_EXCLUSIVA", label: "Casa exclusiva de fase" },
  { value: "ABRIGAMENTO", label: "Abrigamento" },
] as const;

const toFormState = (casa: Casa): CasaFormState => ({
  id: casa.id,
  nome: casa.nome,
  numero: casa.numero,
  isolada: Boolean(casa.isolada),
  observacoes: casa.observacoes ?? "",
  destinacaoOperacional: casa.destinacaoOperacional ?? "DEFINITIVA",
  faseExclusivaId: casa.faseExclusivaId ?? "",
  prazoMaximoDias:
    typeof casa.prazoMaximoDias === "number"
      ? String(casa.prazoMaximoDias)
      : "",
  riscoMaximoPermitido:
    typeof casa.riscoMaximoPermitido === "number"
      ? String(casa.riscoMaximoPermitido)
      : "",
});

export function ConfiguracoesCasasTab({
  casas: casasIniciais,
}: ConfiguracoesCasasTabProps) {
  const router = useRouter();
  const { user } = useAuth();
  const podeEditar = useMemo(
    () => hasPermission(user?.permissions, PERMISSIONS.ESTRUTURA_EDIT),
    [user?.permissions],
  );

  const [casas, setCasas] = useState<CasaFormState[]>(
    (casasIniciais ?? []).map(toFormState),
  );
  const [fases, setFases] = useState<FaseItem[]>([]);
  const [carregandoFases, setCarregandoFases] = useState(false);
  const [modalFasesAberto, setModalFasesAberto] = useState(false);
  const [faseEmEdicaoId, setFaseEmEdicaoId] = useState<string | null>(null);
  const [faseForm, setFaseForm] = useState<FaseFormState>(FASE_FORM_INICIAL);
  const [salvandoFase, setSalvandoFase] = useState(false);
  const [processandoFaseId, setProcessandoFaseId] = useState<string | null>(
    null,
  );
  const [casaContextoFaseId, setCasaContextoFaseId] = useState<string | null>(
    null,
  );
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setCasas((casasIniciais ?? []).map(toFormState));
  }, [casasIniciais]);

  const carregarFases = async () => {
    setCarregandoFases(true);
    try {
      const responseTodas = await fetch(
        "/api/fases-internacao?includeInactive=1",
        {
          cache: "no-store",
        },
      );
      if (!responseTodas.ok) {
        throw new Error("Falha ao carregar fases");
      }
      const data = await responseTodas.json();
      const lista = Array.isArray(data)
        ? data.map((fase: any) => ({
            id: fase.id,
            nomeFase: fase.nomeFase,
            ordem: fase.ordem ?? null,
            descricaoFase: fase.descricaoFase ?? null,
            ativa: fase.ativa !== false,
          }))
        : [];
      setFases(lista);
    } catch (error) {
      console.error(error);
      setFases([]);
    } finally {
      setCarregandoFases(false);
    }
  };

  useEffect(() => {
    carregarFases();
  }, []);

  const obterFasesDisponiveisParaCasa = (faseExclusivaId: string) =>
    fases.filter((fase) => fase.ativa || fase.id === faseExclusivaId);

  const atualizarCasa = (
    casaId: string,
    campo: keyof CasaFormState,
    valor: string | boolean,
  ) => {
    setCasas((prev) =>
      prev.map((casa) =>
        casa.id === casaId ? { ...casa, [campo]: valor } : casa,
      ),
    );
  };

  const abrirNovaFase = (casaId?: string) => {
    setCasaContextoFaseId(casaId ?? null);
    setFaseEmEdicaoId(null);
    setFaseForm(FASE_FORM_INICIAL);
    setErro(null);
    setMensagem(null);
    setModalFasesAberto(true);
  };

  const abrirGerenciarFases = () => {
    setCasaContextoFaseId(null);
    setFaseEmEdicaoId(null);
    setFaseForm(FASE_FORM_INICIAL);
    setErro(null);
    setMensagem(null);
    setModalFasesAberto(true);
  };

  const editarFase = (fase: FaseItem) => {
    setFaseEmEdicaoId(fase.id);
    setFaseForm({
      nomeFase: fase.nomeFase ?? "",
      ordem: typeof fase.ordem === "number" ? String(fase.ordem) : "",
      descricaoFase: fase.descricaoFase ?? "",
    });
  };

  const fecharModalFases = () => {
    if (salvandoFase) return;
    setModalFasesAberto(false);
    setCasaContextoFaseId(null);
    setFaseEmEdicaoId(null);
    setFaseForm(FASE_FORM_INICIAL);
  };

  const salvarFase = async () => {
    setSalvandoFase(true);
    setErro(null);
    setMensagem(null);
    try {
      const endpoint = faseEmEdicaoId
        ? `/api/fases-internacao/${faseEmEdicaoId}`
        : "/api/fases-internacao";
      const method = faseEmEdicaoId ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeFase: faseForm.nomeFase.trim(),
          ordem: faseForm.ordem ? Number(faseForm.ordem) : null,
          descricaoFase: faseForm.descricaoFase.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.erro ?? "Falha ao salvar fase");
      }

      const faseSalva = payload?.fase as FaseItem | undefined;
      await carregarFases();

      if (!faseEmEdicaoId && faseSalva?.id && casaContextoFaseId) {
        setCasas((prev) =>
          prev.map((casa) =>
            casa.id === casaContextoFaseId
              ? { ...casa, faseExclusivaId: faseSalva.id }
              : casa,
          ),
        );
      }

      setMensagem(
        faseEmEdicaoId
          ? "Fase atualizada com sucesso."
          : "Fase criada com sucesso.",
      );
      setFaseEmEdicaoId(null);
      setFaseForm(FASE_FORM_INICIAL);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar fase");
    } finally {
      setSalvandoFase(false);
    }
  };

  const alternarStatusFase = async (fase: FaseItem, ativa: boolean) => {
    setProcessandoFaseId(fase.id);
    setErro(null);
    setMensagem(null);
    try {
      const response = await fetch(`/api/fases-internacao/${fase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativa }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.erro ?? "Falha ao atualizar status da fase");
      }

      await carregarFases();
      setMensagem(
        ativa
          ? "Fase reativada com sucesso."
          : "Fase inativada com sucesso.",
      );
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar status da fase",
      );
    } finally {
      setProcessandoFaseId(null);
    }
  };

  const excluirFase = async (fase: FaseItem) => {
    const confirmar = window.confirm(
      `Confirma a exclusao da fase "${fase.nomeFase}"?`,
    );
    if (!confirmar) return;

    setProcessandoFaseId(fase.id);
    setErro(null);
    setMensagem(null);
    try {
      const response = await fetch(`/api/fases-internacao/${fase.id}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.erro ?? "Falha ao excluir fase");
      }

      await carregarFases();
      setMensagem("Fase excluida com sucesso.");
      if (faseEmEdicaoId === fase.id) {
        setFaseEmEdicaoId(null);
        setFaseForm(FASE_FORM_INICIAL);
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao excluir fase");
    } finally {
      setProcessandoFaseId(null);
    }
  };

  const salvarCasa = async (casa: CasaFormState) => {
    setSalvandoId(casa.id);
    setMensagem(null);
    setErro(null);
    try {
      const response = await fetch(`/api/casas/${casa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: casa.nome,
          isolada: casa.isolada,
          observacoes: casa.observacoes.trim() || null,
          destinacaoOperacional: casa.destinacaoOperacional,
          faseExclusivaId:
            casa.destinacaoOperacional === "FASE_EXCLUSIVA"
              ? casa.faseExclusivaId || null
              : null,
          prazoMaximoDias:
            destinacaoOperacionalUsaPrazo(casa.destinacaoOperacional) &&
            casa.prazoMaximoDias
              ? Number(casa.prazoMaximoDias)
              : null,
          riscoMaximoPermitido:
            casa.destinacaoOperacional === "FASE_EXCLUSIVA" &&
            casa.riscoMaximoPermitido
              ? Number(casa.riscoMaximoPermitido)
              : null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.erro ?? "Falha ao salvar configuracao");
      }

      const payload = await response.json().catch(() => null);
      const casaAtualizada = payload?.casa;
      if (casaAtualizada?.id) {
        setCasas((prev) =>
          prev.map((item) =>
            item.id === casaAtualizada.id
              ? {
                  ...item,
                  nome: casaAtualizada.nome ?? item.nome,
                  isolada: Boolean(casaAtualizada.isolada),
                  observacoes: casaAtualizada.observacoes ?? "",
                  destinacaoOperacional:
                    casaAtualizada.destinacao_operacional ??
                    item.destinacaoOperacional,
                  faseExclusivaId: casaAtualizada.fase_exclusiva_id ?? "",
                  prazoMaximoDias:
                    typeof casaAtualizada.prazo_maximo_dias === "number"
                      ? String(casaAtualizada.prazo_maximo_dias)
                      : "",
                  riscoMaximoPermitido:
                    typeof casaAtualizada.risco_maximo_permitido === "number"
                      ? String(casaAtualizada.risco_maximo_permitido)
                      : "",
                }
              : item,
          ),
        );
      }

      setMensagem(`Configuracao da ${casa.nome} atualizada.`);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSalvandoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
            <Settings2 size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Configuracao Operacional das Casas
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Defina por interface qual casa e provisória, definitiva, de fase
              exclusiva ou abrigamento. A regra de sugestão e relatórios passa a
              usar essa configuração.
            </p>
          </div>
        </div>
      </div>

      {!podeEditar && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Seu perfil pode visualizar, mas nao pode alterar a configuracao
          operacional das casas.
        </div>
      )}

      {mensagem && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {mensagem}
        </div>
      )}

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {carregandoFases ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando fases...
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {casas
          .slice()
          .sort((a, b) => a.numero - b.numero)
          .map((casa) => {
            const resumo = obterEtiquetaCasaOperacional({
              nome: casa.nome,
              numero: casa.numero,
              isolada: casa.isolada,
              destinacaoOperacional: casa.destinacaoOperacional,
              faseExclusivaId: casa.faseExclusivaId || null,
              faseExclusiva:
                fases.find((fase) => fase.id === casa.faseExclusivaId) ?? null,
              prazoMaximoDias: casa.prazoMaximoDias
                ? Number(casa.prazoMaximoDias)
                : null,
              riscoMaximoPermitido: casa.riscoMaximoPermitido
                ? Number(casa.riscoMaximoPermitido)
                : null,
            });

            return (
              <div
                key={casa.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {casa.nome}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Casa {String(casa.numero).padStart(2, "0")} · {resumo}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Destinação operacional
                    </label>
                    <select
                      value={casa.destinacaoOperacional}
                      onChange={(event) =>
                        atualizarCasa(
                          casa.id,
                          "destinacaoOperacional",
                          event.target.value,
                        )
                      }
                      disabled={!podeEditar}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    >
                      {DESTINACOES.map((destino) => (
                        <option key={destino.value} value={destino.value}>
                          {destino.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-7">
                    <input
                      id={`isolada-${casa.id}`}
                      type="checkbox"
                      checked={casa.isolada}
                      onChange={(event) =>
                        atualizarCasa(casa.id, "isolada", event.target.checked)
                      }
                      disabled={!podeEditar}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label
                      htmlFor={`isolada-${casa.id}`}
                      className="text-sm text-slate-700"
                    >
                      Casa isolada
                    </label>
                  </div>

                  {casa.destinacaoOperacional === "FASE_EXCLUSIVA" && (
                    <>
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="block text-sm font-semibold text-slate-700">
                            Fase exclusiva
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => abrirNovaFase(casa.id)}
                              disabled={!podeEditar}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Nova fase
                            </button>
                            <button
                              type="button"
                              onClick={abrirGerenciarFases}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                            >
                              Gerenciar
                            </button>
                          </div>
                        </div>
                        <select
                          value={casa.faseExclusivaId}
                          onChange={(event) =>
                            atualizarCasa(
                              casa.id,
                              "faseExclusivaId",
                              event.target.value,
                            )
                          }
                          disabled={!podeEditar}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        >
                          <option value="">Selecione a fase</option>
                          {obterFasesDisponiveisParaCasa(casa.faseExclusivaId).map(
                            (fase) => (
                            <option key={fase.id} value={fase.id}>
                              {fase.nomeFase}
                              {fase.ativa ? "" : " (inativa)"}
                            </option>
                            ),
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                          Risco maximo permitido
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={casa.riscoMaximoPermitido}
                          onChange={(event) =>
                            atualizarCasa(
                              casa.id,
                              "riscoMaximoPermitido",
                              event.target.value,
                            )
                          }
                          disabled={!podeEditar}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                          placeholder="Ex: 1"
                        />
                      </div>
                    </>
                  )}

                  {destinacaoOperacionalUsaPrazo(
                    casa.destinacaoOperacional,
                  ) && (
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Prazo máximo em dias
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={casa.prazoMaximoDias}
                        onChange={(event) =>
                          atualizarCasa(
                            casa.id,
                            "prazoMaximoDias",
                            event.target.value,
                          )
                        }
                        disabled={!podeEditar}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        placeholder="Ex: 5"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Observações
                    </label>
                    <textarea
                      value={casa.observacoes}
                      onChange={(event) =>
                        atualizarCasa(
                          casa.id,
                          "observacoes",
                          event.target.value,
                        )
                      }
                      disabled={!podeEditar}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-none"
                      placeholder="Informações complementares da casa."
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => salvarCasa(casa)}
                    disabled={!podeEditar || salvandoId === casa.id}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    {salvandoId === casa.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {modalFasesAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Gerenciar fases de internacao
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Cadastre ou ajuste as fases disponiveis para uso nas casas.
                </p>
              </div>
              <button
                type="button"
                onClick={fecharModalFases}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_1.4fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {faseEmEdicaoId ? "Editar fase" : "Nova fase"}
                    </h4>
                    <p className="text-sm text-slate-600">
                      {faseEmEdicaoId
                        ? "Atualize nome, ordem e descricao."
                        : "Crie uma fase para uso imediato na configuracao das casas."}
                    </p>
                  </div>
                  {faseEmEdicaoId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFaseEmEdicaoId(null);
                        setFaseForm(FASE_FORM_INICIAL);
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Cancelar edicao
                    </button>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Nome da fase
                    </label>
                    <input
                      value={faseForm.nomeFase}
                      onChange={(event) =>
                        setFaseForm((prev) => ({
                          ...prev,
                          nomeFase: event.target.value,
                        }))
                      }
                      disabled={!podeEditar || salvandoFase}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Ex: Fase 4"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Ordem
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={faseForm.ordem}
                      onChange={(event) =>
                        setFaseForm((prev) => ({
                          ...prev,
                          ordem: event.target.value,
                        }))
                      }
                      disabled={!podeEditar || salvandoFase}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Ex: 4"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Descricao
                    </label>
                    <textarea
                      rows={4}
                      value={faseForm.descricaoFase}
                      onChange={(event) =>
                        setFaseForm((prev) => ({
                          ...prev,
                          descricaoFase: event.target.value,
                        }))
                      }
                      disabled={!podeEditar || salvandoFase}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Descricao operacional da fase."
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={salvarFase}
                      disabled={!podeEditar || salvandoFase}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                    >
                      {salvandoFase ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {faseEmEdicaoId ? "Salvar fase" : "Criar fase"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h4 className="font-semibold text-slate-900">
                    Fases cadastradas
                  </h4>
                  <p className="text-sm text-slate-600">
                    As fases abaixo aparecem no campo de selecao da casa exclusiva.
                  </p>
                </div>

                <div className="max-h-[55vh] overflow-y-auto p-4">
                  <div className="space-y-3">
                    {fases.map((fase) => (
                      <div
                        key={fase.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">
                                {fase.nomeFase}
                              </p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  fase.ativa
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {fase.ativa ? "Ativa" : "Inativa"}
                              </span>
                              {typeof fase.ordem === "number" ? (
                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                  Ordem {fase.ordem}
                                </span>
                              ) : null}
                            </div>
                            {fase.descricaoFase ? (
                              <p className="mt-1 text-sm text-slate-600">
                                {fase.descricaoFase}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => editarFase(fase)}
                              disabled={!podeEditar || processandoFaseId === fase.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => alternarStatusFase(fase, !fase.ativa)}
                              disabled={!podeEditar || processandoFaseId === fase.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                            >
                              {processandoFaseId === fase.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Power className="h-3.5 w-3.5" />
                              )}
                              {fase.ativa ? "Inativar" : "Reativar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => excluirFase(fase)}
                              disabled={!podeEditar || processandoFaseId === fase.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {fases.length === 0 && !carregandoFases ? (
                      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                        Nenhuma fase cadastrada.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
