# Sistema de Reconhecimento Facial - CENSE Maringá

## Visão Geral

O sistema de reconhecimento facial foi implementado para automatizar e agilizar o processo de identificação de visitantes na portaria do CENSE Maringá. O sistema é 100% local (sem dependência de nuvem), garantindo privacidade e conformidade com a LGPD.

## Tecnologias Utilizadas

- **face-api.js**: Biblioteca JavaScript de reconhecimento facial baseada em TensorFlow.js
- **Modelos de IA**: SSD MobileNet v1, Face Landmark 68, Face Recognition Net
- **Armazenamento**: PostgreSQL (embeddings em formato JSON)
- **Upload**: Sistema local de arquivos (pasta `public/uploads`)

## Arquitetura

### 1. Componentes Client-Side

#### **CameraCapture** (`components/reconhecimento-facial/camera-capture.tsx`)
Componente React que gerencia a captura de fotos via webcam com validação automática de detecção facial.

**Props:**
- `onCapture: (imageDataUrl: string, embeddings: Float32Array) => void`
- `onCancel?: () => void`
- `width?: number` (padrão: 640)
- `height?: number` (padrão: 480)
- `title?: string`
- `subtitle?: string`

**Funcionalidades:**
- Captura de imagem via webcam
- Validação automática de face detectável
- Preview antes de confirmar
- Feedback visual de qualidade
- Instruções em tempo real

#### **useWebcam** (`hooks/useWebcam.ts`)
Hook React personalizado para gerenciar acesso à webcam.

**Retorno:**
```typescript
{
  videoRef: React.RefObject<HTMLVideoElement>
  isStreaming: boolean
  error: string | null
  startCamera: () => Promise<void>
  stopCamera: () => void
  captureImage: () => string | null
  switchCamera: () => Promise<void>
}
```

**Recursos:**
- Gerenciamento automático do stream
- Suporte a múltiplas câmeras (frontal/traseira)
- Tratamento de erros de permissão
- Cleanup automático de recursos

#### **Utilitários face-api.js** (`lib/face-recognition.ts`)
Funções auxiliares para reconhecimento facial.

**Principais funções:**
```typescript
// Carrega modelos de IA (executar antes de usar outras funções)
loadFaceAPIModels(): Promise<void>

// Detecta face e extrai embeddings (vetor de 128 dimensões)
detectFaceEmbeddings(imageElement): Promise<Float32Array | null>

// Detecta múltiplas faces
detectMultipleFaces(imageElement): Promise<Float32Array[]>

// Compara dois embeddings (retorna distância euclidiana)
compareFaceEmbeddings(embedding1, embedding2): number

// Verifica se são a mesma pessoa (threshold padrão: 0.6)
isSamePerson(embedding1, embedding2, threshold?): boolean

// Encontra melhor correspondência em lista de embeddings
findBestMatch(targetEmbedding, knownEmbeddings, threshold?): { id, distance, confidence } | null

// Valida qualidade da imagem
validateImageQuality(imageElement): Promise<{ valid: boolean, message?: string }>

// Desenha detecção em canvas (debug)
drawFaceDetection(imageElement, canvasElement): Promise<void>
```

### 2. APIs Backend

#### **POST /api/upload**
Upload de imagens para armazenamento local.

**Request:**
```typescript
FormData {
  file: File
  tipo: "visitante" | "evidencia"
}
```

**Response:**
```json
{
  "success": true,
  "url": "/uploads/visitantes/1234567890-abc123.jpg",
  "fileName": "1234567890-abc123.jpg",
  "size": 125648,
  "type": "image/jpeg"
}
```

**Validações:**
- Tipos permitidos: JPG, PNG, WebP
- Tamanho máximo: 5MB
- Cria diretórios automaticamente

#### **POST /api/visitantes/cadastrar-face**
Cadastra embeddings faciais de um visitante.

**Request:**
```json
{
  "visitanteId": "uuid",
  "faceEmbeddings": [0.123, -0.456, ...], // Array de 128 números
  "fotoUrl": "/uploads/visitantes/foto.jpg",
  "consentimento": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Face cadastrada com sucesso",
  "visitante": {
    "id": "uuid",
    "nome": "Nome do Visitante",
    "fotoUrl": "/uploads/visitantes/foto.jpg",
    "consentimentoBiometria": true,
    "dataConsentimento": "2025-11-18T12:00:00.000Z"
  }
}
```

**GET /api/visitantes/cadastrar-face?visitanteId=uuid**
Verifica se visitante tem face cadastrada.

**DELETE /api/visitantes/cadastrar-face?visitanteId=uuid**
Remove face cadastrada (revogação de consentimento LGPD).

#### **POST /api/visitantes/identificar**
Identifica visitante por reconhecimento facial.

