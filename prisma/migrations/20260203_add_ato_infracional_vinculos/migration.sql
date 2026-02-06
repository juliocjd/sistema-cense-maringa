-- Vinculos de ato infracional entre adolescentes
CREATE TABLE "atos_infracionais_vinculos" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atos_infracionais_vinculos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "atos_infracionais_vinculos_adolescentes" (
    "id" TEXT NOT NULL,
    "vinculo_id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atos_infracionais_vinculos_adolescentes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "atos_infracionais_vinculos_adolescente_key" ON "atos_infracionais_vinculos_adolescentes"("vinculo_id", "adolescente_id");
CREATE INDEX "atos_infracionais_vinculos_adolescente_id_idx" ON "atos_infracionais_vinculos_adolescentes"("adolescente_id");

ALTER TABLE "atos_infracionais_vinculos_adolescentes" ADD CONSTRAINT "atos_infracionais_vinculos_adolescentes_vinculo_id_fkey" FOREIGN KEY ("vinculo_id") REFERENCES "atos_infracionais_vinculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "atos_infracionais_vinculos_adolescentes" ADD CONSTRAINT "atos_infracionais_vinculos_adolescentes_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
