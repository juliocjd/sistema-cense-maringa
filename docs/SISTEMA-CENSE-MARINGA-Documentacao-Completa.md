# SISTEMA DE INTELIGÊNCIA - CENSE MARINGÁ
## Documentação Técnica Completa

**Projeto:** Sistema de Gestão e Inteligência Socioeducativa  
**Unidade:** Centro de Socioeducação de Maringá - PR  
**Data:** Novembro de 2025  
**Versão:** 1.0

---

## ÍNDICE

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Estrutura Arquitetônica](#2-estrutura-arquitetônica)
3. [Regras de Negócio](#3-regras-de-negócio)
4. [Banco de Dados](#4-banco-de-dados)
5. [API RESTful](#5-api-restful)
6. [Interface Visual](#6-interface-visual)
7. [Roadmap de Desenvolvimento](#7-roadmap-de-desenvolvimento)
8. [Melhorias Propostas](#8-melhorias-propostas)
9. [Stack Tecnológica](#9-stack-tecnológica)
10. [Próximos Passos](#10-próximos-passos)

---

## 1. VISÃO GERAL DO PROJETO

### 1.1 Objetivo

Desenvolver um sistema de inteligência para prevenir conflitos internos no CENSE Maringá, através da análise automatizada de relações entre adolescentes, alertando sobre inconsistências na alocação de internos que possuam atritos.

### 1.2 Problema a Resolver

- Conflitos entre adolescentes não são detectados antes da alocação
- Informações sobre facções, territórios e rivalidades estão dispersas
- Decisões críticas (alocação, formação de grupos) são tomadas sem visão completa
- Falta de rastreabilidade nas decisões operacionais
- Dificuldade em gerar documentação (justificativa de algemas, relatórios)

### 1.3 Solução Proposta

Sistema web com:
- **Mapa visual interativo** da unidade com código de cores indicando riscos
- **Inteligência preditiva** que analisa múltiplas variáveis (facções, bairros, tatuagens, histórico)
- **Sistema de alertas** em tempo real durante operações críticas
- **Justificativas obrigatórias** para decisões de alto risco
- **Geração automática de documentos** (justificativa de algemas, relatórios de mediação)
- **Auditoria completa** de todas as operações

### 1.4 Benefícios Esperados

✅ Redução de conflitos internos  
✅ Decisões operacionais mais informadas  
✅ Economia de tempo (automação de documentos)  
✅ Rastreabilidade e compliance  
✅ Suporte à equipe multidisciplinar  
✅ Base de dados para análises futuras  

---

## 2. ESTRUTURA ARQUITETÔNICA

### 2.1 Organização Física da Unidade

**Total:** 8 Casas  
**Capacidade:** 78 alojamentos (Casa 01-07: 10 alojamentos cada | Casa 08: 8 alojamentos)

#### Estrutura Padrão (Casas 01 a 07):
```
Casa XX
├── Ala A (6 alojamentos: 01, 02, 03, 04, 05, 06)
│   ├── Alojamentos frontais: 01↔06, 02↔05, 03↔04
│   └── Solário
├── Ala B (4 alojamentos: 07, 08, 09, 10)
│   ├── Alojamentos frontais: 07↔08, 09↔10
│   └── Atendimento
└── Convívio (área comum da casa)
```

#### Zonas de Risco (Janelas):
- **Casa 02 (Ala B)** ↔ **Casa 03 (Ala A)**: Alojamentos 08, 09 (C02) vs 01, 02, 03 (C03)
- **Casa 04 (Ala B)** ↔ **Casa 05 (Ala A)**: Alojamentos 09, 10 (C04) vs 03, 04 (C05)
- **Casa 05 (Ala B)** ↔ **Casa 06 (Ala A)**: Alojamentos 09, 10 (C05) vs 03, 04 (C06)
- **Casa 06 (Ala B)** ↔ **Casa 07 (Ala A)**: Alojamentos 09, 10 (C06) vs 03, 04 (C07)

#### Casas Isoladas:
- **Casa 01**: Internação provisória (isolada)
- **Casa 08**: Fase 3 - Internação com saídas externas autorizadas judicialmente (isolada)
  - Mantém qualidade de internação
  - Saídas externas condicionadas a autorização judicial genérica
  - Atividades/tratamentos/cursos definidos pela equipe multidisciplinar com aval da gestão

### 2.2 Organização de Grupos

Cada casa possui **grupos** para atividades:
- **Padrão:** 2 grupos por casa (ex: Grupo 2A, Grupo 2B)
- **Excepcional:** 3+ grupos (ex: Casa 08 pode ter 8A, 8B, 8C)

**Dinâmica:**
- Grupos vão **separados** para solário, escola, cursos
- Grupos da **mesma casa**:
  - **NÃO compartilham convívio** (equipe de segurança garante separação)
  - **Compartilham corredores** (risco de encontro durante movimentações)
  - Exemplo: Adolescente no Aloj 703 (Grupo 7A) e adolescente no Aloj 706 (Grupo 7B) podem se cruzar no corredor
- Grupos de **casas diferentes**:
  - **Encontros visuais possíveis na escola** (passagem em frente de salas de outros grupos)
  - **Encontros visuais possíveis no campo/solário** (campo central entre Casas 02, 06 e 07)
  - **Sem contato físico direto** (exceto eventos especiais)

---

## 3. REGRAS DE NEGÓCIO

### 3.1 Hierarquia de Níveis de Risco (Conflitos)

#### NÍVEL 5 - CRÍTICO (Conflito Frontal)
- **Condição:** Adolescentes com conflito ativo em alojamentos frontais (ex: 01 vs 06)
- **Cor no mapa:** 🔴 Vermelho
- **Ação:** Justificativa obrigatória + supervisão reforçada

#### NÍVEL 4 - ALTO (Mesma Ala)
- **Condição:** Adolescentes com conflito ativo na mesma ala (ex: Aloj 01 e 03, ambos Ala A)
- **Cor no mapa:** 🔴 Vermelho
- **Ação:** Justificativa obrigatória

#### NÍVEL 3 - MÉDIO-ALTO (Mesma Casa, Outra Ala)
- **Condição:** Adolescentes com conflito ativo na mesma casa, alas diferentes (ex: Aloj 01 da Ala A vs Aloj 08 da Ala B)
- **Cor no mapa:** 🟡 Amarelo
- **Ação:** Alerta + justificativa obrigatória

#### NÍVEL 2 - MÉDIO (Zona de Janelas)
- **Condição:** Adolescentes com conflito ativo em zonas de risco mapeadas (ex: C02 Aloj 08 vs C03 Aloj 01)
- **Cor no mapa:** 🟡 Amarelo
- **Ação:** Alerta

#### NÍVEL 1 - BAIXO (Sem Conflito Imediato)
- **Condição:** Nenhum conflito detectado
- **Cor no mapa:** 🟢 Verde
- **Ação:** Nenhuma

### 3.2 Tipos de Conflito

1. **Facções Rivais:** Adolescentes de grupos criminosos opostos
2. **Territorial:** Adolescentes de bairros/regiões em conflito
3. **Pessoal/Rivalidade:** Desentendimentos individuais
4. **Origem em CI:** Conflito registrado via Comunicado Interno

### 3.3 Sistema de Alertas (Ícones)

| Ícone | Significado | Visibilidade |
|-------|-------------|--------------|
| ⚠️ | Alerta de Manuseio (ex: risco suicídio, objetos autorizados) | Todos |
| 🔒 | Perfil Mapeado (proteção/sigilo sobre ato infracional) | Detalhes apenas para autorizados |
| ⚕️ | Alerta de Saúde Confidencial | Detalhes apenas para autorizados |

### 3.4 Status de Alojamentos

| Status | Cor | Descrição |
|--------|-----|-----------|
| LIVRE | ⚪ Branco/Cinza | Disponível para alocação |
| OCUPADO SEGURO | 🟢 Verde | Ocupado, sem conflitos detectados |
| OCUPADO ATENÇÃO | 🟡 Amarelo | Ocupado, conflito de nível médio |
| OCUPADO PERIGO | 🔴 Vermelho | Ocupado, conflito crítico/alto |
| INTERDITADO | ⚫ Preto/Hachurado | Bloqueado por problemas estruturais |

### 3.5 Justificativas Obrigatórias

Operações que exigem justificativa documentada:

1. **Alocar adolescente** em alojamento com conflito detectado (Níveis 3-5)
2. **Adicionar membro a grupo** com conflito ativo no mesmo grupo
3. **Adicionar membro a grupo** com conflito ativo em outro grupo da mesma casa
4. **Criar evento especial** que misture grupos com conflitos

**Registro obrigatório:**
- Texto livre explicando o motivo da decisão
- Operador responsável
- Data/hora
- Armazenado permanentemente no banco

### 3.6 Regras Especiais

#### Risco de Suicídio
Adolescentes com histórico:
- **Recomendação 1:** Alocar em alojamentos próximos às portas (01, 06, 07, 10)
- **Recomendação 2:** Garantir alojamento frontal ocupado
- **Alerta:** Sistema avisa se condições não forem atendidas

#### Perfil Mapeado
Adolescentes com atos infracionais que a "massa" não aceita:
- **Proteção:** Detalhes do ato ficam restritos
- **Alerta 🔒:** Visível para todos, mas motivo apenas para autorizados
- **Recomendação:** Alocação estratégica para proteção

#### Fase 3 (Casa 08)
Adolescentes com maior liberdade:
- **Critérios:** Bom comportamento, sem conflitos críticos, baixo risco de fuga
- **Avaliação:** Sistema gera relatório de recomendação baseado em dados
- **Atenção:** Monitoramento de longos períodos pode elevar conflitos

---

## 4. BANCO DE DADOS

### 4.1 Tabelas Principais

#### Tabela: `Operadores`
```sql
CREATE TABLE Operadores (
  id UUID PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  funcao_role VARCHAR(50) NOT NULL, -- 'ADMIN', 'OPERADOR'
  status VARCHAR(50) DEFAULT 'ATIVO',
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
```

#### Tabela: `Adolescentes`
```sql
CREATE TABLE Adolescentes (
  id UUID PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  nome_social VARCHAR(255),
  foto_url TEXT,
  numero_sms VARCHAR(50),
  data_nascimento DATE,
  data_entrada TIMESTAMP,
  numero_processo VARCHAR(100),
  ato_infracional_atual TEXT,
  status_unidade VARCHAR(50) DEFAULT 'ATIVO', -- 'ATIVO', 'TRANSFERIDO', 'LIBERADO', 'EVADIDO'
  
  -- Perfil de Risco
  faccao_grupo_id UUID REFERENCES Faccoes(id),
  faccao_numero_membro VARCHAR(50),
  bairro_origem_id UUID REFERENCES Bairros(id),
  risco_fuga VARCHAR(50), -- 'BAIXO', 'MÉDIO', 'ALTO'
  
  -- Alertas
  alerta_risco_suicidio BOOLEAN DEFAULT FALSE,
  alerta_perfil_mapeado BOOLEAN DEFAULT FALSE,
  alerta_saude_confidencial BOOLEAN DEFAULT FALSE,
  alerta_saude_detalhes TEXT,
  
  -- Alocação Atual
  alojamento_atual_id UUID REFERENCES Alojamentos(id),
  fase_internacao_atual_id UUID REFERENCES FasesInternacao(id),
  
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
```

#### Tabela: `Casas`
```sql
CREATE TABLE Casas (
  id UUID PRIMARY KEY,
  nome VARCHAR(50) NOT NULL, -- 'Casa 01', 'Casa 02'...
  numero INT NOT NULL,
  isolada BOOLEAN DEFAULT FALSE,
  observacoes TEXT
);
```

#### Tabela: `Alojamentos`
```sql
CREATE TABLE Alojamentos (
  id UUID PRIMARY KEY,
  casa_id UUID REFERENCES Casas(id) NOT NULL,
  numero_alojamento VARCHAR(10) NOT NULL, -- '01', '02'...
  ala VARCHAR(10), -- 'A', 'B', NULL (para Casa 08)
  status_manutencao VARCHAR(50) DEFAULT 'LIVRE', -- 'LIVRE', 'INTERDITADO'
  alojamento_frontal_id UUID REFERENCES Alojamentos(id),
  zona_risco_id UUID REFERENCES ZonasRisco(id),
  localizacao_preferencial BOOLEAN DEFAULT FALSE, -- Para risco suicídio
  
  UNIQUE(casa_id, numero_alojamento)
);
```

#### Tabela: `Grupos`
```sql
CREATE TABLE Grupos (
  id UUID PRIMARY KEY,
  nome_grupo VARCHAR(50) NOT NULL, -- 'Grupo 2A'
  casa_id UUID REFERENCES Casas(id) NOT NULL,
  ordem_ala VARCHAR(10), -- 'A', 'B', 'C'
  status VARCHAR(50) DEFAULT 'ATIVO',
  criado_em TIMESTAMP DEFAULT NOW()
);
```

#### Tabela: `Grupos_Membros`
```sql
CREATE TABLE Grupos_Membros (
  id UUID PRIMARY KEY,
  grupo_id UUID REFERENCES Grupos(id) NOT NULL,
  adolescente_id UUID REFERENCES Adolescentes(id) NOT NULL,
  data_entrada TIMESTAMP DEFAULT NOW(),
  data_saida TIMESTAMP,
  
  UNIQUE(grupo_id, adolescente_id)
);
```

#### Tabela: `Conflitos`
```sql
CREATE TABLE Conflitos (
  id UUID PRIMARY KEY,
  adolescente_A_id UUID REFERENCES Adolescentes(id) NOT NULL,
  adolescente_B_id UUID REFERENCES Adolescentes(id) NOT NULL,
  tipo_conflito VARCHAR(100), -- 'PESSOAL', 'FACCAO', 'TERRITORIAL'
  status VARCHAR(50) DEFAULT 'ATIVO', -- 'ATIVO', 'RESOLVIDO'
  ci_origem_id UUID REFERENCES ComunicadosInternos(id),
  descricao TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  resolvido_em TIMESTAMP,
  
  CHECK (adolescente_A_id != adolescente_B_id)
);
```

#### Tabela: `ComunicadosInternos`
```sql
CREATE TABLE ComunicadosInternos (
  id UUID PRIMARY KEY,
  numero INT NOT NULL,
  ano INT NOT NULL,
  data_fato DATE NOT NULL,
  tipo_ci VARCHAR(100) NOT NULL, -- 'DISCIPLINAR', 'CONFLITO', 'AUTORIZACAO_ESPECIAL', 'SAUDE'
  resumo_ci TEXT NOT NULL,
  caminho_pdf TEXT,
  operador_id UUID REFERENCES Operadores(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(numero, ano)
);
```

#### Tabela: `Comunicados_Adolescentes_Link`
```sql
CREATE TABLE Comunicados_Adolescentes_Link (
  id UUID PRIMARY KEY,
  ci_id UUID REFERENCES ComunicadosInternos(id) NOT NULL,
  adolescente_id UUID REFERENCES Adolescentes(id) NOT NULL
);
```

#### Tabela: `AlertasAtivos`
```sql
CREATE TABLE AlertasAtivos (
  id UUID PRIMARY KEY,
  adolescente_id UUID REFERENCES Adolescentes(id) NOT NULL,
  ci_origem_id UUID REFERENCES ComunicadosInternos(id),
  tipo_alerta VARCHAR(100), -- 'MANUSEIO', 'SAUDE', 'COMPORTAMENTAL'
  descricao_alerta TEXT NOT NULL,
  nivel_risco VARCHAR(50), -- 'ALTO', 'MÉDIO', 'BAIXO'
  criado_em TIMESTAMP DEFAULT NOW(),
  desativado_em TIMESTAMP
);
```

#### Tabela: `Faccoes`
```sql
CREATE TABLE Faccoes (
  id UUID PRIMARY KEY,
  nome_faccao VARCHAR(255) NOT NULL UNIQUE,
  descricao TEXT
);
```

#### Tabela: `Bairros`
```sql
CREATE TABLE Bairros (
  id UUID PRIMARY KEY,
  nome_bairro VARCHAR(255) NOT NULL,
  cidade VARCHAR(255) NOT NULL,
  
  UNIQUE(nome_bairro, cidade)
);
```

#### Tabela: `Bairros_Conflitos`
```sql
CREATE TABLE Bairros_Conflitos (
  id UUID PRIMARY KEY,
  bairro_A_id UUID REFERENCES Bairros(id) NOT NULL,
  bairro_B_id UUID REFERENCES Bairros(id) NOT NULL,
  status VARCHAR(50) DEFAULT 'ATIVO',
  
  CHECK (bairro_A_id != bairro_B_id)
);
```

#### Tabela: `Tatuagens_Catalogo`
```sql
CREATE TABLE Tatuagens_Catalogo (
  id UUID PRIMARY KEY,
  nome_simbolo VARCHAR(255) NOT NULL UNIQUE,
  significado_associado TEXT,
  nivel_risco VARCHAR(50) -- 'ALTO', 'MÉDIO', 'BAIXO', 'INFORMATIVO'
);
```

#### Tabela: `Adolescentes_Tatuagens`
```sql
CREATE TABLE Adolescentes_Tatuagens (
  id UUID PRIMARY KEY,
  adolescente_id UUID REFERENCES Adolescentes(id) NOT NULL,
  tatuagem_catalogo_id UUID REFERENCES Tatuagens_Catalogo(id) NOT NULL,
  local_corpo VARCHAR(100),
  foto_url TEXT,
  observacoes TEXT
);
```

#### Tabela: `Adolescentes_Historico_Infracional`
```sql
CREATE TABLE Adolescentes_Historico_Infracional (
  id UUID PRIMARY KEY,
  adolescente_id UUID REFERENCES Adolescentes(id) NOT NULL,
  ato_infracional_descricao TEXT NOT NULL,
  unidade_internacao VARCHAR(255),
  ano INT,
  observacoes TEXT
);
```

#### Tabela: `FasesInternacao`
```sql
CREATE TABLE FasesInternacao (
  id UUID PRIMARY KEY,
  nome_fase VARCHAR(255) NOT NULL UNIQUE,
  descricao_fase TEXT,
  ordem INT, -- 1, 2, 3...
  permite_casa_08 BOOLEAN DEFAULT FALSE
);
```

#### Tabela: `ZonasRisco`
```sql
CREATE TABLE ZonasRisco (
  id UUID PRIMARY KEY,
  nome_zona VARCHAR(50) NOT NULL,
  descricao TEXT
);
```

#### Tabela: `ZonasRisco_Alojamentos`
```sql
CREATE TABLE ZonasRisco_Alojamentos (
  id UUID PRIMARY KEY,
  zona_id UUID REFERENCES ZonasRisco(id) NOT NULL,
  alojamento_id UUID REFERENCES Alojamentos(id) NOT NULL
);
```

#### Tabela: `ZonasRisco_Vinculos`
```sql
CREATE TABLE ZonasRisco_Vinculos (
  id UUID PRIMARY KEY,
  zona_A_id UUID REFERENCES ZonasRisco(id) NOT NULL,
  zona_B_id UUID REFERENCES ZonasRisco(id) NOT NULL,
  
  CHECK (zona_A_id != zona_B_id)
);
```

#### Tabela: `Decisoes_Operacionais`
```sql
CREATE TABLE Decisoes_Operacionais (
  id UUID PRIMARY KEY,
  operador_id UUID REFERENCES Operadores(id) NOT NULL,
  data_hora TIMESTAMP DEFAULT NOW(),
  tipo_operacao VARCHAR(100) NOT NULL, -- 'ADICIONAR_MEMBRO_GRUPO', 'ALOCAR_ALOJAMENTO'
  adolescente_id UUID REFERENCES Adolescentes(id),
  grupo_id UUID REFERENCES Grupos(id),
  alojamento_id UUID REFERENCES Alojamentos(id),
  nivel_alerta VARCHAR(50), -- 'CRÍTICO', 'ALTO', 'MÉDIO'
  conflitos_detectados JSONB,
  justificativa_operador TEXT NOT NULL,
  medidas_adicionais TEXT[],
  status VARCHAR(50) DEFAULT 'EXECUTADO' -- 'EXECUTADO', 'CANCELADO'
);
```

#### Tabela: `Log_Auditoria`
```sql
CREATE TABLE Log_Auditoria (
  id UUID PRIMARY KEY,
  operador_id UUID REFERENCES Operadores(id),
  data_hora TIMESTAMP DEFAULT NOW(),
  acao VARCHAR(100) NOT NULL, -- 'LOGIN_SUCESSO', 'INSERT', 'UPDATE', 'DELETE'
  tabela_afetada VARCHAR(100),
  registro_id_afetado UUID,
  detalhes_alteracao JSONB,
  ip_origem VARCHAR(50)
);
```

#### Tabela: `Tentativas_Mediacao`
```sql
CREATE TABLE Tentativas_Mediacao (
  id UUID PRIMARY KEY,
  conflito_id UUID REFERENCES Conflitos(id) NOT NULL,
  data_tentativa DATE NOT NULL,
  profissional_responsavel VARCHAR(255) NOT NULL,
  tipo_intervencao VARCHAR(100), -- 'MEDIAÇÃO', 'ATENDIMENTO_INDIVIDUAL', 'GRUPO_TERAPÊUTICO'
  resultado VARCHAR(50), -- 'RESOLVIDO', 'EM_ANDAMENTO', 'SEM_SUCESSO'
  observacoes TEXT,
  proxima_acao_recomendada TEXT,
  data_proxima_avaliacao DATE,
  criado_em TIMESTAMP DEFAULT NOW()
);
```

#### Tabela: `EventosEspeciais`
```sql
CREATE TABLE EventosEspeciais (
  id UUID PRIMARY KEY,
  nome_evento VARCHAR(255) NOT NULL,
  data_hora_inicio TIMESTAMP NOT NULL,
  data_hora_fim TIMESTAMP,
  tipo VARCHAR(100), -- 'CONFRATERNIZACAO', 'CURSO_ESPECIAL', 'ATIVIDADE_INTEGRADA'
  status VARCHAR(50) DEFAULT 'PLANEJADO', -- 'PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO'
  observacoes TEXT,
  criado_por UUID REFERENCES Operadores(id),
  criado_em TIMESTAMP DEFAULT NOW()
);
```

#### Tabela: `EventosEspeciais_Grupos`
```sql
CREATE TABLE EventosEspeciais_Grupos (
  id UUID PRIMARY KEY,
  evento_id UUID REFERENCES EventosEspeciais(id) NOT NULL,
  grupo_id UUID REFERENCES Grupos(id) NOT NULL
);
```

#### Tabela: `EventosEspeciais_Participantes`
```sql
CREATE TABLE EventosEspeciais_Participantes (
  id UUID PRIMARY KEY,
  evento_id UUID REFERENCES EventosEspeciais(id) NOT NULL,
  adolescente_id UUID REFERENCES Adolescentes(id) NOT NULL
);
```

#### Tabela: `Visitantes`
```sql
CREATE TABLE Visitantes (
  id UUID PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  data_nascimento DATE,
  endereco_completo TEXT,
  telefones TEXT[],
  foto_url TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
```

#### Tabela: `Adolescentes_Visitantes_Link`
```sql
CREATE TABLE Adolescentes_Visitantes_Link (
  id UUID PRIMARY KEY,
  adolescente_id UUID REFERENCES Adolescentes(id) NOT NULL,
  visitante_id UUID REFERENCES Visitantes(id) NOT NULL,
  parentesco VARCHAR(100), -- 'MÃE', 'PAI', 'AMIGO', 'ADVOGADO'
  autorizado BOOLEAN DEFAULT TRUE,
  observacoes TEXT
);
```

#### Tabela: `Visitas_Registro`
```sql
CREATE TABLE Visitas_Registro (
  id UUID PRIMARY KEY,
  visitante_id UUID REFERENCES Visitantes(id) NOT NULL,
  adolescente_id UUID REFERENCES Adolescentes(id) NOT NULL,
  data_hora_entrada TIMESTAMP NOT NULL,
  data_hora_saida TIMESTAMP,
  operador_registro_id UUID REFERENCES Operadores(id)
);
```

---

## 5. API RESTFUL

### 5.1 Arquitetura

**Padrão:** REST  
**Hospedagem:** Vercel (Serverless Functions)  
**Autenticação:** JWT (JSON Web Tokens)  
**Formato:** JSON

### 5.2 Endpoints de Autenticação

#### POST `/api/operadores/login`
**Função:** Autenticar operador

**Request:**
```json
{
  "email": "jose@cense.pr.gov.br",
  "senha": "senha123"
}
```

**Response (Sucesso - 200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "operador": {
    "id": "uuid-123",
    "nome": "José Silva",
    "role": "ADMIN"
  }
}
```

**Response (Erro - 401):**
```json
{
  "erro": "Credenciais inválidas"
}
```

#### POST `/api/operadores` (Requer: ADMIN)
**Função:** Cadastrar novo operador

**Request:**
```json
{
  "nome": "Maria Santos",
  "email": "maria@cense.pr.gov.br",
  "senha": "senha456",
  "role": "OPERADOR"
}
```

**Response (Sucesso - 201):**
```json
{
  "id": "uuid-456",
  "nome": "Maria Santos",
  "email": "maria@cense.pr.gov.br",
  "role": "OPERADOR"
}
```

### 5.3 Endpoints de Cadastro

#### POST `/api/adolescentes`
**Função:** Cadastrar novo adolescente

**Request:** (Objeto completo com todos os campos da tabela Adolescentes)

#### GET `/api/adolescentes`
**Função:** Buscar adolescentes

**Query Params:**
- `status`: ATIVO, TRANSFERIDO, LIBERADO
- `busca`: Nome ou número SMS
- `casa_id`: Filtrar por casa
- `grupo_id`: Filtrar por grupo

**Response:**
```json
{
  "total": 78,
  "adolescentes": [
    {
      "id": "uuid-123",
      "nome_completo": "João Silva",
      "numero_sms": "12345",
      "alojamento_atual": {
        "id": "uuid-aloj",
        "casa": "Casa 02",
        "numero": "05"
      },
      "alertas": ["risco_suicidio", "perfil_mapeado"]
    }
  ]
}
```

#### GET `/api/adolescentes/:id`
**Função:** Buscar adolescente específico (dossiê completo)

#### PUT `/api/adolescentes/:id`
**Função:** Atualizar dados do adolescente

#### POST `/api/conflitos`
**Função:** Registrar conflito ativo

**Request:**
```json
{
  "adolescente_A_id": "uuid-123",
  "adolescente_B_id": "uuid-456",
  "tipo_conflito": "FACCAO",
  "descricao": "Facções rivais",
  "ci_origem_id": "uuid-ci-145"
}
```

#### PUT `/api/conflitos/:id/resolver`
**Função:** Marcar conflito como resolvido

### 5.4 Endpoints de Inteligência (Core)

#### GET `/api/casas/status`
**Função:** Buscar status de toda a unidade para o mapa visual

**Response:**
```json
{
  "casas": [
    {
      "id": "uuid-casa-02",
      "nome": "Casa 02",
      "score_tensao": 87,
      "alojamentos": [
        {
          "id": "uuid-aloj-05",
          "numero": "05",
          "ala": "A",
          "status_manutencao": "LIVRE",
          "cor_risco": "verde",
          "icones": [],
          "ocupante": null
        },
        {
          "id": "uuid-aloj-06",
          "numero": "06",
          "ala": "A",
          "status_manutencao": "LIVRE",
          "cor_risco": "vermelho",
          "icones": ["risco_suicidio"],
          "ocupante": {
            "id": "uuid-joao",
            "nome": "João Silva",
            "foto_url": "..."
          }
        }
      ]
    }
  ]
}
```

#### GET `/api/verificar-alocacao`
**Função:** Verificar riscos antes de alocar

**Query Params:**
- `adolescente_id`: UUID do adolescente
- `alojamento_id`: UUID do alojamento

**Response:**
```json
{
  "permite_alocacao": true,
  "requer_justificativa": true,
  "nivel_risco": "CRÍTICO",
  "alertas": [
    {
      "tipo": "CONFLITO_FRONTAL",
      "nivel": 5,
      "mensagem": "Conflito NÍVEL 5 (Frontal) com Pedro Santos no Alojamento 05.",
      "adolescente_conflitante": {
        "id": "uuid-pedro",
        "nome": "Pedro Santos",
        "alojamento": "05"
      },
      "origem": "CI 145/2025",
      "tipo_conflito": "Facções rivais"
    },
    {
      "tipo": "RISCO_SUICIDIO",
      "mensagem": "Alojamento frontal ocupado por um rival.",
      "recomendacao": "Supervisão reforçada obrigatória"
    }
  ]
}
```

#### POST `/api/alocar`
**Função:** Confirmar alocação (com ou sem justificativa)

**Request:**
```json
{
  "adolescente_id": "uuid-123",
  "alojamento_id": "uuid-aloj-06",
  "operador_id": "uuid-operador",
  "justificativa": "Única vaga disponível. Supervisão reforçada será mantida."
}
```

**Response:**
```json
{
  "sucesso": true,
  "documentado": true,
  "decisao_id": "uuid-decisao-123"
}
```

### 5.5 Endpoints de Grupos

#### POST `/api/grupos`
**Função:** Criar novo grupo

#### POST `/api/grupos/:id/adicionar-membro`
**Função:** Adicionar adolescente ao grupo (com verificação de conflitos)

**Request:**
```json
{
  "adolescente_id": "uuid-123",
  "operador_id": "uuid-operador",
  "justificativa": "Mediação realizada com sucesso"
}
```

**Response (Conflito Detectado):**
```json
{
  "status": "REQUER_JUSTIFICATIVA",
  "nivel": "CRÍTICO",
  "conflitos": [
    {
      "com_adolescente": {
        "id": "uuid-pedro",
        "nome": "Pedro Santos"
      },
      "tipo": "MESMO_GRUPO",
      "nivel": "CRÍTICO",
      "origem": "CI 145/2025"
    }
  ],
  "mensagem": "Conflito direto detectado com membro do grupo."
}
```

#### GET `/api/grupos/:id/membros`
**Função:** Listar membros do grupo

### 5.6 Endpoints de Relatórios

#### GET `/api/relatorios/conflitos-gerais`
**Função:** Gerar relatório geral de conflitos ativos

**Response:** PDF ou JSON estruturado

#### GET `/api/relatorios/conflitos-casa/:casa_id`
**Função:** Gerar relatório de conflitos de uma casa específica

#### GET `/api/relatorios/conflitos-adolescente/:adolescente_id`
**Função:** Gerar ficha de conflitos de um adolescente

#### GET `/api/relatorios/conflitos-nao-mediados`
**Função:** Listar conflitos sem tentativa de mediação

#### POST `/api/tentativas-mediacao`
**Função:** Registrar tentativa de mediação

**Request:**
```json
{
  "conflito_id": "uuid-conflito",
  "data_tentativa": "2025-11-01",
  "profissional_responsavel": "Maria Santos - Psicóloga",
  "tipo_intervencao": "MEDIACAO",
  "resultado": "EM_ANDAMENTO",
  "observacoes": "Primeira sessão. Adolescentes demonstraram disposição...",
  "proxima_acao_recomendada": "Acompanhamento em 15 dias",
  "data_proxima_avaliacao": "2025-11-15"
}
```

### 5.7 Endpoint de Geração de Documentos

#### GET `/api/adolescentes/:id/gerar-justificativa-algema`
**Função:** Gerar automaticamente justificativa de uso de algemas

**Response:**
```json
{
  "documento_texto": "ASSUNTO: Justificativa para Uso de Algemas...\n\n[Texto completo formatado]",
  "dados_utilizados": {
    "ato_infracional_atual": "Análogo a Roubo com arma de fogo",
    "risco_fuga": "Alto",
    "faccao": "Grupo A (Nº 123)",
    "cis_disciplinares": 5,
    "historico_infracional": ["Tráfico", "Roubo"],
    "tatuagens_alto_risco": ["Palhaço - Assassino de policial"]
  }
}
```

### 5.8 Endpoints de Eventos Especiais

#### POST `/api/eventos-especiais`
**Função:** Criar evento especial

#### POST `/api/eventos-especiais/:id/verificar-conflitos`
**Função:** Analisar conflitos entre grupos/participantes

**Request:**
```json
{
  "grupos_participantes": ["uuid-grupo-2a", "uuid-grupo-2b", "uuid-grupo-3a"]
}
```

**Response:**
```json
{
  "score_risco_combinado": 164,
  "nivel": "ALTO",
  "conflitos_criticos": 3,
  "conflitos_detalhados": [
    {
      "adolescente_A": "João Silva (Grupo 2A)",
      "adolescente_B": "Pedro Santos (Grupo 2B)",
      "tipo": "Facções rivais",
      "nivel": "CRÍTICO"
    }
  ],
  "recomendacoes": [
    "Separar João e Pedro em horários diferentes",
    "Reforçar equipe de 8 para 12 agentes",
    "Designar agente específico para acompanhar Ana"
  ]
}
```

### 5.9 Endpoints de Auditoria

#### GET `/api/log-auditoria`
**Função:** Consultar log de auditoria

**Query Params:**
- `operador_id`: Filtrar por operador
- `acao`: Filtrar por tipo de ação
- `data_inicio`, `data_fim`: Filtrar por período

#### GET `/api/decisoes-operacionais`
**Função:** Relatório de decisões com alerta

**Response:**
```json
{
  "periodo": "Outubro/2025",
  "total": 23,
  "por_nivel": {
    "CRÍTICO": 8,
    "ALTO": 12,
    "MÉDIO": 3
  },
  "decisoes": [
    {
      "id": "uuid-dec-123",
      "data_hora": "2025-10-01T14:32:00Z",
      "operador": "José Silva",
      "tipo_operacao": "ADICIONAR_MEMBRO_GRUPO",
      "nivel_alerta": "CRÍTICO",
      "adolescente": "João Silva",
      "grupo": "Grupo 2A",
      "justificativa": "Mediação realizada com sucesso...",
      "conflitos": ["Pedro Santos (mesmo grupo)"]
    }
  ]
}
```

---

## 6. INTERFACE VISUAL

### 6.1 Componentes Principais

#### Mapa Interativo (Cockpit Principal)
- Representação visual fiel à planta arquitetônica
- 8 casas renderizadas com seus alojamentos
- Sistema de cores em tempo real
- Ícones de alerta sobrepostos
- Clique para ação (alocar, ver detalhes)
- Hover para preview rápido

#### Dashboard Gerencial
- Ocupação geral da unidade
- Score de tensão por casa
- Alertas ativos
- CIs do período
- Gráficos de conflitos
- Adolescentes aguardando progressão

#### Tela de Cadastro de Adolescente
- Formulário em abas
- Upload de fotos
- Seleção de facção/bairro (dropdowns)
- Checkboxes de alertas
- Seção de tatuagens com preview
- Seção de histórico infracional

#### Tela de Gestão de Grupos
- Lista de grupos por casa
- Membros atuais
- Botão "Adicionar Membro" (com verificação)
- Status do grupo

#### Tela de Relatórios
- Seleção de tipo de relatório
- Filtros avançados
- Preview na tela
- Botão de exportação (PDF, Excel)

#### Tela de Comunicados Internos
- Formulário de CI
- Upload de PDF
- Seleção múltipla de adolescentes
- Pop-up de "gatilho" (criar conflito/alerta)

### 6.2 Fluxos de Interação

#### Fluxo de Alocação:
1. Operador clica em alojamento livre (branco)
2. Modal abre com busca de adolescente
3. Operador seleciona adolescente
4. Sistema chama API `/verificar-alocacao`
5. Sistema exibe pop-up com alertas (se houver)
6. Se houver alerta crítico/alto: campo de justificativa obrigatório
7. Operador confirma ou cancela
8. Sistema chama API `/alocar`
9. Mapa atualiza em tempo real

#### Fluxo de Registro de CI:
1. Operador acessa "Comunicados Internos"
2. Preenche: número, ano, data, tipo, resumo
3. Faz upload do PDF
4. Seleciona adolescentes envolvidos
5. Se tipo = "CONFLITO": Pop-up pergunta quais pares têm conflito
6. Se tipo = "AUTORIZAÇÃO_ESPECIAL": Pop-up pergunta sobre alerta ativo
7. Operador confirma
8. Sistema cria CI + registros vinculados

#### Fluxo de Geração de Justificativa:
1. Operador acessa dossiê do adolescente
2. Clica em "Gerar Justificativa de Algema"
3. Sistema chama API `/gerar-justificativa-algema`
4. Modal exibe documento completo formatado
5. Operador pode copiar ou imprimir

### 6.3 Responsividade

**Desktop First:**
- Mapa visual otimizado para telas grandes
- Múltiplas casas visíveis simultaneamente

**Mobile Responsive:**
- Navegação por abas (Casa por Casa)
- Toque para ações
- QR Code nos alojamentos (escaneável)

---

## 7. ROADMAP DE DESENVOLVIMENTO

### FASE 1: O Coração (3-4 meses)
**Objetivo:** Sistema funcional com inteligência básica de conflitos e mapa visual

#### Entregas:
- ✅ Banco de dados completo (estrutura)
- ✅ Sistema de autenticação (login/cadastro de operadores)
- ✅ Cadastro de adolescentes (dossiê completo)
- ✅ Cadastro de estrutura (casas, alojamentos, zonas de risco)
- ✅ Cadastro de facções, bairros, tatuagens (catálogos)
- ✅ Registro de conflitos (manual, versão 1.0)
- ✅ API de inteligência:
  - `/verificar-alocacao`
  - `/alocar`
  - `/casas/status`
- ✅ Mapa visual interativo:
  - Código de cores
  - Ícones de alerta
  - Pop-ups de informação
  - Fluxo de alocação completo
- ✅ Sistema de justificativas obrigatórias
- ✅ Log de auditoria básico

#### Critérios de Sucesso:
- [ ] Operador consegue alocar adolescente e recebe alertas de conflito
- [ ] Mapa visual reflete situação em tempo real
- [ ] Todas as decisões de risco ficam documentadas

---

### FASE 2: Automação e Relatórios (2-3 meses)
**Objetivo:** Otimizar fluxo de trabalho e automatizar tarefas críticas

#### Entregas:
- ✅ Módulo de Comunicados Internos (CIs):
  - Cadastro de CI
  - Upload de PDF
  - Vínculo com adolescentes
  - Gatilhos automáticos (criar conflito/alerta)
- ✅ Gerador de Justificativa de Algema:
  - API `/gerar-justificativa-algema`
  - Documento formatado automaticamente
- ✅ Relatórios de Mediação:
  - Relatório geral de conflitos
  - Relatório por casa
  - Relatório individual
  - Relatório de conflitos não mediados
- ✅ Registro de Tentativas de Mediação:
  - Formulário de registro
  - Acompanhamento de mediações
  - Dashboard para equipe multidisciplinar

#### Critérios de Sucesso:
- [ ] Equipe usa CI como fonte única de registro
- [ ] Justificativa de algema gerada em < 10 segundos
- [ ] Equipe multidisciplinar tem relatórios prontos semanalmente

---

### FASE 2.5: Inteligência Preditiva (1-2 meses)
**Objetivo:** Adicionar capacidades preditivas e preventivas

#### Entregas:
- ✅ Score de tensão por casa/grupo
- ✅ Dashboard de "temperatura" da unidade
- ✅ Alertas preventivos (ex: "Casa 02 com score crítico")
- ✅ Módulo de Eventos Especiais:
  - Cadastro de eventos
  - Verificação de conflitos cruzados
  - Relatório de risco para eventos
- ✅ Mapa de calor (visualização alternativa)
- ✅ Notificações push/email para gestão

#### Critérios de Sucesso:
- [ ] Gestão recebe alertas antes de conflitos acontecerem
- [ ] Eventos especiais são planejados com análise de risco

---

### FASE 3: Ecossistema Completo (2-3 meses)
**Objetivo:** Expandir para gestão de atividades e influências externas

#### Entregas:
- ✅ Gestão de Grupos:
  - CRUD de grupos
  - Adicionar/remover membros (com verificação de conflitos)
  - Histórico de pertencimento
- ✅ Gestão de Fases de Internação:
  - CRUD de fases
  - Avaliação de Progressão (relatório automatizado)
  - Recomendações baseadas em dados
- ✅ Módulo de Visitantes:
  - Cadastro de visitantes
  - Vínculo com adolescentes
  - Registro de visitas
  - Inteligência de vínculos ocultos

#### Critérios de Sucesso:
- [ ] Grupos são formados sem conflitos internos
- [ ] Progressão de fase baseada em dados objetivos
- [ ] Sistema detecta vínculos externos entre adolescentes

---

### FASE 4: Refinamentos (Contínuo)
**Objetivo:** Melhorias baseadas no uso real

#### Entregas (Conforme demanda):
- Modo mobile otimizado
- Exportação de relatórios (Excel, Word)
- Busca avançada e filtros
- Timeline visual no dossiê
- Integração com biometria
- Dashboard executivo para direção
- Análise de sociograma (redes de relações)
- BI e analytics avançados

---

## 8. MELHORIAS PROPOSTAS

### 8.1 Inteligência Preditiva
- **Score de tensão:** Algoritmo que calcula risco por casa/grupo
- **Alertas preventivos:** Sistema avisa antes do conflito acontecer
- **Análise de padrões:** Identificar internos com histórico de múltiplos conflitos

### 8.2 Busca Inteligente
- Busca semântica (ex: "adolescentes com tatuagem de palhaço")
- Filtros combinados (ex: "Casa 02 + Facção A + Conflitos ativos")
- Busca por relacionamentos (ex: "quem visitou João nos últimos 30 dias")

### 8.3 Visualizações Alternativas
- **Timeline visual:** Linha do tempo no dossiê do adolescente
- **Mapa de calor:** Visualizar "temperatura" das casas
- **Sociograma:** Rede de relações entre adolescentes

### 8.4 Notificações e Alertas
- Push notifications para gestão
- Email diário com resumo executivo
- Alertas críticos via SMS/WhatsApp

### 8.5 Backup e Auditoria
- Snapshot diário do mapa (foto da alocação)
- Histórico de alterações (quem mudou o quê)
- Exportação de logs para análise externa

### 8.6 Dashboard Executivo
- KPIs para direção
- Gráficos de evolução
- Comparativo mensal
- Taxa de sucesso de mediações

### 8.7 Mobile-First
- App responsivo otimizado para celular
- QR Code nos alojamentos
- Operações críticas funcionam no mobile

### 8.8 Relatórios Exportáveis
- PDF (justificativas, relatórios)
- Excel (dados tabulares, análises)
- Word (relatórios editáveis)
- Impressão do mapa visual

### 8.9 Integração Futura
- Biometria (digital, facial)
- Sistema SMS (se possível)
- Câmeras de monitoramento
- Controle de acesso

### 8.10 BI e Analytics
- Análise de tendências
- Predição de conflitos (Machine Learning)
- Identificação de fatores de risco
- Efetividade de intervenções

### 8.11 Módulo de Transferências e Comunicação Judicial

#### Relatório Automático de Transferência
Sistema detecta adolescentes com:
- 10+ conflitos ativos sem possibilidade de mediação
- 5+ tentativas de mediação sem sucesso
- Score de risco crítico por 90+ dias
- Impossibilidade de realocação sem conflito nível 4+

**Funcionalidades:**
- Geração automática de relatório técnico completo
- Análise de viabilidade de permanência
- Histórico completo de conflitos e mediações
- Histórico de CIs e intervenções realizadas
- Simulação de todas as possibilidades de alocação
- Sugestão de unidades de destino
- Documentos anexos compilados automaticamente

#### Outros Relatórios Judiciais
- Relatório de progressão de medida socioeducativa
- Relatório de regressão de fase
- Relatório trimestral obrigatório (para MP/Judiciário)
- Relatório de desinternação
- Relatório de evasão com análise de risco de reincidência

#### Integração com Sistema Judicial (Futuro)
- API para envio automático de relatórios
- Webhook para receber decisões judiciais
- Atualização automática de status processual
- Histórico de transferências interunidades

**Novas Tabelas no Banco:**
```sql
CREATE TABLE Solicitacoes_Transferencia (
  id UUID PRIMARY KEY,
  adolescente_id UUID REFERENCES Adolescentes(id) NOT NULL,
  motivo_principal VARCHAR(255) NOT NULL,
  unidades_sugeridas TEXT[],
  observacoes_adicionais TEXT,
  relatorio_gerado_path TEXT,
  status VARCHAR(50) DEFAULT 'AGUARDANDO',
  data_solicitacao TIMESTAMP DEFAULT NOW(),
  operador_solicitante_id UUID REFERENCES Operadores(id),
  data_decisao_judicial TIMESTAMP,
  decisao_judicial TEXT,
  unidade_destino_efetiva VARCHAR(255),
  data_transferencia_efetiva TIMESTAMP
);

CREATE TABLE Historico_Transferencias (
  id UUID PRIMARY KEY,
  adolescente_id UUID REFERENCES Adolescentes(id),
  unidade_origem VARCHAR(255),
  unidade_destino VARCHAR(255),
  data_transferencia DATE,
  motivo TEXT,
  conflitos_na_origem INT,
  relatorio_transferencia_id UUID REFERENCES Solicitacoes_Transferencia(id)
);
```

---

## 9. STACK TECNOLÓGICA

### 9.1 Recomendação Oficial

#### Frontend:
- **Framework:** Next.js 14+ (React)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Componentes:** shadcn/ui
- **Gráficos:** Recharts ou Chart.js
- **Estado:** React Context API / Zustand

#### Backend:
- **Runtime:** Node.js
- **API:** Next.js API Routes (Serverless)
- **Linguagem:** TypeScript
- **Validação:** Zod
- **Autenticação:** NextAuth.js (JWT)

#### Banco de Dados:
- **Primary:** Vercel Postgres (PostgreSQL)
- **ORM:** Prisma
- **Migrações:** Prisma Migrate

#### Hospedagem:
- **Aplicação:** Vercel
- **Banco:** Vercel Postgres
- **Arquivos (PDFs, fotos):** Vercel Blob Storage

#### DevOps:
- **Repositório:** GitHub
- **CI/CD:** Vercel (automático)
- **Monitoramento:** Vercel Analytics

#### Ferramentas:
- **Geração de PDFs:** jsPDF ou Puppeteer
- **Upload de arquivos:** Vercel Blob
- **Validação:** Zod + React Hook Form

---

## 10. PRÓXIMOS PASSOS

### 10.1 Setup Inicial (Semana 1)

1. **Criar repositório no GitHub:**
   ```bash
   git init sistema-cense-maringa
   ```

2. **Inicializar projeto Next.js:**
   ```bash
   npx create-next-app@latest sistema-cense-maringa --typescript --tailwind --app
   ```

3. **Conectar Vercel:**
   - Importar repositório na Vercel
   - Configurar variáveis de ambiente

4. **Configurar banco de dados:**
   - Criar Vercel Postgres
   - Configurar Prisma
   - Criar schema inicial

5. **Estrutura de pastas:**
   ```
   /app
     /api
       /operadores
       /adolescentes
       /conflitos
       ...
     /(auth)
       /login
     /(dashboard)
       /mapa
       /cadastros
       /relatorios
   /components
   /lib
   /prisma
   /public
   ```

### 10.2 Desenvolvimento (Semanas 2-16)

**Sprint 1-2:** Autenticação + Cadastros básicos  
**Sprint 3-4:** API de inteligência + Lógica de conflitos  
**Sprint 5-6:** Mapa visual (componente principal)  
**Sprint 7-8:** Fluxo de alocação completo  
**Sprint 9-10:** Sistema de justificativas  
**Sprint 11-12:** Módulo de CIs  
**Sprint 13-14:** Relatórios  
**Sprint 15-16:** Testes + Ajustes  

### 10.3 Homologação (Semana 17)

- Implantação em ambiente de teste
- Treinamento da equipe
- Ajustes baseados em feedback

### 10.4 Go-Live (Semana 18)

- Migração de dados (se houver)
- Implantação em produção
- Suporte intensivo inicial

---

## ANEXOS

### A. Glossário

- **CI:** Comunicado Interno
- **CENSE:** Centro de Socioeducação
- **API:** Application Programming Interface
- **REST:** Representational State Transfer
- **JWT:** JSON Web Token
- **UUID:** Universally Unique Identifier
- **CRUD:** Create, Read, Update, Delete
- **BI:** Business Intelligence

### B. Contatos

**Equipe de Desenvolvimento:** [A definir]  
**Gestão CENSE Maringá:** [A definir]  
**Equipe Multidisciplinar:** [A definir]  

### C. Referências

- Documentação Next.js: https://nextjs.org/docs
- Documentação Prisma: https://www.prisma.io/docs
- Documentação Vercel: https://vercel.com/docs
- shadcn/ui: https://ui.shadcn.com

---

## CONCLUSÃO

Este documento consolida todo o planejamento do Sistema de Inteligência para o CENSE Maringá. 

O projeto foi estruturado em fases incrementais, permitindo entregas de valor contínuas e ajustes baseados no uso real. A arquitetura escolhida (Next.js + Vercel + PostgreSQL) é moderna, escalável e econômica.

O sistema não apenas resolve o problema imediato de prevenção de conflitos, mas estabelece uma base sólida para evoluir para uma plataforma completa de gestão socioeducativa.

**Data de criação:** Novembro 2025  
**Última atualização:** Novembro 2025  
**Versão:** 1.0

---

**Documento gerado por:** Claude (Anthropic)  
**Em colaboração com:** Equipe CENSE Maringá  
**Confidencial:** Uso interno
