-- CreateTable
CREATE TABLE "operadores" (
    "id" TEXT NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "funcao_role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "casas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "isolada" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,

    CONSTRAINT "casas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alojamentos" (
    "id" TEXT NOT NULL,
    "casa_id" TEXT NOT NULL,
    "numero_alojamento" TEXT NOT NULL,
    "ala" TEXT,
    "status_manutencao" TEXT NOT NULL DEFAULT 'LIVRE',
    "alojamento_frontal_id" TEXT,
    "zona_risco_id" TEXT,
    "localizacao_preferencial" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "alojamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zonas_risco" (
    "id" TEXT NOT NULL,
    "nome_zona" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "zonas_risco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zonas_risco_alojamentos" (
    "id" TEXT NOT NULL,
    "zona_id" TEXT NOT NULL,
    "alojamento_id" TEXT NOT NULL,

    CONSTRAINT "zonas_risco_alojamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zonas_risco_vinculos" (
    "id" TEXT NOT NULL,
    "zona_a_id" TEXT NOT NULL,
    "zona_b_id" TEXT NOT NULL,

    CONSTRAINT "zonas_risco_vinculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faccoes" (
    "id" TEXT NOT NULL,
    "nome_faccao" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "faccoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bairros" (
    "id" TEXT NOT NULL,
    "nome_bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,

    CONSTRAINT "bairros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bairros_conflitos" (
    "id" TEXT NOT NULL,
    "bairro_a_id" TEXT NOT NULL,
    "bairro_b_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',

    CONSTRAINT "bairros_conflitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tatuagens_catalogo" (
    "id" TEXT NOT NULL,
    "nome_simbolo" TEXT NOT NULL,
    "significado_associado" TEXT,
    "nivel_risco" TEXT,

    CONSTRAINT "tatuagens_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fases_internacao" (
    "id" TEXT NOT NULL,
    "nome_fase" TEXT NOT NULL,
    "descricao_fase" TEXT,
    "ordem" INTEGER,
    "permite_casa_08" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fases_internacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adolescentes" (
    "id" TEXT NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "nome_social" TEXT,
    "foto_url" TEXT,
    "numero_sms" TEXT,
    "data_nascimento" DATE,
    "data_entrada" TIMESTAMP(3),
    "numero_processo" TEXT,
    "ato_infracional_atual" TEXT,
    "status_unidade" TEXT NOT NULL DEFAULT 'ATIVO',
    "faccao_grupo_id" TEXT,
    "faccao_numero_membro" TEXT,
    "bairro_origem_id" TEXT,
    "risco_fuga" TEXT,
    "alerta_risco_suicidio" BOOLEAN NOT NULL DEFAULT false,
    "alerta_perfil_mapeado" BOOLEAN NOT NULL DEFAULT false,
    "alerta_saude_confidencial" BOOLEAN NOT NULL DEFAULT false,
    "alerta_saude_detalhes" TEXT,
    "alojamento_atual_id" TEXT,
    "fase_internacao_atual_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adolescentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adolescentes_tatuagens" (
    "id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,
    "tatuagem_catalogo_id" TEXT NOT NULL,
    "local_corpo" TEXT,
    "foto_url" TEXT,
    "observacoes" TEXT,

    CONSTRAINT "adolescentes_tatuagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adolescentes_historico_infracional" (
    "id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,
    "ato_infracional_descricao" TEXT NOT NULL,
    "unidade_internacao" TEXT,
    "ano" INTEGER,
    "observacoes" TEXT,

    CONSTRAINT "adolescentes_historico_infracional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos" (
    "id" TEXT NOT NULL,
    "nome_grupo" TEXT NOT NULL,
    "casa_id" TEXT NOT NULL,
    "ordem_ala" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos_membros" (
    "id" TEXT NOT NULL,
    "grupo_id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,
    "data_entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_saida" TIMESTAMP(3),

    CONSTRAINT "grupos_membros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conflitos" (
    "id" TEXT NOT NULL,
    "adolescente_a_id" TEXT NOT NULL,
    "adolescente_b_id" TEXT NOT NULL,
    "tipo_conflito" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "ci_origem_id" TEXT,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvido_em" TIMESTAMP(3),

    CONSTRAINT "conflitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunicados_internos" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "data_fato" DATE NOT NULL,
    "tipo_ci" TEXT NOT NULL,
    "resumo_ci" TEXT NOT NULL,
    "caminho_pdf" TEXT,
    "operador_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comunicados_internos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunicados_internos_adolescentes_link" (
    "id" TEXT NOT NULL,
    "ci_id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,

    CONSTRAINT "comunicados_internos_adolescentes_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_ativos" (
    "id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,
    "ci_origem_id" TEXT,
    "tipo_alerta" TEXT,
    "descricao_alerta" TEXT NOT NULL,
    "nivel_risco" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desativado_em" TIMESTAMP(3),

    CONSTRAINT "alertas_ativos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tentativas_mediacao" (
    "id" TEXT NOT NULL,
    "conflito_id" TEXT NOT NULL,
    "data_tentativa" DATE NOT NULL,
    "profissional_responsavel" TEXT NOT NULL,
    "tipo_intervencao" TEXT,
    "resultado" TEXT,
    "observacoes" TEXT,
    "proxima_acao_recomendada" TEXT,
    "data_proxima_avaliacao" DATE,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tentativas_mediacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisoes_operacionais" (
    "id" TEXT NOT NULL,
    "operador_id" TEXT NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_operacao" TEXT NOT NULL,
    "adolescente_id" TEXT,
    "grupo_id" TEXT,
    "alojamento_id" TEXT,
    "nivel_alerta" TEXT,
    "conflitos_detectados" JSONB,
    "justificativa_operador" TEXT NOT NULL,
    "medidas_adicionais" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'EXECUTADO',

    CONSTRAINT "decisoes_operacionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" TEXT NOT NULL,
    "operador_id" TEXT,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acao" TEXT NOT NULL,
    "tabela_afetada" TEXT,
    "registro_id_afetado" TEXT,
    "detalhes_alteracao" JSONB,
    "ip_origem" TEXT,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_especiais" (
    "id" TEXT NOT NULL,
    "nome_evento" TEXT NOT NULL,
    "data_hora_inicio" TIMESTAMP(3) NOT NULL,
    "data_hora_fim" TIMESTAMP(3),
    "tipo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANEJADO',
    "observacoes" TEXT,
    "criado_por" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_especiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_especiais_grupos" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "grupo_id" TEXT NOT NULL,

    CONSTRAINT "eventos_especiais_grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_especiais_participantes" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,

    CONSTRAINT "eventos_especiais_participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitantes" (
    "id" TEXT NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "cpf" TEXT,
    "data_nascimento" DATE,
    "endereco_completo" TEXT,
    "telefones" TEXT[],
    "foto_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adolescentes_visitantes_link" (
    "id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,
    "visitante_id" TEXT NOT NULL,
    "parentesco" TEXT,
    "autorizado" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,

    CONSTRAINT "adolescentes_visitantes_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas_registro" (
    "id" TEXT NOT NULL,
    "visitante_id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,
    "data_hora_entrada" TIMESTAMP(3) NOT NULL,
    "data_hora_saida" TIMESTAMP(3),
    "operador_registro_id" TEXT,

    CONSTRAINT "visitas_registro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_transferencia" (
    "id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,
    "motivo_principal" TEXT NOT NULL,
    "unidades_sugeridas" TEXT[],
    "observacoes_adicionais" TEXT,
    "relatorio_gerado_path" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AGUARDANDO',
    "data_solicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operador_solicitante_id" TEXT NOT NULL,
    "data_decisao_judicial" TIMESTAMP(3),
    "decisao_judicial" TEXT,
    "unidade_destino_efetiva" TEXT,
    "data_transferencia_efetiva" TIMESTAMP(3),

    CONSTRAINT "solicitacoes_transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_transferencias" (
    "id" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,
    "unidade_origem" TEXT NOT NULL,
    "unidade_destino" TEXT NOT NULL,
    "data_transferencia" DATE NOT NULL,
    "motivo" TEXT,
    "conflitos_na_origem" INTEGER,
    "relatorio_transferencia_id" TEXT,

    CONSTRAINT "historico_transferencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operadores_email_key" ON "operadores"("email");

-- CreateIndex
CREATE UNIQUE INDEX "alojamentos_casa_id_numero_alojamento_key" ON "alojamentos"("casa_id", "numero_alojamento");

-- CreateIndex
CREATE UNIQUE INDEX "faccoes_nome_faccao_key" ON "faccoes"("nome_faccao");

-- CreateIndex
CREATE UNIQUE INDEX "bairros_nome_bairro_cidade_key" ON "bairros"("nome_bairro", "cidade");

-- CreateIndex
CREATE UNIQUE INDEX "tatuagens_catalogo_nome_simbolo_key" ON "tatuagens_catalogo"("nome_simbolo");

-- CreateIndex
CREATE UNIQUE INDEX "fases_internacao_nome_fase_key" ON "fases_internacao"("nome_fase");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_membros_grupo_id_adolescente_id_key" ON "grupos_membros"("grupo_id", "adolescente_id");

-- CreateIndex
CREATE UNIQUE INDEX "comunicados_internos_numero_ano_key" ON "comunicados_internos"("numero", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "visitantes_cpf_key" ON "visitantes"("cpf");

-- AddForeignKey
ALTER TABLE "alojamentos" ADD CONSTRAINT "alojamentos_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alojamentos" ADD CONSTRAINT "alojamentos_alojamento_frontal_id_fkey" FOREIGN KEY ("alojamento_frontal_id") REFERENCES "alojamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alojamentos" ADD CONSTRAINT "alojamentos_zona_risco_id_fkey" FOREIGN KEY ("zona_risco_id") REFERENCES "zonas_risco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas_risco_alojamentos" ADD CONSTRAINT "zonas_risco_alojamentos_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zonas_risco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas_risco_alojamentos" ADD CONSTRAINT "zonas_risco_alojamentos_alojamento_id_fkey" FOREIGN KEY ("alojamento_id") REFERENCES "alojamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas_risco_vinculos" ADD CONSTRAINT "zonas_risco_vinculos_zona_a_id_fkey" FOREIGN KEY ("zona_a_id") REFERENCES "zonas_risco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas_risco_vinculos" ADD CONSTRAINT "zonas_risco_vinculos_zona_b_id_fkey" FOREIGN KEY ("zona_b_id") REFERENCES "zonas_risco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bairros_conflitos" ADD CONSTRAINT "bairros_conflitos_bairro_a_id_fkey" FOREIGN KEY ("bairro_a_id") REFERENCES "bairros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bairros_conflitos" ADD CONSTRAINT "bairros_conflitos_bairro_b_id_fkey" FOREIGN KEY ("bairro_b_id") REFERENCES "bairros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes" ADD CONSTRAINT "adolescentes_faccao_grupo_id_fkey" FOREIGN KEY ("faccao_grupo_id") REFERENCES "faccoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes" ADD CONSTRAINT "adolescentes_bairro_origem_id_fkey" FOREIGN KEY ("bairro_origem_id") REFERENCES "bairros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes" ADD CONSTRAINT "adolescentes_alojamento_atual_id_fkey" FOREIGN KEY ("alojamento_atual_id") REFERENCES "alojamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes" ADD CONSTRAINT "adolescentes_fase_internacao_atual_id_fkey" FOREIGN KEY ("fase_internacao_atual_id") REFERENCES "fases_internacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes_tatuagens" ADD CONSTRAINT "adolescentes_tatuagens_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes_tatuagens" ADD CONSTRAINT "adolescentes_tatuagens_tatuagem_catalogo_id_fkey" FOREIGN KEY ("tatuagem_catalogo_id") REFERENCES "tatuagens_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes_historico_infracional" ADD CONSTRAINT "adolescentes_historico_infracional_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_membros" ADD CONSTRAINT "grupos_membros_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_membros" ADD CONSTRAINT "grupos_membros_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflitos" ADD CONSTRAINT "conflitos_adolescente_a_id_fkey" FOREIGN KEY ("adolescente_a_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflitos" ADD CONSTRAINT "conflitos_adolescente_b_id_fkey" FOREIGN KEY ("adolescente_b_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflitos" ADD CONSTRAINT "conflitos_ci_origem_id_fkey" FOREIGN KEY ("ci_origem_id") REFERENCES "comunicados_internos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicados_internos_adolescentes_link" ADD CONSTRAINT "comunicados_internos_adolescentes_link_ci_id_fkey" FOREIGN KEY ("ci_id") REFERENCES "comunicados_internos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicados_internos_adolescentes_link" ADD CONSTRAINT "comunicados_internos_adolescentes_link_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_ativos" ADD CONSTRAINT "alertas_ativos_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_ativos" ADD CONSTRAINT "alertas_ativos_ci_origem_id_fkey" FOREIGN KEY ("ci_origem_id") REFERENCES "comunicados_internos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tentativas_mediacao" ADD CONSTRAINT "tentativas_mediacao_conflito_id_fkey" FOREIGN KEY ("conflito_id") REFERENCES "conflitos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisoes_operacionais" ADD CONSTRAINT "decisoes_operacionais_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "operadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisoes_operacionais" ADD CONSTRAINT "decisoes_operacionais_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisoes_operacionais" ADD CONSTRAINT "decisoes_operacionais_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "operadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_especiais_grupos" ADD CONSTRAINT "eventos_especiais_grupos_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos_especiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_especiais_grupos" ADD CONSTRAINT "eventos_especiais_grupos_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_especiais_participantes" ADD CONSTRAINT "eventos_especiais_participantes_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos_especiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_especiais_participantes" ADD CONSTRAINT "eventos_especiais_participantes_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes_visitantes_link" ADD CONSTRAINT "adolescentes_visitantes_link_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adolescentes_visitantes_link" ADD CONSTRAINT "adolescentes_visitantes_link_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_registro" ADD CONSTRAINT "visitas_registro_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_registro" ADD CONSTRAINT "visitas_registro_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_transferencia" ADD CONSTRAINT "solicitacoes_transferencia_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_transferencia" ADD CONSTRAINT "solicitacoes_transferencia_operador_solicitante_id_fkey" FOREIGN KEY ("operador_solicitante_id") REFERENCES "operadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_transferencias" ADD CONSTRAINT "historico_transferencias_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_transferencias" ADD CONSTRAINT "historico_transferencias_relatorio_transferencia_id_fkey" FOREIGN KEY ("relatorio_transferencia_id") REFERENCES "solicitacoes_transferencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
