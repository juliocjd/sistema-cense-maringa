import { PrismaClient } from "@prisma/client";
import { registrarMovimentacao } from "@/lib/historico/movimentacao";

const prisma = new PrismaClient();

async function main() {
  const adolescentes = await prisma.adolescente.findMany({
    where: {
      statusUnidade: "ATIVO",
      alojamentoAtualId: { not: null },
    },
    select: {
      id: true,
      nomeCompleto: true,
      criadoEm: true,
      atualizadoEm: true,
      alojamentoAtualId: true,
      alojamentoAtual: {
        select: {
          id: true,
          numeroAlojamento: true,
          ala: true,
          casaId: true,
          casa: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
    },
  });

  if (adolescentes.length === 0) {
    console.log("Nenhum adolescente alocado encontrado.");
    return;
  }

  console.log(
    `Processando ${adolescentes.length} adolescentes para backfill do histórico...`
  );

  let criados = 0;

  for (const adolescente of adolescentes) {
    if (!adolescente.alojamentoAtualId || !adolescente.alojamentoAtual) {
      continue;
    }

    const jaRegistrado = await prisma.historicoMovimentacao.findFirst({
      where: {
        adolescenteId: adolescente.id,
        destinoAlojamentoId: adolescente.alojamentoAtualId,
      },
      select: { id: true },
    });

    if (jaRegistrado) {
      continue;
    }

    await registrarMovimentacao(prisma, {
      adolescenteId: adolescente.id,
      tipo: "ALOCACAO_INICIAL",
      descricao: `Registro inicial de alojamento - ${
        adolescente.alojamentoAtual.casa?.nome ?? "Casa"
      } ${adolescente.alojamentoAtual.numeroAlojamento}${
        adolescente.alojamentoAtual.ala
          ? ` Ala ${adolescente.alojamentoAtual.ala}`
          : ""
      }`,
      destinoCasaId: adolescente.alojamentoAtual.casaId,
      destinoAlojamentoId: adolescente.alojamentoAtualId,
      registradoEm: adolescente.atualizadoEm ?? adolescente.criadoEm,
    });

    criados += 1;
    console.log(
      `✓ ${adolescente.nomeCompleto} → ${adolescente.alojamentoAtual.casa?.nome ?? "Casa"} ${
        adolescente.alojamentoAtual.numeroAlojamento
      }`
    );
  }

  console.log(
    `Backfill concluído. ${criados} registros criados, ${adolescentes.length - criados} já possuíam histórico.`
  );
}

main()
  .catch((error) => {
    console.error("Erro ao executar backfill:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
