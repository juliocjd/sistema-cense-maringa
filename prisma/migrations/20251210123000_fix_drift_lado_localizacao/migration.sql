-- Ajuste de drift: adiciona colunas existentes no banco que não estavam no histórico
-- (safe para dados existentes; usa IF NOT EXISTS)

ALTER TABLE "comunicados_internos_adolescentes_link"
ADD COLUMN IF NOT EXISTS "lado_conflito" TEXT;

ALTER TABLE "tatuagens_catalogo"
ADD COLUMN IF NOT EXISTS "localizacao" VARCHAR(60);
