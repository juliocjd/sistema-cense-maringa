import * as faceapi from "face-api.js";

let modelsLoaded = false;

/**
 * Carrega os modelos de detecção facial do face-api.js
 * Os modelos devem estar em public/models/
 */
export async function loadFaceAPIModels(): Promise<void> {
  if (modelsLoaded) return;

  const MODEL_URL = "/models";

  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
    console.log("✅ Modelos face-api.js carregados com sucesso");
  } catch (error) {
    console.error("❌ Erro ao carregar modelos face-api.js:", error);
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
    await loadFaceAPIModels();

    const detection = await faceapi
      .detectSingleFace(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    return detection.descriptor;
  } catch (error) {
    console.error("Erro ao detectar face:", error);
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

    const detections = await faceapi
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

  return faceapi.euclideanDistance(arr1, arr2);
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
  let bestMatch: { id: string; distance: number } | null = null;

  for (const known of knownEmbeddings) {
    const distance = compareFaceEmbeddings(targetEmbedding, known.embedding);

    if (distance < threshold) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { id: known.id, distance };
      }
    }
  }

  if (!bestMatch) return null;

  // Converter distância em confiança (0-100%)
  // Distância 0 = 100% confiança, Distância 0.6 = ~0% confiança
  const confidence = Math.max(0, Math.min(100, (1 - bestMatch.distance / 0.6) * 100));

  return {
    id: bestMatch.id,
    distance: bestMatch.distance,
    confidence: Math.round(confidence),
  };
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

  const detections = await faceapi
    .detectAllFaces(imageElement)
    .withFaceLandmarks();

  const displaySize = {
    width: imageElement.width || (imageElement as HTMLImageElement).naturalWidth,
    height: imageElement.height || (imageElement as HTMLImageElement).naturalHeight,
  };

  faceapi.matchDimensions(canvasElement, displaySize);
  const resizedDetections = faceapi.resizeResults(detections, displaySize);

  const ctx = canvasElement.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  }

  faceapi.draw.drawDetections(canvasElement, resizedDetections);
  faceapi.draw.drawFaceLandmarks(canvasElement, resizedDetections);
}

/**
 * Verifica se a imagem tem qualidade suficiente para reconhecimento
 * Retorna objeto com status e mensagens de erro
 */
export async function validateImageQuality(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<{ valid: boolean; message?: string }> {
  try {
    await loadFaceAPIModels();

    const detection = await faceapi
      .detectSingleFace(imageElement)
      .withFaceLandmarks();

    if (!detection) {
      return { valid: false, message: "Nenhuma face detectada na imagem" };
    }

    // Verificar se a face está muito pequena
    const box = detection.detection.box;
    const minSize = 80; // pixels
    if (box.width < minSize || box.height < minSize) {
      return {
        valid: false,
        message: `Face muito pequena. Aproxime-se da câmera (tamanho: ${Math.round(box.width)}x${Math.round(box.height)}px)`,
      };
    }

    // Verificar confiança da detecção
    const confidence = detection.detection.score;
    if (confidence < 0.5) {
      return {
        valid: false,
        message: `Baixa qualidade de detecção (${Math.round(confidence * 100)}%). Melhore a iluminação ou posicionamento`,
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Erro ao validar qualidade:", error);
    return { valid: false, message: "Erro ao processar imagem" };
  }
}
