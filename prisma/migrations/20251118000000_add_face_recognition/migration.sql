-- AlterTable
ALTER TABLE "visitantes"
ADD COLUMN "face_embeddings" JSONB,
ADD COLUMN "consentimento_biometria" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "data_consentimento" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "verificacoes_faciais" (
    "id" TEXT NOT NULL,
    "visitante_id" TEXT NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultado" TEXT NOT NULL,
    "confianca" DOUBLE PRECISION,
    "foto_capturada_url" TEXT,
    "operador_id" TEXT,
    "ip_origem" TEXT,

    CONSTRAINT "verificacoes_faciais_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "verificacoes_faciais" ADD CONSTRAINT "verificacoes_faciais_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
