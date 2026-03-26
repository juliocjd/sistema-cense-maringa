-- Add case-level narrative fields
ALTER TABLE "adolescentes_casos_infracionais"
  ADD COLUMN "titulo" TEXT,
  ADD COLUMN "narrativa" TEXT,
  ADD COLUMN "local_fato" TEXT,
  ADD COLUMN "meio_execucao" TEXT,
  ADD COLUMN "papel_adolescente" TEXT,
  ADD COLUMN "periodo_texto" TEXT,
  ADD COLUMN "observacoes" TEXT;

-- Move tipificacoes to point directly at the case
ALTER TABLE "adolescentes_casos_infracionais_tipificacoes"
  ADD COLUMN "caso_id" TEXT;

WITH fatos_ordenados AS (
  SELECT
    f.*,
    ROW_NUMBER() OVER (
      PARTITION BY f."caso_id"
      ORDER BY f."ordem" ASC, f."criado_em" ASC, f."id" ASC
    ) AS rn,
    COUNT(*) OVER (PARTITION BY f."caso_id") AS total_fatos
  FROM "adolescentes_casos_infracionais_fatos" f
),
primeiro_fato AS (
  SELECT
    "caso_id",
    NULLIF(BTRIM("titulo"), '') AS "titulo",
    NULLIF(BTRIM("local_fato"), '') AS "local_fato",
    NULLIF(BTRIM("meio_execucao"), '') AS "meio_execucao",
    NULLIF(BTRIM("papel_adolescente"), '') AS "papel_adolescente",
    NULLIF(BTRIM("periodo_texto"), '') AS "periodo_texto"
  FROM fatos_ordenados
  WHERE rn = 1
),
texto_consolidado AS (
  SELECT
    f."caso_id",
    STRING_AGG(
      CASE
        WHEN NULLIF(BTRIM(f."narrativa"), '') IS NULL THEN NULL
        WHEN f.total_fatos > 1 AND NULLIF(BTRIM(f."titulo"), '') IS NOT NULL
          THEN f."titulo" || E'\n' || f."narrativa"
        ELSE f."narrativa"
      END,
      E'\n\n'
      ORDER BY f."ordem" ASC, f."criado_em" ASC, f."id" ASC
    ) AS "narrativa",
    STRING_AGG(
      NULLIF(BTRIM(f."observacoes"), ''),
      E'\n\n'
      ORDER BY f."ordem" ASC, f."criado_em" ASC, f."id" ASC
    ) FILTER (WHERE NULLIF(BTRIM(f."observacoes"), '') IS NOT NULL) AS "observacoes"
  FROM fatos_ordenados f
  GROUP BY f."caso_id"
)
UPDATE "adolescentes_casos_infracionais" c
SET
  "titulo" = pf."titulo",
  "narrativa" = tc."narrativa",
  "local_fato" = pf."local_fato",
  "meio_execucao" = pf."meio_execucao",
  "papel_adolescente" = pf."papel_adolescente",
  "periodo_texto" = pf."periodo_texto",
  "observacoes" = tc."observacoes"
FROM primeiro_fato pf
JOIN texto_consolidado tc ON tc."caso_id" = pf."caso_id"
WHERE c."id" = pf."caso_id";

UPDATE "adolescentes_casos_infracionais_tipificacoes" t
SET "caso_id" = f."caso_id"
FROM "adolescentes_casos_infracionais_fatos" f
WHERE f."id" = t."fato_id";

ALTER TABLE "adolescentes_casos_infracionais_tipificacoes"
  ALTER COLUMN "caso_id" SET NOT NULL;

CREATE INDEX "adolescentes_casos_infracionais_tipificacoes_caso_id_ordem_idx"
  ON "adolescentes_casos_infracionais_tipificacoes"("caso_id", "ordem");

ALTER TABLE "adolescentes_casos_infracionais_tipificacoes"
  ADD CONSTRAINT "adolescentes_casos_infracionais_tipificacoes_caso_id_fkey"
  FOREIGN KEY ("caso_id") REFERENCES "adolescentes_casos_infracionais"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "adolescentes_casos_infracionais_tipificacoes"
  DROP CONSTRAINT "adolescentes_casos_infracionais_tipificacoes_fato_id_fkey";

DROP INDEX "adolescentes_casos_infracionais_tipificacoes_fato_id_ordem_idx";

ALTER TABLE "adolescentes_casos_infracionais_tipificacoes"
  DROP COLUMN "fato_id";

DROP TABLE "adolescentes_casos_infracionais_fatos";
