"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { TIPO_CI_OPTIONS } from "@/lib/comunicados/tipos";

type ApiCI = {
  id: string;
  numero: number;
  ano: number;
  dataFato: string;
  tipoCi?: string;
  tipoCI?: string;
  resumoCi?: string;
  resumoCI?: string;
  caminhoPdf?: string | null;
  adolescentes?: ApiAdolescente[];
  conflitos?: Array<{
    id?: string | null;
    adolescenteA?: {
      id?: string | null;
      nome?: string | null;
      nomeCompleto?: string | null;
      numeroSms?: string | null;
    } | null;
    adolescenteB?: {
      id?: string | null;
      nome?: string | null;
      nomeCompleto?: string | null;
      numeroSms?: string | null;
    } | null;
  }>;
};

type FormState = {
  numero: string;
  ano: string;
  dataFato: string;
  tipoCi: string;
  resumoCi: string;
};

type ApiAdolescente = {
  id: string;
  nomeCompleto?: string | null;
  nomeSocial?: string | null;
  nome?: string | null;
  numeroSms?: string | null;
  alojamento?: string | null;
  ladoConflito?: string | null;
  alojamentoAtual?: {
    descricao?: string | null;
    numeroAlojamento?: string | number | null;
    ala?: string | null;
    casa?: {
      nome?: string | null;
      numero?: string | number | null;
    } | null;
  } | null;
};

type Adolescente = {
  id: string;
  nome: string;
  numeroSms: string;
  alojamento?: string;
  ladoConflito?: "LADO_1" | "LADO_2" | null;
};

const formatarNomeAdolescente = (
  dados: ApiAdolescente | Adolescente
): string => {
  if ("nome" in dados && dados.nome) {
    return dados.nome;
  }

  return (
    (dados as ApiAdolescente).nomeCompleto ??
    (dados as ApiAdolescente).nomeSocial ??
    (dados as ApiAdolescente).nome ??
    "Nome não informado"
  );
};

const formatarAlojamento = (
  registro?: ApiAdolescente["alojamentoAtual"],
  fallback?: string | null
) => {
  if (fallback) return fallback ?? undefined;
  if (!registro) return undefined;
  if (registro.descricao) {
    return registro.descricao ?? undefined;
  }

  const partes: string[] = [];
  if (registro.casa?.numero) {
    partes.push(`Casa ${registro.casa.numero}`);
  } else if (registro.casa?.nome) {
    partes.push(registro.casa.nome);
  }

  if (registro.numeroAlojamento) {
    partes.push(`Aloj. ${registro.numeroAlojamento}`);
  }

  if (registro.ala) {
    partes.push(`Ala ${registro.ala}`);
  }

  return partes.length ? partes.join(" - ") : undefined;
};

const mergeAdolescentes = (
  base: Adolescente[],
  extras: Adolescente[]
): Adolescente[] => {
  const mapa = new Map<string, Adolescente>();
  base.forEach((item) => mapa.set(item.id, item));
  extras.forEach((item) => {
    if (mapa.has(item.id)) {
      mapa.set(item.id, { ...mapa.get(item.id)!, ...item });
      return;
    }
    mapa.set(item.id, item);
  });
  return Array.from(mapa.values());
};

const formPadrao: FormState = {
  numero: "",
  ano: "",
  dataFato: "",
  tipoCi: "",
  resumoCi: "",
};

