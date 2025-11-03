# 🚀 Guia de Instalação Completo - Sistema CENSE Maringá

**Última atualização:** 03 de Novembro de 2025
**Versão do Sistema:** 2.0

---

## 📋 Índice

1. [Pré-requisitos](#-pré-requisitos)
2. [Instalação do Ambiente](#-instalação-do-ambiente)
3. [Configuração do Banco de Dados](#-configuração-do-banco-de-dados)
4. [Instalação das Dependências](#-instalação-das-dependências)
5. [Variáveis de Ambiente](#-variáveis-de-ambiente)
6. [Inicialização da Estrutura](#-inicialização-da-estrutura)
7. [Primeiro Acesso](#-primeiro-acesso)
8. [Criação de Dados de Teste](#-criação-de-dados-de-teste)
9. [Verificação da Instalação](#-verificação-da-instalação)
10. [Troubleshooting](#-troubleshooting)

---

## 📦 Pré-requisitos

### **Mínimo Necessário:**

- **Node.js:** v18.0.0 ou superior
- **npm:** v9.0.0 ou superior (vem com Node.js)
- **PostgreSQL:** v14.0 ou superior
- **Git:** Para clonar o repositório

### **Recomendado:**

- **VS Code:** Editor de código
- **Prisma Extension:** Para VS Code
- **PostgreSQL Client:** pgAdmin, DBeaver ou similar

### **Verificar Instalação:**

```bash
# Verificar Node.js
node --version
# Deve retornar: v18.x.x ou superior

# Verificar npm
npm --version
# Deve retornar: 9.x.x ou superior

# Verificar PostgreSQL
psql --version
# Deve retornar: psql (PostgreSQL) 14.x ou superior
```

---

## 🔧 Instalação do Ambiente

### **1. Clonar o Repositório**

```bash
git clone https://github.com/seu-usuario/sistema-cense-maringa.git
cd sistema-cense-maringa
```

### **2. Instalar Dependências**

```bash
npm install
```

**Principais Dependências Instaladas:**
- Next.js 14+
- React 18+
- Prisma ORM
- TypeScript
- Tailwind CSS
- Lucide React (ícones)
- bcryptjs (hash de senhas)
- jsonwebtoken (JWT)

**Tempo estimado:** 2-5 minutos

---

## 🗄️ Configuração do Banco de Dados

### **1. Criar Banco de Dados PostgreSQL**

#### **Opção A: Via psql (Terminal)**

```bash
# Conectar ao PostgreSQL
psql -U postgres

# Criar banco
CREATE DATABASE cense_maringa;

# Criar usuário (opcional)
CREATE USER cense_user WITH PASSWORD 'senha_segura_aqui';

# Dar permissões
GRANT ALL PRIVILEGES ON DATABASE cense_maringa TO cense_user;

# Sair
\q
```

#### **Opção B: Via pgAdmin (Interface Gráfica)**

1. Abrir pgAdmin
2. Conectar ao servidor PostgreSQL
3. Botão direito em "Databases" → "Create" → "Database"
4. Nome: `cense_maringa`
5. Save

### **2. Verificar Conexão**

```bash
psql -U postgres -d cense_maringa -c "SELECT version();"
```

Se conectar com sucesso, está pronto!

---

## 🔐 Variáveis de Ambiente

### **1. Criar Arquivo `.env`**

Na raiz do projeto, crie o arquivo `.env`:

```bash
# Windows
type nul > .env

# Linux/Mac
touch .env
```

### **2. Configurar Variáveis**

Adicione o seguinte conteúdo no `.env`:

```env
# ============================================
# BANCO DE DADOS
# ============================================

# URL de conexão do PostgreSQL
# Formato: postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DB
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/cense_maringa"

# Exemplo com usuário customizado:
# DATABASE_URL="postgresql://cense_user:senha_segura_aqui@localhost:5432/cense_maringa"

# ============================================
# JWT (Autenticação)
# ============================================

# Chave secreta para JWT (ALTERE EM PRODUÇÃO!)
# Gerar nova: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="sua_chave_secreta_super_segura_aqui_mude_em_producao"

# ============================================
# NEXT.JS
# ============================================

# Ambiente (development, production, test)
NODE_ENV="development"

# URL base da aplicação
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### **3. Gerar JWT_SECRET Seguro**

```bash
# Executar no terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copiar o resultado e colar no JWT_SECRET
```

---

## 🎯 Instalação das Dependências

### **1. Gerar Prisma Client**

```bash
npx prisma generate
```

**O que faz:**
- Gera tipos TypeScript baseados no schema
- Cria o cliente Prisma para acesso ao banco
- Atualiza arquivos em `node_modules/.prisma`

### **2. Sincronizar Schema com o Banco**

```bash
npx prisma db push
```

**O que faz:**
- Cria todas as 30 tabelas no banco
- Aplica constraints e relações
- **NÃO apaga dados existentes**

**Esperado no output:**
```
✔ Generated Prisma Client
✔ Your database is now in sync with your Prisma schema
```

### **3. Verificar Schema**

```bash
npx prisma studio
```

- Abre interface web em `http://localhost:5555`
- Visualize todas as tabelas vazias
- **Ctrl+C** para fechar

---

## 🏗️ Inicialização da Estrutura

### **1. Iniciar Servidor de Desenvolvimento**

```bash
npm run dev
```

**Esperado:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in 2.3s
```

### **2. Criar Estrutura Física (Casas + Alojamentos)**

#### **Opção A: Via Interface (Recomendado)**

1. Acessar: `http://localhost:3000/dashboard/estrutura`
2. Clicar em **"Inicializar Estrutura"**
3. Aguardar confirmação

#### **Opção B: Via API (curl)**

```bash
curl -X POST http://localhost:3000/api/estrutura/inicializar \
  -H "Content-Type: application/json"
```

#### **Opção C: Via API (Postman/Insomnia)**

- Método: **POST**
- URL: `http://localhost:3000/api/estrutura/inicializar`
- Headers: `Content-Type: application/json`

**O que é criado:**
- ✅ 8 Casas (Casa 01 a Casa 08)
- ✅ 78 Alojamentos totais
  - Casas 01-07: 10 alojamentos cada (6 ala A + 4 ala B)
  - Casa 08: 8 alojamentos (4 ala A + 4 ala B)
- ✅ Configuração de alojamentos frontais
- ✅ Casa 01 e Casa 08 marcadas como isoladas

**Response esperada:**
```json
{
  "sucesso": true,
  "mensagem": "Estrutura inicializada com sucesso",
  "casas_criadas": 8,
  "alojamentos_criados": 78
}
```

---

## 👤 Primeiro Acesso

### **1. Criar Primeiro Operador (Admin)**

#### **Opção A: Via Prisma Studio**

```bash
npx prisma studio
```

1. Ir para tabela `operadores`
2. Clicar em "Add record"
3. Preencher:
   - `nomeCompleto`: "Administrador do Sistema"
   - `email`: "admin@cense.pr.gov.br"
   - `senhaHash`: (veja como gerar abaixo)
   - `funcaoRole`: "ADMIN"
   - `status`: "ATIVO"
4. Save

#### **Gerar Hash de Senha:**

```bash
# Instalar bcryptjs se necessário
npm install bcryptjs

# Gerar hash (senha: admin123)
node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"

# Copiar o hash e colar em senhaHash
```

#### **Opção B: Via SQL**

```sql
-- Conectar ao banco
psql -U postgres -d cense_maringa

-- Inserir operador
-- Senha: admin123 (MUDE EM PRODUÇÃO!)
INSERT INTO operadores (
  id,
  nome_completo,
  email,
  senha_hash,
  funcao_role,
  status,
  criado_em,
  atualizado_em
) VALUES (
  gen_random_uuid(),
  'Administrador do Sistema',
  'admin@cense.pr.gov.br',
  '$2a$10$XQqYqJZZ8qJZZ8qJZZ8qJO2h3h3h3h3h3h3h3h3h3h3h3h3h3h3h',
  'ADMIN',
  'ATIVO',
  NOW(),
  NOW()
);
```

**⚠️ IMPORTANTE:** Troque a senha em produção!

### **2. Fazer Login**

1. Acessar: `http://localhost:3000/login`
2. Email: `admin@cense.pr.gov.br`
3. Senha: `admin123`
4. Clicar em **"Entrar"**

**Esperado:**
- Redirecionamento para `/dashboard`
- Dashboard com menu lateral
- Nome do operador no header

---

## 🧪 Criação de Dados de Teste

### **1. Cadastrar Facções**

```sql
INSERT INTO faccoes (id, nome_faccao, descricao) VALUES
  (gen_random_uuid(), 'Grupo A', 'Facção do bairro norte'),
  (gen_random_uuid(), 'Grupo B', 'Facção do bairro sul'),
  (gen_random_uuid(), 'Sem Facção', 'Não pertence a nenhuma facção');
```

### **2. Cadastrar Bairros**

```sql
INSERT INTO bairros (id, nome_bairro, cidade) VALUES
  (gen_random_uuid(), 'Zona 7', 'Maringá'),
  (gen_random_uuid(), 'Zona 5', 'Maringá'),
  (gen_random_uuid(), 'Jardim Alvorada', 'Maringá'),
  (gen_random_uuid(), 'Conjunto Habitacional', 'Maringá');
```

### **3. Cadastrar Adolescentes de Teste (via Interface)**

1. Ir para: `/dashboard/adolescentes/novo`
2. Preencher formulário em 5 etapas:
   - **Etapa 1:** Dados pessoais
   - **Etapa 2:** Ato infracional
   - **Etapa 3:** Vinculações (facção, bairro)
   - **Etapa 4:** Tatuagens (opcional)
   - **Etapa 5:** Alertas especiais
3. Finalizar cadastro

**Sugestão:** Criar pelo menos 10 adolescentes para testes

### **4. Criar Conflitos de Teste**

1. Ir para: `/dashboard/conflitos/novo`
2. Selecionar 2 adolescentes
3. Tipo: "Facções rivais"
4. Origem: "Observação direta"
5. Registrar conflito

**Sugestão:** Criar 3-5 conflitos para testar o sistema de alocação

---

## ✅ Verificação da Instalação

### **Checklist Completo:**

```bash
# 1. Banco de dados
psql -U postgres -d cense_maringa -c "SELECT COUNT(*) FROM casas;"
# Esperado: 8 casas

psql -U postgres -d cense_maringa -c "SELECT COUNT(*) FROM alojamentos;"
# Esperado: 78 alojamentos

psql -U postgres -d cense_maringa -c "SELECT COUNT(*) FROM operadores;"
# Esperado: 1+ operador(es)

# 2. APIs funcionando
curl http://localhost:3000/api/casas/status
# Esperado: JSON com 8 casas

curl http://localhost:3000/api/adolescentes
# Esperado: JSON com array de adolescentes

# 3. Interface
# Acessar cada URL e verificar:
```

**URLs para Verificar:**

- [ ] `http://localhost:3000/login` - Página de login
- [ ] `http://localhost:3000/dashboard` - Dashboard principal
- [ ] `http://localhost:3000/dashboard/adolescentes` - Listagem
- [ ] `http://localhost:3000/dashboard/adolescentes/novo` - Cadastro
- [ ] `http://localhost:3000/dashboard/conflitos` - Conflitos
- [ ] `http://localhost:3000/dashboard/mapa` - **Mapa Visual** ⭐
- [ ] `http://localhost:3000/dashboard/comunicados` - CIs

---

## 🎯 Testar Funcionalidade Core (Mapa + Alocação)

### **1. Acessar o Mapa**

```
http://localhost:3000/dashboard/mapa
```

**Esperado:**
- Loading → 8 casas renderizadas
- Alojamentos com cores (verde = seguro)
- Legenda na parte inferior

### **2. Alocar Adolescente SEM Conflito**

1. Clicar em alojamento livre (cinza)
2. Modal abre
3. Selecionar adolescente
4. Aguardar verificação (loading)
5. Resultado: **"Alocação Segura"** (verde)
6. Confirmar
7. Sucesso: Mapa atualiza automaticamente

### **3. Alocar Adolescente COM Conflito**

1. Alocar adolescente A no alojamento 01
2. Tentar alocar adolescente B (rival) no alojamento 06 (frontal)
3. Sistema detecta: **"CONFLITO NÍVEL 5 (CRÍTICO)"**
4. Exige justificativa obrigatória
5. Preencher justificativa
6. Confirmar
7. Verificar registro em `decisoes_operacionais`

---

## 🐛 Troubleshooting

### **Erro: "Cannot connect to database"**

**Causa:** PostgreSQL não está rodando

**Solução:**
```bash
# Windows (Services)
# Procurar por "PostgreSQL" e iniciar o serviço

# Linux
sudo systemctl start postgresql

# Mac
brew services start postgresql
```

---

### **Erro: "Prisma Client is not generated"**

**Causa:** Cliente Prisma não foi gerado

**Solução:**
```bash
npx prisma generate
```

---

### **Erro: "JWT_SECRET is not defined"**

**Causa:** Arquivo `.env` não configurado

**Solução:**
1. Criar arquivo `.env` na raiz
2. Adicionar: `JWT_SECRET="sua_chave_aqui"`
3. Reiniciar servidor

---

### **Erro: "Estrutura já inicializada"**

**Causa:** Já existem casas no banco

**Solução:**
- Se quiser reiniciar:
```sql
TRUNCATE TABLE alojamentos, casas CASCADE;
```
- Depois chamar `/api/estrutura/inicializar` novamente

---

### **Erro 404 no Mapa**

**Causa:** Estrutura não foi inicializada

**Solução:**
```bash
curl -X POST http://localhost:3000/api/estrutura/inicializar
```

---

### **Mapa carrega vazio**

**Causa:** Nenhum adolescente cadastrado

**Solução:**
1. Ir para `/dashboard/adolescentes/novo`
2. Cadastrar pelo menos 3 adolescentes
3. Voltar ao mapa
4. Agora pode alocar

---

### **Verificação de conflitos não funciona**

**Causa:** Adolescentes não têm conflitos cadastrados

**Solução:**
1. Ir para `/dashboard/conflitos/novo`
2. Criar conflito entre 2 adolescentes
3. Tentar alocar em alojamentos próximos
4. Sistema detectará o conflito

---

## 📚 Próximos Passos

Após instalação completa:

1. ✅ **Explorar o Sistema**
   - Testar todas as funcionalidades
   - Cadastrar dados reais
   - Familiarizar com a interface

2. ✅ **Ler Documentação**
   - [README-APIS-INTELIGENCIA.md](README-APIS-INTELIGENCIA.md) - APIs disponíveis
   - [MAPA-INTEGRACAO-COMPLETA.md](MAPA-INTEGRACAO-COMPLETA.md) - Detalhes do mapa
   - [SISTEMA-CENSE-MARINGA-Documentacao-Completa.md](SISTEMA-CENSE-MARINGA-Documentacao-Completa.md) - Documentação técnica

3. ✅ **Configurar para Produção**
   - Ver: [GUIA-DEPLOY-PRODUCAO.md](GUIA-DEPLOY-PRODUCAO.md) (próximo arquivo)

---

## 📞 Suporte

**Problemas não resolvidos?**

1. Verificar logs do servidor: `npm run dev`
2. Verificar logs do banco: `tail -f /var/log/postgresql/postgresql.log`
3. Consultar documentação adicional
4. Abrir issue no repositório

---

## ✅ Checklist Final de Instalação

- [ ] Node.js instalado (v18+)
- [ ] PostgreSQL instalado e rodando
- [ ] Repositório clonado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env` configurado
- [ ] Prisma Client gerado (`npx prisma generate`)
- [ ] Schema sincronizado (`npx prisma db push`)
- [ ] Estrutura inicializada (8 casas + 78 alojamentos)
- [ ] Operador admin criado
- [ ] Login funcionando
- [ ] Pelo menos 3 adolescentes cadastrados
- [ ] Pelo menos 1 conflito cadastrado
- [ ] Mapa visual funcionando
- [ ] Alocação testada com sucesso

---

## 🎉 Instalação Completa!

Se todos os itens do checklist estão marcados, **o sistema está 100% funcional**!

**Tempo total estimado:** 30-45 minutos

**Próximo passo:** Começar a usar o sistema ou preparar para deploy em produção.

---

**Desenvolvido para:** Sistema CENSE Maringá
**Versão:** 2.0
**Data:** Novembro 2025
