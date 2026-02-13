"use client";

import { useState, useRef, useEffect, type PointerEvent } from "react";
import {
  Camera,
  X,
  RotateCcw,
  RotateCw,
  Check,
  AlertCircle,
} from "lucide-react";
import { useWebcam } from "@/hooks/useWebcam";
import {
  detectFaceEmbeddings,
  validateImageQuality,
  detectFaceGuidance,
} from "@/lib/face-recognition";

export interface CameraCaptureProps {
  onCapture: (imageDataUrl: string, embeddings: Float32Array) => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
}

/**
 * Componente para captura de foto com detecção facial
 * Valida automaticamente se há uma face detectável na imagem
 */
export function CameraCapture({
  onCapture,
  onCancel,
  width = 640,
  height = 480,
  title = "Captura Facial",
  subtitle = "Posicione seu rosto no centro da câmera",
}: CameraCaptureProps) {
  const {
    videoRef,
    isStreaming,
    error,
    startCamera,
    stopCamera,
    captureImage,
    switchCamera,
    canZoom,
    zoom,
    zoomRange,
    setZoom,
  } = useWebcam({ width, height });

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [guidance, setGuidance] = useState<{
    status: "ok" | "warn" | "bad" | "idle";
    message: string;
    detail?: string;
  }>({ status: "idle", message: "Aguardando câmera..." });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guidanceBusyRef = useRef(false);
  const pinchStateRef = useRef<{ distance: number; zoom: number } | null>(
    null,
  );
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const lastZoomRef = useRef<number | null>(null);

  useEffect(() => {
    lastZoomRef.current = zoom;
  }, [zoom]);

  const clampZoom = (value: number) => {
    if (!zoomRange) return value;
    return Math.min(zoomRange.max, Math.max(zoomRange.min, value));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canZoom || capturedImage) return;
    if (event.pointerType !== "touch") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (activePointersRef.current.size === 2 && zoomRange) {
      const points = Array.from(activePointersRef.current.values());
      const distance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
      pinchStateRef.current = {
        distance,
        zoom,
      };
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!canZoom || capturedImage || !zoomRange) return;
    if (event.pointerType !== "touch") return;
    if (!activePointersRef.current.has(event.pointerId)) return;

    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (activePointersRef.current.size !== 2 || !pinchStateRef.current) {
      return;
    }

    const points = Array.from(activePointersRef.current.values());
    const distance = Math.hypot(
      points[0].x - points[1].x,
      points[0].y - points[1].y,
    );
    if (pinchStateRef.current.distance <= 0) return;

    const delta = (distance - pinchStateRef.current.distance) / 300;
    const nextZoom = clampZoom(
      pinchStateRef.current.zoom +
        delta * (zoomRange.max - zoomRange.min),
    );
    const step = zoomRange.step ?? 0.1;
    if (
      lastZoomRef.current !== null &&
      Math.abs(nextZoom - lastZoomRef.current) < step / 2
    ) {
      return;
    }
    lastZoomRef.current = nextZoom;
    void setZoom(nextZoom);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") return;
    activePointersRef.current.delete(event.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStateRef.current = null;
    }
  };

  // Iniciar câmera ao montar componente
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    const verificarCameras = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setHasMultipleCameras(false);
        return;
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setHasMultipleCameras(videoInputs.length > 1);
      } catch (error) {
        console.error("Erro ao listar cameras:", error);
        setHasMultipleCameras(false);
      }
    };

    verificarCameras();
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming || capturedImage) {
      setGuidance((prev) => ({
        status: prev.status === "idle" ? prev.status : "idle",
        message: "Aguardando câmera...",
      }));
      return;
    }

    let intervalId: number | null = null;

    const atualizarGuia = async () => {
      const video = videoRef.current;
      if (!video || guidanceBusyRef.current || capturedImage) {
        return;
      }
      if (video.readyState < 2) {
        setGuidance({ status: "idle", message: "Carregando câmera..." });
        return;
      }

      guidanceBusyRef.current = true;
      try {
        const metrics = await detectFaceGuidance(video);
        if (!metrics) {
          setGuidance({
            status: "bad",
            message: "Nenhum rosto detectado",
            detail: "Aproxime e centralize o rosto",
          });
          return;
        }

        const videoWidth = video.videoWidth || video.clientWidth || width;
        const videoHeight = video.videoHeight || video.clientHeight || height;
        const sizeRatio = metrics.box.width / videoWidth;
        const centerX = metrics.box.x + metrics.box.width / 2;
        const centerY = metrics.box.y + metrics.box.height / 2;
        const offsetX = Math.abs(centerX - videoWidth / 2) / (videoWidth / 2);
        const offsetY = Math.abs(centerY - videoHeight / 2) / (videoHeight / 2);

        if (metrics.score < 0.6) {
          setGuidance({
            status: "warn",
            message: "Iluminação baixa",
            detail: `Detecção ${Math.round(metrics.score * 100)}%`,
          });
          return;
        }

        if (sizeRatio < 0.25) {
          setGuidance({
            status: "warn",
            message: "Aproxime o rosto",
            detail: `Tamanho ${Math.round(sizeRatio * 100)}%`,
          });
          return;
        }

        if (sizeRatio > 0.6) {
          setGuidance({
            status: "warn",
            message: "Afaste um pouco",
            detail: `Tamanho ${Math.round(sizeRatio * 100)}%`,
          });
          return;
        }

        if (offsetX > 0.2 || offsetY > 0.2) {
          setGuidance({
            status: "warn",
            message: "Centralize o rosto",
            detail: `Desvio ${Math.round(
              Math.max(offsetX, offsetY) * 100,
            )}%`,
          });
          return;
        }

        setGuidance({
          status: "ok",
          message: "Pronto para capturar",
          detail: `Detecção ${Math.round(metrics.score * 100)}%`,
        });
      } finally {
        guidanceBusyRef.current = false;
      }
    };

    atualizarGuia();
    intervalId = window.setInterval(atualizarGuia, 350);

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [capturedImage, height, isStreaming, videoRef, width]);

  /**
   * Captura foto e valida detecção facial
   */
  const handleCapture = async () => {
    setValidationError(null);
    setProcessing(true);

    try {
      const imageDataUrl = captureImage();
      if (!imageDataUrl) {
        setValidationError("Erro ao capturar imagem. Tente novamente.");
        setProcessing(false);
        return;
      }

      // Criar elemento de imagem temporário para análise
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => {
          console.error("Erro ao carregar imagem:", e);
          reject(new Error("Falha ao carregar imagem capturada"));
        };

        // Timeout de 5 segundos para carregamento da imagem
        setTimeout(() => reject(new Error("Timeout ao carregar imagem")), 5000);

        img.src = imageDataUrl;
      });

      console.log("📸 Imagem carregada com sucesso. Dimensões:", img.width, "x", img.height);

      // Validar qualidade da imagem
      console.log("🔍 Validando qualidade da imagem...");
      const qualityCheck = await validateImageQuality(img);
      console.log("📊 Resultado da validação:", qualityCheck);

      if (!qualityCheck.valid) {
        setValidationError(qualityCheck.message || "Imagem inválida");
        setProcessing(false);
        return;
      }

      // Detectar embeddings faciais com timeout
      console.log("🔍 CameraCapture: Detectando embeddings faciais...");

      // Criar timeout de 30 segundos para detecção (mobile pode ser mais lento)
      const detectionTimeout = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout: Detecção facial está demorando muito. Verifique sua conexão.")), 30000);
      });

      const embeddingsPromise = detectFaceEmbeddings(img);

      const embeddings = await Promise.race([embeddingsPromise, detectionTimeout]);

      console.log("🧠 CameraCapture: Embeddings detectados:", embeddings);
      console.log("🧠 CameraCapture: Embeddings length:", embeddings?.length);

      if (!embeddings) {
        setValidationError("Nenhuma face detectada. Posicione-se melhor e tente novamente.");
        setProcessing(false);
        return;
      }

      console.log("✅ CameraCapture: Face detectada com sucesso!");

      // Sucesso - mostrar preview
      setCapturedImage(imageDataUrl);
      setProcessing(false);

      // Auto-confirmar após captura bem-sucedida
      // Usuário pode revisar antes de confirmar
    } catch (err) {
      console.error("Erro ao processar captura:", err);

      // Melhor tratamento de erros
      let errorMessage = "Erro ao processar imagem. Tente novamente.";

      if (err instanceof Error) {
        console.error("Mensagem do erro:", err.message);
        console.error("Stack do erro:", err.stack);
        errorMessage = err.message;

        // Mensagens específicas para problemas comuns em mobile
        if (err.message.includes("Timeout")) {
          errorMessage = "⏱️ A detecção está demorando muito. Verifique sua conexão com a internet e tente novamente.";
        } else if (err.message.includes("models")) {
          errorMessage = "📦 Erro ao carregar modelos. Recarregue a página e tente novamente.";
        }
      } else if (typeof err === 'object' && err !== null) {
        console.error("Erro (objeto):", JSON.stringify(err));
      }

      setValidationError(errorMessage);
      setProcessing(false);
    }
  };

  /**
   * Confirma a captura e envia para o componente pai
   */
  const handleConfirm = async () => {
    if (!capturedImage) return;

    setProcessing(true);

    try {
      // Reprocessar para obter embeddings
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => {
          console.error("Erro ao carregar imagem na confirmação:", e);
          reject(new Error("Falha ao carregar imagem"));
        };

        // Timeout de 5 segundos
        setTimeout(() => reject(new Error("Timeout ao carregar imagem")), 5000);

        img.src = capturedImage;
      });

      console.log("🔄 CameraCapture: Reprocessando embeddings na confirmação...");

      // Criar timeout de 30 segundos para detecção (mobile pode ser mais lento)
      const detectionTimeout = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout: Detecção facial está demorando muito. Verifique sua conexão.")), 30000);
      });

      const embeddingsPromise = detectFaceEmbeddings(img);

      const embeddings = await Promise.race([embeddingsPromise, detectionTimeout]);

      console.log("🧠 CameraCapture (confirmação): Embeddings:", embeddings);
      console.log("🧠 CameraCapture (confirmação): Embeddings length:", embeddings?.length);

      if (!embeddings) {
        setValidationError("Erro ao processar face. Capture novamente.");
        setCapturedImage(null);
        return;
      }

      console.log("📤 CameraCapture: Enviando para componente pai...");
      console.log("📸 imageDataUrl length:", capturedImage.length);
      console.log("🧠 embeddings tipo:", typeof embeddings);
      console.log("🧠 embeddings é Float32Array?", embeddings instanceof Float32Array);

      // Enviar para componente pai
      await onCapture(capturedImage, embeddings);

      console.log("✅ CameraCapture: onCapture chamado com sucesso!");
    } catch (err) {
      console.error("Erro ao confirmar captura:", err);

      // Melhor tratamento de erros
      let errorMessage = "Erro ao processar. Tente novamente.";

      if (err instanceof Error) {
        console.error("Mensagem do erro:", err.message);
        console.error("Stack do erro:", err.stack);
        errorMessage = err.message;

        // Mensagens específicas para problemas comuns em mobile
        if (err.message.includes("Timeout")) {
          errorMessage = "⏱️ A detecção está demorando muito. Verifique sua conexão com a internet e tente novamente.";
        } else if (err.message.includes("models")) {
          errorMessage = "📦 Erro ao carregar modelos. Recarregue a página e tente novamente.";
        }
      } else if (typeof err === 'object' && err !== null) {
        console.error("Erro (objeto):", JSON.stringify(err));
      }

      setValidationError(errorMessage);
      setCapturedImage(null);
    } finally {
      setProcessing(false);
      setCapturedImage(null);
    }
  };

  /**
   * Refazer captura
   */
  const handleRetake = () => {
    setCapturedImage(null);
    setValidationError(null);
    stopCamera();
    startCamera();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Camera className="text-indigo-600" size={28} />
          {title}
        </h2>
        <p className="text-gray-600 mt-1">{subtitle}</p>
      </div>

      {/* Área de vídeo/imagem */}
      <div
        className="relative bg-gray-900 rounded-lg overflow-hidden shadow-xl touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!capturedImage ? (
          <>
            {/* Vídeo ao vivo */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
              style={{ maxWidth: `${width}px`, maxHeight: `${height}px` }}
            />

            {/* Overlay de guia */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-3 top-3">
                <div
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm backdrop-blur ${
                    guidance.status === "ok"
                      ? "border-emerald-200 bg-emerald-50/90 text-emerald-700"
                      : guidance.status === "warn"
                        ? "border-amber-200 bg-amber-50/90 text-amber-700"
                        : guidance.status === "bad"
                          ? "border-rose-200 bg-rose-50/90 text-rose-700"
                          : "border-slate-200 bg-slate-50/90 text-slate-600"
                  }`}
                >
                  {guidance.message}
                  {guidance.detail ? ` · ${guidance.detail}` : ""}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={`w-64 h-80 border-4 rounded-full opacity-40 ${
                    guidance.status === "ok"
                      ? "border-emerald-400"
                      : guidance.status === "warn"
                        ? "border-amber-400"
                        : guidance.status === "bad"
                          ? "border-rose-400"
                          : "border-indigo-400"
                  }`}
                />
              </div>
            </div>

            {/* Status da câmera */}
            {!isStreaming && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                <p className="text-white">Iniciando câmera...</p>
              </div>
            )}
          </>
        ) : (
          /* Preview da foto capturada */
          <img
            src={capturedImage}
            alt="Foto capturada"
            className="w-full h-auto"
            style={{ maxWidth: `${width}px`, maxHeight: `${height}px` }}
          />
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {!capturedImage && canZoom && zoomRange && (
        <div className="flex items-center gap-3 text-xs text-slate-600 w-full max-w-md">
          <span className="text-slate-500">Zoom</span>
          <input
            type="range"
            min={zoomRange.min}
            max={zoomRange.max}
            step={zoomRange.step}
            value={zoom}
            onChange={(event) => void setZoom(Number(event.target.value))}
            className="flex-1 accent-indigo-600"
          />
          <span className="w-10 text-right text-slate-500">
            {zoom.toFixed(1)}x
          </span>
        </div>
      )}

      {/* Mensagens de erro */}
      {(error || validationError) && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-md">
          <AlertCircle size={20} className="flex-shrink-0" />
          <p className="text-sm">{error || validationError}</p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
        {!capturedImage ? (
          <>
            {/* Botão capturar */}
            <button
              onClick={handleCapture}
              disabled={!isStreaming || processing}
              className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md sm:w-auto"
            >
              <Camera size={20} />
              {processing ? "Processando..." : "Capturar Foto"}
            </button>

            {hasMultipleCameras && (
              <button
                onClick={switchCamera}
                disabled={!isStreaming || processing}
                className="flex w-full items-center justify-center gap-2 px-5 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md sm:w-auto"
              >
                <RotateCw size={18} />
                Virar câmera
              </button>
            )}

            {/* Botão cancelar */}
            {onCancel && (
              <button
                onClick={() => {
                  stopCamera();
                  onCancel();
                }}
                className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold shadow-md sm:w-auto"
              >
                <X size={20} />
                Cancelar
              </button>
            )}
          </>
        ) : (
          <>
            {/* Botão confirmar */}
            <button
              onClick={handleConfirm}
              disabled={processing}
              className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md sm:w-auto"
            >
              <Check size={20} />
              {processing ? "Processando..." : "Confirmar"}
            </button>

            {/* Botão refazer */}
            <button
              onClick={handleRetake}
              disabled={processing}
              className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md sm:w-auto"
            >
              <RotateCcw size={20} />
              Tirar Outra
            </button>

            {/* Botão cancelar */}
            {onCancel && (
              <button
                onClick={() => {
                  stopCamera();
                  onCancel();
                }}
                disabled={processing}
                className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold shadow-md sm:w-auto"
              >
                <X size={20} />
                Cancelar
              </button>
            )}
          </>
        )}
      </div>

      {/* Instruções */}
      {!capturedImage && isStreaming && (
        <div className="text-center text-sm text-gray-600 max-w-md">
          <p>✓ Posicione seu rosto no centro do círculo</p>
          <p>✓ Certifique-se de que há boa iluminação</p>
          <p>✓ Evite usar óculos escuros ou chapéus</p>
          <p>✓ Olhe diretamente para a câmera</p>
        </div>
      )}
    </div>
  );
}
