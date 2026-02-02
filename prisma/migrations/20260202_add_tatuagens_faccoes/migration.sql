-- Tabela de associação entre tatuagens e facções
CREATE TABLE IF NOT EXISTS "tatuagens_catalogo_faccoes" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tatuagem_catalogo_id" text NOT NULL REFERENCES "tatuagens_catalogo"("id") ON DELETE CASCADE,
  "faccao_id" text NOT NULL REFERENCES "faccoes"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "tatuagens_catalogo_faccoes_unique"
  ON "tatuagens_catalogo_faccoes" ("tatuagem_catalogo_id", "faccao_id");