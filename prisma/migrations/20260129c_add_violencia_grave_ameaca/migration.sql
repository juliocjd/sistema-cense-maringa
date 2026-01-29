-- Add violence / grave threat flag to catalog
ALTER TABLE "atos_infracionais_catalogo"
ADD COLUMN "violencia_ou_grave_ameaca" BOOLEAN NOT NULL DEFAULT false;
