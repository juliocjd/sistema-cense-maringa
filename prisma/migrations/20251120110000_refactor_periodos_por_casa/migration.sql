-- AlterTable configuracoes_visitas: Migrar de faixas para mapeamento individual
-- Primeiro, adicionar a nova coluna com valores padrão baseados nos campos antigos
ALTER TABLE "configuracoes_visitas" ADD COLUMN IF NOT EXISTS "periodos_por_casa" JSONB NOT NULL DEFAULT '{"1":"MANHA","2":"MANHA","3":"MANHA","4":"MANHA","5":"TARDE","6":"TARDE","7":"TARDE","8":"TARDE"}'::jsonb;

-- Migrar dados existentes: construir JSON baseado nas faixas antigas
UPDATE "configuracoes_visitas"
SET "periodos_por_casa" = (
  SELECT jsonb_object_agg(casa_num::text, periodo)
  FROM (
    SELECT generate_series(1, 20) as casa_num,
           CASE
             WHEN generate_series >= casas_manha_inicio AND generate_series <= casas_manha_fim THEN 'MANHA'
             WHEN generate_series >= casas_tarde_inicio AND generate_series <= casas_tarde_fim THEN 'TARDE'
             ELSE 'MANHA'
           END as periodo
  ) subquery
)
WHERE casas_manha_inicio IS NOT NULL;

-- Remover as colunas antigas
ALTER TABLE "configuracoes_visitas" DROP COLUMN IF EXISTS "casas_manha_inicio";
ALTER TABLE "configuracoes_visitas" DROP COLUMN IF EXISTS "casas_manha_fim";
ALTER TABLE "configuracoes_visitas" DROP COLUMN IF EXISTS "casas_tarde_inicio";
ALTER TABLE "configuracoes_visitas" DROP COLUMN IF EXISTS "casas_tarde_fim";
