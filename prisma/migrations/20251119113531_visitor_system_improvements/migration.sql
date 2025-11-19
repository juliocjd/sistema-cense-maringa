/*
  Warnings:

  - You are about to drop the column `nivel_alerta` on the `alertas_faccoes_rivais` table. All the data in the column will be lost.
  - You are about to drop the column `operador_registro_id` on the `visitas_registro` table. All the data in the column will be lost.
  - Added the required column `atualizado_em` to the `visitas_registro` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodo_autorizado` to the `visitas_registro` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodo_realizado` to the `visitas_registro` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "adolescentes" DROP CONSTRAINT "adolescentes_agente_referencia_id_fkey";

-- AlterTable
ALTER TABLE "adolescentes_tatuagens" ADD COLUMN     "significado_pessoal" TEXT;

-- AlterTable
ALTER TABLE "agentes_profissionais" ALTER COLUMN "atualizado_em" DROP DEFAULT;

-- AlterTable
ALTER TABLE "alertas_faccoes_rivais" DROP COLUMN "nivel_alerta",
ADD COLUMN     "nivelAlerta" TEXT NOT NULL DEFAULT 'MEDIO';

-- AlterTable
ALTER TABLE "configuracoes_visitas" ALTER COLUMN "dias_permitidos" DROP DEFAULT;

-- AlterTable
ALTER TABLE "faccoes_conflitos" ALTER COLUMN "atualizado_em" DROP DEFAULT;

-- AlterTable
ALTER TABLE "visitantes" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bloqueado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "data_bloqueio" TIMESTAMP(3),
ADD COLUMN     "data_desbloqueio" TIMESTAMP(3),
ADD COLUMN     "motivo_bloqueio" TEXT,
ADD COLUMN     "operador_bloqueio_id" TEXT;

-- AlterTable
ALTER TABLE "visitas_registro" DROP COLUMN "operador_registro_id",
ADD COLUMN     "alerta_faccao_rival" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alerta_horario" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alerta_limite_visitas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "atualizado_em" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "horario_diferente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "justificativa_horario" TEXT,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "observacoes_alertas" TEXT,
ADD COLUMN     "operador_entrada_id" TEXT,
ADD COLUMN     "operador_saida_id" TEXT,
ADD COLUMN     "periodo_autorizado" TEXT NOT NULL,
ADD COLUMN     "periodo_realizado" TEXT NOT NULL,
ADD COLUMN     "quantidade_adultos" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "quantidade_criancas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tipo_visita" TEXT NOT NULL DEFAULT 'REGULAR';

-- CreateTable
CREATE TABLE "justificativas_algema" (
    "id" TEXT NOT NULL,
    "numero_documento" TEXT NOT NULL,
    "adolescente_id" TEXT NOT NULL,
    "operador_responsavel_id" TEXT NOT NULL,
    "data_hora_ocorrencia" TIMESTAMP(3) NOT NULL,
    "motivo_principal" TEXT NOT NULL,
    "destino_movimentacao" TEXT,
    "fundamentacao_legal" TEXT NOT NULL,
    "ato_infracional_base" TEXT,
    "numero_processo" TEXT,
    "decisao_judicial" TEXT,
    "risco_fuga" TEXT NOT NULL,
    "risco_agressao" TEXT NOT NULL,
    "risco_autolesao" TEXT NOT NULL,
    "historico_comportamental" TEXT,
    "fatores_agravantes" TEXT[],
    "pontuacao_risco_fuga" INTEGER,
    "pontuacao_risco_agressao" INTEGER,
    "pontuacao_risco_autolesao" INTEGER,
    "fundamentacao_automatica" TEXT,
    "medidas_seguranca" TEXT[],
    "equipe_profissional" TEXT[],
    "veiculo_utilizado" TEXT,
    "observacoes_adicionais" TEXT,
    "hora_inicio" TIMESTAMP(3),
    "hora_fim" TIMESTAMP(3),
    "duracao_minutos" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'EMITIDO',
    "arquivo_pdf_path" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "aprovado_por" TEXT,
    "data_aprovacao" TIMESTAMP(3),

    CONSTRAINT "justificativas_algema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_bloqueios" (
    "id" TEXT NOT NULL,
    "visitante_id" TEXT NOT NULL,
    "motivo_bloqueio" TEXT NOT NULL,
    "data_bloqueio" TIMESTAMP(3) NOT NULL,
    "data_desbloqueio" TIMESTAMP(3),
    "prazo_previsao" TIMESTAMP(3),
    "desbloqueado" BOOLEAN NOT NULL DEFAULT false,
    "operador_bloqueio_id" TEXT NOT NULL,
    "operador_desbloqueio_id" TEXT,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_bloqueios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qrcodes_visitantes" (
    "id" TEXT NOT NULL,
    "visitante_id" TEXT NOT NULL,
    "codigo_qr" TEXT NOT NULL,
    "imagem_qr_url" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "valido_ate" TIMESTAMP(3),
    "quantidade_usos" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qrcodes_visitantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos_evidencia" (
    "id" TEXT NOT NULL,
    "visita_id" TEXT,
    "visitante_id" TEXT NOT NULL,
    "foto_url" TEXT NOT NULL,
    "tipo_foto" TEXT NOT NULL,
    "data_captura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_exclusao" TIMESTAMP(3) NOT NULL,
    "excluida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes_whatsapp" (
    "id" TEXT NOT NULL,
    "visitante_id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "tipo_notificacao" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status_envio" TEXT NOT NULL DEFAULT 'PENDENTE',
    "erro_envio" TEXT,
    "data_envio" TIMESTAMP(3),
    "data_leitura" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "justificativas_algema_numero_documento_key" ON "justificativas_algema"("numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "qrcodes_visitantes_codigo_qr_key" ON "qrcodes_visitantes"("codigo_qr");

-- AddForeignKey
ALTER TABLE "adolescentes" ADD CONSTRAINT "adolescentes_agente_referencia_id_fkey" FOREIGN KEY ("agente_referencia_id") REFERENCES "agentes_profissionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificativas_algema" ADD CONSTRAINT "justificativas_algema_adolescente_id_fkey" FOREIGN KEY ("adolescente_id") REFERENCES "adolescentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificativas_algema" ADD CONSTRAINT "justificativas_algema_operador_responsavel_id_fkey" FOREIGN KEY ("operador_responsavel_id") REFERENCES "operadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificativas_algema" ADD CONSTRAINT "justificativas_algema_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "operadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_bloqueios" ADD CONSTRAINT "historico_bloqueios_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qrcodes_visitantes" ADD CONSTRAINT "qrcodes_visitantes_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_evidencia" ADD CONSTRAINT "fotos_evidencia_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_whatsapp" ADD CONSTRAINT "notificacoes_whatsapp_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
