# Sistema Completo de Gestão de Visitas - Especificação

## 📋 Visão Geral

Sistema abrangente para gerenciar visitas de familiares aos adolescentes internados no CENSE Maringá, com controles rigorosos, alertas automáticos, notificações por e-mail e relatórios completos.

---

## 🎯 Requisitos Funcionais Implementados

### 1. **Vínculos Visitante-Adolescente**
- ✅ Visitante pode estar vinculado a múltiplos adolescentes
- ✅ Grau de parentesco específico por adolescente
  - Exemplo: Visitante é "mãe" do adolescente A e "tia" do adolescente B
- ✅ Autorização individual por vínculo

### 2. **Controle de Acesso Baseado em Status**
- ✅ Visitante só pode entrar se adolescente estiver ATIVO/INTERNADO
- ✅ Bloqueio automático se adolescente for transferido/desligado
- ✅ Alertas visuais na portaria

### 3. **Regras de Visitas Configuráveis**

#### **Dias Permitidos:**
- ✅ Configurável (padrão: sábados)
- ✅ Não fixo em código
- ✅ Pode ser alterado por administradores

#### **Quantidade de Visitantes:**
- ✅ Padrão: 2 adultos ou 1 adulto + 1 criança
- ✅ Segundo sábado do mês: 2 adultos + 1 criança OU 1 adulto + 2 crianças
- ✅ Criança = pessoa com menos de 12 anos (configurável)
- ✅ Sistema BLOQUEIA visitas que extrapolam limite

#### **Horários por Casa:**
- ✅ Casas 1-4: Manhã (08:00-12:00)
- ✅ Casas 5-8: Tarde (13:00-17:00)
- ✅ Configurável (não fixo em código)
- ✅ Permite visita em horário diferente com justificativa
- ✅ ALERTA operador mas não impede entrada

### 4. **Registro de Visitas**
- ✅ Quem visitou
- ✅ Qual adolescente foi visitado
- ✅ Horário de entrada e saída
- ✅ Quantidade de acompanhantes (adultos/crianças)
- ✅ Período realizado (manhã/tarde)
- ✅ Alertas gerados
- ✅ Foto do visitante no dia (comparar com cadastro)

### 5. **Sistema de Notificações por E-mail**

#### **E-mail do Visitante:**
- ✅ Campo obrigatório no cadastro
- ✅ Usado para envio de avisos

#### **Templates Editáveis:**
- ✅ Orientações sobre vestimentas
- ✅ Horários autorizados
- ✅ Número de visitas permitidas
- ✅ Regras da unidade
- ✅ Confirmação de agendamento

#### **Texto Padrão (Exemplo):**
```
O visitante deverá apresentar-se na entrada da unidade portando documento
de identificação com foto e vestindo roupas adequadas, conforme orientação prévia.

É proibida a entrada de visitantes com:
- Roupas transparentes, shorts, sutiã com armação
- Calça de cintura baixa, calça branca, legging
- Minissaia, mini blusas, roupas com decotes acentuados
- Boné, chapéu, gorro
- Relógio, joias, piercing, bijuterias
- Chaves, chaveiros, presilhas, grampos de cabelo
- Cinto e similares
- Carteiras, dinheiro, bolsa
- Cigarros e outros itens proibidos
```

### 6. **Alerta de Facções Rivais**
- ✅ Sistema detecta automaticamente visitante cadastrado para adolescentes de facções rivais
- ✅ Alerta visual destacado: "POSSÍVEL LEVA-E-TRAZ"
- ✅ Níveis de alerta: BAIXO, MÉDIO, ALTO, CRÍTICO
- ✅ Registro de visualização pelo operador
- ✅ Não impede entrada (apenas alerta)

### 7. **Relatório de Visitas do Mês**
- ✅ Quem compareceu
- ✅ Horário de entrada/saída
- ✅ Para qual adolescente foi a visita
- ✅ Filtros por data, casa, adolescente, visitante
- ✅ Exportação em PDF e Excel
- ✅ Estatísticas (adolescentes sem visitas)

### 8. **Particularidades Adicionais Implementadas**