export default function EditarCIPage() {
  const params = useParams();
  const router = useRouter();
  const ciId = params.id as string;

  const [form, setForm] = useState<FormState>(formPadrao);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [adolescentesLista, setAdolescentesLista] = useState<Adolescente[]>(
    []
  );
  const [adolescentesSelecionados, setAdolescentesSelecionados] = useState<
    Adolescente[]
  >([]);
  const [buscaAdolescente, setBuscaAdolescente] = useState("");
  const [mostrarListaAdolescentes, setMostrarListaAdolescentes] =
    useState(false);
  const [ladoA, setLadoA] = useState<Adolescente[]>([]);
  const [ladoB, setLadoB] = useState<Adolescente[]>([]);
  const [buscaLadoA, setBuscaLadoA] = useState("");
  const [buscaLadoB, setBuscaLadoB] = useState("");
  const [mostrarListaLadoA, setMostrarListaLadoA] = useState(false);
  const [mostrarListaLadoB, setMostrarListaLadoB] = useState(false);

  useEffect(() => {
    carregarCI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciId]);

  useEffect(() => {
    carregarAdolescentes();
  }, []);

  const modoConflito = form.tipoCi === "CONFLITO";

  useEffect(() => {
    if (modoConflito) {
      setAdolescentesSelecionados([]);
    } else {
      setLadoA([]);
      setLadoB([]);
    }
  }, [modoConflito]);

  const carregarAdolescentes = async () => {
    try {
      const response = await fetch("/api/adolescentes?status=ATIVO");
      if (!response.ok) {
        throw new Error("Erro ao carregar adolescentes");
      }
      const payload = await response.json();
      const lista = Array.isArray(payload?.data) ? payload.data : [];
      const normalizados: Adolescente[] = lista.map((item: ApiAdolescente) => ({
        id: item.id,
        nome: formatarNomeAdolescente(item),
        numeroSms: item.numeroSms ?? "N?o informado",
        alojamento: formatarAlojamento(item.alojamentoAtual, item.alojamento),
        ladoConflito:
          item.ladoConflito === "LADO_1"
          ? "LADO_1"
          : item.ladoConflito === "LADO_2"
          ? "LADO_2"
          : null,
      }));
      setAdolescentesLista((prev) => mergeAdolescentes(normalizados, prev));
    } catch {
      // Mantém a lista atual caso ocorra erro
    }
  };

  const carregarCI = async () => {
    setErro(null);
    try {
      const response = await fetch(`/api/comunicados/${ciId}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar o comunicado.");
      }

      const data: ApiCI = await response.json();
      setForm({
        numero: String(data.numero ?? ""),
        ano: String(data.ano ?? ""),
        dataFato: data.dataFato ?? "",
        tipoCi: data.tipoCi ?? data.tipoCI ?? "",
        resumoCi: data.resumoCi ?? data.resumoCI ?? "",
      });
      const participantes: Adolescente[] =
        Array.isArray(data.adolescentes) && data.adolescentes.length > 0
          ? data.adolescentes.map((item) => ({
              id: item.id,
              nome: formatarNomeAdolescente(item),
              numeroSms: item.numeroSms ?? "N?o informado",
              alojamento: formatarAlojamento(
                item.alojamentoAtual,
                item.alojamento
              ),
              ladoConflito:
                item.ladoConflito === "LADO_1"
                  ? "LADO_1"
                  : item.ladoConflito === "LADO_2"
                  ? "LADO_2"
                  : null,
            }))
          : [];
      if ((data.tipoCi ?? data.tipoCI) === "CONFLITO") {
        setAdolescentesSelecionados([]);
        const ladoRegistradoA = participantes.filter(
          (alvo) => alvo.ladoConflito === "LADO_1"
        );
        const ladoRegistradoB = participantes.filter(
          (alvo) => alvo.ladoConflito === "LADO_2"
        );

        if (ladoRegistradoA.length > 0 || ladoRegistradoB.length > 0) {
          setLadoA(ladoRegistradoA);
          setLadoB(ladoRegistradoB);
        } else if (Array.isArray(data.conflitos) && data.conflitos.length > 0) {
          const lado1 = new Map<string, Adolescente>();
          const lado2 = new Map<string, Adolescente>();
          data.conflitos.forEach((conflito) => {
            const a = conflito.adolescenteA;
            const b = conflito.adolescenteB;
            if (a?.id) {
              lado1.set(a.id, {
                id: a.id,
                nome: a.nome ?? a.nomeCompleto ?? "Participante Lado 1",
                numeroSms: a.numeroSms ?? "N?o informado",
              });
            }
            if (b?.id) {
              lado2.set(b.id, {
                id: b.id,
                nome: b.nome ?? b.nomeCompleto ?? "Participante Lado 2",
                numeroSms: b.numeroSms ?? "N?o informado",
              });
            }
          });
          setLadoA(Array.from(lado1.values()));
          setLadoB(Array.from(lado2.values()));
        } else {
          setLadoA(participantes.slice(0, 1));
          setLadoB(participantes.slice(1));
        }
      } else {
        setLadoA([]);
        setLadoB([]);
        setAdolescentesSelecionados(participantes);
      }
      setAdolescentesLista((prev) => mergeAdolescentes(prev, participantes));
    } catch (error) {
      console.error(error);
      setErro("Não foi possível carregar o CI para edição.");
    } finally {
      setLoading(false);
    }
  };

  const atualizarCampo = (
    campo: keyof FormState,
    valor: string
  ) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const adicionarAdolescente = (adolescente: Adolescente) => {
    setAdolescentesSelecionados((prev) => [...prev, adolescente]);
    setBuscaAdolescente("");
    setMostrarListaAdolescentes(false);
  };

  const removerAdolescente = (id: string) => {
    setAdolescentesSelecionados((prev) =>
      prev.filter((adolescente) => adolescente.id !== id)
    );
  };

  const adolescentesFiltrados = useMemo(() => {
    const termo = buscaAdolescente.trim().toLowerCase();
    return adolescentesLista.filter(
      (adolescente) =>
        !adolescentesSelecionados.some((sel) => sel.id === adolescente.id) &&
        (termo === "" ||
          adolescente.nome.toLowerCase().includes(termo) ||
          adolescente.numeroSms.includes(termo))
    );
  }, [adolescentesLista, adolescentesSelecionados, buscaAdolescente]);

  const participantesConflitoIds = useMemo(() => {
    const ids = new Set<string>();
    ladoA.forEach((item) => ids.add(item.id));
    ladoB.forEach((item) => ids.add(item.id));
    return ids;
  }, [ladoA, ladoB]);

  const candidatosLadoA = useMemo(() => {
    const termo = buscaLadoA.trim().toLowerCase();
    return adolescentesLista.filter((alvo) => {
      if (participantesConflitoIds.has(alvo.id)) return false;
      return (
        termo === "" ||
        alvo.nome.toLowerCase().includes(termo) ||
        alvo.numeroSms.includes(buscaLadoA)
      );
    });
  }, [adolescentesLista, buscaLadoA, participantesConflitoIds]);

  const candidatosLadoB = useMemo(() => {
    const termo = buscaLadoB.trim().toLowerCase();
    return adolescentesLista.filter((alvo) => {
      if (participantesConflitoIds.has(alvo.id)) return false;
      return (
        termo === "" ||
        alvo.nome.toLowerCase().includes(termo) ||
        alvo.numeroSms.includes(buscaLadoB)
      );
    });
  }, [adolescentesLista, buscaLadoB, participantesConflitoIds]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (salvando) return;

    if (
      !form.numero ||
      !form.ano ||
      !form.dataFato ||
      !form.tipoCi ||
      !form.resumoCi
    ) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    const selecionadosParaEnvio = modoConflito
      ? [...ladoA, ...ladoB]
      : adolescentesSelecionados;
    if (selecionadosParaEnvio.length === 0) {
      alert("Selecione ao menos um adolescente envolvido.");
      return;
    }
    if (modoConflito && (ladoA.length === 0 || ladoB.length === 0)) {
      alert("Selecione pelo menos um adolescente em cada lado.");
      return;
    }

    const numeroInt = parseInt(form.numero, 10);
    const anoInt = parseInt(form.ano, 10);

    if (!Number.isFinite(numeroInt) || !Number.isFinite(anoInt)) {
      alert("Número e ano devem ser válidos.");
      return;
    }

    setSalvando(true);
    try {
      const payloadBody: Record<string, unknown> = {
        numero: numeroInt,
        ano: anoInt,
        dataFato: form.dataFato,
        tipoCI: form.tipoCi,
        resumoCI: form.resumoCi,
        adolescentesIds: selecionadosParaEnvio.map((item) => item.id),
      };
      if (modoConflito) {
        payloadBody.ladoAIds = ladoA.map((item) => item.id);
        payloadBody.ladoBIds = ladoB.map((item) => item.id);
      }

      const response = await fetch(`/api/comunicados/${ciId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.erro ?? "Erro ao atualizar CI.");
      }

      alert("Comunicado atualizado com sucesso.");
      router.push(`/comunicados/${ciId}`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Falha ao atualizar comunicado."
      );
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="font-semibold text-gray-600">
            Carregando CI para edição...
          </p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="mb-4 text-xl font-bold text-gray-800">{erro}</p>
          <Link
            href={`/comunicados/${ciId}`}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Voltar aos detalhes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-b-4 border-blue-600 bg-white p-6 shadow-lg">
        <Link
          href={`/comunicados/${ciId}`}
          className="mb-4 inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
        >
          Voltar para detalhes
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">
          Editar CI {form.numero}/{form.ano}
        </h1>
        <p className="text-gray-600">
          Atualize as informações básicas do comunicado interno.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-6 shadow-lg space-y-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Número *
            </label>
            <input
              type="number"
              value={form.numero}
              onChange={(event) => atualizarCampo("numero", event.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Ano *
            </label>
            <input
              type="number"
              value={form.ano}
              onChange={(event) => atualizarCampo("ano", event.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Data do fato *
            </label>
            <input
              type="date"
              value={form.dataFato}
              onChange={(event) =>
                atualizarCampo("dataFato", event.target.value)
              }
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Tipo de CI *
          </label>
          <select
            value={form.tipoCi}
            onChange={(event) => atualizarCampo("tipoCi", event.target.value)}
            className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Selecione...</option>
            {TIPO_CI_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-4 block text-sm font-semibold text-gray-700">
            Adolescentes envolvidos *
          </label>
          {modoConflito ? (
            <div className="space-y-6">
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
                      className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 pl-9 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                              onClick={() => {
                                setMostrarListaLadoA(false);
                                setLadoA((lista) => [...lista, item]);
                              }}
                              className="flex w-full flex-col items-start gap-1 border-b border-gray-100 px-3 py-2 text-left hover:bg-blue-50"
                            >
                              <span className="font-semibold text-gray-800">
                                {item.nome}
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
                          className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700"
                        >
                          {item.nome}
                          <button
                            type="button"
                            onClick={() =>
                              setLadoA((lista) =>
                                lista.filter((alvo) => alvo.id !== item.id)
                              )
                            }
                            className="text-blue-600 hover:text-blue-800"
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
                        Estes adolescentes serão avaliados contra o lado 1.
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
                      className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 pl-9 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                              onClick={() => {
                                setMostrarListaLadoB(false);
                                setLadoB((lista) => [...lista, item]);
                              }}
                              className="flex w-full flex-col items-start gap-1 border-b border-gray-100 px-3 py-2 text-left hover:bg-blue-50"
                            >
                              <span className="font-semibold text-gray-800">
                                {item.nome}
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
                          {item.nome}
                          <button
                            type="button"
                            onClick={() =>
                              setLadoB((lista) =>
                                lista.filter((alvo) => alvo.id !== item.id)
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
            </div>
          ) : (
            <>
              <div className="relative mb-3">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={buscaAdolescente}
                  onChange={(event) => {
                    setBuscaAdolescente(event.target.value);
                    setMostrarListaAdolescentes(true);
                  }}
                  onFocus={() => setMostrarListaAdolescentes(true)}
                  placeholder="Buscar por nome ou SMS..."
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 pl-9 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                {mostrarListaAdolescentes &&
                  adolescentesFiltrados.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {adolescentesFiltrados.slice(0, 5).map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => adicionarAdolescente(item)}
                          className="flex w-full flex-col items-start gap-0.5 border-b border-gray-100 px-3 py-2 text-left hover:bg-blue-50"
                        >
                          <span className="font-semibold text-gray-800">
                            {item.nome}
                          </span>
                          <span className="text-xs text-gray-500">
                            SMS: {item.numeroSms}
                            {item.alojamento ? ` • ${item.alojamento}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              {adolescentesSelecionados.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nenhum adolescente selecionado.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {adolescentesSelecionados.map((adolescente) => (
                    <span
                      key={adolescente.id}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700"
                    >
                      <span>
                        {adolescente.nome}
                        <span className="text-xs text-blue-500">
                          {" "}
                          (SMS: {adolescente.numeroSms})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removerAdolescente(adolescente.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Resumo do CI *
          </label>
          <textarea
            value={form.resumoCi}
            onChange={(event) =>
              atualizarCampo("resumoCi", event.target.value)
            }
            rows={4}
            className="w-full resize-none rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Descreva o ocorrido..."
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4">
          <Link
            href={`/comunicados/${ciId}`}
            className="rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
