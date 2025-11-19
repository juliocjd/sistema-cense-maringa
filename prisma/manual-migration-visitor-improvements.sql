-- Migration: Add Visitor System Improvements
-- Execute este SQL diretamente no banco de dados Neon quando estiver pronto

-- ============================================
-- HISTÓRICO DE BLOQUEIOS
-- ============================================
CREATE TABLE IF NOT EXISTS "historico_bloqueios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitante_id" TEXT NOT NULL,
    "motivo_bloqueio" TEXT NOT NULL,
    "data_bloqueio" TIMESTAMP(3) NOT NULL,
    "data_desbloqueio" TIMESTAMP(3),
    "prazo_previsao" TIMESTAMP(3),
    "desbloqueado" BOOLEAN NOT NULL DEFAULT false,
    "operador_bloqueio_id" TEXT NOT NULL,
    "operador_desbloqueio_id" TEXT,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_bloqueios_visitante_id_fkey"
        FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- QR CODES PARA VISITANTES
-- ============================================
CREATE TABLE IF NOT EXISTS "qrcodes_visitantes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitante_id" TEXT NOT NULL,
    "codigo_qr" TEXT NOT NULL UNIQUE,
    "imagem_qr_url" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "valido_ate" TIMESTAMP(3),
    "quantidade_usos" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qrcodes_visitantes_visitante_id_fkey"
        FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- FOTOS DE EVIDÊNCIA (Auto-exclusão 2 meses)
-- ============================================
CREATE TABLE IF NOT EXISTS "fotos_evidencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visita_id" TEXT,
    "visitante_id" TEXT NOT NULL,
    "foto_url" TEXT NOT NULL,
    "tipo_foto" TEXT NOT NULL,
    "data_captura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_exclusao" TIMESTAMP(3) NOT NULL,
    "excluida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_evidencia_visitante_id_fkey"
        FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- NOTIFICAÇÕES WHATSAPP
-- ============================================
CREATE TABLE IF NOT EXISTS "notificacoes_whatsapp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitante_id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "tipo_notificacao" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status_envio" TEXT NOT NULL DEFAULT 'PENDENTE',
    "erro_envio" TEXT,
    "data_envio" TIMESTAMP(3),
    "data_leitura" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_whatsapp_visitante_id_fkey"
        FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS "historico_bloqueios_visitante_id_idx" ON "historico_bloqueios"("visitante_id");
CREATE INDEX IF NOT EXISTS "historico_bloqueios_desbloqueado_idx" ON "historico_bloqueios"("desbloqueado");

CREATE INDEX IF NOT EXISTS "qrcodes_visitantes_visitante_id_idx" ON "qrcodes_visitantes"("visitante_id");
CREATE INDEX IF NOT EXISTS "qrcodes_visitantes_codigo_qr_idx" ON "qrcodes_visitantes"("codigo_qr");
CREATE INDEX IF NOT EXISTS "qrcodes_visitantes_ativo_idx" ON "qrcodes_visitantes"("ativo");

CREATE INDEX IF NOT EXISTS "fotos_evidencia_visitante_id_idx" ON "fotos_evidencia"("visitante_id");
CREATE INDEX IF NOT EXISTS "fotos_evidencia_excluida_idx" ON "fotos_evidencia"("excluida");
CREATE INDEX IF NOT EXISTS "fotos_evidencia_data_exclusao_idx" ON "fotos_evidencia"("data_exclusao");

CREATE INDEX IF NOT EXISTS "notificacoes_whatsapp_visitante_id_idx" ON "notificacoes_whatsapp"("visitante_id");
CREATE INDEX IF NOT EXISTS "notificacoes_whatsapp_status_idx" ON "notificacoes_whatsapp"("status_envio");

-- ============================================
-- SEED INICIAL - CONFIGURAÇÕES PADRÃO
-- ============================================
INSERT INTO "configuracoes_visitas" (
    "id",
    "dias_permitidos",
    "limite_adultos_padrao",
    "limite_criancas_padrao",
    "habilitar_regra_segundo_sabado",
    "limite_adultos_segundo_sab",
    "limite_criancas_segundo_sab",
    "permitir_alternativa",
    "idade_limite_crianca",
    "casas_manha_inicio",
    "casas_manha_fim",
    "casas_tarde_inicio",
    "casas_tarde_fim",
    "horario_manha_inicio",
    "horario_manha_fim",
    "horario_tarde_inicio",
    "horario_tarde_fim",
    "quantidade_visitas_mensal",
    "ativo"
) VALUES (
    gen_random_uuid(),
    '[6]'::json, -- Apenas sábados (0=domingo, 6=sábado)
    2, -- 2 adultos padrão
    1, -- 1 criança padrão
    true, -- Regra especial segundo sábado ativa
    2, -- 2 adultos no segundo sábado
    1, -- 1 criança no segundo sábado
    true, -- Permite 2 adultos + 1 criança OU 1 adulto + 2 crianças
    12, -- Criança = menos de 12 anos
    1, -- Casas 1-4 manhã
    4,
    5, -- Casas 5-8 tarde
    8,
    '08:00',
    '12:00',
    '13:00',
    '17:00',
    2, -- 2 visitas por mês
    true
) ON CONFLICT DO NOTHING;

-- ============================================
-- TEMPLATES DE EMAIL PADRÃO
-- ============================================
INSERT INTO "templates_email" ("id", "nome", "assunto", "corpo", "ativo") VALUES
(gen_random_uuid(), 'ORIENTACOES_VISITA', 'Orientações para Visita - CENSE Maringá',
'Prezado(a) {{nome}},

Você está cadastrado para visitar o adolescente no CENSE Maringá.

ORIENTAÇÕES IMPORTANTES:

O visitante deverá apresentar-se na entrada da unidade portando documento de identificação com foto e vestindo roupas adequadas, conforme orientação prévia.

É PROIBIDA A ENTRADA de visitantes com:
- Roupas transparentes, shorts, sutiã com armação
- Calça de cintura baixa, calça branca, legging
- Minissaia, mini blusas, roupas com decotes acentuados
- Boné, chapéu, gorro
- Relógio, joias, piercing, bijuterias
- Chaves, chaveiros, presilhas, grampos de cabelo
- Cinto e similares
- Carteiras, dinheiro, bolsa
- Cigarros e similares

HORÁRIOS AUTORIZADOS: {{horario}}
NÚMERO DE VISITAS: {{quantidade_visitas}} por mês

Atenciosamente,
CENSE Maringá', true),

(gen_random_uuid(), 'CONFIRMACAO_VISITA', 'Confirmação de Visita Registrada',
'Prezado(a) {{nome}},

Sua visita ao adolescente {{adolescente}} foi registrada com sucesso!

Data/Hora: {{data_hora}}
Período: {{periodo}}

Obrigado por seguir as orientações.

Atenciosamente,
CENSE Maringá', true)

ON CONFLICT (nome) DO NOTHING;

-- FIM DA MIGRATION
