import {
  euclideanDistance,
  findBestEmbeddingMatch,
} from "@/lib/visitantes/embedding-utils";

type FaceApi = typeof import("@vladmandic/face-api");

let faceapi: FaceApi | null = null;
let faceApiLoading: Promise<FaceApi> | null = null;

let modelsLoaded = false;

const getFaceApi = async (): Promise<FaceApi> => {
  if (faceapi) return faceapi;
  if (typeof window === "undefined") {
    throw new Error("Face API disponivel apenas no navegador");
  }
  if (!faceApiLoading) {
    faceApiLoading = import("@vladmandic/face-api").then((module) => {
      faceapi = module;
      return module;
    });
  }
  return faceApiLoading;
};

/**
 * Carrega os modelos de detecção facial do face-api
 * Os modelos devem estar em public/models/
 */
export async function loadFaceAPIModels(): Promise<void> {
  if (modelsLoaded) return;

  const MODEL_URL = "/models";

  try {
    const api = await getFaceApi();
    await Promise.all([
      api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
    console.log("✅ Modelos face-api carregados com sucesso");
  } catch (error) {
    console.error("❌ Erro ao carregar modelos face-api:", error);
    throw new Error("Falha ao carregar modelos de reconhecimento facial");
  }
}

/**
 * Detecta faces em uma imagem e retorna os embeddings (descritores faciais)
 * @param imageElement - Elemento HTML da imagem (img, video, canvas)
 * @returns Array de embeddings (vetores de 128 dimensões) ou null se não detectar face
 */
export async function detectFaceEmbeddings(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  try {
    console.log("🔧 detectFaceEmbeddings: Iniciando...");
    console.log("🔧 Elemento:", imageElement.tagName, imageElement.width, "x", imageElement.height);

    await loadFaceAPIModels();
    console.log("🔧 Modelos carregados");

    const api = await getFaceApi();
    const detection = await api
      .detectSingleFace(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    console.log("🔧 Detection result:", detection);

    if (!detection) {
      console.log("⚠️ Nenhuma face detectada");
      return null;
    }

    console.log("✅ Face detectada, descriptor length:", detection.descriptor.length);
    return detection.descriptor;
  } catch (error) {
    console.error("❌ Erro ao detectar face:", error);
    if (error instanceof Error) {
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);
    }
    return null;
  }
}

/**
 * Detecta múltiplas faces em uma imagem
 * @param imageElement - Elemento HTML da imagem
 * @returns Array de embeddings ou array vazio
 */
export async function detectMultipleFaces(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array[]> {
  try {
    await loadFaceAPIModels();

    const api = await getFaceApi();
    const detections = await api
      .detectAllFaces(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptors();

    return detections.map((d) => d.descriptor);
  } catch (error) {
    console.error("Erro ao detectar faces:", error);
    return [];
  }
}

/**
 * Retorna métricas rápidas para orientar o operador em tempo real.
 */
export async function detectFaceGuidance(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<{ box: { x: number; y: number; width: number; height: number }; score: number } | null> {
  try {
    await loadFaceAPIModels();
    const api = await getFaceApi();
    const detection = await api.detectSingleFace(imageElement);
    if (!detection) return null;
    return {
      box: {
        x: detection.box.x,
        y: detection.box.y,
        width: detection.box.width,
        height: detection.box.height,
      },
      score: detection.score,
    };
  } catch (error) {
    console.error("Erro ao detectar face para guia:", error);
    return null;
  }
}

/**
 * Compara dois embeddings e retorna a distância euclidiana
 * Quanto menor a distância, mais similar são as faces
 * Threshold recomendado: 0.6 (abaixo disso = mesma pessoa)
 */
export function compareFaceEmbeddings(
  embedding1: Float32Array | number[],
  embedding2: Float32Array | number[]
): number {
  const arr1 = Array.isArray(embedding1) ? embedding1 : Array.from(embedding1);
  const arr2 = Array.isArray(embedding2) ? embedding2 : Array.from(embedding2);

  return euclideanDistance(arr1, arr2);
}

/**
 * Verifica se duas faces correspondem à mesma pessoa
 * @param embedding1 - Primeiro embedding
 * @param embedding2 - Segundo embedding
 * @param threshold - Limiar de similaridade (padrão: 0.6)
 * @returns true se forem a mesma pessoa
 */
export function isSamePerson(
  embedding1: Float32Array | number[],
  embedding2: Float32Array | number[],
  threshold: number = 0.6
): boolean {
  const distance = compareFaceEmbeddings(embedding1, embedding2);
  return distance < threshold;
}

/**
 * Encontra a melhor correspondência entre um embedding e uma lista de embeddings conhecidos
 * @param targetEmbedding - Embedding da face a ser identificada
 * @param knownEmbeddings - Array de embeddings conhecidos com IDs
 * @param threshold - Limiar de aceitação
 * @returns Objeto com o ID correspondente e a confiança, ou null
 */
export function findBestMatch(
  targetEmbedding: Float32Array | number[],
  knownEmbeddings: Array<{ id: string; embedding: number[] }>,
  threshold: number = 0.6
): { id: string; distance: number; confidence: number } | null {
  const target = Array.isArray(targetEmbedding)
    ? targetEmbedding
    : Array.from(targetEmbedding);
  return findBestEmbeddingMatch(target, knownEmbeddings, threshold);
}

/**
 * Desenha a detecção de face em um canvas
 * Útil para debug e visualização
 */
export async function drawFaceDetection(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  canvasElement: HTMLCanvasElement
): Promise<void> {
  await loadFaceAPIModels();

  const api = await getFaceApi();
  const detections = await api
    .detectAllFaces(imageElement)
    .withFaceLandmarks();

  const displaySize = {
    width: imageElement.width || (imageElement as HTMLImageElement).naturalWidth,
    height: imageElement.height || (imageElement as HTMLImageElement).naturalHeight,
  };

  api.matchDimensions(canvasElement, displaySize);
  const resizedDetections = api.resizeResults(detections, displaySize);

  const ctx = canvasElement.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  }

  api.draw.drawDetections(canvasElement, resizedDetections);
  api.draw.drawFaceLandmarks(canvasElement, resizedDetections);
}

/**
 * Verifica se a imagem tem qualidade suficiente para reconhecimento
 * Retorna objeto com status e mensagens de erro
 */
export async function validateImageQuality(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<{ valid: boolean; message?: string }> {
  try {
    console.log("🔍 validateImageQuality: Iniciando validação...");
    console.log("🔍 Elemento:", imageElement.tagName, imageElement.width, "x", imageElement.height);

    await loadFaceAPIModels();
    console.log("🔍 Modelos carregados para validação");

    const api = await getFaceApi();
    const detection = await api
      .detectSingleFace(imageElement)
      .withFaceLandmarks();

    console.log("🔍 Detection (validação):", detection);

    if (!detection) {
      console.log("⚠️ Nenhuma face detectada na validação");
      return { valid: false, message: "Nenhuma face detectada na imagem" };
    }

    // Verificar se a face está muito pequena
    const box = detection.detection.box;
    console.log("🔍 Face box:", box);
    const minSize = 80; // pixels
    if (box.width < minSize || box.height < minSize) {
      console.log("⚠️ Face muito pequena:", box.width, "x", box.height);
      return {
        valid: false,
        message: `Face muito pequena. Aproxime-se da câmera (tamanho: ${Math.round(box.width)}x${Math.round(box.height)}px)`,
      };
    }

    // Verificar confiança da detecção
    const confidence = detection.detection.score;
    console.log("🔍 Confiança da detecção:", confidence);
    if (confidence < 0.5) {
      console.log("⚠️ Baixa confiança:", confidence);
      return {
        valid: false,
        message: `Baixa qualidade de detecção (${Math.round(confidence * 100)}%). Melhore a iluminação ou posicionamento`,
      };
    }

    console.log("✅ Validação passou!");
    return { valid: true };
  } catch (error) {
    console.error("❌ Erro ao validar qualidade:", error);
    if (error instanceof Error) {
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);
    }
    return { valid: false, message: "Erro ao processar imagem" };
  }
}
