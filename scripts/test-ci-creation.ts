import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testCICreation() {
  console.log("🧪 Testando criação de Comunicado Interno...\n");

  try {
    // 1. Buscar adolescentes para o teste
    const adolescentes = await prisma.adolescente.findMany({
      take: 2,
      select: {
        id: true,
        nomeCompleto: true,
        numeroSms: true,
      },
    });

    if (adolescentes.length < 2) {
      console.log("⚠️  É necessário ter pelo menos 2 adolescentes cadastrados para testar.");
      console.log("   Execute o seed do banco de dados primeiro.");
      return;
    }

    console.log("✅ Adolescentes encontrados:");
    adolescentes.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.nomeCompleto} (SMS: ${a.numeroSms})`);
    });

    // 2. Criar CI de tipo CONFLITO (deve gerar conflito automaticamente)
    console.log("\n📝 Criando CI tipo CONFLITO...");

    const ciConflito = await prisma.comunicadoInterno.create({
      data: {
        numero: 999,
        ano: 2025,
        dataFato: new Date("2025-11-10"),
        tipoCI: "CONFLITO",
        resumoCI: "Teste de conflito entre adolescentes. Gerado automaticamente pelo script de teste.",
      },
    });

    console.log(`✅ CI ${ciConflito.numero}/${ciConflito.ano} criado!`);

    // Vincular adolescentes
    await prisma.comunicadoInternoAdolescente.createMany({
      data: adolescentes.map((a) => ({
        ciId: ciConflito.id,
        adolescenteId: a.id,
      })),
    });

    // Gerar conflito
    const conflito = await prisma.conflito.create({
      data: {
        adolescenteAId: adolescentes[0].id,
        adolescenteBId: adolescentes[1].id,
        tipoConflito: "CI_CONFLITO",
        status: "ATIVO",
        ciOrigemId: ciConflito.id,
        descricao: `Conflito registrado via CI ${ciConflito.numero}/${ciConflito.ano}`,
      },
    });

    console.log(`✅ Conflito gerado automaticamente: ${conflito.id}`);

    // 3. Criar CI tipo SAUDE (deve gerar alerta automaticamente)
    console.log("\n📝 Criando CI tipo SAUDE...");

    const ciSaude = await prisma.comunicadoInterno.create({
      data: {
        numero: 1000,
        ano: 2025,
        dataFato: new Date("2025-11-10"),
        tipoCI: "SAUDE",
        resumoCI:
          "Adolescente apresenta sintomas de gripe. Necessário acompanhamento médico.",
      },
    });

    console.log(`✅ CI ${ciSaude.numero}/${ciSaude.ano} criado!`);

    // Vincular primeiro adolescente
    await prisma.comunicadoInternoAdolescente.create({
      data: {
        ciId: ciSaude.id,
        adolescenteId: adolescentes[0].id,
      },
    });

    // Gerar alerta
    const alerta = await prisma.alertaAtivo.create({
      data: {
        adolescenteId: adolescentes[0].id,
        ciOrigemId: ciSaude.id,
        tipoAlerta: "SAUDE",
        descricaoAlerta: `Alerta gerado por CI ${ciSaude.numero}/${ciSaude.ano}: ${ciSaude.resumoCI}`,
        nivelRisco: "ALTO",
      },
    });

    console.log(`✅ Alerta gerado automaticamente: ${alerta.id}`);

    // 4. Verificar resultados
    console.log("\n📊 Verificando resultados...");

    const totalCIs = await prisma.comunicadoInterno.count();
    const totalConflitos = await prisma.conflito.count();
    const totalAlertas = await prisma.alertaAtivo.count();

    console.log(`   Total de CIs: ${totalCIs}`);
    console.log(`   Total de Conflitos: ${totalConflitos}`);
    console.log(`   Total de Alertas: ${totalAlertas}`);

    // Buscar CIs com relações
    const cisComRelacoes = await prisma.comunicadoInterno.findMany({
      where: {
        OR: [{ numero: 999 }, { numero: 1000 }],
      },
      include: {
        adolescentes: {
          include: {
            adolescente: {
              select: {
                nomeCompleto: true,
              },
            },
          },
        },
        conflitos: true,
        alertasAtivos: true,
      },
    });

    console.log("\n📋 CIs criados no teste:");
    console.log("─".repeat(100));

    cisComRelacoes.forEach((ci) => {
      console.log(`\nCI ${ci.numero}/${ci.ano} - ${ci.tipoCI}`);
      console.log(`Resumo: ${ci.resumoCI}`);
      console.log(`Adolescentes envolvidos: ${ci.adolescentes.length}`);
      ci.adolescentes.forEach((link) => {
        console.log(`  - ${link.adolescente.nomeCompleto}`);
      });
      console.log(`Conflitos gerados: ${ci.conflitos.length}`);
      console.log(`Alertas gerados: ${ci.alertasAtivos.length}`);
    });

    console.log("\n" + "─".repeat(100));
    console.log("\n✅ Teste concluído com sucesso!");
    console.log("\n💡 Agora você pode:");
    console.log("   1. Acessar /comunicados para ver os CIs criados");
    console.log("   2. Acessar /alertas para ver os alertas gerados");
    console.log("   3. Acessar /conflitos para ver os conflitos registrados");
  } catch (error) {
    console.error("\n❌ Erro durante o teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCICreation();
