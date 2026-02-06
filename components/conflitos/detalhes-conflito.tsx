"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Swords,
  AlertTriangle,
  CheckCircle,
  Calendar,
  User,
  FileText,
  Plus,
  Clock,
  Mail,
} from "lucide-react";

type Participante = {
  id: string;
  nome: string;
  numeroSms: string;
  fotoUrl?: string | null;
  alojamento?: string | null;
  lado?: string | null;
  statusUnidade?: string | null;
};

type Conflito = {
  id: string;
  adolescenteA: {
    id: string;
    nome: string;
    numeroSms: string;
    fotoUrl?: string | null;
    alojamento?: string | null;
    lado?: string | null;
    statusUnidade?: string | null;
  };
  adolescenteB: {
    id: string;
    nome: string;
    numeroSms: string;
    fotoUrl?: string | null;
    alojamento?: string | null;
    lado?: string | null;
    statusUnidade?: string | null;
  };
  tipoConflito: string;
  status: "ATIVO" | "RESOLVIDO";
  origem: string;
  descricao?: string;
  criadoEm: string;
  resolvidoEm?: string;
  participantes?: Participante[];
  totalOcorrencias?: number;
  ultimaOcorrenciaEm?: string;
  ocorrencias?: Array<{
    id: string;
    descricao?: string | null;
    criadoEm: string;
    ci?: {
      id: string;
      numero: string;
      ano: string;
      tipo?: string | null;
      resumo?: string | null;
      dataFato?: string | null;
    } | null;
  }>;
};

type Mediacao = {
  id: string;
  dataTentativa: string;
  profissionalResponsavel: string;
  tipoIntervencao: string;
  resultado: string;
  observacoes: string;
  proximaAcaoRecomendada?: string;
  dataProximaAvaliacao?: string;
};

interface DetalhesConflitoProps {
  conflito: Conflito;
  mediacoes: Mediacao[];
  onAdicionarMediacao: (mediacao: any) => Promise<void>;
  onResolverConflito: () => Promise<void>;
  quickEditSlot?: ReactNode;
}

