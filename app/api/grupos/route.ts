// app/api/grupos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

// Schema de validação para criar grupo
const createGrupoSchema = z.object({
  nomeGrupo: z.string().min(2, "Nome do grupo deve ter no mínimo 2 caracteres"),
  casaId: z.string().uuid("Casa ID inválido"),
  ordemAla: z.string().optional().nullable(),
  status: z.enum(["ATIVO", "INATIVO"]).default("ATIVO"),
});

// GET /api/grupos - Listar grupos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filtros disponíveis
    const casaId = searchParams.get("casa_id");
    const status = searchParams.get("status");
    const incluirMembros = searchParams.get("incluir_membros") === "true";

    // Construir query dinâmica
    const where: any = {};

    if (casaId) {
      where.casaId = casaId;
    }

    if (status) {
      where.status = status;
    }

    // Buscar grupos
    const grupos = await prisma.grupo.findMany({
      where,
      include: {
        casa: {
          select: {
            id: true,
            nome: true,
            numero: true,
          },
        },
        ...(incluirMembros && {
          membros: {
            where: { dataSaida: null }, // Apenas membros ativos
            include: {
              adolescente: {
                select: {
                  id: true,
                  nomeCompleto: true,
                  nomeSocial: true,
                  numeroSms: true,
                  fotoUrl: true,
                  statusUnidade: true,
                  alojamentoAtual: {
                    select: {
                      id: true,
                      numeroAlojamento: true,
                      ala: true,
                    },
                  },
                },
              },
            },
          },
        }),
      },
      orderBy: [{ casa: { numero: "asc" } }, { nomeGrupo: "asc" }],
    });

    // Formatar resposta
    const gruposFormatados = grupos.map((grupo) => ({
      id: grupo.id,
      nomeGrupo: grupo.nomeGrupo,
      ordemAla: grupo.ordemAla,
      status: grupo.status,
      criadoEm: grupo.criadoEm,
      casa: {
        id: grupo.casa.id,
        nome: grupo.casa.nome,
        numero: grupo.casa.numero,
      },
      totalMembros: incluirMembros && "membros" in grupo
        ? grupo.membros.length
        : undefined,
      membros: incluirMembros && "membros" in grupo
        ? grupo.membros.map((membro: any) => ({
            id: membro.id,
            dataEntrada: membro.dataEntrada,
            adolescente: {
              id: membro.adolescente.id,
              nomeCompleto: membro.adolescente.nomeCompleto,
              nomeSocial: membro.adolescente.nomeSocial,
              numeroSms: membro.adolescente.numeroSms,
              fotoUrl: membro.adolescente.fotoUrl,
              statusUnidade: membro.adolescente.statusUnidade,
              alojamento: membro.adolescente.alojamentoAtual
                ? {
                    id: membro.adolescente.alojamentoAtual.id,
                    numero: membro.adolescente.alojamentoAtual.numeroAlojamento,
                    ala: membro.adolescente.alojamentoAtual.ala,
                  }
                : null,
            },
          }))
        : undefined,
    }));

    return NextResponse.json({
      total: gruposFormatados.length,
      grupos: gruposFormatados,
    });
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    return NextResponse.json(
      {
        erro: "Erro ao buscar grupos",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

// POST /api/grupos - Criar novo grupo
export async function POST(request: NextRequest) {
  try {
    const session = await auth().catch((error) => {
      console.error("Erro ao obter sessao do auth:", error);
      return null;
    });
    const operadorId = session?.user?.id ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { erro: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
      select: { id: true },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { erro: "Operador nao encontrado" },
        { status: 403 }
      );
    }
    const body = await request.json();

    // Validar dados
    const validatedData = createGrupoSchema.parse(body);

    // Verificar se casa existe
    const casa = await prisma.casa.findUnique({
      where: { id: validatedData.casaId },
    });

    if (!casa) {
      return NextResponse.json(
        { erro: "Casa não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se já existe grupo com esse nome na casa
    const grupoExistente = await prisma.grupo.findFirst({
      where: {
        nomeGrupo: validatedData.nomeGrupo,
        casaId: validatedData.casaId,
      },
    });

    if (grupoExistente) {
      return NextResponse.json(
        {
          erro: `Já existe um grupo com o nome "${validatedData.nomeGrupo}" na ${casa.nome}`,
        },
        { status: 409 }
      );
    }

    // Criar grupo
    const grupo = await prisma.grupo.create({
      data: {
        nomeGrupo: validatedData.nomeGrupo,
        casaId: validatedData.casaId,
        ordemAla: validatedData.ordemAla || undefined,
        status: validatedData.status,
      },
      include: {
        casa: {
          select: {
            id: true,
            nome: true,
            numero: true,
          },
        },
      },
    });

    // Log de auditoria
    await prisma.logAuditoria.create({
      data: {
        operadorId: operadorId,
        acao: "INSERT",
        tabelaAfetada: "Grupos",
        registroIdAfetado: grupo.id,
        detalhesAlteracao: {
          nomeGrupo: grupo.nomeGrupo,
          casa: casa.nome,
        },
        ipOrigem: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json(
      {
        id: grupo.id,
        nomeGrupo: grupo.nomeGrupo,
        casa: {
          id: grupo.casa.id,
          nome: grupo.casa.nome,
          numero: grupo.casa.numero,
        },
        status: grupo.status,
        mensagem: "Grupo criado com sucesso",
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

    console.error("Erro ao criar grupo:", error);
    return NextResponse.json(
      {
        erro: "Erro ao criar grupo",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}





