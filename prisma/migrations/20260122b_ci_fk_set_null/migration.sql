-- Ajuste FK para permitir exclusao de CI sem remover conflitos
ALTER TABLE "conflitos" DROP CONSTRAINT IF EXISTS "conflitos_ci_origem_id_fkey";
ALTER TABLE "conflitos"
  ADD CONSTRAINT "conflitos_ci_origem_id_fkey"
  FOREIGN KEY ("ci_origem_id") REFERENCES "comunicados_internos"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
