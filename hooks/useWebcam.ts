import { useRef, useState, useCallback, useEffect } from "react";

export interface UseWebcamOptions {
  width?: number;
  height?: number;
  facingMode?: "user" | "environment";
  audio?: boolean;
}

export interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureImage: () => string | null;
  switchCamera: () => Promise<void>;
}

/**
 * Hook para gerenciar acesso à webcam
 * Fornece controle completo sobre stream de vídeo e captura de imagens
 */
export function useWebcam(options: UseWebcamOptions = {}): UseWebcamReturn {
  const {
    width = 640,
    height = 480,
    facingMode: initialFacingMode = "user",
    audio = false,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    initialFacingMode
  );

  /**
   * Inicia a câmera com as configurações especificadas
   */
  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Verificar se o navegador suporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Seu navegador não suporta acesso à câmera. Use um navegador mais recente."
        );
      }

      // Parar stream anterior se existir
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Solicitar acesso à câmera
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: { ideal: facingMode },
        },
        audio,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Conectar stream ao elemento de vídeo
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido ao acessar câmera";

      // Mensagens mais amigáveis para erros comuns
      if (errorMessage.includes("Permission denied")) {
        setError(
          "Permissão negada. Por favor, permita o acesso à câmera nas configurações do navegador."
        );
      } else if (errorMessage.includes("not found")) {
        setError("Nenhuma câmera encontrada. Conecte uma câmera e tente novamente.");
      } else {
        setError(errorMessage);
      }

      console.error("Erro ao iniciar câmera:", err);
      setIsStreaming(false);
    }
  }, [width, height, facingMode, audio]);

  /**
   * Para a câmera e libera recursos
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setError(null);
  }, []);

  /**
   * Captura uma imagem do vídeo atual
   * @returns Data URL da imagem (base64) ou null se falhar
   */
  const captureImage = useCallback((): string | null => {
    if (!videoRef.current || !isStreaming) {
      console.error("Câmera não está ativa");
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("Não foi possível obter contexto 2D do canvas");
        return null;
      }

      // Desenhar frame atual do vídeo no canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Converter para data URL (base64)
      return canvas.toDataURL("image/jpeg", 0.9);
    } catch (err) {
      console.error("Erro ao capturar imagem:", err);
      return null;
    }
  }, [isStreaming]);

  /**
   * Alterna entre câmera frontal e traseira (útil em dispositivos móveis)
   */
  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);

    // Reiniciar câmera com novo facingMode
    if (isStreaming) {
      stopCamera();
      // Pequeno delay para garantir que a câmera foi liberada
      await new Promise((resolve) => setTimeout(resolve, 100));
      await startCamera();
    }
  }, [facingMode, isStreaming, startCamera, stopCamera]);

  /**
   * Cleanup: parar câmera quando componente for desmontado
   */
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    isStreaming,
    error,
    startCamera,
    stopCamera,
    captureImage,
    switchCamera,
  };
}
