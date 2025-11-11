import { PrismaClient } from "@prisma/client";
import { classificarProximidade } from "@/lib/riscos/proximidade";

const prisma = new PrismaClient();

async function testImpactoSimples() {
  console.log("🧪 Testando análise de impacto (lógica direta)...\n");

  try {
    // Buscar conflito ativo
    const conflito = await prisma.conflito.findFirst({
      where: { status: "ATIVO" },
      include: {
        adolescenteA: {
          include: {
            alojamentoAtual: {
              include: {
                casa: {
                  select: {
                    id: true,
                    nome: true,
                    numero: true,
                  },
                },
              },
            },
          },
        },
        adolescenteB: {
          include: {
            alojamentoAtual: {
              include: {
                casa: {
                  select: {
                    id: true,
                    nome: true,
                    numero: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!conflito) {
      console.log("❌ Não há conflitos ativos no banco.");
      return;
    }

    const { adolescenteA, adolescenteB } = conflito;

    console.log("✅ Conflito encontrado:");
    console.log(`   ID: ${conflito.id}`);
    console.log(`   Tipo: ${conflito.tipoConflito}`);
    console.log(`   Status: ${conflito.status}\n`);

    console.log("👤 Adolescente A:");
    console.log(`   Nome: ${adolescenteA.nomeCompleto}`);
    console.log(`   SMS: ${adolescenteA.numeroSms}`);
    if (adolescenteA.alojamentoAtual) {
      console.log(`   Alojamento: ${adolescenteA.alojamentoAtual.casa.nome} - Aloj ${adolescenteA.alojamentoAtual.numeroAlojamento} (Ala ${adolescenteA.alojamentoAtual.ala})`);
    } else {
      console.log(`   Status: Não alocado`);
    }

    console.log("\n👤 Adolescente B:");
    console.log(`   Nome: ${adolescenteB.nomeCompleto}`);
    console.log(`   SMS: ${adolescenteB.numeroSms}`);
    if (adolescenteB.alojamentoAtual) {
      console.log(`   Alojamento: ${adolescenteB.alojamentoAtual.casa.nome} - Aloj ${adolescenteB.alojamentoAtual.numeroAlojamento} (Ala ${adolescenteB.alojamentoAtual.ala})\n`);
    } else {
      console.log(`   Status: Não alocado\n`);
    }

    // Analisar proximidade se ambos estão alocados
    if (adolescenteA.alojamentoAtual && adolescenteB.alojamentoAtual) {
      const alojA = adolescenteA.alojamentoAtual;
      const alojB = adolescenteB.alojamentoAtual;

      const mesmaCasa = alojA.casaId === alojB.casaId;
      const mesmaAla = mesmaCasa && alojA.ala === alojB.ala;
      const saoFrontais =
        alojA.alojamentoFrontalId === alojB.id ||
        alojB.alojamentoFrontalId === alojA.id;

      const proximidade = classificarProximidade(
        {
          alojamento: {
            id: alojA.id,
            casaId: alojA.casaId,
            numeroAlojamento: alojA.numeroAlojamento,
            ala: alojA.ala as any,
            alojamentoFrontalId: alojA.alojamentoFrontalId,
          },
          casa: alojA.casa,
        },
        {
          alojamento: {
            id: alojB.id,
            casaId: alojB.casaId,
            numeroAlojamento: alojB.numeroAlojamento,
            ala: alojB.ala as any,
            alojamentoFrontalId: alojB.alojamentoFrontalId,
          },
          casa: alojB.casa,
        }
      );

      let nivelRisco = "DESCONHECIDO";
      let requerAcao = false;

      if (saoFrontais) {
        nivelRisco = "CRÍTICO";
        requerAcao = true;
      } else if (mesmaAla) {
        nivelRisco = "ALTO";
        requerAcao = true;
      } else if (mesmaCasa) {
        nivelRisco = "MÉDIO";
        requerAcao = true;
      } else {
        nivelRisco = "BAIXO";
        requerAcao = false;
      }

      console.log("─".repeat(100));
      console.log("\n🔍 ANÁLISE DE PROXIMIDADE:\n");
      console.log(`   Mesma Casa: ${mesmaCasa ? "SIM" : "NÃO"}`);
      console.log(`   Mesma Ala: ${mesmaAla ? "SIM" : "NÃO"}`);
      console.log(`   São Frontais: ${saoFrontais ? "SIM" : "NÃO"}`);
      console.log(`   Classificação: ${proximidade}`);
      console.log(`\n   Nível de Risco: ${nivelRisco}`);
      console.log(`   Requer Ação: ${requerAcao ? "SIM ⚠️" : "NÃO ✓"}`);

      if (requerAcao) {
        console.log(`\n   ⚠️  ALERTA: Adolescentes conflitantes estão em proximidade de risco!`);
        console.log(`      É recomendado realocar um deles para reduzir o risco.`);
      } else {
        console.log(`\n   ✓ Situação sob controle - adolescentes não estão em proximidade de risco.`);
      }

      console.log("\n" + "─".repeat(100));
    } else {
      console.log("─".repeat(100));
      console.log("\n📊 ANÁLISE:\n");
      console.log("   ✓ Um ou ambos adolescentes não estão alocados.");
      console.log("   ✓ Não há risco de proximidade física.\n");
      console.log("─".repeat(100));
    }

    console.log("\n✅ Teste concluído com sucesso!");
  } catch (error) {
    console.error("\n❌ Erro durante o teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testImpactoSimples();
