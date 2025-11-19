-- AlterTable: Adicionar campos ao Visitante
ALTER TABLE "visitantes"
ADD COLUMN IF NOT EXISTS "email" TEXT;

-- CreateTable: Configurações de Visitas
CREATE TABLE IF NOT EXISTS "configuracoes_visitas" (
    "id" TEXT NOT NULL,
    "dias_permitidos" JSONB NOT NULL DEFAULT '[6]',
    "limite_adultos_padrao" INTEGER NOT NULL DEFAULT 2,
    "limite_criancas_padrao" INTEGER NOT NULL DEFAULT 1,
    "habilitar_regra_segundo_sabado" BOOLEAN NOT NULL DEFAULT true,
    "limite_adultos_segundo_sab" INTEGER NOT NULL DEFAULT 2,
    "limite_criancas_segundo_sab" INTEGER NOT NULL DEFAULT 1,
    "permitir_alternativa" BOOLEAN NOT NULL DEFAULT true,
    "idade_limite_crianca" INTEGER NOT NULL DEFAULT 12,
    "casas_manha_inicio" INTEGER NOT NULL DEFAULT 1,
    "casas_manha_fim" INTEGER NOT NULL DEFAULT 4,
    "casas_tarde_inicio" INTEGER NOT NULL DEFAULT 5,
    "casas_tarde_fim" INTEGER NOT NULL DEFAULT 8,
    "horario_manha_inicio" TEXT NOT NULL DEFAULT '08:00',
    "horario_manha_fim" TEXT NOT NULL DEFAULT '12:00',
    "horario_tarde_inicio" TEXT NOT NULL DEFAULT '13:00',
    "horario_tarde_fim" TEXT NOT NULL DEFAULT '17:00',
    "quantidade_visitas_mensal" INTEGER NOT NULL DEFAULT 2,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_visitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Templates de E-mail
CREATE TABLE IF NOT EXISTS "templates_email" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_email_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notificações de Visitantes
CREATE TABLE IF NOT EXISTS "notificacoes_visitantes" (
    "id" TEXT NOT NULL,
    "visitante_id" TEXT NOT NULL,
    "tipo_notificacao" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "email_destinatario" TEXT NOT NULL,
    "status_envio" TEXT NOT NULL DEFAULT 'PENDENTE',
    "erro_envio" TEXT,
    "data_envio" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_visitantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Alertas de Facções Rivais
CREATE TABLE IF NOT EXISTS "alertas_faccoes_rivais" (
    "id" TEXT NOT NULL,
    "visitante_id" TEXT NOT NULL,
    "faccao_1_id" TEXT NOT NULL,
    "faccao_2_id" TEXT NOT NULL,
    "adolescente_1_id" TEXT NOT NULL,
    "adolescente_2_id" TEXT NOT NULL,
    "nivel_alerta" TEXT NOT NULL DEFAULT 'MEDIO',
    "observacoes" TEXT,
    "visualizado" BOOLEAN NOT NULL DEFAULT false,
    "data_visualizacao" TIMESTAMP(3),
    "operador_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_faccoes_rivais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "templates_email_nome_key" ON "templates_email"("nome");

-- AddForeignKey
ALTER TABLE "notificacoes_visitantes" ADD CONSTRAINT "notificacoes_visitantes_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Inserir configuração padrão de visitas
INSERT INTO "configuracoes_visitas" (
    "id",
    "dias_permitidos",
    "atualizado_em"
)
VALUES (
    gen_random_uuid(),
    '[6]'::jsonb,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Inserir template padrão de orientações
INSERT INTO "templates_email" (
    "id",
    "nome",
    "assunto",
    "corpo",
    "atualizado_em"
)
VALUES (
    gen_random_uuid(),
    'ORIENTACOES_VISITA',
    'Orientações para Visita - CENSE Maringá',
    'Prezado(a) {{nome}},

Informamos que você está cadastrado(a) para visitar adolescentes no CENSE Maringá.

IMPORTANTE - ORIENTAÇÕES PARA VISITA:

O visitante deverá apresentar-se na entrada da unidade portando documento de identificação com foto e vestindo roupas adequadas, conforme orientação prévia.

É PROIBIDA a entrada de visitantes com:
- Roupas transparentes, shorts, sutiã com armação
- Calça de cintura baixa, calça branca, legging
- Minissaia, mini blusas, roupas com decotes acentuados
- Boné, chapéu, gorro
- Relógio, joias, piercing, bijuterias
- Chaves, chaveiros, presilhas, grampos de cabelo
- Cinto e similares
- Carteiras, dinheiro, bolsa
- Cigarros e outros itens proibidos

HORÁRIOS DE VISITA:
- Casas 1 a 4: Período da Manhã (08:00 às 12:00)
- Casas 5 a 8: Período da Tarde (13:00 às 17:00)

LIMITE DE VISITANTES:
- Cada adolescente pode receber até 2 visitas por mês
- Quantidade: 2 adultos ou 1 adulto + 1 criança (menores de 12 anos)
- Segundo sábado do mês: 2 adultos + 1 criança OU 1 adulto + 2 crianças

Para mais informações, entre em contato com a unidade.

Atenciosamente,
Equipe CENSE Maringá',
    CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO NOTHING;
