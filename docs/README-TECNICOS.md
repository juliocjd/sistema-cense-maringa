# 👨‍⚕️ Gestão de Técnicos de Referência
## Documentação Técnica

**Módulo:** Cadastro e Gestão de Técnicos
**Status:** ✅ Implementado (Frontend + Backend)
**Versão:** 1.0

---

## 📋 Visão Geral

O Sistema de Gestão de Técnicos de Referência centraliza as informações dos profissionais da equipe multidisciplinar (psicólogos, assistentes sociais, pedagogos, etc.) e gerencia a vinculação com adolescentes para acompanhamento personalizado.

## 🎯 Funcionalidades

### ✅ Implementadas

#### CRUD Completo
- ✅ Cadastro de técnicos
- ✅ Edição de informações
- ✅ Visualização de perfil
- ✅ Listagem ordenada

#### Gestão de Informações
- 👤 Nome completo
- 📧 E-mail (único, obrigatório)
- 📞 Telefone
- 🏷️ Atividade/especialidade
- 👥 Lista de adolescentes vinculados

#### Notificações Automáticas
- 📧 E-mail quando adolescente vinculado entra em conflito
- ⚠️ Alertas de situações que requerem intervenção
- 📊 Relatórios periódicos de acompanhamento

## 🗄️ Estrutura de Dados

### Modelo TecnicoReferencia

```typescript
interface TecnicoReferencia {
  id: string;
  nome: string;
  atividade: string | null;       // Ex: "Psicólogo", "Assistente Social"
  email: string;                   // Único, obrigatório
  telefone: string | null;

  // Relações
  adolescentesReferencia: Adolescente[];

  // Auditoria
  criadoEm: Date;
  atualizadoEm: Date;
}
```

### Vinculação com Adolescentes

```typescript
// No modelo Adolescente
interface Adolescente {
  //... outros campos
  tecnicoReferenciaId: string | null;
  tecnicoReferencia: TecnicoReferencia | null;
}
```

## 🔌 API Endpoints

### GET `/api/tecnicos`

Lista todos os técnicos cadastrados.

**Query Parameters:**
```typescript
{
  busca?: string;          // Busca em nome, email ou atividade
  atividade?: string;      // Filtro por atividade específica
  incluirAdolescentes?: boolean;  // Incluir lista de adolescentes
}
```

**Response:**
```typescript
{
  tecnicos: Array<{
    id: string;
    nome: string;
    atividade: string | null;
    email: string;
    telefone: string | null;
    totalAdolescentes?: number;
    adolescentes?: Array<{
      id: string;
      nomeCompleto: string;
      numeroInterno: number;
    }>;
  }>;
  total: number;
}
```

### POST `/api/tecnicos`

Cadastra novo técnico.

**Body:**
```typescript
{
  nome: string;            // obrigatório, mín 3 chars
  email: string;           // obrigatório, formato válido, único
  atividade?: string;      // opcional
  telefone?: string;       // opcional
}
```

**Validações:**
- E-mail deve ser único
- E-mail deve ter formato válido
- Nome mínimo de 3 caracteres

**Response:**
```typescript
{
  tecnico: TecnicoReferencia;
  mensagem: "Técnico cadastrado com sucesso"
}
```

### GET `/api/tecnicos/[id]`

Busca técnico específico com detalhes.

**Response:**
```typescript
{
  tecnico: TecnicoReferencia & {
    adolescentes: Array<{
      id: string;
      nomeCompleto: string;
      numeroInterno: number;
      statusUnidade: string;
      alojamentoAtual: {
        casa: { nome: string };
        numeroAlojamento: number;
      } | null;
    }>;
    estatisticas: {
      totalAdolescentes: number;
      totalConflitosAtivos: number;
      totalAlertasAtivos: number;
    };
  };
}
```

### PUT `/api/tecnicos/[id]`

Atualiza informações do técnico.

**Body:** (campos opcionais)
```typescript
{
  nome?: string;
  email?: string;          // Validação de unicidade
  atividade?: string;
  telefone?: string;
}
```

### DELETE `/api/tecnicos/[id]`

Remove técnico do sistema.

**Validações:**
- ⚠️ Verifica se tem adolescentes vinculados
- ⚠️ Requer reatribuição antes de excluir

## 🎨 Interface

### Página `/tecnicos`

**Layout:**
```
┌─────────────────────────────────────────┐
│  👨‍⚕️ Técnicos de Referência            │
│  Gestão de técnicos de referência      │
├─────────────────────────────────────────┤
│  📋 Técnicos cadastrados                │
│  ┌────────────────────────────────┐    │
│  │ PSICÓLOGO                      │    │
│  │ Dra. Maria Silva               │    │
│  │ maria.silva@cense.pr.gov.br    │    │
│  │ Tel: (44) 99999-9999           │    │
│  │ 5 adolescentes sob supervisão  │    │
│  └────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  ➕ Cadastrar novo técnico              │
│  Nome: [___________________]           │
│  Atividade: [______________]           │
│  E-mail: [_________________]           │
│  Telefone: [_______________]           │
│  [Salvar]                              │
└─────────────────────────────────────────┘
```

**Componentes:**
- `FormTecnico` - Formulário de cadastro/edição
- Cards de técnicos com informações resumidas
- Badges de especialidade

## 📧 Sistema de Notificações

### Notificação de Conflito

Quando um adolescente vinculado a um técnico se envolve em conflito:

