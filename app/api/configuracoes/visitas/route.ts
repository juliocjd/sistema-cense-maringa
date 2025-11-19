import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOperador } from "@/lib/auth/ensure-operador";

const configuracaoSchema = z.object({
  diasPermitidos: z.array(z.number().min(0).max(6)).min(1, "Selecione pelo menos um dia"),
  limiteAdultosPadrao: z.number().int().min(1).max(10),
  limiteCriancasPadrao: z.number().int().min(0).max(10),
  habilitarRegraSegundoSabado: z.boolean(),
  limiteAdultosSegundoSab: z.number().int().min(1).max(10),
  limiteCriancasSegundoSab: z.number().int().min(0).max(10),
  permitirAlternativa: z.boolean(),
  idadeLimiteCrianca: z.number().int().min(1).max(18),
  casasManhaInicio: z.number().int().min(1),
  casasManhaFim: z.number().int().min(1),
  casasTardeInicio: z.number().int().min(1),
  casasTardeFim: z.number().int().min(1),
  quantidadeVisitasMensal: z.number().int().min(1).max(20),
});

/**
 * GET /api/configuracoes/visitas
 * Retorna a configuração ativa do sistema
 */
export async function GET(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const config = await prisma.configuracaoVisitas.findFirst({
      where: { ativo: true },
      orderBy: { criadoEm: "desc" },
    });

    if (!config) {
      // Retornar configuração padrão se não houver nenhuma
      return NextResponse.json({
        diasPermitidos: [6], // Sábado
        limiteAdultosPadrao: 2,
        limiteCriancasPadrao: 1,
        habilitarRegraSegundoSabado: true,
        limiteAdultosSegundoSab: 2,
        limiteCriancasSegundoSab: 1,
        permitirAlternativa: true,
        idadeLimiteCrianca: 12,
        casasManhaInicio: 1,
        casasManhaFim: 4,
        casasTardeInicio: 5,
        casasTardeFim: 8,
        quantidadeVisitasMensal: 2,
        ativo: false,
        id: null,
      });
    }

    return NextResponse.json({
      id: config.id,
      diasPermitidos: config.diasPermitidos,
      limiteAdultosPadrao: config.limiteAdultosPadrao,
      limiteCriancasPadrao: config.limiteCriancasPadrao,
      habilitarRegraSegundoSabado: config.habilitarRegraSegundoSabado,
      limiteAdultosSegundoSab: config.limiteAdultosSegundoSab,
      limiteCriancasSegundoSab: config.limiteCriancasSegundoSab,
      permitirAlternativa: config.permitirAlternativa,
      idadeLimiteCrianca: config.idadeLimiteCrianca,
      casasManhaInicio: config.casasManhaInicio,
      casasManhaFim: config.casasManhaFim,
      casasTardeInicio: config.casasTardeInicio,
      casasTardeFim: config.casasTardeFim,
      quantidadeVisitasMensal: config.quantidadeVisitasMensal,
      ativo: config.ativo,
      criadoEm: config.criadoEm.toISOString(),
      atualizadoEm: config.atualizadoEm.toISOString(),
    });
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar configurações",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/configuracoes/visitas
 * Cria uma nova configuração e desativa as anteriores
 */
export async function POST(request: NextRequest) {
  const authResult = await ensureOperador(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { operadorId, ip } = authResult;

  try {
    const body = await request.json();
    const dados = configuracaoSchema.parse(body);

    // Validar que casasManhaFim >= casasManhaInicio
    if (dados.casasManhaFim < dados.casasManhaInicio) {
      return NextResponse.json(
        { erro: "Casa final da manhã deve ser maior ou igual à casa inicial" },
        { status: 400 }
      );
    }

    // Validar que casasTardeFim >= casasTardeInicio
    if (dados.casasTardeFim < dados.casasTardeInicio) {
      return NextResponse.json(
        { erro: "Casa final da tarde deve ser maior ou igual à casa inicial" },
        { status: 400 }
      );
    }

    const novaConfig = await prisma.$transaction(async (tx) => {
      // Desativar todas as configurações anteriores
      await tx.configuracaoVisitas.updateMany({
        where: { ativo: true },
        data: { ativo: false },
      });

      // Criar nova configuração ativa
      const criada = await tx.configuracaoVisitas.create({
        data: {
          ...dados,
          ativo: true,
        },
      });

      // Registrar auditoria
      await tx.logAuditoria.create({
        data: {
          operadorId,
          acao: "CONFIGURACAO_VISITAS_ATUALIZAR",
          tabelaAfetada: "configuracao_visitas",
          registroIdAfetado: criada.id,
          detalhesAlteracao: {
            diasPermitidos: dados.diasPermitidos,
            limiteAdultosPadrao: dados.limiteAdultosPadrao,
            limiteCriancasPadrao: dados.limiteCriancasPadrao,
            quantidadeVisitasMensal: dados.quantidadeVisitasMensal,
          },
          ipOrigem: ip,
        },
      });

      return criada;
    });

    return NextResponse.json(
      {
        id: novaConfig.id,
        diasPermitidos: novaConfig.diasPermitidos,
        limiteAdultosPadrao: novaConfig.limiteAdultosPadrao,
        limiteCriancasPadrao: novaConfig.limiteCriancasPadrao,
        habilitarRegraSegundoSabado: novaConfig.habilitarRegraSegundoSabado,
        limiteAdultosSegundoSab: novaConfig.limiteAdultosSegundoSab,
        limiteCriancasSegundoSab: novaConfig.limiteCriancasSegundoSab,
        permitirAlternativa: novaConfig.permitirAlternativa,
        idadeLimiteCrianca: novaConfig.idadeLimiteCrianca,
        casasManhaInicio: novaConfig.casasManhaInicio,
        casasManhaFim: novaConfig.casasManhaFim,
        casasTardeInicio: novaConfig.casasTardeInicio,
        casasTardeFim: novaConfig.casasTardeFim,
        quantidadeVisitasMensal: novaConfig.quantidadeVisitasMensal,
        ativo: novaConfig.ativo,
        criadoEm: novaConfig.criadoEm.toISOString(),
        atualizadoEm: novaConfig.atualizadoEm.toISOString(),
        mensagem: "Configurações atualizadas com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.flatten() },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar configurações:", error);
    return NextResponse.json(
      {
        erro: "Erro ao atualizar configurações",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
