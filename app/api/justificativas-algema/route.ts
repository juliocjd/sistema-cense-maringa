import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Schema de validação
const createJustificativaSchema = z.object({
  adolescenteId: z.string().uuid("ID do adolescente inválido"),
  operadorResponsavelId: z.string().uuid("ID do operador inválido"),

  // Dados do Contexto
  dataHoraOcorrencia: z.string().datetime("Data/hora inválida"),
  motivoPrincipal: z.enum([
    "TRANSFERENCIA_JUDICIAL",
    "AUDIENCIA",
    "ATENDIMENTO_EXTERNO",
    "FUGA_TENTATIVA",
    "AGRESSAO_GRAVE",
    "OUTRO"
  ], { errorMap: () => ({ message: "Motivo principal inválido" }) }),
  destinoMovimentacao: z.string().optional(),

  // Fundamentação Legal
  fundamentacaoLegal: z.string().min(50, "Fundamentação deve ter no mínimo 50 caracteres"),
  atoInfracionalBase: z.string().optional(),
  numeroProcesso: z.string().optional(),
  decisaoJudicial: z.string().optional(),

  // Avaliação de Risco
  riscoFuga: z.enum(["BAIXO", "MEDIO", "ALTO"]),
  riscoAgressao: z.enum(["BAIXO", "MEDIO", "ALTO"]),
  riscoAutolesao: z.enum(["BAIXO", "MEDIO", "ALTO"]),
  historicoComportamental: z.string().optional(),

  // Medidas de Segurança
  medidasSeguranca: z.array(z.string()).min(1, "Selecione ao menos uma medida de segurança"),
  equipeProfissional: z.array(z.string()).min(1, "Informe ao menos um membro da equipe"),
  veiculoUtilizado: z.string().optional(),

  // Observações
  observacoesAdicionais: z.string().optional(),
  horaInicio: z.string().datetime().optional(),
  horaFim: z.string().datetime().optional(),

  // Análise Automática de Inteligência
  fatoresAgravantes: z.array(z.string()).optional(),
  pontuacaoRiscoFuga: z.number().optional(),
  pontuacaoRiscoAgressao: z.number().optional(),
  pontuacaoRiscoAutolesao: z.number().optional(),
  fundamentacaoAutomatica: z.string().optional(),
});

