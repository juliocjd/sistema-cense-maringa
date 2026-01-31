#!/usr/bin/env node

/**
 * Script utilitario para identificar e (opcionalmente) remover entradas
 * duplicadas do historico infracional dos adolescentes.
 *
 * Uso:
 *   node scripts/dedupe-historico-infracional.js        -> apenas reporta
 *   node scripts/dedupe-historico-infracional.js --apply -> remove duplicados
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const aplicarCorrecao = process.argv.includes("--apply");

const normalizar = (valor) => {
  if (!valor) {
    return "";
  }
  return valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
};

const buildKey = (registro) => {
  return [
    registro.adolescenteId,
    normalizar(registro.atoInfracionalDescricao),
    registro.atoInfracionalAno ?? "",
    normalizar(registro.atoInfracionalProcesso),
    normalizar(registro.unidadeInternacao),
    normalizar(registro.observacoes),
  ].join("|");
};

async function main() {
  const registros = await prisma.adolescenteHistoricoInfracional.findMany({
    select: {
      id: true,
      adolescenteId: true,
      atoInfracionalDescricao: true,
      atoInfracionalAno: true,
      atoInfracionalProcesso: true,
      unidadeInternacao: true,
      observacoes: true,
    },
    orderBy: {
      adolescenteId: "asc",
    },
  });

  const chaves = new Map();
  const duplicados = [];

  for (const registro of registros) {
    const chave = buildKey(registro);
    if (chaves.has(chave)) {
      duplicados.push(registro);
    } else {
      chaves.set(chave, registro.id);
    }
  }

  if (duplicados.length === 0) {
    console.log("Nenhum histórico duplicado encontrado.");
    return;
  }

  console.log(
    `Foram encontrados ${duplicados.length} registros duplicados em ${new Set(
      duplicados.map((d) => d.adolescenteId)
    ).size} adolescente(s).`
  );

  if (!aplicarCorrecao) {
    console.log(
      'Execute novamente com "--apply" para remover automaticamente os duplicados mantendo apenas o primeiro registro de cada chave.'
    );
    return;
  }

  const idsParaRemover = duplicados.map((registro) => registro.id);
  await prisma.adolescenteHistoricoInfracional.deleteMany({
    where: { id: { in: idsParaRemover } },
  });

  console.log(`Registros removidos: ${idsParaRemover.length}`);
}

main()
  .catch((error) => {
    console.error("Erro ao avaliar historicos duplicados:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
