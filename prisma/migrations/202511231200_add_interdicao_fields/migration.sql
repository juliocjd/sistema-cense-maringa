-- Adiciona campos para armazenar os dados da interdição do alojamento
ALTER TABLE "alojamentos"
  ADD COLUMN "interdicao_justificativa" TEXT,
  ADD COLUMN "interdicao_documento_tipo" VARCHAR(64),
  ADD COLUMN "interdicao_documento_referencia" TEXT;
