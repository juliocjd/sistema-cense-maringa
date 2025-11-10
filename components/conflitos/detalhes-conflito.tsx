"use client";

import { useState } from "react";
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
  alojamento?: string;
};

type Conflito = {
  id: string;
  adolescenteA: {
    id: string;
    nome: string;
    numeroSms: string;
    alojamento?: string;
  };
  adolescenteB: {
    id: string;
    nome: string;
    numeroSms: string;
    alojamento?: string;
  };
  tipoConflito: string;
  status: "ATIVO" | "RESOLVIDO";
  origem: string;
  descricao?: string;
  criadoEm: string;
  resolvidoEm?: string;
  participantes?: Participante[];
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
}

export function DetalhesConflito({
  conflito,
  mediacoes = [],
  onAdicionarMediacao,
  onResolverConflito,
}: DetalhesConflitoProps) {
  const listaMediacoes = Array.isArray(mediacoes) ? mediacoes : [];
  const participantes = conflito.participantes?.length
    ? conflito.participantes
    : [
        {
          id: conflito.adolescenteA.id,
          nome: conflito.adolescenteA.nome,
          numeroSms: conflito.adolescenteA.numeroSms,
          alojamento: conflito.adolescenteA.alojamento,
        },
        {
          id: conflito.adolescenteB.id,
          nome: conflito.adolescenteB.nome,
          numeroSms: conflito.adolescenteB.numeroSms,
          alojamento: conflito.adolescenteB.alojamento,
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
      alert("Mediacao registrada com sucesso.");
    } catch (error) {
      alert("Erro ao registrar mediacao. Tente novamente.");
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

  const handleNotificarAgentes = async () => {
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
        throw new Error(payload?.erro ?? "Erro ao notificar agentes.");
      }

      setStatusNotificacao({
        tipo: "sucesso",
        mensagem: payload?.mensagem ?? "Notificacao enviada aos agentes.",
      });
    } catch (error) {
      setStatusNotificacao({
        tipo: "erro",
        mensagem:
          error instanceof Error
            ? error.message
            : "Falha ao notificar agentes.",
      });
    } finally {
      setNotificando(false);
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
            <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-gray-800">
              <Swords className="text-red-600" size={36} />
              Detalhes do conflito
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-sm font-bold ${getTipoColor(
                  conflito.tipoConflito
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
              onClick={handleNotificarAgentes}
              disabled={notificando}
              className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              <Mail size={18} />
              {notificando ? "Enviando..." : "Notificar agentes"}
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
              statusNotificacao.tipo === "sucesso" ? "text-green-700" : "text-red-700"
            }`}
          >
            {statusNotificacao.mensagem}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-gray-800">Informacoes do conflito</h2>

        <div className="grid gap-6 md:grid-cols-2">
          {(conflito.participantes?.length
            ? conflito.participantes
            : [
                {
                  id: conflito.adolescenteA.id,
                  nome: conflito.adolescenteA.nome,
                  numeroSms: conflito.adolescenteA.numeroSms,
                  alojamento: conflito.adolescenteA.alojamento,
                },
                {
                  id: conflito.adolescenteB.id,
                  nome: conflito.adolescenteB.nome,
                  numeroSms: conflito.adolescenteB.numeroSms,
                  alojamento: conflito.adolescenteB.alojamento,
                },
              ]
          ).map((participante, index) => (
            <div
              key={`${participante.id}-${index}`}
              className="rounded-lg border-2 border-red-200 bg-red-50 p-4"
            >
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                <User size={18} />
                {`Participante ${index + 1}`}
              </h3>
              <p className="text-lg font-bold text-gray-900">{participante.nome}</p>
              <p className="text-sm text-gray-600">
                SMS: {participante.numeroSms}
                {participante.alojamento ? ` | ${participante.alojamento}` : ""}
              </p>
              <Link
                href={`/adolescentes/${participante.id}`}
                className="mt-2 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Ver dossie &rarr;
              </Link>
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
            <p className="mb-2 text-sm font-semibold text-gray-700">Descricao</p>
            <p className="text-gray-800">{conflito.descricao}</p>
          </div>
        )}

        {conflito.resolvidoEm && (
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
              Registrar mediacao
            </button>
          )}
        </div>

        {mostrarFormMediacao && (
          <div className="mb-6 rounded-xl border-2 border-indigo-200 bg-indigo-50 p-6">
            <h3 className="mb-4 font-bold text-gray-800">Nova tentativa de mediacao</h3>

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
                      setFormData({ ...formData, dataTentativa: event.target.value })
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
                    Tipo de intervencao *
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
                    <option value="ATENDIMENTO_INDIVIDUAL">Atendimento individual</option>
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
                      setFormData({ ...formData, resultado: event.target.value })
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
                  Observacoes *
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(event) =>
                    setFormData({ ...formData, observacoes: event.target.value })
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
                      mediacao.resultado
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

