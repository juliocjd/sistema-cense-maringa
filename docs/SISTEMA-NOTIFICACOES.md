# Sistema de Notificações por Email - CENSE Maringá

## Visão Geral

O Sistema de Notificações permite o envio automático de emails para visitantes, utilizando templates customizáveis e rastreamento completo do histórico de envios.

## Componentes do Sistema

### 1. Templates de Email

#### Estrutura de Templates

Os templates são armazenados no banco de dados através da tabela `TemplateEmail` e podem ser gerenciados pela interface administrativa.

**Campos do Template:**
- `nome`: Identificador único do template (ex: ORIENTACOES_VISITA, VISITANTE_CADASTRADO)
- `assunto`: Assunto do email
- `corpo`: Corpo do email em texto simples
- `ativo`: Status do template (ativo/inativo)

#### Variáveis Dinâmicas

Os templates suportam variáveis usando a sintaxe `{{variavel}}`:

```text
Olá {{nome}},

Seu cadastro foi realizado com sucesso em {{data}}.

Atenciosamente,
CENSE Maringá
```

**Variáveis Disponíveis:**
- `{{nome}}` - Nome do visitante
- `{{data}}` - Data formatada
- `{{hora}}` - Hora formatada
- Qualquer outro campo pode ser passado como variável

### 2. Envio de Emails

#### Configuração SMTP

Configure as variáveis de ambiente no arquivo `.env`:

```env
# Configurações de Email (opcional - se não configurado, emails serão logados apenas)
EMAIL_HOST=smtp.exemplo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-usuario@exemplo.com
EMAIL_PASSWORD=sua-senha
EMAIL_FROM=noreply@cense.pr.gov.br
```

**Nota:** Se as configurações SMTP não estiverem definidas, o sistema apenas registrará as notificações no banco mas não enviará emails reais.

#### Processo de Envio

1. **Criação da Notificação**: Registro criado na tabela `NotificacaoVisitante` com status `PENDENTE`
2. **Tentativa de Envio**: Sistema tenta enviar o email via SMTP
3. **Atualização de Status**:
   - `ENVIADO`: Email enviado com sucesso
   - `FALHA`: Falha no envio (pode ser reenviado)
   - `ERRO`: Erro crítico no envio

### 3. APIs Disponíveis

#### GET /api/email/templates
Lista todos os templates de email cadastrados.

**Resposta:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "nome": "ORIENTACOES_VISITA",
      "assunto": "Orientações para Visita - CENSE Maringá",
      "corpo": "Olá {{nome}}...",
      "ativo": true,
      "criadoEm": "2025-11-19T10:00:00Z",
      "atualizadoEm": "2025-11-19T10:00:00Z"
    }
  ]
}
```

#### POST /api/email/templates
Cria um novo template de email.

**Requisição:**
```json
{
  "nome": "NOVO_TEMPLATE",
  "assunto": "Assunto do Email",
  "corpo": "Corpo do email com {{variaveis}}",
  "ativo": true
}
```

#### PATCH /api/email/templates/[id]
Atualiza um template existente.

**Requisição:**
```json
{
  "assunto": "Novo assunto",
  "corpo": "Novo corpo",
  "ativo": false
}
```

#### DELETE /api/email/templates/[id]
Exclui um template (apenas se não estiver sendo usado).

#### GET /api/email/notificacoes
Lista o histórico de notificações enviadas.

**Parâmetros de Query (opcional):**
- `limit`: Número de registros (padrão: 50)
- `offset`: Paginação

**Resposta:**
```json
{
  "notificacoes": [
    {
      "id": "uuid",
      "tipoNotificacao": "ORIENTACOES_VISITA",
      "assunto": "Orientações para Visita",
      "mensagem": "Olá João...",
      "emailDestinatario": "joao@exemplo.com",
      "statusEnvio": "ENVIADO",
      "dataEnvio": "2025-11-19T10:05:00Z",
      "erroEnvio": null,
      "criadoEm": "2025-11-19T10:00:00Z",
      "visitante": {
        "id": "uuid",
        "nomeCompleto": "João Silva"
      }
    }
  ],
  "total": 1
}
```

#### POST /api/email/enviar
Envia um email customizado para um visitante.

**Requisição:**
```json
{
  "visitanteId": "uuid",
  "emailDestinatario": "email@exemplo.com",
  "assunto": "Assunto do Email",
  "mensagem": "Corpo do email"
}
```

**Resposta:**
```json
{
  "sucesso": true,
  "notificacaoId": "uuid"
}
```

#### POST /api/email/reenviar
Reenvia uma notificação que falhou.

**Requisição:**
```json
{
  "notificacaoId": "uuid"
}
```

### 4. Funções Helper

#### lib/email/templates.ts

```typescript
// Busca template e preenche com variáveis
const template = await obterTemplatePreenchido(
  "ORIENTACOES_VISITA",
  { nome: "João", data: "19/11/2025" }
);
// Retorna: { assunto: "...", corpo: "Olá João..." }
```

#### lib/email/sender.ts

```typescript
// Envia email e registra no banco
const resultado = await enviarEmail(
  visitanteId,
  "ORIENTACOES_VISITA",
  "Assunto do Email",
  "Corpo do email",
  "email@exemplo.com"
);
// Retorna: { sucesso: true, notificacaoId: "uuid" }
```

#### lib/email/auto-notificacoes.ts

```typescript
// Envia orientações automaticamente quando visitante é cadastrado
await enviarOrientacoesVisitante(
  visitanteId,
  "João Silva",
  "joao@exemplo.com"
);

