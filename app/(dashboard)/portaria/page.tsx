"use client";

import { useState } from "react";
import { ShieldCheck, Camera, UserCheck, Clock, AlertCircle, CheckCircle, QrCode, Monitor } from "lucide-react";
import { CameraCapture } from "@/components/reconhecimento-facial/camera-capture";
import { ModalRegistrarVisita } from "@/components/visitantes/modal-registrar-visita";
import { ModalValidacaoPrevia } from "@/components/visitantes/modal-validacao-previa";
import { ScannerQRCode } from "@/components/visitantes/scanner-qrcode";
import { ListaVisitasAndamento } from "@/components/visitantes/lista-visitas-andamento";
import { BuscaVisitanteManual } from "@/components/visitantes/busca-visitante-manual";
import Link from "next/link";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  nomeSocial: string | null;
};

type IdentificacaoResultado = {
  success: boolean;
  message: string;
  match?: {
    id: string;
    nomeCompleto: string;
    confidence: number;
    distance: number;
  };
  visitante?: {
    id: string;
    nomeCompleto: string;
    cpf: string;
    dataNascimento: string;
    fotoUrl: string;
    adolescentes: Adolescente[];
    ultimasVisitas: Array<{
      id: string;
      dataHoraEntrada: string;
      dataHoraSaida: string | null;
      observacoes: string | null;
    }>;
  };
};

const normalizarAdolescentes = (lista?: Adolescente[] | null): Adolescente[] =>
  Array.isArray(lista) ? lista : [];