#### **Bloqueio Temporário:**
- ✅ Visitante pode ser bloqueado temporariamente
- ✅ Motivo do bloqueio registrado
- ✅ Prazo de desbloqueio automático
- ✅ Operador responsável pelo bloqueio

#### **Agendamento Prévio:**
- ✅ Visitante pode agendar visita
- ✅ Confirmação automática por e-mail
- ✅ Controle de limite de agendamentos
- ✅ Status: AGENDADO, CONFIRMADO, REALIZADO, CANCELADO, NÃO_COMPARECEU

#### **Controle de Tempo:**
- ✅ Tempo máximo de visita (padrão: 2 horas)
- ✅ Alerta quando exceder tempo permitido
- ✅ Configurável

#### **Vistoria de Itens:**
- ✅ Checklist de itens vistoriados
- ✅ Confirmação de ausência de objetos proibidos
- ✅ Observações sobre vistoria

#### **Tipos de Visita:**
- ✅ REGULAR: Visita normal nos dias permitidos
- ✅ ESPECIAL: Visita extraordinária (aniversário, etc)
- ✅ JUDICIAL: Autorizada por ordem judicial

#### **Estatísticas Especiais:**
- ✅ Adolescentes que não recebem visitas (alerta para equipe técnica)
- ✅ Frequência de visitas por adolescente
- ✅ Visitantes mais assíduos
- ✅ Taxa de não-comparecimento

---

## 🗄️ Modelo de Dados

### **Visitante** (Atualizado)
```typescript
{
  // Dados básicos
  id, nomeCompleto, cpf, dataNascimento,
  enderecoCompleto, telefones, email,
  fotoUrl,

  // Reconhecimento facial
  faceEmbeddings, consentimentoBiometria, dataConsentimento,

  // Controle de acesso
  ativo, bloqueado, motivoBloqueio,
  dataBloqueio, dataDesbloqueio, operadorBloqueioId
}
```

### **AdolescenteVisitanteLink**
```typescript
{
  id, adolescenteId, visitanteId,
  parentesco, // "mãe", "tia", "irmão", etc (específico por adolescente)
  autorizado,
  observacoes
}
```

### **VisitaRegistro** (Expandido)
```typescript
{
  id, visitanteId, adolescenteId,
  dataHoraEntrada, dataHoraSaida,
  operadorEntradaId, operadorSaidaId,

  // Controles
  tipoVisita, // REGULAR, ESPECIAL, JUDICIAL
  periodoAutorizado, periodoRealizado, // MANHA, TARDE
  horarioDiferente, justificativaHorario,

  // Acompanhantes
  quantidadeAdultos, quantidadeCriancas,

  // Vistoria
  itensVistoriados, observacoesVistoria,
  fotoEntradaUrl,

  // Alertas
  alertaFaccaoRival, alertaHorario, alertaLimiteVisitas,
  observacoesAlertas,

  // Status
  status, // EM_ANDAMENTO, FINALIZADA, CANCELADA
  motivoCancelamento
}
```

### **ConfiguracaoVisitas**
```typescript
{
  diasPermitidos, // JSON: [6] = sábado

  limiteAdultosPadrao, limiteCriancasPadrao,
  habilitarRegraSegundoSabado,
  limiteAdultosSegundoSab, limiteCriancasSegundoSab,
  permitirAlternativa,

  idadeLimiteCrianca, // 12 anos

  casasManhaInicio, casasManhaFim, // 1-4
  casasTardeInicio, casasTardeFim, // 5-8
  horarioManhaInicio, horarioManhaFim,
  horarioTardeInicio, horarioTardeFim,

  quantidadeVisitasMensal, // 2
  tempoMaximoVisita, // 120 minutos
  limiteVisitantesSimultaneos
}
```

### **VisitaAgendamento**
```typescript
{
  id, visitanteId, adolescenteId,
  dataAgendada, periodoAgendado, horarioPreferido,
  quantidadeAdultos, quantidadeCriancas,
  status, motivoCancelamento,
  notificacaoEnviada, dataNotificacao
}
```

### **TemplateEmail**
```typescript
{
  id, nome, // ORIENTACOES_VISITA, CONFIRMACAO_AGENDAMENTO
  assunto, corpo, // Corpo com variáveis: {{nome}}, {{data}}
  ativo
}
```

