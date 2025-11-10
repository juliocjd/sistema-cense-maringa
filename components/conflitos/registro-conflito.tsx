"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Search, AlertTriangle, X } from "lucide-react";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  numeroSms: string;
  alojamento?: string;
};

type NovoConflitoPayload = {
  principalId: string;
  envolvidosIds: string[];
  tipoConflito: string;
  origem: string;
  ciOrigem?: string;
  descricao?: string;
  registroGrupoId: string;
};

interface RegistroConflitoProps {
  adolescentes: Adolescente[];
  onSalvar: (conflito: NovoConflitoPayload) => Promise<void>;
}

export function RegistroConflito({
  adolescentes,
  onSalvar,
}: RegistroConflitoProps) {
  const [principal, setPrincipal] = useState<Adolescente | null>(null);
  const [envolvidos, setEnvolvidos] = useState<Adolescente[]>([]);
  const [tipoConflito, setTipoConflito] = useState("");
  const [origem, setOrigem] = useState("");
  const [ciOrigem, setCiOrigem] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);

  const [buscaPrincipal, setBuscaPrincipal] = useState("");
  const [buscaEnvolvido, setBuscaEnvolvido] = useState("");
  const [mostrarListaPrincipal, setMostrarListaPrincipal] = useState(false);
  const [mostrarListaEnvolvidos, setMostrarListaEnvolvidos] = useState(false);

  const participantesIds = useMemo(() => {
    const ids = new Set<string>();
    if (principal) {
      ids.add(principal.id);
    }
    envolvidos.forEach((item) => ids.add(item.id));
    return ids;
  }, [principal, envolvidos]);

  const candidatosPrincipal = useMemo(() => {
    const termo = buscaPrincipal.toLowerCase();
    return adolescentes.filter((alvo) => {
      if (envolvidos.some((item) => item.id === alvo.id)) {
        return false;
      }
      return (
        termo === "" ||
        alvo.nomeCompleto.toLowerCase().includes(termo) ||
        (buscaPrincipal && (alvo.numeroSms ?? "").includes(buscaPrincipal))
      );
    });
  }, [adolescentes, buscaPrincipal, envolvidos]);

  const candidatosEnvolvidos = useMemo(() => {
    const termo = buscaEnvolvido.toLowerCase();
    return adolescentes.filter((alvo) => {
      if (principal?.id === alvo.id) {
        return false;
      }
      if (envolvidos.some((item) => item.id === alvo.id)) {
        return false;
      }
      return (
        termo === "" ||
        alvo.nomeCompleto.toLowerCase().includes(termo) ||
        (buscaEnvolvido && (alvo.numeroSms ?? "").includes(buscaEnvolvido))
      );
    });
  }, [adolescentes, buscaEnvolvido, envolvidos, principal]);

  const handleAdicionarEnvolvido = (alvo: Adolescente) => {
    setEnvolvidos((lista) => [...lista, alvo]);
    setBuscaEnvolvido("");
    setMostrarListaEnvolvidos(false);
  };

  const handleSalvar = async () => {
    if (!principal) {
      alert("Selecione o adolescente principal.");
      return;
    }

    if (envolvidos.length === 0) {
      alert("Selecione ao menos um adolescente envolvido.");
      return;
    }

    if (!tipoConflito) {
      alert("Selecione o tipo de conflito.");
      return;
    }

    if (!origem) {
      alert("Informe a origem do conflito.");
      return;
    }

    setLoading(true);
    try {
      const registroGrupoId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      await onSalvar({
        principalId: principal.id,
        envolvidosIds: envolvidos.map((item) => item.id),
        tipoConflito,
        origem,
        ciOrigem: ciOrigem || undefined,
        descricao: descricao || undefined,
        registroGrupoId,
      });

      alert("Conflitos registrados com sucesso.");
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Erro ao registrar conflito. Tente novamente.";
      alert(mensagem);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-b-4 border-red-600 bg-white p-6 shadow-lg">
        <Link
          href="/conflitos"
          className="mb-4 flex items-center gap-2 font-semibold text-red-600 hover:text-red-700"
        >
          <ArrowLeft size={20} />
          Voltar para lista
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Registrar novo conflito</h1>
        <p className="mt-2 text-sm text-gray-600">
          Selecione todos os adolescentes envolvidos e descreva a ocorrencia registrada.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-lg">
        <div className="space-y-6">
          <div className="rounded-r-lg border-l-4 border-orange-500 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">Atencao</p>
                <p className="text-sm text-orange-800">
                  Cada conflito registrado bloqueia a alocacao dos adolescentes na mesma ala
                  ou alojamento ate nova avaliacao da equipe tecnica.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Adolescente principal *
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={buscaPrincipal}
                  onChange={(event) => setBuscaPrincipal(event.target.value)}
                  onFocus={() => setMostrarListaPrincipal(true)}
                  placeholder="Buscar por nome ou SMS"
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 pl-9 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
                {mostrarListaPrincipal && candidatosPrincipal.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {candidatosPrincipal.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPrincipal(item);
                          setBuscaPrincipal(item.nomeCompleto);
                          setMostrarListaPrincipal(false);
                        }}
                        className="flex w-full flex-col items-start gap-1 border-b border-gray-100 px-3 py-2 text-left hover:bg-red-50"
                      >
                        <span className="font-semibold text-gray-800">
                          {item.nomeCompleto}
                        </span>
                        <span className="text-xs text-gray-500">
                          SMS: {item.numeroSms}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {principal && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-800">{principal.nomeCompleto}</p>
                      <p className="text-sm text-gray-600">
                        SMS: {principal.numeroSms}
                        {principal.alojamento ? ` | ${principal.alojamento}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPrincipal(null);
                        setBuscaPrincipal("");
                      }}
                      className="text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Outros envolvidos (minimo 1) *
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={buscaEnvolvido}
                  onChange={(event) => setBuscaEnvolvido(event.target.value)}
                  onFocus={() => setMostrarListaEnvolvidos(true)}
                  placeholder="Buscar por nome ou SMS"
                  disabled={!principal}
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 pl-9 focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:bg-gray-50"
                />
                {mostrarListaEnvolvidos && candidatosEnvolvidos.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {candidatosEnvolvidos.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAdicionarEnvolvido(item)}
                        className="flex w-full flex-col items-start gap-1 border-b border-gray-100 px-3 py-2 text-left hover:bg-red-50"
                      >
                        <span className="font-semibold text-gray-800">
                          {item.nomeCompleto}
                        </span>
                        <span className="text-xs text-gray-500">
                          SMS: {item.numeroSms}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {envolvidos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {envolvidos.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700"
                    >
                      {item.nomeCompleto}
                      <button
                        type="button"
                        onClick={() =>
                          setEnvolvidos((lista) => lista.filter((alvo) => alvo.id !== item.id))
                        }
                        className="text-red-600 hover:text-red-800"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Tipo de conflito *
            </label>
            <select
              value={tipoConflito}
              onChange={(event) => setTipoConflito(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            >
              <option value="">Selecione...</option>
              <option value="FACCAO">Faccoes rivais</option>
              <option value="TERRITORIAL">Disputa territorial</option>
              <option value="PESSOAL">Rivalidade pessoal</option>
              <option value="OUTROS">Outros</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Origem do registro *
              </label>
              <select
                value={origem}
                onChange={(event) => setOrigem(event.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-red-500 focus:ring-2 focus:ring-red-200"
              >
                <option value="">Selecione...</option>
                <option value="CI">Comunicado interno (CI)</option>
                <option value="OBSERVACAO">Observacao direta</option>
                <option value="DENUNCIA">Denuncia</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>
            {origem === "CI" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Numero do CI
                </label>
                <input
                  type="text"
                  value={ciOrigem}
                  onChange={(event) => setCiOrigem(event.target.value)}
                  placeholder="Ex: 145/2025"
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Descricao do conflito
            </label>
            <textarea
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              rows={4}
              placeholder="Descreva a dinamica do conflito, contexto e encaminhamentos"
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3 border-t-2 border-gray-200 pt-6">
          <Link
            href="/conflitos"
            className="rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSalvar}
            disabled={
              loading ||
              !principal ||
              envolvidos.length === 0 ||
              !tipoConflito ||
              !origem
            }
            className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={20} />
                Registrar conflito
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