**Template de E-mail:**
```
De: sistema@cense-maringa.pr.gov.br
Para: maria.silva@cense.pr.gov.br
Assunto: Alerta - Adolescente sob sua referência envolvido em conflito

Olá, Dra. Maria Silva,

O adolescente JOÃO DA SILVA (nº interno: 123), sob sua referência
técnica, foi envolvido em um conflito.

Detalhes do Conflito:
- Tipo: Conflito Físico
- Gravidade: Alta
- Data: 18/11/2025 às 14:30
- Local: Casa 03 - Convívio
- Outros envolvidos: Pedro Santos

Recomendamos avaliação e intervenção conforme protocolo.

Acesse o sistema para mais detalhes:
https://cense-maringa.pr.gov.br/conflitos/[id]

Atenciosamente,
Sistema CENSE Maringá
```

### Notificação de Alerta

Quando um alerta de nível ALTO é criado para adolescente vinculado:

**Template:**
```
De: sistema@cense-maringa.pr.gov.br
Para: maria.silva@cense.pr.gov.br
Assunto: Alerta de Nível ALTO - João da Silva

Olá, Dra. Maria Silva,

Um alerta de nível ALTO foi registrado para o adolescente
JOÃO DA SILVA (nº interno: 123), sob sua referência.

Alerta: Comportamento autodestrutivo
Descrição: [...]
Registrado por: Op. Carlos Andrade
Data: 18/11/2025 às 10:00

Acesse o sistema para mais informações.

Atenciosamente,
Sistema CENSE Maringá
```

## 🔗 Integração

### Com Dossiê de Adolescentes

Na aba "Dados Básicos" do dossiê:

```
┌─────────────────────────────────┐
│ 👨‍⚕️ Técnico de Referência      │
│ ┌─────────────────────────┐   │
│ │ Dra. Maria Silva        │   │
│ │ Psicóloga               │   │
│ │ ✉️ maria.silva@...      │   │
│ │ 📞 (44) 99999-9999      │   │
│ └─────────────────────────┘   │
│ [Alterar Técnico]              │
└─────────────────────────────────┘
```

### Com Sistema de Conflitos

- Técnico é notificado automaticamente
- Pode registrar mediações
- Acompanha histórico de conflitos

### Com Analytics

Dashboard mostra:
- Carga de trabalho por técnico
- Taxa de conflitos por técnico
- Efetividade de mediações

## 📊 Casos de Uso

### Caso 1: Cadastro de Novo Técnico

**Cenário:** Novo psicólogo contratado.

**Fluxo:**
1. Gestor acessa `/tecnicos`
2. Preenche formulário:
   - Nome: Dr. João Pereira
   - Atividade: Psicólogo
   - E-mail: joao.pereira@cense.pr.gov.br
   - Telefone: (44) 98888-8888
3. Clica em "Salvar"
4. Sistema valida e-mail único
5. Técnico é cadastrado
6. Já pode ser vinculado a adolescentes

### Caso 2: Notificação de Conflito

**Cenário:** Adolescente sob referência da Dra. Maria entra em conflito.

**Fluxo:**
1. Operador registra conflito envolvendo João
2. Sistema identifica: João tem técnico de referência
3. Sistema busca: Dra. Maria Silva
4. Sistema envia e-mail automático
5. Dra. Maria recebe notificação
6. Acessa sistema e registra intervenção

### Caso 3: Relatório de Acompanhamento

**Cenário:** Técnico quer visualizar todos seus adolescentes.

**Fluxo:**
1. Dra. Maria acessa `/tecnicos/[seu-id]`
2. Visualiza lista de 8 adolescentes vinculados
3. Vê estatísticas:
   - 2 com conflitos ativos
   - 1 com alerta de saúde
   - 5 sem intercorrências
4. Prioriza atendimentos conforme criticidade

## 📊 Atividades/Especialidades Comuns

| Atividade | Responsabilidades | Vinculações Típicas |
|-----------|-------------------|---------------------|
| **Psicólogo** | Avaliação psicológica, terapia | 5-8 adolescentes |
| **Assistente Social** | Visitas familiares, direitos | 8-12 adolescentes |
| **Pedagogo** | Educação, atividades | 10-15 adolescentes |
| **Advogado** | Questões jurídicas | Todos (consultoria) |
| **Enfermeiro** | Saúde, medicação | Todos (supervisão) |

## 🔒 Segurança

- ✅ E-mails são únicos no sistema
- ✅ Apenas admins podem cadastrar/editar técnicos
- ✅ Operadores podem apenas visualizar
- ✅ Histórico de alterações registrado

## 📈 Métricas

O sistema monitora automaticamente:
- Carga de trabalho (adolescentes por técnico)
- Taxa de resposta a notificações
- Tempo médio de intervenção
- Efetividade de acompanhamento

## 🚀 Próximas Melhorias

- [ ] Agenda de atendimentos
- [ ] Relatórios de evolução de adolescentes
- [ ] Assinatura digital de laudos
- [ ] Integração com prontuário eletrônico
- [ ] Dashboard individual para cada técnico
- [ ] Sistema de escala de plantão

## 📚 Referências

- SINASE - Sistema Nacional de Atendimento Socioeducativo
- Resolução CONANDA nº 119/2006
- Estatuto da Criança e do Adolescente (ECA)

---

**Documentação atualizada em:** Novembro 2025
**Responsável:** Equipe de Desenvolvimento + Equipe Técnica