### **NotificacaoVisitante**
```typescript
{
  id, visitanteId, tipoNotificacao,
  assunto, mensagem, emailDestinatario,
  statusEnvio, erroEnvio, dataEnvio
}
```

### **AlertaFaccaoRival**
```typescript
{
  id, visitanteId,
  faccao1Id, faccao2Id,
  adolescente1Id, adolescente2Id,
  nivelAlerta, // BAIXO, MEDIO, ALTO, CRITICO
  observacoes,
  visualizado, dataVisualizacao, operadorId
}
```

---

## 🔄 Fluxos de Uso

### **Fluxo 1: Cadastro de Visitante com Vínculos**
```
1. Operador acessa /visitantes
2. Clica "Novo Visitante"
3. Preenche dados pessoais (incluindo EMAIL)
4. Captura face (opcional)
5. Adiciona vínculos com adolescentes:
   - Seleciona adolescente A
   - Informa parentesco: "Mãe"
   - Seleciona adolescente B
   - Informa parentesco: "Tia"
6. Marca consentimento
7. Salva
8. Sistema envia e-mail com orientações automaticamente
```

### **Fluxo 2: Registro de Visita na Portaria**
```
1. Visitante chega na portaria
2. Operador abre /portaria
3. Identifica visitante (reconhecimento facial ou busca manual)
4. Sistema valida automaticamente:
   ✓ Visitante está ativo?
   ✓ Visitante está bloqueado?
   ✓ Adolescente está internado?
   ✓ É dia permitido?
   ✓ É horário correto para a casa?
   ✓ Visitante já atingiu limite de visitas do mês?
   ✓ Quantidade de acompanhantes está dentro do limite?
5. Sistema gera ALERTAS (se aplicável):
   ⚠️ Facção rival detectada
   ⚠️ Horário diferente do autorizado
   ⚠️ Limite de visitas atingido
6. Operador:
   - Visualiza alertas
   - Justifica horário diferente (se necessário)
   - Registra quantidade de acompanhantes
   - Marca itens vistoriados
   - Captura foto do dia
7. Sistema registra entrada com timestamp
8. Visitante entra
9. Ao sair, operador registra saída
10. Sistema calcula duração da visita
```

### **Fluxo 3: Agendamento de Visita**
```
1. Visitante liga ou acessa portal (futuro)
2. Operador registra agendamento em /visitas/agendar
3. Seleciona visitante, adolescente, data
4. Informa quantidade de acompanhantes
5. Sistema valida:
   - Data é dia permitido?
   - Limite de visitas não será excedido?
   - Quantidade de acompanhantes está OK?
6. Se OK, agenda
7. Sistema envia e-mail de confirmação automaticamente
8. No dia da visita, operador vincula agendamento ao registro
```

### **Fluxo 4: Envio de Notificações**
```
1. Administrador acessa /configuracoes/templates
2. Edita template "ORIENTACOES_VISITA"
3. Personaliza texto
4. Salva
5. Quando novo visitante é cadastrado:
   - Sistema substitui variáveis: {{nome}}, {{data}}
   - Envia e-mail automaticamente
   - Registra em NotificacaoVisitante
6. Operador pode reenviar manualmente se necessário
```

### **Fluxo 5: Alerta de Facção Rival**
```
1. Visitante Maria está cadastrada para:
   - Adolescente João (Facção: CV)
   - Adolescente Pedro (Facção: PCC)
2. Maria chega na portaria
3. Sistema detecta automaticamente:
   - CV e PCC são rivais (verificado em configuração de facções)
4. Gera alerta ALTO
5. Exibe na tela:
   "⚠️ ALERTA: POSSÍVEL LEVA-E-TRAZ"
   "Visitante cadastrado para adolescentes de facções rivais"
   - João (CV) x Pedro (PCC)
6. Operador visualiza
7. Operador decide:
   - Permite entrada (com observação)
   - Ou nega entrada
8. Tudo fica registrado para auditoria
```

---

## 📊 Relatórios Implementados

### **1. Relatório de Visitas do Mês**
**Filtros:**
- Mês/Ano
- Casa específica
- Adolescente específico
- Visitante específico
- Tipo de visita

