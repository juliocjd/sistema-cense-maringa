ALTER TABLE "visitantes"
  ADD COLUMN "bnmp_ultima_consulta_em" TIMESTAMP(3),
  ADD COLUMN "bnmp_ultima_consulta_operador_id" TEXT;

ALTER TABLE "visitantes"
  ADD CONSTRAINT "visitantes_bnmp_ultima_consulta_operador_id_fkey"
  FOREIGN KEY ("bnmp_ultima_consulta_operador_id")
  REFERENCES "operadores"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
