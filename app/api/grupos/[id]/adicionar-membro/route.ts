// app/api/grupos/[id]/adicionar-membro/route.ts
// API: Adiciona membro a um grupo com verificação de conflitos

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/grupos/:id/adicionar-membro
 *
 * Adiciona adolescente a um grupo, verificando:
 * 1. Conflitos diretos com membros do mesmo grupo (CRÍTICO)
 * 2. Conflitos com membros de outros grupos da mesma casa (ALTO)
 * 3. Se já pertence a outro grupo ativo
 *
 * Body:
 * {
 *   adolescenteId: string,
 *   operadorId: string,
 *   justificativa?: string  // Obrigatória se houver conflito
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: grupoId } = await params;
    const body = await request.json();

    // 1. VALIDAÇÕES
    if (!body.adolescenteId || !body.operadorId) {
      return NextResponse.json(
        { erro: "adolescenteId e operadorId são obrigatórios" },
        { status: 400 }
      );
    }

    // 2. BUSCAR DADOS DO GRUPO
    const grupo = await prisma.grupo.findUnique({
      where: { id: grupoId },
      include: {
        casa: true,
        membros: {
          where: { dataSaida: null }, // Apenas membros ativos
          include: {
            adolescente: true,
          },
        },
      },
    });

    if (!grupo) {
      return NextResponse.json(
        { erro: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    // 3. BUSCAR ADOLESCENTE
    const adolescente = await prisma.adolescente.findUnique({
      where: { id: body.adolescenteId },
      include: {
        conflitosA: {
          where: { status: "ATIVO" },
          include: { adolescenteB: true },
        },
        conflitosB: {
          where: { status: "ATIVO" },
          include: { adolescenteA: true },
        },
        gruposMembros: {
          where: { dataSaida: null },
          include: {
            grupo: {
              include: {
                casa: true,
              },
            },
          },
        },
      },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado" },
        { status: 404 }
      );
    }

    // 4. VERIFICAR SE JÁ PERTENCE A GRUPO ATIVO
    if (adolescente.gruposMembros.length > 0) {
      const grupoAtual = adolescente.gruposMembros[0].grupo;
      return NextResponse.json(
        {
          erro: "Adolescente já pertence a um grupo ativo",
          grupo_atual: {
            id: grupoAtual.id,
            nome: grupoAtual.nomeGrupo,
            casa: grupoAtual.casa.nome,
          },
          sugestao: "Remova o adolescente do grupo atual primeiro",
        },
        { status: 400 }
      );
    }

    // 5. VERIFICAR SE JÁ FOI MEMBRO DESTE GRUPO (E SAIU)
    const membroExistente = await prisma.grupoMembro.findFirst({
      where: {
        grupoId: grupoId,
        adolescenteId: body.adolescenteId,
      },
    });

    if (membroExistente && !membroExistente.dataSaida) {
      return NextResponse.json(
        { erro: "Adolescente já é membro ativo deste grupo" },
        { status: 400 }
      );
    }

    // 6. COMBINAR CONFLITOS DO ADOLESCENTE
    const conflitos = [
      ...adolescente.conflitosA.map((c) => ({
        conflito: c,
        adversario: c.adolescenteB,
      })),
      ...adolescente.conflitosB.map((c) => ({
        conflito: c,
        adversario: c.adolescenteA,
      })),
    ];

    // 7. BUSCAR OUTROS GRUPOS DA MESMA CASA
    const gruposMesmaCasa = await prisma.grupo.findMany({
      where: {
        casaId: grupo.casaId,
        id: { not: grupoId },
        status: "ATIVO",
      },
      include: {
        membros: {
          where: { dataSaida: null },
          include: { adolescente: true },
        },
      },
    });

    // 8. ANÁLISE DE CONFLITOS
    const alertas: any[] = [];
    let nivelRiscoMaximo = 1;
    let requerJustificativa = false;

    // NÍVEL CRÍTICO: Conflito direto com membro do mesmo grupo
    for (const membro of grupo.membros) {
      const conflito = conflitos.find(
        (c) => c.adversario.id === membro.adolescente.id
      );

      if (conflito) {
        alertas.push({
          tipo: "CONFLITO_MESMO_GRUPO",
          nivel: "CRÍTICO",
          mensagem: `⚠️ CONFLITO DIRETO com ${conflito.adversario.nomeCompleto} que está no mesmo grupo "${grupo.nomeGrupo}"`,
          adolescente_conflitante: {
            id: conflito.adversario.id,
            nome: conflito.adversario.nomeCompleto,
          },
          tipo_conflito: conflito.conflito.tipoConflito,
          impacto:
            "Os dois adolescentes estarão JUNTOS em todas as atividades do grupo",
        });
        nivelRiscoMaximo = 5;
        requerJustificativa = true;
      }
    }

    // NÍVEL ALTO: Conflito com membro de outro grupo da mesma casa
    for (const outroGrupo of gruposMesmaCasa) {
      for (const membro of outroGrupo.membros) {
        const conflito = conflitos.find(
          (c) => c.adversario.id === membro.adolescente.id
        );

        if (conflito) {
          alertas.push({
            tipo: "CONFLITO_OUTRO_GRUPO_MESMA_CASA",
            nivel: "ALTO",
            mensagem: `⚠️ CONFLITO com ${conflito.adversario.nomeCompleto} do grupo "${outroGrupo.nomeGrupo}" (mesma casa)`,
            adolescente_conflitante: {
              id: conflito.adversario.id,
              nome: conflito.adversario.nomeCompleto,
            },
            grupo_conflitante: outroGrupo.nomeGrupo,
            tipo_conflito: conflito.conflito.tipoConflito,
            impacto:
              "Podem se cruzar nos corredores da casa durante movimentações",
          });
          nivelRiscoMaximo = Math.max(nivelRiscoMaximo, 4);
          requerJustificativa = true;
        }
      }
    }

    // 9. SE REQUER JUSTIFICATIVA E NÃO FOI FORNECIDA
    if (requerJustificativa && !body.justificativa) {
      return NextResponse.json(
        {
          status: "REQUER_JUSTIFICATIVA",
          nivel:
            nivelRiscoMaximo === 5
              ? "CRÍTICO"
              : nivelRiscoMaximo === 4
              ? "ALTO"
              : "MÉDIO",
          conflitos: alertas,
          mensagem:
            "Conflitos detectados. Justificativa obrigatória para prosseguir.",
        },
        { status: 400 }
      );
    }

    // 10. EXECUTAR ADIÇÃO (Transaction)
    const resultado = await prisma.$transaction(async (tx) => {
      // 10.1. Criar membro
      const novoMembro = await tx.grupoMembro.create({
        data: {
          grupoId: grupoId,
          adolescenteId: body.adolescenteId,
          dataEntrada: new Date(),
        },
        include: {
          adolescente: true,
          grupo: {
            include: {
              casa: true,
            },
          },
        },
      });

      // 10.2. Se houve conflito, registrar decisão
      let decisao = null;
      if (requerJustificativa) {
        decisao = await tx.decisaoOperacional.create({
          data: {
            operadorId: body.operadorId,
            tipoOperacao: "ADICIONAR_MEMBRO_GRUPO",
            adolescenteId: body.adolescenteId,
            grupoId: grupoId,
            nivelAlerta:
              nivelRiscoMaximo === 5
                ? "CRÍTICO"
                : nivelRiscoMaximo === 4
                ? "ALTO"
                : "MÉDIO",
            conflitosDetectados: alertas,
            justificativaOperador: body.justificativa || "",
            medidasAdicionais: body.medidas_adicionais || [],
            status: "EXECUTADO",
          },
        });
      }

      // 10.3. Log de auditoria
      await tx.logAuditoria.create({
        data: {
          operadorId: body.operadorId,
          acao: "ADICIONAR_MEMBRO_GRUPO",
          tabelaAfetada: "grupos_membros",
          registroIdAfetado: novoMembro.id,
          detalhesAlteracao: {
            grupo: grupo.nomeGrupo,
            adolescente: adolescente.nomeCompleto,
            conflitos_detectados: alertas.length,
            nivel_risco: nivelRiscoMaximo,
            justificativa: body.justificativa || null,
          },
          ipOrigem: request.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return { novoMembro, decisao };
    });

    // 11. RESPOSTA DE SUCESSO
    return NextResponse.json(
      {
        sucesso: true,
        mensagem: "Adolescente adicionado ao grupo com sucesso",
        documentado: requerJustificativa,
        membro: {
          id: resultado.novoMembro.id,
          adolescente: {
            id: resultado.novoMembro.adolescente.id,
            nome: resultado.novoMembro.adolescente.nomeCompleto,
          },
          grupo: {
            id: resultado.novoMembro.grupo.id,
            nome: resultado.novoMembro.grupo.nomeGrupo,
            casa: resultado.novoMembro.grupo.casa.nome,
          },
          data_entrada: resultado.novoMembro.dataEntrada,
        },
        decisao_id: resultado.decisao?.id,
        alertas_processados: alertas.length,
        nivel_risco:
          nivelRiscoMaximo === 5
            ? "CRÍTICO"
            : nivelRiscoMaximo === 4
            ? "ALTO"
            : "BAIXO",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao adicionar membro ao grupo:", error);
    return NextResponse.json(
      {
        erro: "Erro ao adicionar membro ao grupo",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
