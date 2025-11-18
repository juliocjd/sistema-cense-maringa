# 🔔 Sistema de Alertas
## Documentação Técnica

**Módulo:** Gestão de Alertas
**Status:** ✅ Implementado (Frontend + Backend)
**Versão:** 1.0

---

## 📋 Visão Geral

O Sistema de Alertas permite o cadastro, gerenciamento e monitoramento de alertas personalizados para adolescentes e situações específicas na unidade. Funciona como um sistema de notificações e lembretes para operadores.

## 🎯 Funcionalidades

### ✅ Implementadas

#### CRUD Completo
- ✅ Criação de alertas personalizados
- ✅ Edição de alertas existentes
- ✅ Visualização detalhada
- ✅ Exclusão de alertas
- ✅ Ativação/Desativação

#### Filtros e Buscas
- 🎛️ Filtro por **status** (ATIVO/DESATIVADO/TODOS)
- 🏷️ Filtro por **tipo** de alerta
- ⚠️ Filtro por **nível** de prioridade
- 🏠 Filtro por **casa**
- 🔍 Busca por texto livre

#### Dashboard de Alertas
- 📊 Total de alertas ativos
- 📈 Estatísticas por nível
- 📊 Estatísticas por tipo
- 🔔 Notificações em tempo real

## 🗄️ Estrutura de Dados

### Modelo AlertaAtivo

```typescript
interface AlertaAtivo {
  id: string;
  titulo: string;
  descricao?: string;
  tipo: string;           // Ex: "MEDICACAO", "COMPORTAMENTO", "AUDIENCIA"
  nivel: "ALTO" | "MEDIO" | "BAIXO";
  status: "ATIVO" | "DESATIVADO";

  // Vinculação
  adolescenteId?: string;
  adolescente?: {
    nomeCompleto: string;
    numeroInterno: number;
  };

  casaId?: string;
  casa?: {
    nome: string;
    numero: number;
  };

  // Auditoria
  criadoEm: Date;
  atualizadoEm: Date;
  operadorId: string;
}
```

## 🔌 API Endpoints

### GET `/api/alertas`

Lista alertas com filtros.

**Query Parameters:**
```typescript
{
  status?: "ATIVO" | "DESATIVADO" | "TODOS";
  tipo?: string;
  nivel?: "ALTO" | "MEDIO" | "BAIXO";
  casaId?: string;
  busca?: string;
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
{
  alertas: AlertaAtivo[];
  total: number;
  estatisticas: {
    totalAtivos: number;
    porNivel: Record<string, number>;
    porTipo: Record<string, number>;
  };
}
```

### POST `/api/alertas`

Cria novo alerta.

**Body:**
```typescript
{
  titulo: string;                    // obrigatório
  descricao?: string;
  tipo: string;                      // obrigatório
  nivel: "ALTO" | "MEDIO" | "BAIXO"; // obrigatório
  adolescenteId?: string;
  casaId?: string;
}
```

### GET `/api/alertas/[id]`

Busca alerta específico.

**Response:**
```typescript
{
  alerta: AlertaAtivo;
}
```

### PUT `/api/alertas/[id]`

Atualiza alerta existente.

**Body:** (campos opcionais)
```typescript
{
  titulo?: string;
  descricao?: string;
  tipo?: string;
  nivel?: "ALTO" | "MEDIO" | "BAIXO";
  status?: "ATIVO" | "DESATIVADO";
}
```

### DELETE `/api/alertas/[id]`

Remove alerta.

**Response:**
```typescript
{
  mensagem: "Alerta removido com sucesso"
}
```

## 🎨 Interface

### Página `/alertas`

**Componentes:**
- `CardAlerta` - Card individual de alerta
- `ModalNovoAlerta` - Modal de criação/edição
- Filtros de busca
- Estatísticas no topo

**Layout:**
```
┌─────────────────────────────────────────┐
│  📊 Estatísticas                        │
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │ 12   │ │  5   │ │  3   │           │
│  │Ativos│ │Altos │ │Médios│           │
│  └──────┘ └──────┘ └──────┘           │
├─────────────────────────────────────────┤
│  🔍 Filtros                             │
│  [Status▼] [Tipo▼] [Nível▼] [Casa▼]  │
├─────────────────────────────────────────┤
│  📋 Lista de Alertas                    │
│  ┌────────────────────────────────┐   │
│  │ 🔴 ALTO - Medicação urgente    │   │
│  │ João Silva - Casa 03           │   │
│  └────────────────────────────────┘   │
│  ┌────────────────────────────────┐   │
│  │ 🟡 MÉDIO - Audiência amanhã    │   │
│  │ Pedro Santos - Casa 05         │   │
│  └────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 📊 Tipos de Alertas Comuns

| Tipo | Descrição | Nível Típico |
|------|-----------|--------------|
| `MEDICACAO` | Horário de medicação | ALTO |
| `AUDIENCIA` | Audiência judicial próxima | MÉDIO |
| `COMPORTAMENTO` | Comportamento atípico | VARIÁVEL |
| `SAUDE` | Questões de saúde | ALTO |
| `FAMILIAR` | Visita familiar agendada | BAIXO |
| `ANIVERSARIO` | Aniversário do adolescente | BAIXO |
| `TRANSFERENCIA` | Transferência pendente | MÉDIO |

## 🔒 Segurança

- ✅ Autenticação via JWT obrigatória
- ✅ Apenas operador que criou pode editar/excluir
- ✅ Admins podem editar todos
- ✅ Log de auditoria em todas as operações

## 🎯 Casos de Uso

### Caso 1: Alerta de Medicação

**Cenário:** Adolescente precisa tomar medicação às 14h.

**Fluxo:**
1. Operador acessa `/alertas`
2. Clica em "Novo Alerta"
3. Preenche:
   - Título: "Medicação - Antidepressivo"
   - Tipo: "MEDICACAO"
   - Nível: "ALTO"
   - Adolescente: João Silva
4. Sistema salva e exibe na lista
5. Operadores visualizam no dashboard

### Caso 2: Alerta de Audiência

**Cenário:** Adolescente tem audiência judicial amanhã.

**Fluxo:**
1. Operador cria alerta tipo "AUDIENCIA"
2. Define nível MÉDIO
3. Adiciona descrição com horário e local
4. Sistema notifica operadores do plantão

## 📈 Métricas

O sistema coleta automaticamente:
- Total de alertas ativos
- Distribuição por nível
- Distribuição por tipo
- Alertas por casa
- Taxa de resolução

## 🔄 Integração

### Com Adolescentes
Alertas podem ser vinculados a adolescentes específicos e aparecem no dossiê.

### Com Dashboard
Estatísticas de alertas aparecem no dashboard principal.

### Com Notificações
Alertas de nível ALTO disparam notificações automáticas.

## 🚀 Próximas Melhorias

- [ ] Alertas recorrentes (diários, semanais)
- [ ] Notificações push
- [ ] Integração com calendário
- [ ] Alertas automáticos baseados em eventos
- [ ] Exportação de relatórios de alertas

---

**Documentação atualizada em:** Novembro 2025
**Responsável:** Equipe de Desenvolvimento
