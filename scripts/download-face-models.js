/**
 * Script para baixar os modelos do face-api.js
 * Execute: node scripts/download-face-models.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const MODELS = [
  // SSD MobileNet v1 - Detecção de faces
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',

  // Face Landmark 68 - Pontos faciais
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',

  // Face Recognition - Embeddings
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

// Criar diretório se não existir
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log(`✓ Diretório criado: ${MODELS_DIR}`);
}

// Função para baixar arquivo
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        fs.unlink(destination, () => {});
        reject(new Error(`Falha ao baixar: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

// Baixar todos os modelos
async function downloadAllModels() {
  console.log('Baixando modelos do face-api.js...\n');

  for (const model of MODELS) {
    const url = BASE_URL + model;
    const destination = path.join(MODELS_DIR, model);

    // Verificar se já existe
    if (fs.existsSync(destination)) {
      console.log(`⊘ Já existe: ${model}`);
      continue;
    }

    try {
      process.stdout.write(`⬇ Baixando: ${model}... `);
      await downloadFile(url, destination);
      console.log('✓');
    } catch (error) {
      console.log(`✗ Erro: ${error.message}`);
    }
  }

  console.log('\n✅ Download concluído!');
  console.log(`📁 Modelos salvos em: ${MODELS_DIR}`);
}

downloadAllModels().catch(console.error);
