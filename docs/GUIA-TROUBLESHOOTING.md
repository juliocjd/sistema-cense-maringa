# 🔧 Guia de Troubleshooting - Sistema CENSE Maringá

**Versão:** 2.0
**Data:** 03 de Novembro de 2025
**Status:** Completo

---

## 📋 Índice

1. [Problemas de Instalação](#problemas-de-instalação)
2. [Problemas de Autenticação](#problemas-de-autenticação)
3. [Problemas de Banco de Dados](#problemas-de-banco-de-dados)
4. [Problemas de API](#problemas-de-api)
5. [Problemas de Interface](#problemas-de-interface)
6. [Problemas de Alocação](#problemas-de-alocação)
7. [Problemas de Performance](#problemas-de-performance)
8. [Problemas de Deploy](#problemas-de-deploy)
9. [Erros Comuns](#erros-comuns)
10. [Comandos Úteis](#comandos-úteis)

---

## 🚀 Problemas de Instalação

### Erro: `npm install` falha com erro de permissões

**Sintomas:**
```
EACCES: permission denied
```

**Causa:** Falta de permissões no diretório do npm ou tentativa de instalar globalmente sem sudo.

**Solução 1 - Corrigir permissões do npm:**
```bash
# Criar diretório global do npm no home
mkdir ~/.npm-global

# Configurar npm para usar esse diretório
npm config set prefix '~/.npm-global'

# Adicionar ao PATH
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Tentar novamente
npm install
```

**Solução 2 - Limpar cache:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

### Erro: `npx prisma db push` falha

**Sintomas:**
```
Error: P1001: Can't reach database server at `localhost:5432`
```

**Diagnóstico:**
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Verificar se a porta está aberta
sudo lsof -i :5432

# Testar conexão direta
psql -h localhost -U postgres -d postgres
```

**Solução 1 - Iniciar PostgreSQL:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Iniciar no boot
```

**Solução 2 - Verificar credenciais no `.env`:**
```bash
# Abrir arquivo .env
cat .env

# Verificar formato correto:
# DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_banco"

# Testar conexão com essas credenciais
psql -h localhost -U usuario -d nome_banco
```

**Solução 3 - Recriar banco:**
```bash
# Conectar como postgres
sudo -u postgres psql

# Recriar banco
DROP DATABASE IF EXISTS sistema_cense_maringa;
CREATE DATABASE sistema_cense_maringa;

# Recriar usuário
DROP USER IF EXISTS cense_user;
CREATE USER cense_user WITH ENCRYPTED PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE sistema_cense_maringa TO cense_user;

\q

# Aplicar schema
npx prisma db push
```

---

### Erro: Porta 3000 já está em uso

**Sintomas:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Diagnóstico:**
```bash
# Verificar o que está usando a porta 3000
sudo lsof -i :3000

# Ou com netstat
sudo netstat -tulpn | grep :3000
```

**Solução 1 - Matar processo:**
```bash
# Encontrar PID do processo
sudo lsof -i :3000
# Exemplo de saída: node 12345 user ...

# Matar processo
kill -9 12345

# Ou matar todos os processos Node
pkill -9 node
```

**Solução 2 - Usar outra porta:**
```bash
# No arquivo .env
PORT=3001

# Ou executar diretamente
PORT=3001 npm run dev
```

---

## 🔐 Problemas de Autenticação

### Erro: "Credenciais inválidas" ao fazer login

**Sintomas:**
- Login falha mesmo com credenciais corretas
- API retorna 401

**Diagnóstico:**
```bash
# Verificar se operador existe no banco
npx prisma studio
# Navegar para tabela "Operador"
# Verificar email e senha (hash)
```

**Solução 1 - Criar operador via API:**
```bash
curl -X POST http://localhost:3000/api/operadores/cadastro \
  -H "Content-Type: application/json" \
  -d '{
    "nomeCompleto": "Admin Sistema",
    "email": "admin@cense.pr.gov.br",
    "senha": "SenhaForte123!",
    "funcaoRole": "ADMIN",
    "ramal": "1234"
  }'
```

**Solução 2 - Verificar hash de senha:**
```bash
# Conectar ao banco
psql -h localhost -U cense_user -d sistema_cense_maringa

# Verificar operador
SELECT id, email, "nomeCompleto", "funcaoRole" FROM "Operador";

# Se não houver operadores, criar manualmente com bcrypt
# (Use o endpoint de cadastro em vez disso)
```

**Solução 3 - Verificar JWT_SECRET:**
```bash
# Verificar se JWT_SECRET existe no .env
cat .env | grep JWT_SECRET

# Se não existir, adicionar
echo 'JWT_SECRET="sua-chave-secreta-minimo-32-caracteres"' >> .env

# Reiniciar servidor
npm run dev
```

---

### Erro: Token JWT expirado

**Sintomas:**
```
JsonWebTokenError: jwt expired
```

**Causa:** Token expirou (padrão: 8 horas).

**Solução:**
```bash
# Fazer logout e login novamente
localStorage.removeItem('token')
localStorage.removeItem('user')

# Ou aumentar tempo de expiração no .env
JWT_EXPIRES_IN="24h"
```

---

### Erro: useAuth retorna null

**Sintomas:**
- `user` sempre é `null` mesmo após login
- Página não reconhece usuário autenticado

**Diagnóstico:**
```javascript
// No console do navegador
console.log(localStorage.getItem('user'))
console.log(localStorage.getItem('token'))
```

**Solução 1 - Verificar se login salva no localStorage:**

Editar [app/(auth)/login/login-form.tsx](../app/(auth)/login/login-form.tsx):

```typescript
// Após login bem-sucedido
if (data.operador) {
  localStorage.setItem('user', JSON.stringify({
    id: data.operador.id,
    nome: data.operador.nomeCompleto,
    email: data.operador.email,
    role: data.operador.funcaoRole
  }))

  console.log('Usuário salvo no localStorage:', data.operador)
}
```

**Solução 2 - Verificar se hook está sendo usado corretamente:**

```typescript
// No componente
import { useAuth } from '@/hooks/useAuth'

export default function MyPage() {
  const { user, loading, isAuthenticated } = useAuth()

  console.log('useAuth:', { user, loading, isAuthenticated })

  if (loading) return <div>Carregando...</div>
  if (!isAuthenticated) return <div>Não autenticado</div>

  return <div>Olá, {user.nome}!</div>
}
```

---

## 💾 Problemas de Banco de Dados

### Erro: "relation does not exist"

**Sintomas:**
```
error: relation "Adolescente" does not exist
```

**Causa:** Schema do Prisma não foi aplicado ao banco.

**Solução:**
```bash
# Sincronizar schema
npx prisma db push

# Ou aplicar migrações
npx prisma migrate deploy

# Verificar tabelas criadas
npx prisma studio
```

---

### Erro: Queries muito lentas

**Sintomas:**
- Páginas demoram muito para carregar (>5 segundos)
- Timeout em requests

**Diagnóstico:**
```sql
-- Conectar ao banco
psql -h localhost -U cense_user -d sistema_cense_maringa

-- Verificar queries ativas
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- Verificar tamanho das tabelas
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Verificar índices
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Solução 1 - Criar índices:**
```sql
-- Índices recomendados
CREATE INDEX IF NOT EXISTS idx_adolescente_status ON "Adolescente"("statusUnidade");
CREATE INDEX IF NOT EXISTS idx_adolescente_alojamento ON "Adolescente"("alojamentoAtualId");
CREATE INDEX IF NOT EXISTS idx_conflito_status ON "Conflito"("status");
CREATE INDEX IF NOT EXISTS idx_log_data ON "LogAuditoria"("dataHora");
CREATE INDEX IF NOT EXISTS idx_grupo_tipo ON "Grupo"("tipoGrupo");
```

**Solução 2 - Executar VACUUM:**
```sql
-- Otimizar tabelas
VACUUM ANALYZE;

-- Ou para uma tabela específica
VACUUM ANALYZE "Adolescente";
```

**Solução 3 - Otimizar queries no código:**

Antes (N+1 queries):
```typescript
const adolescentes = await prisma.adolescente.findMany()

for (const adol of adolescentes) {
  const conflitos = await prisma.conflito.findMany({
    where: { OR: [{ adolescenteAId: adol.id }, { adolescenteBId: adol.id }] }
  })
}
```

Depois (1 query com include):
```typescript
const adolescentes = await prisma.adolescente.findMany({
  include: {
    conflitosA: true,
    conflitosB: true
  }
})
```

---

### Erro: Não é possível conectar ao banco após reiniciar servidor

**Sintomas:**
```
P1001: Can't reach database server
```

**Diagnóstico:**
```bash
# Verificar status do PostgreSQL
sudo systemctl status postgresql

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

**Solução:**
```bash
# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Se falhar, verificar arquivo de configuração
sudo nano /etc/postgresql/16/main/postgresql.conf

# Verificar listen_addresses
# Deve ser: listen_addresses = 'localhost'

# Verificar pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Reiniciar novamente
sudo systemctl restart postgresql
```

---

## 🌐 Problemas de API

### Erro: 404 Not Found na API

**Sintomas:**
- Chamada retorna 404
- `fetch('/api/adolescentes')` falha

**Diagnóstico:**
```bash
# Verificar se arquivo da rota existe
ls -la app/api/adolescentes/route.ts

# Verificar estrutura de diretórios
tree app/api/
```

**Solução:**
```bash
# Reiniciar servidor de desenvolvimento
# Ctrl+C para parar
npm run dev
```

---

### Erro: 500 Internal Server Error

**Sintomas:**
- API retorna 500
- Erro genérico no frontend

**Diagnóstico:**
```bash
# Verificar logs do servidor
# No terminal onde rodou `npm run dev`

# Ou verificar logs do PM2 (produção)
pm2 logs cense-maringa --lines 50
```

**Soluções comuns:**

**1. Erro de Prisma:**
```typescript
// Adicionar try-catch nas rotas
export async function GET() {
  try {
    const data = await prisma.adolescente.findMany()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar adolescentes:', error)
    return NextResponse.json(
      { erro: 'Erro ao buscar dados', detalhes: error.message },
      { status: 500 }
    )
  }
}
```

**2. Campos do banco diferentes do código:**
```typescript
// Verificar se campos no Prisma schema coincidem com a query
// Schema: nomeCompleto
// Código deve usar: nomeCompleto (não nome_completo)
```

---

### Erro: CORS bloqueando requisições

**Sintomas:**
```
Access to fetch at 'http://localhost:3000/api/...' from origin 'http://localhost:3001'
has been blocked by CORS policy
```

**Solução - Adicionar headers CORS:**

Criar [middleware.ts](../middleware.ts):
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  return response
}

export const config = {
  matcher: '/api/:path*',
}
```

---

## 🎨 Problemas de Interface

### Erro: Mapa não carrega dados

**Sintomas:**
- Mapa mostra loading infinito
- Ou exibe mensagem de erro
- Casas não aparecem

**Diagnóstico:**

Abrir console do navegador (F12) e verificar:
```javascript
// Verificar requisições
// Aba Network -> filtrar por "api"

// Verificar erros
// Aba Console
```

**Solução 1 - API não retorna dados:**
```bash
# Verificar se estrutura foi criada
curl http://localhost:3000/api/casas/status

# Se retornar casas: []
# Criar estrutura
curl -X POST http://localhost:3000/api/estrutura/inicializar
```

**Solução 2 - Erro de CORS:**
```javascript
// Verificar se há erro de CORS no console
// Se sim, seguir solução de CORS acima
```

**Solução 3 - Estado de erro não está sendo tratado:**

Editar [app/(dashboard)/mapa/page.tsx](../app/(dashboard)/mapa/page.tsx):

```typescript
const carregarDados = async () => {
  setLoading(true)
  setError(null)

  try {
    const response = await fetch('/api/casas/status')

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`)
    }

    const data = await response.json()
    console.log('Dados carregados:', data)  // Debug

    setCasas(data.casas)
  } catch (error) {
    console.error('Erro ao carregar:', error)
    setError(error.message)
  } finally {
    setLoading(false)
  }
}
```

---

### Erro: Modal de alocação não abre

**Sintomas:**
- Clicar em alojamento não faz nada
- Modal não aparece

**Diagnóstico:**
```javascript
// Console do navegador
// Verificar se há erros ao clicar
```

**Solução 1 - Verificar estado do modal:**

Editar [components/mapa/mapa-interativo.tsx](../components/mapa/mapa-interativo.tsx):

```typescript
const handleAlojamentoClick = (alojamento: Alojamento) => {
  console.log('Alojamento clicado:', alojamento)  // Debug

  if (alojamento.statusManutencao === 'INTERDITADO') {
    alert('Alojamento interditado')
    return
  }

  if (alojamento.adolescentes.length > 0) {
    alert('Alojamento já está ocupado')
    return
  }

  setAlojamentoSelecionado(alojamento)
  setModalAberto(true)
}
```

---

### Erro: Imagens não carregam

**Sintomas:**
- Fotos de adolescentes não aparecem
- Ícone quebrado

**Diagnóstico:**
```javascript
// Console do navegador
// Verificar erro 404 nas imagens
```

**Solução 1 - Caminho da imagem incorreto:**
```typescript
// Usar caminho relativo correto
<img src={`/uploads/${adolescente.fotoUrl}`} alt={adolescente.nomeCompleto} />

// Ou caminho absoluto
<img src={adolescente.fotoUrl} alt={adolescente.nomeCompleto} />
```

**Solução 2 - Imagem não existe:**
```typescript
// Adicionar fallback
<img
  src={adolescente.fotoUrl || '/images/placeholder.png'}
  alt={adolescente.nomeCompleto}
  onError={(e) => {
    e.currentTarget.src = '/images/placeholder.png'
  }}
/>
```

---

## 🏠 Problemas de Alocação

### Erro: Verificação de conflitos sempre retorna erro

**Sintomas:**
- Modal mostra "Erro ao verificar conflitos"
- Alocação não funciona

**Diagnóstico:**
```bash
# Testar API diretamente
curl "http://localhost:3000/api/verificar-alocacao?adolescenteId=uuid-adol&alojamentoId=uuid-aloj"
```

**Solução 1 - API de verificação não existe:**
```bash
# Verificar se arquivo existe
ls -la app/api/verificar-alocacao/route.ts

# Se não existir, criar (ver documentação de APIs)
```

**Solução 2 - UUIDs inválidos:**
```javascript
// No console do navegador
console.log('IDs:', {
  adolescenteId: adolescente.id,
  alojamentoId: alojamento.id
})

// Verificar se são UUIDs válidos
// Formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Solução 3 - Dados faltando no banco:**
```sql
-- Verificar se adolescente existe
SELECT id, "nomeCompleto" FROM "Adolescente" WHERE id = 'uuid-aqui';

-- Verificar se alojamento existe
SELECT id, numero FROM "Alojamento" WHERE id = 'uuid-aqui';

-- Verificar relações de conflito
SELECT * FROM "Conflito" WHERE "adolescenteAId" = 'uuid-adol' OR "adolescenteBId" = 'uuid-adol';
```

---

### Erro: Alocação sucede mas mapa não atualiza

**Sintomas:**
- API retorna sucesso
- Mas alojamento continua vazio visualmente

**Causa:** Falta de refresh dos dados após alocação.

**Solução:**

Editar [app/(dashboard)/mapa/page.tsx](../app/(dashboard)/mapa/page.tsx):

```typescript
const handleAlocar = async (
  adolescenteId: string,
  alojamentoId: string,
  justificativa?: string
) => {
  try {
    const response = await fetch('/api/alocar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adolescenteId,
        alojamentoId,
        operadorId: user?.id,
        justificativa
      })
    })

    if (!response.ok) throw new Error('Erro ao alocar')

    const data = await response.json()
    alert('Alocação realizada com sucesso!')

    // ✅ IMPORTANTE: Recarregar dados
    await carregarDados()

  } catch (error) {
    alert('Erro: ' + error.message)
  }
}
```

---

### Erro: Justificativa obrigatória não funciona

**Sintomas:**
- Modal permite confirmar mesmo sem justificativa em casos de alto risco

**Solução:**

Editar [components/mapa/modal-alocacao.tsx](../components/mapa/modal-alocacao.tsx):

```typescript
const podeConfirmar = () => {
  if (!adolescenteSelecionado) return false

  if (!verificacao) return false

  // Se requer justificativa e não foi preenchida
  if (verificacao.requer_justificativa && !justificativa.trim()) {
    return false
  }

  return verificacao.permite_alocacao
}

// No botão
<button
  onClick={handleConfirmar}
  disabled={!podeConfirmar()}
  className={podeConfirmar() ? 'bg-green-600' : 'bg-gray-400 cursor-not-allowed'}
>
  Confirmar Alocação
</button>
```

---

## ⚡ Problemas de Performance

### Problema: Aplicação lenta

**Diagnóstico:**

```bash
# Verificar uso de CPU/RAM
top
htop

# Verificar processos Node
ps aux | grep node

# Verificar logs
pm2 logs cense-maringa --lines 100
```

**Solução 1 - Otimizar queries:**

```typescript
// ANTES: N+1 queries
const adolescentes = await prisma.adolescente.findMany()
for (const adol of adolescentes) {
  const alojamento = await prisma.alojamento.findUnique({
    where: { id: adol.alojamentoAtualId }
  })
}

// DEPOIS: 1 query com include
const adolescentes = await prisma.adolescente.findMany({
  include: {
    alojamentoAtual: true
  }
})
```

**Solução 2 - Adicionar cache:**

```typescript
// Instalar
npm install node-cache

// Usar
import NodeCache from 'node-cache'
const cache = new NodeCache({ stdTTL: 300 }) // 5 minutos

export async function GET() {
  const cacheKey = 'casas-status'

  // Verificar cache
  const cached = cache.get(cacheKey)
  if (cached) return NextResponse.json(cached)

  // Buscar do banco
  const data = await prisma.casa.findMany({...})

  // Salvar no cache
  cache.set(cacheKey, data)

  return NextResponse.json(data)
}
```

**Solução 3 - Otimizar build:**

```bash
# Limpar cache
rm -rf .next
npm run build
```

---

### Problema: Bundle muito grande

**Diagnóstico:**
```bash
npm run build
# Verificar tamanho no output
```

**Solução - Análise de bundle:**
```bash
# Instalar analisador
npm install -D @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

module.exports = withBundleAnalyzer({
  // ... config existente
})

# Analisar
ANALYZE=true npm run build
```

---

## 🚢 Problemas de Deploy

### Erro: Build falha em produção

**Sintomas:**
```
Error: Build failed
TypeScript errors found
```

**Solução:**
```bash
# Verificar erros localmente primeiro
npm run build

# Corrigir erros TypeScript
# Ou ignorar temporariamente (não recomendado)
# next.config.js
module.exports = {
  typescript: {
    ignoreBuildErrors: true
  }
}
```

---

### Erro: PM2 não inicia aplicação

**Sintomas:**
```bash
pm2 status
# mostra: errored
```

**Diagnóstico:**
```bash
pm2 logs cense-maringa --err --lines 50
```

**Solução 1 - Arquivo ecosystem incorreto:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'cense-maringa',
    script: 'node_modules/next/dist/bin/next',  // ✅ Correto
    args: 'start',
    cwd: '/var/www/cense-maringa',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

**Solução 2 - Build não foi feito:**
```bash
npm run build
pm2 restart cense-maringa
```

---

## ❗ Erros Comuns

### Erro: "Module not found"

**Causa:** Importação incorreta ou dependência não instalada.

**Solução:**
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# Verificar importação
# ❌ Errado
import { Component } from 'components/Component'

# ✅ Correto
import { Component } from '@/components/Component'
```

---

### Erro: "Hydration mismatch"

**Causa:** HTML do servidor diferente do cliente (comum com localStorage, Date, Math.random).

**Solução:**
```typescript
// Usar useEffect para código client-only
const [user, setUser] = useState(null)

useEffect(() => {
  const userStr = localStorage.getItem('user')
  if (userStr) setUser(JSON.parse(userStr))
}, [])

// Ou usar suppressHydrationWarning
<div suppressHydrationWarning>
  {new Date().toString()}
</div>
```

---

### Erro: Prisma Client não atualiza após mudança no schema

**Solução:**
```bash
# Regenerar cliente
npx prisma generate

# Se continuar, limpar e regenerar
rm -rf node_modules/.prisma
npx prisma generate

# Reiniciar servidor
npm run dev
```

---

## 🛠️ Comandos Úteis

### Banco de Dados

```bash
# Conectar ao banco
psql -h localhost -U cense_user -d sistema_cense_maringa

# Backup
pg_dump -h localhost -U cense_user sistema_cense_maringa > backup.sql

# Restaurar
psql -h localhost -U cense_user sistema_cense_maringa < backup.sql

# Resetar banco (CUIDADO!)
npx prisma migrate reset

# Ver logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### PM2

```bash
# Status
pm2 status

# Logs
pm2 logs cense-maringa
pm2 logs cense-maringa --err  # Apenas erros
pm2 logs cense-maringa --lines 100  # Últimas 100 linhas

# Reiniciar
pm2 restart cense-maringa
pm2 reload cense-maringa  # Zero-downtime

# Parar/Iniciar
pm2 stop cense-maringa
pm2 start cense-maringa

# Deletar
pm2 delete cense-maringa

# Monitoramento
pm2 monit
```

### Next.js

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start

# Limpar cache
rm -rf .next

# Análise de bundle
npm run build -- --analyze
```

### Git

```bash
# Status
git status

# Pull + Install + Build + Restart (deploy)
git pull && npm ci --only=production && npm run build && pm2 reload cense-maringa

# Ver diferenças
git diff
git log --oneline -10
```

### Sistema

```bash
# Uso de disco
df -h

# Uso de RAM
free -h

# Processos usando mais CPU
top
htop

# Processos Node
ps aux | grep node

# Portas abertas
sudo netstat -tulpn
sudo lsof -i :3000
```

---

## 📞 Quando Pedir Ajuda

Se após tentar as soluções acima o problema persistir, reúna as seguintes informações antes de contatar o suporte:

1. **Descrição do problema** (o que você tentou fazer e o que aconteceu)
2. **Logs relevantes**:
   ```bash
   pm2 logs cense-maringa --lines 100 > logs.txt
   ```
3. **Versões instaladas**:
   ```bash
   node --version
   npm --version
   npx prisma --version
   pm2 --version
   ```
4. **Estado do sistema**:
   ```bash
   pm2 status
   sudo systemctl status postgresql
   sudo systemctl status nginx
   ```
5. **Arquivo .env** (REMOVA senhas antes de compartilhar!)

---

## 📚 Recursos Adicionais

- [Documentação do Next.js](https://nextjs.org/docs)
- [Documentação do Prisma](https://www.prisma.io/docs)
- [PM2 Documentation](https://pm2.keymetrics.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Sistema CENSE Maringá - v2.0**
**Guia de Troubleshooting Completo** 🔧
