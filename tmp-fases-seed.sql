INSERT INTO fases_internacao (id, nome_fase, descricao_fase, ordem, permite_casa_08)
SELECT gen_random_uuid(), 'Fase 1', 'Fase inicial do processo socioeducativo.', 1, FALSE
WHERE NOT EXISTS (SELECT 1 FROM fases_internacao WHERE nome_fase = 'Fase 1');

INSERT INTO fases_internacao (id, nome_fase, descricao_fase, ordem, permite_casa_08)
SELECT gen_random_uuid(), 'Fase 2', 'Fase intermediaria do processo socioeducativo.', 2, FALSE
WHERE NOT EXISTS (SELECT 1 FROM fases_internacao WHERE nome_fase = 'Fase 2');

INSERT INTO fases_internacao (id, nome_fase, descricao_fase, ordem, permite_casa_08)
SELECT gen_random_uuid(), 'Fase 3', 'Fase exclusiva de progressao no processo socioeducativo.', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM fases_internacao WHERE nome_fase = 'Fase 3');

UPDATE casas
SET fase_exclusiva_id = (
  SELECT id FROM fases_internacao WHERE nome_fase = 'Fase 3' ORDER BY ordem NULLS LAST LIMIT 1
)
WHERE numero = 7;
