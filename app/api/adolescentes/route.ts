// app/api/adolescentes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validação para criar adolescente
const createAdolescenteSchema = z.object({
  nome_completo: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  nome_social: z.string().optional(),
  foto_url: z.string().url().optional(),
  numero_sms: z.string().optional(),
  data_nascimento: z.string().optional(),
  data_entrada: z.string().optional(),
  numero_processo: z.string().optional(),
  ato_infracional_atual: z.string().optional(),
  status_unidade: z
    .enum(["ATIVO", "TRANSFERIDO", "LIBERADO", "EVADIDO"])
    .default("ATIVO"),

  // Perfil de Risco
  faccao_grupo_id: z.string().uuid().optional(),
  faccao_numero_membro: z.string().optional(),
  bairro_origem_id: z.string().uuid().optional(),
  risco_fuga: z.enum(["BAIXO", "MEDIO", "ALTO"]).optional(),

  // Alertas
  alerta_risco_suicidio: z.boolean().default(false),
  alerta_perfil_mapeado: z.boolean().default(false),
  alerta_saude_confidencial: z.boolean().default(false),
  alerta_saude_detalhes: z.string().optional(),

  // Alocação
  alojamento_atual_id: z.string().uuid().optional(),
  fase_internacao_atual_id: z.string().uuid().optional(),
});

// GET /api/adolescentes - Listar adolescentes com filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filtros disponíveis
    const status = searchParams.get("status");
    const busca = searchParams.get("busca");
    const casa_id = searchParams.get("casa_id");
    const grupo_id = searchParams.get("grupo_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Construir query dinâmica
    const where: any = {};

    if (status) {
      where.status_unidade = status;
    }

    if (busca) {
      where.OR = [
        { nome_completo: { contains: busca, mode: "insensitive" } },
        { numero_sms: { contains: busca } },
      ];
    }

    if (casa_id) {
      where.alojamento_atual = {
        casa_id: casa_id,
      };
    }

    if (grupo_id) {
      where.grupos_membros = {
        some: {
          grupo_id: grupo_id,
          data_saida: null, // Apenas membros ativos
        },
      };
    }

    // Buscar adolescentes
    const [adolescentes, total] = await Promise.all([
      prisma.adolescente.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          alojamento_atual: {
            include: {
              casa: true,
            },
          },
          faccao_grupo: true,
          bairro_origem: true,
          grupos_membros: {
            where: { data_saida: null },
            include: {
              grupo: true,
            },
          },
        },
        orderBy: {
          nome_completo: "asc",
        },
      }),
      prisma.adolescente.count({ where }),
    ]);

    // Formatar resposta
    const adolescentesFormatados = adolescentes.map((adolescente) => ({
      id: adolescente.id,
      nome_completo: adolescente.nome_completo,
      nome_social: adolescente.nome_social,
      foto_url: adolescente.foto_url,
      numero_sms: adolescente.numero_sms,
      status_unidade: adolescente.status_unidade,

      // Alocação atual
      alojamento_atual: adolescente.alojamento_atual
        ? {
            id: adolescente.alojamento_atual.id,
            casa: adolescente.alojamento_atual.casa.nome,
            numero: adolescente.alojamento_atual.numero_alojamento,
            ala: adolescente.alojamento_atual.ala,
          }
        : null,

      // Facção
      faccao: adolescente.faccao_grupo?.nome_faccao || null,

      // Bairro
      bairro: adolescente.bairro_origem
        ? `${adolescente.bairro_origem.nome_bairro} - ${adolescente.bairro_origem.cidade}`
        : null,

      // Grupos ativos
      grupos: adolescente.grupos_membros.map((gm) => gm.grupo.nome_grupo),

      // Alertas
      alertas: [
        adolescente.alerta_risco_suicidio && "risco_suicidio",
        adolescente.alerta_perfil_mapeado && "perfil_mapeado",
        adolescente.alerta_saude_confidencial && "saude_confidencial",
      ].filter(Boolean),
    }));

    return NextResponse.json({
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      adolescentes: adolescentesFormatados,
    });
  } catch (error) {
    console.error("Erro ao buscar adolescentes:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar adolescentes" },
      { status: 500 }
    );
  }
}

// POST /api/adolescentes - Cadastrar novo adolescente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar dados
    const validatedData = createAdolescenteSchema.parse(body);

    // Converter strings de data para Date
    const data = {
      ...validatedData,
      data_nascimento: validatedData.data_nascimento
        ? new Date(validatedData.data_nascimento)
        : null,
      data_entrada: validatedData.data_entrada
        ? new Date(validatedData.data_entrada)
        : new Date(),
    };

    // Criar adolescente
    const adolescente = await prisma.adolescente.create({
      data,
      include: {
        alojamento_atual: {
          include: {
            casa: true,
          },
        },
        faccao_grupo: true,
        bairro_origem: true,
      },
    });

    // Log de auditoria
    await prisma.logAuditoria.create({
      data: {
        // operador_id: request.user?.id, // TODO: Adicionar após implementar auth
        acao: "INSERT",
        tabela_afetada: "Adolescentes",
        registro_id_afetado: adolescente.id,
        detalhes_alteracao: {
          nome_completo: adolescente.nome_completo,
          numero_sms: adolescente.numero_sms,
        },
        // ip_origem: request.ip,
      },
    });

    return NextResponse.json(
      {
        id: adolescente.id,
        nome_completo: adolescente.nome_completo,
        numero_sms: adolescente.numero_sms,
        status_unidade: adolescente.status_unidade,
        mensagem: "Adolescente cadastrado com sucesso",
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

    console.error("Erro ao cadastrar adolescente:", error);
    return NextResponse.json(
      { erro: "Erro ao cadastrar adolescente" },
      { status: 500 }
    );
  }
}
