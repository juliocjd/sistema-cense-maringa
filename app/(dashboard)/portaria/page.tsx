"use client";

import { useEffect, useRef, useState } from "react";
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

type VisitaVisitante = {
  id: string;
  dataHoraEntrada?: string;
  dataHoraSaida?: string | null;
  observacoes?: string | null;
  emAberto?: boolean;
  adolescente?: {
    id?: string;
    nomeCompleto?: string;
    nomeSocial?: string | null;
  };
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
  const [origemIdentificacao, setOrigemIdentificacao] = useState<"facial" | "qrcode" | "manual" | null>(null);
  const [cameraSessionId, setCameraSessionId] = useState(0);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const resultadoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!resultadoRef.current || !resultado) return;
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      resultadoRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [resultado]);

  const iniciarFluxoFacial = () => {
    setModoIdentificacao(true);
    setOrigemIdentificacao("facial");
    setCameraSessionId((prev) => prev + 1);
    setMensagemSucesso(null);
  };

  const reiniciarSessaoCamera = () => {
    setCameraSessionId((prev) => prev + 1);
  };

  const limparEstadoVisita = () => {
    setResultado(null);
    setErro(null);
    setAdolescenteSelecionadoId("");
    setValidacaoResultado(null);
    setJustificativaHorario(null);
  };

  const registrarVisitaDireta = async (
    adolescenteId: string,
    justificativa: string | null
  ) => {
    if (!resultado?.visitante) {
      setErro("Nenhum visitante selecionado para registrar a visita.");
      return;
    }

    try {
      setProcessando(true);
      const response = await fetch(
        `/api/visitantes/${resultado.visitante.id}/visitas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adolescenteId,
            quantidadeAdultos: 1,
            quantidadeCriancas: 0,
            observacoes: null,
            justificativaHorario: justificativa || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao registrar visita.");
        return;
      }

      setMensagemSucesso("Entrada registrada com sucesso.");
      limparEstadoVisita();

      if (origemIdentificacao === "facial") {
        iniciarFluxoFacial();
      } else {
        setModoIdentificacao(false);
        setOrigemIdentificacao(null);
      }
    } catch (err) {
      console.error("Erro ao registrar visita:", err);
      setErro(
        err instanceof Error
          ? err.message
          : "Erro inesperado ao registrar visita."
      );
    } finally {
      setProcessando(false);
    }
  };

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
    setMensagemSucesso(null);

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
        setErro(data.message || "Visitante nÃ£o identificado");
        setResultado(data);
      } else if (data.visitante) {
        const adolescentes = normalizarAdolescentes(data.visitante.adolescentes);
        // Verificar se hÃ¡ visitas em andamento ANTES de mostrar sucesso
        const visitasAbertas = await verificarVisitasEmAndamento(data.visitante.id);

                if (visitasAbertas.length > 0) {
          // Visitante tem visita em andamento - mostrar erro específico
          const nomes = visitasAbertas
            .map((v: any) => v.adolescente?.nomeCompleto || "Adolescente")
            .join(", ");
          setErro(
            `?? ATENÇÃO: ${data.visitante.nomeCompleto} já possui visita em andamento com: ${nomes}. ` +
              `Por favor, finalize a visita atual antes de registrar uma nova.`
          );
          setResultado(null);
          if (origemIdentificacao === "facial") {
            reiniciarSessaoCamera();
          }
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
      setErro("Erro ao processar identificaÃ§Ã£o. Tente novamente.");
    } finally {
      setProcessando(false);

    }
  };

  /**
   * Verifica se visitante tem visitas em andamento
   */
  const verificarVisitasEmAndamento = async (visitanteId: string) => {
    try {
      const response = await fetch(
        `/api/visitantes/${visitanteId}/visitas?status=abertas`,
        { cache: "no-store" }
      );
      const data = await response.json();

      if (!response.ok || !data) {
        return [];
      }

      const visitas = Array.isArray(data.visitas)
        ? (data.visitas as VisitaVisitante[])
        : [];
      const visitasEmAberto = visitas.filter(
        (visita) =>
          visita.emAberto === true ||
          visita.dataHoraSaida === null ||
          typeof visita.dataHoraSaida === "undefined"
      );

      return visitasEmAberto;
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
   * Abre modal apropriado baseado na validaÃ§Ã£o
   */
  const handleRegistrarVisita = () => {
    if (!adolescenteSelecionadoId) {
      alert("Por favor, selecione um adolescente primeiro");
      return;
    }

    // Se houver alertas que requerem justificativa, abre modal de validaÃ§Ã£o
    if (validacaoResultado?.requerJustificativa) {
      setMostrarModalValidacao(true);
    } else {
      // Se nÃ£o houver alertas, vai direto para registro
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
        setErro(data.erro || "QR Code invÃ¡lido");
        setModoQRCode(false);
        return;
      }

      // Verificar visitas em andamento ANTES de mostrar sucesso
      const visitasAbertas = await verificarVisitasEmAndamento(data.visitante.id);

      if (visitasAbertas.length > 0) {
        const nomes = visitasAbertas.map((v: any) => v.adolescente?.nomeCompleto || "Adolescente").join(", ");
        setErro(
          `âš ï¸ ATENÃ‡ÃƒO: ${data.visitante.nomeCompleto} jÃ¡ possui visita em andamento com: ${nomes}. ` +
          `Por favor, finalize a visita atual antes de registrar uma nova.`
        );
        setResultado(null);
      } else {
        // Transformar resposta da API de QR Code para formato IdentificacaoResultado
        const adolescentesVinculadosApi = Array.isArray(data.visitante.adolescentesVinculados)
          ? data.visitante.adolescentesVinculados
          : [];
        setOrigemIdentificacao("qrcode");

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
            confidence: 100, // QR Code tem 100% de confianÃ§a
            distance: 0,
          },
          visitante: {
            id: data.visitante.id,
            nomeCompleto: data.visitante.nomeCompleto,
            cpf: data.visitante.cpf,
            dataNascimento: "", // NÃ£o vem na API de QR Code
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
   * Formata data/hora para exibiÃ§Ã£o
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
            <ShieldCheck className="text-indigo-600 w-8 h-8 md:w-10 md:h-10 lg:w-11 lg:h-11" />
            <span className="hidden sm:inline">Portaria - Reconhecimento Facial</span>
            <span className="sm:hidden">Portaria</span>
          </h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base lg:text-lg">
            Sistema de identificaÃ§Ã£o automÃ¡tica de visitantes
          </p>
        </div>

        {/* Modo IdentificaÃ§Ã£o */}
        {modoIdentificacao && (
          <div className="mb-6">
            <CameraCapture
              key={cameraSessionId}
              onCapture={handleIdentificarVisitante}
              onCancel={() => {
                setModoIdentificacao(false);
                setErro(null);
                setOrigemIdentificacao(null);
              }}
              title="IdentificaÃ§Ã£o Facial"
              subtitle="Posicione o rosto do visitante no centro da cÃ¢mera"
            />
          </div>
        )}

        {/* BotÃµes de AÃ§Ã£o */}
        {!modoIdentificacao && !modoCadastro && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <button
              onClick={() => {
                limparEstadoVisita();
                iniciarFluxoFacial();
              }}
              className="flex flex-col items-center justify-center gap-3 md:gap-4 p-6 md:p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-indigo-200 hover:border-indigo-400"
            >
              <Camera className="text-indigo-600 w-12 h-12 md:w-16 md:h-16" />
              <div className="text-center">
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                  <span className="hidden sm:inline">Reconhecimento Facial</span>
                  <span className="sm:hidden">Facial</span>
                </h2>
                <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                  <span className="hidden sm:inline">IdentificaÃ§Ã£o automÃ¡tica via cÃ¢mera</span>
                  <span className="sm:hidden">Via cÃ¢mera</span>
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setModoQRCode(true);
                setResultado(null);
                setErro(null);
                setMensagemSucesso(null);
                setOrigemIdentificacao("qrcode");
              }}
              className="flex flex-col items-center justify-center gap-3 md:gap-4 p-6 md:p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-purple-200 hover:border-purple-400"
            >
              <QrCode className="text-purple-600 w-12 h-12 md:w-16 md:h-16" />
              <div className="text-center">
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                  <span className="hidden sm:inline">Escanear QR Code</span>
                  <span className="sm:hidden">QR Code</span>
                </h2>
                <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                  <span className="hidden sm:inline">IdentificaÃ§Ã£o rÃ¡pida via QR Code</span>
                  <span className="sm:hidden">Via QR</span>
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setModoBuscaManual(true);
                setResultado(null);
                setErro(null);
                setMensagemSucesso(null);
                setOrigemIdentificacao("manual");
              }}
              className="flex flex-col items-center justify-center gap-3 md:gap-4 p-6 md:p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-green-200 hover:border-green-400"
            >
              <UserCheck className="text-green-600 w-12 h-12 md:w-16 md:h-16" />
              <div className="text-center">
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                  <span className="hidden sm:inline">Cadastro Manual</span>
                  <span className="sm:hidden">Manual</span>
                </h2>
                <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                  <span className="hidden sm:inline">Busca por nome ou CPF</span>
                  <span className="sm:hidden">Por nome/CPF</span>
                </p>
              </div>
            </button>

            <Link
              href="/portaria/dashboard"
              className="flex flex-col items-center justify-center gap-3 md:gap-4 p-6 md:p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-blue-200 hover:border-blue-400"
            >
              <Monitor className="text-blue-600 w-12 h-12 md:w-16 md:h-16" />
              <div className="text-center">
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                  <span className="hidden sm:inline">Ver Dashboard</span>
                  <span className="sm:hidden">Dashboard</span>
                </h2>
                <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                  <span className="hidden sm:inline">Painel de controle e estatÃ­sticas</span>
                  <span className="sm:hidden">Painel controle</span>
                </p>
              </div>
            </Link>
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
              setMensagemSucesso(null);
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
              setOrigemIdentificacao("manual");

              // Auto-selecionar se sÃ³ tiver 1 adolescente
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

        {/* Resultado da IdentificaÃ§Ã£o */}
        {resultado && (
          <div ref={resultadoRef} className="bg-white rounded-xl shadow-lg p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
            {resultado.success && resultado.visitante ? (
              <>
                {/* Sucesso */}
                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 pb-4 md:pb-6 border-b">
                  <CheckCircle className="text-green-600 w-10 h-10 md:w-12 md:h-12 flex-shrink-0" />
                  <div>
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-green-700">
                      Visitante Identificado!
                    </h2>
                    <p className="text-gray-600 mt-1 text-xs md:text-sm">
                      ConfianÃ§a: {resultado.match?.confidence}% | DistÃ¢ncia:{" "}
                      {resultado.match?.distance.toFixed(3)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  {/* Dados do Visitante */}
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">
                      Dados do Visitante
                    </h3>
                    {resultado.visitante.fotoUrl && (
                      <img
                        src={resultado.visitante.fotoUrl}
                        alt={resultado.visitante.nomeCompleto}
                        className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-cover rounded-lg mb-4 shadow-md"
                      />
                    )}
                    <div className="space-y-2 text-gray-700 text-sm md:text-base">
                      <p>
                        <strong>Nome:</strong> {resultado.visitante.nomeCompleto}
                      </p>
                      <p>
                        <strong>CPF:</strong> {resultado.visitante.cpf || "NÃ£o informado"}
                      </p>
                      <p>
                        <strong>Data de Nascimento:</strong>{" "}
                        {resultado.visitante.dataNascimento
                          ? new Date(resultado.visitante.dataNascimento).toLocaleDateString("pt-BR")
                          : "NÃ£o informado"}
                      </p>
                    </div>
                  </div>

                  {/* Adolescentes Relacionados - SELECIONÃVEIS */}
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">
                      <span className="hidden sm:inline">Adolescentes Relacionados</span>
                      <span className="sm:hidden">Adolescentes</span>
                      {resultado.visitante.adolescentes.length > 1 && (
                        <span className="ml-2 text-xs md:text-sm font-normal text-gray-600">
                          (Selecione um)
                        </span>
                      )}
                    </h3>
                    {resultado.visitante.adolescentes.length > 0 ? (
                      <ul className="space-y-2 md:space-y-3">
                        {resultado.visitante.adolescentes.map((adolescente) => {
                          const isSelected = adolescenteSelecionadoId === adolescente.id;
                          return (
                            <li
                              key={adolescente.id}
                              onClick={() => handleSelecionarAdolescente(adolescente.id)}
                              className={`p-3 md:p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-green-50 border-green-500 shadow-md"
                                  : "bg-indigo-50 border-indigo-200 hover:border-indigo-400 hover:shadow"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm md:text-base truncate">
                                    {adolescente.nomeSocial || adolescente.nomeCompleto}
                                  </p>
                                  {adolescente.nomeSocial && adolescente.nomeCompleto && (
                                    <p className="text-xs md:text-sm text-gray-600 truncate">
                                      Nome completo: {adolescente.nomeCompleto}
                                    </p>
                                  )}
                                </div>
                                {isSelected && (
                                  <CheckCircle className="text-green-600 flex-shrink-0 w-5 h-5 md:w-6 md:h-6" />
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
                                          â„¹ï¸ {aviso}
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
                      <p className="text-gray-500 text-sm">Nenhum adolescente relacionado</p>
                    )}

                    {/* Ãšltimas Visitas */}
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mt-5 md:mt-6 mb-3 md:mb-4">
                      Ãšltimas Visitas
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
                              DuraÃ§Ã£o:{" "}
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

                {/* BotÃµes de AÃ§Ã£o */}
                <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 md:gap-4">
                  <button
                    onClick={handleRegistrarVisita}
                    disabled={!adolescenteSelecionadoId || validandoEntrada}
                    className={`flex-1 px-4 md:px-6 py-2.5 md:py-3 rounded-lg transition-colors font-semibold shadow-md text-sm md:text-base ${
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
                      limparEstadoVisita();
                      if (origemIdentificacao === "facial") {
                        iniciarFluxoFacial();
                      } else {
                        setModoIdentificacao(false);
                        setOrigemIdentificacao(null);
                      }
                    }}
                    className="px-4 md:px-6 py-2.5 md:py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold shadow-md text-sm md:text-base"
                  >
                    Nova IdentificaÃ§Ã£o
                  </button>
                </div>
              </>
            ) : (
              /* Falha na IdentificaÃ§Ã£o */
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                  <AlertCircle className="text-amber-600 w-10 h-10 md:w-12 md:h-12 flex-shrink-0" />
                  <div>
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-amber-700">
                      Visitante NÃ£o Identificado
                    </h2>
                    <p className="text-gray-600 mt-1 text-xs md:text-sm">{resultado.message}</p>
                  </div>
                </div>

                <p className="text-gray-700 mb-4 md:mb-6 text-sm md:text-base">
                  O sistema nÃ£o conseguiu identificar automaticamente este visitante.
                  PossÃ­veis motivos:
                </p>

                <ul className="list-disc list-inside space-y-1.5 md:space-y-2 text-gray-700 mb-4 md:mb-6 text-sm md:text-base">
                  <li>Visitante nÃ£o possui face cadastrada no sistema</li>
                  <li>Qualidade da imagem capturada estÃ¡ baixa</li>
                  <li>IluminaÃ§Ã£o inadequada</li>
                  <li>Face parcialmente obstruÃ­da</li>
                </ul>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <button
                    onClick={() => alert("Redirecionar para cadastro manual")}
                    className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md text-sm md:text-base"
                  >
                    <span className="hidden sm:inline">Cadastrar Novo Visitante</span>
                    <span className="sm:hidden">Cadastrar Visitante</span>
                  </button>
                  <button
                    onClick={() => {
                      limparEstadoVisita();
                      iniciarFluxoFacial();
                    }}
                    className="px-4 md:px-6 py-2.5 md:py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold shadow-md text-sm md:text-base"
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6 flex items-center gap-2 md:gap-3">
            <AlertCircle className="text-red-600 w-7 h-7 md:w-8 md:h-8 flex-shrink-0" />
            <div>
              <h3 className="text-base md:text-lg font-bold text-red-700">Erro</h3>
              <p className="text-red-600 text-sm md:text-base">{erro}</p>
            </div>
          </div>
        )}

        {mensagemSucesso && !resultado && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 md:p-6 flex items-center gap-2 md:gap-3">
            <CheckCircle className="text-green-600 w-7 h-7 md:w-8 md:h-8 flex-shrink-0" />
            <div>
              <h3 className="text-base md:text-lg font-bold text-green-700">Sucesso</h3>
              <p className="text-green-700 text-sm md:text-base">{mensagemSucesso}</p>
            </div>
          </div>
        )}

        {/* Processando */}
        {processando && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 md:p-6 text-center">
            <p className="text-indigo-700 font-semibold text-sm md:text-base">
              Processando...
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

        {/* Modal de ValidaÃ§Ã£o PrÃ©via */}
        {mostrarModalValidacao && resultado?.success && resultado.visitante && (
          <ModalValidacaoPrevia
            visitanteId={resultado.visitante.id}
            visitanteNome={resultado.visitante.nomeCompleto}
            adolescentes={resultado.visitante.adolescentes}
            onConfirmar={(adolescenteId, justificativa, registrarDireto) => {
              setAdolescenteSelecionadoId(adolescenteId);
              setJustificativaHorario(justificativa);
              setMostrarModalValidacao(false);

              if (registrarDireto) {
                registrarVisitaDireta(adolescenteId, justificativa ?? null);
              } else {
                setMostrarModalVisita(true);
              }
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
              setValidacaoResultado(null);
              setJustificativaHorario(null);
              if (origemIdentificacao === "facial") {
                setModoIdentificacao(true);
              } else {
                setModoIdentificacao(false);
                setOrigemIdentificacao(null);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}