// Envia email customizado
await enviarEmailCustomVisitante(
  visitanteId,
  "joao@exemplo.com",
  "Assunto",
  "Mensagem"
);
```

## Interface de Gerenciamento

### Painel de Templates (/configuracoes/email)

**Funcionalidades:**
- ✅ Criar novos templates
- ✅ Editar templates existentes
- ✅ Ativar/desativar templates
- ✅ Excluir templates não utilizados
- ✅ Visualizar prévia do corpo do email

### Painel de Notificações (/configuracoes/email)

**Funcionalidades:**
- ✅ Visualizar histórico de notificações
- ✅ Filtrar por status (Enviado, Pendente, Falha, Erro)
- ✅ Buscar por visitante, email ou assunto
- ✅ Reenviar notificações que falharam
- ✅ Ver detalhes de erros
- ✅ Estatísticas de envio (total, enviadas, pendentes, falhas)
- ✅ Auto-refresh a cada 30 segundos

## Fluxo de Uso

### 1. Cadastro de Visitante com Notificação Automática

```typescript
// Após criar visitante
const visitante = await prisma.visitante.create({ ... });

// Enviar orientações automaticamente (se email configurado)
if (visitante.email) {
  await enviarOrientacoesVisitante(
    visitante.id,
    visitante.nomeCompleto,
    visitante.email
  );
}
```

### 2. Envio de Email Customizado

```typescript
// Via API
await fetch('/api/email/enviar', {
  method: 'POST',
  body: JSON.stringify({
    visitanteId: 'uuid',
    emailDestinatario: 'email@exemplo.com',
    assunto: 'Confirmação de Visita',
    mensagem: 'Sua visita está confirmada para 20/11/2025'
  })
});
```

### 3. Monitoramento de Envios

1. Acesse [/configuracoes/email](configuracoes/email)
2. Clique na aba "Histórico de Notificações"
3. Visualize o status de cada envio
4. Reenvie notificações que falharam, se necessário

## Templates Padrão Recomendados

### ORIENTACOES_VISITA
Enviado automaticamente após cadastro do visitante.

```text
Assunto: Orientações para Visita - CENSE Maringá

Olá {{nome}},

Seu cadastro foi realizado com sucesso no Sistema de Visitantes do CENSE Maringá.

Para realizar visitas, é necessário:
- Apresentar documento com foto
- Chegar com 15 minutos de antecedência
- Respeitar as normas de segurança da unidade

Em caso de dúvidas, entre em contato com a unidade.

