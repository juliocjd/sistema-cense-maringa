import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PARES = [
  ["01", "06"],
  ["02", "05"],
  ["03", "04"],
  ["07", "10"],
  ["08", "09"],
] as const;

async function corrigirCasa(casaId: string, numero: number) {
  const alojamentos = await prisma.alojamento.findMany({
    where: { casaId },
    select: { id: true, numeroAlojamento: true },
  });

  const mapa = new Map<string, string>();
  alojamentos.forEach((aloj) => {
    mapa.set(aloj.numeroAlojamento, aloj.id);
  });

  const atualizacoes: Array<{ id: string; frontalId: string }> = [];

  for (const [numA, numB] of PARES) {
    const idA = mapa.get(numA);
    const idB = mapa.get(numB);
    if (!idA || !idB) {
      continue;
    }
    atualizacoes.push({ id: idA, frontalId: idB });
    atualizacoes.push({ id: idB, frontalId: idA });
  }

  for (const atualizacao of atualizacoes) {
    await prisma.alojamento.update({
      where: { id: atualizacao.id },
      data: { alojamentoFrontalId: atualizacao.frontalId },
    });
  }

  return atualizacoes.length / 2;
}

async function main() {
  const casas = await prisma.casa.findMany({
    where: {
      numero: {
        in: [1, 2, 3, 4, 5, 6, 7],
      },
    },
    select: { id: true, numero: true },
    orderBy: { numero: "asc" },
  });

  for (const casa of casas) {
    const pares = await corrigirCasa(casa.id, casa.numero ?? 0);
    console.log(
      `Casa ${casa.numero?.toString().padStart(2, "0")}: ${pares} pares atualizados`
    );
  }
}

main()
  .catch((error) => {
    console.error("Falha ao corrigir alojamentos frontais:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
