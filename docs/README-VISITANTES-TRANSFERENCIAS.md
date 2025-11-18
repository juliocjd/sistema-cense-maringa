# 👨‍👩‍👧 Visitantes e 🚚 Transferências
## Documentação Técnica - APIs Implementadas

**Módulos:** Sistema de Visitantes + Transferências Judiciais
**Status:** ⚠️ Backend Completo | Frontend Pendente
**Versão:** 1.0 (APIs)

---

# 👨‍👩‍👧 Sistema de Visitantes

## 📋 Visão Geral

Sistema completo para gestão de visitantes, controle de autorizações e registro de visitas realizadas. As **APIs estão 100% implementadas e funcionais**, faltando apenas a interface de usuário.

## 🔌 APIs Implementadas

### GET `/api/visitantes`

Lista visitantes cadastrados.

**Query Parameters:**
```typescript
{
  busca?: string;                    // Busca em nome ou CPF
  status?: "AUTORIZADO" | "PENDENTE" | "BLOQUEADO";
  adolescenteId?: string;           // Filtrar por adolescente
  incluirVisitas?: boolean;          // Incluir histórico
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
{
  visitantes: Array<{
    id: string;
    nomeCompleto: string;
    cpf: string | null;
    dataNascimento: Date | null;
    telefones: string[];
    endereco: string | null;
    vinculos: Array<{
      adolescente: {
        id: string;
        nomeCompleto: string;
        numeroInterno: number;
      };
      parentesco: string;
      autorizado: boolean;
      observacoes: string | null;
    }>;
    visitas?: Array<{
      id: string;
      dataHora: Date;
      duracao: number;
      observacoes: string;
    }>;
  }>;
  total: number;
}
```

### POST `/api/visitantes`

Cadastra novo visitante.

**Body:**
```typescript
{
  nomeCompleto: string;              // obrigatório, mín 3 chars
  cpf?: string | null;               // validado se fornecido
  dataNascimento?: string | null;    // formato ISO
  telefones?: string[];              // array de telefones
  endereco?: string | null;
  vinculos: Array<{
    adolescenteId: string;           // obrigatório
    parentesco?: string;              // Ex: "Mãe", "Pai", "Avó"
    autorizado?: boolean;             // default: false
    observacoes?: string;
  }>;
}
```

**Validações:**
- Nome completo obrigatório
- CPF validado (se fornecido)
- Pelo menos 1 vínculo com adolescente
- Adolescente deve existir

### GET `/api/visitantes/[id]`

Detalhes completos do visitante.

**Response:**
```typescript
{
  visitante: {
    id: string;
    nomeCompleto: string;
    cpf: string | null;
    dataNascimento: Date | null;
    telefones: string[];
    endereco: string | null;

    vinculos: Array<{
      id: string;
      adolescente: {
        id: string;
        nomeCompleto: string;
        numeroInterno: number;
        statusUnidade: string;
      };
      parentesco: string;
      autorizado: boolean;
      observacoes: string | null;
    }>;

    visitas: Array<{
      id: string;
      adolescente: {
        nomeCompleto: string;
      };
      dataHora: Date;
      duracao: number;
      local: string;
      observacoes: string;
      operador: {
        nomeCompleto: string;
      };
    }>;

    estatisticas: {
      totalVisitas: number;
      ultimaVisita: Date | null;
      adolescentesVinculados: number;
    };
  };
}
```

### PUT `/api/visitantes/[id]`

Atualiza dados do visitante.

**Body:** (todos opcionais)
```typescript
{
  nomeCompleto?: string;
  cpf?: string | null;
  dataNascimento?: string | null;
  telefones?: string[];
  endereco?: string | null;
}
```

### DELETE `/api/visitantes/[id]`

Remove visitante.

**Validações:**
- Verifica se tem visitas registradas
- Requer confirmação se houver histórico

### POST `/api/visitantes/[id]/visitas`

Registra nova visita realizada.

**Body:**
```typescript
{
  adolescenteId: string;             // obrigatório
  dataHora: string;                  // ISO format
  duracao: number;                   // em minutos
  local?: string;                    // Ex: "Sala de visitas"
  observacoes?: string;
}
```

