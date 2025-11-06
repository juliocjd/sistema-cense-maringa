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
} from "lucide-react";

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
  const [mostrarFormMediacao, setMostrarFormMediacao] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form de mediaÃ§Ã£o
  const [formData, setFormData] = useState({
    dataTentativa: new Date().toISOString().split("T")[0],
    profissionalResponsavel: "",
    tipoIntervencao: "",
    resultado: "",
    observacoes: "",
    proximaAcaoRecomendada: "",
    dataProximaAvaliacao: "",
  });

  const handleSalvarMediacao = async () => {
    if (
      !formData.profissionalResponsavel ||
      !formData.tipoIntervencao ||
      !formData.resultado
    ) {
      alert("Preencha os campos obrigatÃ³rios!");
      return;
    }

    setLoading(true);
    try {
      await onAdicionarMediacao(formData);

      // Limpar formulÃ¡rio
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
      alert("âœ… MediaÃ§Ã£o registrada com sucesso!");
    } catch (error) {
      alert("âŒ Erro ao registrar mediaÃ§Ã£o. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleResolverConflito = async () => {
    if (
      !confirm("Tem certeza que deseja marcar este conflito como RESOLVIDO?")
    ) {
      return;
    }

    setLoading(true);
    try {
      await onResolverConflito();
      alert("âœ… Conflito marcado como resolvido!");
    } catch (error) {
      alert("âŒ Erro ao resolver conflito. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-red-600">
        <Link
          href="/conflitos"
          className="flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold mb-4"
        >
          <ArrowLeft size={20} />
          Voltar para lista
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <Swords className="text-red-600" size={36} />
              Detalhes do Conflito
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold border ${getTipoColor(
                  conflito.tipoConflito
                )}`}
              >
                {conflito.tipoConflito}
              </span>
              {conflito.status === "ATIVO" ? (
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold border border-red-300 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  ATIVO
                </span>
              ) : (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold border border-green-300 flex items-center gap-1">
                  <CheckCircle size={14} />
                  RESOLVIDO
                </span>
              )}
            </div>
          </div>

          {conflito.status === "ATIVO" && (
            <button
              onClick={handleResolverConflito}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-semibold flex items-center gap-2"
            >
              <CheckCircle size={20} />
              Marcar como Resolvido
            </button>
          )}
        </div>
      </div>

      {/* InformaÃ§Ãµes do Conflito */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          InformaÃ§Ãµes do Conflito
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Adolescente A */}
          <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <User size={18} />
              Adolescente A
            </h3>
            <p className="font-bold text-gray-800 text-lg mb-1">
              {conflito.adolescenteA.nome}
            </p>
            <p className="text-sm text-gray-600">
              SMS: {conflito.adolescenteA.numeroSms}
            </p>
            {conflito.adolescenteA.alojamento && (
              <p className="text-sm text-gray-600">
                ðŸ“ {conflito.adolescenteA.alojamento}
              </p>
            )}
            <Link
              href={`/adolescentes/${conflito.adolescenteA.id}`}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold mt-2 inline-block"
            >
              Ver dossiÃª â†’
            </Link>
          </div>

          {/* Adolescente B */}
          <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <User size={18} />
              Adolescente B
            </h3>
            <p className="font-bold text-gray-800 text-lg mb-1">
              {conflito.adolescenteB.nome}
            </p>
            <p className="text-sm text-gray-600">
              SMS: {conflito.adolescenteB.numeroSms}
            </p>
            {conflito.adolescenteB.alojamento && (
              <p className="text-sm text-gray-600">
                ðŸ“ {conflito.adolescenteB.alojamento}
              </p>
            )}
            <Link
              href={`/adolescentes/${conflito.adolescenteB.id}`}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold mt-2 inline-block"
            >
              Ver dossiÃª â†’
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600 mb-1">Origem</p>
            <p className="font-semibold text-gray-800">{conflito.origem}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600 mb-1">Data de Registro</p>
            <p className="font-semibold text-gray-800">
              {new Date(conflito.criadoEm).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        {conflito.descricao && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              DescriÃ§Ã£o:
            </p>
            <p className="text-gray-800">{conflito.descricao}</p>
          </div>
        )}

        {conflito.resolvidoEm && (
          <div className="mt-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg p-4">
            <p className="font-semibold text-green-900">
              âœ… Conflito resolvido em{" "}
              {new Date(conflito.resolvidoEm).toLocaleString("pt-BR")}
            </p>
          </div>
        )}
      </div>

      {/* HistÃ³rico de MediaÃ§Ãµes */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={24} />
            HistÃ³rico de MediaÃ§Ãµes ({listaMediacoes.length})
          </h2>
          {conflito.status === "ATIVO" && !mostrarFormMediacao && (
            <button
              onClick={() => setMostrarFormMediacao(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-semibold"
            >
              <Plus size={18} />
              Registrar MediaÃ§Ã£o
            </button>
          )}
        </div>

        {/* FormulÃ¡rio de Nova MediaÃ§Ã£o */}
        {mostrarFormMediacao && (
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-gray-800 mb-4">
              Registrar Nova Tentativa de MediaÃ§Ã£o
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data da Tentativa *
                  </label>
                  <input
                    type="date"
                    value={formData.dataTentativa}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dataTentativa: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Profissional ResponsÃ¡vel *
                  </label>
                  <input
                    type="text"
                    value={formData.profissionalResponsavel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        profissionalResponsavel: e.target.value,
                      })
                    }
                    placeholder="Ex: Maria Santos - PsicÃ³loga"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de IntervenÃ§Ã£o *
                  </label>
                  <select
                    value={formData.tipoIntervencao}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipoIntervencao: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="MEDIACAO">MediaÃ§Ã£o</option>
                    <option value="ATENDIMENTO_INDIVIDUAL">
                      Atendimento Individual
                    </option>
                    <option value="GRUPO_TERAPEUTICO">Grupo TerapÃªutico</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Resultado *
                  </label>
                  <select
                    value={formData.resultado}
                    onChange={(e) =>
                      setFormData({ ...formData, resultado: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="RESOLVIDO">Resolvido</option>
                    <option value="EM_ANDAMENTO">Em Andamento</option>
                    <option value="SEM_SUCESSO">Sem Sucesso</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ObservaÃ§Ãµes *
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  rows={3}
                  placeholder="Descreva o que foi feito, reaÃ§Ãµes dos adolescentes, etc..."
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    PrÃ³xima AÃ§Ã£o Recomendada
                  </label>
                  <input
                    type="text"
                    value={formData.proximaAcaoRecomendada}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        proximaAcaoRecomendada: e.target.value,
                      })
                    }
                    placeholder="Ex: Acompanhamento em 15 dias"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data da PrÃ³xima AvaliaÃ§Ã£o
                  </label>
                  <input
                    type="date"
                    value={formData.dataProximaAvaliacao}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dataProximaAvaliacao: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setMostrarFormMediacao(false)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarMediacao}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? "Salvando..." : "Salvar MediaÃ§Ã£o"}
              </button>
            </div>
          </div>
        )}

        {/* Lista de MediaÃ§Ãµes */}
        {listaMediacoes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock size={48} className="mx-auto mb-2 text-gray-400" />
            <p>Nenhuma tentativa de mediaÃ§Ã£o registrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {listaMediacoes.map((mediacao, index) => (
              <div
                key={mediacao.id}
                className="bg-gray-50 rounded-lg p-4 border-l-4 border-indigo-500"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800">
                      Tentativa #{listaMediacoes.length - index}
                    </h4>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Calendar size={14} />
                      {new Date(mediacao.dataTentativa).toLocaleDateString(
                        "pt-BR"
                      )}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${getResultadoColor(
                      mediacao.resultado
                    )}`}
                  >
                    {mediacao.resultado}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-semibold text-gray-700">
                      Profissional:
                    </span>{" "}
                    {mediacao.profissionalResponsavel}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Tipo:</span>{" "}
                    {mediacao.tipoIntervencao}
                  </p>
                  <p className="text-gray-800">{mediacao.observacoes}</p>
                  {mediacao.proximaAcaoRecomendada && (
                    <p className="text-indigo-700">
                      <span className="font-semibold">PrÃ³xima aÃ§Ã£o:</span>{" "}
                      {mediacao.proximaAcaoRecomendada}
                      {mediacao.dataProximaAvaliacao && (
                        <>
                          {" "}
                          em{" "}
                          {new Date(
                            mediacao.dataProximaAvaliacao
                          ).toLocaleDateString("pt-BR")}
                        </>
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