export function DetalhesConflito({
  conflito,
  mediacoes = [],
  onAdicionarMediacao,
  onResolverConflito,
  quickEditSlot,
}: DetalhesConflitoProps) {
  const totalOcorrencias =
    conflito.ocorrencias?.length ?? conflito.totalOcorrencias ?? 0;
  const ultimaOcorrenciaEm =
    conflito.ocorrencias && conflito.ocorrencias.length > 0
      ? conflito.ocorrencias[0].criadoEm
      : conflito.ultimaOcorrenciaEm;

  const listaMediacoes = Array.isArray(mediacoes) ? mediacoes : [];
  const participantes = conflito.participantes?.length
    ? conflito.participantes
    : [
        {
          id: conflito.adolescenteA.id,
          nome: conflito.adolescenteA.nome,
          numeroSms: conflito.adolescenteA.numeroSms,
          fotoUrl: conflito.adolescenteA.fotoUrl ?? null,
          alojamento: conflito.adolescenteA.alojamento,
          lado: conflito.adolescenteA.lado ?? "Lado 1",
          statusUnidade: conflito.adolescenteA.statusUnidade ?? null,
        },
        {
          id: conflito.adolescenteB.id,
          nome: conflito.adolescenteB.nome,
          numeroSms: conflito.adolescenteB.numeroSms,
          fotoUrl: conflito.adolescenteB.fotoUrl ?? null,
          alojamento: conflito.adolescenteB.alojamento,
          lado: conflito.adolescenteB.lado ?? "Lado 2",
          statusUnidade: conflito.adolescenteB.statusUnidade ?? null,
        },
      ];
  const [mostrarFormMediacao, setMostrarFormMediacao] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notificando, setNotificando] = useState(false);
  const [statusNotificacao, setStatusNotificacao] = useState<{
    tipo: "sucesso" | "erro";
    mensagem: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    dataTentativa: new Date().toISOString().split("T")[0],
    profissionalResponsavel: "",
    tipoIntervencao: "",
    resultado: "",
    observacoes: "",
    proximaAcaoRecomendada: "",
    dataProximaAvaliacao: "",
  });

  const getTipoColor = (tipo: string) => {
    const cores: Record<string, string> = {
      FACCAO: "bg-red-100 text-red-800 border-red-300",
      TERRITORIAL: "bg-orange-100 text-orange-800 border-orange-300",
      PESSOAL: "bg-yellow-100 text-yellow-800 border-yellow-300",
      OUTROS: "bg-gray-100 text-gray-800 border-gray-300",
    };
    return cores[tipo] || cores.OUTROS;
  };

  const getResultadoColor = (resultado: string) => {
    const cores: Record<string, string> = {
      RESOLVIDO: "bg-green-100 text-green-800",
      EM_ANDAMENTO: "bg-yellow-100 text-yellow-800",
      SEM_SUCESSO: "bg-red-100 text-red-800",
    };
    return cores[resultado] || "bg-gray-100 text-gray-800";
  };

  const formatarData = (valor?: string | null) => {
    if (!valor) return "";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor;
    return data.toLocaleDateString("pt-BR");
  };

  const handleSalvarMediacao = async () => {
    if (
      !formData.profissionalResponsavel ||
      !formData.tipoIntervencao ||
      !formData.resultado
    ) {
      alert("Preencha os campos obrigatorios.");
      return;
    }

    setLoading(true);
    try {
      await onAdicionarMediacao(formData);
      setFormData({
        dataTentativa: new Date().toISOString().split("T")[0],
        profissionalResponsavel: "",
        tipoIntervencao: "",
        resultado: "",
        observacoes: "",
        proximaAcaoRecomendada: "",
        dataProximaAvaliacao: "",
      });
      setMostrarFormMediacao(false);
      alert("Mediação registrada com sucesso.");
    } catch (error) {
      alert("Erro ao registrar mediação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleResolverConflito = async () => {
    if (!confirm("Confirmar resolucao do conflito?")) {
      return;
    }
    setLoading(true);
    try {
      await onResolverConflito();
      alert("Conflito marcado como resolvido.");
    } catch (error) {
      alert("Erro ao resolver conflito. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleNotificarTecnicos = async () => {
    setStatusNotificacao(null);
    setNotificando(true);
    try {
      const response = await fetch(`/api/conflitos/${conflito.id}/notificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "interno" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.erro ?? "Erro ao notificar tecnicos.");
      }

      setStatusNotificacao({
        tipo: "sucesso",
        mensagem: payload?.mensagem ?? "Notificacao enviada aos tecnicos.",
      });
    } catch (error) {
      setStatusNotificacao({
        tipo: "erro",
        mensagem:
          error instanceof Error
            ? error.message
            : "Falha ao notificar tecnicos.",
      });
    } finally {
      setNotificando(false);
    }
  };

  const ocorrencias = conflito.ocorrencias ?? [];
  const ladosConflito = participantes.reduce(
    (acc, participante) => {
      const lado = participante.lado === "Lado 2" ? "Lado 2" : "Lado 1";
      acc[lado].push(participante);
      return acc;
    },
    {
      "Lado 1": [] as Participante[],
      "Lado 2": [] as Participante[],
    },
  );

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
            <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-gray-800">
              <Swords className="text-red-600" size={36} />
              Detalhes do conflito
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-sm font-bold ${getTipoColor(
                  conflito.tipoConflito,
                )}`}
              >
                {conflito.tipoConflito}
              </span>
              {conflito.status === "ATIVO" ? (
                <span className="flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-3 py-1 text-sm font-bold text-red-800">
                  <AlertTriangle size={14} />
                  ATIVO
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full border border-green-300 bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                  <CheckCircle size={14} />
                  RESOLVIDO
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleNotificarTecnicos}
              disabled={notificando}
              className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              <Mail size={18} />
              {notificando ? "Enviando..." : "Notificar tecnicos"}
            </button>
            {conflito.status === "ATIVO" && (
              <button
                onClick={handleResolverConflito}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                <CheckCircle size={20} />
                Marcar como resolvido
              </button>
            )}
          </div>
        </div>

        {statusNotificacao && (
          <p
            className={`mt-3 text-sm ${
              statusNotificacao.tipo === "sucesso"
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {statusNotificacao.mensagem}
          </p>
        )}
      </div>

      {ocorrencias.length > 0 && (
        <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">
                Ocorrências / CIs vinculados
              </p>
              <h3 className="text-lg font-bold text-gray-800">
                {ocorrencias.length} registro(s)
                {totalOcorrencias > 0
                  ? ` · ${totalOcorrencias} ocorrencia(s) total`
                  : ""}
              </h3>
            </div>
            {ultimaOcorrenciaEm && (
              <span className="text-sm text-gray-600">
                Última em{" "}
                {new Date(ultimaOcorrenciaEm).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-200">
            {ocorrencias.map((oc) => (
              <div key={oc.id} className="py-3 flex flex-col gap-1">
                <div className="text-sm text-gray-700 flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-500" />
                  {new Date(oc.criadoEm).toLocaleString("pt-BR")}
                  {oc.ci && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      CI {oc.ci.numero}/{oc.ci.ano}{" "}
                      {oc.ci.tipo ? `(${oc.ci.tipo})` : ""}
                    </span>
                  )}
                </div>
                {oc.ci?.resumo && (
                  <p className="text-sm text-gray-800 font-medium">
                    {oc.ci.resumo}
                  </p>
                )}
                {oc.descricao && !oc.ci?.resumo && (
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {oc.descricao}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {quickEditSlot}

      <div className="rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-gray-800">
          Informacoes do conflito
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              { titulo: "Lado 1", lista: ladosConflito["Lado 1"] },
              { titulo: "Lado 2", lista: ladosConflito["Lado 2"] },
            ] as const
          ).map(({ titulo, lista }) => (
            <div
              key={titulo}
              className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">{titulo}</p>
                <span className="text-[11px] font-semibold text-gray-500">
                  {lista.length} participante(s)
                </span>
              </div>
              {lista.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Nenhum adolescente neste lado.
                </p>
              ) : (
                <div className="space-y-2">
                  {lista.map((participante) => {
                    const statusNormalizado =
                      participante.statusUnidade?.toUpperCase() ?? "ATIVO";
                    const inativo = statusNormalizado !== "ATIVO";
                    const statusLabel =
                      statusNormalizado === "TRANSFERIDO"
                        ? "Transferido"
                        : statusNormalizado === "LIBERADO"
                          ? "Liberado"
                          : statusNormalizado === "EVADIDO"
                            ? "Evadido"
                            : statusNormalizado === "ATIVO"
                              ? "Ativo"
                              : statusNormalizado;
                    return (
                      <Link
                        key={participante.id}
                        href={`/adolescentes/${participante.id}`}
                        className={`block rounded-lg border px-3 py-2 text-sm hover:bg-indigo-100 ${
                          inativo
                            ? "border-slate-200 bg-slate-50"
                            : "border-indigo-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {participante.fotoUrl ? (
                            <div className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0">
                              <img
                                src={participante.fotoUrl}
                                alt={participante.nome}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              title="Sem foto cadastrada"
                              className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0"
                            >
                              {participante.nome?.trim().charAt(0) ?? "?"}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-gray-800">
                                {participante.nome}
                              </p>
                              {inativo && (
                                <span className="text-[11px] font-semibold text-slate-500">
                                  Status: {statusLabel}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              SMS: {participante.numeroSms}
                              {participante.alojamento && (
                                <> - {participante.alojamento}</>
                              )}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-semibold">Origem</p>
            <p>{conflito.origem}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-semibold">Data de registro</p>
            <p>{formatarData(conflito.criadoEm)}</p>
          </div>
        </div>

        {conflito.descricao && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">
              Descricao
            </p>
            <p className="text-gray-800">{conflito.descricao}</p>
          </div>
        )}

        {conflito.status === "RESOLVIDO" && conflito.resolvidoEm && (
          <div className="mt-4 rounded-r-lg border-l-4 border-green-500 bg-green-50 p-4 text-green-900">
            Conflito resolvido em {formatarData(conflito.resolvidoEm)}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <FileText size={22} />
            Historico de mediacoes ({listaMediacoes.length})
          </h2>
          {conflito.status === "ATIVO" && !mostrarFormMediacao && (
            <button
              onClick={() => setMostrarFormMediacao(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus size={18} />
              Registrar mediação
            </button>
          )}
        </div>

        {mostrarFormMediacao && (
          <div className="mb-6 rounded-xl border-2 border-indigo-200 bg-indigo-50 p-6">
            <h3 className="mb-4 font-bold text-gray-800">
              Nova tentativa de mediacao
            </h3>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Data da tentativa *
                  </label>
                  <input
                    type="date"
                    value={formData.dataTentativa}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        dataTentativa: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Profissional responsavel *
                  </label>
                  <input
                    type="text"
                    value={formData.profissionalResponsavel}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        profissionalResponsavel: event.target.value,
                      })
                    }
                    placeholder="Ex: Maria Santos - Psicologa"
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Tipo de intervenção *
                  </label>
                  <select
                    value={formData.tipoIntervencao}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        tipoIntervencao: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-indigo-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="MEDIACAO">Mediacao</option>
                    <option value="CIRCULO_RESTAURATIVO">
                      Circulo restaurativo
                    </option>
                    <option value="ATENDIMENTO_INDIVIDUAL">
                      Atendimento individual
                    </option>
                    <option value="GRUPO_TERAPEUTICO">Grupo terapeutico</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Resultado *
                  </label>
                  <select
                    value={formData.resultado}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        resultado: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-indigo-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="RESOLVIDO">Resolvido</option>
                    <option value="EM_ANDAMENTO">Em andamento</option>
                    <option value="SEM_SUCESSO">Sem sucesso</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Observações *
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      observacoes: event.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Descreva o que foi feito, reacoes dos adolescentes e encaminhamentos"
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Proxima acao recomendada
                  </label>
                  <input
                    type="text"
                    value={formData.proximaAcaoRecomendada}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        proximaAcaoRecomendada: event.target.value,
                      })
                    }
                    placeholder="Ex: acompanhamento em 15 dias"
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Data da proxima avaliacao
                  </label>
                  <input
                    type="date"
                    value={formData.dataProximaAvaliacao}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        dataProximaAvaliacao: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setMostrarFormMediacao(false)}
                className="rounded-lg border-2 border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarMediacao}
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading ? "Salvando..." : "Salvar mediacao"}
              </button>
            </div>
          </div>
        )}

        {listaMediacoes.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Clock size={48} className="mx-auto mb-2 text-gray-400" />
            <p>Nenhuma tentativa de mediacao registrada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {listaMediacoes.map((mediacao, index) => (
              <div
                key={mediacao.id}
                className="rounded-lg border-l-4 border-indigo-500 bg-gray-50 p-4"
              >
                <div className="mb-3 flex flex-wrap	items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-gray-800">
                      Tentativa #{listaMediacoes.length - index}
                    </h4>
                    <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                      <Calendar size={14} />
                      {formatarData(mediacao.dataTentativa)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getResultadoColor(
                      mediacao.resultado,
                    )}`}
                  >
                    {mediacao.resultado}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-semibold">Profissional:</span>{" "}
                    {mediacao.profissionalResponsavel}
                  </p>
                  <p>
                    <span className="font-semibold">Tipo:</span>{" "}
                    {mediacao.tipoIntervencao}
                  </p>
                  <p>{mediacao.observacoes}</p>
                  {mediacao.proximaAcaoRecomendada && (
                    <p className="text-indigo-700">
                      <span className="font-semibold">Proxima acao:</span>{" "}
                      {mediacao.proximaAcaoRecomendada}
                      {mediacao.dataProximaAvaliacao && (
                        <> em {formatarData(mediacao.dataProximaAvaliacao)}</>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