**Validações:**
- Visitante deve estar autorizado para o adolescente
- Data/hora não pode ser futura
- Duração entre 15 e 240 minutos

### GET `/api/visitantes/[id]/visitas`

Lista visitas do visitante.

**Query Parameters:**
```typescript
{
  dataInicio?: string;
  dataFim?: string;
  adolescenteId?: string;
  limit?: number;
  offset?: number;
}
```

### GET `/api/visitantes/[id]/visitas/[visitaId]`

Detalhes de visita específica.

### PUT `/api/visitantes/[id]/visitas/[visitaId]`

Atualiza dados da visita.

### DELETE `/api/visitantes/[id]/visitas/[visitaId]`

Remove registro de visita.

---

# 🚚 Sistema de Transferências Judiciais

## 📋 Visão Geral

Sistema para gerenciar solicitações de transferência de adolescentes entre unidades socioeducativas. **Backend 100% funcional**, aguardando interface.

## 🔌 APIs Implementadas

### GET `/api/transferencias`

Lista solicitações de transferência.

**Query Parameters:**
```typescript
{
  status?: "PENDENTE" | "APROVADA" | "REJEITADA" | "CONCLUIDA" | "CANCELADA";
  adolescenteId?: string;
  dataInicio?: string;
  dataFim?: string;
  solicitanteId?: string;
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
{
  transferencias: Array<{
    id: string;
    adolescente: {
      id: string;
      nomeCompleto: string;
      numeroInterno: number;
    };
    motivoPrincipal: string;
    status: string;
    unidadesSugeridas: string[];
    unidadeDestinoDefinida: string | null;
    observacoesAdicionais: string | null;
    relatorioGeradoPath: string | null;

    solicitante: {
      nomeCompleto: string;
    };

    dataSolicitacao: Date;
    dataAprovacao: Date | null;
    dataRejeicao: Date | null;
    dataConclusao: Date | null;
  }>;
  total: number;
}
```

### POST `/api/transferencias`

Cria solicitação de transferência.

**Body:**
```typescript
{
  adolescenteId: string;             // obrigatório
  motivoPrincipal: string;           // obrigatório, mín 5 chars
  unidadesSugeridas: string[];       // array, mín 1 unidade
  observacoesAdicionais?: string;
  relatorioGeradoPath?: string;      // caminho do relatório técnico
}
```

**Validações:**
- Adolescente deve estar internado
- Motivo deve ser descritivo (mín 5 caracteres)
- Pelo menos 1 unidade sugerida
- Operador deve estar autenticado

**Resposta:**
```typescript
{
  transferencia: Transferencia;
  mensagem: "Solicitação de transferência criada com sucesso";
}
```

### GET `/api/transferencias/[id]`

Detalhes completos da solicitação.

**Response:**
```typescript
{
  transferencia: {
    id: string;

    adolescente: {
      id: string;
      nomeCompleto: string;
      numeroInterno: number;
      dataInternacao: Date;
      atoInfracional: string;
      alojamentoAtual: {
        casa: { nome: string };
        numeroAlojamento: number;
      };
    };

    motivoPrincipal: string;
    unidadesSugeridas: string[];
    unidadeDestinoDefinida: string | null;
    observacoesAdicionais: string | null;
    relatorioGeradoPath: string | null;

    status: string;
    dataSolicitacao: Date;
    dataAprovacao: Date | null;
    dataRejeicao: Date | null;
    dataConclusao: Date | null;
    motivoRejeicao: string | null;

    solicitante: {
      id: string;
      nomeCompleto: string;
      funcaoRole: string;
    };

    aprovador: {
      id: string;
      nomeCompleto: string;
    } | null;

    historicoTransferencia: Array<{
      id: string;
      statusAnterior: string;
      statusNovo: string;
      observacoes: string;
      dataAlteracao: Date;
      operador: {
        nomeCompleto: string;
      };
    }>;
  };
}
```

### PUT `/api/transferencias/[id]`

Atualiza solicitação (aprovar, rejeitar, definir destino, etc).

**Body:**
```typescript
{
  status?: "APROVADA" | "REJEITADA" | "CONCLUIDA" | "CANCELADA";
  unidadeDestinoDefinida?: string;
  motivoRejeicao?: string;           // obrigatório se REJEITADA
  observacoesAdicionais?: string;
}
```

