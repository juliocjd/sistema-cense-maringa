-- Remover localizacao do catalogo de tatuagens
ALTER TABLE "tatuagens_catalogo"
  DROP COLUMN IF EXISTS "localizacao";
