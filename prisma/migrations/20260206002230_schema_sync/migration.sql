-- DropForeignKey
ALTER TABLE "adolescentes" DROP CONSTRAINT "adolescentes_faccao_vinculo_atual_id_fkey";

-- DropForeignKey
ALTER TABLE "adolescentes_faccao_historico" DROP CONSTRAINT "adolescentes_faccao_historico_adolescente_id_fkey";

-- DropForeignKey
ALTER TABLE "adolescentes_faccao_historico" DROP CONSTRAINT "adolescentes_faccao_historico_criado_por_id_fkey";

-- DropForeignKey
ALTER TABLE "adolescentes_faccao_historico" DROP CONSTRAINT "adolescentes_faccao_historico_faccao_id_fkey";

-- DropForeignKey
ALTER TABLE "tatuagens_catalogo_faccoes" DROP CONSTRAINT "tatuagens_catalogo_faccoes_faccao_id_fkey";

-- DropForeignKey
ALTER TABLE "tatuagens_catalogo_faccoes" DROP CONSTRAINT "tatuagens_catalogo_faccoes_tatuagem_catalogo_id_fkey";

-- DropIndex
DROP INDEX "adolescentes_faccao_historico_informante_adolescente_id_idx";

-- AlterTable
ALTER TABLE "adolescentes_faccao_historico" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "criado_em" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "adolescentes_tecnicos_referencia" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "criado_em" SET NOT NULL;

-- AlterTable
ALTER TABLE "cidades" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "conflitos" ALTER COLUMN "ultima_ocorrencia_em" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "conflitos_ocorrencias" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "criado_em" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tatuagens_catalogo_faccoes" ALTER COLUMN "id" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "adolescentes_historico_infracional" RENAME CONSTRAINT "adolescentes_historico_infracional_ato_infracional_catalogo_id_" TO "adolescentes_historico_infracional_ato_infracional_catalog_fkey";

-- AddForeignKey
ALTER TABLE "adolescentes" ADD CONSTRAINT "adolescentes_faccao_vinculo_atual_id_fkey" FOREIGN KEY ("faccao_vinculo_atual_id") REFERENCES "adolescentes_faccao_historico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes_faccao_historico" ADD CONSTRAINT "adolescentes_faccao_historico_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes_faccao_historico" ADD CONSTRAINT "adolescentes_faccao_historico_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "operadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes_faccao_historico" ADD CONSTRAINT "adolescentes_faccao_historico_faccao_id_fkey" FOREIGN KEY ("faccao_id") REFERENCES "faccoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tatuagens_catalogo_faccoes" ADD CONSTRAINT "tatuagens_catalogo_faccoes_faccao_id_fkey" FOREIGN KEY ("faccao_id") REFERENCES "faccoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tatuagens_catalogo_faccoes" ADD CONSTRAINT "tatuagens_catalogo_faccoes_tatuagem_catalogo_id_fkey" FOREIGN KEY ("tatuagem_catalogo_id") REFERENCES "tatuagens_catalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "adolescentes_faccao_historico_idx_adol_status" RENAME TO "adolescentes_faccao_historico_adolescente_id_status_registr_idx";

-- RenameIndex
ALTER INDEX "adolescentes_tecnicos_referencia_adolescente_tecnico_key" RENAME TO "adolescentes_tecnicos_referencia_adolescente_id_tecnico_ref_key";

-- RenameIndex
ALTER INDEX "atos_infracionais_vinculos_adolescente_id_idx" RENAME TO "atos_infracionais_vinculos_adolescentes_adolescente_id_idx";

-- RenameIndex
ALTER INDEX "atos_infracionais_vinculos_adolescente_key" RENAME TO "atos_infracionais_vinculos_adolescentes_vinculo_id_adolesce_key";

-- RenameIndex
ALTER INDEX "tatuagens_catalogo_faccoes_unique" RENAME TO "tatuagens_catalogo_faccoes_tatuagem_catalogo_id_faccao_id_key";
