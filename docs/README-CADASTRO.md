# 📝 Módulo de Cadastro de Adolescentes - CENSE Maringá

## 🎯 Visão Geral

Sistema completo de cadastro de adolescentes com formulário dividido em 5 etapas, incluindo upload de foto, registro de tatuagens, alertas especiais e histórico infracional.

## ✨ Funcionalidades Implementadas

### 1. **Formulário em Steps** (5 Etapas)

- **Etapa 1: Dados Pessoais**

  - Nome completo\* (obrigatório)
  - Nome social
  - Data de nascimento
  - Número SMS
  - Número do processo judicial
  - Data de entrada na unidade
  - Upload de foto

- **Etapa 2: Ato Infracional**

  - Descrição do ato atual
  - Histórico infracional (múltiplos registros)
    - Descrição
    - Unidade anterior
    - Ano

- **Etapa 3: Vinculações**

  - Facção/Grupo criminoso
  - Número de membro
  - Bairro de origem
  - Risco de fuga (Baixo/Médio/Alto)

- **Etapa 4: Tatuagens**

  - Catálogo de símbolos
  - Local do corpo
  - Observações
  - Adicionar múltiplas tatuagens

- **Etapa 5: Alertas Especiais**
  - ⚠️ Risco de suicídio
  - 🔒 Perfil mapeado (proteção)
  - ⚕️ Alerta de saúde confidencial
  - Campo de detalhes para saúde

### 2. **Design Premium**

- Stepper visual com indicadores de progresso
- Ícones intuitivos para cada etapa
- Feedback visual (etapas concluídas em verde)
- Validação em tempo real
- Loading states durante salvamento

### 3. **Upload de Foto**

- Preview em tempo real
- Botão flutuante sobre avatar
- Conversão para base64
- Formato circular

### 4. **Listas Dinâmicas**

- Adicionar/remover histórico infracional
- Adicionar/remover tatuagens
- Interface intuitiva com cards

## 📂 Estrutura de Arquivos

```
app/
└── (dashboard)/
    └── adolescentes/
        └── novo/
            └── page.tsx                    ← page-cadastro-adolescente.tsx

components/
└── cadastro/
    └── cadastro-adolescente.tsx           ← cadastro-adolescente.tsx
```

## 🚀 Como Usar

### Integração na Página

```typescript
import { CadastroAdolescente } from "@/components/cadastro/cadastro-adolescente";

export default function NovoAdolescentePage() {
  const handleSalvar = async (adolescente) => {
    // Chamar API POST /api/adolescentes
    await fetch("/api/adolescentes", {
      method: "POST",
      body: JSON.stringify(adolescente),
    });
  };

  const handleCancelar = () => {
    // Redirecionar ou fechar modal
    router.push("/dashboard/adolescentes");
  };

  return (
    <CadastroAdolescente onSalvar={handleSalvar} onCancelar={handleCancelar} />
  );
}
```

## 🔌 API Endpoint Necessário

### POST `/api/adolescentes`

**Body:**

```json
{
  "nomeCompleto": "João da Silva Santos",
  "nomeSocial": "João",
  "dataNascimento": "2008-05-15",
  "numeroSms": "12345",
  "numeroProcesso": "0001234-56.2024.8.16.0000",
  "dataEntrada": "2025-11-01",
  "atoInfracionalAtual": "Análogo a roubo qualificado",
  "fotoUrl": "data:image/jpeg;base64,...",
  "alertaRiscoSuicidio": false,
  "alertaPerfilMapeado": true,
  "alertaSaudeConfidencial": false,
  "statusUnidade": "ATIVO",
  "operador_id": "uuid-do-operador"
}
```

**Response (201):**

```json
{
  "id": "uuid-123",
  "nomeCompleto": "João da Silva Santos",
  "numeroSms": "12345",
  "criadoEm": "2025-11-01T10:30:00Z"
}
```

## 🎨 Customização

### Adicionar Novos Campos

```typescript
// No estado do componente
const [dadosPessoais, setDadosPessoais] = useState({
  // ... campos existentes
  novoCampo: "", // Adicione aqui
});

// No JSX da etapa correspondente
<input
  type="text"
  value={dadosPessoais.novoCampo}
  onChange={(e) =>
    setDadosPessoais({
      ...dadosPessoais,
      novoCampo: e.target.value,
    })
  }
  className="..."
/>;
```

### Adicionar Nova Etapa

```typescript
// 1. Adicionar no array de etapas
const etapas = [
  // ... etapas existentes
  { numero: 6, titulo: "Nova Etapa", icone: IconeDesejado },
];

// 2. Adicionar renderização condicional
{
  etapaAtual === 6 && (
    <div className="space-y-6">{/* Conteúdo da nova etapa */}</div>
  );
}
```

## 📊 Dados Mock

O componente usa dados mock para:

- **Facções:** Lista de grupos criminosos
- **Bairros:** Lista de bairros por cidade
- **Catálogo de Tatuagens:** Símbolos e significados

### Substituir por Dados Reais

```typescript
// Substituir useState por chamadas à API
const [faccoes, setFaccoes] = useState([]);

useEffect(() => {
  async function carregarFaccoes() {
    const response = await fetch("/api/faccoes");
    const data = await response.json();
    setFaccoes(data);
  }
  carregarFaccoes();
}, []);
```

## ✅ Validações Implementadas

- Nome completo obrigatório
- Alertas ao tentar salvar sem preencher campos obrigatórios
- Confirmação ao cancelar (evitar perda de dados)

## 🔜 Melhorias Futuras

- [ ] Validação avançada (CPF, datas, etc)
- [ ] Salvar rascunho automaticamente
- [ ] Preview antes de salvar
- [ ] Edição de adolescente existente
- [ ] Upload múltiplo de fotos de tatuagens
- [ ] Integração com webcam para foto
- [ ] Busca de CEP automática (endereço)
- [ ] Histórico de alterações

## 🎯 Fluxo Completo

```
[Entrar na página]
    ↓
[Etapa 1: Dados Pessoais]
    ↓ (Próxima)
[Etapa 2: Ato Infracional]
    ↓ (Próxima)
[Etapa 3: Vinculações]
    ↓ (Próxima)
[Etapa 4: Tatuagens]
    ↓ (Próxima)
[Etapa 5: Alertas]
    ↓ (Salvar)
[Validação]
    ↓ (API)
[Cadastro salvo]
    ↓
[Redirecionar para dossiê]
```

## 🐛 Troubleshooting

**Foto não aparece:**

- Verificar se input aceita `image/*`
- Verificar FileReader callback

**Etapas não avançam:**

- Verificar estado `etapaAtual`
- Verificar condicionais no render

**Salvamento falha:**

- Verificar console do navegador
- Verificar chamada à API
- Verificar formato dos dados

## 📦 Arquivos Criados

1. **cadastro-adolescente.tsx** - Componente principal
2. **page-cadastro-adolescente.tsx** - Página que usa o componente
3. **README-CADASTRO.md** - Esta documentação

---

## 🎉 Status: PRONTO PARA USO

**Próximo passo sugerido:**

- Integrar com API backend
- Ou desenvolver **Listagem/Busca de Adolescentes**
- Ou criar **Dossiê Completo (visualização)**

**Local dos arquivos:**

- Component: `components/cadastro/cadastro-adolescente.tsx`
- Page: `app/(dashboard)/adolescentes/novo/page.tsx`
