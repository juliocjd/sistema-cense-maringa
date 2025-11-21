"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, RotateCcw, Check, AlertCircle } from "lucide-react";
import { useWebcam } from "@/hooks/useWebcam";
import { detectFaceEmbeddings, validateImageQuality } from "@/lib/face-recognition";

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
  const { videoRef, isStreaming, error, startCamera, stopCamera, captureImage } =
    useWebcam({ width, height });

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Iniciar câmera ao montar componente
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

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
      img.src = imageDataUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => {
          console.error("Erro ao carregar imagem:", e);
          reject(new Error("Falha ao carregar imagem capturada"));
        };

        // Timeout de 5 segundos para carregamento da imagem
        setTimeout(() => reject(new Error("Timeout ao carregar imagem")), 5000);
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
      img.src = capturedImage;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => {
          console.error("Erro ao carregar imagem na confirmação:", e);
          reject(new Error("Falha ao carregar imagem"));
        };

        // Timeout de 5 segundos
        setTimeout(() => reject(new Error("Timeout ao carregar imagem")), 5000);
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
        setProcessing(false);
        return;
      }

      console.log("📤 CameraCapture: Enviando para componente pai...");
      console.log("📸 imageDataUrl length:", capturedImage.length);
      console.log("🧠 embeddings tipo:", typeof embeddings);
      console.log("🧠 embeddings é Float32Array?", embeddings instanceof Float32Array);

      // Enviar para componente pai
      onCapture(capturedImage, embeddings);

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
      setProcessing(false);
    }
  };

  /**
   * Refazer captura
   */
  const handleRetake = () => {
    setCapturedImage(null);
    setValidationError(null);
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
      <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-xl">
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
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-80 border-4 border-indigo-500 rounded-full opacity-30"></div>
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

      {/* Mensagens de erro */}
      {(error || validationError) && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-md">
          <AlertCircle size={20} className="flex-shrink-0" />
          <p className="text-sm">{error || validationError}</p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex gap-3">
        {!capturedImage ? (
          <>
            {/* Botão capturar */}
            <button
              onClick={handleCapture}
              disabled={!isStreaming || processing}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
            >
              <Camera size={20} />
              {processing ? "Processando..." : "Capturar Foto"}
            </button>

            {/* Botão cancelar */}
            {onCancel && (
              <button
                onClick={() => {
                  stopCamera();
                  onCancel();
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold shadow-md"
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
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
            >
              <Check size={20} />
              {processing ? "Processando..." : "Confirmar"}
            </button>

            {/* Botão refazer */}
            <button
              onClick={handleRetake}
              disabled={processing}
              className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
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
                className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold shadow-md"
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
