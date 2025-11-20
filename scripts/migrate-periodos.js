const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('Iniciando migração dos períodos por casa...');

    // 1. Adicionar coluna se não existir
    await prisma.$executeRawUnsafe(`
      ALTER TABLE configuracoes_visitas
      ADD COLUMN IF NOT EXISTS periodos_por_casa JSONB
    `);
    console.log('✓ Coluna periodos_por_casa criada');

    // 2. Buscar configurações existentes
    const configs = await prisma.$queryRaw`
      SELECT id, casas_manha_inicio, casas_manha_fim, casas_tarde_inicio, casas_tarde_fim
      FROM configuracoes_visitas
      WHERE periodos_por_casa IS NULL
    `;

    console.log(`✓ Encontradas ${configs.length} configurações para migrar`);

    // 3. Migrar cada configuração
    for (const cfg of configs) {
      const periodos = {};

      // Mapear casas 1-8 baseado nas faixas antigas
      for (let i = 1; i <= 8; i++) {
        if (i >= cfg.casas_manha_inicio && i <= cfg.casas_manha_fim) {
          periodos[i] = 'MANHA';
        } else if (i >= cfg.casas_tarde_inicio && i <= cfg.casas_tarde_fim) {
          periodos[i] = 'TARDE';
        } else {
          periodos[i] = 'MANHA'; // Default
        }
      }

      await prisma.$executeRawUnsafe(`
        UPDATE configuracoes_visitas
        SET periodos_por_casa = '${JSON.stringify(periodos)}'::jsonb
        WHERE id = '${cfg.id}'
      `);

      console.log(`✓ Migrada configuração ${cfg.id}:`, periodos);
    }

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('Agora execute: npx prisma db push --accept-data-loss');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
