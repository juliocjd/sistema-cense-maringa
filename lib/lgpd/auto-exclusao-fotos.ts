import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { Prisma } from "@prisma/client";
import { markVisitanteEmbeddingCacheDirty } from "@/lib/visitantes/embedding-cache";

/**
 * Configurações LGPD para auto-exclusão de fotos
 */
const DIAS_RETENCAO_FOTOS = 60; // 60 dias de retenção

/**
 * Busca visitantes com fotos que devem ser excluídas
 * Critério: fotos cadastradas há mais de 60 dias E sem visitas nos últimos 60 dias
 */
export async function buscarFotosParaExclusao() {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - DIAS_RETENCAO_FOTOS);

  try {
    // Buscar visitantes com fotos antigas (usar atualizadoEm como referência)
    const visitantesComFotos = await prisma.visitante.findMany({
      where: {
        fotoUrl: {
          not: null,
        },
        atualizadoEm: {
          lte: dataLimite,
        },
      },
    });

    // Para cada visitante, verificar se teve visitas recentes
    const visitantesSemVisitasRecentes = [];

    for (const visitante of visitantesComFotos) {
      const visitasRecentes = await prisma.visitaRegistro.count({
        where: {
          visitanteId: visitante.id,
          dataHoraEntrada: {
            gte: dataLimite,
          },
        },
      });

      if (visitasRecentes === 0) {
        visitantesSemVisitasRecentes.push({
          id: visitante.id,
          nomeCompleto: visitante.nomeCompleto,
          fotoUrl: visitante.fotoUrl,
          dataUltimaAtualizacao: visitante.atualizadoEm,
          cpf: visitante.cpf,
          email: visitante.email,
        });
      }
    }

    return visitantesSemVisitasRecentes;
  } catch (error) {
    console.error("Erro ao buscar fotos para exclusão:", error);
    throw error;
  }
}

/**
 * Exclui foto de um visitante
 */
export async function excluirFotoVisitante(visitanteId: string) {
  try {
    const visitante = await prisma.visitante.findUnique({
      where: { id: visitanteId },
      select: {
        id: true,
        fotoUrl: true,
      },
    });

    if (!visitante || !visitante.fotoUrl) {
      return {
        sucesso: false,
        erro: "Visitante não encontrado ou sem foto",
      };
    }

    // Excluir do Vercel Blob
    try {
      await del(visitante.fotoUrl);
    } catch (blobError) {
      console.warn("Erro ao excluir do Blob (pode já ter sido excluído):", blobError);
    }

    // Atualizar registro no banco
    await prisma.visitante.update({
      where: { id: visitanteId },
      data: {
        fotoUrl: null,
        faceEmbeddings: Prisma.DbNull,
        atualizadoEm: new Date(),
      },
    });
    markVisitanteEmbeddingCacheDirty();

    // Registrar no log de auditoria
    await prisma.logAuditoria.create({
      data: {
        acao: "FOTO_EXCLUIDA_LGPD",
        dataHora: new Date(),
      },
    });

    return {
      sucesso: true,
      mensagem: "Foto excluída com sucesso",
    };
  } catch (error) {
    console.error("Erro ao excluir foto:", error);
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : "Erro ao excluir foto",
    };
  }
}

/**
 * Executa o processo de auto-exclusão de fotos (LGPD)
 * Deve ser executado periodicamente (ex: cron job diário)
 */
export async function executarAutoExclusaoFotos() {
  try {
    console.log("🔒 Iniciando processo de auto-exclusão de fotos (LGPD)...");

    const fotosParaExcluir = await buscarFotosParaExclusao();

    console.log(`📊 Encontradas ${fotosParaExcluir.length} fotos para exclusão`);

    const resultados = {
      total: fotosParaExcluir.length,
      sucesso: 0,
      falhas: 0,
      detalhes: [] as Array<{
        visitanteId: string;
        nome: string;
        sucesso: boolean;
        erro?: string;
      }>,
    };

    for (const visitante of fotosParaExcluir) {
      const resultado = await excluirFotoVisitante(visitante.id);

      if (resultado.sucesso) {
        resultados.sucesso++;
        resultados.detalhes.push({
          visitanteId: visitante.id,
          nome: visitante.nomeCompleto,
          sucesso: true,
        });
        console.log(`✅ Foto excluída: ${visitante.nomeCompleto}`);
      } else {
        resultados.falhas++;
        resultados.detalhes.push({
          visitanteId: visitante.id,
          nome: visitante.nomeCompleto,
          sucesso: false,
          erro: resultado.erro,
        });
        console.error(`❌ Falha ao excluir foto: ${visitante.nomeCompleto} - ${resultado.erro}`);
      }
    }

    console.log(`\n✅ Processo concluído:
    - Total: ${resultados.total}
    - Sucesso: ${resultados.sucesso}
    - Falhas: ${resultados.falhas}
    `);

    // Registrar execução do processo
    await prisma.logAuditoria.create({
      data: {
        acao: "EXECUCAO_AUTO_EXCLUSAO_LGPD",
        dataHora: new Date(),
      },
    });

    return resultados;
  } catch (error) {
    console.error("❌ Erro no processo de auto-exclusão:", error);
    throw error;
  }
}

/**
 * Envia notificação de aviso antes da exclusão (7 dias antes)
 */
export async function notificarAntesExclusao() {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - (DIAS_RETENCAO_FOTOS - 7)); // 53 dias

  try {
    const visitantesProximosExclusao = await prisma.visitante.findMany({
      where: {
        fotoUrl: {
          not: null,
        },
        email: {
          not: null,
        },
        atualizadoEm: {
          lte: dataLimite,
        },
      },
    });

    // Verificar visitas recentes para cada visitante
    const visitantesSemVisitasRecentes = [];

    for (const visitante of visitantesProximosExclusao) {
      const visitasRecentes = await prisma.visitaRegistro.count({
        where: {
          visitanteId: visitante.id,
          dataHoraEntrada: {
            gte: dataLimite,
          },
        },
      });

      if (visitasRecentes === 0) {
        visitantesSemVisitasRecentes.push(visitante);
      }
    }

    console.log(
      `📧 ${visitantesSemVisitasRecentes.length} visitantes serão notificados sobre exclusão de foto`
    );

    // TODO: Integrar com sistema de notificações por email
    // Para cada visitante, enviar email avisando sobre a exclusão em 7 dias

    return {
      total: visitantesSemVisitasRecentes.length,
      visitantes: visitantesSemVisitasRecentes.map((v) => ({
        id: v.id,
        nome: v.nomeCompleto,
        email: v.email,
        dataExclusaoPrevista: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })),
    };
  } catch (error) {
    console.error("Erro ao notificar visitantes:", error);
    throw error;
  }
}
