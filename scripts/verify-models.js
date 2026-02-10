/**
 * Script para verificar se os modelos do face-api estão instalados
 * Execute: node scripts/verify-models.js
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');

const REQUIRED_FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

console.log('Verificando instalação dos modelos face-api...\n');

// Verificar se diretório existe
if (!fs.existsSync(MODELS_DIR)) {
  console.log('✗ Diretório public/models/ não existe!');
  console.log('\nPara criar, execute:');
  console.log('  mkdir public/models\n');
  process.exit(1);
}

// Verificar cada arquivo
let allPresent = true;
let totalSize = 0;

for (const file of REQUIRED_FILES) {
  const filePath = path.join(MODELS_DIR, file);

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
    console.log(`✓ ${file} (${formatBytes(stats.size)})`);
  } else {
    console.log(`✗ ${file} - FALTANDO`);
    allPresent = false;
  }
}

console.log('\n' + '='.repeat(60));

if (allPresent) {
  console.log(`✅ Todos os modelos instalados corretamente!`);
  console.log(`📦 Tamanho total: ${formatBytes(totalSize)}`);
  console.log('\n✓ Sistema de reconhecimento facial pronto para uso!');
  process.exit(0);
} else {
  console.log('❌ Alguns modelos estão faltando!');
  console.log('\nPara instalar, siga as instruções em:');
  console.log('  docs/INSTALACAO-MODELOS-FACIAIS.md\n');
  console.log('Ou baixe manualmente de:');
  console.log('  https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/\n');
  process.exit(1);
}
