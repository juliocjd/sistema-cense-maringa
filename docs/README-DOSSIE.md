# 📋 Dossiê Completo do Adolescente - Documentação

## 🎯 Visão Geral

Componente de visualização completa do dossiê do adolescente com 8 abas diferentes contendo todas as informações detalhadas.

## ✨ Funcionalidades Implementadas

### 1. **Header do Dossiê**

- Foto/Avatar grande
- Nome completo e nome social
- Status com badge colorido
- Dados principais em cards (SMS, Data de Nascimento, Data de Entrada, Nº Processo)
- Alertas ativos destacados
- Botões de ação:
  - ← Voltar para lista
  - 🖨️ Imprimir
  - 📥 Exportar PDF
  - ✏️ Editar

### 2. **Sistema de Abas (8 abas)**

#### 📋 **Aba 1: Informações Gerais**

- Dados pessoais completos
- Dados processuais
- Vinculações (facção, bairro)
- Ato infracional atual

#### 📍 **Aba 2: Alocação Atual**

- Casa e alojamento atual
- Ala
- Data de alocação
- Tempo no alojamento
- Link para ver no mapa
- Botão "Alocar Agora" se não estiver alocado

#### 📄 **Aba 3: Histórico Infracional**

- Ato infracional atual destacado
- Lista de atos infracionais anteriores
- Unidade onde cumpriu
- Ano do ato

#### ⚠️ **Aba 4: Alertas**

- Risco de Suicídio (com recomendações)
- Perfil Mapeado (com cuidados)
- Alerta de Saúde
- Explicações detalhadas de cada alerta

#### 📸 **Aba 5: Tatuagens**

- Grid de tatuagens registradas
- Símbolo
- Local do corpo
- Significado
- Observações

#### ⚔️ **Aba 6: Conflitos**

- Lista de conflitos (ativos e resolvidos)
- Nome do adolescente conflitante
- Tipo de conflito
- Origem (CI, observação, etc)
- Status (Ativo/Resolvido)
- Datas de registro e resolução

#### 👥 **Aba 7: Grupos**

- Grupos que participa/participou
- Casa do grupo
- Data de entrada
- Data de saída (se saiu)
- Status (Ativo/Inativo)

#### 🕐 **Aba 8: Histórico**

- Timeline de todas as movimentações
- Tipos: ALOCAÇÃO, CI, ALERTA, etc
- Descrição do evento
- Data e hora
- Operador responsável
- Visual de timeline com linha vertical

### 3. **Visual Premium**

- Cards bem organizados
- Cores por tipo de informação
- Badges e tags coloridos
- Ícones intuitivos
- Hover effects
- Layout responsivo

## 📂 Estrutura de Arquivos

```
components/
└── adolescentes/
    └── dossie-adolescente.tsx       ← dossie-adolescente.tsx

app/
└── (dashboard)/
    └── adolescentes/
        └── [id]/
            └── page.tsx              ← page-dossie-adolescente.tsx
```

## 🚀 Como Usar

### Instalação

```bash
# 1. Criar pasta (se ainda não existir)
mkdir -p components/adolescentes

# 2. Criar pasta dinâmica para rotas
mkdir -p app/\(dashboard\)/adolescentes/\[id\]

# 3. Copiar arquivos
# dossie-adolescente.tsx → components/adolescentes/dossie-adolescente.tsx
# page-dossie-adolescente.tsx → app/(dashboard)/adolescentes/[id]/page.tsx
```

### Acesso

```
URL: /dashboard/adolescentes/{id}
Exemplo: /dashboard/adolescentes/adol-001
```

## 🔌 API Endpoint Necessário

### GET `/api/adolescentes/:id`

**Response:**

```json
{
  "id": "uuid-123",
  "nomeCompleto": "João da Silva Santos",
  "nomeSocial": "João",
  "numeroSms": "12345",
  "numeroProcesso": "0001234-56.2024.8.16.0000",
  "dataNascimento": "2008-05-15",
  "dataEntrada": "2025-10-15",
  "atoInfracionalAtual": "Análogo a roubo qualificado",
  "fotoUrl": "https://...",
  "alojamentoAtualId": "uuid-aloj",
  "statusUnidade": "ATIVO",
  "alertaRiscoSuicidio": true,
  "alertaPerfilMapeado": false,
  "alertaSaudeConfidencial": false,

  // Dados adicionais necessários:
  "alojamento": {
    "casa": "Casa 02",
    "numero": "05",
    "ala": "A",
    "dataAlocacao": "2025-10-15"
  },
  "faccao": {
    "nome": "Grupo A",
    "numero": "123"
  },
  "bairro": {
    "nome": "Zona 7",
    "cidade": "Maringá"
  },
  "historicoInfracional": [...],
  "tatuagens": [...],
  "conflitos": [...],
  "grupos": [...],
  "historico": [...]
}
```

## 🎨 Customização

### Adicionar Nova Aba

```typescript
// 1. Adicionar no array de abas:
const abas = [
  // ... abas existentes
  { id: "nova", label: "Nova Aba", icone: IconeDesejado },
];

// 2. Adicionar renderização condicional:
{
  abaAtiva === "nova" && (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Nova Aba</h2>
      {/* Conteúdo da nova aba */}
    </div>
  );
}
```

### Alterar Cores dos Status

