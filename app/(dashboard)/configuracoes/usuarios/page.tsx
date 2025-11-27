"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Users,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";

type OperadorItem = {
  id: string;
  nomeCompleto: string;
  email: string;
  status: string;
  funcaoRole: string;
  papeis: string[];
  permissoes: string[];
};

type PapelItem = {
  id: string;
  nome: string;
  descricao?: string | null;
  permissoes: string[];
};

const normalizarLista = (lista: string[]) =>
  [...lista].map((item) => item.toUpperCase()).sort();

const listasIguais = (a: string[], b: string[]) => {
  const normalA = normalizarLista(a);
  const normalB = normalizarLista(b);
  if (normalA.length !== normalB.length) {
    return false;
  }
  return normalA.every((valor, index) => valor === normalB[index]);
};

export default function UsuariosConfigPage() {
  const [operadores, setOperadores] = useState<OperadorItem[]>([]);
  const [papeis, setPapeis] = useState<PapelItem[]>([]);
  const [draftPapeis, setDraftPapeis] = useState<Record<string, string[]>>({});
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const roleOptions = ["OPERADOR", "ADMIN"];
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoOperador, setNovoOperador] = useState({
    nomeCompleto: "",
    email: "",
    senha: "",
    funcaoRole: "OPERADOR",
    papeis: [] as string[],
  });
  const [erroNovo, setErroNovo] = useState<string | null>(null);
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    setErro(null);
    try {
      const response = await fetch("/api/operadores", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.erro ?? "Falha ao carregar operadores");
      }
      setOperadores(payload.operadores ?? []);
      setPapeis(payload.papeis ?? []);
      setDraftPapeis({});
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao carregar usuários"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const getPapeisAtuais = (operador: OperadorItem) =>
    draftPapeis[operador.id] ?? operador.papeis;

  const atualizarDraft = (operador: OperadorItem, novaLista: string[]) => {
    setDraftPapeis((prev) => {
      if (listasIguais(novaLista, operador.papeis)) {
        const { [operador.id]: _, ...restante } = prev;
        return restante;
      }
      return {
        ...prev,
        [operador.id]: novaLista,
      };
    });
  };

  const togglePapel = (operador: OperadorItem, papel: string) => {
    const atuais = new Set(getPapeisAtuais(operador));
    if (atuais.has(papel)) {
      atuais.delete(papel);
    } else {
      atuais.add(papel);
    }
    atualizarDraft(operador, Array.from(atuais));
  };

  const atualizarNovoCampo = (
    campo: "nomeCompleto" | "email" | "senha" | "funcaoRole",
    valor: string
  ) => {
    setNovoOperador((prev) => ({ ...prev, [campo]: valor }));
  };

  const togglePapelNovo = (papel: string) => {
    setNovoOperador((prev) => {
      const atual = new Set(prev.papeis);
      if (atual.has(papel)) {
        atual.delete(papel);
      } else {
        atual.add(papel);
      }
      return { ...prev, papeis: Array.from(atual) };
    });
  };

  const handleSalvar = async (operador: OperadorItem) => {
    const papeisSelecionados = getPapeisAtuais(operador);
    if (listasIguais(papeisSelecionados, operador.papeis)) {
      return;
    }

    setSalvandoId(operador.id);
    try {
      const response = await fetch("/api/operadores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operadorId: operador.id,
          papeis: papeisSelecionados,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.erro ?? "Falha ao atualizar papéis");
      }
      const atualizado = payload.operador as OperadorItem;
      setOperadores((prev) =>
        prev.map((item) => (item.id === atualizado.id ? atualizado : item))
      );
      setDraftPapeis((prev) => {
        const { [operador.id]: _, ...restante } = prev;
        return restante;
      });
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao salvar papéis"
      );
    } finally {
      setSalvandoId(null);
    }
  };

  const podeCriar =
    novoOperador.nomeCompleto.trim().length >= 3 &&
    novoOperador.email.trim().length > 0 &&
    novoOperador.senha.trim().length >= 6;

  const resetModalNovo = () => {
    setModalNovoAberto(false);
    setErroNovo(null);
    setNovoOperador({
      nomeCompleto: "",
      email: "",
      senha: "",
      funcaoRole: "OPERADOR",
      papeis: [],
    });
  };

  const handleCriarOperador = async () => {
    if (!podeCriar) {
      return;
    }
    setErroNovo(null);
    setSalvandoNovo(true);
    try {
      const response = await fetch("/api/operadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoOperador),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.erro ?? "Falha ao criar operador");
      }
      const operadorCriado = payload.operador as OperadorItem;
      setOperadores((prev) => [...prev, operadorCriado]);
      resetModalNovo();
    } catch (error) {
      setErroNovo(
        error instanceof Error ? error.message : "Erro inesperado ao criar"
      );
    } finally {
      setSalvandoNovo(false);
    }
  };

  const operadoresFiltrados = useMemo(() => {
    if (!busca.trim()) {
      return operadores;
    }
    const termo = busca.trim().toLowerCase();
    return operadores.filter(
      (operador) =>
        operador.nomeCompleto.toLowerCase().includes(termo) ||
        operador.email.toLowerCase().includes(termo) ||
        operador.papeis.some((papel) =>
          papel.toLowerCase().includes(termo)
        )
    );
  }, [operadores, busca]);

  const statusBadge = (status: string) => {
    const padrao = status.toUpperCase();
    const estilos: Record<string, string> = {
      ATIVO: "bg-green-100 text-green-800 border-green-200",
      INATIVO: "bg-gray-100 text-gray-700 border-gray-200",
      BLOQUEADO: "bg-red-100 text-red-800 border-red-200",
    };
    return estilos[padrao] ?? "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wider text-indigo-600 font-semibold">
            Configurações
          </p>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">
            Usuários & Papéis
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Defina quais operadores têm acesso administrativo e quais módulos
            podem consultar. Alterações são registradas automaticamente.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModalNovoAberto(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
          >
            <Plus size={16} />
            Criar usuário
          </button>
          <button
            onClick={carregarDados}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:text-slate-900"
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : undefined}
            />
            Atualizar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm text-indigo-800">
          <Users size={18} />
          {operadores.length} operadores
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-purple-100 bg-purple-50 px-4 py-2 text-sm text-purple-800">
          <Shield size={18} />
          {papeis.length} papéis disponíveis
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, e-mail ou papel"
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-slate-500">
          <Loader2 size={32} className="mb-3 animate-spin text-indigo-600" />
          Carregando operadores...
        </div>
      ) : operadoresFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          Nenhum operador encontrado com os filtros atuais.
        </div>
      ) : (
        <div className="space-y-4">
          {operadoresFiltrados.map((operador) => {
            const papeisSelecionados = getPapeisAtuais(operador);
            const possuiAlteracoes =
              !listasIguais(papeisSelecionados, operador.papeis);
            return (
              <div
                key={operador.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-slate-900">
                        {operador.nomeCompleto}
                      </h2>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(
                          operador.status
                        )}`}
                      >
                        {operador.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{operador.email}</p>
                    <p className="text-xs text-slate-400">
                      Função declarada: {operador.funcaoRole}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => atualizarDraft(operador, operador.papeis)}
                      disabled={!possuiAlteracoes || salvandoId === operador.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Desfazer
                    </button>
                    <button
                      onClick={() => handleSalvar(operador)}
                      disabled={
                        !possuiAlteracoes || salvandoId === operador.id
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                    >
                      {salvandoId === operador.id ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          Salvar papéis
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-3">
                      Papéis atribuídos
                    </p>
                    <div className="space-y-3">
                      {papeis.map((papel) => {
                        const ativo = papeisSelecionados.some(
                          (nome) => nome === papel.nome
                        );
                        return (
                          <label
                            key={papel.id}
                            className={`flex items-start gap-3 rounded-xl border p-3 text-sm transition ${
                              ativo
                                ? "border-indigo-200 bg-indigo-50"
                                : "border-slate-200 bg-slate-50 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={ativo}
                              onChange={() => togglePapel(operador, papel.nome)}
                              className="mt-1"
                            />
                            <div>
                              <p className="font-semibold text-slate-800">
                                {papel.nome}
                              </p>
                              {papel.descricao && (
                                <p className="text-xs text-slate-500">
                                  {papel.descricao}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                      {papeis.length === 0 && (
                        <p className="text-sm text-slate-500">
                          Nenhum papel cadastrado no sistema.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3">
                      Permissões acumuladas
                    </p>
                    {(() => {
                      const permissoesPreview = (() => {
                        const acumuladas = new Set<string>();
                        papeisSelecionados.forEach((papelNome) => {
                          const meta = papeis.find(
                            (papel) => papel.nome === papelNome
                          );
                          meta?.permissoes.forEach((codigo) =>
                            acumuladas.add(codigo)
                          );
                        });
                        return Array.from(acumuladas);
                      })();
                      if (permissoesPreview.length === 0) {
                        return (
                          <p className="text-sm text-slate-500">
                            Nenhum papel atribuído — operador ficará sem acesso
                            adicional.
                          </p>
                        );
                      }
                      return (
                        <div className="flex flex-wrap gap-2">
                          {permissoesPreview.map((codigo) => (
                            <span
                              key={codigo}
                              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow"
                            >
                              {codigo}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalNovoAberto && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Novo operador
                </h2>
                <p className="text-sm text-slate-500">
                  Cadastre um usuário com senha inicial e atribua papéis.
                </p>
              </div>
              <button
                onClick={resetModalNovo}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={novoOperador.nomeCompleto}
                  onChange={(event) =>
                    atualizarNovoCampo("nomeCompleto", event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Ex.: Joana Oliveira"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={novoOperador.email}
                    onChange={(event) =>
                      atualizarNovoCampo("email", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="nome@cense.pr.gov.br"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Senha temporária
                  </label>
                  <input
                    type="password"
                    value={novoOperador.senha}
                    onChange={(event) =>
                      atualizarNovoCampo("senha", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Função
                  </label>
                  <select
                    value={novoOperador.funcaoRole}
                    onChange={(event) =>
                      atualizarNovoCampo("funcaoRole", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Papéis iniciais
                  </label>
                  <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {papeis.length === 0 && (
                      <p className="text-xs text-slate-500">
                        Nenhum papel cadastrado até o momento.
                      </p>
                    )}
                    {papeis.map((papel) => (
                      <label
                        key={papel.id}
                        className="flex items-start gap-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={novoOperador.papeis.includes(papel.nome)}
                          onChange={() => togglePapelNovo(papel.nome)}
                        />
                        <div>
                          <p className="font-semibold">{papel.nome}</p>
                          {papel.descricao && (
                            <p className="text-xs text-slate-500">
                              {papel.descricao}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {erroNovo && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {erroNovo}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={resetModalNovo}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                  disabled={salvandoNovo}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCriarOperador}
                  disabled={!podeCriar || salvandoNovo}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {salvandoNovo ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar operador"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
