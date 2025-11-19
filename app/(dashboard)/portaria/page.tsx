"use client";

import { useState } from "react";
import { ShieldCheck, Camera, UserCheck, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { CameraCapture } from "@/components/reconhecimento-facial/camera-capture";
import { ModalRegistrarVisita } from "@/components/visitantes/modal-registrar-visita";

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
    adolescentes: Array<{
      id: string;
      nomeCompleto: string;
      nomeSocial: string | null;
    }>;
    ultimasVisitas: Array<{
      id: string;
      dataHoraEntrada: string;
      dataHoraSaida: string | null;
      observacoes: string | null;
    }>;
  };
};

export default function PortariaPage() {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [modoIdentificacao, setModoIdentificacao] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<IdentificacaoResultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarModalVisita, setMostrarModalVisita] = useState(false);

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
      setResultado(data);

      if (!data.success) {
        setErro(data.message || "Visitante não identificado");
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <ShieldCheck className="text-indigo-600" size={42} />
            Portaria - Reconhecimento Facial
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Sistema de identificação automática de visitantes
          </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                  Identificar Visitante
                </h2>
                <p className="text-gray-600 mt-2">
                  Use a câmera para identificar automaticamente o visitante
                </p>
              </div>
            </button>

            <button
              onClick={() => alert("Funcionalidade em desenvolvimento")}
              className="flex flex-col items-center justify-center gap-4 p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-green-200 hover:border-green-400"
            >
              <UserCheck className="text-green-600" size={64} />
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Cadastro Manual
                </h2>
                <p className="text-gray-600 mt-2">
                  Registrar visitante sem reconhecimento facial
                </p>
              </div>
            </button>
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

                  {/* Adolescentes Relacionados */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Adolescentes Relacionados
                    </h3>
                    {resultado.visitante.adolescentes.length > 0 ? (
                      <ul className="space-y-3">
                        {resultado.visitante.adolescentes.map((adolescente) => (
                          <li
                            key={adolescente.id}
                            className="p-4 bg-indigo-50 rounded-lg border border-indigo-200"
                          >
                            <p className="font-semibold text-gray-900">
                              {adolescente.nomeSocial || adolescente.nomeCompleto}
                            </p>
                            {adolescente.nomeSocial && adolescente.nomeCompleto && (
                              <p className="text-sm text-gray-600">
                                Nome completo: {adolescente.nomeCompleto}
                              </p>
                            )}
                          </li>
                        ))}
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
                    onClick={() => setMostrarModalVisita(true)}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-md"
                  >
                    Registrar Visita
                  </button>
                  <button
                    onClick={() => {
                      setResultado(null);
                      setErro(null);
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

        {/* Modal de Registro de Visita */}
        {mostrarModalVisita && resultado?.success && resultado.visitante && (
          <ModalRegistrarVisita
            visitanteId={resultado.visitante.id}
            visitanteNome={resultado.visitante.nomeCompleto}
            adolescentes={resultado.visitante.adolescentes}
            onClose={() => setMostrarModalVisita(false)}
            onSucesso={() => {
              // Limpar resultado e voltar para a tela inicial
              setResultado(null);
              setErro(null);
              setMostrarModalVisita(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