export default function PortariaPage() {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [modoIdentificacao, setModoIdentificacao] = useState(false);
  const [modoQRCode, setModoQRCode] = useState(false);
  const [modoBuscaManual, setModoBuscaManual] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<IdentificacaoResultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarModalValidacao, setMostrarModalValidacao] = useState(false);
  const [mostrarModalVisita, setMostrarModalVisita] = useState(false);
  const [adolescenteSelecionadoId, setAdolescenteSelecionadoId] = useState<string>("");
  const [justificativaHorario, setJustificativaHorario] = useState<string | null>(null);
  const [validacaoResultado, setValidacaoResultado] = useState<any>(null);
  const [validandoEntrada, setValidandoEntrada] = useState(false);

  /**
   * Processa captura de imagem e identifica visitante
   */
  const handleIdentificarVisitante = async (
    imageDataUrl: string,
    embeddings: Float32Array
  ) => {
    setProcessando(true);
    setErro(null);
    setResultado(null);

    try {
      // Primeiro fazer upload da foto
      const blob = await fetch(imageDataUrl).then((r) => r.blob());
      const formData = new FormData();
      formData.append("file", blob, "captura.jpg");
      formData.append("tipo", "evidencia");

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Erro ao fazer upload da foto");
      }

      const { url: fotoUrl } = await uploadResponse.json();

      // Identificar visitante
      const response = await fetch("/api/visitantes/identificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faceEmbeddings: Array.from(embeddings),
          fotoCapturadaUrl: fotoUrl,
          threshold: 0.6,
          ipOrigem: window.location.hostname,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setErro(data.message || "Visitante não identificado");
        setResultado(data);
      } else if (data.visitante) {
        const adolescentes = normalizarAdolescentes(data.visitante.adolescentes);
        // Verificar se há visitas em andamento ANTES de mostrar sucesso
        const visitasAbertas = await verificarVisitasEmAndamento(data.visitante.id);

        if (visitasAbertas.length > 0) {
          // Visitante tem visita em andamento - mostrar erro específico
          const nomes = visitasAbertas.map((v: any) => v.adolescente?.nomeCompleto || "Adolescente").join(", ");
          setErro(
            `⚠️ ATENÇÃO: ${data.visitante.nomeCompleto} já possui visita em andamento com: ${nomes}. ` +
            `Por favor, finalize a visita atual antes de registrar uma nova.`
          );
          setResultado(null);
        } else {
          // Visitante OK - prosseguir normalmente
          setResultado({
            ...data,
            visitante: {
              ...data.visitante,
              adolescentes,
            },
          });

          if (adolescentes.length === 1) {
            // Auto-selecionar se houver apenas 1 adolescente
            const adolescenteId = adolescentes[0].id;
            setAdolescenteSelecionadoId(adolescenteId);
            // Validar automaticamente
            await validarEntradaAutomatica(data.visitante.id, adolescenteId);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao identificar visitante:", err);
      setErro("Erro ao processar identificação. Tente novamente.");
    } finally {
      setProcessando(false);
      setModoIdentificacao(false);
    }
  };

  /**
   * Verifica se visitante tem visitas em andamento
   */
  const verificarVisitasEmAndamento = async (visitanteId: string) => {
    try {
      const response = await fetch(`/api/visitantes/${visitanteId}/visitas?status=abertas`);
      const data = await response.json();

      if (response.ok && data.visitas) {
        return data.visitas;
      }
      return [];
    } catch (err) {
      console.error("Erro ao verificar visitas em andamento:", err);
      return [];
    }
  };

  /**
   * Valida entrada automaticamente (chamada ao selecionar adolescente)
   */
  const validarEntradaAutomatica = async (visitanteId: string, adolescenteId: string) => {
    setValidandoEntrada(true);
    try {
      const response = await fetch("/api/visitas/validar-pre-entrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitanteId, adolescenteId }),
      });

      const data = await response.json();
      setValidacaoResultado(data);
    } catch (err) {
      console.error("Erro ao validar entrada:", err);
    } finally {
      setValidandoEntrada(false);
    }
  };

  /**
   * Seleciona adolescente e valida automaticamente
   */
  const handleSelecionarAdolescente = async (adolescenteId: string) => {
    if (!resultado?.visitante) return;

    setAdolescenteSelecionadoId(adolescenteId);
    await validarEntradaAutomatica(resultado.visitante.id, adolescenteId);
  };

  /**
   * Abre modal apropriado baseado na validação
   */
  const handleRegistrarVisita = () => {
    if (!adolescenteSelecionadoId) {
      alert("Por favor, selecione um adolescente primeiro");
      return;
    }

    // Se houver alertas que requerem justificativa, abre modal de validação
    if (validacaoResultado?.requerJustificativa) {
      setMostrarModalValidacao(true);
    } else {
      // Se não houver alertas, vai direto para registro
      setMostrarModalVisita(true);
    }
  };

  /**
   * Processa leitura de QR Code
   */
  const handleScanQRCode = async (codigo: string) => {
    setProcessando(true);
    setErro(null);
    setResultado(null);

    try {
      const response = await fetch(`/api/qrcode/${encodeURIComponent(codigo)}`);
      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "QR Code inválido");
        setModoQRCode(false);
        return;
      }

      // Verificar visitas em andamento ANTES de mostrar sucesso
      const visitasAbertas = await verificarVisitasEmAndamento(data.visitante.id);

      if (visitasAbertas.length > 0) {
        const nomes = visitasAbertas.map((v: any) => v.adolescente?.nomeCompleto || "Adolescente").join(", ");
        setErro(
          `⚠️ ATENÇÃO: ${data.visitante.nomeCompleto} já possui visita em andamento com: ${nomes}. ` +
          `Por favor, finalize a visita atual antes de registrar uma nova.`
        );
        setResultado(null);
      } else {
        // Transformar resposta da API de QR Code para formato IdentificacaoResultado
        const adolescentesVinculadosApi = Array.isArray(data.visitante.adolescentesVinculados)
          ? data.visitante.adolescentesVinculados
          : [];

        const adolescentesNormalizados = adolescentesVinculadosApi.map((v: any) => ({
          id: v.id,
          nomeCompleto: v.nomeCompleto,
          nomeSocial: null,
        }));

        const resultadoQRCode = {
          success: data.valido,
          message: "Visitante identificado via QR Code",
          match: {
            id: data.visitante.id,
            nomeCompleto: data.visitante.nomeCompleto,
            confidence: 100, // QR Code tem 100% de confiança
            distance: 0,
          },
          visitante: {
            id: data.visitante.id,
            nomeCompleto: data.visitante.nomeCompleto,
            cpf: data.visitante.cpf,
            dataNascimento: "", // Não vem na API de QR Code
            fotoUrl: data.visitante.urlFoto || "",
            adolescentes: adolescentesNormalizados,
            ultimasVisitas: data.visitasRecentes.map((v: any) => ({
              id: v.id,
              dataHoraEntrada: v.dataHoraEntrada,
              dataHoraSaida: v.dataHoraSaida,
              observacoes: null,
            })),
          },
        };

        setResultado(resultadoQRCode);

        // Auto-selecionar se houver apenas 1 adolescente
        if (adolescentesVinculadosApi.length === 1) {
          const adolescenteId = adolescentesVinculadosApi[0].id;
          setAdolescenteSelecionadoId(adolescenteId);
          await validarEntradaAutomatica(data.visitante.id, adolescenteId);
        }
      }
    } catch (err) {
      console.error("Erro ao validar QR Code:", err);
      setErro("Erro ao processar QR Code. Tente novamente.");
    } finally {
      setProcessando(false);
      setModoQRCode(false);
    }
  };

  /**
   * Formata data/hora para exibição
   */
  const formatarDataHora = (dataHora: string) => {
    return new Date(dataHora).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Calcula tempo de visita
   */
  const calcularTempoVisita = (entrada: string, saida: string | null) => {
    if (!saida) return "Em andamento";
    const diff = new Date(saida).getTime() - new Date(entrada).getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${horas}h ${minutos}min`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <ShieldCheck className="text-indigo-600" size={42} />
              Portaria - Reconhecimento Facial
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Sistema de identificação automática de visitantes
            </p>
          </div>
          <Link
            href="/portaria/dashboard"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg font-semibold"
          >
            <Monitor size={24} />
            Ver Dashboard
          </Link>
        </div>

        {/* Modo Identificação */}
        {modoIdentificacao && (
          <div className="mb-6">
            <CameraCapture
              onCapture={handleIdentificarVisitante}
              onCancel={() => {
                setModoIdentificacao(false);
                setErro(null);
              }}
              title="Identificação Facial"
              subtitle="Posicione o rosto do visitante no centro da câmera"
            />
          </div>
        )}

        {/* Botões de Ação */}
        {!modoIdentificacao && !modoCadastro && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button
              onClick={() => {
                setModoIdentificacao(true);
                setResultado(null);
                setErro(null);
              }}
              className="flex flex-col items-center justify-center gap-4 p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-indigo-200 hover:border-indigo-400"
            >
              <Camera className="text-indigo-600" size={64} />
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Reconhecimento Facial
                </h2>
                <p className="text-gray-600 mt-2">
                  Identificação automática via câmera
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setModoQRCode(true);
                setResultado(null);
                setErro(null);
              }}
              className="flex flex-col items-center justify-center gap-4 p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-purple-200 hover:border-purple-400"
            >
              <QrCode className="text-purple-600" size={64} />
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Escanear QR Code
                </h2>
                <p className="text-gray-600 mt-2">
                  Identificação rápida via QR Code
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setModoBuscaManual(true);
                setResultado(null);
                setErro(null);
              }}
              className="flex flex-col items-center justify-center gap-4 p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-green-200 hover:border-green-400"
            >
              <UserCheck className="text-green-600" size={64} />
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Cadastro Manual
                </h2>
                <p className="text-gray-600 mt-2">
                  Busca por nome ou CPF
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Modal de Busca Manual */}
        {modoBuscaManual && (
          <BuscaVisitanteManual
            onVisitanteSelecionado={(visitante) => {
              const adolescentesVinculados = Array.isArray(visitante.adolescentes)
                ? visitante.adolescentes
                : [];

              setModoBuscaManual(false);
              setResultado({
                success: true,
                message: "Visitante selecionado",
                visitante: {
                  id: visitante.id,
                  nomeCompleto: visitante.nomeCompleto,
                  cpf: visitante.cpf || "",
                  dataNascimento: visitante.dataNascimento || "",
                  fotoUrl: visitante.fotoUrl || "",
                  adolescentes: adolescentesVinculados,
                  ultimasVisitas: [],
                },
              });

              // Auto-selecionar se só tiver 1 adolescente
              if (adolescentesVinculados.length === 1) {
                const adolescenteId = adolescentesVinculados[0].id;
                setAdolescenteSelecionadoId(adolescenteId);
                validarEntradaAutomatica(visitante.id, adolescenteId);
              }
            }}
            onCancelar={() => setModoBuscaManual(false)}
          />
        )}

        {/* Lista de Visitas em Andamento */}
        {!modoIdentificacao && !modoCadastro && !modoQRCode && !modoBuscaManual && (
          <div className="mb-8">
            <ListaVisitasAndamento />
          </div>
        )}

        {/* Resultado da Identificação */}
        {resultado && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            {resultado.success && resultado.visitante ? (
              <>
                {/* Sucesso */}
                <div className="flex items-center gap-3 mb-6 pb-6 border-b">
                  <CheckCircle className="text-green-600" size={48} />
                  <div>
                    <h2 className="text-3xl font-bold text-green-700">
                      Visitante Identificado!
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Confiança: {resultado.match?.confidence}% | Distância:{" "}
                      {resultado.match?.distance.toFixed(3)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Dados do Visitante */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Dados do Visitante
                    </h3>
                    {resultado.visitante.fotoUrl && (
                      <img
                        src={resultado.visitante.fotoUrl}
                        alt={resultado.visitante.nomeCompleto}
                        className="w-48 h-48 object-cover rounded-lg mb-4 shadow-md"
                      />
                    )}
                    <div className="space-y-2 text-gray-700">
                      <p>
                        <strong>Nome:</strong> {resultado.visitante.nomeCompleto}
                      </p>
                      <p>
                        <strong>CPF:</strong> {resultado.visitante.cpf || "Não informado"}
                      </p>
                      <p>
                        <strong>Data de Nascimento:</strong>{" "}
                        {resultado.visitante.dataNascimento
                          ? new Date(resultado.visitante.dataNascimento).toLocaleDateString("pt-BR")
                          : "Não informado"}
                      </p>
                    </div>
                  </div>

                  {/* Adolescentes Relacionados - SELECIONÁVEIS */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Adolescentes Relacionados
                      {resultado.visitante.adolescentes.length > 1 && (
                        <span className="ml-2 text-sm font-normal text-gray-600">
                          (Selecione um)
                        </span>
                      )}
                    </h3>
                    {resultado.visitante.adolescentes.length > 0 ? (
                      <ul className="space-y-3">
                        {resultado.visitante.adolescentes.map((adolescente) => {
                          const isSelected = adolescenteSelecionadoId === adolescente.id;
                          return (
                            <li
                              key={adolescente.id}
                              onClick={() => handleSelecionarAdolescente(adolescente.id)}
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-green-50 border-green-500 shadow-md"
                                  : "bg-indigo-50 border-indigo-200 hover:border-indigo-400 hover:shadow"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {adolescente.nomeSocial || adolescente.nomeCompleto}
                                  </p>
                                  {adolescente.nomeSocial && adolescente.nomeCompleto && (
                                    <p className="text-sm text-gray-600">
                                      Nome completo: {adolescente.nomeCompleto}
                                    </p>
                                  )}
                                </div>
                                {isSelected && (
                                  <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                                )}
                              </div>
                              {isSelected && validandoEntrada && (
                                <p className="text-xs text-blue-600 mt-2">Validando...</p>
                              )}
                              {isSelected && validacaoResultado && (
                                <div className="mt-3 pt-3 border-t border-green-300">
                                  {validacaoResultado.alertas.length > 0 && (
                                    <div className="space-y-1">
                                      {validacaoResultado.alertas.map((alerta: string, idx: number) => (
                                        <p key={idx} className="text-xs text-amber-700 flex items-start gap-1">
                                          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                          <span>{alerta}</span>
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {validacaoResultado.avisos.length > 0 && (
                                    <div className="space-y-1 mt-2">
                                      {validacaoResultado.avisos.map((aviso: string, idx: number) => (
                                        <p key={idx} className="text-xs text-blue-700">
                                          ℹ️ {aviso}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {!validacaoResultado.requerJustificativa && validacaoResultado.alertas.length === 0 && (
                                    <p className="text-xs text-green-700 flex items-center gap-1">
                                      <CheckCircle size={14} />
                                      Tudo OK! Pode registrar a visita.
                                    </p>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-gray-500">Nenhum adolescente relacionado</p>
                    )}

                    {/* Últimas Visitas */}
                    <h3 className="text-xl font-bold text-gray-900 mt-6 mb-4">
                      Últimas Visitas
                    </h3>
                    {resultado.visitante.ultimasVisitas.length > 0 ? (
                      <ul className="space-y-3">
                        {resultado.visitante.ultimasVisitas.map((visita) => (
                          <li
                            key={visita.id}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-2 text-sm">
                              <Clock size={16} className="text-gray-500" />
                              <span className="text-gray-700">
                                {formatarDataHora(visita.dataHoraEntrada)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Duração:{" "}
                              {calcularTempoVisita(
                                visita.dataHoraEntrada,
                                visita.dataHoraSaida
                              )}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">Nenhuma visita registrada</p>
                    )}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="mt-8 flex gap-4">
                  <button
                    onClick={handleRegistrarVisita}
                    disabled={!adolescenteSelecionadoId || validandoEntrada}
                    className={`flex-1 px-6 py-3 rounded-lg transition-colors font-semibold shadow-md ${
                      adolescenteSelecionadoId && !validandoEntrada
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {validandoEntrada
                      ? "Validando..."
                      : !adolescenteSelecionadoId
                      ? "Selecione um adolescente"
                      : validacaoResultado?.requerJustificativa
                      ? "Registrar Visita (Requer Justificativa)"
                      : "Registrar Visita"}
                  </button>
                  <button
                    onClick={() => {
                      setResultado(null);
                      setErro(null);
                      setAdolescenteSelecionadoId("");
                      setValidacaoResultado(null);
                      setJustificativaHorario(null);
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold shadow-md"
                  >
                    Nova Identificação
                  </button>
                </div>
              </>
            ) : (
              /* Falha na Identificação */
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <AlertCircle className="text-amber-600" size={48} />
                  <div>
                    <h2 className="text-3xl font-bold text-amber-700">
                      Visitante Não Identificado
                    </h2>
                    <p className="text-gray-600 mt-1">{resultado.message}</p>
                  </div>
                </div>

                <p className="text-gray-700 mb-6">
                  O sistema não conseguiu identificar automaticamente este visitante.
                  Possíveis motivos:
                </p>

                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li>Visitante não possui face cadastrada no sistema</li>
                  <li>Qualidade da imagem capturada está baixa</li>
                  <li>Iluminação inadequada</li>
                  <li>Face parcialmente obstruída</li>
                </ul>

                <div className="flex gap-4">
                  <button
                    onClick={() => alert("Redirecionar para cadastro manual")}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md"
                  >
                    Cadastrar Novo Visitante
                  </button>
                  <button
                    onClick={() => {
                      setResultado(null);
                      setErro(null);
                      setModoIdentificacao(true);
                    }}
                    className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold shadow-md"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Erro */}
        {erro && !resultado && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={32} />
            <div>
              <h3 className="text-lg font-bold text-red-700">Erro</h3>
              <p className="text-red-600">{erro}</p>
            </div>
          </div>
        )}

        {/* Processando */}
        {processando && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 text-center">
            <p className="text-indigo-700 font-semibold">
              Processando identificação facial...
            </p>
          </div>
        )}

        {/* Scanner QR Code */}
        {modoQRCode && (
          <ScannerQRCode
            onScan={handleScanQRCode}
            onCancel={() => {
              setModoQRCode(false);
              setErro(null);
            }}
            processando={processando}
          />
        )}

        {/* Modal de Validação Prévia */}
        {mostrarModalValidacao && resultado?.success && resultado.visitante && (
          <ModalValidacaoPrevia
            visitanteId={resultado.visitante.id}
            visitanteNome={resultado.visitante.nomeCompleto}
            adolescentes={resultado.visitante.adolescentes}
            onConfirmar={(adolescenteId, justificativa) => {
              setAdolescenteSelecionadoId(adolescenteId);
              setJustificativaHorario(justificativa);
              setMostrarModalValidacao(false);
              setMostrarModalVisita(true);
            }}
            onCancelar={() => setMostrarModalValidacao(false)}
          />
        )}

        {/* Modal de Registro de Visita */}
        {mostrarModalVisita && resultado?.success && resultado.visitante && (
          <ModalRegistrarVisita
            visitanteId={resultado.visitante.id}
            visitanteNome={resultado.visitante.nomeCompleto}
            adolescentes={adolescenteSelecionadoId ? resultado.visitante.adolescentes.filter(a => a.id === adolescenteSelecionadoId) : resultado.visitante.adolescentes}
            adolescentePreSelecionado={adolescenteSelecionadoId}
            justificativaPrevia={justificativaHorario}
            onClose={() => {
              setMostrarModalVisita(false);
              setAdolescenteSelecionadoId("");
              setJustificativaHorario(null);
            }}
            onSucesso={() => {
              // Limpar resultado e voltar para a tela inicial
              setResultado(null);
              setErro(null);
              setMostrarModalVisita(false);
              setAdolescenteSelecionadoId("");
              setJustificativaHorario(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
