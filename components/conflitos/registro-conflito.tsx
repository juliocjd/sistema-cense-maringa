"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Search, AlertTriangle, X } from "lucide-react";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  numeroSms: string;
  fotoUrl?: string | null;
  alojamento?: string;
};

type ConflitoPartePayload = {
  nome?: string;
  participantes: Array<{ adolescenteId: string; geraAlertas?: boolean }>;
};

type NovoConflitoPayload = {
  tipoConflito: string;
  origem: string;
  partes: ConflitoPartePayload[];
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
  const [ladoA, setLadoA] = useState<Adolescente[]>([]);
  const [ladoB, setLadoB] = useState<Adolescente[]>([]);
  const [tipoConflito, setTipoConflito] = useState("");
  const [origem, setOrigem] = useState("");
  const [ciOrigem, setCiOrigem] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);

  const [buscaLadoA, setBuscaLadoA] = useState("");
  const [buscaLadoB, setBuscaLadoB] = useState("");
  const [mostrarListaLadoA, setMostrarListaLadoA] = useState(false);
  const [mostrarListaLadoB, setMostrarListaLadoB] = useState(false);

  const conflitoViaCI = origem === "CI";

  const participantesIds = useMemo(() => {
    const ids = new Set<string>();
    ladoA.forEach((item) => ids.add(item.id));
    ladoB.forEach((item) => ids.add(item.id));
    return ids;
  }, [ladoA, ladoB]);

  const candidatosLadoA = useMemo(() => {
    const termo = buscaLadoA.toLowerCase();
    return adolescentes.filter((alvo) => {
      if (participantesIds.has(alvo.id)) {
        return false;
      }
      return (
        termo === "" ||
        alvo.nomeCompleto.toLowerCase().includes(termo) ||
        (buscaLadoA && (alvo.numeroSms ?? "").includes(buscaLadoA))
      );
    });
  }, [adolescentes, buscaLadoA, participantesIds]);

  const candidatosLadoB = useMemo(() => {
    const termo = buscaLadoB.toLowerCase();
    return adolescentes.filter((alvo) => {
      if (participantesIds.has(alvo.id)) {
        return false;
      }
      return (
        termo === "" ||
        alvo.nomeCompleto.toLowerCase().includes(termo) ||
        (buscaLadoB && (alvo.numeroSms ?? "").includes(buscaLadoB))
      );
    });
  }, [adolescentes, buscaLadoB, participantesIds]);

  const handleAdicionarAoLado = (lado: "A" | "B", alvo: Adolescente) => {
    if (lado === "A") {
      setLadoA((lista) => [...lista, alvo]);
      setBuscaLadoA("");
      setMostrarListaLadoA(false);
    } else {
      setLadoB((lista) => [...lista, alvo]);
      setBuscaLadoB("");
      setMostrarListaLadoB(false);
    }
  };

  const handleSalvar = async () => {
    if (ladoA.length === 0 || ladoB.length === 0) {
      alert("Selecione ao menos um adolescente em cada lado do conflito.");
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

    if (conflitoViaCI) {
      alert(
        "Para conflitos com origem em CI, crie o Comunicado em /comunicados e marque 'Gerar conflito'.",
      );
      return;
    }

    setLoading(true);
    try {
      const registroGrupoId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      await onSalvar({
        tipoConflito,
        origem,
        partes: [
          {
            nome: "Lado 1",
            participantes: ladoA.map((item) => ({
              adolescenteId: item.id,
            })),
          },
          {
            nome: "Lado 2",
            participantes: ladoB.map((item) => ({
              adolescenteId: item.id,
            })),
          },
        ],
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Registrar novo conflito
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Selecione todos os adolescentes envolvidos e descreva a ocorrencia
              registrada.
            </p>
          </div>
          {null}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-lg">
        <div className="space-y-6">
          <div className="rounded-r-lg border-l-4 border-orange-500 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">Atencao</p>
                <p className="text-sm text-orange-800">
                  Cada conflito registrado passa a gerar alertas nas
                  verificações de alocação e exige acompanhamento da equipe
                  técnica até nova avaliação.
                </p>
              </div>
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
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Para conflitos com origem em CI, cadastre o Comunicado em{" "}
                <Link
                  href="/comunicados/novo"
                  className="font-semibold underline"
                >
                  /comunicados
                </Link>{" "}
                e marque “Gerar conflito”. Este formulário não cria CI.
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-800">
                    Lado 1
                  </p>
                  <p className="text-xs text-gray-500">
                    Integrantes deste lado não geram alertas entre si.
                  </p>
                </div>
                <span className="text-xs font-semibold text-gray-600">
                  {ladoA.length} selecionado(s)
                </span>
              </div>
              <div className="relative mt-3">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={buscaLadoA}
                  onChange={(event) => setBuscaLadoA(event.target.value)}
                  onFocus={() => setMostrarListaLadoA(true)}
                  placeholder="Buscar por nome ou SMS"
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 pl-9 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
                {mostrarListaLadoA && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {candidatosLadoA.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-500">
                        Nenhum adolescente disponível para este lado.
                      </p>
                    ) : (
                      candidatosLadoA.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAdicionarAoLado("A", item)}
                          className="flex w-full flex-col items-start gap-1 border-b border-gray-100 px-3 py-2 text-left hover:bg-red-50"
                        >
                          <span className="font-semibold text-gray-800">
                            {item.nomeCompleto}
                          </span>
                          <span className="text-xs text-gray-500">
                            SMS: {item.numeroSms}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {ladoA.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ladoA.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700"
                    >
                      {item.fotoUrl ? (
                        <span className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-[10px] font-semibold">
                          <img
                            src={item.fotoUrl}
                            alt={item.nomeCompleto}
                            className="h-full w-full object-cover"
                          />
                        </span>
                      ) : (
                        <span
                          title="Sem foto cadastrada"
                          className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-[10px] font-semibold"
                        >
                          {item.nomeCompleto?.trim().charAt(0) ?? "?"}
                        </span>
                      )}
                      <span>{item.nomeCompleto}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setLadoA((lista) =>
                            lista.filter((alvo) => alvo.id !== item.id),
                          )
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

            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-800">
                    Lado 2
                  </p>
                  <p className="text-xs text-gray-500">
                    Estes adolescentes são avaliados contra o lado 1.
                  </p>
                </div>
                <span className="text-xs font-semibold text-gray-600">
                  {ladoB.length} selecionado(s)
                </span>
              </div>
              <div className="relative mt-3">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={buscaLadoB}
                  onChange={(event) => setBuscaLadoB(event.target.value)}
                  onFocus={() => setMostrarListaLadoB(true)}
                  placeholder="Buscar por nome ou SMS"
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 pl-9 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
                {mostrarListaLadoB && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {candidatosLadoB.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-500">
                        Nenhum adolescente disponível para este lado.
                      </p>
                    ) : (
                      candidatosLadoB.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAdicionarAoLado("B", item)}
                          className="flex w-full flex-col items-start gap-1 border-b border-gray-100 px-3 py-2 text-left hover:bg-red-50"
                        >
                          <span className="font-semibold text-gray-800">
                            {item.nomeCompleto}
                          </span>
                          <span className="text-xs text-gray-500">
                            SMS: {item.numeroSms}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {ladoB.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ladoB.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700"
                    >
                      {item.fotoUrl ? (
                        <span className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-[10px] font-semibold">
                          <img
                            src={item.fotoUrl}
                            alt={item.nomeCompleto}
                            className="h-full w-full object-cover"
                          />
                        </span>
                      ) : (
                        <span
                          title="Sem foto cadastrada"
                          className="h-7 w-7 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-[10px] font-semibold"
                        >
                          {item.nomeCompleto?.trim().charAt(0) ?? "?"}
                        </span>
                      )}
                      <span>{item.nomeCompleto}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setLadoB((lista) =>
                            lista.filter((alvo) => alvo.id !== item.id),
                          )
                        }
                        className="text-indigo-600 hover:text-indigo-800"
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
              ladoA.length === 0 ||
              ladoB.length === 0 ||
              !tipoConflito ||
              !origem ||
              conflitoViaCI
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