**Request:**
```json
{
  "faceEmbeddings": [0.123, -0.456, ...],
  "threshold": 0.6,
  "fotoCapturadaUrl": "/uploads/evidencias/captura.jpg",
  "operadorId": "uuid",
  "ipOrigem": "192.168.1.100"
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "message": "Visitante identificado com sucesso",
  "match": {
    "id": "uuid",
    "nome": "Nome do Visitante",
    "confidence": 87,
    "distance": 0.234
  },
  "visitante": {
    "id": "uuid",
    "nome": "Nome do Visitante",
    "cpf": "123.456.789-00",
    "rg": "12.345.678-9",
    "dataNascimento": "1990-01-01",
    "telefone": "(44) 99999-9999",
    "parentesco": "Mãe",
    "fotoUrl": "/uploads/visitantes/foto.jpg",
    "adolescentes": [{
      "id": "uuid",
      "nome": "Adolescente",
      "numeroInternacao": "2025/001"
    }],
    "ultimasVisitas": [...]
  }
}
```

**Response (Falha):**
```json
{
  "success": false,
  "message": "Nenhuma correspondência encontrada",
  "match": null,
  "totalVisitantesCadastrados": 45
}
```

**GET /api/visitantes/identificar?dataInicio=...&dataFim=...**
Estatísticas de reconhecimento facial.

**Response:**
```json
{
  "success": true,
  "estatisticas": {
    "totalVerificacoes": 150,
    "verificacoesSucesso": 135,
    "verificacoesFalha": 15,
    "taxaSucesso": 90.0,
    "visitantesComFaceCadastrada": 45
  },
  "verificacoesRecentes": [...]
}
```

### 3. Banco de Dados

#### **Tabela: visitantes**
Campos adicionados:
```sql
face_embeddings         JSONB          -- Array de 128 números (embeddings faciais)
consentimento_biometria BOOLEAN        -- Consentimento LGPD
data_consentimento      TIMESTAMP(3)   -- Data do consentimento
```

#### **Tabela: verificacoes_faciais**
Nova tabela para auditoria:
```sql
CREATE TABLE verificacoes_faciais (
    id                   TEXT PRIMARY KEY,
    visitante_id         TEXT NOT NULL,
    data_hora            TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    resultado            TEXT NOT NULL,  -- "SUCESSO", "FALHA", "BLOQUEADO", "MANUAL"
    confianca            DOUBLE PRECISION,
    foto_capturada_url   TEXT,
    operador_id          TEXT,
    ip_origem            TEXT,
    FOREIGN KEY (visitante_id) REFERENCES visitantes(id) ON DELETE CASCADE
);
```

## Fluxo de Uso

### 1. Cadastro de Face (Primeira Vez)

```
1. Navegue para /visitantes
2. Selecione visitante existente
3. Clique em "Cadastrar Face"
4. Sistema abre câmera
5. Posicione rosto no centro
6. Sistema valida detecção automática
7. Confirme captura
8. Sistema extrai embeddings (128 dimensões)
9. Salva no banco de dados
10. Visitante agora pode ser identificado automaticamente
```

### 2. Identificação na Portaria

```
1. Navegue para /portaria
2. Clique em "Identificar Visitante"
3. Sistema abre câmera
4. Posicione rosto do visitante
5. Sistema captura e processa
6. Compara com todos visitantes cadastrados
7. Retorna melhor correspondência (se confiança > 60%)
8. Exibe dados completos do visitante
9. Permite registrar visita
10. Registra tentativa no log de auditoria
```

### 3. Revogação de Consentimento (LGPD)

```
1. Navegue para /visitantes
2. Selecione visitante
3. Clique em "Revogar Consentimento Biométrico"
4. Sistema remove embeddings do banco
5. Visitante não será mais reconhecido automaticamente
```

## Parâmetros Técnicos

### Threshold de Reconhecimento
- **Valor padrão**: 0.6
- **Distância < 0.4**: Alta confiança (>85%)
- **Distância 0.4-0.6**: Confiança média (60-85%)
- **Distância > 0.6**: Baixa confiança (<60%) - Não identifica

### Qualidade de Imagem
- **Resolução mínima da face**: 80x80 pixels
- **Confiança de detecção**: > 50%
- **Iluminação**: Frontal, sem sombras fortes
- **Orientação**: Face frontal (±15° tolerância)

### Performance
- **Tempo de cadastro**: ~2-3 segundos
- **Tempo de identificação**: ~3-5 segundos (depende do número de visitantes)
- **Embeddings por visitante**: 128 floats = ~512 bytes
- **Armazenamento de 1000 visitantes**: ~500KB (só embeddings)

## Requisitos de Hardware

### Mínimo (Funcional)
- **Câmera**: 720p (HD) webcam USB
- **Iluminação**: Ring light 10" ou 2 luminárias LED 20W
- **Processador**: Intel i3 8ª geração ou superior
- **RAM**: 4GB
- **Custo**: ~R$ 700-1.000

