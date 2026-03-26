ALTER TABLE "casas"
ADD COLUMN "destinacao_operacional" VARCHAR(32) NOT NULL DEFAULT 'DEFINITIVA',
ADD COLUMN "fase_exclusiva_id" TEXT,
ADD COLUMN "prazo_maximo_dias" INTEGER,
ADD COLUMN "risco_maximo_permitido" INTEGER;

CREATE INDEX IF NOT EXISTS "casas_fase_exclusiva_id_idx"
  ON "casas"("fase_exclusiva_id");

ALTER TABLE "casas"
ADD CONSTRAINT "casas_fase_exclusiva_id_fkey"
FOREIGN KEY ("fase_exclusiva_id") REFERENCES "fases_internacao"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "casas"
SET
  "destinacao_operacional" = 'PROVISORIA',
  "fase_exclusiva_id" = NULL,
  "prazo_maximo_dias" = NULL,
  "risco_maximo_permitido" = NULL
WHERE "numero" = 1;

UPDATE "casas"
SET
  "destinacao_operacional" = 'DEFINITIVA',
  "fase_exclusiva_id" = NULL,
  "prazo_maximo_dias" = NULL,
  "risco_maximo_permitido" = NULL
WHERE "numero" BETWEEN 2 AND 6;

UPDATE "casas"
SET
  "destinacao_operacional" = 'FASE_EXCLUSIVA',
  "fase_exclusiva_id" = COALESCE(
    (SELECT "id" FROM "fases_internacao" WHERE "nome_fase" = 'Fase 3' LIMIT 1),
    (SELECT "id" FROM "fases_internacao" WHERE "ordem" = 3 LIMIT 1)
  ),
  "prazo_maximo_dias" = NULL,
  "risco_maximo_permitido" = 1
WHERE "numero" = 7;

UPDATE "casas"
SET
  "destinacao_operacional" = 'ABRIGAMENTO',
  "fase_exclusiva_id" = NULL,
  "prazo_maximo_dias" = 5,
  "risco_maximo_permitido" = NULL
WHERE "numero" = 8;
