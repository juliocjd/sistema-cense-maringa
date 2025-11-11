import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testImpactoConflito() {
  console.log("🧪 Testando análise de impacto de conflito...\n");

  try {
    // 1. Buscar conflito ativo existente
    const conflito = await prisma.conflito.findFirst({
      where: { status: "ATIVO" },
      include: {
        adolescenteA: {
          select: {
            id: true,
            nomeCompleto: true,
            numeroSms: true,
            alojamentoAtualId: true,
          },
        },
        adolescenteB: {
          select: {
            id: true,
            nomeCompleto: true,
            numeroSms: true,
            alojamentoAtualId: true,
          },
        },
      },
    });

    if (!conflito) {
      console.log("⚠️  Não há conflitos ativos no banco de dados.");
      console.log("   Criando conflito de teste...\n");

      // Buscar 2 adolescentes alocados
      const adolescentes = await prisma.adolescente.findMany({
        where: {
          statusUnidade: "ATIVO",
          alojamentoAtualId: { not: null },
        },
        take: 2,
        include: {
          alojamentoAtual: {
            include: {
              casa: true,
            },
          },
        },
      });

      if (adolescentes.length < 2) {
        console.log("❌ Não há adolescentes alocados suficientes para teste.");
        return;
      }

      // Criar conflito de teste
      const novoConflito = await prisma.conflito.create({
        data: {
          adolescenteAId: adolescentes[0].id,
          adolescenteBId: adolescentes[1].id,
          tipoConflito: "TESTE_IMPACTO",
          status: "ATIVO",
          descricao: "Conflito criado para testar análise de impacto",
        },
      });

      console.log(`✅ Conflito de teste criado: ${novoConflito.id}`);
      console.log(`   Adolescente A: ${adolescentes[0].nomeCompleto} (SMS ${adolescentes[0].numeroSms})`);
      console.log(`   - Alojado em: ${adolescentes[0].alojamentoAtual?.casa.nome} - Aloj ${adolescentes[0].alojamentoAtual?.numeroAlojamento}`);
      console.log(`   Adolescente B: ${adolescentes[1].nomeCompleto} (SMS ${adolescentes[1].numeroSms})`);
      console.log(`   - Alojado em: ${adolescentes[1].alojamentoAtual?.casa.nome} - Aloj ${adolescentes[1].alojamentoAtual?.numeroAlojamento}\n`);

      // Testar endpoint
      console.log("📡 Chamando endpoint de análise de impacto...\n");

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const response = await fetch(
        `${baseUrl}/api/conflitos/${novoConflito.id}/analisar-impacto`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.log("❌ Erro ao chamar endpoint:");
        console.log(await response.text());
        return;
      }

      const resultado = await response.json();

      console.log("✅ Análise de impacto concluída!\n");
      console.log("─".repeat(100));
      console.log("\n📊 RESULTADO DA ANÁLISE:\n");
      console.log(JSON.stringify(resultado, null, 2));
      console.log("\n" + "─".repeat(100));

      // Interpretar resultado
      console.log("\n📋 INTERPRETAÇÃO:\n");
      console.log(`Nível de Risco: ${resultado.risco}`);
      console.log(`Requer Ação: ${resultado.requerAcao ? "SIM ⚠️" : "NÃO ✓"}`);
      console.log(`Mensagem: ${resultado.mensagem}`);

      if (resultado.analiseProximidade) {
        console.log("\n🔍 Proximidade:");
        console.log(`   - Mesma Casa: ${resultado.analiseProximidade.mesmaCasa ? "SIM" : "NÃO"}`);
        console.log(`   - Mesma Ala: ${resultado.analiseProximidade.mesmaAla ? "SIM" : "NÃO"}`);
        console.log(`   - São Frontais: ${resultado.analiseProximidade.saoFrontais ? "SIM" : "NÃO"}`);
        console.log(`   - Classificação: ${resultado.analiseProximidade.proximidade}`);
      }

      if (resultado.sugestoes && resultado.sugestoes.length > 0) {
        console.log(`\n💡 Sugestões de Realocação (${resultado.sugestoes.length}):`);
        resultado.sugestoes.forEach((sug: any, i: number) => {
          console.log(`\n   ${i + 1}. ${sug.alojamento.casa} - Alojamento ${sug.alojamento.numero} (Ala ${sug.alojamento.ala})`);
          console.log(`      Nível de Risco: ${sug.nivelRisco} (${sug.categoria})`);
          console.log(`      Motivos: ${sug.motivos.join(", ")}`);
        });
      } else if (resultado.requerAcao) {
        console.log("\n⚠️  Nenhuma sugestão de realocação segura encontrada!");
      }

      console.log("\n✅ Teste concluído com sucesso!");
      console.log("\n💡 Você pode acessar o endpoint via:");
      console.log(`   POST ${baseUrl}/api/conflitos/${novoConflito.id}/analisar-impacto`);

      return;
    }

    console.log(`✅ Conflito ativo encontrado: ${conflito.id}`);
    console.log(`   Tipo: ${conflito.tipoConflito}`);
    console.log(`   Status: ${conflito.status}`);
    console.log(`   Adolescente A: ${conflito.adolescenteA.nomeCompleto}`);
    console.log(`   Adolescente B: ${conflito.adolescenteB.nomeCompleto}\n`);

    // Testar endpoint
    console.log("📡 Chamando endpoint de análise de impacto...\n");

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/conflitos/${conflito.id}/analisar-impacto`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.log("❌ Erro ao chamar endpoint:");
      console.log(await response.text());
      return;
    }

    const resultado = await response.json();

    console.log("✅ Análise de impacto concluída!\n");
    console.log("─".repeat(100));
    console.log("\n📊 RESULTADO DA ANÁLISE:\n");
    console.log(JSON.stringify(resultado, null, 2));
    console.log("\n" + "─".repeat(100));

    console.log("\n✅ Teste concluído!");
  } catch (error) {
    console.error("\n❌ Erro durante o teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testImpactoConflito();