Atenciosamente,
Equipe CENSE Maringá
```

### VISITANTE_CADASTRADO
Confirmação de cadastro.

```text
Assunto: Cadastro Confirmado - CENSE Maringá

Olá {{nome}},

Seu cadastro no Sistema de Visitantes foi confirmado em {{data}}.

Você já pode agendar visitas através do sistema.

Atenciosamente,
Equipe CENSE Maringá
```

### VISITA_CONFIRMADA
Confirmação de visita agendada.

```text
Assunto: Visita Confirmada - CENSE Maringá

Olá {{nome}},

Sua visita está confirmada para {{data}} às {{hora}}.

Adolescente: {{adolescente}}
Local: {{casa}}

Lembre-se de trazer documento com foto.

Atenciosamente,
Equipe CENSE Maringá
```

### ALERTA_BLOQUEIO
Notificação sobre bloqueio de visitante.

```text
Assunto: Importante - Bloqueio de Visitas

Olá {{nome}},

Informamos que suas visitas foram temporariamente bloqueadas.

Motivo: {{motivo}}

Para mais informações, entre em contato com a unidade.

Atenciosamente,
Equipe CENSE Maringá
```

## Segurança e Boas Práticas

### 1. Proteção de Dados
- ❌ Nunca incluir senhas ou informações sensíveis nos emails
- ✅ Usar HTTPS/TLS para envio de emails
- ✅ Validar endereços de email antes do envio
- ✅ Registrar todas as tentativas de envio no banco

### 2. Gestão de Templates
- ✅ Revisar templates antes de ativar
- ✅ Testar templates com dados de exemplo
- ✅ Manter templates inativos para histórico
- ❌ Não excluir templates em uso

### 3. Monitoramento
- ✅ Verificar regularmente notificações com falha
- ✅ Investigar padrões de erro (SMTP down, emails inválidos)
- ✅ Manter logs de auditoria de envios
- ✅ Reenviar notificações importantes que falharam

### 4. Performance
- ⚡ Emails são enviados de forma assíncrona
- ⚡ Sistema continua funcionando mesmo se SMTP não estiver configurado
- ⚡ Auto-refresh do painel a cada 30 segundos para economia de recursos

## Troubleshooting

### Email não está sendo enviado

1. **Verificar configuração SMTP**
   ```bash
   # Checar variáveis de ambiente
   echo $EMAIL_HOST
   echo $EMAIL_USER
   ```

2. **Verificar logs do servidor**
   - Procurar por "⚠️ SMTP não configurado" nos logs
   - Verificar erros de autenticação SMTP

3. **Testar conexão SMTP manualmente**
   ```bash
   telnet smtp.exemplo.com 587
   ```

### Email marcado como spam

1. Configurar SPF, DKIM e DMARC no DNS do domínio
2. Usar um serviço de email profissional (SendGrid, Amazon SES, etc.)
3. Evitar palavras gatilho no assunto e corpo

### Notificações com status ERRO

1. Verificar o campo `erroEnvio` na notificação
2. Corrigir o problema (email inválido, SMTP down, etc.)
3. Usar o botão "Reenviar" no painel

## Próximas Melhorias Planejadas

### Fase 6 - Relatórios
- [ ] Relatório mensal de visitas (PDF/Excel)
- [ ] Estatísticas detalhadas de notificações
- [ ] Gráficos de taxa de sucesso de envio

### Fase 7 - Auto-exclusão de Fotos (LGPD)
- [ ] Exclusão automática de fotos após 60 dias
- [ ] Notificação por email antes da exclusão
- [ ] Opção de renovação de consentimento

### Melhorias Futuras
- [ ] Templates com HTML rico
- [ ] Agendamento de envio de emails
- [ ] Integração com WhatsApp Business API
- [ ] Notificações push para app mobile

## Suporte

Para dúvidas ou problemas com o sistema de notificações:

1. Verificar esta documentação
2. Consultar os logs do sistema
3. Contatar o administrador do sistema
4. Reportar bugs no repositório do projeto