**Validações:**
- Status APROVADA requer aprovador autenticado
- Status REJEITADA requer motivoRejeicao
- Status CONCLUIDA requer unidadeDestinoDefinida
- Histórico é gerado automaticamente

**Response:**
```typescript
{
  transferencia: Transferencia;
  mensagem: "Transferência atualizada com sucesso";
}
```

### DELETE `/api/transferencias/[id]`

Cancela solicitação de transferência.

**Validações:**
- Apenas solicitações PENDENTES podem ser canceladas
- Apenas solicitante ou admin pode cancelar

---

## 📊 Status das Transferências

| Status | Descrição | Ações Permitidas |
|--------|-----------|------------------|
| **PENDENTE** | Aguardando análise | Aprovar, Rejeitar, Cancelar, Editar |
| **APROVADA** | Aprovada, aguardando transferência | Definir destino, Concluir |
| **REJEITADA** | Negada pela gestão | Visualizar apenas |
| **CONCLUIDA** | Transferência realizada | Visualizar apenas |
| **CANCELADA** | Cancelada pelo solicitante | Visualizar apenas |

## 🔗 Integração com Dossiê

No dossiê do adolescente, aba "Auditoria":

```
┌─────────────────────────────────────┐
│ 🚚 Transferências                   │
│ ┌─────────────────────────────┐   │
│ │ ⏳ PENDENTE                  │   │
│ │ Solicitada em 15/11/2025    │   │
│ │ Motivo: Risco de conflito   │   │
│ │ Destino sugerido: CENSE Foz │   │
│ └─────────────────────────────┘   │
│ ┌─────────────────────────────┐   │
│ │ ✅ CONCLUÍDA                │   │
│ │ Transferido em 01/10/2025   │   │
│ │ Destino: CENSE Cascavel     │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 🎨 Interfaces Pendentes

### Página `/visitantes` (A Criar)

```
┌─────────────────────────────────────────┐
│  👨‍👩‍👧 Visitantes                       │
│  [+ Novo Visitante]                     │
├─────────────────────────────────────────┤
│  🔍 Busca: [__________]  [Filtros▼]    │
├─────────────────────────────────────────┤
│  📋 Visitantes Cadastrados              │
│  ┌────────────────────────────────┐    │
│  │ 👤 Maria Silva Santos          │    │
│  │ CPF: 123.456.789-00            │    │
│  │ Mãe de João (123)              │    │
│  │ ✅ Autorizada                  │    │
│  │ Última visita: 10/11/2025      │    │
│  │ [Ver detalhes] [Editar]        │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Página `/transferencias` (A Criar)

```
┌─────────────────────────────────────────┐
│  🚚 Transferências Judiciais            │
│  [+ Nova Solicitação]                   │
├─────────────────────────────────────────┤
│  📊 Status: [Todas▼] [Filtros▼]        │
├─────────────────────────────────────────┤
│  📋 Solicitações                        │
│  ┌────────────────────────────────┐    │
│  │ ⏳ PENDENTE                     │    │
│  │ João da Silva (123)            │    │
│  │ Solicitado: 15/11/2025         │    │
│  │ Motivo: Risco de conflito      │    │
│  │ Destino: CENSE Foz             │    │
│  │ [Ver] [Aprovar] [Rejeitar]     │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## 🚀 Próximos Passos

### Visitantes - Frontend
- [ ] Tela de listagem com filtros
- [ ] Formulário de cadastro
- [ ] Tela de detalhes do visitante
- [ ] Registro de visita realizada
- [ ] Controle de autorizações
- [ ] Histórico de visitas

### Transferências - Frontend
- [ ] Dashboard de transferências
- [ ] Formulário de solicitação
- [ ] Workflow de aprovação
- [ ] Visualização de histórico
- [ ] Geração de relatórios
- [ ] Notificações de mudança de status

## 📚 Referências

- SINASE - Diretrizes para transferências
- Resolução CONANDA nº 119/2006
- Estatuto da Criança e do Adolescente (ECA) - Art. 49

---

**Documentação atualizada em:** Novembro 2025
**Responsável:** Equipe de Desenvolvimento
**Status:** ⚠️ APIs prontas, aguardando desenvolvimento do frontend
