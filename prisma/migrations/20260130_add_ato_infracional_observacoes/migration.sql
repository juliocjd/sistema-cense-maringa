-- Add observacoes complementares do ato infracional atual
ALTER TABLE "public"."adolescentes"
ADD COLUMN IF NOT EXISTS "ato_infracional_observacoes" TEXT;
