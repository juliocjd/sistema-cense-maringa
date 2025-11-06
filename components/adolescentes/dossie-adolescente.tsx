"use client";

import { useState } from "react";
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

interface DossieAdolescenteProps {
  adolescente: Adolescente;
}

export function DossieAdolescente({ adolescente }: DossieAdolescenteProps) {
  const [abaAtiva, setAbaAtiva] = useState("geral");

  const abas = [
    { id: "geral", label: "Informações Gerais", icone: User },
    { id: "alocacao", label: "Alocação Atual", icone: MapPin },
    { id: "infracional", label: "Histórico Infracional", icone: FileText },
    { id: "alertas", label: "Alertas", icone: AlertTriangle },
    { id: "tatuagens", label: "Tatuagens", icone: Camera },
    { id: "conflitos", label: "Conflitos", icone: Swords },
    { id: "grupos", label: "Grupos", icone: Users },
    { id: "historico", label: "Histórico", icone: History },
  ];

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
    historico: any[];
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
    historico: [],
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-b-4 border-indigo-600">
        <div className="flex items-start justify-between mb-4">
          <Link
            href="/adolescentes"
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            <ArrowLeft size={20} />
            Voltar para lista
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-semibold"
            >
              <Printer size={18} />
              Imprimir
            </button>
            <button
              onClick={() => alert("Exportar PDF (implementar)")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
            >
              <Download size={18} />
              Exportar PDF
            </button>
            <button
              onClick={() => alert("Funcionalidade de edição em desenvolvimento")}
              className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed flex items-center gap-2 font-semibold opacity-60"
              title="Em desenvolvimento"
            >
              <Edit size={18} />
              Editar
            </button>
          </div>
        </div>

        <div className="flex items-start gap-6">
          {/* Foto */}
          <div className="w-32 h-32 bg-indigo-100 rounded-2xl flex items-center justify-center overflow-hidden border-4 border-indigo-200 flex-shrink-0">
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
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
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
              {getStatusBadge(adolescente.statusUnidade)}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
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
              <div className="mt-4 flex gap-2">
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
              return (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${
                    abaAtiva === aba.id
                      ? "bg-indigo-50 text-indigo-600 border-b-4 border-indigo-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  }`}
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
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nome Completo:</span>
                      <span className="font-semibold text-gray-800">
                        {adolescente.nomeCompleto}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nome Social:</span>
                      <span className="font-semibold text-gray-800">
                        {adolescente.nomeSocial || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Data de Nascimento:</span>
                      <span className="font-semibold text-gray-800">
                        {adolescente.dataNascimento
                          ? new Date(
                              adolescente.dataNascimento
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
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
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nº Processo:</span>
                      <span className="font-semibold text-gray-800 text-xs">
                        {adolescente.numeroProcesso || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Data de Entrada:</span>
                      <span className="font-semibold text-gray-800">
                        {adolescente.dataEntrada
                          ? new Date(
                              adolescente.dataEntrada
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
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
                    <div className="flex justify-between">
                      <span className="text-gray-600">Facção/Grupo:</span>
                      <span className="font-semibold text-gray-800">
                        {dadosAdicionais.faccao?.nome || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bairro de Origem:</span>
                      <span className="font-semibold text-gray-800">
                        {dadosAdicionais.bairro
                          ? `${dadosAdicionais.bairro.nome} - ${dadosAdicionais.bairro.cidade}`
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">
                    Ato Infracional Atual
                  </h3>
                  <p className="text-sm text-gray-800">
                    {adolescente.atoInfracionalAtual || "Não informado"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ABA: Alocação Atual */}
          {abaAtiva === "alocacao" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Alocação Atual
              </h2>

              {adolescente.alojamentoAtualId && dadosAdicionais.alojamento ? (
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
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
                      href="/mapa"
                      className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold"
                    >
                      Ver no Mapa Operacional →
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
                    href="/mapa"
                    className="inline-block mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                  >
                    Alocar Agora
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
                            {item.unidade} • {item.ano}
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
              <h2 className="text-2xl font-bold text-gray-800">
                Alertas Especiais
              </h2>

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
                      <div className="flex items-start justify-between">
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
                        </div>
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
                      <div className="flex items-center justify-between">
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

              {dadosAdicionais.historico.length > 0 ? (
                <div className="relative">
                  {/* Timeline */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                  <div className="space-y-6">
                    {dadosAdicionais.historico.map((item: any, index: number) => (
                      <div
                        key={item.id}
                        className="relative flex items-start gap-4 ml-12"
                      >
                        {/* Bolinha da timeline */}
                        <div className="absolute -left-9 w-4 h-4 bg-indigo-600 rounded-full border-4 border-white"></div>

                        <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-bold">
                                {item.tipo}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(item.data).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <p className="text-gray-800 mb-1">{item.descricao}</p>
                          <p className="text-xs text-gray-600">
                            Operador: {item.operador}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <History size={48} className="mx-auto mb-2 text-gray-400" />
                  <p>Nenhum registro de histórico disponível</p>
                  <p className="text-sm mt-2">
                    O histórico de movimentações será registrado conforme as
                    ações forem realizadas
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
