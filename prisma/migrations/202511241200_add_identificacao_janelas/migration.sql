-- Add identification window columns for visitas configuration
ALTER TABLE "configuracoes_visitas"
  ADD COLUMN "janela_identificacao_manha_inicio" TEXT NOT NULL DEFAULT '08:00',
  ADD COLUMN "janela_identificacao_manha_fim" TEXT NOT NULL DEFAULT '09:00',
  ADD COLUMN "janela_identificacao_tarde_inicio" TEXT NOT NULL DEFAULT '13:00',
  ADD COLUMN "janela_identificacao_tarde_fim" TEXT NOT NULL DEFAULT '14:00';

-- Ensure existing rows have sensible defaults (handled by DEFAULT above)
