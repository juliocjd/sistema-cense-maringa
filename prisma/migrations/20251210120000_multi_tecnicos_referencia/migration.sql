-- Cria tabela de ligação entre adolescentes e técnicos de referência
CREATE TABLE "adolescentes_tecnicos_referencia" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "adolescente_id" TEXT NOT NULL,
    "tecnico_referencia_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "adolescentes_tecnicos_referencia_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "adolescentes_tecnicos_referencia_tecnico_referencia_id_fkey" FOREIGN KEY ("tecnico_referencia_id") REFERENCES "agentes_profissionais"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "adolescentes_tecnicos_referencia_adolescente_tecnico_key"
  ON "adolescentes_tecnicos_referencia" ("adolescente_id", "tecnico_referencia_id");

-- Migra o vínculo existente (coluna agente_referencia_id) para a nova tabela
INSERT INTO "adolescentes_tecnicos_referencia" ("adolescente_id", "tecnico_referencia_id", "criado_em")
SELECT "id", "agente_referencia_id", COALESCE("atualizado_em", "criado_em")
FROM "adolescentes"
WHERE "agente_referencia_id" IS NOT NULL
ON CONFLICT ("adolescente_id", "tecnico_referencia_id") DO NOTHING;

-- Remove a coluna antiga já migrada
ALTER TABLE "adolescentes" DROP CONSTRAINT IF EXISTS "adolescentes_agente_referencia_id_fkey";
ALTER TABLE "adolescentes" DROP COLUMN IF EXISTS "agente_referencia_id";
