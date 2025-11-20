import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed inicial para configuração de visitas
 * Cria a configuração padrão se não existir nenhuma
 */
async function seedConfiguracaoVisitas() {
  console.log("🔧 Verificando configuração de visitas...");

  // Verificar se já existe alguma configuração
  const configExistente = await prisma.configuracaoVisitas.findFirst();

  if (configExistente) {
    console.log("✅ Configuração de visitas já existe. Nenhuma ação necessária.");
    return;
  }

  // Criar configuração padrão
  const configPadrao = await prisma.configuracaoVisitas.create({
    data: {
      diasPermitidos: [6], // Sábado
      limiteAdultosPadrao: 2,
      limiteCriancasPadrao: 1,
      habilitarRegraSegundoSabado: true,
      limiteAdultosSegundoSab: 2,
      limiteCriancasSegundoSab: 1,
      permitirAlternativa: true, // 2 adultos + 1 criança OU 1 adulto + 2 crianças
      idadeLimiteCrianca: 12,
      periodosPorCasa: {
        "1": "MANHA",
        "2": "MANHA",
        "3": "MANHA",
        "4": "MANHA",
        "5": "TARDE",
        "6": "TARDE",
        "7": "TARDE",
        "8": "TARDE",
      },
      quantidadeVisitasMensal: 2,
      duracaoVisitaMinutos: 120,
      ativo: true,
    },
  });

  console.log("✅ Configuração padrão de visitas criada com sucesso!");
  console.log("  - Dias permitidos: Sábado");
  console.log("  - Limite padrão: 2 adultos + 1 criança");
  console.log("  - Regra 2º sábado: Habilitada (alternativa)");
  console.log("  - Casas manhã: 1-4");
  console.log("  - Casas tarde: 5-8");
  console.log("  - Limite mensal: 2 visitas");
  console.log("  - Duração da visita: 120 minutos");

  return configPadrao;
}

// Executar se chamado diretamente
if (require.main === module) {
  seedConfiguracaoVisitas()
    .then(() => {
      console.log("\n✨ Seed de configuração de visitas concluído!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erro ao executar seed:", error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export { seedConfiguracaoVisitas };
