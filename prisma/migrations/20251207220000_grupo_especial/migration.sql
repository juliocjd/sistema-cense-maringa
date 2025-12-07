CREATE TABLE "public"."grupos_especiais" (
    "id" uuid NOT NULL,
    "nome" text NOT NULL,
    "tipo" text NOT NULL DEFAULT 'ESPECIAL',
    "descricao" text,
    "operador_id" text NOT NULL,
    "criado_em" timestamp(3) NOT NULL DEFAULT now(),
    "ativo" boolean NOT NULL DEFAULT true,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."grupos_especiais_casas" (
    "id" uuid NOT NULL,
    "grupo_id" uuid NOT NULL,
    "casa_id" text NOT NULL,
    "criado_em" timestamp(3) NOT NULL DEFAULT now(),
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "grupos_especiais_casas_grupo_id_casa_id_key"
    ON "public"."grupos_especiais_casas" ("grupo_id", "casa_id");

CREATE TABLE "public"."grupos_especiais_membros" (
    "id" uuid NOT NULL,
    "grupo_id" uuid NOT NULL,
    "adolescente_id" text NOT NULL,
    "data_entrada" timestamp(3) NOT NULL DEFAULT now(),
    "data_saida" timestamp(3),
    "justificativa" text,
    "criado_em" timestamp(3) NOT NULL DEFAULT now(),
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "grupos_especiais_membros_grupo_id_adolescente_id_key"
    ON "public"."grupos_especiais_membros" ("grupo_id", "adolescente_id");

ALTER TABLE "public"."grupos_especiais"
    ADD CONSTRAINT "grupos_especiais_operador_id_fkey"
    FOREIGN KEY ("operador_id") REFERENCES "public"."operadores"("id") ON DELETE RESTRICT;

ALTER TABLE "public"."grupos_especiais_casas"
    ADD CONSTRAINT "grupos_especiais_casas_grupo_id_fkey"
    FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos_especiais"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "grupos_especiais_casas_casa_id_fkey"
    FOREIGN KEY ("casa_id") REFERENCES "public"."casas"("id") ON DELETE RESTRICT;

ALTER TABLE "public"."grupos_especiais_membros"
    ADD CONSTRAINT "grupos_especiais_membros_grupo_id_fkey"
    FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos_especiais"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "grupos_especiais_membros_adolescente_id_fkey"
    FOREIGN KEY ("adolescente_id") REFERENCES "public"."adolescentes"("id") ON DELETE RESTRICT;