**Colunas:**
- Data/Hora Entrada
- Data/Hora Saída
- Duração
- Visitante
- Adolescente
- Casa/Alojamento
- Quantidade de Acompanhantes
- Alertas Gerados
- Operador

**Exportação:** PDF, Excel

### **2. Relatório de Adolescentes Sem Visitas**
**Objetivo:** Identificar adolescentes que não recebem visitas (alerta para equipe técnica)

**Filtros:**
- Período (últimos 30/60/90 dias)
- Casa

**Informações:**
- Adolescente
- Tempo sem visitas
- Última visita (data)
- Casa atual
- Fase de internação

### **3. Estatísticas de Visitas**
**Métricas:**
- Total de visitas no mês
- Taxa de comparecimento (agendadas vs realizadas)
- Visitantes mais assíduos
- Horários de pico
- Média de duração de visitas
- Alertas mais frequentes

---

## 🔧 Configurações do Sistema

### **Painel de Configurações** (`/configuracoes/visitas`)

**Dias e Horários:**
- Dias da semana permitidos (checkbox)
- Horário manhã: início e fim
- Horário tarde: início e fim
- Casas período manhã: de ___ até ___
- Casas período tarde: de ___ até ___

**Limites de Visitantes:**
- Adultos padrão: ___
- Crianças padrão: ___
- Idade limite criança: ___ anos
- Habilitar regra segundo sábado: [ ]
  - Adultos: ___
  - Crianças: ___
  - Permitir alternativa (2+1 ou 1+2): [ ]

**Limites Mensais:**
- Quantidade de visitas por mês: ___
- Tempo máximo por visita: ___ minutos
- Limite simultâneo na unidade: ___ (opcional)

**Botões:**
- [Salvar Configurações]
- [Restaurar Padrões]

---

## 🎨 Interfaces

### **1. Tela de Cadastro de Visitante** (atualizada)
- Dados pessoais (incluindo EMAIL obrigatório)
- Captura facial
- **NOVO:** Seção "Vínculos com Adolescentes"
  - [+ Adicionar Vínculo]
  - Lista de vínculos:
    - Adolescente: [Select]
    - Parentesco: [Input text]
    - Autorizado: [Checkbox]
    - [Remover]

### **2. Tela de Portaria** (atualizada)
- Identificação do visitante
- **NOVO:** Painel de Validações
  - ✅ Status do visitante
  - ✅ Status dos adolescentes vinculados
  - ✅ Limite de visitas
  - ✅ Dia/horário permitido
- **NOVO:** Painel de Alertas
  - ⚠️ Facção rival (destaque vermelho)
  - ⚠️ Horário diferente
  - ⚠️ Limite atingido
- **NOVO:** Formulário de Registro
  - Adolescente a visitar: [Select]
  - Tipo de visita: [Select]
  - Quantidade adultos: [Number]
  - Quantidade crianças: [Number]
  - Justificativa horário: [Textarea] (se necessário)
  - Itens vistoriados: [Checkboxes]
  - Observações: [Textarea]
  - [Capturar Foto do Dia]
  - [Registrar Entrada]

### **3. Tela de Gerenciamento de Visitas** (`/visitas`)
- Tabs: Em Andamento | Histórico | Agendamentos
- Lista de visitas em andamento
- Tempo decorrido (atualização em tempo real)
- Alerta se exceder tempo máximo
- Botão [Registrar Saída]

### **4. Tela de Configurações** (`/configuracoes/visitas`)
- Formulário com todos os parâmetros
- Validações em tempo real
- Preview das regras

### **5. Tela de Templates de E-mail** (`/configuracoes/templates`)
- Lista de templates
- Editor WYSIWYG
- Variáveis disponíveis: {{nome}}, {{data}}, {{horario}}, {{adolescente}}
- Preview do e-mail
- [Testar Envio]

### **6. Tela de Relatórios** (`/relatorios/visitas`)
- Filtros dinâmicos
- Tabela com resultados
- Gráficos de estatísticas
- Botões [Exportar PDF] [Exportar Excel]

---

## 🔐 Validações e Regras de Negócio

