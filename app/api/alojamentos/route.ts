// app/api/alojamentos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validação
const createAlojamentoSchema = z.object({
  casa_id: z.string().uuid("Casa ID inválido"),
  numero_alojamento: z.string().min(1, "Número do alojamento é obrigatório"),
  ala: z.string().optional(),
  status_manutencao: z.enum(["LIVRE", "INTERDITADO"]).default("LIVRE"),
  alojamento_frontal_id: z.string().uuid().optional(),
  zona_risco_id: z.string().uuid().optional(),
  localizacao_preferencial: z.boolean().default(false),
});

// GET /api/alojamentos - Listar alojamentos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const casa_id = searchParams.get("casa_id");
    const status = searchParams.get("status");
    const apenas_livres = searchParams.get("apenas_livres") === "true";

    const where: any = {};

    if (casa_id) {
      where.casa_id = casa_id;
    }

    if (status) {
      where.status_manutencao = status;
    }

    const alojamentos = await prisma.alojamento.findMany({
      where,
      include: {
        casa: true,
        adolescentes: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeSocial: true,
            numeroSms: true,
            fotoUrl: true,
            alertaRiscoSuicidio: true,
            alertaPerfilMapeado: true,
            alertaSaudeConfidencial: true,
          },
        },
        alojamentoFrontal: {
          select: {
            id: true,
            numeroAlojamento: true,
            ala: true,
          },
        },
      },
      orderBy: [
        { casa: { numero: "asc" } },
        { ala: "asc" },
        { numeroAlojamento: "asc" },
      ],
    });

    // Filtrar apenas livres se solicitado
    let alojamentosFiltrados = alojamentos;
    if (apenas_livres) {
      alojamentosFiltrados = alojamentos.filter(
        (a) =>
          a.adolescentes.length === 0 && a.statusManutencao === "LIVRE"
      );
    }

    // Formatar resposta
    const alojamentosFormatados = alojamentosFiltrados.map((alojamento) => {
      const ocupante = alojamento.adolescentes[0];

      return {
        id: alojamento.id,
        casa: {
          id: alojamento.casa.id,
          nome: alojamento.casa.nome,
          numero: alojamento.casa.numero,
        },
        numero_alojamento: alojamento.numeroAlojamento,
        ala: alojamento.ala,
        status_manutencao: alojamento.statusManutencao,
        localizacao_preferencial: alojamento.localizacaoPreferencial,
        alojamento_frontal: alojamento.alojamentoFrontal
          ? {
              id: alojamento.alojamentoFrontal.id,
              numero: alojamento.alojamentoFrontal.numeroAlojamento,
              ala: alojamento.alojamentoFrontal.ala,
            }
          : null,
        ocupado: !!ocupante,
        ocupante: ocupante
          ? {
              id: ocupante.id,
              nome_completo: ocupante.nomeCompleto,
              nome_social: ocupante.nomeSocial,
              numero_sms: ocupante.numeroSms,
              foto_url: ocupante.fotoUrl,
              alertas: [
                ocupante.alertaRiscoSuicidio && "risco_suicidio",
                ocupante.alertaPerfilMapeado && "perfil_mapeado",
                ocupante.alertaSaudeConfidencial && "saude_confidencial",
              ].filter(Boolean),
            }
          : null,
      };
    });

    return NextResponse.json({
      total: alojamentosFormatados.length,
      alojamentos: alojamentosFormatados,
    });
  } catch (error) {
    console.error("Erro ao buscar alojamentos:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar alojamentos" },
      { status: 500 }
    );
  }
}

// POST /api/alojamentos - Criar novo alojamento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar dados
    const validatedData = createAlojamentoSchema.parse(body);

    // Converter para camelCase para o Prisma
    const data = {
      casaId: validatedData.casa_id,
      numeroAlojamento: validatedData.numero_alojamento,
      ala: validatedData.ala,
      statusManutencao: validatedData.status_manutencao,
      alojamentoFrontalId: validatedData.alojamento_frontal_id,
      zonaRiscoId: validatedData.zona_risco_id,
      localizacaoPreferencial: validatedData.localizacao_preferencial,
    };

    // Verificar se casa existe
    const casa = await prisma.casa.findUnique({
      where: { id: data.casaId },
    });

    if (!casa) {
      return NextResponse.json(
        { erro: "Casa não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se alojamento já existe nessa casa
    const alojamentoExistente = await prisma.alojamento.findFirst({
      where: {
        casaId: data.casaId,
        numeroAlojamento: data.numeroAlojamento,
      },
    });

    if (alojamentoExistente) {
      return NextResponse.json(
        {
          erro: `Alojamento ${data.numeroAlojamento} já existe na ${casa.nome}`,
        },
        { status: 409 }
      );
    }

    // Criar alojamento
    const alojamento = await prisma.alojamento.create({
      data,
      include: {
        casa: true,
      },
    });

    // Log de auditoria
    await prisma.logAuditoria.create({
      data: {
        // operadorId: request.user?.id,
        acao: "INSERT",
        tabelaAfetada: "Alojamentos",
        registroIdAfetado: alojamento.id,
        detalhesAlteracao: {
          casa: casa.nome,
          numeroAlojamento: alojamento.numeroAlojamento,
          ala: alojamento.ala,
        },
      },
    });

    return NextResponse.json(
      {
        id: alojamento.id,
        casa: alojamento.casa.nome,
        numero_alojamento: alojamento.numeroAlojamento,
        ala: alojamento.ala,
        mensagem: "Alojamento criado com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao criar alojamento:", error);
    return NextResponse.json(
      { erro: "Erro ao criar alojamento" },
      { status: 500 }
    );
  }
}

// PATCH /api/alojamentos/:id - Atualizar status do alojamento
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { erro: "ID do alojamento é obrigatório" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updateSchema = z.object({
      statusManutencao: z.enum(["LIVRE", "INTERDITADO"]).optional(),
      localizacaoPreferencial: z.boolean().optional(),
    });

    const validatedData = updateSchema.parse(body);

    // Atualizar alojamento
    const alojamento = await prisma.alojamento.update({
      where: { id },
      data: validatedData,
      include: {
        casa: true,
      },
    });

    // Log de auditoria
    await prisma.logAuditoria.create({
      data: {
        // operadorId: request.user?.id,
        acao: "UPDATE",
        tabelaAfetada: "Alojamentos",
        registroIdAfetado: alojamento.id,
        detalhesAlteracao: validatedData,
      },
    });

    return NextResponse.json({
      id: alojamento.id,
      casa: alojamento.casa.nome,
      numero_alojamento: alojamento.numeroAlojamento,
      status_manutencao: alojamento.statusManutencao,
      localizacao_preferencial: alojamento.localizacaoPreferencial,
      mensagem: "Alojamento atualizado com sucesso",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: "Dados inválidos", detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar alojamento:", error);
    return NextResponse.json(
      { erro: "Erro ao atualizar alojamento" },
      { status: 500 }
    );
  }
}
