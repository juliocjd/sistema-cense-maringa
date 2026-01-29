-- Catalogo de atos infracionais e FK nos adolescentes
CREATE TABLE "atos_infracionais_catalogo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_por_id" TEXT,
    CONSTRAINT "atos_infracionais_catalogo_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "atos_infracionais_catalogo"
  ADD CONSTRAINT "atos_infracionais_catalogo_criado_por_id_fkey"
  FOREIGN KEY ("criado_por_id") REFERENCES "operadores"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "atos_infracionais_catalogo_nome_ci_idx"
  ON "atos_infracionais_catalogo" (lower(trim("nome")));
CREATE UNIQUE INDEX "atos_infracionais_catalogo_nome_key"
  ON "atos_infracionais_catalogo" ("nome");
CREATE INDEX "atos_infracionais_catalogo_ativo_idx"
  ON "atos_infracionais_catalogo" ("ativo");

ALTER TABLE "adolescentes" ADD COLUMN "ato_infracional_atual_id" TEXT;
ALTER TABLE "adolescentes"
  ADD CONSTRAINT "adolescentes_ato_infracional_atual_id_fkey"
  FOREIGN KEY ("ato_infracional_atual_id") REFERENCES "atos_infracionais_catalogo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "adolescentes" DROP COLUMN IF EXISTS "ato_infracional_atual";

ALTER TABLE "adolescentes_historico_infracional" ADD COLUMN "ato_infracional_catalogo_id" TEXT;
ALTER TABLE "adolescentes_historico_infracional"
  ADD CONSTRAINT "adolescentes_historico_infracional_ato_infracional_catalogo_id_fkey"
  FOREIGN KEY ("ato_infracional_catalogo_id") REFERENCES "atos_infracionais_catalogo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
