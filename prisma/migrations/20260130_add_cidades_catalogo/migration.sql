-- CreateTable
CREATE TABLE "cidades" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "nome" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cidades_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "bairros" ADD COLUMN "cidade_id" TEXT;

-- Seed cities from existing bairros (default state PR)
INSERT INTO "cidades" ("nome", "estado", "atualizado_em")
SELECT MIN(TRIM("cidade")) AS nome, 'PR', CURRENT_TIMESTAMP
FROM "bairros"
GROUP BY LOWER(TRIM("cidade"));

-- Backfill city ids
UPDATE "bairros" b
SET "cidade_id" = c."id"
FROM "cidades" c
WHERE LOWER(TRIM(b."cidade")) = LOWER(TRIM(c."nome"))
  AND c."estado" = 'PR';

-- Ensure not null
ALTER TABLE "bairros" ALTER COLUMN "cidade_id" SET NOT NULL;

-- Drop old unique and create new unique
DROP INDEX IF EXISTS "bairros_nome_bairro_cidade_key";
CREATE UNIQUE INDEX "bairros_nome_bairro_cidade_id_key" ON "bairros"("nome_bairro", "cidade_id");

-- Index for city id
CREATE INDEX "bairros_cidade_id_idx" ON "bairros"("cidade_id");

-- AddForeignKey
ALTER TABLE "bairros" ADD CONSTRAINT "bairros_cidade_id_fkey" FOREIGN KEY ("cidade_id") REFERENCES "cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "cidades_nome_estado_key" ON "cidades"("nome", "estado");
