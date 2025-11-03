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
        adolescente_ocupante: {
          select: {
            id: true,
            nome_completo: true,
            nome_social: true,
            numero_sms: true,
            foto_url: true,
            alerta_risco_suicidio: true,
            alerta_perfil_mapeado: true,
            alerta_saude_confidencial: true,
          },
        },
        alojamento_frontal: {
          select: {
            id: true,
            numero_alojamento: true,
            ala: true,
          },
        },
      },
      orderBy: [
        { casa: { numero: "asc" } },
        { ala: "asc" },
        { numero_alojamento: "asc" },
      ],
    });

    // Filtrar apenas livres se solicitado
    let alojamentosFiltrados = alojamentos;
    if (apenas_livres) {
      alojamentosFiltrados = alojamentos.filter(
        (a) =>
          a.adolescente_ocupante.length === 0 && a.status_manutencao === "LIVRE"
      );
    }

    // Formatar resposta
    const alojamentosFormatados = alojamentosFiltrados.map((alojamento) => {
      const ocupante = alojamento.adolescente_ocupante[0];

      return {
        id: alojamento.id,
        casa: {
          id: alojamento.casa.id,
          nome: alojamento.casa.nome,
          numero: alojamento.casa.numero,
        },
        numero_alojamento: alojamento.numero_alojamento,
        ala: alojamento.ala,
        status_manutencao: alojamento.status_manutencao,
        localizacao_preferencial: alojamento.localizacao_preferencial,
        alojamento_frontal: alojamento.alojamento_frontal
          ? {
              id: alojamento.alojamento_frontal.id,
              numero: alojamento.alojamento_frontal.numero_alojamento,
              ala: alojamento.alojamento_frontal.ala,
            }
          : null,
        ocupado: !!ocupante,
        ocupante: ocupante
          ? {
              id: ocupante.id,
              nome_completo: ocupante.nome_completo,
              nome_social: ocupante.nome_social,
              numero_sms: ocupante.numero_sms,
              foto_url: ocupante.foto_url,
              alertas: [
                ocupante.alerta_risco_suicidio && "risco_suicidio",
                ocupante.alerta_perfil_mapeado && "perfil_mapeado",
                ocupante.alerta_saude_confidencial && "saude_confidencial",
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

    // Verificar se casa existe
    const casa = await prisma.casa.findUnique({
      where: { id: validatedData.casa_id },
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
        casa_id: validatedData.casa_id,
        numero_alojamento: validatedData.numero_alojamento,
      },
    });

    if (alojamentoExistente) {
      return NextResponse.json(
        {
          erro: `Alojamento ${validatedData.numero_alojamento} já existe na ${casa.nome}`,
        },
        { status: 409 }
      );
    }

    // Criar alojamento
    const alojamento = await prisma.alojamento.create({
      data: validatedData,
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
