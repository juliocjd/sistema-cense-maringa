# 🚀 Guia de Deploy em Produção

**Sistema CENSE Maringá**
**Versão:** 2.0
**Data:** 03 de Novembro de 2025
**Status:** Produção-Ready

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração do Servidor](#configuração-do-servidor)
3. [Segurança e Hardening](#segurança-e-hardening)
4. [Variáveis de Ambiente](#variáveis-de-ambiente)
5. [Deploy do Banco de Dados](#deploy-do-banco-de-dados)
6. [Deploy da Aplicação](#deploy-da-aplicação)
7. [Configuração de SSL/HTTPS](#configuração-de-sslhttps)
8. [Monitoramento e Logs](#monitoramento-e-logs)
9. [Backup e Recuperação](#backup-e-recuperação)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Checklist de Produção](#checklist-de-produção)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 Pré-requisitos

### Hardware Mínimo (Servidor Dedicado)

```
CPU: 4 cores (8 recomendado)
RAM: 8GB (16GB recomendado)
Disco: 100GB SSD (NVMe recomendado)
Rede: 100Mbps (1Gbps recomendado)
```

### Software Necessário

- **SO:** Ubuntu Server 22.04 LTS ou superior
- **Node.js:** v18.18.0+ (v20 LTS recomendado)
- **PostgreSQL:** v14+ (v16 recomendado)
- **PM2:** Para gerenciamento de processos
- **Nginx:** Para proxy reverso
- **Certbot:** Para certificados SSL
- **Git:** Para deploy via repositório

### Portas Necessárias

```
80   - HTTP (redirecionamento para HTTPS)
443  - HTTPS (aplicação web)
5432 - PostgreSQL (apenas localhost, NUNCA expor)
```

---

## 🖥️ Configuração do Servidor

### 1. Atualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Node.js (v20 LTS)

```bash
# Adicionar repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar instalação
node --version  # Deve ser v20.x.x
npm --version   # Deve ser v10.x.x
```

### 3. Instalar PostgreSQL

```bash
# Instalar PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc &>/dev/null
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# Verificar status
sudo systemctl status postgresql
```

### 4. Instalar PM2

```bash
sudo npm install -g pm2

# Configurar PM2 para iniciar automaticamente
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

### 5. Instalar Nginx

```bash
sudo apt install -y nginx

# Verificar instalação
sudo systemctl status nginx
```

### 6. Instalar Certbot (SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 🔒 Segurança e Hardening

### 1. Configurar Firewall (UFW)

```bash
# Habilitar firewall
sudo ufw enable

# Permitir apenas portas necessárias
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Bloquear PostgreSQL externamente
sudo ufw deny 5432/tcp

# Verificar status
sudo ufw status verbose
```

### 2. Hardening do PostgreSQL

Editar `/etc/postgresql/16/main/postgresql.conf`:

```conf
# Permitir conexões apenas do localhost
listen_addresses = 'localhost'

# Limitar conexões
max_connections = 100

# Logs detalhados
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'all'
log_duration = on
log_min_duration_statement = 1000  # Log queries > 1s
```

Editar `/etc/postgresql/16/main/pg_hba.conf`:

```conf
# Apenas conexões locais com senha
local   all             all                                     scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256

# Bloquear todo o resto
```

Reiniciar PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### 3. Criar Usuário Dedicado

```bash
# Criar usuário sem privilégios de root
sudo adduser cense-app --disabled-password --gecos ""

# Adicionar ao grupo www-data
sudo usermod -aG www-data cense-app
```

### 4. Configurar Permissões

```bash
# Mudar dono do diretório da aplicação
sudo chown -R cense-app:www-data /var/www/cense-maringa

# Permissões seguras
sudo chmod -R 750 /var/www/cense-maringa
```

---

## 🔐 Variáveis de Ambiente

### Criar arquivo `.env.production`

```bash
# Mudar para usuário da aplicação
sudo su - cense-app

# Criar arquivo de ambiente
cd /var/www/cense-maringa
nano .env.production
```

### Conteúdo do `.env.production`

```env
# ========================================
# AMBIENTE
# ========================================
NODE_ENV=production

# ========================================
# APLICAÇÃO
# ========================================
APP_NAME="Sistema CENSE Maringá"
APP_URL=https://cense-maringa.pr.gov.br
PORT=3000

# ========================================
# BANCO DE DADOS
# ========================================
# IMPORTANTE: Use credenciais fortes!
DATABASE_URL="postgresql://cense_user:SUA_SENHA_FORTE_AQUI@localhost:5432/sistema_cense_maringa?schema=public&sslmode=prefer"

# ========================================
# AUTENTICAÇÃO JWT
# ========================================
# CRÍTICO: Gerar com: openssl rand -base64 64
JWT_SECRET="SUA_CHAVE_SECRETA_AQUI_64_CARACTERES_MINIMO"
JWT_EXPIRES_IN="8h"

# ========================================
# COOKIES
# ========================================
COOKIE_SECRET="OUTRA_CHAVE_SECRETA_DIFERENTE_PARA_COOKIES"
COOKIE_MAX_AGE=28800000  # 8 horas em ms
COOKIE_SECURE=true       # Apenas HTTPS
COOKIE_HTTPONLY=true     # Não acessível via JS
COOKIE_SAMESITE=strict   # Proteção CSRF

# ========================================
# LOGS
# ========================================
LOG_LEVEL=info
LOG_FILE=/var/log/cense-maringa/app.log

# ========================================
# LIMITE DE TAXA (Rate Limiting)
# ========================================
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100  # 100 requisições por janela

# ========================================
# SESSÃO
# ========================================
SESSION_SECRET="MAIS_UMA_CHAVE_SECRETA_PARA_SESSAO"
SESSION_MAX_AGE=28800000  # 8 horas

# ========================================
# UPLOAD DE ARQUIVOS
# ========================================
MAX_FILE_SIZE=5242880  # 5MB em bytes
UPLOAD_DIR=/var/www/cense-maringa/uploads
ALLOWED_EXTENSIONS=jpg,jpeg,png,pdf

# ========================================
# EMAIL (Opcional - para notificações)
# ========================================
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@cense-maringa.pr.gov.br
SMTP_PASSWORD=senha_email
SMTP_FROM="CENSE Maringá <noreply@cense-maringa.pr.gov.br>"

# ========================================
# BACKUP
# ========================================
BACKUP_ENABLED=true
BACKUP_DIR=/var/backups/cense-maringa
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE="0 3 * * *"  # 3h da manhã todos os dias
```

### Gerar Chaves Secretas Seguras

```bash
# Gerar JWT_SECRET (64 bytes)
openssl rand -base64 64

# Gerar COOKIE_SECRET (64 bytes)
openssl rand -base64 64

# Gerar SESSION_SECRET (64 bytes)
openssl rand -base64 64
```

### Proteger arquivo `.env.production`

```bash
# Apenas dono pode ler/escrever
chmod 600 .env.production

# Verificar permissões
ls -la .env.production
# Deve mostrar: -rw------- cense-app cense-app
```

---

## 💾 Deploy do Banco de Dados

### 1. Criar Banco e Usuário

```bash
# Conectar como postgres
sudo -u postgres psql

# Dentro do PostgreSQL:
CREATE DATABASE sistema_cense_maringa;
CREATE USER cense_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_FORTE_AQUI';

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE sistema_cense_maringa TO cense_user;

-- Conectar ao banco
\c sistema_cense_maringa

-- Conceder permissões no schema
GRANT ALL ON SCHEMA public TO cense_user;

-- Sair
\q
```

### 2. Otimizações do PostgreSQL

Editar `/etc/postgresql/16/main/postgresql.conf`:

```conf
# Memória
shared_buffers = 2GB              # 25% da RAM
effective_cache_size = 6GB        # 75% da RAM
maintenance_work_mem = 512MB
work_mem = 64MB

# Checkpoint
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Parallelismo
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8

# Vacuum automático
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 10min

# Logs de performance
log_min_duration_statement = 1000  # Log queries > 1s
log_line_prefix = '%m [%p] %u@%d '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

Reiniciar PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### 3. Aplicar Schema do Prisma

```bash
# Como usuário cense-app
cd /var/www/cense-maringa

# Aplicar migrações
npx prisma migrate deploy

# Ou sincronizar schema (se não usar migrações)
npx prisma db push

# Gerar Prisma Client
npx prisma generate
```

### 4. Inicializar Estrutura

```bash
# Criar 8 casas + 78 alojamentos
curl -X POST http://localhost:3000/api/estrutura/inicializar

# Verificar criação
npx prisma studio
```

---

## 🚀 Deploy da Aplicação

### 1. Clonar Repositório

```bash
# Como usuário cense-app
sudo su - cense-app

# Criar diretório
sudo mkdir -p /var/www/cense-maringa
sudo chown -R cense-app:www-data /var/www/cense-maringa
cd /var/www/cense-maringa

# Clonar (substitua pela URL do seu repositório)
git clone https://github.com/seu-usuario/sistema-cense-maringa.git .
```

### 2. Instalar Dependências

```bash
# Instalar dependências de produção
npm ci --only=production

# Gerar Prisma Client
npx prisma generate
```

### 3. Build da Aplicação

```bash
# Build otimizado para produção
npm run build

# Verificar build
ls -lh .next/
```

### 4. Configurar PM2

Criar arquivo `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'cense-maringa',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/cense-maringa',
      instances: 'max',  // Usar todos os CPUs
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '.env.production',
      error_file: '/var/log/cense-maringa/pm2-error.log',
      out_file: '/var/log/cense-maringa/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', '.next', 'logs', 'uploads'],
    },
  ],
};
```

### 5. Criar Diretório de Logs

```bash
sudo mkdir -p /var/log/cense-maringa
sudo chown -R cense-app:www-data /var/log/cense-maringa
sudo chmod -R 755 /var/log/cense-maringa
```

### 6. Iniciar Aplicação

```bash
# Iniciar com PM2
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save

# Verificar status
pm2 status
pm2 logs cense-maringa --lines 50
```

### 7. Configurar Restart Automático

```bash
# Habilitar PM2 no boot
pm2 startup systemd

# Executar comando sugerido (algo como):
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u cense-app --hp /home/cense-app
```

---

## 🔐 Configuração de SSL/HTTPS

### 1. Configurar Nginx como Proxy Reverso

Criar `/etc/nginx/sites-available/cense-maringa`:

```nginx
# Redirecionamento HTTP -> HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name cense-maringa.pr.gov.br;

    # Certbot validation
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirecionar para HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Servidor HTTPS principal
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name cense-maringa.pr.gov.br;

    # Certificados SSL (serão gerados pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/cense-maringa.pr.gov.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cense-maringa.pr.gov.br/privkey.pem;

    # Configurações SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS (Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';" always;

    # Logs
    access_log /var/log/nginx/cense-maringa-access.log;
    error_log /var/log/nginx/cense-maringa-error.log;

    # Tamanho máximo de upload
    client_max_body_size 10M;

    # Timeout
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;

    # Proxy para Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache de arquivos estáticos
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    # Cache de imagens
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }
}
```

### 2. Habilitar Site

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/cense-maringa /etc/nginx/sites-enabled/

# Remover site default (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Se OK, recarregar Nginx
sudo systemctl reload nginx
```

### 3. Obter Certificado SSL com Certbot

```bash
# Criar diretório para validação
sudo mkdir -p /var/www/certbot

# Obter certificado (substitua o email e domínio)
sudo certbot --nginx \
  -d cense-maringa.pr.gov.br \
  --email admin@cense-maringa.pr.gov.br \
  --agree-tos \
  --no-eff-email \
  --redirect

# Testar renovação automática
sudo certbot renew --dry-run
```

### 4. Renovação Automática do Certificado

```bash
# Certbot cria automaticamente um timer systemd
sudo systemctl status certbot.timer

# Verificar próxima execução
sudo systemctl list-timers | grep certbot
```

---

## 📊 Monitoramento e Logs

### 1. Configurar Logrotate

Criar `/etc/logrotate.d/cense-maringa`:

```conf
/var/log/cense-maringa/*.log {
    daily
    rotate 30
    missingok
    notifempty
    compress
    delaycompress
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. Monitoramento com PM2

```bash
# Dashboard em tempo real
pm2 monit

# Informações detalhadas
pm2 info cense-maringa

# Logs em tempo real
pm2 logs cense-maringa --lines 100

# Logs de erro
pm2 logs cense-maringa --err --lines 50
```

### 3. Instalar PM2 Web Interface (Opcional)

```bash
# Instalar PM2-GUI
pm2 install pm2-server-monit

# Acessar em: http://localhost:9615
```

### 4. Monitoramento do PostgreSQL

```bash
# Conectar ao banco
sudo -u postgres psql -d sistema_cense_maringa

# Queries lentas
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - pg_stat_activity.query_start > interval '1 second'
ORDER BY duration DESC;

# Tamanho do banco
SELECT pg_size_pretty(pg_database_size('sistema_cense_maringa'));

# Conexões ativas
SELECT count(*) FROM pg_stat_activity WHERE datname = 'sistema_cense_maringa';
```

### 5. Script de Monitoramento Automático

Criar `/home/cense-app/monitor.sh`:

```bash
#!/bin/bash

LOG_FILE="/var/log/cense-maringa/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] === Monitoramento ===" >> $LOG_FILE

# Status da aplicação
APP_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status')
echo "[$DATE] Aplicação: $APP_STATUS" >> $LOG_FILE

# Uso de CPU e RAM
CPU=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')
RAM=$(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2 }')
echo "[$DATE] CPU: $CPU | RAM: $RAM" >> $LOG_FILE

# Espaço em disco
DISK=$(df -h / | awk 'NR==2{print $5}')
echo "[$DATE] Disco: $DISK" >> $LOG_FILE

# PostgreSQL
PG_STATUS=$(systemctl is-active postgresql)
echo "[$DATE] PostgreSQL: $PG_STATUS" >> $LOG_FILE

# Nginx
NGINX_STATUS=$(systemctl is-active nginx)
echo "[$DATE] Nginx: $NGINX_STATUS" >> $LOG_FILE

echo "" >> $LOG_FILE
```

Agendar com cron:

```bash
# Editar crontab
crontab -e

# Adicionar linha (executar a cada 5 minutos)
*/5 * * * * /home/cense-app/monitor.sh
```

---

## 💾 Backup e Recuperação

### 1. Script de Backup Automático

Criar `/home/cense-app/backup.sh`:

```bash
#!/bin/bash

# Configurações
BACKUP_DIR="/var/backups/cense-maringa"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
DB_NAME="sistema_cense_maringa"
DB_USER="cense_user"

# Criar diretório se não existir
mkdir -p $BACKUP_DIR/{database,uploads,logs}

# Backup do banco de dados
echo "[$(date)] Iniciando backup do banco de dados..."
PGPASSWORD="SUA_SENHA_AQUI" pg_dump \
  -h localhost \
  -U $DB_USER \
  -d $DB_NAME \
  -F c \
  -f "$BACKUP_DIR/database/backup_${DATE}.dump"

# Comprimir backup
gzip "$BACKUP_DIR/database/backup_${DATE}.dump"

# Backup de uploads
echo "[$(date)] Backup de uploads..."
tar -czf "$BACKUP_DIR/uploads/uploads_${DATE}.tar.gz" \
  -C /var/www/cense-maringa uploads/

# Backup de logs
echo "[$(date)] Backup de logs..."
tar -czf "$BACKUP_DIR/logs/logs_${DATE}.tar.gz" \
  -C /var/log cense-maringa/

# Remover backups antigos
echo "[$(date)] Limpando backups antigos (>${RETENTION_DAYS} dias)..."
find $BACKUP_DIR/database -name "*.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR/uploads -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR/logs -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Verificar tamanho total dos backups
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo "[$(date)] Backup concluído! Tamanho total: $BACKUP_SIZE"

# Log de sucesso
echo "[$(date)] Backup realizado com sucesso" >> /var/log/cense-maringa/backup.log
```

Tornar executável:

```bash
chmod +x /home/cense-app/backup.sh
```

### 2. Agendar Backup Automático

```bash
# Editar crontab
crontab -e

# Backup diário às 3h da manhã
0 3 * * * /home/cense-app/backup.sh >> /var/log/cense-maringa/backup.log 2>&1
```

### 3. Script de Restauração

Criar `/home/cense-app/restore.sh`:

```bash
#!/bin/bash

# Verificar argumentos
if [ -z "$1" ]; then
  echo "Uso: ./restore.sh <arquivo_backup.dump.gz>"
  exit 1
fi

BACKUP_FILE=$1
DB_NAME="sistema_cense_maringa"
DB_USER="cense_user"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Erro: Arquivo não encontrado!"
  exit 1
fi

# Confirmar restauração
read -p "ATENÇÃO: Isso irá SOBRESCREVER o banco atual. Continuar? (sim/não): " confirm
if [ "$confirm" != "sim" ]; then
  echo "Restauração cancelada."
  exit 0
fi

# Parar aplicação
echo "Parando aplicação..."
pm2 stop cense-maringa

# Descomprimir backup
echo "Descomprimindo backup..."
gunzip -c "$BACKUP_FILE" > /tmp/restore_temp.dump

# Recriar banco
echo "Recriando banco de dados..."
sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

# Restaurar backup
echo "Restaurando backup..."
PGPASSWORD="SUA_SENHA_AQUI" pg_restore \
  -h localhost \
  -U $DB_USER \
  -d $DB_NAME \
  -v \
  /tmp/restore_temp.dump

# Limpar arquivo temporário
rm /tmp/restore_temp.dump

# Reiniciar aplicação
echo "Reiniciando aplicação..."
pm2 start cense-maringa

echo "Restauração concluída!"
```

Tornar executável:

```bash
chmod +x /home/cense-app/restore.sh
```

### 4. Backup para Storage Externo (Opcional)

```bash
# Instalar rclone (para Google Drive, AWS S3, etc)
sudo apt install -y rclone

# Configurar remote
rclone config

# Adicionar ao script de backup
rclone copy $BACKUP_DIR remote:cense-backups/
```

---

## 🔄 CI/CD Pipeline

### Exemplo com GitHub Actions

Criar `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build application
        run: npm run build

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/cense-maringa
            git pull origin main
            npm ci --only=production
            npx prisma generate
            npm run build
            pm2 reload cense-maringa --update-env

      - name: Verify deployment
        run: |
          sleep 10
          curl -f https://cense-maringa.pr.gov.br || exit 1
```

### Deploy Manual com Git

```bash
# No servidor, como cense-app
cd /var/www/cense-maringa

# Atualizar código
git pull origin main

# Instalar dependências
npm ci --only=production

# Gerar Prisma Client
npx prisma generate

# Aplicar migrações (se houver)
npx prisma migrate deploy

# Build
npm run build

# Recarregar aplicação sem downtime
pm2 reload cense-maringa --update-env

# Verificar status
pm2 status
pm2 logs cense-maringa --lines 20
```

---

## ✅ Checklist de Produção

### Antes do Deploy

- [ ] Servidor provisionado e atualizado
- [ ] Node.js v20+ instalado
- [ ] PostgreSQL v16+ instalado e configurado
- [ ] Firewall configurado (UFW)
- [ ] Usuário dedicado criado (cense-app)
- [ ] Permissões corretas nos diretórios
- [ ] `.env.production` criado com chaves secretas fortes
- [ ] Código testado em ambiente de staging
- [ ] Backup do banco atual (se houver)
- [ ] DNS configurado apontando para o servidor

### Durante o Deploy

- [ ] Aplicação buildada com sucesso
- [ ] Schema do banco aplicado
- [ ] Estrutura inicializada (8 casas + 78 alojamentos)
- [ ] PM2 iniciado e configurado para auto-restart
- [ ] Nginx configurado como proxy reverso
- [ ] Certificado SSL instalado e funcional
- [ ] Aplicação acessível via HTTPS

### Após o Deploy

- [ ] Testar login na aplicação
- [ ] Verificar todas as rotas principais
- [ ] Testar operações CRUD
- [ ] Verificar logs (sem erros críticos)
- [ ] Monitorar uso de CPU/RAM (deve estar normal)
- [ ] Testar backup manual
- [ ] Configurar backup automático
- [ ] Documentar credenciais em local seguro
- [ ] Treinar equipe no uso do sistema
- [ ] Criar runbook de operações

### Segurança

- [ ] Firewall ativo e configurado
- [ ] PostgreSQL acessível apenas via localhost
- [ ] Chaves JWT/Session/Cookie únicas e fortes (64+ chars)
- [ ] HTTPS funcionando com A+ no SSL Labs
- [ ] Headers de segurança configurados
- [ ] Rate limiting ativo
- [ ] Logs de auditoria funcionando
- [ ] Backup funcionando e testado
- [ ] Acesso SSH protegido (chave + senha ou apenas chave)
- [ ] Usuário root desabilitado para SSH

---

## 🔧 Troubleshooting

### Problema: Aplicação não inicia

**Sintomas:**
```bash
pm2 status
# mostra: errored ou stopped
```

**Diagnóstico:**
```bash
pm2 logs cense-maringa --err --lines 50
```

**Soluções:**
- Verificar se `.env.production` existe e está correto
- Verificar se PostgreSQL está rodando: `sudo systemctl status postgresql`
- Verificar se a porta 3000 está livre: `sudo lsof -i :3000`
- Testar conexão com o banco: `npx prisma db pull`

### Problema: Certificado SSL não renova automaticamente

**Verificar timer:**
```bash
sudo systemctl status certbot.timer
```

**Renovar manualmente:**
```bash
sudo certbot renew --dry-run  # Teste
sudo certbot renew            # Real
sudo systemctl reload nginx
```

### Problema: Alto uso de memória

**Diagnóstico:**
```bash
pm2 monit
free -h
```

**Soluções:**
- Reduzir número de instâncias PM2: `instances: 2` em vez de `max`
- Aumentar RAM do servidor
- Verificar queries lentas no PostgreSQL
- Ativar `max_memory_restart` no PM2

### Problema: Banco de dados lento

**Verificar queries lentas:**
```sql
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC
LIMIT 10;
```

**Soluções:**
- Criar índices nas colunas mais consultadas
- Executar `VACUUM ANALYZE` regularmente
- Aumentar `shared_buffers` no PostgreSQL
- Verificar estatísticas: `SELECT * FROM pg_stat_user_tables;`

### Problema: 502 Bad Gateway (Nginx)

**Diagnóstico:**
```bash
sudo nginx -t
pm2 status
curl http://localhost:3000
```

**Soluções:**
- Verificar se aplicação está rodando: `pm2 start cense-maringa`
- Reiniciar Nginx: `sudo systemctl restart nginx`
- Verificar logs: `sudo tail -f /var/log/nginx/error.log`

### Problema: Uploads falhando

**Verificar permissões:**
```bash
ls -la /var/www/cense-maringa/uploads
```

**Corrigir:**
```bash
sudo chown -R cense-app:www-data /var/www/cense-maringa/uploads
sudo chmod -R 775 /var/www/cense-maringa/uploads
```

---

## 📞 Contatos de Emergência

```
Equipe de TI CENSE: (43) XXXX-XXXX
Suporte do Sistema: suporte@cense-maringa.pr.gov.br
Emergência (24h): emergencia@cense-maringa.pr.gov.br
```

---

## 📚 Referências

- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Best Practices](https://www.nginx.com/blog/nginx-best-practices/)
- [PostgreSQL Tuning](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

**Sistema CENSE Maringá - v2.0**
**Pronto para Produção** 🚀
