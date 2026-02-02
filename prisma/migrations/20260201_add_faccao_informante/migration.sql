ALTER TABLE "adolescentes_faccao_historico"
ADD COLUMN "informante_adolescente_id" TEXT;

ALTER TABLE "adolescentes_faccao_historico"
ADD CONSTRAINT "adolescentes_faccao_historico_informante_adolescente_id_fkey"
FOREIGN KEY ("informante_adolescente_id")
REFERENCES "adolescentes"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "adolescentes_faccao_historico_informante_adolescente_id_idx"
ON "adolescentes_faccao_historico"("informante_adolescente_id");
