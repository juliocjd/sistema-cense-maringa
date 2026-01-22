-- Remove dados de teste criados pelos scripts de laboratório
BEGIN;

WITH test_cis AS (
  SELECT id
  FROM comunicados_internos
  WHERE (numero = 999 OR numero = 1000) AND ano = 2025
)

-- ocorrências vinculadas às CIs de teste
DELETE FROM conflitos_ocorrencias
WHERE ci_id IN (SELECT id FROM test_cis);

-- conflitos gerados pela CI de teste
DELETE FROM conflitos
WHERE ci_origem_id IN (SELECT id FROM test_cis)
   OR tipo_conflito = 'TESTE_IMPACTO';

-- links de adolescentes das CIs de teste
DELETE FROM comunicados_internos_adolescentes_link
WHERE ci_id IN (SELECT id FROM test_cis);

-- alertas criados pelas CIs de teste
DELETE FROM alertas_ativos
WHERE ci_origem_id IN (SELECT id FROM test_cis);

-- as próprias CIs de teste
DELETE FROM comunicados_internos
WHERE id IN (SELECT id FROM test_cis);

COMMIT;
