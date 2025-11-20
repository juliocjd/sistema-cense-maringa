-- Script para migração segura dos períodos por casa
-- Executar este script diretamente no banco de dados antes do db push

-- 1. Adicionar nova coluna
ALTER TABLE "configuracoes_visitas"
ADD COLUMN IF NOT EXISTS "periodos_por_casa" JSONB;

-- 2. Migrar dados existentes
UPDATE "configuracoes_visitas"
SET "periodos_por_casa" = jsonb_build_object(
  '1', CASE WHEN 1 >= casas_manha_inicio AND 1 <= casas_manha_fim THEN 'MANHA' ELSE 'TARDE' END,
  '2', CASE WHEN 2 >= casas_manha_inicio AND 2 <= casas_manha_fim THEN 'MANHA' ELSE 'TARDE' END,
  '3', CASE WHEN 3 >= casas_manha_inicio AND 3 <= casas_manha_fim THEN 'MANHA' ELSE 'TARDE' END,
  '4', CASE WHEN 4 >= casas_manha_inicio AND 4 <= casas_manha_fim THEN 'MANHA' ELSE 'TARDE' END,
  '5', CASE WHEN 5 >= casas_manha_inicio AND 5 <= casas_manha_fim THEN 'MANHA' ELSE 'TARDE' END,
  '6', CASE WHEN 6 >= casas_manha_inicio AND 6 <= casas_manha_fim THEN 'MANHA' ELSE 'TARDE' END,
  '7', CASE WHEN 7 >= casas_manha_inicio AND 7 <= casas_manha_fim THEN 'MANHA' ELSE 'TARDE' END,
  '8', CASE WHEN 8 >= casas_manha_inicio AND 8 <= casas_manha_fim THEN 'MANHA' ELSE 'TARDE' END
)
WHERE "periodos_por_casa" IS NULL;

-- 3. Agora pode executar: npx prisma db push --accept-data-loss
