-- Aplicar constraints com validacoes de seguranca
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM casas
    GROUP BY numero
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Nao foi possivel aplicar UNIQUE em casas.numero: existem numeros duplicados.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM zonas_risco
    GROUP BY nome_zona
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Nao foi possivel aplicar UNIQUE em zonas_risco.nome_zona: existem nomes duplicados.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cidades
    WHERE estado IS NULL OR char_length(estado) > 2
  ) THEN
    RAISE EXCEPTION 'Nao foi possivel alterar cidades.estado para VARCHAR(2): existem valores nulos ou com mais de 2 caracteres.';
  END IF;
END $$;

-- Ajustar tipo do estado (UF) para 2 caracteres
ALTER TABLE "cidades"
  ALTER COLUMN "estado" TYPE VARCHAR(2);

-- Garantir unicidade de casa/numero
CREATE UNIQUE INDEX IF NOT EXISTS "casas_numero_key"
  ON "casas" ("numero");

-- Garantir unicidade de zonas de risco
CREATE UNIQUE INDEX IF NOT EXISTS "zonas_risco_nome_zona_key"
  ON "zonas_risco" ("nome_zona");
