import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkAlertas() {
  console.log("🔍 Verificando alertas no banco de dados...\n");

  // Total de alertas
  const total = await prisma.alertaAtivo.count();
  console.log(`📊 Total de alertas: ${total}`);

  // Alertas ativos
  const ativos = await prisma.alertaAtivo.count({
    where: { desativadoEm: null },
  });
  console.log(`✅ Alertas ativos: ${ativos}`);

  // Alertas desativados
  const desativados = await prisma.alertaAtivo.count({
    where: { desativadoEm: { not: null } },
  });
  console.log(`❌ Alertas desativados: ${desativados}\n`);

  // Listar todos os alertas
  const alertas = await prisma.alertaAtivo.findMany({
    include: {
      adolescente: {
        select: {
          id: true,
          nomeCompleto: true,
          numeroSms: true,
        },
      },
      ciOrigem: {
        select: {
          id: true,
          numero: true,
          resumoCI: true,
        },
      },
    },
  });

  console.log("📋 Lista de alertas:");
  console.log("─".repeat(100));

  if (alertas.length === 0) {
    console.log("⚠️  Nenhum alerta encontrado no banco de dados!");
  } else {
    alertas.forEach((alerta, index) => {
      console.log(`\n${index + 1}. Alerta ID: ${alerta.id}`);
      console.log(`   Adolescente: ${alerta.adolescente?.nomeCompleto || "N/A"} (${alerta.adolescente?.numeroSms || "sem SMS"})`);
      console.log(`   Tipo: ${alerta.tipoAlerta || "N/A"}`);
      console.log(`   Nível: ${alerta.nivelRisco || "N/A"}`);
      console.log(`   Descrição: ${alerta.descricaoAlerta.substring(0, 60)}...`);
      console.log(`   CI Origem: ${alerta.ciOrigem ? `CI ${alerta.ciOrigem.numero} - ${alerta.ciOrigem.resumoCI}` : "N/A"}`);
      console.log(`   Status: ${alerta.desativadoEm ? "DESATIVADO" : "ATIVO"}`);
      console.log(`   Criado em: ${alerta.criadoEm.toLocaleString("pt-BR")}`);
    });
  }

  console.log("\n" + "─".repeat(100));

  // Verificar CIs que geraram alertas
  console.log("\n🔗 Comunicados Internos com alertas:");
  const cisComAlertas = await prisma.comunicadoInterno.findMany({
    where: {
      alertasAtivos: {
        some: {},
      },
    },
    include: {
      alertasAtivos: {
        include: {
          adolescente: {
            select: {
              nomeCompleto: true,
            },
          },
        },
      },
    },
  });

  if (cisComAlertas.length === 0) {
    console.log("⚠️  Nenhum CI com alertas encontrado!");
  } else {
    cisComAlertas.forEach((ci) => {
      console.log(`\nCI ${ci.numero}/${ci.ano} - ${ci.resumoCI}`);
      console.log(`  Total de alertas: ${ci.alertasAtivos.length}`);
      ci.alertasAtivos.forEach((alerta) => {
        console.log(`  - ${alerta.adolescente?.nomeCompleto}: ${alerta.descricaoAlerta.substring(0, 50)}...`);
      });
    });
  }

  await prisma.$disconnect();
}

checkAlertas()
  .catch((error) => {
    console.error("❌ Erro:", error);
    process.exit(1);
  });
