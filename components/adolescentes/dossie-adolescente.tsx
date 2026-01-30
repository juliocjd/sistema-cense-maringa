"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  User,
  MapPin,
  FileText,
  AlertTriangle,
  Camera,
  History,
  Swords,
  Users,
  Calendar,
  Download,
  Printer,
} from "lucide-react";
import type {
  Adolescente,
  AdolescenteAlojamentoResumo,
  AdolescenteGrupoResumo,
  AdolescenteTatuagemResumo,
  Conflito,
} from "@/types";
import type { HistoricoMovimentacaoRegistro } from "@/types";

interface DossieAdolescenteProps {
  adolescente: Adolescente;
}

export function DossieAdolescente({ adolescente }: DossieAdolescenteProps) {
  const [abaAtiva, setAbaAtiva] = useState("geral");
  const [historicoMovimentacao, setHistoricoMovimentacao] = useState<
    HistoricoMovimentacaoRegistro[]
  >([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoErro, setHistoricoErro] = useState<string | null>(null);
  const podeVerAlocacao = adolescente.statusUnidade === "ATIVO";

  useEffect(() => {
    let ativo = true;
    const carregarHistorico = async () => {
      setHistoricoLoading(true);
      setHistoricoErro(null);
      try {
        const response = await fetch(
          `/api/adolescentes/${adolescente.id}/historico-movimentacao?take=50`
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(
            payload?.erro || "Erro ao carregar histórico de movimentação."
          );
        }
        if (!ativo) {
          return;
        }
        setHistoricoMovimentacao(payload.historico ?? []);
      } catch (error) {
        if (!ativo) {
          return;
        }
        setHistoricoErro(
          error instanceof Error
            ? error.message
            : "Erro ao carregar histórico."
        );
        setHistoricoMovimentacao([]);
      } finally {
        if (ativo) {
          setHistoricoLoading(false);
        }
      }
    };

    carregarHistorico();
    return () => {
      ativo = false;
    };
  }, [adolescente.id]);

  const abas = [
    { id: "geral", label: "Informações Gerais", icone: User },
    { id: "alocacao", label: "Alocação Atual", icone: MapPin, habilitada: podeVerAlocacao },
    { id: "infracional", label: "Histórico Infracional", icone: FileText },
    { id: "alertas", label: "Alertas", icone: AlertTriangle },
    { id: "tatuagens", label: "Tatuagens", icone: Camera },
    { id: "conflitos", label: "Conflitos", icone: Swords },
    { id: "grupos", label: "Grupos", icone: Users },
    { id: "historico", label: "Histórico", icone: History },
  ];

  useEffect(() => {
    if (!podeVerAlocacao && abaAtiva === "alocacao") {
      setAbaAtiva("geral");
    }
  }, [abaAtiva, podeVerAlocacao]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { cor: string; texto: string }> = {
      ATIVO: {
        cor: "bg-green-100 text-green-800 border-green-300",
        texto: "Ativo",
      },
      TRANSFERIDO: {
        cor: "bg-blue-100 text-blue-800 border-blue-300",
        texto: "Transferido",
      },
      LIBERADO: {
        cor: "bg-gray-100 text-gray-800 border-gray-300",
        texto: "Liberado",
      },
      EVADIDO: {
        cor: "bg-red-100 text-red-800 border-red-300",
        texto: "Evadido",
      },
    };
    const badge = badges[status] || badges.ATIVO;
    return (
      <span
        className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${badge.cor}`}
      >
        {badge.texto}
      </span>
    );
  };

  // Dados que virão da API (atualmente vazios até serem cadastrados)
  const dadosAdicionais: {
    alojamento: AdolescenteAlojamentoResumo | null;
    faccao: Adolescente["faccao"];
    bairro: Adolescente["bairroOrigem"];
    historicoInfracional: any[];
    tatuagens: AdolescenteTatuagemResumo[];
    conflitos: Conflito[];
    grupos: AdolescenteGrupoResumo[];
  } = {
    alojamento: adolescente.alojamentoAtual ?? null,
    faccao: adolescente.faccao ?? null,
    bairro: adolescente.bairroOrigem ?? null,
    historicoInfracional: [],
    tatuagens: (adolescente.tatuagens ?? []) as AdolescenteTatuagemResumo[],
    conflitos: [
      ...((adolescente.conflitosA ?? []) as Conflito[]),
      ...((adolescente.conflitosB ?? []) as Conflito[]),
    ],
    grupos: (adolescente.grupos ?? []) as AdolescenteGrupoResumo[],
  };

  const formatarNumeroCasa = (numero?: number | string | null) => {
    if (numero === null || numero === undefined) {
      return null;
    }
    const numeroString = String(numero).padStart(2, "0");
    return `Casa ${numeroString}`;
  };

  const obterDescricaoCasa = (
    alojamento: AdolescenteAlojamentoResumo | null
  ) => {
    const casa = alojamento?.casa;
    if (!casa) {
      return "Casa nao identificada";
    }

    if (casa.nome) {
      return casa.nome;
    }

    if (casa.numero !== null && casa.numero !== undefined) {
      const numeroFormatado = String(casa.numero).padStart(2, "0");
      return `Casa ${numeroFormatado}`;
    }

    return "Casa nao identificada";
  };

  const obterNumeroAlojamento = (numero?: string) => {
    if (!numero) return "-";
    return numero.padStart(2, "0");
  };

  const formatarLocalizacaoHistorico = (
    casa?: { nome?: string | null; numero?: number | string | null } | null,
    alojamento?: { numeroAlojamento?: string | null; ala?: string | null } | null
  ) => {
    const partes: string[] = [];
    if (casa) {
      if (casa.nome) {
        partes.push(casa.nome);
      } else if (casa.numero !== null && casa.numero !== undefined) {
        partes.push(formatarNumeroCasa(casa.numero) ?? "Casa N/I");
      }
    }
    if (alojamento?.numeroAlojamento) {
      const numero = alojamento.numeroAlojamento.padStart(2, "0");
      partes.push(`Aloj. ${numero}`);
    }
    if (alojamento?.ala) {
      partes.push(`Ala ${alojamento.ala}`);
    }
    return partes.length > 0 ? partes.join(" - ") : "Local não informado";
  };

  const gerarDescricaoMovimentacao = (
    registro: HistoricoMovimentacaoRegistro
  ) => {
    const origem = formatarLocalizacaoHistorico(
      registro.origemCasa,
      registro.origemAlojamento
    );
    const destino = formatarLocalizacaoHistorico(
      registro.destinoCasa,
      registro.destinoAlojamento
    );

    if (registro.origemCasa || registro.origemAlojamento) {
      if (registro.destinoCasa || registro.destinoAlojamento) {
        return `Movimentado de ${origem} para ${destino}.`;
      }
      return `Origem: ${origem}.`;
    }

    if (registro.destinoCasa || registro.destinoAlojamento) {
      return `Destino: ${destino}.`;
    }

    return "Registro adicionado ao histórico do adolescente.";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-indigo-600">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-4">
          <Link
            href="/adolescentes"
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            <ArrowLeft size={20} />
            Voltar para lista
          </Link>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              <Printer size={18} />
              Imprimir
            </button>
            <button
              onClick={() => alert("Exportar PDF (implementar)")}
              className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              <Download size={18} />
              Exportar PDF
            </button>
            <Link
              href={`/adolescentes/${adolescente.id}/editar`}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-semibold text-center"
            >
              <Edit size={18} />
              Editar
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Foto */}
          <div className="mx-auto lg:mx-0 w-32 h-32 bg-indigo-100 rounded-2xl flex items-center justify-center overflow-hidden border-4 border-indigo-200 flex-shrink-0">
            {adolescente.fotoUrl ? (
              <img
                src={adolescente.fotoUrl}
                alt={adolescente.nomeCompleto}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-5xl font-bold text-indigo-600">
                {adolescente.nomeCompleto.charAt(0)}
              </span>
            )}
          </div>

          {/* Informações Principais */}
          <div className="flex-1 w-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-3">
              <div className="text-center sm:text-left">
                <h1 className="text-3xl font-bold text-gray-800">
                  {adolescente.nomeCompleto}
                </h1>
                {adolescente.nomeSocial && (
                  <p className="text-lg text-gray-600 mt-1">
                    Nome social:{" "}
                    <span className="font-semibold">
                      {adolescente.nomeSocial}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center sm:items-end gap-1">
                {getStatusBadge(adolescente.statusUnidade)}
                {adolescente.statusUnidade !== "ATIVO" && (
                  <p className="text-xs text-gray-500">
                    Desde{" "}
                    {adolescente.dataDesinternacao
                      ? new Date(adolescente.dataDesinternacao).toLocaleDateString(
                          "pt-BR"
                        )
                      : "-"}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Número SMS</p>
                <p className="font-bold text-gray-800 font-mono">
                  {adolescente.numeroSms || "-"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Data de Nascimento</p>
                <p className="font-bold text-gray-800">
                  {adolescente.dataNascimento
                    ? new Date(adolescente.dataNascimento).toLocaleDateString(
                        "pt-BR"
                      )
                    : "-"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Data de Entrada</p>
                <p className="font-bold text-gray-800">
                  {adolescente.dataEntrada
                    ? new Date(adolescente.dataEntrada).toLocaleDateString(
                        "pt-BR"
                      )
                    : "-"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Nº Processo</p>
                <p className="font-bold text-gray-800 text-xs">
                  {adolescente.numeroProcesso || "-"}
                </p>
              </div>
            </div>

            {/* Alertas Ativos */}
            {(adolescente.alertaRiscoSuicidio ||
              adolescente.alertaPerfilMapeado ||
              adolescente.alertaSaudeConfidencial) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {adolescente.alertaRiscoSuicidio && (
                  <div className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold border border-orange-300">
                    <AlertTriangle size={16} />
                    Risco de Suicídio
                  </div>
                )}
                {adolescente.alertaPerfilMapeado && (
                  <div className="bg-purple-100 text-purple-800 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold border border-purple-300">
                    <AlertTriangle size={16} />
                    Perfil Mapeado
                  </div>
                )}
                {adolescente.alertaSaudeConfidencial && (
                  <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold border border-blue-300">
                    <AlertTriangle size={16} />
                    Alerta de Saúde
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Navegação das Abas */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex">
            {abas.map((aba) => {
              const Icon = aba.icone;
              const habilitada = aba.habilitada !== false;
              return (
                <button
                  key={aba.id}
                  onClick={() => {
                    if (!habilitada) return;
                    setAbaAtiva(aba.id);
                  }}
                  disabled={!habilitada}
                  className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${
                    abaAtiva === aba.id
                      ? "bg-indigo-50 text-indigo-600 border-b-4 border-indigo-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  } ${!habilitada ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <Icon size={18} />
                  {aba.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6">
          {/* ABA: Informações Gerais */}
          {abaAtiva === "geral" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Informações Gerais
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">
                    Dados Pessoais
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-gray-600">Nome Completo:</span>
                      <span className="font-semibold text-gray-800">
                        {adolescente.nomeCompleto}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-gray-600">Nome Social:</span>
                      <span className="font-semibold text-gray-800">
                        {adolescente.nomeSocial || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-gray-600">Data de Nascimento:</span>
                      <span className="font-semibold text-gray-800">
                        {adolescente.dataNascimento
                          ? new Date(
                              adolescente.dataNascimento
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-gray-600">Número SMS:</span>
                      <span className="font-semibold text-gray-800 font-mono">
                        {adolescente.numeroSms || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">
                    Dados Processuais
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-gray-600">Nº Processo:</span>
                      <span className="font-semibold text-gray-800 text-xs">
                        {adolescente.numeroProcesso || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-gray-600">Data de Entrada:</span>
                      <span className="font-semibold text-gray-800">
                        {adolescente.dataEntrada
                          ? new Date(
                              adolescente.dataEntrada
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-gray-600">Status:</span>
                      {getStatusBadge(adolescente.statusUnidade)}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">
                    Vinculações
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-gray-600">Facção/Grupo:</span>
                      <span className="font-semibold text-gray-800">
                        {dadosAdicionais.faccao?.nome || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-gray-600">Bairro de Origem:</span>
                      <span className="font-semibold text-gray-800">
                        {dadosAdicionais.bairro
                          ? `${dadosAdicionais.bairro.nome} - ${dadosAdicionais.bairro.cidade}`
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-700">
                      Ato Infracional Atual
                    </h3>
                    {adolescente.atoInfracionalGravidade && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                        <AlertTriangle size={14} />
                        Gravidade
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {adolescente.atoInfracionalAtual || "Nao informado"}
                  </p>
                  <div className="grid gap-4 md:grid-cols-2 text-sm text-gray-600">
                    <div>
                      <span className="font-semibold text-gray-700">
                        Numero do processo:
                      </span>{" "}
                      {adolescente.atoInfracionalProcesso ||
                        adolescente.numeroProcesso ||
                        "-"}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">
                        Ano do fato:
                      </span>{" "}
                      {adolescente.atoInfracionalAno ?? "-"}
                    </div>
                  </div>
                  {adolescente.atoInfracionalGravidadeObs && (
                    <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="font-semibold">Repercussao / detalhes:</p>
                      <p>{adolescente.atoInfracionalGravidadeObs}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA: Alocação Atual */}
          {abaAtiva === "alocacao" && podeVerAlocacao && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Alocação Atual
              </h2>

              {dadosAdicionais.alojamento ? (
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 mb-4">
                    <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center">
                      <MapPin size={32} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800">
                        {obterDescricaoCasa(dadosAdicionais.alojamento)} -
                        Alojamento{" "}
                        {obterNumeroAlojamento(
                          dadosAdicionais.alojamento.numero
                        )}
                      </h3>
                      {dadosAdicionais.alojamento.ala && (
                        <p className="text-gray-600">
                          Ala {dadosAdicionais.alojamento.ala}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/estrutura"
                      className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold"
                    >
                      Ver na Estrutura
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                  <MapPin size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 font-semibold">
                    Adolescente não alocado em alojamento
                  </p>
                  <Link
                    href="/estrutura"
                    className="inline-block mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                  >
                    Alocar na Estrutura
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ABA: Histórico Infracional */}
          {abaAtiva === "infracional" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Histórico Infracional
              </h2>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                <p className="text-sm text-yellow-800 font-semibold">
                  ⚠️ Ato Infracional Atual:{" "}
                  {adolescente.atoInfracionalAtual || "Não informado"}
                </p>
              </div>

              {dadosAdicionais.historicoInfracional.length > 0 ? (
                <div className="space-y-3">
                  {dadosAdicionais.historicoInfracional.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 mb-1">
                            {item.descricao}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {item.comarca ?? item.unidadeInternacao ?? "-"} • {item.ano ?? "-"}{item.processo ? ` • Processo: ${item.processo}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText size={48} className="mx-auto mb-2 text-gray-400" />
                  <p>Nenhum histórico infracional registrado</p>
                </div>
              )}
            </div>
          )}

          {/* ABA: Alertas */}
          {abaAtiva === "alertas" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  Alertas Especiais
                </h2>
                <Link
                  href={`/alertas?adolescenteId=${adolescente.id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <AlertTriangle size={16} />
                  Ver alertas deste adolescente
                </Link>
              </div>

              {adolescente.statusUnidade === "ATIVO" &&
                (adolescente.alertasPendentes ?? 0) > 0 && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-500 text-white rounded-full p-2">
                        <AlertTriangle size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-amber-900 font-semibold">
                          Este adolescente possui{" "}
                          <span className="font-bold">
                            {adolescente.alertasPendentes} alerta
                            {adolescente.alertasPendentes === 1 ? "" : "s"}
                          </span>{" "}
                          desativado
                          {adolescente.alertasPendentes === 1 ? "" : "s"} da
                          última desinternação.
                        </p>
                        <p className="text-sm text-amber-800 mt-1">
                          Revise os registros na central de alertas para decidir
                          se devem ser reativados ou excluídos definitivamente.
                        </p>
                        <Link
                          href="/alertas"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900 mt-3 underline decoration-amber-500 decoration-dashed underline-offset-4"
                        >
                          Abrir central de alertas
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

              <div className="space-y-4">
                {adolescente.alertaRiscoSuicidio && (
                  <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-orange-500 rounded-full p-3">
                        <AlertTriangle size={24} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-orange-900 text-lg mb-2">
                          ⚠️ Risco de Suicídio
                        </h3>
                        <p className="text-orange-800 mb-3">
                          Adolescente apresenta histórico ou comportamento de
                          risco para autolesão.
                        </p>
                        <div className="bg-orange-100 rounded-lg p-3">
                          <p className="text-sm font-semibold text-orange-900 mb-1">
                            Recomendações:
                          </p>
                          <ul className="text-sm text-orange-800 list-disc list-inside space-y-1">
                            <li>Alocar em alojamento próximo à porta</li>
                            <li>Garantir alojamento frontal ocupado</li>
                            <li>Supervisão reforçada</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {adolescente.alertaPerfilMapeado && (
                  <div className="bg-purple-50 border-l-4 border-purple-500 rounded-r-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-purple-500 rounded-full p-3">
                        <AlertTriangle size={24} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-purple-900 text-lg mb-2">
                          🔒 Perfil Mapeado (Proteção)
                        </h3>
                        <p className="text-purple-800 mb-3">
                          Ato infracional que necessita sigilo e proteção
                          especial.
                        </p>
                        <div className="bg-purple-100 rounded-lg p-3">
                          <p className="text-sm font-semibold text-purple-900 mb-1">
                            Cuidados:
                          </p>
                          <ul className="text-sm text-purple-800 list-disc list-inside space-y-1">
                            <li>Manter sigilo sobre o ato infracional</li>
                            <li>Alocação estratégica para proteção</li>
                            <li>Monitoramento de interações</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {adolescente.alertaSaudeConfidencial && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-500 rounded-full p-3">
                        <AlertTriangle size={24} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-blue-900 text-lg mb-2">
                          ⚕️ Alerta de Saúde Confidencial
                        </h3>
                        <p className="text-blue-800">
                          Condição de saúde que requer atenção especial.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!adolescente.alertaRiscoSuicidio &&
                  !adolescente.alertaPerfilMapeado &&
                  !adolescente.alertaSaudeConfidencial && (
                    <div className="text-center py-12 text-gray-500">
                      <AlertTriangle
                        size={48}
                        className="mx-auto mb-2 text-gray-400"
                      />
                      <p>Nenhum alerta ativo</p>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* ABA: Tatuagens */}
          {abaAtiva === "tatuagens" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Tatuagens Registradas
              </h2>

              {dadosAdicionais.tatuagens.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dadosAdicionais.tatuagens.map(
                    (tatuagem: AdolescenteTatuagemResumo) => (
                    <div
                      key={tatuagem.id}
                      className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-indigo-100 rounded-lg p-3">
                          <Camera size={24} className="text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 mb-1">
                            {tatuagem.simbolo}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-semibold">Local:</span>{" "}
                            {tatuagem.localCorpo || "Nao informado"}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-semibold">Significado:</span>{" "}
                            {tatuagem.significado || "Nao informado"}
                          </p>
                          {tatuagem.observacoes && (
                            <p className="text-xs text-gray-500 bg-gray-100 rounded p-2">
                              {tatuagem.observacoes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Camera size={48} className="mx-auto mb-2 text-gray-400" />
                  <p>Nenhuma tatuagem registrada</p>
                </div>
              )}
            </div>
          )}

          {/* ABA: Conflitos */}
          {abaAtiva === "conflitos" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Conflitos Registrados
              </h2>

              {dadosAdicionais.conflitos.length > 0 ? (
                <div className="space-y-3">
                  {dadosAdicionais.conflitos.map((conflito: Conflito) => (
                    <div
                      key={conflito.id}
                      className={`rounded-lg p-4 border-l-4 ${
                        conflito.status === "ATIVO"
                          ? "bg-red-50 border-red-500"
                          : "bg-green-50 border-green-500"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-gray-800">
                              Conflito com {conflito.adversario?.nomeCompleto || "Não identificado"}
                            </h4>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-bold ${
                                conflito.status === "ATIVO"
                                  ? "bg-red-200 text-red-800"
                                  : "bg-green-200 text-green-800"
                              }`}
                            >
                          {conflito.status}
                        </span>
                      </div>
                      {conflito.tipoConflito && (
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-semibold">Tipo:</span>{" "}
                          {conflito.tipoConflito}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-semibold">Ocorrências:</span>{" "}
                        {conflito.totalOcorrencias ?? 0}
                        {conflito.ultimaOcorrenciaEm && (
                          <>
                            {" "}
                            · última em{" "}
                            {new Date(conflito.ultimaOcorrenciaEm).toLocaleDateString("pt-BR")}
                          </>
                        )}
                      </p>
                      {conflito.ocorrencias && conflito.ocorrencias.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {conflito.ocorrencias.slice(0, 3).map((oc) => (
                            <div key={oc.id} className="text-xs text-gray-700">
                              <span className="font-semibold">
                                {new Date(oc.criadoEm ?? "").toLocaleDateString("pt-BR")}:
                              </span>{" "}
                              {oc.ci
                                ? `CI ${oc.ci.numero}/${oc.ci.ano}${
                                    oc.ci.tipo ? ` (${oc.ci.tipo})` : ""
                                  }`
                                : "Ocorrência"}
                              {oc.ci?.resumo && ` — ${oc.ci.resumo}`}
                            </div>
                          ))}
                          {conflito.ocorrencias.length > 3 && (
                            <div className="text-xs text-indigo-600">
                              +{conflito.ocorrencias.length - 3} ocorrências —{" "}
                              <Link
                                href={`/conflitos/${conflito.id}`}
                                className="underline font-semibold"
                              >
                                ver todas
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/conflitos/${conflito.id}`}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-4"
                    >
                          Abrir conflito
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Swords size={48} className="mx-auto mb-2 text-gray-400" />
                  <p>Nenhum conflito registrado</p>
                </div>
              )}
            </div>
          )}

          {/* ABA: Grupos */}
          {abaAtiva === "grupos" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Grupos</h2>

              {dadosAdicionais.grupos.length > 0 ? (
                <div className="space-y-3">
                  {dadosAdicionais.grupos.map(
                    (grupo: AdolescenteGrupoResumo) => (
                    <div
                      key={grupo.id}
                      className="bg-indigo-50 rounded-lg p-4 border-2 border-indigo-200"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="font-bold text-gray-800 text-lg">
                            {grupo.nome}
                          </h4>
                        </div>
                        <span className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                          ATIVO
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Users size={48} className="mx-auto mb-2 text-gray-400" />
                  <p>Não participa de nenhum grupo</p>
                </div>
              )}
            </div>
          )}

          {/* ABA: Histórico */}
          {abaAtiva === "historico" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Histórico de Movimentações
              </h2>

              {historicoLoading && (
                <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-3"></div>
                  Carregando histórico...
                </div>
              )}

              {historicoErro && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-4 text-sm">
                  {historicoErro}
                </div>
              )}

              {!historicoLoading && !historicoErro && historicoMovimentacao.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <History size={48} className="mx-auto mb-2 text-gray-400" />
                  <p>Nenhum registro de histórico disponível</p>
                  <p className="text-sm mt-2">
                    O histórico de movimentações será registrado conforme as
                    ações forem realizadas
                  </p>
                </div>
              )}

              {!historicoLoading && !historicoErro && historicoMovimentacao.length > 0 && (
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                  <div className="space-y-6">
                    {historicoMovimentacao.map((registro) => (
                      <div
                        key={registro.id}
                        className="relative flex items-start gap-4 ml-12"
                      >
                        <div className="absolute -left-9 w-4 h-4 bg-indigo-600 rounded-full border-4 border-white"></div>
                        <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-bold">
                              {registro.tipo}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(
                                registro.registradoEm ?? registro.criadoEm
                              ).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <p className="text-gray-800 mb-1">
                            {registro.descricao ||
                              gerarDescricaoMovimentacao(registro)}
                          </p>
                          <div className="text-xs text-gray-600 space-y-1">
                            {registro.origemCasa || registro.origemAlojamento ? (
                              <p>
                                <span className="font-semibold text-gray-700">Origem:</span>{" "}
                                {formatarLocalizacaoHistorico(
                                  registro.origemCasa,
                                  registro.origemAlojamento
                                )}
                              </p>
                            ) : null}
                            {registro.destinoCasa || registro.destinoAlojamento ? (
                              <p>
                                <span className="font-semibold text-gray-700">Destino:</span>{" "}
                                {formatarLocalizacaoHistorico(
                                  registro.destinoCasa,
                                  registro.destinoAlojamento
                                )}
                              </p>
                            ) : null}
                            {registro.operador && (
                              <p>
                                <span className="font-semibold text-gray-700">Operador:</span>{" "}
                                {registro.operador.nomeCompleto}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

