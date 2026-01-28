"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Download,
  Eye,
  Search,
  Filter,
  Calendar,
  User,
  AlertCircle,
  Shield,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface JustificativaAlgema {
  id: string;
  numeroDocumento: string;
  adolescente: {
    id: string;
    nomeCompleto: string;
    numeroSms: string | null;
    numeroProcesso: string | null;
    fotoUrl: string | null;
  };
  operadorResponsavel: {
    id: string;
    nomeCompleto: string;
    funcaoRole: string;
  };
  dataHoraOcorrencia: string;
  motivoPrincipal: string;
  destinoMovimentacao: string | null;
  riscoFuga: string;
  riscoAgressao: string;
  riscoAutolesao: string;
  status: string;
  criadoEm: string;
}

const MOTIVOS_MAP: Record<string, string> = {
  TRANSFERENCIA_JUDICIAL: "Transferência Judicial",
  AUDIENCIA: "Audiência no Fórum",
  ATENDIMENTO_EXTERNO: "Atendimento Médico Externo",
  FUGA_TENTATIVA: "Tentativa de Fuga",
  AGRESSAO_GRAVE: "Agressão Grave",
  OUTRO: "Outro Motivo",
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  EMITIDO: { label: "Emitido", color: "bg-blue-100 text-blue-800 border-blue-300", icon: FileText },
  ANEXADO_PROCESSO: { label: "Anexado ao Processo", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle },
  ARQUIVADO: { label: "Arquivado", color: "bg-gray-100 text-gray-800 border-gray-300", icon: FileText },
};

const RISCO_COLORS: Record<string, string> = {
  BAIXO: "text-green-600",
  MEDIO: "text-yellow-600",
  ALTO: "text-red-600",
};

