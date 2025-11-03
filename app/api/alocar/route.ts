// app/api/alocar/route.ts
// API CRÍTICA: Executa a alocação de adolescente em alojamento

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/alocar
 *
 * Executa a alocação de um adolescente em um alojamento:
 * 1. Valida se alocação pode ser feita
 * 2. Se houver risco, exige justificativa
 * 3. Atualiza adolescente
 * 4. Registra decisão operacional
 * 5. Cria log de auditoria
 *
 * Body:
 * {
 *   adolescenteId: string,
 *   alojamentoId: string,
 *   operadorId: string,
 *   justificativa?: string,  // Obrigatória se houver risco
 *   medidas_adicionais?: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. VALIDAÇÕES
    if (!body.adolescenteId || !body.alojamentoId || !body.operadorId) {
      return NextResponse.json(
        {
          erro: "adolescenteId, alojamentoId e operadorId são obrigatórios",
        },
        { status: 400 }
      );
    }

    // 2. VERIFICAR RISCOS (chama a API de verificação internamente)
    const verificacao = await fetch(
      `${request.nextUrl.origin}/api/verificar-alocacao?adolescenteId=${body.adolescenteId}&alojamentoId=${body.alojamentoId}`
    );

    if (!verificacao.ok) {
      return NextResponse.json(
        { erro: "Erro ao verificar alocação" },
        { status: 500 }
      );
    }

    const dadosVerificacao = await verificacao.json();

    // 3. SE REQUER JUSTIFICATIVA E NÃO FOI FORNECIDA
    if (dadosVerificacao.requer_justificativa && !body.justificativa) {
      return NextResponse.json(
        {
          erro: "Esta alocação requer justificativa obrigatória",
          nivel_risco: dadosVerificacao.nivel_risco,
          alertas: dadosVerificacao.alertas,
          requer_justificativa: true,
        },
        { status: 400 }
      );
    }

    // 4. VERIFICAR SE ALOJAMENTO ESTÁ LIVRE
    const alojamento = await prisma.alojamento.findUnique({
      where: { id: body.alojamentoId },
      include: {
        adolescentes: {
          where: { statusUnidade: "ATIVO" },
        },
      },
    });

    if (!alojamento) {
      return NextResponse.json(
        { erro: "Alojamento não encontrado" },
        { status: 404 }
      );
    }

    if (alojamento.adolescentes.length > 0) {
      return NextResponse.json(
        {
          erro: "Alojamento já está ocupado",
          ocupante: alojamento.adolescentes[0].nomeCompleto,
        },
        { status: 400 }
      );
    }

    if (alojamento.statusManutencao === "INTERDITADO") {
      return NextResponse.json(
        { erro: "Alojamento está interditado" },
        { status: 400 }
      );
    }

    // 5. VERIFICAR SE ADOLESCENTE EXISTE
    const adolescente = await prisma.adolescente.findUnique({
      where: { id: body.adolescenteId },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado" },
        { status: 404 }
      );
    }

    // 6. EXECUTAR ALOCAÇÃO (Transaction para garantir atomicidade)
    const resultado = await prisma.$transaction(async (tx) => {
      // 6.1. Atualizar adolescente
      const adolescenteAtualizado = await tx.adolescente.update({
        where: { id: body.adolescenteId },
        data: {
          alojamentoAtualId: body.alojamentoId,
          atualizadoEm: new Date(),
        },
        include: {
          alojamentoAtual: {
            include: {
              casa: true,
            },
          },
        },
      });

      // 6.2. Se houve risco, registrar decisão operacional
      let decisao = null;
      if (dadosVerificacao.requer_justificativa) {
        decisao = await tx.decisaoOperacional.create({
          data: {
            operadorId: body.operadorId,
            tipoOperacao: "ALOCAR_ALOJAMENTO",
            adolescenteId: body.adolescenteId,
            alojamentoId: body.alojamentoId,
            nivelAlerta: dadosVerificacao.nivel_risco,
            conflitosDetectados: dadosVerificacao.alertas.filter((a: any) =>
              a.tipo.includes("CONFLITO")
            ),
            justificativaOperador: body.justificativa || "",
            medidasAdicionais: body.medidas_adicionais || [],
            status: "EXECUTADO",
          },
        });
      }

      // 6.3. Registrar log de auditoria
      await tx.logAuditoria.create({
        data: {
          operadorId: body.operadorId,
          acao: "ALOCACAO",
          tabelaAfetada: "adolescentes",
          registroIdAfetado: body.adolescenteId,
          detalhesAlteracao: {
            alojamento_anterior: adolescente.alojamentoAtualId,
            alojamento_novo: body.alojamentoId,
            nivel_risco: dadosVerificacao.nivel_risco,
            alertas_count: dadosVerificacao.alertas.length,
            justificativa: body.justificativa || null,
          },
          ipOrigem: request.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return {
        adolescente: adolescenteAtualizado,
        decisao,
      };
    });

    // 7. RESPOSTA DE SUCESSO
    return NextResponse.json(
      {
        sucesso: true,
        mensagem: "Adolescente alocado com sucesso",
        documentado: dadosVerificacao.requer_justificativa,
        adolescente: {
          id: resultado.adolescente.id,
          nome: resultado.adolescente.nomeCompleto,
          alojamento: {
            casa: resultado.adolescente.alojamentoAtual?.casa.nome,
            numero: resultado.adolescente.alojamentoAtual?.numeroAlojamento,
            ala: resultado.adolescente.alojamentoAtual?.ala,
          },
        },
        decisao_id: resultado.decisao?.id,
        nivel_risco: dadosVerificacao.nivel_risco,
        alertas_processados: dadosVerificacao.alertas.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao alocar adolescente:", error);
    return NextResponse.json(
      {
        erro: "Erro ao alocar adolescente",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alocar?adolescenteId=xxx
 *
 * Remove adolescente de seu alojamento atual (liberar alojamento)
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adolescenteId = searchParams.get("adolescenteId");
    const operadorId = searchParams.get("operadorId");

    if (!adolescenteId || !operadorId) {
      return NextResponse.json(
        { erro: "adolescenteId e operadorId são obrigatórios" },
        { status: 400 }
      );
    }

    const adolescente = await prisma.adolescente.findUnique({
      where: { id: adolescenteId },
      include: {
        alojamentoAtual: {
          include: {
            casa: true,
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

    if (!adolescente.alojamentoAtualId) {
      return NextResponse.json(
        { erro: "Adolescente já está sem alojamento" },
        { status: 400 }
      );
    }

    const alojamentoAnterior = adolescente.alojamentoAtual;

    // Remover alocação
    await prisma.$transaction(async (tx) => {
      await tx.adolescente.update({
        where: { id: adolescenteId },
        data: {
          alojamentoAtualId: null,
        },
      });

      await tx.logAuditoria.create({
        data: {
          operadorId: operadorId,
          acao: "REMOCAO_ALOCACAO",
          tabelaAfetada: "adolescentes",
          registroIdAfetado: adolescenteId,
          detalhesAlteracao: {
            alojamento_removido: alojamentoAnterior?.id,
            casa: alojamentoAnterior?.casa.nome,
            numero: alojamentoAnterior?.numeroAlojamento,
          },
          ipOrigem: request.headers.get("x-forwarded-for") || "unknown",
        },
      });
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: "Adolescente removido do alojamento",
      alojamento_liberado: {
        casa: alojamentoAnterior?.casa.nome,
        numero: alojamentoAnterior?.numeroAlojamento,
      },
    });
  } catch (error) {
    console.error("Erro ao remover alocação:", error);
    return NextResponse.json(
      {
        erro: "Erro ao remover alocação",
        detalhes: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
