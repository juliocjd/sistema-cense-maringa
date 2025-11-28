BEGIN;

CREATE TABLE "historico_movimentacao" (
    "id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "origem_casa_id" TEXT,
    "origem_alojamento_id" TEXT,
    "destino_casa_id" TEXT,
    "destino_alojamento_id" TEXT,
    "referencia_tipo" TEXT,
    "referencia_id" TEXT,
    "operador_id" TEXT,
    "registrado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "historico_movimentacao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "historico_movimentacao_adolescente_id_registrado_em_idx" ON "historico_movimentacao"("adolescente_id", COALESCE("registrado_em", "criado_em"));

ALTER TABLE "historico_movimentacao"
  ADD CONSTRAINT "historico_movimentacao_adolescente_id_fkey"
  FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "historico_movimentacao"
  ADD CONSTRAINT "historico_movimentacao_origem_casa_id_fkey"
  FOREIGN KEY ("origem_casa_id") REFERENCES "casas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "historico_movimentacao"
  ADD CONSTRAINT "historico_movimentacao_destino_casa_id_fkey"
  FOREIGN KEY ("destino_casa_id") REFERENCES "casas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "historico_movimentacao"
  ADD CONSTRAINT "historico_movimentacao_origem_alojamento_id_fkey"
  FOREIGN KEY ("origem_alojamento_id") REFERENCES "alojamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "historico_movimentacao"
  ADD CONSTRAINT "historico_movimentacao_destino_alojamento_id_fkey"
  FOREIGN KEY ("destino_alojamento_id") REFERENCES "alojamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "historico_movimentacao"
  ADD CONSTRAINT "historico_movimentacao_operador_id_fkey"
  FOREIGN KEY ("operador_id") REFERENCES "operadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;