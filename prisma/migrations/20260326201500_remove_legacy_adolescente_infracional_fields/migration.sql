-- DropForeignKey
ALTER TABLE "adolescentes" DROP CONSTRAINT "adolescentes_ato_infracional_atual_id_fkey";

-- AlterTable
ALTER TABLE "adolescentes" DROP COLUMN "ato_infracional_ano",
DROP COLUMN "ato_infracional_atual_id",
DROP COLUMN "ato_infracional_observacoes",
DROP COLUMN "ato_infracional_processo",
DROP COLUMN "numero_processo";

