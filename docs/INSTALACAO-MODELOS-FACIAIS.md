# Instalação dos Modelos de Reconhecimento Facial

## Opção 1: Download Manual (Recomendado)

Os modelos do face-api (@vladmandic/face-api) precisam estar na pasta `public/models/`. Siga os passos:

### 1. Criar pasta de modelos
```bash
mkdir public/models
```

### 2. Baixar modelos

Acesse o repositório oficial e baixe os arquivos:
**https://github.com/vladmandic/face-api/tree/master/model**

#### Arquivos necessários:

**SSD MobileNet v1** (Detecção de faces):
- `ssd_mobilenetv1_model-weights_manifest.json`
- `ssd_mobilenetv1_model-shard1`
- `ssd_mobilenetv1_model-shard2`

**Face Landmark 68** (Pontos faciais):
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`

**Face Recognition** (Embeddings):
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`

### 3. Salvar na pasta public/models/

Coloque todos os 8 arquivos baixados em `public/models/`.

Estrutura final:
```
public/
└── models/
    ├── ssd_mobilenetv1_model-weights_manifest.json
    ├── ssd_mobilenetv1_model-shard1
    ├── ssd_mobilenetv1_model-shard2
    ├── face_landmark_68_model-weights_manifest.json
    ├── face_landmark_68_model-shard1
    ├── face_recognition_model-weights_manifest.json
    ├── face_recognition_model-shard1
    └── face_recognition_model-shard2
```

### 4. Verificar instalação

Navegue até `/portaria` no sistema. Se os modelos foram instalados corretamente, a câmera deve iniciar e o reconhecimento facial funcionará.

## Opção 2: Download via CDN (Alternativa)

Se não conseguir baixar do GitHub, use o CDN oficial:

```bash
# Execute o script alternativo (será criado)
node scripts/download-face-models-cdn.js
```

## Opção 3: Usar face-api via CDN (Sem Download)

**Desvantagem**: Requer internet para funcionar.

Edite `lib/face-recognition.ts` e altere:
```typescript
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model";
```

## Verificação

Execute o script de verificação:
```bash
node scripts/verify-models.js
```

Saída esperada:
```
✓ ssd_mobilenetv1_model-weights_manifest.json (1.2 KB)
✓ ssd_mobilenetv1_model-shard1 (5.3 MB)
✓ ssd_mobilenetv1_model-shard2 (4.2 MB)
✓ face_landmark_68_model-weights_manifest.json (0.5 KB)
✓ face_landmark_68_model-shard1 (350 KB)
✓ face_recognition_model-weights_manifest.json (0.3 KB)
✓ face_recognition_model-shard1 (6.2 MB)
✓ face_recognition_model-shard2 (5.1 MB)

✅ Todos os modelos instalados corretamente!
Total: ~22 MB
```

## Troubleshooting

### Erro: "Failed to load model"
**Causa**: Modelos não encontrados ou incompletos
**Solução**: Verifique se todos os 8 arquivos estão em `public/models/`

### Erro: "NetworkError"
**Causa**: Navegador não consegue acessar arquivos locais
**Solução**: Certifique-se que o servidor Next.js está rodando (`npm run dev`)

### Erro: "Cannot read model"
**Causa**: Arquivos corrompidos ou incompletos
**Solução**: Baixe novamente os modelos

## Links Úteis

- Repositório oficial: https://github.com/vladmandic/face-api
- Modelos: https://github.com/vladmandic/face-api/tree/master/model
- CDN alternativo: https://www.jsdelivr.com/package/npm/@vladmandic/face-api

## Tamanho dos Modelos

Total: ~22 MB

Você precisa ter internet disponível apenas uma vez para baixar os modelos. Depois, o reconhecimento facial funciona 100% offline.
