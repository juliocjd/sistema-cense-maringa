# 🎨 Gestão de Tatuagens
## Documentação Técnica

**Módulo:** Catálogo de Tatuagens e Simbologias
**Status:** ✅ Implementado (Frontend + Backend)
**Versão:** 1.0

---

## 📋 Visão Geral

O Sistema de Gestão de Tatuagens mantém um catálogo centralizado de tatuagens, símbolos e suas simbologias associadas ao contexto criminal e faccional. Permite classificação por nível de risco e rastreamento de uso entre adolescentes.

## 🎯 Funcionalidades

### ✅ Implementadas

#### CRUD Completo
- ✅ Cadastro de tatuagens e símbolos
- ✅ Edição de informações
- ✅ Exclusão de registros
- ✅ Visualização detalhada

#### Gestão de Informações
- 🏷️ Nome/descrição do símbolo
- 📝 Significado associado
- ⚠️ Nível de risco (ALTO/MÉDIO/BAIXO)
- 📊 Contagem automática de uso
- 🔍 Busca e filtros avançados

#### Inteligência
- 🧠 Base de conhecimento de simbologias criminais
- 📈 Estatísticas de prevalência
- 🔗 Vinculação com adolescentes
- ⚠️ Alertas baseados em tatuagens de alto risco

## 🗄️ Estrutura de Dados

### Modelo Tatuagem

```typescript
interface Tatuagem {
  id: string;
  nomeSimbolo: string;                    // Ex: "Estrela de 5 pontas"
  significadoAssociado: string | null;    // Ex: "Símbolo do PCC"
  nivelRisco: "ALTO" | "MEDIO" | "BAIXO" | null;

  // Estatísticas
  totalUso?: number;                      // Quantos adolescentes têm

  // Auditoria
  criadoEm: Date;
  atualizadoEm: Date;
}
```

### Relação com Adolescentes

```typescript
// Tabela de vinculação: AdolescenteTatuagem
interface AdolescenteTatuagem {
  id: string;
  adolescenteId: string;
  tatuagemId: string;
  localizacao?: string;      // Ex: "Braço direito"
  tamanho?: string;          // Ex: "Pequeno", "Médio", "Grande"
  descricaoAdicional?: string;
  observacoes?: string;
}
```

## 🔌 API Endpoints

### GET `/api/tatuagens`

Lista tatuagens com filtros.

**Query Parameters:**
```typescript
{
  busca?: string;                        // Busca em nome e significado
  nivelRisco?: "ALTO" | "MEDIO" | "BAIXO";
  incluirTotal?: boolean;                // Incluir contagem de uso
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
{
  tatuagens: Tatuagem[];
  total: number;
}
```

### POST `/api/tatuagens`

Cria nova tatuagem no catálogo.

**Body:**
```typescript
{
  nomeSimbolo: string;                   // obrigatório, mín 2 chars
  significadoAssociado?: string;
  nivelRisco?: "ALTO" | "MEDIO" | "BAIXO";
}
```

**Response:**
```typescript
{
  tatuagem: Tatuagem;
  mensagem: "Tatuagem cadastrada com sucesso"
}
```

### GET `/api/tatuagens/[id]`

Busca tatuagem específica.

**Response:**
```typescript
{
  tatuagem: Tatuagem & {
    adolescentes: Array<{
      id: string;
      nomeCompleto: string;
      numeroInterno: number;
      localizacao: string;
      tamanho: string;
    }>;
  };
}
```

### PUT `/api/tatuagens/[id]`

Atualiza tatuagem existente.

**Body:** (campos opcionais)
```typescript
{
  nomeSimbolo?: string;
  significadoAssociado?: string;
  nivelRisco?: "ALTO" | "MEDIO" | "BAIXO" | null;
}
```

### DELETE `/api/tatuagens/[id]`

Remove tatuagem do catálogo.

**Validações:**
- ⚠️ Verifica se está em uso por adolescentes
- ⚠️ Requer confirmação se houver vínculos

**Response:**
```typescript
{
  mensagem: "Tatuagem removida com sucesso"
}
```

## 🎨 Interface

### Página `/tatuagens`