### **Regras de Entrada:**
1. Visitante deve estar ATIVO
2. Visitante NÃO deve estar BLOQUEADO
3. Adolescente deve estar com status INTERNADO
4. Deve ser dia permitido (configurável)
5. Quantidade de adultos/crianças deve estar dentro do limite
6. Limite mensal de visitas não deve ser excedido
7. Se horário diferente, justificativa é OBRIGATÓRIA

### **Cálculo de Segundo Sábado:**
```typescript
function isSegundoSabado(data: Date): boolean {
  const primeiroDia = new Date(data.getFullYear(), data.getMonth(), 1);
  const diaSemana = primeiroDia.getDay();
  const diasAteSegundoSabado = (6 - diaSemana + 7) % 7 + 7;
  const segundoSabado = new Date(data.getFullYear(), data.getMonth(), diasAteSegundoSabado);
  return data.toDateString() === segundoSabado.toDateString();
}
```

### **Detecção de Facção Rival:**
```typescript
async function verificarFaccaoRival(visitanteId: string): Promise<Alerta | null> {
  const vinculos = await prisma.adolescenteVisitanteLink.findMany({
    where: { visitanteId },
    include: {
      adolescente: {
        include: { faccaoGrupo: true }
      }
    }
  });

  const faccoes = vinculos.map(v => v.adolescente.faccaoGrupo).filter(Boolean);

  for (let i = 0; i < faccoes.length; i++) {
    for (let j = i + 1; j < faccoes.length; j++) {
      if (saoFaccoesRivais(faccoes[i], faccoes[j])) {
        return criarAlertaFaccaoRival(/* ... */);
      }
    }
  }

  return null;
}
```

---

## 📧 Sistema de E-mails

### **Configuração SMTP:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=cense.maringa@example.com
SMTP_PASS=senha_app
SMTP_FROM=CENSE Maringá <noreply@cense-maringa.gov.br>
```

### **Templates Padrão:**

**1. ORIENTACOES_VISITA:**
```
Assunto: Orientações para Visita - CENSE Maringá

Prezado(a) {{nome}},

Informamos que você está cadastrado(a) para visitar {{adolescente}}
no CENSE Maringá.

[... texto configurável ...]

Atenciosamente,
Equipe CENSE Maringá
```

**2. CONFIRMACAO_AGENDAMENTO:**
```
Assunto: Visita Agendada - {{data}}

Prezado(a) {{nome}},

Sua visita foi agendada com sucesso!

Data: {{data}}
Horário: {{horario}}
Adolescente: {{adolescente}}

Por favor, chegue com 15 minutos de antecedência.

[Cancelar Agendamento]
```

**3. ALERTA_BLOQUEIO:**
```
Assunto: Acesso Temporariamente Bloqueado

Prezado(a) {{nome}},

Informamos que seu acesso à unidade foi temporariamente bloqueado.

Motivo: {{motivo}}
Prazo: até {{data_desbloqueio}}

Para mais informações, entre em contato.
```

---

## 📈 Priorização de Implementação

Dado o tamanho do sistema, sugiro implementação em **3 fases**:

### **FASE 1: Núcleo do Sistema** (Crítico)
1. Atualização do schema Prisma ✅
2. Migration do banco
3. API de vínculos visitante-adolescente
4. Validação de status do adolescente
5. Formulário de cadastro com vínculos
6. Configurações básicas de visitas

### **FASE 2: Controles e Validações** (Importante)
1. Regras de quantidade de visitantes
2. Regras de horário por casa
3. Registro de visita completo
4. Alertas na portaria
5. Detecção de facção rival
6. Interface de portaria atualizada

### **FASE 3: Comunicação e Relatórios** (Complementar)
1. Sistema de templates de e-mail
2. API de envio de e-mails
3. Agendamento de visitas
4. Relatório de visitas do mês
5. Estatísticas de visitas
6. Relatório de adolescentes sem visitas

---

## 🚀 Próximos Passos

Qual fase gostaria que eu implementasse primeiro?

**Opções:**
1. **Fase 1 Completa** (base sólida, depois expandimos)
2. **Direto para Fase 2** (assumindo que Fase 1 está OK)
3. **Funcionalidade específica** (ex: apenas alertas de facção)
4. **Implementação completa** (todas as fases - vai levar tempo!)

Aguardo sua decisão para prosseguir! 🎯