### Recomendado (Ideal)
- **Câmera**: 1080p Full HD webcam Logitech C920 ou similar
- **Iluminação**: Ring light 12" + 2 luminárias LED 30W
- **Processador**: Intel i5 10ª geração ou superior
- **RAM**: 8GB
- **Custo**: ~R$ 1.200-1.800

### Profissional (Ótimo)
- **Câmera**: 4K webcam ou câmera IP Intelbras
- **Iluminação**: Sistema profissional com softbox
- **Processador**: Intel i7 ou superior
- **RAM**: 16GB
- **Custo**: ~R$ 2.500-3.500

## Setup e Instalação

### 1. Baixar Modelos de IA

Os modelos precisam estar em `public/models/`:

```bash
# Criar pasta de modelos
mkdir -p public/models

# Baixar modelos do face-api.js (fazer manualmente ou via script)
# Modelos necessários:
# - ssd_mobilenetv1_model-weights_manifest.json
# - ssd_mobilenetv1_model-shard1
# - face_landmark_68_model-weights_manifest.json
# - face_landmark_68_model-shard1
# - face_recognition_model-weights_manifest.json
# - face_recognition_model-shard1
```

Download dos modelos: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

### 2. Criar Estrutura de Pastas

```bash
mkdir -p public/uploads/visitantes
mkdir -p public/uploads/evidencias
```

### 3. Aplicar Migration

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Configurar Permissões

Certifique-se que o servidor Next.js tem permissão de escrita em `public/uploads/`.

## Segurança e Privacidade (LGPD)

### Dados Coletados
- **Embeddings faciais**: Vetores numéricos (128 dimensões)
- **Foto do visitante**: Armazenada localmente
- **Logs de verificação**: Data/hora, resultado, confiança

### Conformidade LGPD
✓ **Consentimento explícito**: Sistema exige consentimento antes de cadastrar
✓ **Finalidade específica**: Identificação de visitantes autorizados
✓ **Minimização de dados**: Armazena apenas embeddings necessários
✓ **Direito ao esquecimento**: API de revogação implementada
✓ **Armazenamento local**: Dados não saem do servidor
✓ **Auditoria**: Todos os acessos são logados
✓ **Segurança**: Embeddings não permitem reconstruir face original

### Direitos do Titular
1. **Acesso**: Verificar se possui face cadastrada (GET /api/visitantes/cadastrar-face)
2. **Revogação**: Remover face cadastrada (DELETE /api/visitantes/cadastrar-face)
3. **Portabilidade**: Exportar embeddings (via API)
4. **Correção**: Recadastrar face (POST /api/visitantes/cadastrar-face)

## Troubleshooting

### Câmera não inicia
**Problema**: Erro "Permission denied"
**Solução**:
- Permitir acesso à câmera no navegador
- Chrome: Settings > Privacy > Camera > Allow
- Usar HTTPS (ou localhost)

### Face não detectada
**Problema**: "Nenhuma face detectada"
**Soluções**:
- Melhorar iluminação (frontal, sem sombras)
- Aproximar-se da câmera (face deve ter >80px)
- Remover óculos escuros/chapéus
- Olhar diretamente para câmera

### Identificação falha constantemente
**Problema**: Sempre retorna "Nenhuma correspondência"
**Soluções**:
- Verificar se visitante tem face cadastrada
- Recadastrar face com melhor qualidade
- Ajustar threshold (aumentar para 0.7)
- Verificar iluminação consistente (cadastro vs identificação)

### Performance lenta
**Problema**: Identificação demora muito
**Soluções**:
- Verificar quantidade de visitantes cadastrados
- Otimizar query do banco (índices)
- Usar máquina com melhor CPU
- Reduzir resolução da câmera (640x480)

## Melhorias Futuras

### Curto Prazo
- [ ] Interface de cadastro de face integrada ao formulário de visitantes
- [ ] Dashboard de estatísticas de reconhecimento
- [ ] Alertas para falhas consecutivas
- [ ] Integração com registro de visitas

### Médio Prazo
- [ ] Suporte a múltiplas faces cadastradas por visitante
- [ ] Detecção de vivacidade (anti-spoofing com foto)
- [ ] Reconhecimento com máscara facial
- [ ] App mobile para portaria

### Longo Prazo
- [ ] Integração com catracas eletrônicas
- [ ] Sistema de notificações em tempo real
- [ ] Machine learning para melhoria contínua
- [ ] Análise de comportamento e padrões

## Suporte

Para dúvidas ou problemas:
1. Consulte este documento
2. Verifique logs do sistema
3. Teste em ambiente de desenvolvimento
4. Contate equipe de TI

## Referências

- [face-api.js Documentation](https://github.com/justadudewhohacks/face-api.js)
- [LGPD - Lei Geral de Proteção de Dados](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Next.js File Upload](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Prisma JSON Fields](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#json)