**Layout:**
```
┌─────────────────────────────────────────┐
│  🎨 Catálogo de Tatuagens               │
│  [+ Nova Tatuagem]                      │
├─────────────────────────────────────────┤
│  🔍 Busca: [____________]  [🔴][🟡][🟢]│
├─────────────────────────────────────────┤
│  📋 Tatuagens Cadastradas               │
│  ┌────────────────────────────────┐    │
│  │ 🔴 Estrela de 5 pontas (ALTO)  │    │
│  │ Símbolo do PCC                 │    │
│  │ Usado por: 5 adolescentes      │    │
│  │ [Editar] [Excluir] [Ver mais]  │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │ 🟡 Número 13 (MÉDIO)           │    │
│  │ Pode indicar vínculos          │    │
│  │ Usado por: 2 adolescentes      │    │
│  │ [Editar] [Excluir] [Ver mais]  │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Componentes:**
- `ModalCriarTatuagem` - Modal de criação
- `ModalEditarTatuagem` - Modal de edição
- Cards com informações resumidas
- Badges de nível de risco coloridos

## 📚 Catálogo de Tatuagens Comuns

### 🔴 Nível ALTO

| Símbolo | Significado | Observações |
|---------|-------------|-------------|
| **Estrela de 5 pontas** | PCC - Primeiro Comando da Capital | Cada ponta representa um lema |
| **155.16** | Código do PCC no sistema penal | Referência ao artigo do código penal |
| **Palhaço** | CV - Comando Vermelho | Símbolo tradicional da facção |
| **Torre de igreja** | Comando Vermelho | Representa domínio territorial |
| **PMMR** | Puro Movimento Mano Rubro | Facção paranaense |

### 🟡 Nível MÉDIO

| Símbolo | Significado | Observações |
|---------|-------------|-------------|
| **Número 13** | Marijuana/vínculos com tráfico | Pode indicar envolvimento |
| **Arma de fogo** | Envolvimento com violência | Contextual |
| **Cifrão ($)** | Envolvimento com tráfico | Muito comum |
| **Coroa** | Liderança ou aspiração | Contextual |

### 🟢 Nível BAIXO

| Símbolo | Significado | Observações |
|---------|-------------|-------------|
| **Nome de familiar** | Homenagem | Sem conotação criminal |
| **Símbolos religiosos** | Fé, proteção | Geralmente neutros |
| **Data de nascimento** | Autobiográfico | Sem significado criminal |

## 🔒 Segurança

- ✅ Apenas operadores autenticados podem acessar
- ✅ Histórico de edições registrado
- ✅ Exclusão com validação de vínculos
- ✅ Log de auditoria completo

## 🧠 Inteligência e Análise

### Análise de Risco Automática

O sistema pode detectar automaticamente combinações perigosas:

```typescript
// Exemplo de análise
const analiseTatuagens = (adolescente: Adolescente) => {
  const tatuagensAltoRisco = adolescente.tatuagens.filter(
    t => t.nivelRisco === "ALTO"
  );

  if (tatuagensAltoRisco.length > 0) {
    return {
      nivel: "ALTO",
      mensagem: "Adolescente possui tatuagens de facção",
      tatuagens: tatuagensAltoRisco.map(t => t.nomeSimbolo)
    };
  }

  return { nivel: "BAIXO", mensagem: "Sem tatuagens de risco" };
};
```

### Relatórios Disponíveis

- 📊 Tatuagens mais prevalentes
- 📈 Distribuição por nível de risco
- 🗺️ Mapeamento de facções por tatuagens
- ⚠️ Adolescentes com múltiplas tatuagens de alto risco

## 🔗 Integração

### Com Dossiê de Adolescentes

As tatuagens aparecem na aba "Dados Básicos" do dossiê:

```
┌─────────────────────────────────┐
│ 🎨 Tatuagens                    │
│ ┌─────────────────────────┐   │
│ │ 🔴 Estrela de 5 pontas  │   │
│ │ Braço direito - Média   │   │
│ │ Símbolo do PCC          │   │
│ └─────────────────────────┘   │
│ [+ Adicionar tatuagem]         │
└─────────────────────────────────┘
```

### Com Sistema de Conflitos

Tatuagens de facções rivais são consideradas na análise de risco de alocação.

### Com Relatórios

Estatísticas de tatuagens aparecem nos relatórios de inteligência.

## 📊 Casos de Uso

### Caso 1: Identificação de Vínculo Faccional

**Cenário:** Novo adolescente internado com tatuagem não identificada.

**Fluxo:**
1. Operador acessa dossiê do adolescente
2. Clica em "Adicionar tatuagem"
3. Busca no catálogo: "Estrela 5 pontas"
4. Sistema mostra: "🔴 ALTO RISCO - PCC"
5. Operador vincula ao adolescente
6. Sistema ajusta automaticamente o perfil de risco

### Caso 2: Atualização de Base de Conhecimento

**Cenário:** Equipe de inteligência identifica novo símbolo.

**Fluxo:**
1. Operador acessa `/tatuagens`
2. Clica em "+ Nova Tatuagem"
3. Cadastra:
   - Nome: "Dragão vermelho"
   - Significado: "Novo símbolo do CV"
   - Nível: ALTO
4. Sistema salva e disponibiliza para todos

### Caso 3: Análise de Prevalência

**Cenário:** Gestão quer saber quais facções são mais presentes.

**Fluxo:**
1. Acessa página de tatuagens
2. Filtra por "Nível ALTO"
3. Visualiza contador de uso
4. Identifica: "Estrela 5 pontas: 12 adolescentes"
5. Gera relatório com a informação

## 🚀 Próximas Melhorias

- [ ] Upload de fotos de tatuagens
- [ ] Reconhecimento automático via IA
- [ ] Mapa de calor de localização corporal
- [ ] Integração com banco de dados estadual
- [ ] Histórico de evolução de simbologias
- [ ] Alerta automático em novos cadastros

## 📚 Referências

- Manual de Simbologias Criminais (Polícia Federal)
- Cartilha de Identificação de Facções (SESP-PR)
- Base de dados nacional de tatuagens (em construção)

---

**Documentação atualizada em:** Novembro 2025
**Responsável:** Equipe de Desenvolvimento + Equipe de Inteligência