// GET /api/justificativas-algema - Listar justificativas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adolescenteId = searchParams.get("adolescenteId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};

    if (adolescenteId) {
      where.adolescenteId = adolescenteId;
    }

    if (status) {
      where.status = status;
    }

    const [justificativas, total] = await Promise.all([
      prisma.justificativaAlgema.findMany({
        where,
        include: {
          adolescente: {
            select: {
              id: true,
              nomeCompleto: true,
              numeroSms: true,
              numeroProcesso: true,
              fotoUrl: true,
            },
          },
          operadorResponsavel: {
            select: {
              id: true,
              nomeCompleto: true,
              funcaoRole: true,
            },
          },
          aprovador: {
            select: {
              id: true,
              nomeCompleto: true,
              funcaoRole: true,
            },
          },
        },
        orderBy: {
          criadoEm: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.justificativaAlgema.count({ where }),
    ]);

    return NextResponse.json({
      justificativas,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Erro ao listar justificativas:", error);
    return NextResponse.json(
      { erro: "Erro ao listar justificativas de algema" },
      { status: 500 }
    );
  }
}

// POST /api/justificativas-algema - Criar nova justificativa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar dados
    const validatedData = createJustificativaSchema.parse(body);

    // Verificar se adolescente existe e está ativo
    const adolescente = await prisma.adolescente.findUnique({
      where: { id: validatedData.adolescenteId },
      select: {
        id: true,
        nomeCompleto: true,
        numeroSms: true,
        statusUnidade: true,
        atoInfracionalAtual: true,
        numeroProcesso: true,
        atoInfracionalGravidade: true,
      },
    });

    if (!adolescente) {
      return NextResponse.json(
        { erro: "Adolescente não encontrado" },
        { status: 404 }
      );
    }

        if (adolescente.statusUnidade !== "ATIVO") {
      return NextResponse.json(
        { erro: "Somente adolescentes ativos podem gerar justificativa de algema" },
        { status: 400 }
      );
    }

// Gerar número do documento (formato: JA-001/2025)
    const ano = new Date().getFullYear();
    const ultimaJustificativa = await prisma.justificativaAlgema.findFirst({
      where: {
        numeroDocumento: {
          endsWith: `/${ano}`,
        },
      },
      orderBy: {
        numeroDocumento: "desc",
      },
    });

    let proximoNumero = 1;
    if (ultimaJustificativa) {
      const match = ultimaJustificativa.numeroDocumento.match(/^JA-(\d+)\/\d{4}$/);
      if (match) {
        proximoNumero = parseInt(match[1]) + 1;
      }
    }

    const numeroDocumento = `JA-${String(proximoNumero).padStart(3, "0")}/${ano}`;

    // Calcular duração se ambas as horas foram informadas
    let duracaoMinutos: number | undefined = undefined;
    if (validatedData.horaInicio && validatedData.horaFim) {
      const inicio = new Date(validatedData.horaInicio);
      const fim = new Date(validatedData.horaFim);
      duracaoMinutos = Math.round((fim.getTime() - inicio.getTime()) / 60000);
    }

    // Criar justificativa
    const justificativa = await prisma.justificativaAlgema.create({
      data: {
        numeroDocumento,
        adolescenteId: validatedData.adolescenteId,
        operadorResponsavelId: validatedData.operadorResponsavelId,
        dataHoraOcorrencia: new Date(validatedData.dataHoraOcorrencia),
        motivoPrincipal: validatedData.motivoPrincipal,
        destinoMovimentacao: validatedData.destinoMovimentacao,
        fundamentacaoLegal: validatedData.fundamentacaoLegal,
        atoInfracionalBase: validatedData.atoInfracionalBase || adolescente.atoInfracionalAtual,
        numeroProcesso: validatedData.numeroProcesso || adolescente.numeroProcesso,
        decisaoJudicial: validatedData.decisaoJudicial,
        riscoFuga: validatedData.riscoFuga,
        riscoAgressao: validatedData.riscoAgressao,
        riscoAutolesao: validatedData.riscoAutolesao,
        historicoComportamental: validatedData.historicoComportamental,
        medidasSeguranca: validatedData.medidasSeguranca,
        equipeProfissional: validatedData.equipeProfissional,
        veiculoUtilizado: validatedData.veiculoUtilizado,
        observacoesAdicionais: validatedData.observacoesAdicionais,
        horaInicio: validatedData.horaInicio ? new Date(validatedData.horaInicio) : null,
        horaFim: validatedData.horaFim ? new Date(validatedData.horaFim) : null,
        duracaoMinutos,
        status: "EMITIDO",

        // Dados da Análise Automática
        fatoresAgravantes: validatedData.fatoresAgravantes || [],
        pontuacaoRiscoFuga: validatedData.pontuacaoRiscoFuga,
        pontuacaoRiscoAgressao: validatedData.pontuacaoRiscoAgressao,
        pontuacaoRiscoAutolesao: validatedData.pontuacaoRiscoAutolesao,
        fundamentacaoAutomatica: validatedData.fundamentacaoAutomatica,
      },
      include: {
        adolescente: {
          select: {
            nomeCompleto: true,
            numeroSms: true,
            numeroProcesso: true,
          },
        },
        operadorResponsavel: {
          select: {
            nomeCompleto: true,
            funcaoRole: true,
          },
        },
      },
    });

    // Log de auditoria
    await prisma.logAuditoria.create({
      data: {
        operadorId: validatedData.operadorResponsavelId,
        acao: "INSERT",
        tabelaAfetada: "JustificativaAlgema",
        registroIdAfetado: justificativa.id,
        detalhesAlteracao: {
          numeroDocumento,
          adolescente: adolescente.nomeCompleto,
          motivoPrincipal: validatedData.motivoPrincipal,
        },
      },
    });

    return NextResponse.json(
      {
        mensagem: "Justificativa de algema criada com sucesso",
        justificativa,
        numeroDocumento,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          erro: "Dados inválidos",
          detalhes: error.errors.map(err => ({
            campo: err.path.join("."),
            mensagem: err.message,
          }))
        },
        { status: 400 }
      );
    }

    console.error("Erro ao criar justificativa:", error);
    return NextResponse.json(
      { erro: "Erro ao criar justificativa de algema" },
      { status: 500 }
    );
  }
}
