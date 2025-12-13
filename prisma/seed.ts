import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const casasBase = Array.from({ length: 8 }, (_, idx) => {
  const numero = idx + 1;
  return {
    numero,
    nome: `Casa ${numero.toString().padStart(2, "0")}`,
    isolada: numero === 1 || numero === 8,
  };
});

const alojamentosPorCasa = (numeroCasa: number) => {
  const total = numeroCasa === 8 ? 8 : 10;
  return Array.from({ length: total }, (_, idx) => {
    const numero = (idx + 1).toString().padStart(2, "0");
    const ala =
      numeroCasa === 8
        ? null
        : idx < 6
        ? ("A" as "A" | "B")
        : ("B" as "A" | "B");
    const localizacaoPreferencial = ["01", "06", "07", "10"].includes(numero);
    return { numeroAlojamento: numero, ala, localizacaoPreferencial };
  });
};

const paresFrontais = (numeroCasa: number) => {
  if (numeroCasa === 8) {
    return [] as [string, string][];
  }
  return [
    ["01", "06"],
    ["02", "05"],
    ["03", "04"],
    ["07", "08"],
    ["09", "10"],
  ];
};

const zonasConfig = {
  casa02: { casa: 2, alojamentos: ["08", "09"] },
  casa03: { casa: 3, alojamentos: ["01", "02", "03"] },
  casa04: { casa: 4, alojamentos: ["09", "10"] },
  casa05: { casa: 5, alojamentos: ["03", "04", "09", "10"] },
  casa06: { casa: 6, alojamentos: ["03", "04", "09", "10"] },
  casa07: { casa: 7, alojamentos: ["03", "04"] },
};

const zonasVinculos: Array<
  [keyof typeof zonasConfig, keyof typeof zonasConfig]
> = [
  ["casa02", "casa03"],
  ["casa04", "casa05"],
  ["casa05", "casa06"],
  ["casa06", "casa07"],
];

async function seedCasasEAlojamentos() {
  for (const casa of casasBase) {
    const registroCasa = await prisma.casa.upsert({
      where: { numero: casa.numero },
      update: { nome: casa.nome, isolada: casa.isolada },
      create: casa,
    });

    const alojamentos = alojamentosPorCasa(casa.numero);
    for (const alojamento of alojamentos) {
      await prisma.alojamento.upsert({
        where: {
          casaId_numeroAlojamento: {
            casaId: registroCasa.id,
            numeroAlojamento: alojamento.numeroAlojamento,
          },
        },
        update: {
          ala: alojamento.ala ?? undefined,
          localizacaoPreferencial: alojamento.localizacaoPreferencial,
          statusManutencao: "LIVRE",
        },
        create: {
          casaId: registroCasa.id,
          numeroAlojamento: alojamento.numeroAlojamento,
          ala: alojamento.ala,
          localizacaoPreferencial: alojamento.localizacaoPreferencial,
        },
      });
    }

    for (const [numA, numB] of paresFrontais(casa.numero)) {
      const [alojA, alojB] = await Promise.all([
        prisma.alojamento.findFirst({
          where: {
            casaId: registroCasa.id,
            numeroAlojamento: numA,
          },
        }),
        prisma.alojamento.findFirst({
          where: {
            casaId: registroCasa.id,
            numeroAlojamento: numB,
          },
        }),
      ]);
      if (alojA && alojB) {
        await prisma.alojamento.update({
          where: { id: alojA.id },
          data: { alojamentoFrontalId: alojB.id },
        });
        await prisma.alojamento.update({
          where: { id: alojB.id },
          data: { alojamentoFrontalId: alojA.id },
        });
      }
    }
  }
}

async function seedZonas() {
  const zonasMap: Record<string, string> = {};

  for (const [key, config] of Object.entries(zonasConfig)) {
    const zona = await prisma.zonaRisco.upsert({
      where: { nomeZona: key },
      update: {},
      create: {
        nomeZona: key,
        descricao: `Zona de janela para casa ${config.casa}`,
      },
    });
    zonasMap[key] = zona.id;

    const casa = await prisma.casa.findUnique({
      where: { numero: config.casa },
    });

    if (!casa) continue;

    for (const numero of config.alojamentos) {
      const aloj = await prisma.alojamento.findFirst({
        where: {
          casaId: casa.id,
          numeroAlojamento: numero,
        },
      });

      if (aloj) {
        await prisma.alojamento.update({
          where: { id: aloj.id },
          data: { zonaRiscoId: zona.id },
        });
      }
    }
  }

  for (const [zonaAKey, zonaBKey] of zonasVinculos) {
    const zonaAId = zonasMap[zonaAKey];
    const zonaBId = zonasMap[zonaBKey];
    if (!zonaAId || !zonaBId) continue;

    const existente = await prisma.zonaRiscoVinculo.findFirst({
      where: {
        zonaAId,
        zonaBId,
      },
    });

    if (!existente) {
      await prisma.zonaRiscoVinculo.create({
        data: { zonaAId, zonaBId },
      });
    }
  }
}

async function main() {
  console.log("Seeding estrutura padrão...");
  await seedCasasEAlojamentos();
  await seedZonas();
  console.log("Seed concluído com sucesso.");
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
