# 🏛️ Sistema CENSE Maringá

**Sistema de Inteligência e Gestão Socioeducativa**

Sistema completo para gerenciamento de adolescentes em medida socioeducativa no Centro de Socioeducação (CENSE) de Maringá - PR.

[![Next.js](https://img.shields.io/badge/Next.js-14+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5+-green)](https://www.prisma.io/)

---

## 🎯 Sobre o Sistema

Sistema desenvolvido para otimizar a gestão socioeducativa através de:

- **Mapa Visual Interativo**: Visualização em tempo real da ocupação de alojamentos
- **Inteligência de Alocação**: Sistema de 5 níveis de análise de risco para alocação de adolescentes
- **Gestão de Conflitos**: Rastreamento e mediação de conflitos interpessoais
- **Dossiê Digital**: Prontuário completo com 8 abas de informações
- **Auditoria Completa**: Log de todas as operações críticas do sistema
- **Gestão de Grupos**: Controle de facções e grupos com verificação de conflitos

---

## ✨ Funcionalidades Principais

### 🗺️ Mapa Visual Interativo
- Visualização das 8 casas e 78 alojamentos em tempo real
- Indicadores visuais de ocupação e status de manutenção
- Sistema de cores por nível de risco
- Alocação com um clique

### 🧠 Sistema de Inteligência
- **5 Níveis de Análise de Risco**:
  - Nível 5 (CRÍTICO): Conflitos frontais
  - Nível 4 (ALTO): Mesma ala
  - Nível 3 (MÉDIO-ALTO): Mesma casa, ala diferente
  - Nível 2 (MÉDIO): Zona de risco (janelas)
  - Nível 1 (BAIXO): Sem conflitos

### 📋 Gestão de Adolescentes
- Cadastro completo com validações
- Upload de fotos
- Dossiê digital com 8 abas:
  - Dados Básicos
  - Família
  - Saúde
  - Educação
  - Histórico Criminal
  - Conflitos
  - Grupos
  - Auditoria

### ⚔️ Gestão de Conflitos
- Registro de conflitos com níveis de gravidade
- Mediações e acompanhamento
- Resolução de conflitos
- Histórico completo

### 👥 Gestão de Grupos
- Cadastro de facções/grupos
- Associação de membros com verificação de conflitos
- Controle hierárquico
- Alertas automáticos

### 📊 Relatórios e Auditoria
- Log completo de todas as operações
- Decisões operacionais documentadas
- Rastreabilidade total
- Exportação de dados

---

## 🚀 Início Rápido

### Guia Completo de Instalação

Para instruções detalhadas de instalação e configuração, consulte:

**📘 [Guia de Instalação Completo](docs/GUIA-INSTALACAO-COMPLETO.md)**

Resumo:

```bash
# 1. Clonar repositório
git clone https://github.com/seu-usuario/sistema-cense-maringa.git
cd sistema-cense-maringa

# 2. Instalar dependências
npm install

# 3. Configurar .env
cp .env.example .env
# Editar .env com suas configurações

# 4. Aplicar migrações do banco
npx prisma migrate deploy

# 5. Popular papéis/permissões e operador padrão
npx tsx prisma/seed-auth.ts

# 6. Configurar monitoramento (Sentry)
# - Crie ou associe um projeto no Sentry usando o email censeinteligencia@gmail.com
# - Copie o DSN para as variáveis SENTRY_DSN e NEXT_PUBLIC_SENTRY_DSN
# - No painel do Sentry, crie um alerta por email para censeinteligencia@gmail.com

# 7. Criar estrutura inicial (8 casas + 78 alojamentos)
curl -X POST http://localhost:3000/api/estrutura/inicializar

# 8. Iniciar servidor
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## 📁 Estrutura do Projeto

```
sistema-cense-maringa/
├── app/                           # Rotas Next.js 14+ (App Router)
│   ├── (auth)/                    # Grupo de rotas de autenticação
│   │   └── login/                 # Página e formulário de login
│   ├── (dashboard)/               # Grupo de rotas do dashboard
│   │   ├── adolescentes/          # CRUD de adolescentes
│   │   │   ├── [id]/             # Dossiê individual (8 abas)
│   │   │   ├── novo/             # Cadastro de novo adolescente
│   │   │   └── page.tsx          # Listagem de adolescentes
│   │   ├── conflitos/             # Gestão de conflitos
│   │   ├── grupos/                # Gestão de grupos/facções
│   │   ├── mapa/                  # Mapa visual interativo
│   │   └── relatorios/            # Relatórios e auditoria
│   ├── api/                       # Endpoints da API REST
│   │   ├── adolescentes/          # CRUD de adolescentes
│   │   ├── alocar/                # Alocação de adolescente
│   │   ├── casas/                 # Dados das casas
│   │   ├── conflitos/             # Gestão de conflitos
│   │   ├── estrutura/             # Inicialização da estrutura
│   │   ├── grupos/                # Gestão de grupos
│   │   ├── operadores/            # Login e cadastro de operadores
│   │   └── verificar-alocacao/    # Análise de risco (5 níveis)
│   ├── globals.css                # Estilos globais + Tailwind
│   ├── layout.tsx                 # Layout raiz
│   └── page.tsx                   # Página inicial (redirect)
├── components/                    # Componentes React
│   ├── cadastro/                  # Formulários de cadastro
│   ├── dossie/                    # Componentes do dossiê (8 abas)
│   ├── layout/                    # Header, sidebar, nav
│   ├── mapa/                      # Mapa interativo
│   └── ui/                        # Componentes UI base (shadcn)
├── hooks/                         # React Hooks customizados
│   └── useAuth.ts                 # Hook de autenticação
├── lib/                           # Bibliotecas e utilitários
│   ├── auth.ts                    # JWT e autenticação
│   ├── prisma.ts                  # Cliente Prisma singleton
│   └── utils.ts                   # Funções utilitárias
├── prisma/
│   └── schema.prisma              # Schema do banco (30+ tabelas)
├── docs/                          # Documentação completa
│   ├── GUIA-INSTALACAO-COMPLETO.md
│   ├── GUIA-DEPLOY-PRODUCAO.md
│   ├── GUIA-TROUBLESHOOTING.md
│   ├── README-*.md                # Docs de cada módulo
│   └── MAPA-INTEGRACAO-COMPLETA.md
├── public/                        # Arquivos estáticos
├── .env                           # Variáveis de ambiente (NÃO commitar)
├── .env.example                   # Template de variáveis
├── next.config.js                 # Configuração Next.js
├── package.json                   # Dependências do projeto
├── tailwind.config.ts             # Configuração Tailwind CSS
└── tsconfig.json                  # Configuração TypeScript
```

## 🔧 Tecnologias Utilizadas

| Categoria | Tecnologia | Versão |
|-----------|------------|--------|
| **Framework** | Next.js | 14+ |
| **Linguagem** | TypeScript | 5.0+ |
| **Banco de Dados** | PostgreSQL | 16+ |
| **ORM** | Prisma | 5+ |
| **Estilização** | Tailwind CSS | 3+ |
| **UI Components** | shadcn/ui | - |
| **Autenticação** | NextAuth / JWT | - |
| **Monitoramento** | Sentry | - |
| **Validação** | Zod | - |
| **Gerenciamento de Estado** | React Hooks | - |

---

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento

# Build e Produção
npm run build            # Build otimizado para produção
npm start                # Inicia servidor de produção

# Prisma (Banco de Dados)
npm run db:generate      # Gera Prisma Client
npm run db:push          # Sincroniza schema com o banco
npm run db:studio        # Abre interface visual (http://localhost:5555)

# Qualidade de Código
npm run lint             # Verifica erros de linting
npm run type-check       # Verifica erros TypeScript

# Testes (se configurado)
npm test                 # Roda testes
```

---

## 📖 Documentação Completa

### 📘 Guias Principais

| Documento | Descrição |
|-----------|-----------|
| **[Guia de Instalação](docs/GUIA-INSTALACAO-COMPLETO.md)** | Instalação passo a passo do zero até sistema funcionando |
| **[Guia de Deploy](docs/GUIA-DEPLOY-PRODUCAO.md)** | Deploy em produção com servidor dedicado, Nginx, SSL |
| **[Guia de Troubleshooting](docs/GUIA-TROUBLESHOOTING.md)** | Solução de problemas comuns e comandos úteis |

### 📄 Documentação Técnica

| Documento | Descrição |
|-----------|-----------|
| **[Documentação Completa](docs/SISTEMA-CENSE-MARINGA-Documentacao-Completa.md)** | Especificação técnica completa (1400+ linhas) |
| **[APIs de Inteligência](docs/README-APIS-INTELIGENCIA.md)** | Documentação das 8 APIs de inteligência |
| **[Relatório de Status](docs/RELATORIO-STATUS-PROJETO.md)** | Status atual de implementação vs documentação |
| **[Mapa de Integração](docs/MAPA-INTEGRACAO-COMPLETA.md)** | Integração 100% do mapa com APIs |
| **[Correções de Integração](docs/CORRECOES-MAPA-INTEGRACAO.md)** | Issues corrigidos no mapa visual |

### 📚 Documentação por Módulo

| Documento | Descrição |
|-----------|-----------|
| **[Layout](docs/README-LAYOUT.MD)** | Estrutura do dashboard e navegação |
| **[Cadastro](docs/README-CADASTRO.md)** | Sistema de cadastro de adolescentes |
| **[Listagem](docs/README-LISTAGEM.md)** | Listagem e busca de adolescentes |
| **[Dossiê](docs/README-DOSSIE.md)** | Prontuário digital (8 abas) |
| **[Conflitos](docs/README-CONFLITOS.md)** | Gestão de conflitos e mediações |

---

## 🚢 Deploy em Produção

Para deploy completo em servidor dedicado (Ubuntu + Nginx + SSL):

**📘 [Guia de Deploy em Produção](docs/GUIA-DEPLOY-PRODUCAO.md)**

Inclui:
- Configuração de servidor Ubuntu
- PostgreSQL otimizado
- PM2 para gerenciamento de processos
- Nginx como proxy reverso
- Certificado SSL com Let's Encrypt
- Backup automático
- Monitoramento
- CI/CD com GitHub Actions

## 🎯 Arquitetura e Banco de Dados

### Estrutura do Banco de Dados

O sistema utiliza **30+ tabelas** organizadas em módulos:

#### Tabelas Principais:
- **Operador**: Usuários do sistema (operadores socioeducativos)
- **Adolescente**: Dados dos adolescentes em medida socioeducativa
- **Casa** e **Alojamento**: Estrutura física (8 casas, 78 alojamentos)
- **Conflito**: Registro de conflitos interpessoais
- **Grupo**: Facções e grupos (ex: PCC, CV, gangues locais)
- **LogAuditoria**: Auditoria completa de todas as operações
- **DecisaoOperacional**: Decisões de risco documentadas

Para detalhes completos, consulte: **[Documentação Completa](docs/SISTEMA-CENSE-MARINGA-Documentacao-Completa.md)**

### APIs Disponíveis

O sistema possui **20+ endpoints REST**, incluindo:

#### APIs de Inteligência:
- `GET /api/verificar-alocacao` - Análise de risco em 5 níveis
- `POST /api/alocar` - Alocação de adolescente com auditoria
- `POST /api/grupos/[id]/adicionar-membro` - Adicionar membro com verificação de conflitos
- `POST /api/conflitos/[id]/mediacoes` - Registrar mediação
- `POST /api/conflitos/[id]/resolver` - Resolver conflito

Para documentação completa das APIs: **[APIs de Inteligência](docs/README-APIS-INTELIGENCIA.md)**

---

## 🔐 Segurança

### Medidas Implementadas

- ✅ **Senhas**: Hash bcrypt (salt rounds: 10)
- ✅ **Autenticação**: JWT com expiração configurável (8h padrão)
- ✅ **Cookies**: HttpOnly, Secure, SameSite=Strict
- ✅ **CORS**: Configurado para domínios específicos
- ✅ **Rate Limiting**: Proteção contra força bruta
- ✅ **SQL Injection**: Proteção via Prisma ORM
- ✅ **XSS**: Sanitização de inputs
- ✅ **Auditoria**: Log completo de todas as operações críticas
- ✅ **TypeScript**: Tipagem forte para prevenir erros

### Variáveis de Ambiente Sensíveis

```env
JWT_SECRET=           # MÍNIMO 32 caracteres
COOKIE_SECRET=        # Única e forte
SESSION_SECRET=       # Diferente das outras
DATABASE_URL=         # Nunca expor publicamente
```

**Gerar chaves seguras:**
```bash
openssl rand -base64 64
```

---

## 📊 Status do Projeto

### ✅ Módulos Implementados (100%)

- [x] **Autenticação**: Login, logout, JWT, cookies
- [x] **Layout**: Dashboard responsivo, sidebar, header
- [x] **Cadastro de Adolescentes**: Formulário completo com validações
- [x] **Listagem de Adolescentes**: Cards, busca, filtros
- [x] **Dossiê Completo**: 8 abas (Dados, Família, Saúde, Educação, Criminal, Conflitos, Grupos, Auditoria)
- [x] **Mapa Visual**: 8 casas, 78 alojamentos, visualização em tempo real
- [x] **Sistema de Alocação**: 5 níveis de análise de risco
- [x] **Gestão de Conflitos**: CRUD completo, mediações, resolução
- [x] **Gestão de Grupos**: CRUD, adição de membros com verificação
- [x] **APIs de Inteligência**: 8 APIs implementadas
- [x] **Auditoria**: Log completo de operações

### 🔄 Em Desenvolvimento

- [ ] Módulo de Relatórios
- [ ] Dashboard de Estatísticas
- [ ] Sistema de Notificações
- [ ] Exportação de Dados (PDF, Excel)

### 📈 Próximos Passos

1. Implementar módulo de relatórios gerenciais
2. Adicionar dashboard com gráficos e estatísticas
3. Sistema de notificações em tempo real (WebSocket)
4. Módulo de eventos especiais
5. Sistema de backup automático
6. Testes automatizados (Jest + Testing Library)

Para detalhes: **[Relatório de Status](docs/RELATORIO-STATUS-PROJETO.md)**

---

## 🤝 Contribuindo

Este é um projeto interno do CENSE Maringá. Para contribuir:

### Fluxo de Trabalho

1. **Fork** o repositório
2. **Crie uma branch** para sua feature:
   ```bash
   git checkout -b feature/minha-funcionalidade
   ```
3. **Commit** suas mudanças:
   ```bash
   git commit -m 'feat: adiciona nova funcionalidade X'
   ```
4. **Push** para a branch:
   ```bash
   git push origin feature/minha-funcionalidade
   ```
5. **Abra um Pull Request** descrevendo suas mudanças

### Convenções de Commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: nova funcionalidade
fix: correção de bug
docs: alteração na documentação
style: formatação de código
refactor: refatoração de código
test: adição de testes
chore: tarefas de manutenção
```

---

## 🆘 Suporte e Troubleshooting

### Em Caso de Problemas

1. **Verifique a instalação**:
   - Node.js v18+
   - PostgreSQL rodando
   - Variáveis de ambiente configuradas

2. **Consulte a documentação**:
   - **[Guia de Troubleshooting](docs/GUIA-TROUBLESHOOTING.md)** - Soluções para 20+ problemas comuns

3. **Verifique os logs**:
   ```bash
   # Desenvolvimento
   npm run dev

   # Produção
   pm2 logs cense-maringa --lines 100
   ```

4. **Comandos úteis de diagnóstico**:
   ```bash
   # Status do banco
   sudo systemctl status postgresql

   # Testar conexão
   npx prisma db pull

   # Verificar portas
   sudo lsof -i :3000
   ```

### Problemas Comuns

| Problema | Solução |
|----------|---------|
| Porta 3000 em uso | `kill -9 $(lsof -t -i:3000)` |
| Banco não conecta | Verificar `DATABASE_URL` no `.env` |
| Prisma Client outdated | `npx prisma generate` |
| Build falha | `rm -rf .next && npm run build` |

Para mais detalhes: **[Guia de Troubleshooting](docs/GUIA-TROUBLESHOOTING.md)**

---

## 📝 Licença

Este sistema é de **uso interno exclusivo** do Centro de Socioeducação de Maringá - PR.

Desenvolvido para atender às necessidades específicas da unidade socioeducativa, seguindo as diretrizes do SINASE (Sistema Nacional de Atendimento Socioeducativo).

---

## 👥 Equipe

**Desenvolvido para:**
- Centro de Socioeducação de Maringá - PR
- Governo do Estado do Paraná

**Tecnologia:**
- Sistema desenvolvido com Next.js 14, TypeScript, PostgreSQL e Prisma

---

## 📞 Contato

Para dúvidas, suporte ou sugestões:

- **Email**: suporte@cense-maringa.pr.gov.br
- **Documentação**: Consulte os guias em `/docs`
- **Issues**: Abra uma issue no repositório

---

<div align="center">

**Sistema CENSE Maringá v2.0**

*Sistema de Inteligência e Gestão Socioeducativa*

[![Status](https://img.shields.io/badge/Status-Produção--Ready-success)](.)
[![Docs](https://img.shields.io/badge/Docs-Completa-blue)](docs/)

**Desenvolvido com ❤️ para o CENSE Maringá**

</div>