export default function JustificativasAlgemaPage() {
  const [justificativas, setJustificativas] = useState<JustificativaAlgema[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchJustificativas();
  }, [statusFiltro]);

  const fetchJustificativas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFiltro) params.append("status", statusFiltro);

      const response = await fetch(`/api/justificativas-algema?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar justificativas");
      }

      const data = await response.json();
      setJustificativas(data.justificativas || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao carregar justificativas de algema");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (
    id: string,
    numeroDocumento: string,
    via: "agente" | "judicial"
  ) => {
    try {
      const response = await fetch(
        `/api/justificativas-algema/${id}/pdf?via=${via}`
      );

      if (!response.ok) {
        throw new Error("Erro ao gerar PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `justificativa-algema-${numeroDocumento}-${via}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao baixar PDF");
    }
  };

  const justificativasFiltradas = justificativas.filter((j) => {
    const searchLower = busca.toLowerCase();
    return (
      j.numeroDocumento.toLowerCase().includes(searchLower) ||
      j.adolescente.nomeCompleto.toLowerCase().includes(searchLower) ||
      (j.adolescente.numeroSms && j.adolescente.numeroSms.toLowerCase().includes(searchLower))
    );
  });

  const getRiscoMaisAlto = (fuga: string, agressao: string, autolesao: string) => {
    if (fuga === "ALTO" || agressao === "ALTO" || autolesao === "ALTO") return "ALTO";
    if (fuga === "MEDIO" || agressao === "MEDIO" || autolesao === "MEDIO") return "MEDIO";
    return "BAIXO";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-10 h-10 text-indigo-600" />
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">
                    Justificativas de Algema
                  </h1>
                  <p className="text-slate-600 text-sm">
                    Documentos oficiais para uso de contenção física
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Link
                href="/justificativas-algema/nova"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl justify-center"
              >
                <Plus size={20} />
                Nova Justificativa
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-indigo-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Total de Justificativas</p>
                  <p className="text-2xl font-bold text-slate-900">{total}</p>
                </div>
                <FileText className="text-indigo-600" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Emitidas</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {justificativas.filter((j) => j.status === "EMITIDO").length}
                  </p>
                </div>
                <FileText className="text-blue-600" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Anexadas</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {justificativas.filter((j) => j.status === "ANEXADO_PROCESSO").length}
                  </p>
                </div>
                <CheckCircle className="text-green-600" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-gray-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Arquivadas</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {justificativas.filter((j) => j.status === "ARQUIVADO").length}
                  </p>
                </div>
                <FileText className="text-gray-600" size={32} />
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-md p-4 border border-slate-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por número do documento, nome ou SMS..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="w-full md:w-64">
                <select
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Todos os status</option>
                  <option value="EMITIDO">Emitido</option>
                  <option value="ANEXADO_PROCESSO">Anexado ao Processo</option>
                  <option value="ARQUIVADO">Arquivado</option>
                </select>
              </div>

              <button
                onClick={fetchJustificativas}
                disabled={loading}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Carregando justificativas...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && justificativasFiltradas.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border-2 border-dashed border-slate-300">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              {busca ? "Nenhuma justificativa encontrada" : "Nenhuma justificativa registrada"}
            </h3>
            <p className="text-slate-500 mb-6">
              {busca
                ? "Tente ajustar os filtros de busca"
                : "Clique em 'Nova Justificativa' para criar o primeiro documento"}
            </p>
          </div>
        )}

        {/* Lista de Justificativas */}
        {!loading && justificativasFiltradas.length > 0 && (
          <div className="space-y-4">
            {justificativasFiltradas.map((justificativa) => {
              const StatusInfo = STATUS_MAP[justificativa.status];
              const StatusIcon = StatusInfo?.icon || FileText;
              const riscoGeral = getRiscoMaisAlto(
                justificativa.riscoFuga,
                justificativa.riscoAgressao,
                justificativa.riscoAutolesao
              );

              return (
                <div
                  key={justificativa.id}
                  className="bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-900">
                            {justificativa.numeroDocumento}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${StatusInfo?.color || "bg-gray-100 text-gray-800 border-gray-300"}`}
                          >
                            <StatusIcon size={14} />
                            {StatusInfo?.label || justificativa.status}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                              riscoGeral === "ALTO"
                                ? "bg-red-100 text-red-800 border-red-300"
                                : riscoGeral === "MEDIO"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                : "bg-green-100 text-green-800 border-green-300"
                            }`}
                          >
                            <AlertCircle size={14} />
                            Risco: {riscoGeral}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-600 mb-1">
                              <strong>Adolescente:</strong>
                            </p>
                            <p className="text-slate-900 font-semibold">
                              {justificativa.adolescente.nomeCompleto}
                            </p>
                            {justificativa.adolescente.numeroSms && (
                              <p className="text-slate-600 text-xs">
                                SMS: {justificativa.adolescente.numeroSms}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-slate-600 mb-1">
                              <strong>Motivo:</strong>
                            </p>
                            <p className="text-slate-900">
                              {MOTIVOS_MAP[justificativa.motivoPrincipal] || justificativa.motivoPrincipal}
                            </p>
                            {justificativa.destinoMovimentacao && (
                              <p className="text-slate-600 text-xs">
                                Destino: {justificativa.destinoMovimentacao}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-slate-600 mb-1">
                              <strong>Data/Hora da Ocorrência:</strong>
                            </p>
                            <div className="flex items-center gap-1">
                              <Calendar size={14} className="text-slate-500" />
                              <p className="text-slate-900">
                                {new Date(justificativa.dataHoraOcorrencia).toLocaleString("pt-BR")}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-slate-600 mb-1">
                              <strong>Responsável:</strong>
                            </p>
                            <div className="flex items-center gap-1">
                              <User size={14} className="text-slate-500" />
                              <p className="text-slate-900">
                                {justificativa.operadorResponsavel.nomeCompleto}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Avaliação de Risco Detalhada */}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <p className="text-xs text-slate-600 font-semibold mb-2">Avaliação de Risco:</p>
                          <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-slate-700">Fuga:</span>
                              <span className={`font-bold ${RISCO_COLORS[justificativa.riscoFuga]}`}>
                                {justificativa.riscoFuga}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-slate-700">Agressão:</span>
                              <span className={`font-bold ${RISCO_COLORS[justificativa.riscoAgressao]}`}>
                                {justificativa.riscoAgressao}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-slate-700">Autolesão:</span>
                              <span className={`font-bold ${RISCO_COLORS[justificativa.riscoAutolesao]}`}>
                                {justificativa.riscoAutolesao}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() =>
                            handleDownloadPDF(
                              justificativa.id,
                              justificativa.numeroDocumento,
                              "agente"
                            )
                          }
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                        >
                          <Download size={16} />
                          PDF Agente
                        </button>

                        <button
                          onClick={() =>
                            handleDownloadPDF(
                              justificativa.id,
                              justificativa.numeroDocumento,
                              "judicial"
                            )
                          }
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                        >
                          <Download size={16} />
                          PDF Judicial
                        </button>

                        <Link
                          href={`/adolescentes/${justificativa.adolescente.id}`}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                        >
                          <Eye size={16} />
                          Ver Adolescente
                        </Link>
                      </div>
                    </div>

                    {/* Footer com timestamp */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
                      <Clock size={12} />
                      <span>
                        Criado em: {new Date(justificativa.criadoEm).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-indigo-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-indigo-800">
              <p className="font-semibold mb-1">Informações Importantes</p>
              <ul className="space-y-1 text-xs">
                <li>• A Justificativa de Algema é um documento OBRIGATÓRIO previsto no SINASE e ECA</li>
                <li>• O documento protege legalmente a unidade e o operador de acusações de abuso</li>
                <li>• Todos os documentos são auditáveis pelo Judiciário e Ministério Público</li>
                <li>• Mantenha os documentos anexados aos processos judiciais correspondentes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
