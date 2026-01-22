-- Conflito: contadores e ocorrencias

-- novas colunas no conflito para rastrear reincidencia
ALTER TABLE "conflitos"
  ADD COLUMN "total_ocorrencias" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ultima_ocorrencia_em" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- tabela de ocorrencias de conflito
CREATE TABLE "conflitos_ocorrencias" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conflito_id TEXT NOT NULL REFERENCES "conflitos"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ci_id TEXT REFERENCES "comunicados_internos"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  descricao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ajustar FK de conflito -> CI para permitir exclusao do CI sem remover o conflito
ALTER TABLE "conflitos" DROP CONSTRAINT IF EXISTS "conflitos_ci_origem_id_fkey";
ALTER TABLE "conflitos"
  ADD CONSTRAINT "conflitos_ci_origem_id_fkey"
  FOREIGN KEY ("ci_origem_id") REFERENCES "comunicados_internos"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- backfill: marcar conflitos existentes com uma ocorrencia baseline
UPDATE "conflitos"
  SET total_ocorrencias = 1,
      ultima_ocorrencia_em = COALESCE(ultima_ocorrencia_em, criado_em);
