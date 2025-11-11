const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMarcos() {
  try {
    const todosMarcos = await prisma.adolescente.findMany({
      where: {
        nomeCompleto: {
          contains: 'Marcos'
        }
      },
      select: {
        id: true,
        nomeCompleto: true,
        bairroOrigemId: true,
        bairroOrigem: {
          select: {
            nomeBairro: true
          }
        },
        alojamentoAtualId: true,
        alojamentoAtual: {
          select: {
            numeroAlojamento: true,
            casa: {
              select: {
                numero: true
              }
            }
          }
        }
      }
    });

    console.log('=== TODOS OS MARCOS NO BANCO ===\n');
    todosMarcos.forEach((m, idx) => {
      console.log(`[${idx + 1}] ${m.nomeCompleto}`);
      console.log('  ID:', m.id);
      console.log('  Bairro:', m.bairroOrigem?.nomeBairro || 'SEM BAIRRO');
      console.log('  BairroOrigemId:', m.bairroOrigemId || 'NULL');
      const aloj = m.alojamentoAtual
        ? `${m.alojamentoAtual.numeroAlojamento} - Casa ${m.alojamentoAtual.casa?.numero}`
        : 'NÃO ALOCADO';
      console.log('  Alojamento:', aloj);
      console.log('');
    });

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMarcos();
