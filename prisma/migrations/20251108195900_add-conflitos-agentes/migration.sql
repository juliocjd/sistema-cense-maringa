-- Create table for agents of reference
CREATE TABLE "agentes_profissionais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "atividade" TEXT,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agentes_profissionais_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agentes_profissionais_email_key" ON "agentes_profissionais"("email");

-- Create table that expresses facção-to-facção conflicts
CREATE TABLE "faccoes_conflitos" (
    "id" TEXT NOT NULL,
    "faccao_a_id" TEXT NOT NULL,
    "faccao_b_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "faccoes_conflitos_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "faccoes_conflitos"
    ADD CONSTRAINT "faccoes_conflitos_faccao_a_id_fkey"
    FOREIGN KEY ("faccao_a_id") REFERENCES "faccoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "faccoes_conflitos"
    ADD CONSTRAINT "faccoes_conflitos_faccao_b_id_fkey"
    FOREIGN KEY ("faccao_b_id") REFERENCES "faccoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Extend adolescentes with the new metadata fields
ALTER TABLE "adolescentes"
    ADD COLUMN "ato_infracional_ano" INTEGER,
    ADD COLUMN "ato_infracional_processo" TEXT,
    ADD COLUMN "ato_infracional_gravidade" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "ato_infracional_gravidade_obs" TEXT,
    ADD COLUMN "agente_referencia_id" TEXT,
    ADD COLUMN "data_desinternacao" TIMESTAMP(3);

ALTER TABLE "adolescentes"
    ADD CONSTRAINT "adolescentes_agente_referencia_id_fkey"
    FOREIGN KEY ("agente_referencia_id") REFERENCES "agentes_profissionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Store the extra fields when moving records to the infractions history log
ALTER TABLE "adolescentes_historico_infracional"
    ADD COLUMN "ato_infracional_ano" INTEGER,
    ADD COLUMN "ato_infracional_processo" TEXT,
    ADD COLUMN "ato_infracional_gravidade" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "ato_infracional_gravidade_obs" TEXT;
