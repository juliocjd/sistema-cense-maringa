-- Cria tabelas de papeis/permissoes para autenticação
CREATE TABLE "permissoes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permissoes_codigo_key" ON "permissoes"("codigo");

CREATE TABLE "papeis" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "papeis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "papeis_nome_key" ON "papeis"("nome");

CREATE TABLE "papeis_permissoes" (
    "id" TEXT NOT NULL,
    "papel_id" TEXT NOT NULL,
    "permissao_id" TEXT NOT NULL,
    CONSTRAINT "papeis_permissoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "papeis_permissoes_papel_id_permissao_id_key" ON "papeis_permissoes"("papel_id", "permissao_id");

CREATE TABLE "operadores_papeis" (
    "id" TEXT NOT NULL,
    "operador_id" TEXT NOT NULL,
    "papel_id" TEXT NOT NULL,
    CONSTRAINT "operadores_papeis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operadores_papeis_operador_id_papel_id_key" ON "operadores_papeis"("operador_id", "papel_id");

ALTER TABLE "papeis_permissoes"
    ADD CONSTRAINT "papeis_permissoes_papel_id_fkey" FOREIGN KEY ("papel_id") REFERENCES "papeis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "papeis_permissoes"
    ADD CONSTRAINT "papeis_permissoes_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "permissoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "operadores_papeis"
    ADD CONSTRAINT "operadores_papeis_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "operadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operadores_papeis"
    ADD CONSTRAINT "operadores_papeis_papel_id_fkey" FOREIGN KEY ("papel_id") REFERENCES "papeis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
