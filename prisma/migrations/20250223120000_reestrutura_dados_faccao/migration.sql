-- Ajusta campos de facção e adiciona novos metadados para adolescentes
ALTER TABLE "adolescentes"
  DROP COLUMN IF EXISTS "faccao_numero_membro",
  ADD COLUMN "vulgo" TEXT,
  ADD COLUMN "faccao_funcao" TEXT,
  ADD COLUMN "faccao_informacao_origem" TEXT,
  ADD COLUMN "faccao_informacao_detalhe" TEXT;
