-- CreateTable
CREATE TABLE "adolescentes_casos_infracionais" (
    "id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATUAL',
    "numero_processo" TEXT,
    "ano_fato" INTEGER,
    "comarca" TEXT,
    "observacoes_gerais" TEXT,
    "resumo_operacional" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adolescentes_casos_infracionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adolescentes_casos_infracionais_fatos" (
    "id" TEXT NOT NULL,
    "caso_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 1,
    "titulo" TEXT,
    "narrativa" TEXT NOT NULL,
    "local_fato" TEXT,
    "meio_execucao" TEXT,
    "papel_adolescente" TEXT,
    "periodo_texto" TEXT,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adolescentes_casos_infracionais_fatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adolescentes_casos_infracionais_tipificacoes" (
    "id" TEXT NOT NULL,
    "fato_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 1,
    "ato_infracional_catalogo_id" TEXT,
    "descricao_manual" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "qualificadora" TEXT,
    "majorante" TEXT,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adolescentes_casos_infracionais_tipificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adolescentes_casos_infracionais_adolescente_id_status_idx" ON "adolescentes_casos_infracionais"("adolescente_id", "status");

-- CreateIndex
CREATE INDEX "adolescentes_casos_infracionais_fatos_caso_id_ordem_idx" ON "adolescentes_casos_infracionais_fatos"("caso_id", "ordem");

-- CreateIndex
CREATE INDEX "adolescentes_casos_infracionais_tipificacoes_fato_id_ordem_idx" ON "adolescentes_casos_infracionais_tipificacoes"("fato_id", "ordem");

-- AddForeignKey
ALTER TABLE "adolescentes_casos_infracionais" ADD CONSTRAINT "adolescentes_casos_infracionais_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes_casos_infracionais_fatos" ADD CONSTRAINT "adolescentes_casos_infracionais_fatos_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "adolescentes_casos_infracionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes_casos_infracionais_tipificacoes" ADD CONSTRAINT "adolescentes_casos_infracionais_tipificacoes_fato_id_fkey" FOREIGN KEY ("fato_id") REFERENCES "adolescentes_casos_infracionais_fatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes_casos_infracionais_tipificacoes" ADD CONSTRAINT "adolescentes_casos_infracionais_tipificacoes_ato_infracion_fkey" FOREIGN KEY ("ato_infracional_catalogo_id") REFERENCES "atos_infracionais_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
