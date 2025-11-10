import { NextResponse } from "next/server"
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";

// GET /api/conflitos
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const busca = searchParams.get("busca");

    const where: any = {};

    // Filtro por status
    if (status && status !== "TODOS") {
      where.status = status;
    }

    // Busca por nome de adolescente
    if (busca) {
      where.OR = [
        {
          adolescenteA: {
            nomeCompleto: { contains: busca, mode: "insensitive" },
          },
        },
        {
          adolescenteB: {
            nomeCompleto: { contains: busca, mode: "insensitive" },
          },
        },
        {
          adolescenteA: {
            numeroSms: { contains: busca },
          },
        },
        {
          adolescenteB: {
            numeroSms: { contains: busca },
          },
        },
      ];
    }

    const conflitos = await prisma.conflito.findMany({
      where,
      include: {
        adolescenteA: {
          select: {
            id: true,
            nomeCompleto: true,
            numeroSms: true,
            alojamentoAtual: {
              include: {
                casa: true,
              },
            },
          },
        },
        adolescenteB: {
          select: {
            id: true,
            nomeCompleto: true,
            numeroSms: true,
            alojamentoAtual: {
              include: {
                casa: true,
              },
            },
          },
        },
        ciOrigem: {
          select: {
            id: true,
            numero: true,
            ano: true,
          },
        },
        tentativasMediacao: {
          orderBy: {
            dataTentativa: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        criadoEm: "desc",
      },
    });

    // Formatar resposta
    const confilitosFormatados = conflitos.map((c) => ({
      id: c.id,
      registroGrupoId: c.registroGrupoId,
      adolescenteA: {
        id: c.adolescenteA.id,
        nome: c.adolescenteA.nomeCompleto,
        numeroSms: c.adolescenteA.numeroSms,
        alojamento: c.adolescenteA.alojamentoAtual
          ? `${c.adolescenteA.alojamentoAtual.casa.nome} - Aloj ${c.adolescenteA.alojamentoAtual.numeroAlojamento}`
          : undefined,
      },
      adolescenteB: {
        id: c.adolescenteB.id,
        nome: c.adolescenteB.nomeCompleto,
        numeroSms: c.adolescenteB.numeroSms,
        alojamento: c.adolescenteB.alojamentoAtual
          ? `${c.adolescenteB.alojamentoAtual.casa.nome} - Aloj ${c.adolescenteB.alojamentoAtual.numeroAlojamento}`
          : undefined,
      },
      tipoConflito: c.tipoConflito,
      status: c.status,
      origem: c.ciOrigem
        ? `CI ${c.ciOrigem.numero}/${c.ciOrigem.ano}`
        : "Registro direto",
      descricao: c.descricao,
      criadoEm: c.criadoEm,
      resolvidoEm: c.resolvidoEm,
      tentativasMediacao: c.tentativasMediacao.length,
      ultimaMediacao: c.tentativasMediacao[0]?.dataTentativa,
    }));

    return NextResponse.json(confilitosFormatados);
  } catch (error) {
    console.error("Erro ao buscar conflitos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar conflitos" },
      { status: 500 }
    );
  }
}

// POST /api/conflitos
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await auth().catch((error) => {
      console.error("Erro ao obter sessao do auth:", error);
      return null;
    });
    const operadorId = session?.user?.id ?? null;

    if (!operadorId) {
      return NextResponse.json(
        { error: "Operador nao autenticado" },
        { status: 401 }
      );
    }

    const operadorExiste = await prisma.operador.findUnique({
      where: { id: operadorId },
    });

    if (!operadorExiste) {
      return NextResponse.json(
        { error: "Operador nao encontrado" },
        { status: 403 }
      );
    }


    // Validações
    if (!body.adolescenteAId || !body.adolescenteBId) {
      return NextResponse.json(
        { error: "Ambos os adolescentes são obrigatórios" },
        { status: 400 }
      );
    }

    if (body.adolescenteAId === body.adolescenteBId) {
      return NextResponse.json(
        { error: "Não é possível criar conflito do adolescente consigo mesmo" },
        { status: 400 }
      );
    }

    if (!body.tipoConflito) {
      return NextResponse.json(
        { error: "Tipo de conflito é obrigatório" },
        { status: 400 }
      );
    }
    const registroGrupoId =
      typeof body.registroGrupoId === "string" && body.registroGrupoId.length > 0
        ? body.registroGrupoId
        : randomUUID();


    // Verificar se conflito já existe
    const conflitoExistente = await prisma.conflito.findFirst({
      where: {
        OR: [
          {
            AND: [
              { adolescenteAId: body.adolescenteAId },
              { adolescenteBId: body.adolescenteBId },
            ],
          },
          {
            AND: [
              { adolescenteAId: body.adolescenteBId },
              { adolescenteBId: body.adolescenteAId },
            ],
          },
        ],
        status: "ATIVO",
      },
    });

    if (conflitoExistente) {
      return NextResponse.json(
        { error: "Já existe um conflito ativo entre estes adolescentes" },
        { status: 400 }
      );
    }

    const conflito = await prisma.conflito.create({
      data: {
        adolescenteAId: body.adolescenteAId,
        adolescenteBId: body.adolescenteBId,
        tipoConflito: body.tipoConflito,
        ciOrigemId: body.ciOrigemId,
        descricao: body.descricao,
        registroGrupoId: registroGrupoId,
        status: "ATIVO",
      },
      include: {
        adolescenteA: {
          select: {
            id: true,
            nomeCompleto: true,
            numeroSms: true,
          },
        },
        adolescenteB: {
          select: {
            id: true,
            nomeCompleto: true,
            numeroSms: true,
          },
        },
      },
    });

    await prisma.logAuditoria.create({
      data: {
        operadorId: operadorId,
        acao: "INSERT",
        tabelaAfetada: "conflitos",
        registroIdAfetado: conflito.id,
        detalhesAlteracao: {
          tipoConflito: conflito.tipoConflito,
          adolescenteA: conflito.adolescenteA.nomeCompleto,
          adolescenteB: conflito.adolescenteB.nomeCompleto,
          ciOrigemId: body.ciOrigemId ?? null,
        },
        ipOrigem: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json(conflito, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar conflito:", error);
    return NextResponse.json(
      { error: "Erro ao criar conflito" },
      { status: 500 }
    );
  }
}