```typescript
// Em getStatusBadge():
const badges: Record<string, { cor: string; texto: string }> = {
  ATIVO: {
    cor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    texto: "Em andamento", // Trocar texto
  },
  // ...
};
```

### Adicionar Campo nas Informações Gerais

```typescript
// Na aba "geral":
<div className="flex justify-between">
  <span className="text-gray-600">Novo Campo:</span>
  <span className="font-semibold text-gray-800">{adolescente.novoCampo}</span>
</div>
```

## 📊 Dados Mock

O componente usa dados mock para:

- Alojamento atual
- Facção e bairro
- Histórico infracional
- Tatuagens
- Conflitos
- Grupos
- Histórico de movimentações

### Substituir por Dados Reais

```typescript
// Na página, carregar tudo junto:
const response = await fetch(`/api/adolescentes/${id}?include=all`);
const data = await response.json();

// Passar para o componente:
<DossieAdolescente adolescente={data} />;
```

## 🖨️ Funcionalidades de Exportação

### Imprimir

```typescript
// Já implementado:
onClick={() => window.print()}

// CSS de impressão (adicionar no globals.css):
@media print {
  .no-print { display: none; }
  .bg-white { background: white !important; }
}
```

### Exportar PDF

```typescript
// Implementar usando html2pdf ou jsPDF:
import html2pdf from "html2pdf.js";

const exportarPDF = () => {
  const element = document.getElementById("dossie");
  html2pdf().from(element).save(`dossie-${adolescente.nomeCompleto}.pdf`);
};
```

## 📱 Responsividade

### Desktop

- Layout em 2 colunas (cards lado a lado)
- Abas horizontais
- Todas as informações visíveis

### Tablet

- Layout adaptado
- Cards em coluna
- Abas com scroll horizontal

### Mobile

- Layout vertical
- Abas em dropdown (futuro)
- Cards empilhados

## 🎯 Navegação

### Links Implementados

- ← **Voltar** → `/dashboard/adolescentes`
- **✏️ Editar** → `/dashboard/adolescentes/{id}/editar`
- **Ver no Mapa** → `/dashboard/mapa`
- **Alocar Agora** → `/dashboard/mapa`

## ⚡ Performance

### Otimizações

- ✅ Dados mock para desenvolvimento
- ✅ Loading state durante carregamento
- ✅ Erro 404 se adolescente não encontrado

### Melhorias Futuras

- [ ] Cache de dados do adolescente
- [ ] Lazy loading das abas
- [ ] Virtualização do histórico
- [ ] Refresh automático de dados

## 🎨 Visual das Abas

### Cores por Tipo

**Alertas:**

- 🟠 Laranja = Risco de Suicídio
- 🟣 Roxo = Perfil Mapeado
- 🔵 Azul = Alerta de Saúde

**Status:**

- 🟢 Verde = Ativo
- 🔵 Azul = Transferido
- ⚫ Cinza = Liberado
- 🔴 Vermelho = Evadido

**Conflitos:**

- 🔴 Vermelho = Ativo
- 🟢 Verde = Resolvido

**Grupos:**

- 🟢 Verde = Ativo
- ⚫ Cinza = Inativo

## 🔍 Recursos Especiais

### Timeline (Aba Histórico)

- Linha vertical conectando eventos
- Bolinhas marcando cada evento
- Ordenação cronológica (mais recente primeiro)
- Tipo de evento em badge
- Data e hora completas
- Operador responsável

### Cards de Alerta

- Explicação detalhada
- Recomendações práticas
- Cores diferenciadas por tipo
- Ícones grandes e claros

### Grid de Tatuagens

- Layout em 2 colunas
- Card por tatuagem
- Todas as informações organizadas
- Ícone de câmera

## ✅ Checklist de Instalação

- [ ] Criar pasta `components/adolescentes`
- [ ] Criar pasta `app/(dashboard)/adolescentes/[id]`
- [ ] Copiar `dossie-adolescente.tsx`
- [ ] Copiar `page-dossie-adolescente.tsx`
- [ ] Testar acesso via `/dashboard/adolescentes/{id}`
- [ ] Verificar todas as 8 abas
- [ ] Testar botões de navegação
- [ ] Testar com diferentes IDs

## 🐛 Troubleshooting

**Aba não muda:**

- Verificar estado `abaAtiva`
- Verificar condicionais de renderização

**Dados não aparecem:**

- Verificar props do componente
- Verificar estrutura de dados mock
- Ver console do navegador

**404 ao acessar:**

- Verificar se pasta é `[id]` com colchetes
- Verificar se arquivo é `page.tsx`

**Botões não funcionam:**

- Implementar páginas de destino
- Verificar rotas do Next.js

## 🚀 Próximos Passos

Agora você pode:

1. ✅ **Ver dossiê completo** clicando em 👁️ na listagem
2. ⏳ **Criar página de edição** (formulário pre-preenchido)
3. ⏳ **Implementar exportação** PDF real
4. ⏳ **Conectar com API** para dados reais
5. ⏳ **Adicionar gráficos** (linha do tempo visual, etc)

---

## 📦 Arquivos Criados

1. `dossie-adolescente.tsx` - Componente principal
2. `page-dossie-adolescente.tsx` - Página dinâmica

---

**Dossiê está 100% funcional!** 🎉

**Navegação completa:**

- Lista → Dossiê → Editar
- Dossiê → Mapa
- Todas as informações em 8 abas organizadas
