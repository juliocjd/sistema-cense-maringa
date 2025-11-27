-- Ajusta foreign key de alertas para remover registros ao excluir adolescentes
ALTER TABLE "alertas_ativos" DROP CONSTRAINT IF EXISTS "alertas_ativos_adolescente_id_fkey";

ALTER TABLE "alertas_ativos"
ADD CONSTRAINT "alertas_ativos_adolescente_id_fkey"
FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
