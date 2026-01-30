"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CadastroAdolescente } from "@/components/cadastro/cadastro-adolescente";
import type { Adolescente, AdolescenteCadastroPayload } from "@/types";

export default function EditarAdolescentePage() {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const adolescenteId = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

  const [adolescente, setAdolescente] = useState<Adolescente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [reativacaoPendentes, setReativacaoPendentes] = useState<{
    alertas?: Array<{
      id: string;
      tipoAlerta: string | null;
      descricaoAlerta: string | null;
      desativadoEm: string | null;
    }>;
    conflitos?: Array<{
      id: string;
      adversarioId: string | null;
      adversarioNome: string | null;
      status: string | null;
    }>;
    comunicados?: Array<{
      id: string;
      numero: number | null;
      ano: number | null;
      tipoCI: string | null;
      resumoCI: string | null;
    }>;
  } | null>(null);
  const [selecionados, setSelecionados] = useState<{
    alertas: Set<string>;
    conflitos: Set<string>;
    comunicados: Set<string>;
  }>({
    alertas: new Set(),
    conflitos: new Set(),
    comunicados: new Set(),
  });

  useEffect(() => {
    if (!adolescenteId) {
      setErro("Adolescente nao informado.");
      setCarregando(false);
      return;
    }

    const carregar = async () => {
      setCarregando(true);
      setErro(null);
      try {
        const response = await fetch(`/api/adolescentes/${adolescenteId}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.erro ?? "Erro ao carregar adolescente.");
        }
        const dados: Adolescente = await response.json();
        setAdolescente(dados);
      } catch (error) {
        const mensagem =
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao carregar adolescente.";
        setErro(mensagem);
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [adolescenteId]);

  const handleSalvar = async (dados: AdolescenteCadastroPayload) => {
    if (!adolescenteId) {
      throw new Error("Identificador do adolescente nao encontrado.");
    }

    const response = await fetch(`/api/adolescentes/${adolescenteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.erro ?? "Erro ao atualizar adolescente.");
    }

    if (payload) {
      setAdolescente(payload as Adolescente);
    }

    const pendentes = payload?.reativacaoPendentes;
    const alertasPendentes: Array<{
      id: string;
      tipoAlerta: string | null;
      descricaoAlerta: string | null;
      desativadoEm: string | null;
    }> = Array.isArray(pendentes?.alertas) ? pendentes.alertas : [];
    const conflitosPendentes: Array<{
      id: string;
      adversarioId: string | null;
      adversarioNome: string | null;
      status: string | null;
    }> = Array.isArray(pendentes?.conflitos) ? pendentes.conflitos : [];
    const comunicadosPendentes: Array<{
      id: string;
      numero: number | null;
      ano: number | null;
      tipoCI: string | null;
      resumoCI: string | null;
    }> = Array.isArray(pendentes?.comunicados)
      ? pendentes.comunicados
      : [];

    if (
      alertasPendentes.length > 0 ||
      conflitosPendentes.length > 0 ||
      comunicadosPendentes.length > 0
    ) {
      setReativacaoPendentes({
        alertas: alertasPendentes,
        conflitos: conflitosPendentes,
        comunicados: comunicadosPendentes,
      });
      setSelecionados({
        alertas: new Set(alertasPendentes.map((a) => a.id)),
        conflitos: new Set(conflitosPendentes.map((c) => c.id)),
        comunicados: new Set(comunicadosPendentes.map((c) => c.id)),
      });
      // permanecer na tela para decisão
      return;
    }

    router.push(`/adolescentes/${adolescenteId}`);
  };

  const handleCancelar = () => {
    if (adolescenteId) {
      router.push(`/adolescentes/${adolescenteId}`);
    } else {
      router.back();
    }
  };

  if (!adolescenteId) {
    return (
      <div className="p-6 text-center text-red-700">
        Nao foi possivel identificar o adolescente solicitado.
      </div>
    );
  }

  if (carregando) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-sm text-slate-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6 border border-rose-200">
        <p className="text-rose-600 font-semibold mb-2">
          Nao foi possivel carregar o adolescente.
        </p>
        <p className="text-sm text-slate-600 mb-4">{erro}</p>
        <button
          type="button"
          onClick={handleCancelar}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!adolescente) {
    return null;
  }

  const handleToggleSelecionado = (
    tipo: "alertas" | "conflitos" | "comunicados",
    id: string
  ) => {
    setSelecionados((prev) => {
      const novoSet = new Set(prev[tipo]);
      if (novoSet.has(id)) {
        novoSet.delete(id);
      } else {
        novoSet.add(id);
      }
      return {
        ...prev,
        [tipo]: novoSet,
      };
    });
  };

  const handleConfirmarReativacao = async () => {
    if (!adolescenteId || !reativacaoPendentes) {
      router.push(`/adolescentes/${adolescenteId}`);
      return;
    }
    const alertasIds = Array.from(selecionados.alertas);
    const conflitosIds = Array.from(selecionados.conflitos);
    const comunicadosIds = Array.from(selecionados.comunicados);
    try {
      const response = await fetch(
        `/api/adolescentes/${adolescenteId}/reativar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alertasIds,
            conflitosIds,
            comunicadosIds,
          }),
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.erro ?? "Erro ao reativar registros.");
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao reativar alertas/conflitos."
      );
    } finally {
      router.push(`/adolescentes/${adolescenteId}`);
    }
  };

  const handleIgnorarReativacao = () => {
    setReativacaoPendentes(null);
    router.push(`/adolescentes/${adolescenteId}`);
  };

  return (
    <>
      <CadastroAdolescente
        modo="EDICAO"
        initialData={adolescente}
        permitirAlocacaoAutomatica
        onSalvar={handleSalvar}
        onCancelar={handleCancelar}
      />

      {reativacaoPendentes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-gray-900">
              Reativar registros suspensos
            </h2>
            <p className="text-sm text-gray-700">
              O adolescente voltou para ATIVO. Selecione quais alertas ou conflitos
              devem ser reativados.
            </p>

            {reativacaoPendentes.alertas?.length ? (
              <div className="rounded-lg border border-gray-200 p-4 space-y-2">
                <h3 className="font-semibold text-gray-800">Alertas</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {reativacaoPendentes.alertas.map((alerta) => (
                    <label
                      key={alerta.id}
                      className="flex items-start gap-3 rounded-md p-2 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selecionados.alertas.has(alerta.id)}
                        onChange={() => handleToggleSelecionado("alertas", alerta.id)}
                      />
                      <div className="text-sm text-gray-800">
                        <p className="font-semibold">
                          {alerta.tipoAlerta || "Alerta"}
                        </p>
                        {alerta.descricaoAlerta && (
                          <p className="text-gray-600">{alerta.descricaoAlerta}</p>
                        )}
                        {alerta.desativadoEm && (
                          <p className="text-[11px] text-gray-500">
                            Desativado em: {new Date(alerta.desativadoEm).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {reativacaoPendentes.conflitos?.length ? (
              <div className="rounded-lg border border-gray-200 p-4 space-y-2">
                <h3 className="font-semibold text-gray-800">Conflitos</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {reativacaoPendentes.conflitos.map((conflito) => (
                    <label
                      key={conflito.id}
                      className="flex items-start gap-3 rounded-md p-2 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selecionados.conflitos.has(conflito.id)}
                        onChange={() => handleToggleSelecionado("conflitos", conflito.id)}
                      />
                      <div className="text-sm text-gray-800">
                        <p className="font-semibold">Conflito</p>
                        {conflito.adversarioNome && (
                          <p className="text-gray-600">
                            Adversário: {conflito.adversarioNome}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {reativacaoPendentes.comunicados?.length ? (
              <div className="rounded-lg border border-gray-200 p-4 space-y-2">
                <h3 className="font-semibold text-gray-800">Comunicados Internos</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {reativacaoPendentes.comunicados.map((ci) => (
                    <label
                      key={ci.id}
                      className="flex items-start gap-3 rounded-md p-2 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selecionados.comunicados.has(ci.id)}
                        onChange={() => handleToggleSelecionado("comunicados", ci.id)}
                      />
                      <div className="text-sm text-gray-800">
                        <p className="font-semibold">
                          CI {ci.numero ?? "?"}/{ci.ano ?? "?"} ({ci.tipoCI ?? "CI"})
                        </p>
                        {ci.resumoCI && (
                          <p className="text-gray-600">{ci.resumoCI}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleIgnorarReativacao}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Ignorar
              </button>
              <button
                onClick={handleConfirmarReativacao}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Reativar selecionados
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
