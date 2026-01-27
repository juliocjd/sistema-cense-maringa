"use client";

import { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  Camera,
  UserCheck,
  AlertCircle,
  CheckCircle,
  QrCode,
  Monitor,
  X,
} from "lucide-react";
import { CameraCapture } from "@/components/reconhecimento-facial/camera-capture";
import { ScannerQRCode } from "@/components/visitantes/scanner-qrcode";
import { ListaVisitasAndamento } from "@/components/visitantes/lista-visitas-andamento";
import { BuscaVisitanteManual } from "@/components/visitantes/busca-visitante-manual";
import Link from "next/link";

type Adolescente = {
  id: string;
  nomeCompleto: string;
  nomeSocial: string | null;
  statusUnidade?: string | null;
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
    rg?: string | null;
    nomePai?: string | null;
    nomeMae?: string | null;
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

const normalizarAdolescentes = (
  lista?: (Partial<Adolescente> & { status?: string | null })[] | null
): Adolescente[] =>
  Array.isArray(lista)
    ? lista.map((item) => ({
        id: item.id ?? "",
        nomeCompleto: item.nomeCompleto ?? "",
        nomeSocial: item.nomeSocial ?? null,
        statusUnidade:
          item.statusUnidade ??
          (typeof item.status === "string" ? item.status : null) ??
          "ATIVO",
      }))
    : [];

export default function PortariaPage() {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [modoIdentificacao, setModoIdentificacao] = useState(false);
  const [modoQRCode, setModoQRCode] = useState(false);
  const [modoBuscaManual, setModoBuscaManual] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<IdentificacaoResultado | null>(
    null
  );
  const [erro, setErro] = useState<string | null>(null);
  const [adolescenteSelecionadoId, setAdolescenteSelecionadoId] =
    useState<string>("");
  const [justificativaHorario, setJustificativaHorario] = useState<string>("");
  const [observacoesVisita, setObservacoesVisita] = useState<string>("");
  const [validacaoResultado, setValidacaoResultado] = useState<any>(null);
  const [validandoEntrada, setValidandoEntrada] = useState(false);
  const [origemIdentificacao, setOrigemIdentificacao] = useState<
    "facial" | "qrcode" | "manual" | null
  >(null);
  const [cameraSessionId, setCameraSessionId] = useState(0);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [adolescentesInativos, setAdolescentesInativos] = useState<
    Adolescente[]
  >([]);
  const justificativaObrigatoria = Boolean(
    validacaoResultado?.requerJustificativa
  );
  const justificativaObrigatoriaAnterior = useRef(false);

  const separarAdolescentesPorStatus = (
    lista?: Adolescente[] | null
  ): { ativos: Adolescente[]; inativos: Adolescente[] } => {
    const normalizados = normalizarAdolescentes(lista);
    const ativos: Adolescente[] = [];
    const inativos: Adolescente[] = [];

    normalizados.forEach((adolescente) => {
      const status = (adolescente.statusUnidade || "ATIVO").toUpperCase();
      if (status === "ATIVO") {
        ativos.push(adolescente);
      } else {
        inativos.push(adolescente);
      }
    });

    return { ativos, inativos };
  };

  const descreverAdolescentes = (lista: Adolescente[]) =>
    lista
      .map((adolescente) => {
        const nome = adolescente.nomeSocial || adolescente.nomeCompleto;
        const status = (adolescente.statusUnidade || "DESCONHECIDO").toUpperCase();
        return `${nome} (${status})`;
      })
      .join(", ");

  const prepararAdolescentesParaFluxo = (
    lista?: Adolescente[] | null
  ): { ativos: Adolescente[]; inativos: Adolescente[] } => {
    const { ativos, inativos } = separarAdolescentesPorStatus(lista);
    setAdolescentesInativos(inativos);
    return { ativos, inativos };
  };

  const gerarMensagemSemAtivos = (
    visitanteNome: string,
    inativos: Adolescente[]
  ) => {
    const detalhes = inativos.length
      ? ` VÃ­nculos encontrados: ${descreverAdolescentes(inativos)}.`
      : "";
    return `Visitante ${visitanteNome} nÃ£o possui adolescentes ativos autorizados para visitas no momento.${detalhes}`;
  };

  useEffect(() => {
    if (!mensagemSucesso) {
      return;
    }
    const timeout = setTimeout(() => setMensagemSucesso(null), 4000);
    return () => clearTimeout(timeout);
  }, [mensagemSucesso]);

  useEffect(() => {
    if (justificativaObrigatoria && !justificativaObrigatoriaAnterior.current) {
      setJustificativaHorario("");
    }
    if (!justificativaObrigatoria && justificativaObrigatoriaAnterior.current) {
      setJustificativaHorario("");
    }
    justificativaObrigatoriaAnterior.current = justificativaObrigatoria;
  }, [justificativaObrigatoria]);

  const iniciarFluxoFacial = () => {
    setModoIdentificacao(true);
    setOrigemIdentificacao("facial");
    setCameraSessionId((prev) => prev + 1);
    setMensagemSucesso(null);
  };

  const cancelarFluxoFacial = () => {
    setModoIdentificacao(false);
    setOrigemIdentificacao(null);
    setResultado(null);
    setErro(null);
    setCameraSessionId((prev) => prev + 1);
  };

  const reiniciarSessaoCamera = () => {
    setCameraSessionId((prev) => prev + 1);
  };

  const limparEstadoVisita = () => {
    setResultado(null);
    setErro(null);
    setAdolescenteSelecionadoId("");
    setValidacaoResultado(null);
    setJustificativaHorario("");
    setObservacoesVisita("");
    setAdolescentesInativos([]);
  };

  const registrarVisitaDireta = async (
    adolescenteId: string,
    justificativa: string | null,
    observacoes: string | null
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
            observacoes,
            justificativaHorario: justificativa || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errosDetalhes = Array.isArray(data.erros)
          ? data.erros.join(" | ")
          : "";
        const alertasDetalhes = Array.isArray(data.alertas)
          ? data.alertas.join(" | ")
          : "";
        const detalhes = [errosDetalhes, alertasDetalhes]
          .filter((texto) => texto && texto.length > 0)
          .join(" | ");
        setErro(
          `${data.erro || "Erro ao registrar visita."}${
            detalhes ? ` (${detalhes})` : ""
          }`
        );
        console.error("Erro ao registrar visita:", data);
        return;
      }

      setMensagemSucesso("Entrada registrada com sucesso.");
      limparEstadoVisita();
      setOrigemIdentificacao("facial");
      setModoIdentificacao(true);
      setCameraSessionId((prev) => prev + 1);
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
    if (origemIdentificacao === "facial" && modoIdentificacao) {
      setModoIdentificacao(false);
    }

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
        setErro(data.message || "Visitante nao identificado");
        setResultado(data);
      } else if (data.visitante) {
        const { ativos, inativos } = prepararAdolescentesParaFluxo(
          data.visitante.adolescentes
        );

        if (ativos.length === 0) {
          setErro(
            gerarMensagemSemAtivos(data.visitante.nomeCompleto, inativos)
          );
          setResultado(null);
          if (origemIdentificacao === "facial") {
            reiniciarSessaoCamera();
          }
          return;
        }

        // Verificar se ha visitas em andamento ANTES de mostrar sucesso
        const visitasAbertas = await verificarVisitasEmAndamento(
          data.visitante.id
        );

        if (visitasAbertas.length > 0) {
          // Visitante tem visita em andamento - mostrar erro específico
          const nomes = visitasAbertas
            .map((v: any) => v.adolescente?.nomeCompleto || "Adolescente")
            .join(", ");
          setErro(
            `ATENCAO: ${data.visitante.nomeCompleto} ja possui visita em andamento com: ${nomes}. ` +
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
              adolescentes: ativos,
              ultimasVisitas: Array.isArray(data.visitante.ultimasVisitas)
                ? data.visitante.ultimasVisitas.slice(0, 3)
                : [],
            },
          });

          if (ativos.length === 1) {
            // Auto-selecionar se houver apenas 1 adolescente
            const adolescenteId = ativos[0].id;
            setAdolescenteSelecionadoId(adolescenteId);
            // Validar automaticamente
            await validarEntradaAutomatica(data.visitante.id, adolescenteId);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao identificar visitante:", err);
      setErro("Erro ao processar identificacao. Tente novamente.");
    } finally {
      setProcessando(false);
      if (origemIdentificacao === "facial") {
        setModoIdentificacao(false);
      }
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
  const validarEntradaAutomatica = async (
    visitanteId: string,
    adolescenteId: string
  ) => {
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
   * Confirma entrada imediatamente, usando justificativa/observacao atuais
   */
  const handleConfirmarEntrada = async () => {
    if (!adolescenteSelecionadoId) {
      alert("Por favor, selecione um adolescente primeiro.");
      return;
    }

    const justificativaAtual = justificativaHorario.trim();

    if (justificativaObrigatoria && justificativaAtual.length === 0) {
      alert("Informe a justificativa de horario para continuar.");
      return;
    }

    await registrarVisitaDireta(
      adolescenteSelecionadoId,
      justificativaAtual.length > 0 ? justificativaAtual : null,
      observacoesVisita.trim() ? observacoesVisita.trim() : null
    );
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
        setErro(data.erro || "QR Code invalido");
        setModoQRCode(false);
        return;
      }

      // Verificar visitas em andamento ANTES de mostrar sucesso
      const visitasAbertas = await verificarVisitasEmAndamento(
        data.visitante.id
      );

      if (visitasAbertas.length > 0) {
        const nomes = visitasAbertas
          .map((v: any) => v.adolescente?.nomeCompleto || "Adolescente")
          .join(", ");
        setErro(
          `ATENCAO: ${data.visitante.nomeCompleto} ja possui visita em andamento com: ${nomes}. ` +
            `Por favor, finalize a visita atual antes de registrar uma nova.`
        );
        setResultado(null);
      } else {
        // Transformar resposta da API de QR Code para formato IdentificacaoResultado
        const adolescentesVinculadosApi = Array.isArray(
          data.visitante.adolescentesVinculados
        )
          ? data.visitante.adolescentesVinculados
          : [];
        setOrigemIdentificacao("qrcode");

        const { ativos, inativos } = prepararAdolescentesParaFluxo(
          adolescentesVinculadosApi as Adolescente[]
        );

        if (ativos.length === 0) {
          setErro(
            gerarMensagemSemAtivos(data.visitante.nomeCompleto, inativos)
          );
          setResultado(null);
          setModoQRCode(false);
          return;
        }

        const resultadoQRCode = {
          success: data.valido,
          message: "Visitante identificado via QR Code",
          match: {
            id: data.visitante.id,
            nomeCompleto: data.visitante.nomeCompleto,
            confidence: 100, // QR Code tem 100% de confianca
            distance: 0,
          },
          visitante: {
            id: data.visitante.id,
            nomeCompleto: data.visitante.nomeCompleto,
            cpf: data.visitante.cpf,
            rg: data.visitante.rg || null,
            nomePai: data.visitante.nomePai || null,
            nomeMae: data.visitante.nomeMae || null,
            dataNascimento: "", // Nao vem na API de QR Code
            fotoUrl: data.visitante.urlFoto || "",
            adolescentes: ativos,
            ultimasVisitas: Array.isArray(data.visitasRecentes)
              ? data.visitasRecentes.slice(0, 3).map((v: any) => ({
                  id: v.id,
                  dataHoraEntrada: v.dataHoraEntrada,
                  dataHoraSaida: v.dataHoraSaida,
                  observacoes: null,
                }))
              : [],
          },
        };

        setResultado(resultadoQRCode);

        // Auto-selecionar se houver apenas 1 adolescente
        if (ativos.length === 1) {
          const adolescenteId = ativos[0].id;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
            <ShieldCheck className="text-indigo-600 w-8 h-8 md:w-10 md:h-10 lg:w-11 lg:h-11" />
            <span className="hidden sm:inline">
              Portaria - Reconhecimento Facial
            </span>
            <span className="sm:hidden">Portaria</span>
          </h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base lg:text-lg">
            Sistema de identificacao automatica de visitantes
          </p>
        </div>

        {/* Modo Identificacao */}
        {modoIdentificacao && (
          <div className="mb-6">
            <CameraCapture
              key={cameraSessionId}
              onCapture={handleIdentificarVisitante}
              onCancel={cancelarFluxoFacial}
              title="Identificacao Facial"
              subtitle="Posicione o rosto do visitante no centro da camera"
            />
          </div>
        )}

        {/* Botoes de Acao */}
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
                  <span className="hidden sm:inline">
                    Reconhecimento Facial
                  </span>
                  <span className="sm:hidden">Facial</span>
                </h2>
                <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                  <span className="hidden sm:inline">
                    Identificacao automatica via camera
                  </span>
                  <span className="sm:hidden">Via camera</span>
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
                  <span className="hidden sm:inline">
                    Identificacao rapida via QR Code
                  </span>
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
                  <span className="hidden sm:inline">
                    Busca por nome ou CPF
                  </span>
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
                  <span className="hidden sm:inline">
                    Painel de controle e estatisticas
                  </span>
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
              const { ativos, inativos } = prepararAdolescentesParaFluxo(
                visitante.adolescentes
              );

              if (ativos.length === 0) {
                setErro(
                  gerarMensagemSemAtivos(visitante.nomeCompleto, inativos)
                );
                setModoBuscaManual(false);
                setResultado(null);
                return;
              }

              setModoBuscaManual(false);
              setMensagemSucesso(null);
              setResultado({
                success: true,
                message: "Visitante selecionado",
                visitante: {
                  id: visitante.id,
                  nomeCompleto: visitante.nomeCompleto,
                  cpf: visitante.cpf || "",
                  rg: visitante.rg || null,
                  nomePai: visitante.nomePai || null,
                  nomeMae: visitante.nomeMae || null,
                  dataNascimento: visitante.dataNascimento || "",
                  fotoUrl: visitante.fotoUrl || "",
                  adolescentes: ativos,
                  ultimasVisitas: [],
                },
              });
              setOrigemIdentificacao("manual");

              // Auto-selecionar se so tiver 1 adolescente
              if (ativos.length === 1) {
                const adolescenteId = ativos[0].id;
                setAdolescenteSelecionadoId(adolescenteId);
                validarEntradaAutomatica(visitante.id, adolescenteId);
              }
            }}
            onCancelar={() => setModoBuscaManual(false)}
          />
        )}

        {/* Lista de Visitas em Andamento */}
        {!modoIdentificacao &&
          !modoCadastro &&
          !modoQRCode &&
          !modoBuscaManual && (
            <div className="mb-8">
              <ListaVisitasAndamento />
            </div>
          )}

        {/* Resultado da Identificacao */}
        {resultado && (
          <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => {
                limparEstadoVisita();
                setResultado(null);
              }}
            />
            <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-4 md:p-6 lg:p-8">
              <button
                type="button"
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                aria-label="Fechar resumo"
                onClick={() => {
                  limparEstadoVisita();
                  setResultado(null);
                }}
              >
                <X className="w-5 h-5" />
              </button>
              {resultado.success && resultado.visitante ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 pb-4 md:pb-6 border-b">
                    <CheckCircle className="text-green-600 w-10 h-10 md:w-12 md:h-12 flex-shrink-0" />
                    <div>
                      <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-green-700">
                        Visitante Identificado!
                      </h2>
                      <p className="text-gray-600 mt-1 text-xs md:text-sm">
                        Confianca: {resultado.match?.confidence}% | Distancia:{" "}
                        {resultado.match?.distance.toFixed(3)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
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
                          <strong>Nome:</strong>{" "}
                          {resultado.visitante.nomeCompleto}
                        </p>
                        <p>
                          <strong>CPF:</strong>{" "}
                          {resultado.visitante.cpf || "Nao informado"}
                        </p>
                        <p>
                          <strong>RG:</strong>{" "}
                          {resultado.visitante.rg || "Nao informado"}
                        </p>
                        <p>
                          <strong>Data de Nascimento:</strong>{" "}
                          {resultado.visitante.dataNascimento
                            ? new Date(
                                resultado.visitante.dataNascimento
                              ).toLocaleDateString("pt-BR")
                            : "Nao informado"}
                        </p>
                        <p>
                          <strong>Nome do pai:</strong>{" "}
                          {resultado.visitante.nomePai || "Nao informado"}
                        </p>
                        <p>
                          <strong>Nome da mae:</strong>{" "}
                          {resultado.visitante.nomeMae || "Nao informado"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">
                        <span className="hidden sm:inline">
                          Adolescentes Relacionados
                        </span>
                        <span className="sm:hidden">Adolescentes</span>
                        {resultado.visitante.adolescentes.length > 1 && (
                          <span className="ml-2 text-xs md:text-sm font-normal text-gray-600">
                            (Selecione um)
                          </span>
                        )}
                      </h3>
                      {adolescentesInativos.length > 0 && (
                        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs md:text-sm text-amber-800">
                          <p className="font-semibold flex items-center gap-2">
                            <AlertCircle
                              size={14}
                              className="text-amber-600 flex-shrink-0"
                            />
                            Alguns adolescentes vinculados nÃ£o estÃ£o ativos
                          </p>
                          <ul className="mt-1 list-disc list-inside space-y-0.5">
                            {adolescentesInativos.map((adolescente) => (
                              <li key={adolescente.id}>
                                {(adolescente.nomeSocial ||
                                  adolescente.nomeCompleto) ??
                                  "Sem nome"}{" "}
                                (
                                {(
                                  adolescente.statusUnidade || "DESCONHECIDO"
                                ).toUpperCase()}
                                )
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {resultado.visitante.adolescentes.length > 0 ? (
                        <ul className="space-y-2 md:space-y-3">
                          {resultado.visitante.adolescentes.map(
                            (adolescente) => {
                              const isSelected =
                                adolescenteSelecionadoId === adolescente.id;
                              return (
                                <li
                                  key={adolescente.id}
                                  onClick={() =>
                                    handleSelecionarAdolescente(adolescente.id)
                                  }
                                  className={`p-3 md:p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                    isSelected
                                      ? "bg-green-50 border-green-500 shadow-md"
                                      : "bg-indigo-50 border-indigo-200 hover:border-indigo-400 hover:shadow"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-gray-900 text-sm md:text-base truncate">
                                        {adolescente.nomeSocial ||
                                          adolescente.nomeCompleto}
                                      </p>
                                      {adolescente.nomeSocial &&
                                        adolescente.nomeCompleto && (
                                          <p className="text-xs md:text-sm text-gray-600 truncate">
                                            Nome completo:{" "}
                                            {adolescente.nomeCompleto}
                                          </p>
                                        )}
                                    </div>
                                    {isSelected && (
                                      <CheckCircle className="text-green-600 flex-shrink-0 w-5 h-5 md:w-6 md:h-6" />
                                    )}
                                  </div>
                                  {isSelected && validandoEntrada && (
                                    <p className="text-xs text-blue-600 mt-2">
                                      Validando...
                                    </p>
                                  )}
                                  {isSelected && validacaoResultado && (
                                    <div className="mt-3 pt-3 border-t border-green-300">
                                      {validacaoResultado.alertas.length >
                                        0 && (
                                        <div className="space-y-1">
                                          {validacaoResultado.alertas.map(
                                            (alerta: string, idx: number) => (
                                              <p
                                                key={idx}
                                                className="text-xs text-amber-700 flex items-start gap-1"
                                              >
                                                <AlertCircle
                                                  size={14}
                                                  className="flex-shrink-0 mt-0.5"
                                                />
                                                <span>{alerta}</span>
                                              </p>
                                            )
                                          )}
                                        </div>
                                      )}
                                      {validacaoResultado.avisos.length > 0 && (
                                        <div className="space-y-1 mt-2">
                                          {validacaoResultado.avisos.map(
                                            (aviso: string, idx: number) => (
                                              <p
                                                key={idx}
                                                className="text-xs text-blue-700"
                                              >
                                                ? {aviso}
                                              </p>
                                            )
                                          )}
                                        </div>
                                      )}
                                      {!validacaoResultado.requerJustificativa &&
                                        validacaoResultado.alertas.length ===
                                          0 && (
                                          <p className="text-xs text-green-700 flex items-center gap-1">
                                            <CheckCircle size={14} />
                                            Tudo OK! Pode registrar a visita.
                                          </p>
                                        )}
                                    </div>
                                  )}
                                </li>
                              );
                            }
                          )}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          {adolescentesInativos.length > 0
                            ? "Nenhum adolescente ativo disponÃ­vel para este visitante."
                            : "Nenhum adolescente relacionado"}
                        </p>
                      )}

                      <div className="mt-5 space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            ObservaÃ§Ãµes (opcional)
                          </label>
                          <textarea
                            value={observacoesVisita}
                            onChange={(e) =>
                              setObservacoesVisita(e.target.value)
                            }
                            placeholder="Informe detalhes relevantes desta visita..."
                            className="w-full min-h-[96px] px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                          />
                        </div>

                        {validacaoResultado?.requerJustificativa && (
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                              Justificativa de horÃ¡rio
                              <span className="text-xs font-semibold text-red-600">
                                ObrigatÃ³rio
                              </span>
                            </label>
                            <textarea
                              value={justificativaHorario}
                              onChange={(e) =>
                                setJustificativaHorario(e.target.value)
                              }
                              placeholder="Especifique o motivo para autorizar a visita fora das regras impostas."
                              className="w-full min-h-[96px] px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 md:gap-4">
                    <button
                      onClick={handleConfirmarEntrada}
                      disabled={
                        !adolescenteSelecionadoId ||
                        validandoEntrada ||
                        processando ||
                        (justificativaObrigatoria &&
                          justificativaHorario.trim().length === 0)
                      }
                      className={`flex-1 px-4 md:px-6 py-2.5 md:py-3 rounded-lg transition-colors font-semibold shadow-md text-sm md:text-base ${
                        adolescenteSelecionadoId &&
                        !validandoEntrada &&
                        !processando &&
                        (!justificativaObrigatoria ||
                          justificativaHorario.trim().length > 0)
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {validandoEntrada
                        ? "Validando..."
                        : processando
                        ? "Processando..."
                        : !adolescenteSelecionadoId
                        ? "Selecione um adolescente"
                        : justificativaObrigatoria &&
                          justificativaHorario.trim().length === 0
                        ? "Informe a justificativa"
                        : "Confirmar entrada"}
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
                      Nova Identificacao
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                    <AlertCircle className="text-amber-600 w-10 h-10 md:w-12 md:h-12 flex-shrink-0" />
                    <div>
                      <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-amber-700">
                        Visitante Nao Identificado
                      </h2>
                      <p className="text-gray-600 mt-1 text-xs md:text-sm">
                        {resultado.message}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4 md:mb-6 text-sm md:text-base">
                    O sistema nao conseguiu identificar automaticamente este
                    visitante. Possiveis motivos:
                  </p>

                  <ul className="list-disc list-inside space-y-1.5 md:space-y-2 text-gray-700 mb-4 md:mb-6 text-sm md:text-base">
                    <li>Visitante nao possui face cadastrada no sistema</li>
                    <li>Qualidade da imagem capturada esta baixa</li>
                    <li>Iluminacao inadequada</li>
                    <li>Face parcialmente obstruida</li>
                  </ul>

                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                    <button
                      onClick={() => alert("Redirecionar para cadastro manual")}
                      className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md text-sm md:text-base"
                    >
                      <span className="hidden sm:inline">
                        Cadastrar Novo Visitante
                      </span>
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
          </div>
        )}

        {/* Erro */}
        {erro && !resultado && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6 flex items-center gap-2 md:gap-3">
            <AlertCircle className="text-red-600 w-7 h-7 md:w-8 md:h-8 flex-shrink-0" />
            <div>
              <h3 className="text-base md:text-lg font-bold text-red-700">
                Erro
              </h3>
              <p className="text-red-600 text-sm md:text-base">{erro}</p>
            </div>
          </div>
        )}

        {mensagemSucesso && (
          <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4">
            <div className="w-full max-w-3xl rounded-b-2xl bg-emerald-600 text-white shadow-2xl border border-emerald-500 text-center px-4 py-3 font-semibold tracking-wide">
              {mensagemSucesso}
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
      </div>
    </div>
  );
}

