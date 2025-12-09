-- AlterTable
ALTER TABLE "comunicados_internos"
  ADD COLUMN "desativado_em" TIMESTAMP(3),
  ADD COLUMN "suspenso_por_status" BOOLEAN NOT NULL DEFAULT false;
