-- Histórico de facção para adolescentes
CREATE TABLE IF NOT EXISTS "adolescentes_faccao_historico" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "adolescente_id" text NOT NULL REFERENCES "adolescentes"("id") ON DELETE CASCADE,
  "faccao_id" text REFERENCES "faccoes"("id"),
  "funcao" text,
  "origem_informacao" text NOT NULL,
  "nivel_confianca" text,
  "status_registro" text NOT NULL DEFAULT 'ATIVA',
  "observacao" text,
  "fonte" text,
  "criado_em" timestamp NOT NULL DEFAULT now(),
  "criado_por_id" text REFERENCES "operadores"("id")
);

CREATE INDEX IF NOT EXISTS "adolescentes_faccao_historico_idx_adol_status"
  ON "adolescentes_faccao_historico" ("adolescente_id", "status_registro");

ALTER TABLE "adolescentes"
  ADD COLUMN IF NOT EXISTS "faccao_vinculo_atual_id" uuid REFERENCES "adolescentes_faccao_historico"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "adolescentes_faccao_vinculo_atual_id_key"
  ON "adolescentes" ("faccao_vinculo_atual_id");
